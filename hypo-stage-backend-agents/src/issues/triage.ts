import { findModel, findRepository } from '../config';
import type { IssueEvent } from '../github/events';
import { loadOpenHypotheses, scopeHypotheses } from '../pipeline/context';
import { generateStructured, mapWithConcurrency } from '../pipeline/llm';
import type { PipelineDeps } from '../pipeline/run';
import { MIN_TRIAGE_RELEVANCE } from '../pipeline/triage';
import { EvidenceType, listObservations, toIssueRef, upsertObservation } from '../store/issues';
import { finishRun, RunTrace, startRun } from '../store/runs';
import { upsertPendingSuggestion } from '../store/suggestions';
import { guardIssueAssessment } from './guardrails';
import {
  buildIssueAssessPrompt,
  buildIssueTriagePrompt,
  ISSUE_ASSESS_SYSTEM_PROMPT,
  ISSUE_TRIAGE_SYSTEM_PROMPT,
} from './prompts';
import { IssueAssessOutputSchema, IssueTriageOutputSchema } from './schemas';

export interface IssueHandlerResult {
  runId: string | null;
  status: 'completed' | 'skipped';
  suggestions: number;
}

/**
 * Flow 1: a human-reported issue as evidence about hypotheses.
 * Classifies it, links it to hypotheses, flags fired Triggers, and raises an evidence alert
 * when enough related issues accumulate. Never reassesses levels.
 */
export async function runIssueTriage(deps: PipelineDeps, event: IssueEvent): Promise<IssueHandlerResult> {
  const { knex, logger, config } = deps;
  const repo = findRepository(config, event.repository);
  if (!repo?.issues.triage) {
    return { runId: null, status: 'skipped', suggestions: 0 };
  }
  const modelDef = findModel(config, repo.model);
  const runId = await startRun(knex, {
    repository: event.repository,
    prNumber: event.number,
    headSha: null,
    prUrl: event.url,
    triggerAction: `${event.event}.${event.action}`,
    modelKey: modelDef.key,
    provider: modelDef.provider,
    artifactKind: 'issue',
    handler: 'issue_triage',
    origin: 'human',
  });
  const trace: RunTrace = { steps: [] };

  try {
    const started = Date.now();
    const [issue, allHypotheses, entityRefs] = await Promise.all([
      deps.github.getIssue(event.repository, event.number),
      loadOpenHypotheses(knex),
      deps.resolveRepositoryEntityRefs(event.repository).catch(() => [] as string[]),
    ]);
    if (issue.isPullRequest) {
      trace.skippedReason = 'pull request';
      await finishRun(knex, runId, { status: 'skipped', trace });
      return { runId, status: 'skipped', suggestions: 0 };
    }
    const { scope, hypotheses } = scopeHypotheses(allHypotheses, entityRefs);
    trace.scope = scope;
    trace.hypothesesInScope = hypotheses.length;
    trace.steps.push({
      step: 'context',
      durationMs: Date.now() - started,
      details: { state: issue.state, comments: issue.comments, reopened: issue.reopened },
    });

    const model = deps.models.resolve(modelDef);
    // Always classify, even without hypotheses: coverage and the report need every issue.
    const triage = await generateStructured({
      model,
      schema: IssueTriageOutputSchema,
      system: ISSUE_TRIAGE_SYSTEM_PROMPT,
      prompt: buildIssueTriagePrompt(issue, hypotheses, modelDef.maxInputChars),
      step: 'triage',
      trace: trace.steps,
    });
    const byId = new Map(hypotheses.map(h => [h.id, h]));
    const seen = new Set<string>();
    const dropped: Array<{ id: string; relevance: number; reason: string }> = [];
    const candidates = triage.candidates
      .filter(c => {
        const id = c.hypothesisId.trim();
        let reason: string | null = null;
        if (!byId.has(id)) reason = 'unknown hypothesis id';
        else if (seen.has(id)) reason = 'duplicate';
        else if (!(c.relevance >= MIN_TRIAGE_RELEVANCE)) reason = `relevance below ${MIN_TRIAGE_RELEVANCE}`;
        if (reason) {
          dropped.push({ id, relevance: c.relevance, reason });
          return false;
        }
        seen.add(id);
        return true;
      })
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, config.maxCandidates);
    trace.steps[trace.steps.length - 1].details = {
      returned: triage.candidates.length,
      classification: triage.classification,
      qualityAttributes: triage.qualityAttributes,
      selected: candidates.map(c => ({ id: c.hypothesisId.trim(), relevance: c.relevance, reason: c.reason })),
      dropped,
    };

    const results = await mapWithConcurrency(candidates, modelDef.concurrency, async c => {
      const hypothesis = byId.get(c.hypothesisId.trim())!;
      const assessment = await generateStructured({
        model,
        schema: IssueAssessOutputSchema,
        system: ISSUE_ASSESS_SYSTEM_PROMPT,
        prompt: buildIssueAssessPrompt(issue, hypothesis, modelDef.maxInputChars),
        step: 'assess',
        trace: trace.steps,
        details: { hypothesisId: hypothesis.id },
      });
      const guarded = guardIssueAssessment({
        hypothesis,
        assessment,
        issueUrl: issue.url,
        issueNumber: issue.number,
        confidenceThreshold: repo.confidenceThreshold,
      });
      const step = trace.steps.find(s => s.step === 'assess' && s.details?.hypothesisId === hypothesis.id);
      if (step) {
        step.details = {
          ...step.details,
          model: { related: assessment.related, confidence: assessment.confidence, evidenceType: assessment.evidenceType },
          kept: guarded.suggestions.map(s => s.kind),
          dropped: guarded.dropped,
        };
      }
      return guarded;
    });

    const source = { artifactRef: toIssueRef(issue.repository, issue.number), url: issue.url, kind: 'issue' as const };
    let stored = 0;
    for (const r of results) {
      for (const s of r.suggestions) {
        await upsertPendingSuggestion(knex, { runId, source }, s);
        stored++;
      }
    }

    const related = results.flatMap(r => (r.related ? [r.related] : []));
    await upsertObservation(knex, {
      repository: issue.repository,
      number: issue.number,
      url: issue.url,
      title: issue.title,
      author: issue.author,
      labels: issue.labels,
      state: issue.state,
      stateReason: issue.stateReason,
      createdAt: issue.createdAt,
      closedAt: issue.closedAt,
      comments: issue.comments,
      reopened: issue.reopened,
      classification: triage.classification,
      qualityAttributes: triage.qualityAttributes,
      related,
    });

    stored += await raiseEvidenceAlerts(deps, runId, related, source);

    trace.suggestions = stored;
    await finishRun(knex, runId, { status: 'completed', trace });
    logger.info('Issue triage completed', {
      runId,
      repository: issue.repository,
      number: issue.number,
      classification: triage.classification,
      related: related.length,
      suggestions: stored,
    });
    return { runId, status: 'completed', suggestions: stored };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(knex, runId, { status: 'failed', trace, error: message });
    logger.error('Issue triage failed', { repository: event.repository, number: event.number, error: message });
    throw error;
  }
}

