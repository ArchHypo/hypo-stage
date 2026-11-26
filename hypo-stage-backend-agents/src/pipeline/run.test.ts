import type { Knex } from 'knex';
import { MockLanguageModelV3 } from 'ai/test';
import type { LanguageModelV3CallOptions } from '@ai-sdk/provider';
import { mockServices } from '@backstage/backend-test-utils';
import {
  createTestDatabase,
  insertHypothesis,
  insertPlanning,
  PR_URL,
  TEST_REPO,
  testConfig,
} from '../__testUtils__/fixtures';
import type { GitHubClient, PullRequestDetails } from '../github/client';
import type { PullRequestEvent } from '../github/webhook';
import { runPullRequestPipeline } from './run';

const H1 = '11111111-1111-4111-8111-111111111111';
const H2 = '22222222-2222-4222-8222-222222222222';
const TP1 = '33333333-3333-4333-8333-333333333333';

const event: PullRequestEvent = {
  repository: TEST_REPO,
  number: 7,
  artifactRef: `${TEST_REPO}#pull/7`,
  url: PR_URL,
  headSha: 'abc',
  action: 'closed',
  merged: true,
  deliveryId: 'd1',
};

const pr: PullRequestDetails = {
  repository: TEST_REPO,
  number: 7,
  title: 'Add k6 load test for the gateway client',
  body: 'Runs the spike planned for the throughput hypothesis.',
  url: PR_URL,
  author: 'dev',
  merged: true,
  headSha: 'abc',
  files: [
    { filename: 'load/gateway.k6.js', status: 'added', additions: 40, deletions: 0, patch: '+export default () => http.post(...)' },
    { filename: 'yarn.lock', status: 'modified', additions: 300, deletions: 10, patch: '+lock' },
  ],
};

function result(json: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(json) }],
    finishReason: { unified: 'stop' as const, raw: 'stop' },
    usage: {
      inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 20, text: 20, reasoning: 0 },
    },
    warnings: [],
  };
}

function systemText(options: LanguageModelV3CallOptions): string {
  const system = options.prompt.find(m => m.role === 'system');
  return system && typeof system.content === 'string' ? system.content : '';
}

function userText(options: LanguageModelV3CallOptions): string {
  return JSON.stringify(options.prompt.filter(m => m.role === 'user'));
}

