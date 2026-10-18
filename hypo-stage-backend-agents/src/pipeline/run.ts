import type { Knex } from 'knex';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { AgentsConfig } from '../config';
import { findModel, findRepository } from '../config';
import type { GitHubClient } from '../github/client';
import type { PullRequestEvent } from '../github/webhook';
import type { ModelRegistry } from '../providers/models';
import { finishRun, RunTrace, startRun } from '../store/runs';
import {
  insertSuggestions,
  NewSuggestion,
  supersedePending,
  upsertPendingSuggestion,
  completedPlanningIds,
} from '../store/suggestions';
import { findLinkByIssue, IssueLink } from '../store/issues';
import type { PullRequestDetails } from '../github/client';
import type { Knex as KnexType } from 'knex';

const CLOSING_KEYWORDS = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s+#(\d+)\b/gi;

/** Plan issues (created by HypoStage) that this PR closes with "Fixes #N", same repository. */
async function linkedPlanIssues(knex: KnexType, pr: PullRequestDetails): Promise<IssueLink[]> {
  const numbers = new Set<number>();
  for (const match of `${pr.title}\n${pr.body ?? ''}`.matchAll(CLOSING_KEYWORDS)) {
    numbers.add(Number(match[1]));
  }
  const links: IssueLink[] = [];
  for (const n of numbers) {
    const link = await findLinkByIssue(knex, pr.repository, n);
    if (link) links.push(link);
  }
  return links;
}
import { assess } from './assess';
import { buildDiffDigest, loadOpenHypotheses, scopeHypotheses } from './context';
import { applyGuardrails, DroppedProposal } from './guardrails';
import { mapWithConcurrency } from './llm';
import type { AssessmentOutput } from './schemas';
import { triage } from './triage';

/** Compact view of what the model proposed, stored in the run trace. */
function summarizeAssessment(a: AssessmentOutput) {
  return {
    related: a.related,
    confidence: a.confidence,
    reassessment: a.reassessment
      ? { uncertainty: a.reassessment.uncertainty, impact: a.reassessment.impact }
      : null,
    planningProgress: (a.planningProgress ?? []).map(p => ({
      technicalPlanningId: p.technicalPlanningId,
      effect: p.effect,
    })),
    newPlanning: a.newPlanning ? { actionType: a.newPlanning.actionType } : null,
    statusChange: a.statusChange ? { status: a.statusChange.status } : null,
  };
}

export interface PipelineDeps {
  knex: Knex;
  logger: LoggerService;
  config: AgentsConfig;
  github: GitHubClient;
  models: ModelRegistry;
  /** Catalog entity refs whose github.com/project-slug annotation matches the repository. */
  resolveRepositoryEntityRefs(repository: string): Promise<string[]>;
}

export interface PipelineResult {
  runId: string | null;
  status: 'completed' | 'skipped';
  suggestions: number;
}

/**
 * Analyzes one pull request: context → triage → assess → guardrails → persist.
 * Throws on failure (after recording the failed run) so pg-boss can retry.
 */
