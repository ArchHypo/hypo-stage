import type { IssueEvent } from '../github/events';
import type { PipelineDeps } from '../pipeline/run';
import { findLinkByIssue, insertIssueLink, toIssueRef, updateLinkState } from '../store/issues';
import { finishRun, RunTrace, startRun } from '../store/runs';
import { isPlanningCompleted, supersedeFromSource, upsertPendingSuggestion } from '../store/suggestions';
import type { IssueHandlerResult } from './triage';

function linkStateReason(state: string, stateReason: string | null, action: string): string | null {
  if (state === 'closed') return stateReason;
  return action === 'reopened' ? 'reopened' : null;
}

/**
 * Plan issues mirror a technical planning. Their state only updates that planning,
 * deterministically and without any model: closing as completed proposes the action as
 * done, reopening withdraws that proposal.
 */
export async function runPlanSync(
  deps: PipelineDeps,
  event: IssueEvent,
  planningId: string,
): Promise<IssueHandlerResult> {
  const { knex, logger } = deps;
  const planning = await knex('technicalPlanning').where('id', planningId).first('id', 'hypothesisId');
  if (!planning) {
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
    handler: 'plan_sync',
    origin: 'hypostage',
  });
  const trace: RunTrace = { steps: [] };

  try {
    const issue = await deps.github.getIssue(event.repository, event.number);
    if (!(await findLinkByIssue(knex, event.repository, event.number))) {
      // Recover a link from the body marker (e.g. the webhook arrived before the link row).
      await insertIssueLink(knex, {
        technicalPlanningId: planningId,
        hypothesisId: planning.hypothesisId,
        repository: event.repository,
        issueNumber: event.number,
        issueUrl: issue.url,
        createdBy: null,
      }).catch(() => undefined);
    }
    await updateLinkState(knex, planningId, {
      state: issue.state,
      stateReason: linkStateReason(issue.state, issue.stateReason, event.action),
      closedAt: issue.closedAt ? new Date(issue.closedAt) : null,
      // A reopen means the work is not done: a later close may complete the planning again.
      ...(event.action === 'reopened' ? { reopenedAt: new Date() } : {}),
    });

    const artifactRef = toIssueRef(event.repository, event.number);
    let suggestions = 0;
    let outcome: string;
    if (issue.state === 'closed' && issue.stateReason === 'completed' && (await isPlanningCompleted(knex, planningId))) {
      outcome = 'planning already completed';
    } else if (issue.state === 'closed' && issue.stateReason === 'completed') {
      await upsertPendingSuggestion(
        knex,
        { runId, source: { artifactRef, url: issue.url, kind: 'issue' } },
        {
          hypothesisId: planning.hypothesisId,
          technicalPlanningId: planningId,
          kind: 'planning_progress',
          payload: { effect: 'completes', expectedOutcome: null },
          rationale: `Plan issue #${issue.number} was closed as completed.`,
          evidence: [],
          confidence: 1,
        },
      );
      suggestions = 1;
      outcome = 'proposed completes';
    } else if (event.action === 'reopened') {
      const withdrawn = await supersedeFromSource(knex, artifactRef, 'planning_progress');
      outcome = `withdrew ${withdrawn} pending completion`;
    } else {
      outcome = `state ${issue.state}${issue.stateReason ? ` (${issue.stateReason})` : ''}`;
    }
    trace.steps.push({ step: 'plan_sync', durationMs: 0, details: { planningId, outcome } });
    trace.suggestions = suggestions;
    await finishRun(knex, runId, { status: 'completed', trace });
    logger.info('Plan issue synced', { repository: event.repository, number: event.number, outcome });
    return { runId, status: 'completed', suggestions };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finishRun(knex, runId, { status: 'failed', trace, error: message });
    throw error;
  }
}
