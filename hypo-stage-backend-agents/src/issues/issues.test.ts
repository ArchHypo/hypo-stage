import type { Knex } from 'knex';
import { mockServices } from '@backstage/backend-test-utils';
import {
  createTestDatabase,
  insertHypothesis,
  insertPlanning,
  issueDetails,
  scriptedModel,
  TEST_REPO,
  testConfig,
} from '../__testUtils__/fixtures';
import type { IssueEvent } from '../github/events';
import { insertIssueLink } from '../store/issues';
import { runIssueTriage } from './triage';
import { runPlanSync } from './planSync';
import { runPlanComment } from './planComment';
import { openPlanIssue, PlanIssueExistsError, planIssueContent, RepositoryRequiredError } from './planIssues';

const H1 = '11111111-1111-4111-8111-111111111111';
const TRIGGER = '44444444-4444-4444-8444-444444444444';
const SPIKE = '55555555-5555-4555-8555-555555555555';

const event = (overrides: Partial<IssueEvent> = {}): IssueEvent => ({
  event: 'issues',
  action: 'opened',
  repository: TEST_REPO,
  number: 12,
  url: `https://github.com/${TEST_REPO}/issues/12`,
  artifactRef: `${TEST_REPO}#issue/12`,
  labels: ['bug'],
  sender: 'fernando',
  deliveryId: 'd1',
  ...overrides,
});