export async function runPullRequestPipeline(
  deps: PipelineDeps,
  event: PullRequestEvent,
): Promise<PipelineResult> {
  const { knex, logger, config } = deps;
  const repo = findRepository(config, event.repository);
  if (!config.enabled || !repo) {
    logger.info('Skipping PR analysis: agents disabled or repository not configured', {
      repository: event.repository,
    });
    return { runId: null, status: 'skipped', suggestions: 0 };
  }

  const modelDef = findModel(config, repo.model);
  const runId = await startRun(knex, {
    repository: event.repository,
    prNumber: event.number,
    headSha: event.headSha,
    prUrl: event.url,
    triggerAction: event.action,
    modelKey: modelDef.key,
    provider: modelDef.provider,
  });
  const trace: RunTrace = { steps: [] };

  try {
    // Step 0: context
    const contextStarted = Date.now();
    const [pr, allHypotheses, repositoryEntityRefs] = await Promise.all([
      deps.github.getPullRequest(event.repository, event.number),
      loadOpenHypotheses(knex),
      deps.resolveRepositoryEntityRefs(event.repository).catch(error => {
        logger.warn('Could not resolve catalog entities for repository', {
          repository: event.repository,
          error: String(error),
        });
        return [] as string[];
      }),
    ]);
    const { scope, hypotheses } = scopeHypotheses(allHypotheses, repositoryEntityRefs);
    const digest = buildDiffDigest(pr, modelDef.maxInputChars);
    trace.scope = scope;
    trace.hypothesesInScope = hypotheses.length;
    trace.steps.push({
      step: 'context',
      durationMs: Date.now() - contextStarted,
      details: {
        files: pr.files.length,
        patchesIncluded: digest.patches.length,
        truncated: digest.truncated,
        merged: pr.merged,
      },
    });

    if (hypotheses.length === 0) {
      trace.skippedReason = 'no open hypotheses';
      await finishRun(knex, runId, { status: 'skipped', trace });
      return { runId, status: 'skipped', suggestions: 0 };
    }

    const model = deps.models.resolve(modelDef);

    // Step 1: triage
    const candidates = await triage({
      model,
      pr,
      digest,
      hypotheses,
      maxCandidates: config.maxCandidates,
      maxInputChars: modelDef.maxInputChars,
      trace: trace.steps,
    });

    // Step 2 + 3: assess each candidate and validate its output
    // Plan issues this PR closes ("Fixes #N"): matched to their planning deterministically,
    // and removed from what the model may claim as progress, to avoid duplicates.
    const planLinks = await linkedPlanIssues(knex, pr);
    const linkedPlanningIds = new Set(planLinks.map(l => l.technicalPlanningId));
    const completed = await completedPlanningIds(
      knex,
      hypotheses.flatMap(h => h.technicalPlannings.map(p => p.id)),
    );

    const changedFiles = pr.files.map(f => f.filename);
    const perHypothesis = await mapWithConcurrency(candidates, modelDef.concurrency, async c => {
      const assessment = await assess({
        model,
        pr,
        digest,
        hypothesis: c.hypothesis,
        maxInputChars: modelDef.maxInputChars,
        trace: trace.steps,
      });
      const { suggestions: kept, dropped } = applyGuardrails({
        hypothesis: c.hypothesis,
        assessment: {
          ...assessment,
          planningProgress: assessment.planningProgress.filter(
            p => !linkedPlanningIds.has(p.technicalPlanningId),
          ),
        },
        prUrl: pr.url,
        prMerged: pr.merged,
        changedFiles,
        confidenceThreshold: repo.confidenceThreshold,
        completedPlanningIds: completed,
      });
      const step = trace.steps.find(
        s => s.step === 'assess' && s.details?.hypothesisId === c.hypothesis.id,
      );
      if (step) {
        step.details = {
          ...step.details,
          model: summarizeAssessment(assessment),
          kept: kept.map(k => k.kind),
          dropped,
        };
      }
      return kept;
    });
    const suggestions: NewSuggestion[] = perHypothesis.flat();

    // Step 4: persist. A new analysis of the PR replaces earlier pending suggestions for
    // the hypotheses it assessed.
    await knex.transaction(async trx => {
      await supersedePending(
        trx,
        event.artifactRef,
        candidates.map(c => c.hypothesis.id),
      );
      await insertSuggestions(
        trx,
        { runId, artifactRef: event.artifactRef, artifactUrl: pr.url, headSha: pr.headSha },
        suggestions,
      );
    });

    for (const link of planLinks) {
      if (pr.merged && completed.has(link.technicalPlanningId)) {
        continue; // already completed in HypoStage; nothing new to propose
      }
      await upsertPendingSuggestion(
        knex,
        { runId, source: { artifactRef: event.artifactRef, url: pr.url, kind: 'pull_request' }, headSha: pr.headSha },
        {
          hypothesisId: link.hypothesisId,
          technicalPlanningId: link.technicalPlanningId,
          kind: 'planning_progress',
          payload: { effect: pr.merged ? 'completes' : 'advances', expectedOutcome: null },
          rationale: `Pull request #${pr.number} ${pr.merged ? 'closes' : 'addresses'} plan issue #${link.issueNumber}.`,
          evidence: [],
          confidence: 1,
        },
      );
    }
    if (planLinks.length > 0) {
      trace.steps.push({
        step: 'plan_issue_links',
        durationMs: 0,
        details: { issues: planLinks.map(l => l.issueNumber) },
      });
    }

    trace.suggestions = suggestions.length + planLinks.length;
    await finishRun(knex, runId, { status: 'completed', trace });
    const triageDropped = trace.steps.find(s => s.step === 'triage')?.details?.dropped;
    const dropReasons = trace.steps
      .flatMap(s => (s.step === 'assess' ? ((s.details?.dropped as DroppedProposal[]) ?? []) : []))
      .map(d => `${d.kind}: ${d.reason}`);
    logger.info('PR analysis completed', {
      runId,
      repository: event.repository,
      number: event.number,
      candidates: candidates.length,
      triageDropped: Array.isArray(triageDropped) ? triageDropped.length : 0,
      suggestions: suggestions.length,
      ...(dropReasons.length > 0 ? { droppedProposals: dropReasons.join('; ') } : {}),
    });
    return { runId, status: 'completed', suggestions: suggestions.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(knex, runId, { status: 'failed', trace, error: message });
    logger.error('PR analysis failed', {
      repository: event.repository,
      number: event.number,
      error: message,
    });
    throw error;
  }
}
