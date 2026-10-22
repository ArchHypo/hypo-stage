import { testConfig, TEST_REPO } from '../__testUtils__/fixtures';
import { GitHubIssueWebhook, routeIssueEvent } from './events';

const PLANNING = '33333333-3333-4333-8333-333333333333';

function payload(overrides: Partial<GitHubIssueWebhook> = {}, issue: Record<string, unknown> = {}): GitHubIssueWebhook {
  return {
    action: 'opened',
    repository: { full_name: TEST_REPO },
    sender: { login: 'fernando' },
    issue: {
      number: 12,
      html_url: `https://github.com/${TEST_REPO}/issues/12`,
      title: 'Checkout times out with ~800 users',
      body: 'Timeouts during sales',
      labels: [{ name: 'bug' }],
      ...issue,
    },
    ...overrides,
  };
}

const route = (
  p: GitHubIssueWebhook,
  opts: { eventName?: 'issues' | 'issue_comment'; linked?: string | null; config?: ReturnType<typeof testConfig> } = {},
) =>
  routeIssueEvent({
    eventName: opts.eventName ?? 'issues',
    payload: p,
    deliveryId: 'd1',
    config: opts.config ?? testConfig(),
    findPlanningForIssue: async () => opts.linked ?? null,
  });

describe('routeIssueEvent', () => {
  it('triages human issues', async () => {
    expect(await route(payload())).toMatchObject({
      route: 'issue_triage',
      issue: { repository: TEST_REPO, number: 12, artifactRef: `${TEST_REPO}#issue/12`, labels: ['bug'] },
    });
    expect((await route(payload({ action: 'created' }), { eventName: 'issue_comment' })).route).toBe('issue_triage');
  });

  it('routes plan issues (by link or body marker) to sync and comment handlers, never to triage', async () => {
    expect(await route(payload({ action: 'closed' }), { linked: PLANNING })).toMatchObject({
      route: 'plan_sync',
      planningId: PLANNING,
    });
    const marked = payload({ action: 'reopened' }, { body: `text <!-- hypostage:planning=${PLANNING} -->` });
    expect(await route(marked)).toMatchObject({ route: 'plan_sync', planningId: PLANNING });
    expect(await route(payload({ action: 'created' }), { eventName: 'issue_comment', linked: PLANNING })).toMatchObject({
      route: 'plan_comment',
    });
    expect((await route(payload({ action: 'opened' }), { linked: PLANNING })).route).toBe('ignore');
    expect((await route(payload({ action: 'labeled' }), { linked: PLANNING })).route).toBe('ignore');
  });

  it('treats a copied plan label without link or marker as a human issue', async () => {
    const labelled = payload({}, { labels: [{ name: 'archhypo:plan' }] });
    expect((await route(labelled)).route).toBe('issue_triage');
  });

  it('suppresses echoes only for a configured bot login', async () => {
    const byBot = payload({ sender: { login: 'HypoStage-Bot' } });
    expect(await route(byBot)).toMatchObject({ route: 'ignore', reason: 'event caused by HypoStage itself' });
    const personalToken = testConfig({ github: { apiToken: 't', webhookSecret: 's' } });
    expect((await route(payload({ sender: { login: 'fernando' } }), { config: personalToken })).route).toBe('issue_triage');
  });

  it('ignores comments HypoStage posted itself', async () => {
    const automated = payload({ action: 'created', comment: { body: 'Completed in HypoStage.\n\n<!-- hypostage:automated -->' } });
    expect(await route(automated, { eventName: 'issue_comment', linked: PLANNING })).toMatchObject({
      route: 'ignore',
      reason: 'comment posted by HypoStage itself',
    });
  });

  it('ignores PR conversations, disabled repositories, labels and no-op edits', async () => {
    expect((await route(payload({}, { pull_request: {} }))).route).toBe('ignore');
    expect((await route(payload({ repository: { full_name: 'other/repo' } }))).route).toBe('ignore');
    expect((await route(payload({}, { labels: [{ name: 'question' }] }))).route).toBe('ignore');
    expect((await route(payload({ action: 'edited', changes: {} }))).route).toBe('ignore');
    expect((await route(payload({ action: 'edited', changes: { title: { from: 'x' } } }))).route).toBe('issue_triage');
    expect((await route(payload({ action: 'assigned' }))).route).toBe('ignore');
  });
});
