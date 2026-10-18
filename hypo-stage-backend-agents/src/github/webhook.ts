import crypto from 'crypto';

export function verifyGitHubSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`;

  const provided = Buffer.from(signatureHeader);
  const expected = Buffer.from(expectedSignature);

  return provided.length === expected.length && crypto.timingSafeEqual(provided, expected);
}

export interface GitHubPullRequestWebhook {
  action?: string;
  number?: number;
  changes?: { title?: unknown; body?: unknown };
  pull_request?: {
    number?: number;
    html_url?: string;
    title?: string;
    body?: string | null;
    draft?: boolean;
    merged?: boolean;
    state?: string;
    head?: { sha?: string };
  };
  repository?: {
    full_name?: string;
  };
}

export interface PullRequestEvent {
  repository: string;
  number: number;
  artifactRef: string;
  url: string;
  headSha: string | null;
  action: string;
  merged: boolean;
  deliveryId: string | null;
}

export function toArtifactRef(repository: string, number: number): string {
  return `${repository}#pull/${number}`;
}

/** Returns null when the payload is missing the fields we rely on. */
export function normalizePullRequestEvent(
  payload: GitHubPullRequestWebhook,
  deliveryId: string | null,
): PullRequestEvent | null {
  const repository = payload.repository?.full_name;
  const number = payload.number ?? payload.pull_request?.number;
  const url = payload.pull_request?.html_url;
  if (!repository || !number || !url) {
    return null;
  }
  return {
    repository,
    number,
    artifactRef: toArtifactRef(repository, number),
    url,
    headSha: payload.pull_request?.head?.sha ?? null,
    action: payload.action ?? 'unknown',
    merged: payload.pull_request?.merged === true,
    deliveryId,
  };
}

export type WebhookDecision =
  | { kind: 'analyze' }
  | { kind: 'supersede' }
  | { kind: 'ignore'; reason: string };

const ANALYZE_ACTIONS = new Set(['opened', 'reopened', 'synchronize', 'ready_for_review']);

/** Decides what to do with a pull_request event. */
export function decidePullRequestAction(payload: GitHubPullRequestWebhook): WebhookDecision {
  const action = payload.action ?? 'unknown';
  const pr = payload.pull_request;

  if (action === 'closed') {
    return pr?.merged ? { kind: 'analyze' } : { kind: 'supersede' };
  }
  if (pr?.draft) {
    return { kind: 'ignore', reason: 'draft pull request' };
  }
  if (ANALYZE_ACTIONS.has(action)) {
    return { kind: 'analyze' };
  }
  if (action === 'edited') {
    const changes = payload.changes ?? {};
    return changes.title || changes.body
      ? { kind: 'analyze' }
      : { kind: 'ignore', reason: 'edit did not change title or body' };
  }
  return { kind: 'ignore', reason: `unsupported action '${action}'` };
}
