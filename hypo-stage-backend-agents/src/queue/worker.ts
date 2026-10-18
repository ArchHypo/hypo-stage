import type PgBoss from 'pg-boss';
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { PullRequestEvent } from '../github/webhook';
import type { IssueEvent } from '../github/events';
import { PipelineDeps, runPullRequestPipeline } from '../pipeline/run';
import { runIssueTriage } from '../issues/triage';
import { runPlanSync } from '../issues/planSync';
import { runPlanComment } from '../issues/planComment';

export const ANALYZE_PR_QUEUE = 'hypo-stage-agents.analyze-pr';

export interface AnalyzePrJob {
  event: PullRequestEvent;
}

const SEND_OPTIONS: PgBoss.SendOptions = {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
  expireInMinutes: 15,
};

export type EnqueueAnalyzePr = (job: AnalyzePrJob) => Promise<string | null>;

export const ISSUES_QUEUE = 'hypo-stage-agents.issues';

export type IssueJob =
  | { handler: 'issue_triage'; issue: IssueEvent }
  | { handler: 'plan_sync'; issue: IssueEvent; planningId: string }
  | { handler: 'plan_comment'; issue: IssueEvent; planningId: string };

export type EnqueueIssue = (job: IssueJob) => Promise<string | null>;

export function createIssueEnqueue(boss: PgBoss, debounceSeconds: number): EnqueueIssue {
  return job => {
    if (job.handler === 'plan_sync') {
      // Deterministic and cheap: run each delivery once, right away.
      return boss.send(ISSUES_QUEUE, job, {
        ...SEND_OPTIONS,
        singletonKey: `${job.issue.artifactRef}:plan_sync:${job.issue.deliveryId ?? job.issue.action}`,
      });
    }
    // Debounced: events within the window are dropped, and the job reads the issue fresh.
    return boss.send(ISSUES_QUEUE, job, {
      ...SEND_OPTIONS,
      singletonKey: `${job.issue.artifactRef}:${job.handler}`,
      startAfter: debounceSeconds,
    });
  };
}

export function createEnqueue(boss: PgBoss): EnqueueAnalyzePr {
  return job =>
    boss.send(ANALYZE_PR_QUEUE, job, {
      ...SEND_OPTIONS,
      // Deduplicates webhook redeliveries and repeated events for the same commit.
      singletonKey: `${job.event.artifactRef}@${job.event.headSha ?? 'unknown'}:${
        job.event.merged ? 'merged' : 'open'
      }`,
    });
}

export async function registerWorker(
  boss: PgBoss,
  deps: PipelineDeps & { logger: LoggerService },
): Promise<void> {
  await boss.work<AnalyzePrJob>(ANALYZE_PR_QUEUE, { teamConcurrency: 2 }, async job => {
    const result = await runPullRequestPipeline(deps, job.data.event);
    return result;
  });
  await boss.work<IssueJob>(ISSUES_QUEUE, { teamConcurrency: 2 }, async job => {
    const data = job.data;
    switch (data.handler) {
      case 'issue_triage':
        return runIssueTriage(deps, data.issue);
      case 'plan_sync':
        return runPlanSync(deps, data.issue, data.planningId);
      case 'plan_comment':
        return runPlanComment(deps, data.issue, data.planningId);
      default:
        return { skipped: true };
    }
  });
  deps.logger.info('HypoStage agents workers registered', { queues: [ANALYZE_PR_QUEUE, ISSUES_QUEUE] });
}