/**
 * When enough human issues report the same kind of evidence about a hypothesis, ask the team
 * to reconsider it (ArchHypo leaves the reassessment itself to the team).
 */
async function raiseEvidenceAlerts(
  deps: PipelineDeps,
  runId: string,
  related: Array<{ hypothesisId: string; evidenceType: EvidenceType }>,
  source: { artifactRef: string; url: string; kind: 'issue' },
): Promise<number> {
  const threshold = deps.config.issues.alertThreshold;
  let raised = 0;
  const observations = related.length > 0 ? await listObservations(deps.knex) : [];
  for (const r of related) {
    if (r.evidenceType !== 'supports' && r.evidenceType !== 'contradicts') continue;
    // After the team reviewed an alert, only issues reported since then count toward a new one.
    const reviewed = await deps.knex('agent_suggestions')
      .where({ hypothesis_id: r.hypothesisId, kind: 'evidence_alert' })
      .whereIn('status', ['accepted', 'rejected'])
      .orderBy('reviewed_at', 'desc')
      .first('payload', 'reviewed_at');
    const reviewedAt =
      reviewed && JSON.parse(reviewed.payload).evidenceType === r.evidenceType && reviewed.reviewed_at
        ? new Date(reviewed.reviewed_at).getTime()
        : 0;
    const issues = observations
      .filter(o => o.related.some(x => x.hypothesisId === r.hypothesisId && x.evidenceType === r.evidenceType))
      .filter(o => new Date(o.createdAt).getTime() > reviewedAt)
      .map(o => o.url);
    if (issues.length < threshold) continue;
    await upsertPendingSuggestion(deps.knex, { runId, source }, {
      hypothesisId: r.hypothesisId,
      technicalPlanningId: null,
      kind: 'evidence_alert',
      payload: { evidenceType: r.evidenceType, issues },
      rationale: `${issues.length} reported issues ${
        r.evidenceType === 'contradicts' ? 'suggest this uncertainty is materializing' : 'are consistent with this hypothesis'
      }. Consider reassessing it at the next review.`,
      evidence: [],
      confidence: 1,
    });
    raised++;
  }
  return raised;
}
