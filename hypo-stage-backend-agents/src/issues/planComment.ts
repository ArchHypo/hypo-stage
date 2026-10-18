import { findModel, findRepository } from '../config';
import type { IssueEvent } from '../github/events';
import type { PullRequestDetails } from '../github/client';
import { assess } from '../pipeline/assess';
import { buildDiffDigest, loadHypotheses } from '../pipeline/context';
import { applyGuardrails } from '../pipeline/guardrails';
import type { PipelineDeps } from '../pipeline/run';
import { toIssueRef } from '../store/issues';
import { finishRun, RunTrace, startRun } from '../store/runs';
import { completedPlanningIds, upsertPendingSuggestion } from '../store/suggestions';
import type { IssueHandlerResult } from './triage';

/**
 * A human comment on a plan issue may report the evidence the planning asked for (its
 * "Goal: … Evidence: …" expected outcome). The target is fixed — the mirrored planning — so
 * there is no triage, and only planning progress or a reassessment anchored on it may result.
 */
export async function runPlanComment(
  deps: PipelineDeps,
  event: IssueEvent,
  planningId: string,
): Promise<IssueHandlerResult> {
  const { knex, config, logger } = deps;
  const planningRow = await knex('technicalPlanning').where('id', planningId).first('hypothesisId');
  if (!planningRow) {
    return { runId: null, status: 'skipped', suggestions: 0 };
  }
  const [hypothesis] = await loadHypotheses(knex, { ids: [planningRow.hypothesisId] });
  const repo = findRepository(config, event.repository);
  const modelKey = repo?.model ?? config.planner.model ?? config.defaultModel;
  if (!hypothesis || !modelKey) {
    return { runId: null, status: 'skipped', suggestions: 0 };
  }
  const modelDef = findModel(config, modelKey);
  const runId = await startRun(knex, {
    repository: event.repository,
    prNumber: event.number,
    headSha: null,
    prUrl: event.url,
    triggerAction: `${event.event}.${event.action}`,
    modelKey: modelDef.key,
    provider: modelDef.provider,
    artifactKind: 'issue',
    handler: 'plan_comment',
    origin: 'hypostage',
  });
  const trace: RunTrace = { steps: [], scope: 'repository', hypothesesInScope: 1 };

  try {
    const issue = await deps.github.getIssue(event.repository, event.number);
    const closedCompleted = issue.state === 'closed' && issue.stateReason === 'completed';
    // The assess step is artifact-agnostic: present the comment thread as the "change".
    const artifact: PullRequestDetails = {
      repository: issue.repository,
      number: issue.number,
      title: `Plan issue: ${issue.title}`,
      body: [
        'Comments on the plan issue (the evidence to evaluate against the planning expected outcome):',
        ...issue.commentThread.map(c => `- ${c.author ?? 'someone'} (${c.createdAt.slice(0, 10)}): ${c.body}`),
      ].join('\n'),
      url: issue.url,
      author: issue.author,
      merged: closedCompleted,
      headSha: null,
      files: [],
    };
    const assessment = await assess({
      model: deps.models.resolve(modelDef),
      pr: artifact,
      digest: buildDiffDigest(artifact, modelDef.maxInputChars),
      hypothesis,
      maxInputChars: modelDef.maxInputChars,
      trace: trace.steps,
    });

    // Only the mirrored planning may progress; a reassessment is anchored on it.
    const progress = assessment.planningProgress.filter(p => p.technicalPlanningId === planningId);
    if (assessment.reassessment && progress.length === 0) {
      progress.push({ technicalPlanningId: planningId, effect: 'advances', expectedOutcomeUpdate: null, reason: '' });
    }
    const { suggestions, dropped } = applyGuardrails({
      hypothesis,
      assessment: { ...assessment, planningProgress: progress },
      prUrl: issue.url,
      prMerged: closedCompleted,
      changedFiles: [],
      confidenceThreshold: repo?.confidenceThreshold ?? config.confidenceThreshold,
      allowedKinds: ['planning_progress', 'reassessment'],
      completedPlanningIds: await completedPlanningIds(knex, [planningId]),
    });
    const step = trace.steps[trace.steps.length - 1];
    step.details = { ...step.details, kept: suggestions.map(s => s.kind), dropped };

    const source = { artifactRef: toIssueRef(event.repository, event.number), url: issue.url, kind: 'issue' as const };
    for (const s of suggestions) {
      await upsertPendingSuggestion(knex, { runId, source }, s);
    }
    trace.suggestions = suggestions.length;
    await finishRun(knex, runId, { status: 'completed', trace });
    logger.info('Plan issue comment assessed', { number: event.number, suggestions: suggestions.length });
    return { runId, status: 'completed', suggestions: suggestions.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(knex, runId, { status: 'failed', trace, error: message });
    throw error;
  }
}
