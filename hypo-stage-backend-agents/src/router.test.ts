import crypto from 'crypto';
import express from 'express';
import request from 'supertest';
import type { Knex } from 'knex';
import { mockCredentials, mockServices } from '@backstage/backend-test-utils';
import { MockLanguageModelV3 } from 'ai/test';
import { createRouter } from './router';
import { createTestDatabase, insertHypothesis, insertPlanning, PR_URL, TEST_REPO, testConfig } from './__testUtils__/fixtures';
import type { AgentsConfig } from './config';

const H1 = '11111111-1111-4111-8111-111111111111';

function sign(body: string, secret = 'secret') {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

function prPayload(overrides: Record<string, unknown> = {}, pr: Record<string, unknown> = {}) {
  return {
    action: 'opened',
    number: 7,
    repository: { full_name: TEST_REPO },
    pull_request: { number: 7, html_url: PR_URL, draft: false, merged: false, head: { sha: 'abc' }, ...pr },
    ...overrides,
  };
}

const reviewOutput = {
  classification: 'requirement',
  classificationReason: 'It states a target the system must meet.',
  falsifiable: false,
  refutingEvidence: null,
  issues: [{ type: 'not_a_hypothesis', severity: 'warning', message: 'Target, not a belief', concept: 'Hypotheses state uncertain beliefs' }],
  rewrites: [{ statement: 'A single instance can sustain 1000 requests per second', reason: 'States the belief' }],
  splitInto: [],
  suggestedSourceType: 'Requirements',
  suggestedQualityAttributes: ['Performance'],
};

let coachModel: MockLanguageModelV3;

describe('agents router', () => {
  let knex: Knex;
  let enqueue: jest.Mock;
  let enqueueIssue: jest.Mock;
  let githubClient: any;

  async function app(config: AgentsConfig = testConfig(), withQueue = true) {
    const a = express();
    a.use(
      await createRouter({
        knex,
        config,
        logger: mockServices.logger.mock(),
        httpAuth: mockServices.httpAuth({ defaultCredentials: mockCredentials.user() }),
        enqueueAnalyzePr: withQueue ? enqueue : undefined,
        models: { resolve: () => coachModel },
        coachRateLimit: { max: 2, windowMs: 60_000 },
        describeComponents: async () => [],
        enqueueIssue: withQueue ? enqueueIssue : undefined,
        github: githubClient,
        resolveEntityRepository: async () => TEST_REPO,
      }),
    );
    return a;
  }

  function post(a: express.Express, payload: unknown, event = 'pull_request', signature?: string) {
    const body = JSON.stringify(payload);
    return request(a)
      .post('/webhooks/github')
      .set('content-type', 'application/json')
      .set('x-github-event', event)
      .set('x-hub-signature-256', signature ?? sign(body))
      .send(body);
  }

  beforeEach(async () => {
    knex = await createTestDatabase();
    enqueue = jest.fn().mockResolvedValue('job-1');
    enqueueIssue = jest.fn().mockResolvedValue('issue-job-1');
    githubClient = {
      getPullRequest: jest.fn(),
      getIssue: jest.fn(),
      createIssue: jest.fn().mockResolvedValue({ number: 4, url: `https://github.com/${TEST_REPO}/issues/4` }),
      closeIssue: jest.fn().mockResolvedValue(undefined),
    };
    coachModel = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: 'text', text: JSON.stringify(reviewOutput) }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 50, noCache: 50, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 30, text: 30, reasoning: 0 },
        },
        warnings: [],
      }),
    });
  });

  afterEach(async () => {
    await knex.destroy();
  });

  describe('POST /webhooks/github', () => {
    it('rejects invalid signatures', async () => {
      const res = await post(await app(), prPayload(), 'pull_request', 'sha256=bad');
      expect(res.status).toBe(401);
      expect(enqueue).not.toHaveBeenCalled();
    });

    it('queues analyzable actions', async () => {
      const res = await post(await app(), prPayload());
      expect(res.status).toBe(202);
      expect(res.body).toEqual({ received: true, queued: true, jobId: 'job-1' });
      expect(enqueue).toHaveBeenCalledWith({
        event: expect.objectContaining({
          repository: TEST_REPO,
          number: 7,
          artifactRef: `${TEST_REPO}#pull/7`,
          url: PR_URL,
          headSha: 'abc',
          merged: false,
        }),
      });
    });

    it.each([
      ['drafts', prPayload({}, { draft: true })],
      ['label changes', prPayload({ action: 'labeled' })],
      ['edits without title/body change', prPayload({ action: 'edited', changes: { base: {} } })],
      ['unknown repositories', prPayload({ repository: { full_name: 'other/repo' } })],
    ])('ignores %s', async (_name, payload) => {
      const res = await post(await app(), payload);
      expect(res.status).toBe(202);
      expect(res.body.queued).toBe(false);
      expect(enqueue).not.toHaveBeenCalled();
    });

    it('queues a final analysis when the PR is merged', async () => {
      await post(await app(), prPayload({ action: 'closed' }, { merged: true }));
      expect(enqueue).toHaveBeenCalledWith({ event: expect.objectContaining({ merged: true }) });
    });

    it('supersedes pending suggestions when the PR is closed without merge', async () => {
      await insertHypothesis(knex, { id: H1 });
      await knex('agent_runs').insert({
        id: 'r1', repository: TEST_REPO, pr_number: 7, trigger_action: 'opened',
        model_key: 'mock', provider: 'ollama', status: 'completed', started_at: new Date(),
      });
      await knex('agent_suggestions').insert({
        id: 's1', run_id: 'r1', hypothesis_id: H1, kind: 'link', payload: '{}', rationale: 'r',
        evidence: '[]', confidence: 0.9, artifact_ref: `${TEST_REPO}#pull/7`, artifact_url: PR_URL,
      });
      const res = await post(await app(), prPayload({ action: 'closed' }));
      expect(res.body).toMatchObject({ queued: false, superseded: 1 });
      expect((await knex('agent_suggestions').first()).status).toBe('superseded');
    });

    it('answers ping and returns 503 without a queue', async () => {
      expect((await post(await app(), { zen: 'hi' }, 'ping')).status).toBe(200);
      expect((await post(await app(testConfig(), false), prPayload())).status).toBe(503);
    });
  });

  describe('suggestions review', () => {
    const S1 = '22222222-2222-4222-8222-222222222222';

    beforeEach(async () => {
      await insertHypothesis(knex, { id: H1 });
      await knex('agent_runs').insert({
        id: 'r1', repository: TEST_REPO, pr_number: 7, trigger_action: 'opened',
        model_key: 'mock', provider: 'ollama', status: 'completed', started_at: new Date(),
      });
      await knex('agent_suggestions').insert({
        id: S1, run_id: 'r1', hypothesis_id: H1, kind: 'link', payload: JSON.stringify({ url: PR_URL }),
        rationale: 'r', evidence: '[]', confidence: 0.9, artifact_ref: `${TEST_REPO}#pull/7`, artifact_url: PR_URL,
      });
    });

    it('lists suggestions and runs for a hypothesis', async () => {
      const a = await app();
      const list = await request(a).get(`/hypotheses/${H1}/agent-suggestions?status=pending`);
      expect(list.body).toEqual([
        expect.objectContaining({ id: S1, kind: 'link', payload: { url: PR_URL }, status: 'pending' }),
      ]);
      const runs = await request(a).get(`/hypotheses/${H1}/agent-runs`);
      expect(runs.body).toEqual([expect.objectContaining({ id: 'r1', modelKey: 'mock' })]);
    });

    it('records the reviewer and refuses a second review', async () => {
      const a = await app();
      const res = await request(a).patch(`/agent-suggestions/${S1}`).send({ status: 'accepted' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'accepted', reviewedBy: 'user:default/mock' });
      // Only the suggestion changes; the hypothesis is updated by the frontend via the backend API.
      expect(JSON.parse((await knex('hypothesis').first()).relatedArtefacts)).toEqual([]);

      const again = await request(a).patch(`/agent-suggestions/${S1}`).send({ status: 'rejected' });
      expect(again.status).toBe(409);
    });

    it('validates input', async () => {
      const a = await app();
      expect((await request(a).patch(`/agent-suggestions/${S1}`).send({ status: 'maybe' })).status).toBe(400);
      expect((await request(a).patch('/agent-suggestions/nope').send({ status: 'accepted' })).status).toBe(400);
      expect(
        (await request(a).patch('/agent-suggestions/33333333-3333-4333-8333-333333333333').send({ status: 'accepted' })).status,
      ).toBe(404);
    });
  });

  describe('agent runs', () => {
    const R1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const R2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const R3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

    function run(id: string, values: Record<string, unknown>) {
      return {
        id, repository: TEST_REPO, pr_number: 7, pr_url: PR_URL, trigger_action: 'opened',
        model_key: 'mock', provider: 'ollama', status: 'completed', ...values,
      };
    }

    beforeEach(async () => {
      await insertHypothesis(knex, { id: H1 });
      await knex('agent_runs').insert([
        run(R1, { started_at: new Date('2026-09-01T10:00:00Z'), trace: JSON.stringify({ steps: [{ step: 'triage', durationMs: 5, details: { dropped: [{ id: 'x', relevance: 0.1, reason: 'relevance below 0.4' }] } }] }) }),
        run(R2, { started_at: new Date('2026-09-02T10:00:00Z'), status: 'failed', error: 'provider down' }),
        run(R3, { started_at: new Date('2026-09-03T10:00:00Z'), repository: 'acme/other' }),
      ]);
      await knex('agent_suggestions').insert(
        ['s1', 's2'].map(id => ({
          id, run_id: R1, hypothesis_id: H1, kind: 'link', payload: JSON.stringify({ url: PR_URL }),
          rationale: 'r', evidence: '[]', confidence: 0.9, artifact_ref: `${TEST_REPO}#pull/7`, artifact_url: PR_URL,
        })),
      );
    });

    it('lists runs newest first with counts, totals and repositories', async () => {
      const res = await request(await app()).get('/agent-runs');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(3);
      expect(res.body.repositories).toEqual(['acme/other', TEST_REPO]);
      expect(res.body.items.map((r: { id: string }) => r.id)).toEqual([R3, R2, R1]);
      expect(res.body.items[2]).toMatchObject({ suggestionCount: 2, prUrl: PR_URL });
      expect(res.body.items[2].trace).toBeUndefined();
    });

    it('filters and paginates', async () => {
      const a = await app();
      const byRepo = await request(a).get(`/agent-runs?repository=${encodeURIComponent(TEST_REPO)}&limit=1&offset=1`);
      expect(byRepo.body.total).toBe(2);
      expect(byRepo.body.items.map((r: { id: string }) => r.id)).toEqual([R1]);
      const failed = await request(a).get('/agent-runs?status=failed');
      expect(failed.body.items).toEqual([expect.objectContaining({ id: R2, error: 'provider down', suggestionCount: 0 })]);
    });

    it('returns a run with its trace and suggestions', async () => {
      const res = await request(await app()).get(`/agent-runs/${R1}`);
      expect(res.status).toBe(200);
      expect(res.body.trace.steps[0].details.dropped[0].reason).toBe('relevance below 0.4');
      expect(res.body.suggestions.map((s: { id: string }) => s.id).sort()).toEqual(['s1', 's2']);
    });

    it('validates input', async () => {
      const a = await app();
      expect((await request(a).get('/agent-runs?status=weird')).status).toBe(400);
      expect((await request(a).get('/agent-runs?offset=-1')).status).toBe(400);
      expect((await request(a).get('/agent-runs/nope')).status).toBe(400);
      expect((await request(a).get('/agent-runs/dddddddd-dddd-4ddd-8ddd-dddddddddddd')).status).toBe(404);
    });
  });

  describe('POST /agents/hypothesis-review', () => {
    const coachOn = () =>
      testConfig({
        coach: {
          enabled: true,
          model: 'mock',
          checkOnSave: true,
          fallback: { enabled: false, frequencyMinutes: 10, maxPerRun: 5, sinceDays: 7 },
        },
      });
    const body = {
      statement: 'The system must process 1000 requests per second',
      sourceType: 'Requirements',
      qualityAttributes: [],
      trigger: 'on_demand',
    };

    it('returns 404 when the coach is disabled', async () => {
      const res = await request(await app()).post('/agents/hypothesis-review').send(body);
      expect(res.status).toBe(404);
    });

    it('reviews, stores the review and reports it in health', async () => {
      const a = await app(coachOn());
      const res = await request(a).post('/agents/hypothesis-review').send(body);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        verdict: 'needs_work',
        classification: 'requirement',
        suggestedSourceType: null, // already the current source type
        suggestedQualityAttributes: ['Performance'],
      });
      const row = await knex('agent_hypothesis_reviews').first();
      expect(row).toMatchObject({ trigger: 'on_demand', status: 'completed', requested_by: 'user:default/mock' });

      const health = await request(a).get('/agents/health');
      expect(health.body.coach).toEqual({ enabled: true, checkOnSave: true });
    });

    it('validates input and rate limits per user', async () => {
      const a = await app(coachOn());
      expect((await request(a).post('/agents/hypothesis-review').send({ ...body, statement: 'too short' })).status).toBe(400);
      expect((await request(a).post('/agents/hypothesis-review').send({ ...body, trigger: 'fallback' })).status).toBe(400);
      expect((await request(a).post('/agents/hypothesis-review').send(body)).status).toBe(200);
      expect((await request(a).post('/agents/hypothesis-review').send(body)).status).toBe(200);
      expect((await request(a).post('/agents/hypothesis-review').send(body)).status).toBe(429);
    });

    it('returns 502 and records a failed review when the model fails', async () => {
      coachModel = new MockLanguageModelV3({
        doGenerate: async () => {
          throw new Error('provider down');
        },
      });
      const res = await request(await app(coachOn())).post('/agents/hypothesis-review').send(body);
      expect(res.status).toBe(502);
      expect((await knex('agent_hypothesis_reviews').first()).status).toBe('failed');
    });
  });

  describe('plan proposals', () => {
    const plannerOn = () =>
      testConfig({ planner: { enabled: true, model: 'mock', iterationDays: 14, maxActions: 4 } });
    const planOutput = {
      reading: 'act now',
      actions: [
        {
          actionType: 'Analytics',
          goal: 'reduce_uncertainty',
          description: 'Measure throughput in production',
          evidence: 'p95 < 200 ms at 1000 rps',
          expectedEffect: { uncertainty: 'Low', impact: null },
          iteration: 1,
          entityRef: null,
          rationale: 'r',
        },
      ],
    };

    beforeEach(async () => {
      await insertHypothesis(knex, { id: H1 });
      coachModel = new MockLanguageModelV3({
        doGenerate: async () => ({
          content: [{ type: 'text', text: JSON.stringify(planOutput) }],
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 5, text: 5, reasoning: 0 },
          },
          warnings: [],
        }),
      });
    });

    it('returns 404 when disabled or the hypothesis is unknown, 422 without components', async () => {
      expect((await request(await app()).post('/agents/plan-proposals').send({ hypothesisId: H1 })).status).toBe(404);
      const a = await app(plannerOn());
      expect(
        (await request(a).post('/agents/plan-proposals').send({ hypothesisId: '99999999-9999-4999-8999-999999999999' })).status,
      ).toBe(404);
      expect((await request(a).post('/agents/plan-proposals').send({ hypothesisId: 'nope' })).status).toBe(400);
      await knex('hypothesis').where('id', H1).update({ entityRefs: '[]' });
      expect((await request(a).post('/agents/plan-proposals').send({ hypothesisId: H1 })).status).toBe(422);
    });

    it('proposes a plan and records one decision per action', async () => {
      const a = await app(plannerOn());
      const res = await request(a).post('/agents/plan-proposals').send({ hypothesisId: H1 });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ profile: 'act_now', actions: [{ actionType: 'Analytics' }] });

      const url = `/agents/plan-proposals/${res.body.proposalId}/actions`;
      expect((await request(a).patch(`${url}/0`).send({ decision: 'added' })).status).toBe(200);
      expect((await request(a).patch(`${url}/0`).send({ decision: 'dismissed' })).status).toBe(409);
      expect((await request(a).patch(`${url}/5`).send({ decision: 'added' })).status).toBe(404);
      expect((await request(a).patch(`${url}/0`).send({ decision: 'maybe' })).status).toBe(400);
      expect(await knex('agent_plan_proposal_actions')).toEqual([
        expect.objectContaining({ index: 0, decision: 'added', decided_by: 'user:default/mock' }),
      ]);

      const health = await request(a).get('/agents/health');
      expect(health.body.planner).toEqual({ enabled: true });
    });
  });

  describe('issue webhooks and plan issues', () => {
    const TP = '33333333-3333-4333-8333-333333333333';
    const issueBody = (action: string, number = 12, extra: Record<string, unknown> = {}) => ({
      action,
      repository: { full_name: TEST_REPO },
      sender: { login: 'fernando' },
      issue: { number, html_url: `https://github.com/${TEST_REPO}/issues/${number}`, title: 't', body: 'b', labels: [], ...extra },
    });

    beforeEach(async () => {
      await insertHypothesis(knex, { id: H1 });
      await insertPlanning(knex, { id: TP, hypothesisId: H1 });
    });

    it('queues triage for human issues and plan sync for plan issues', async () => {
      const a = await app();
      const triage = await post(a, issueBody('opened'), 'issues');
      expect(triage.body).toMatchObject({ queued: true, route: 'issue_triage' });
      expect(enqueueIssue).toHaveBeenLastCalledWith({ handler: 'issue_triage', issue: expect.objectContaining({ number: 12 }) });

      // open the planning as an issue, then close it on GitHub
      const opened = await request(a).post(`/agents/plannings/${TP}/issue`).send({});
      expect(opened.status).toBe(201);
      expect(opened.body).toMatchObject({ issueNumber: 4, technicalPlanningId: TP });

      const sync = await post(a, issueBody('closed', 4), 'issues');
      expect(sync.body).toMatchObject({ queued: true, route: 'plan_sync' });
      expect(enqueueIssue).toHaveBeenLastCalledWith({ handler: 'plan_sync', issue: expect.objectContaining({ number: 4 }), planningId: TP });

      const comment = await post(a, { ...issueBody('created', 4), comment: { body: 'done' } }, 'issue_comment');
      expect(comment.body.route).toBe('plan_comment');

      const links = await request(a).get(`/agents/plannings/issues?hypothesisId=${H1}`);
      expect(links.body).toEqual([expect.objectContaining({ issueNumber: 4, state: 'open' })]);
    });

    it('refuses a second issue for the same planning and explains missing permissions', async () => {
      const a = await app();
      await request(a).post(`/agents/plannings/${TP}/issue`).send({});
      expect((await request(a).post(`/agents/plannings/${TP}/issue`).send({})).status).toBe(409);

      await knex('agent_issue_links').del();
      const { GitHubRequestError } = jest.requireActual('./github/client');
      githubClient.createIssue.mockRejectedValueOnce(new GitHubRequestError('forbidden', 403));
      const denied = await request(a).post(`/agents/plannings/${TP}/issue`).send({});
      expect(denied.status).toBe(403);
      expect(denied.body.error).toMatch(/issues: write/);
    });

    it('closes the open plan issue when its completion is accepted, best effort', async () => {
      const a = await app();
      await request(a).post(`/agents/plannings/${TP}/issue`).send({});
      const suggestion = (id: string, effect: string) => ({
        id, run_id: null, hypothesis_id: H1, technical_planning_id: TP, kind: 'planning_progress',
        payload: JSON.stringify({ effect, expectedOutcome: null }), rationale: 'r', evidence: '[]', confidence: 1,
        artifact_ref: `${TEST_REPO}#issue/4`, artifact_url: `https://github.com/${TEST_REPO}/issues/4`,
      });
      const S_ADV = '66666666-6666-4666-8666-666666666666';
      const S_DONE = '77777777-7777-4777-8777-777777777777';
      await knex('agent_suggestions').insert([suggestion(S_ADV, 'advances'), suggestion(S_DONE, 'completes')]);

      const advances = await request(a).patch(`/agent-suggestions/${S_ADV}`).send({ status: 'accepted' });
      expect(advances.body.issueClose).toBeNull();
      expect(githubClient.closeIssue).not.toHaveBeenCalled();

      const done = await request(a).patch(`/agent-suggestions/${S_DONE}`).send({ status: 'accepted' });
      expect(done.status).toBe(200);
      expect(done.body.issueClose).toEqual({ number: 4, closed: true });
      expect(githubClient.closeIssue).toHaveBeenCalledWith(TEST_REPO, 4, expect.stringContaining('<!-- hypostage:automated -->'));
      expect((await knex('agent_issue_links').first()).state).toBe('closed');
    });

    it('keeps the acceptance when GitHub refuses to close the issue', async () => {
      const a = await app();
      await request(a).post(`/agents/plannings/${TP}/issue`).send({});
      githubClient.closeIssue.mockRejectedValueOnce(new Error('forbidden'));
      const S = '88888888-8888-4888-8888-888888888888';
      await knex('agent_suggestions').insert({
        id: S, run_id: null, hypothesis_id: H1, technical_planning_id: TP, kind: 'planning_progress',
        payload: JSON.stringify({ effect: 'completes', expectedOutcome: null }), rationale: 'r', evidence: '[]',
        confidence: 1, artifact_ref: 'x', artifact_url: 'x',
      });
      const res = await request(a).patch(`/agent-suggestions/${S}`).send({ status: 'accepted' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'accepted', issueClose: { number: 4, closed: false, error: 'forbidden' } });
    });

    it('reports the issue flows in health', async () => {
      const health = await request(await app()).get('/agents/health');
      expect(health.body.issues).toEqual({ triage: true, planIssues: true });
    });
  });

  describe('coverage findings and the issues report', () => {
    it('lists and resolves findings, and serves the report as JSON or Markdown', async () => {
      await knex('agent_coverage_findings').insert({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab', group_key: 'k', repository: TEST_REPO, quality_attribute: 'Performance',
        window_days: 30, issues: '["u1","u2","u3"]', impact_proxy: '{"issues":3}', theme: 't', draft_statement: 'd',
      });
      const a = await app();
      const list = await request(a).get('/agents/coverage/findings?status=pending');
      expect(list.body).toEqual([expect.objectContaining({ theme: 't', issues: ['u1', 'u2', 'u3'], status: 'pending' })]);
      const url = '/agents/coverage/findings/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaab';
      expect((await request(a).patch(url).send({ status: 'dismissed' })).status).toBe(200);
      expect((await request(a).patch(url).send({ status: 'created' })).status).toBe(404);

      const report = await request(a).get('/agents/reports/issues');
      expect(report.status).toBe(200);
      expect(report.body.reported.total).toBe(0);
      const md = await request(a).get('/agents/reports/issues?format=markdown');
      expect(md.headers['content-type']).toMatch(/text\/markdown/);
      expect(md.text).toContain('# Issues report');
      expect((await request(a).get('/agents/reports/issues?from=nope')).status).toBe(400);
    });
  });
});
