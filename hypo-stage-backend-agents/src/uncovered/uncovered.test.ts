import type { Knex } from 'knex';
import { mockServices } from '@backstage/backend-test-utils';
import {
  createTestDatabase,
  insertHypothesis,
  insertPlanning,
  scriptedModel,
  TEST_REPO,
  testConfig,
} from '../__testUtils__/fixtures';
import { insertIssueLink, upsertObservation } from '../store/issues';
import { buildIssuesReport, reportToMarkdown } from '../reports/issues';
import { impactProxy, qualifies, runCoverage } from './run';

const now = new Date('2026-09-29T12:00:00Z');
const H1 = '11111111-1111-4111-8111-111111111111';

async function observe(knex: Knex, n: number, o: Partial<Parameters<typeof upsertObservation>[1]> = {}) {
  await upsertObservation(knex, {
    repository: TEST_REPO,
    number: n,
    url: `https://github.com/${TEST_REPO}/issues/${n}`,
    title: `Checkout slow #${n}`,
    author: 'user',
    labels: [],
    state: 'closed',
    stateReason: 'completed',
    createdAt: '2026-09-10T00:00:00Z',
    closedAt: '2026-09-15T00:00:00Z',
    comments: 1,
    reopened: 0,
    classification: 'bug',
    qualityAttributes: ['Performance'],
    related: [],
    ...o,
  });
}

describe('coverage', () => {
  let knex: Knex;
  const config = testConfig({
    coverage: { enabled: true, frequencyHours: 24, windowDays: 30, minIssues: 3, minOpenDays: 2 },
  });
  const model = scriptedModel(() => ({
    theme: 'Checkout latency under load',
    statement: 'The checkout service can keep p95 latency under 300 ms at peak sale load on the current database',
  }));
  const deps = () => ({
    knex,
    logger: mockServices.logger.mock(),
    config,
    models: { resolve: () => model },
    resolveRepositoryEntityRefs: async () => ['component:default/checkout'],
    now: () => now,
  });

  beforeEach(async () => {
    knex = await createTestDatabase();
  });
  afterEach(async () => knex.destroy());

  it('computes the impact proxy and filters quick fixes out (ArchHypo: low impact, out of scope)', () => {
    const slow = impactProxy(
      [0, 1, 2].map(i => ({ createdAt: '2026-09-01T00:00:00Z', closedAt: '2026-09-06T00:00:00Z', reopened: i === 0 ? 1 : 0, comments: 2 }) as any),
      now,
    );
    expect(slow).toEqual({ issues: 3, medianOpenDays: 5, reopened: 1, avgComments: 2 });
    expect(qualifies(slow, config.coverage)).toBe(true);
    const quick = impactProxy(
      [0, 1, 2].map(() => ({ createdAt: '2026-09-01T00:00:00Z', closedAt: '2026-09-01T03:00:00Z', reopened: 0, comments: 0 }) as any),
      now,
    );
    expect(qualifies(quick, config.coverage)).toBe(false);
  });

  it('drafts one finding per costly uncovered theme and does not repeat it while pending', async () => {
    for (const n of [1, 2, 3]) await observe(knex, n);
    await observe(knex, 4, { qualityAttributes: ['Usability'] }); // too few
    await observe(knex, 5, { related: [{ hypothesisId: H1, evidenceType: 'contradicts' }] }); // covered
    await observe(knex, 6, { classification: 'question' }); // not a problem report

    expect(await runCoverage(deps())).toEqual({ groups: 2, qualifying: 1, findings: 1 });
    const finding = await knex('agent_coverage_findings').first();
    expect(finding).toMatchObject({
      quality_attribute: 'Performance',
      entity_ref: 'component:default/checkout',
      status: 'pending',
      theme: 'Checkout latency under load',
    });
    expect(JSON.parse(finding.issues)).toHaveLength(3);

    expect((await runCoverage(deps())).findings).toBe(0);
    expect(model.doGenerateCalls).toHaveLength(1);
  });

  it('builds the maintenance report with plan activities and a Markdown export', async () => {
    await insertHypothesis(knex, { id: H1 });
    await insertPlanning(knex, { id: '33333333-3333-4333-8333-333333333333', hypothesisId: H1, actionType: 'Guideline' });
    await insertIssueLink(knex, {
      technicalPlanningId: '33333333-3333-4333-8333-333333333333', hypothesisId: H1, repository: TEST_REPO,
      issueNumber: 40, issueUrl: 'u40', createdBy: 'u',
    });
    await observe(knex, 1, { closedAt: '2026-09-10T05:00:00Z', related: [{ hypothesisId: H1, evidenceType: 'contradicts' }] });
    await observe(knex, 2, { classification: 'improvement', qualityAttributes: ['Usability'], state: 'open', closedAt: null });

    // The plan issue link is stamped with the real current time, so the period ends now.
    const report = await buildIssuesReport(knex, { from: new Date('2026-09-01'), to: new Date() });
    expect(report.reported).toMatchObject({
      total: 2,
      byClassification: { bug: 1, improvement: 1 },
      byQualityAttribute: { Performance: 1, Usability: 1 },
      related: 1,
      unrelated: 1,
      resolution: { closed: 1, open: 1, sameDayPercent: 100 },
    });
    expect(report.reported.byHypothesis[0]).toMatchObject({ hypothesisId: H1, issues: 1, evidence: { contradicts: 1 } });
    expect(report.planIssues).toMatchObject({ total: 1, byActionType: { Guideline: 1 }, open: 1 });

    const md = reportToMarkdown(report);
    expect(md).toContain('2 issues were reported: 1 bug, 1 improvement. 1 (50%) relate to at least one architectural hypothesis');
    expect(md).toContain('| Guideline | 1 |');
  });
});
