import type { IssueEvent } from '../github/events';
import type { PipelineDeps } from '../pipeline/run';
import { toIssueRef } from '../store/issues';
import { finishRun, RunTrace, startRun } from '../store/runs';
import { upsertPendingSuggestion } from '../store/suggestions';
import type { IssueHandlerResult } from './triage';

/**
 * A human comment on a plan issue is evidence for that planning only. It does not run the
 * pull-request assessment, so a comment cannot reassess the hypothesis or open a new plan.
 * Accepting the suggestion records the issue URL on the planning.
 */
export async function runPlanComment(
  deps: PipelineDeps,
  event: IssueEvent,
  planningId: string,
): Promise<IssueHandlerResult> {
  const { knex, logger } = deps;
  const planningRow = await knex('technicalPlanning').where('id', planningId).first('hypothesisId');
  if (!planningRow) {
    return { runId: null, status: 'skipped', suggestions: 0 };
  }
  const runId = await startRun(knex, {
    repository: event.repository,
    prNumber: event.number,
    headSha: null,
    prUrl: event.url,
    triggerAction: `${event.event}.${event.action}`,
    modelKey: 'none',
    provider: 'none',
    artifactKind: 'issue',
    handler: 'plan_comment',
    origin: 'hypostage',
  });
  const trace: RunTrace = { steps: [] };

  try {
    const issue = await deps.github.getIssue(event.repository, event.number);
    const latest = [...issue.commentThread].reverse().find(comment => comment.body.trim());
    let suggestions = 0;
    if (latest) {
      await upsertPendingSuggestion(
        knex,
        { runId, source: { artifactRef: toIssueRef(event.repository, event.number), url: issue.url, kind: 'issue' } },
        {
          hypothesisId: planningRow.hypothesisId,
          technicalPlanningId: planningId,
          kind: 'planning_progress',
          payload: { effect: 'advances', expectedOutcome: null },
          rationale: `Comment on plan issue #${issue.number}: ${latest.body.trim().slice(0, 500)}`,
          evidence: [],
          confidence: 1,
        },
      );
      suggestions = 1;
    }
    trace.steps.push({ step: 'plan_comment', durationMs: 0, details: { planningId, suggestions } });
    trace.suggestions = suggestions;
    await finishRun(knex, runId, { status: 'completed', trace });
    logger.info('Plan issue comment recorded', { number: event.number, suggestions });
    return { runId, status: 'completed', suggestions };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(knex, runId, { status: 'failed', trace, error: message });
    throw error;
  }
}
