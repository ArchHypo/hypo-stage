import type { AgentsConfig } from '../config';
import { findRepository } from '../config';
import { toIssueRef } from '../store/issues';

/** Hidden marker HypoStage writes into the body of the issues it creates. */
export const PLAN_MARKER_PATTERN = /<!--\s*hypostage:planning=([0-9a-f-]{36})\s*-->/i;
export const PLAN_LABEL = 'archhypo:plan';
/** Marker on comments HypoStage itself posts, so they are never analyzed as evidence. */
export const AUTOMATED_MARKER = '<!-- hypostage:automated -->';

export interface GitHubIssueWebhook {
  action?: string;
  issue?: {
    number?: number;
    html_url?: string;
    title?: string;
    body?: string | null;
    state?: string;
    state_reason?: string | null;
    labels?: Array<{ name?: string } | string>;
    pull_request?: unknown;
    user?: { login?: string };
  };
  comment?: { body?: string; user?: { login?: string; type?: string } };
  changes?: { title?: unknown; body?: unknown };
  label?: { name?: string };
  repository?: { full_name?: string };
  sender?: { login?: string; type?: string };
}

export interface IssueEvent {
  event: 'issues' | 'issue_comment';
  action: string;
  repository: string;
  number: number;
  url: string;
  artifactRef: string;
  labels: string[];
  sender: string | null;
  deliveryId: string | null;
}

export type IssueRoute =
  | { route: 'ignore'; reason: string }
  | { route: 'issue_triage'; issue: IssueEvent }
  | { route: 'plan_sync'; issue: IssueEvent; planningId: string }
  | { route: 'plan_comment'; issue: IssueEvent; planningId: string };

const TRIAGE_ISSUE_ACTIONS = new Set(['opened', 'edited', 'reopened', 'labeled', 'closed']);
const SYNC_ISSUE_ACTIONS = new Set(['closed', 'reopened', 'edited']);

function labelNames(labels: unknown): string[] {
  return (Array.isArray(labels) ? labels : [])
    .map((l: { name?: string } | string) => (typeof l === 'string' ? l : l?.name ?? ''))
    .filter(Boolean);
}

/**
 * Decides, before any LLM call, what an `issues` / `issue_comment` event means. Issues that
 * HypoStage created (plan issues) are mirrors of a technical planning: they only sync that
 * planning and are never triaged as evidence, which prevents feedback loops.
 */
export async function routeIssueEvent(options: {
  eventName: 'issues' | 'issue_comment';
  payload: GitHubIssueWebhook;
  deliveryId: string | null;
  config: AgentsConfig;
  /** Returns the technical planning id when the issue is a known plan issue. */
  findPlanningForIssue: (repository: string, number: number) => Promise<string | null>;
}): Promise<IssueRoute> {
  const { eventName, payload, config } = options;
  const issue = payload.issue;
  const repository = payload.repository?.full_name;
  if (!issue?.number || !issue.html_url || !repository) {
    return { route: 'ignore', reason: 'payload without issue or repository' };
  }
  if (issue.pull_request) {
    return { route: 'ignore', reason: 'pull request conversation, handled by PR analysis' };
  }

  // Echo suppression: only when a dedicated bot account is configured. With a personal token
  // the "bot" would be a real person whose own issues must still be analyzed.
  const sender = payload.sender?.login ?? null;
  const botLogin = config.github.botLogin?.toLowerCase();
  if (botLogin && sender?.toLowerCase() === botLogin) {
    return { route: 'ignore', reason: 'event caused by HypoStage itself' };
  }

  if (eventName === 'issue_comment' && payload.comment?.body?.includes(AUTOMATED_MARKER)) {
    return { route: 'ignore', reason: 'comment posted by HypoStage itself' };
  }

  const action = payload.action ?? 'unknown';
  const labels = labelNames(issue.labels);
  const event: IssueEvent = {
    event: eventName,
    action,
    repository,
    number: issue.number,
    url: issue.html_url,
    artifactRef: toIssueRef(repository, issue.number),
    labels,
    sender,
    deliveryId: options.deliveryId,
  };

  const linkedPlanning = await options.findPlanningForIssue(repository, issue.number);
  const markerPlanning = issue.body?.match(PLAN_MARKER_PATTERN)?.[1] ?? null;
  const planningId = linkedPlanning ?? markerPlanning;

  if (planningId) {
    if (eventName === 'issue_comment') {
      return action === 'created'
        ? { route: 'plan_comment', issue: event, planningId }
        : { route: 'ignore', reason: `plan issue comment ${action}` };
    }
    return SYNC_ISSUE_ACTIONS.has(action)
      ? { route: 'plan_sync', issue: event, planningId }
      : { route: 'ignore', reason: `plan issue ${action}` };
  }

  const repo = findRepository(config, repository);
  if (!repo?.issues.triage) {
    return { route: 'ignore', reason: 'issue triage not enabled for this repository' };
  }
  // A plan label without link or marker was copied by a human: it is treated as a human issue.
  if (labels.some(l => repo.issues.ignoreLabels.includes(l))) {
    return { route: 'ignore', reason: 'issue has an ignored label' };
  }
  if (repo.issues.labels.length > 0 && !labels.some(l => repo.issues.labels.includes(l))) {
    return { route: 'ignore', reason: 'issue has none of the triage labels' };
  }
  if (eventName === 'issue_comment') {
    return action === 'created'
      ? { route: 'issue_triage', issue: event }
      : { route: 'ignore', reason: `comment ${action}` };
  }
  if (!TRIAGE_ISSUE_ACTIONS.has(action)) {
    return { route: 'ignore', reason: `unsupported issue action '${action}'` };
  }
  if (action === 'edited' && !(payload.changes?.title || payload.changes?.body)) {
    return { route: 'ignore', reason: 'edit did not change title or body' };
  }
  return { route: 'issue_triage', issue: event };
}