describe('issue flows', () => {
  let knex: Knex;
  const config = testConfig({ issues: { debounceSeconds: 0, alertThreshold: 2 } });

  function deps(model: unknown, github: Record<string, jest.Mock> = {}) {
    return {
      knex,
      logger: mockServices.logger.mock(),
      config,
      github: {
        getPullRequest: jest.fn(),
        getIssue: jest.fn().mockResolvedValue(issueDetails()),
        createIssue: jest.fn(),
        ...github,
      },
      models: { resolve: () => model as any },
      resolveRepositoryEntityRefs: jest.fn().mockResolvedValue(['component:default/payments']),
    };
  }

  beforeEach(async () => {
    knex = await createTestDatabase();
    await insertHypothesis(knex, { id: H1 });
    await insertPlanning(knex, {
      id: TRIGGER,
      hypothesisId: H1,
      actionType: 'Trigger',
      description: 'Revisit the gateway when checkout load passes 700 concurrent users',
      expectedOutcome: 'Goal: Define postponement criteria. Evidence: timeouts above 700 users.',
    });
    await insertPlanning(knex, { id: SPIKE, hypothesisId: H1 });
  });
  afterEach(async () => knex.destroy());

  describe('runIssueTriage', () => {
    const triageThen = (assessment: Record<string, unknown>) =>
      scriptedModel(system =>
        system.includes('classify one GitHub issue')
          ? {
              classification: 'bug',
              qualityAttributes: ['Performance'],
              candidates: [
                { hypothesisId: H1, relevance: 0.9, reason: 'throughput' },
                { hypothesisId: 'invented', relevance: 0.9, reason: 'x' },
              ],
            }
          : { related: true, confidence: 0.9, rationale: 'Load above the trigger threshold', triggerPlanningId: null, ...assessment },
      );

    it('links the issue, flags the fired Trigger and records the observation', async () => {
      const model = triageThen({ evidenceType: 'trigger_fired', triggerPlanningId: TRIGGER });
      const result = await runIssueTriage(deps(model), event());

      expect(result).toMatchObject({ status: 'completed', suggestions: 2 });
      const rows = await knex('agent_suggestions').orderBy('kind');
      expect(rows.map(r => r.kind)).toEqual(['link', 'status_change']);
      expect(JSON.parse(rows[1].payload)).toEqual({ status: 'Trigger-Fired', previous: 'Open' });
      expect(rows[1].technical_planning_id).toBe(TRIGGER);

      const observation = await knex('agent_issue_observations').first();
      expect(observation).toMatchObject({ classification: 'bug', number: 12, state: 'open' });
      expect(JSON.parse(observation.related)).toEqual([{ hypothesisId: H1, evidenceType: 'trigger_fired' }]);

      const run = await knex('agent_runs').first();
      expect(run).toMatchObject({ artifact_kind: 'issue', handler: 'issue_triage', origin: 'human' });
      expect(JSON.parse(run.trace).steps[1].details.returned).toBe(2);
      expect(JSON.parse(run.trace).steps[1].details.dropped).toEqual([
        { id: 'invented', relevance: 0.9, reason: 'unknown hypothesis id' },
      ]);
    });

    it('never fires a status for a non-Trigger planning, and never reassesses', async () => {
      const model = triageThen({ evidenceType: 'trigger_fired', triggerPlanningId: SPIKE });
      await runIssueTriage(deps(model), event());
      const kinds = (await knex('agent_suggestions')).map(r => r.kind);
      expect(kinds).toEqual(['link']);
    });

    it('raises one evidence alert when enough issues contradict the same hypothesis', async () => {
      const model = triageThen({ evidenceType: 'contradicts' });
      const github = (n: number) => ({ getIssue: jest.fn().mockResolvedValue(issueDetails({ number: n, url: `u${n}` })) });
      await runIssueTriage(deps(model, github(12)), event());
      expect((await knex('agent_suggestions').where('kind', 'evidence_alert')).length).toBe(0);
      await runIssueTriage(deps(model, github(13)), event({ number: 13 }));
      await runIssueTriage(deps(model, github(14)), event({ number: 14 }));

      const alerts = await knex('agent_suggestions').where('kind', 'evidence_alert');
      expect(alerts).toHaveLength(1);
      expect(JSON.parse(alerts[0].payload)).toEqual({ evidenceType: 'contradicts', issues: ['u12', 'u13', 'u14'] });
    });

    it('stores unrelated issues too (coverage and the report need them)', async () => {
      const model = scriptedModel(() => ({ classification: 'improvement', qualityAttributes: ['Usability'], candidates: [] }));
      await runIssueTriage(deps(model), event());
      expect(await knex('agent_suggestions')).toHaveLength(0);
      expect(JSON.parse((await knex('agent_issue_observations').first()).related)).toEqual([]);
    });
  });

  describe('plan issues', () => {
    const planDeps = (createIssue: jest.Mock, annotated: string | null = TEST_REPO) => ({
      knex,
      config,
      github: { getPullRequest: jest.fn(), getIssue: jest.fn(), createIssue },
      resolveEntityRepository: jest.fn().mockResolvedValue(annotated),
    });

    it('opens a planning as a labelled issue with the marker and records the link', async () => {
      const createIssue = jest.fn().mockResolvedValue({ number: 4, url: 'https://github.com/acme/payments/issues/4' });
      const link = await openPlanIssue(planDeps(createIssue), SPIKE, 'user:default/fernando');

      expect(link).toMatchObject({ technicalPlanningId: SPIKE, hypothesisId: H1, issueNumber: 4, repository: TEST_REPO });
      const [repository, content] = createIssue.mock.calls[0];
      expect(repository).toBe(TEST_REPO);
      expect(content.title).toBe('[ArchHypo] Spike: Load test the gateway client with connection pooling');
      expect(content.body).toContain(`<!-- hypostage:planning=${SPIKE} -->`);
      expect(content.body).not.toMatch(/hypo-stage\/hypothesis|localhost/);
      expect(content.labels).toEqual(['archhypo:plan', 'archhypo:spike', `archhypo:hyp-${H1.slice(0, 8)}`]);

      await expect(openPlanIssue(planDeps(createIssue), SPIKE, 'u')).rejects.toBeInstanceOf(PlanIssueExistsError);
    });

    it('asks for a repository when the component is not linked to an enabled one', async () => {
      await expect(openPlanIssue(planDeps(jest.fn(), null), SPIKE, 'u')).rejects.toMatchObject({
        options: [TEST_REPO],
      });
      await expect(openPlanIssue(planDeps(jest.fn(), 'other/repo'), SPIKE, 'u')).rejects.toBeInstanceOf(
        RepositoryRequiredError,
      );
    });

    it('builds a readable body', () => {
      const { body } = planIssueContent({
        hypothesis: { id: H1, statement: 'S', uncertainty: 'High', impact: 'Low' },
        planning: { id: SPIKE, actionType: 'Tracer Bullet', description: 'D', expectedOutcome: 'Goal: X.', targetDate: null },
      });
      expect(body).toContain('**What to do:** D');
      expect(body).not.toContain('Target date');
    });
  });

  describe('runPlanSync', () => {
    beforeEach(async () => {
      await insertIssueLink(knex, {
        technicalPlanningId: SPIKE, hypothesisId: H1, repository: TEST_REPO, issueNumber: 4,
        issueUrl: 'https://github.com/acme/payments/issues/4', createdBy: 'u',
      });
    });
    const planEvent = (action: string) => event({ number: 4, action, artifactRef: `${TEST_REPO}#issue/4` });
    const closed = (reason: string) =>
      ({ getIssue: jest.fn().mockResolvedValue(issueDetails({ number: 4, state: 'closed', stateReason: reason, closedAt: '2026-09-25T00:00:00Z' })) });

    it('proposes the planning as completed without any model, and withdraws it on reopen', async () => {
      const noModel = { doGenerate: () => { throw new Error('must not be called'); } };
      await runPlanSync(deps(noModel, closed('completed')), planEvent('closed'), SPIKE);
      let rows = await knex('agent_suggestions');
      expect(rows).toMatchObject([{ kind: 'planning_progress', technical_planning_id: SPIKE, status: 'pending' }]);
      expect((await knex('agent_issue_links').first()).state_reason).toBe('completed');
      expect((await knex('agent_runs').first())).toMatchObject({ handler: 'plan_sync', origin: 'hypostage', model_key: 'none' });

      await runPlanSync(deps(noModel), planEvent('reopened'), SPIKE);
      rows = await knex('agent_suggestions');
      expect(rows[0].status).toBe('superseded');
    });

    it('does not re-propose a completion already accepted, until the plan issue is reopened', async () => {
      const noModel = { doGenerate: () => { throw new Error('must not be called'); } };
      await runPlanSync(deps(noModel, closed('completed')), planEvent('closed'), SPIKE);
      await knex('agent_suggestions').update({ status: 'accepted', reviewed_at: new Date() });

      // closed again (e.g. by HypoStage after the acceptance, or manually): nothing new
      await runPlanSync(deps(noModel, closed('completed')), planEvent('closed'), SPIKE);
      expect(await knex('agent_suggestions').where('status', 'pending')).toHaveLength(0);
      const trace = JSON.parse((await knex('agent_runs').orderBy('started_at', 'desc').first()).trace);
      expect(trace.steps[0].details.outcome).toBe('planning already completed');

      // reopened and closed again: the work was redone, so completion is proposed again
      await new Promise(r => setTimeout(r, 5));
      await runPlanSync(deps(noModel), planEvent('reopened'), SPIKE);
      await runPlanSync(deps(noModel, closed('completed')), planEvent('closed'), SPIKE);
      expect(await knex('agent_suggestions').where('status', 'pending')).toHaveLength(1);
    });

    it('only records the state when closed as not planned', async () => {
      await runPlanSync(deps(null, closed('not_planned')), planEvent('closed'), SPIKE);
      expect(await knex('agent_suggestions')).toHaveLength(0);
      expect((await knex('agent_issue_links').first()).state_reason).toBe('not_planned');
    });
  });

  describe('runPlanComment', () => {
    it('turns reported evidence into progress/reassessment on the mirrored planning only', async () => {
      const model = scriptedModel(() => ({
        related: true,
        confidence: 0.9,
        rationale: 'The comment reports the measurement asked for.',
        evidence: [],
        reassessment: { uncertainty: 'Low', impact: null, reason: '1400 rps measured' },
        planningProgress: [
          { technicalPlanningId: SPIKE, effect: 'advances', expectedOutcomeUpdate: 'Measured 1400 rps', reason: 'r' },
          { technicalPlanningId: TRIGGER, effect: 'advances', expectedOutcomeUpdate: null, reason: 'not this one' },
        ],
        newPlanning: { actionType: 'Guideline', entityRef: null, description: 'x', expectedOutcome: 'y', targetDate: null, reason: 'r' },
        statusChange: null,
      }));
      const github = {
        getIssue: jest.fn().mockResolvedValue(
          issueDetails({ number: 4, commentThread: [{ author: 'dev', body: 'load test: 1400 rps at p95 140 ms', createdAt: '2026-09-26T00:00:00Z' }] }),
        ),
      };
      await runPlanComment(deps(model, github), event({ event: 'issue_comment', action: 'created', number: 4 }), SPIKE);

      const rows = await knex('agent_suggestions').orderBy('kind');
      expect(rows.map(r => [r.kind, r.technical_planning_id])).toEqual([
        ['planning_progress', SPIKE],
        ['reassessment', SPIKE],
      ]);
      const run = await knex('agent_runs').first();
      expect(run).toMatchObject({ handler: 'plan_comment', origin: 'hypostage' });
      const dropped = JSON.parse(run.trace).steps[0].details.dropped;
      expect(dropped).toEqual(
        expect.arrayContaining([
          { kind: 'link', reason: 'not allowed for this handler' },
          { kind: 'new_planning', reason: 'not allowed for this handler' },
        ]),
      );
    });
  });
});
