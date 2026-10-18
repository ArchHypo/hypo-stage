export interface PullRequestFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch: string | null;
}

export interface PullRequestDetails {
  repository: string;
  number: number;
  title: string;
  body: string | null;
  url: string;
  author: string | null;
  merged: boolean;
  headSha: string | null;
  files: PullRequestFile[];
}

export interface IssueComment {
  author: string | null;
  body: string;
  createdAt: string;
}

export interface IssueDetails {
  repository: string;
  number: number;
  url: string;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  stateReason: string | null;
  author: string | null;
  labels: string[];
  createdAt: string;
  closedAt: string | null;
  comments: number;
  /** First human comments, oldest first. */
  commentThread: IssueComment[];
  reopened: number;
  /** Merged PR that closed or references the issue, when the timeline shows one. */
  closingPullRequest: { url: string; merged: boolean } | null;
  isPullRequest: boolean;
}

export interface GitHubClient {
  getPullRequest(repository: string, number: number): Promise<PullRequestDetails>;
  getIssue(repository: string, number: number): Promise<IssueDetails>;
  createIssue(
    repository: string,
    issue: { title: string; body: string; labels: string[] },
  ): Promise<{ number: number; url: string }>;
  /** Comments on the issue, then closes it as completed. */
  closeIssue(repository: string, number: number, comment: string): Promise<void>;
}

export class GitHubRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const GITHUB_API = 'https://api.github.com';
const MAX_FILE_PAGES = 10; // 100 files per page; GitHub caps the endpoint at 3000 files

function splitRepository(repository: string) {
  const match = repository.match(/^([^/]+)\/([^/]+)$/);
  if (!match) {
    throw new Error(`Invalid GitHub repository format: ${repository}`);
  }
  return { owner: match[1], repo: match[2] };
}

export function createGitHubClient(options: {
  token: string | undefined;
  fetchImpl?: typeof fetch;
}): GitHubClient {
  const fetchImpl = options.fetchImpl ?? fetch;

  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!options.token) {
      throw new Error('hypoStage.github.apiToken is not configured');
    }
    const response = await fetchImpl(`${GITHUB_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${options.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'hypo-stage-agents',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new GitHubRequestError(
        `GitHub ${method} ${path} failed: ${response.status} ${response.statusText}`,
        response.status,
      );
    }
    return (await response.json()) as T;
  }

  const get = <T>(path: string) => request<T>('GET', path);

  return {
    async getPullRequest(repository, number) {
      const { owner, repo } = splitRepository(repository);
      const base = `/repos/${owner}/${repo}/pulls/${number}`;

      const pr = await get<{
        title?: string;
        body?: string | null;
        html_url: string;
        user?: { login?: string | null };
        merged?: boolean;
        head?: { sha?: string };
      }>(base);

      const files: PullRequestFile[] = [];
      for (let page = 1; page <= MAX_FILE_PAGES; page++) {
        const batch = await get<
          Array<{
            filename: string;
            status: string;
            additions: number;
            deletions: number;
            patch?: string;
          }>
        >(`${base}/files?per_page=100&page=${page}`);
        files.push(
          ...batch.map(f => ({
            filename: f.filename,
            status: f.status,
            additions: f.additions,
            deletions: f.deletions,
            patch: f.patch ?? null,
          })),
        );
        if (batch.length < 100) {
          break;
        }
      }

      return {
        repository,
        number,
        title: pr.title ?? '',
        body: pr.body ?? null,
        url: pr.html_url,
        author: pr.user?.login ?? null,
        merged: pr.merged === true,
        headSha: pr.head?.sha ?? null,
        files,
      };
    },

    async getIssue(repository, number) {
      const { owner, repo } = splitRepository(repository);
      const base = `/repos/${owner}/${repo}/issues/${number}`;
      const issue = await get<{
        html_url: string;
        title?: string;
        body?: string | null;
        state?: string;
        state_reason?: string | null;
        user?: { login?: string; type?: string };
        labels?: Array<{ name?: string } | string>;
        created_at: string;
        closed_at?: string | null;
        comments?: number;
        pull_request?: unknown;
      }>(base);

      const comments = await get<
        Array<{ body?: string; created_at: string; user?: { login?: string; type?: string } }>
      >(`${base}/comments?per_page=30`).catch(() => []);

      let reopened = 0;
      let closingPullRequest: IssueDetails['closingPullRequest'] = null;
      try {
        const timeline = await get<
          Array<{
            event?: string;
            source?: { issue?: { html_url?: string; pull_request?: { merged_at?: string | null } } };
          }>
        >(`${base}/timeline?per_page=100`);
        for (const item of timeline) {
          if (item.event === 'reopened') reopened++;
          const pr = item.source?.issue;
          if (item.event === 'cross-referenced' && pr?.pull_request && pr.html_url) {
            const merged = Boolean(pr.pull_request.merged_at);
            if (!closingPullRequest || (merged && !closingPullRequest.merged)) {
              closingPullRequest = { url: pr.html_url, merged };
            }
          }
        }
      } catch {
        // the timeline is optional context
      }

      return {
        repository,
        number,
        url: issue.html_url,
        title: issue.title ?? '',
        body: issue.body ?? null,
        state: issue.state === 'closed' ? 'closed' : 'open',
        stateReason: issue.state_reason ?? null,
        author: issue.user?.login ?? null,
        labels: (issue.labels ?? [])
          .map(l => (typeof l === 'string' ? l : l?.name ?? ''))
          .filter(Boolean),
        createdAt: issue.created_at,
        closedAt: issue.closed_at ?? null,
        comments: issue.comments ?? comments.length,
        commentThread: comments
          .filter(c => c.user?.type !== 'Bot')
          .slice(0, 10)
          .map(c => ({ author: c.user?.login ?? null, body: c.body ?? '', createdAt: c.created_at })),
        reopened,
        closingPullRequest,
        isPullRequest: Boolean(issue.pull_request),
      };
    },

    async createIssue(repository, issue) {
      const { owner, repo } = splitRepository(repository);
      const created = await request<{ number: number; html_url: string }>(
        'POST',
        `/repos/${owner}/${repo}/issues`,
        issue,
      );
      return { number: created.number, url: created.html_url };
    },

    async closeIssue(repository, number, comment) {
      const { owner, repo } = splitRepository(repository);
      const base = `/repos/${owner}/${repo}/issues/${number}`;
      await request('POST', `${base}/comments`, { body: comment });
      await request('PATCH', base, { state: 'closed', state_reason: 'completed' });
    },
  };
}