describe('runPullRequestPipeline', () => {
  let knex: Knex;

  beforeEach(async () => {
    knex = await createTestDatabase();
    await insertHypothesis(knex, { id: H1 });
    await insertHypothesis(knex, {
      id: H2,
      statement: 'Users of the old system can use the new one after a short training',
      qualityAttributes: JSON.stringify(['Usability']),
    });
    await insertHypothesis(knex, {
      id: '44444444-4444-4444-8444-444444444444',
      status: 'Validated',
      statement: 'Closed hypotheses are not analyzed by the agents pipeline',
    });
    await insertPlanning(knex, { id: TP1, hypothesisId: H1 });
  });

  afterEach(async () => {
    await knex.destroy();
  });

  function deps(model: MockLanguageModelV3, github?: Partial<GitHubClient>) {
    return {
      knex,
      logger: mockServices.logger.mock(),
      config: testConfig(),
      github: { getPullRequest: jest.fn().mockResolvedValue(pr), ...github },
      models: { resolve: () => model },
      resolveRepositoryEntityRefs: jest.fn().mockResolvedValue(['component:default/payments']),
    };
  }

  it('runs triage and assessment and stores guarded suggestions', async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async options => {
        if (systemText(options).includes('select the hypotheses')) {
          return result({
            candidates: [
              { hypothesisId: H1, relevance: 0.95, reason: 'load test of the gateway' },
              { hypothesisId: H2, relevance: 0.2, reason: 'weak' },
              { hypothesisId: 'made-up', relevance: 0.9, reason: 'hallucinated' },
            ],
          });
        }
        return result({
          related: true,
          confidence: 0.85,
          rationale: 'The PR executes the planned spike and reports throughput.',
          evidence: [{ file: 'load/gateway.k6.js', note: 'load test' }],
          reassessment: { uncertainty: 'Low', impact: null, reason: 'Throughput measured' },
          planningProgress: [
            { technicalPlanningId: TP1, effect: 'completes', expectedOutcomeUpdate: null, reason: 'Spike done' },
          ],
          newPlanning: null,
          statusChange: { status: 'Validated', reason: '1400 rps measured on one node' },
        });
      },
    });

    const outcome = await runPullRequestPipeline(deps(model), event);

    expect(outcome).toMatchObject({ status: 'completed', suggestions: 4 });
    // one triage + one assessment (H2 below relevance cut, invented id dropped)
    expect(model.doGenerateCalls).toHaveLength(2);
    // closed hypotheses never reach the model; plannings do
    const triagePrompt = userText(model.doGenerateCalls[0]);
    expect(triagePrompt).not.toContain('Closed hypotheses are not analyzed');
    expect(userText(model.doGenerateCalls[1])).toContain(TP1);
    expect(userText(model.doGenerateCalls[1])).not.toContain('+lock');

    const rows = await knex('agent_suggestions').orderBy('kind');
    expect(rows.map(r => [r.kind, r.hypothesis_id, r.technical_planning_id])).toEqual([
      ['link', H1, null],
      ['planning_progress', H1, TP1],
      ['reassessment', H1, TP1],
      ['status_change', H1, null],
    ]);
    expect(rows.every(r => r.artifact_url === PR_URL && r.status === 'pending')).toBe(true);

    const run = await knex('agent_runs').first();
    expect(run.status).toBe('completed');
    const trace = JSON.parse(run.trace);
    expect(trace).toMatchObject({ scope: 'repository', hypothesesInScope: 2, suggestions: 4 });
    expect(trace.steps.map((s: { step: string }) => s.step)).toEqual(['context', 'triage', 'assess']);
    expect(trace.steps[1]).toMatchObject({ inputTokens: 100, outputTokens: 20 });
    expect(trace.steps[1].details.dropped).toEqual([
      { id: H2, relevance: 0.2, reason: 'relevance below 0.4' },
      { id: 'made-up', relevance: 0.9, reason: 'unknown hypothesis id' },
    ]);
    expect(trace.steps[2].details).toMatchObject({
      hypothesisId: H1,
      model: { related: true, confidence: 0.85, statusChange: { status: 'Validated' } },
      kept: ['link', 'planning_progress', 'reassessment', 'status_change'],
      dropped: [],
    });
  });

  it('supersedes earlier pending suggestions when the PR is re-analyzed', async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async options =>
        systemText(options).includes('select the hypotheses')
          ? result({ candidates: [{ hypothesisId: H1, relevance: 0.9, reason: 'r' }] })
          : result({
              related: true, confidence: 0.9, rationale: 'r', evidence: [],
              reassessment: null, planningProgress: [], newPlanning: null, statusChange: null,
            }),
    });

    await runPullRequestPipeline(deps(model), event);
    await runPullRequestPipeline(deps(model), event);

    const statuses = (await knex('agent_suggestions').orderBy('createdAt')).map(r => r.status).sort();
    expect(statuses).toEqual(['pending', 'superseded']);
  });

  it('records failures and rethrows for pg-boss retries', async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new Error('provider down');
      },
    });
    await expect(runPullRequestPipeline(deps(model), event)).rejects.toThrow();
    const run = await knex('agent_runs').first();
    expect(run.status).toBe('failed');
    expect(run.error).toBeTruthy();
  });

  it('skips unconfigured repositories without creating a run', async () => {
    const model = new MockLanguageModelV3();
    const outcome = await runPullRequestPipeline(deps(model), { ...event, repository: 'other/repo' });
    expect(outcome.status).toBe('skipped');
    expect(await knex('agent_runs').count({ c: '*' })).toEqual([{ c: 0 }]);
  });

  it('matches "Fixes #N" plan issues deterministically and merges with the issue-closed suggestion', async () => {
    const { insertIssueLink } = jest.requireActual('../store/issues');
    const { upsertPendingSuggestion } = jest.requireActual('../store/suggestions');
    await insertIssueLink(knex, {
      technicalPlanningId: TP1, hypothesisId: H1, repository: TEST_REPO, issueNumber: 4,
      issueUrl: `https://github.com/${TEST_REPO}/issues/4`, createdBy: 'u',
    });
    // The issue was already closed by GitHub and synced
    await upsertPendingSuggestion(
      knex,
      { runId: null, source: { artifactRef: `${TEST_REPO}#issue/4`, url: `https://github.com/${TEST_REPO}/issues/4`, kind: 'issue' } },
      { hypothesisId: H1, technicalPlanningId: TP1, kind: 'planning_progress', payload: { effect: 'completes', expectedOutcome: null }, rationale: 'closed', evidence: [], confidence: 1 },
    );

    const model = new MockLanguageModelV3({
      doGenerate: async options =>
        systemText(options).includes('select the hypotheses')
          ? result({ candidates: [{ hypothesisId: H1, relevance: 0.9, reason: 'r' }] })
          : result({
              related: true, confidence: 0.9, rationale: 'r', evidence: [], reassessment: null,
              // the model also claims progress on the same planning: must be ignored
              planningProgress: [{ technicalPlanningId: TP1, effect: 'completes', expectedOutcomeUpdate: null, reason: 'x' }],
              newPlanning: null, statusChange: null,
            }),
    });
    const fixingPr = { ...pr, body: 'Implements the load test. Fixes #4.' };
    await runPullRequestPipeline(deps(model, { getPullRequest: jest.fn().mockResolvedValue(fixingPr) }), event);

    const progress = await knex('agent_suggestions').where('kind', 'planning_progress');
    expect(progress).toHaveLength(1);
    expect(JSON.parse(progress[0].sources).map((x: { kind: string }) => x.kind)).toEqual(['issue', 'pull_request']);
  });

  it('does not propose completing a plan issue planning that is already completed', async () => {
    const { insertIssueLink } = jest.requireActual('../store/issues');
    await insertIssueLink(knex, {
      technicalPlanningId: TP1, hypothesisId: H1, repository: TEST_REPO, issueNumber: 4,
      issueUrl: `https://github.com/${TEST_REPO}/issues/4`, createdBy: 'u',
    });
    await knex('agent_suggestions').insert({
      id: 'done', run_id: null, hypothesis_id: H1, technical_planning_id: TP1, kind: 'planning_progress',
      payload: JSON.stringify({ effect: 'completes', expectedOutcome: null }), rationale: 'r', evidence: '[]',
      confidence: 1, artifact_ref: 'x', artifact_url: 'x', status: 'accepted', reviewed_at: new Date(),
    });
    const model = new MockLanguageModelV3({
      doGenerate: async options =>
        systemText(options).includes('select the hypotheses')
          ? result({ candidates: [] })
          : result({}),
    });
    await runPullRequestPipeline(
      deps(model, { getPullRequest: jest.fn().mockResolvedValue({ ...pr, body: 'Fixes #4' }) }),
      event,
    );
    expect(await knex('agent_suggestions').where('status', 'pending')).toHaveLength(0);
  });
});
