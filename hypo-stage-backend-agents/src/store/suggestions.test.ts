import type { Knex } from 'knex';
import { createTestDatabase, insertHypothesis, insertPlanning } from '../__testUtils__/fixtures';
import { upsertPendingSuggestion } from './suggestions';

const H1 = '11111111-1111-4111-8111-111111111111';
const TP1 = '33333333-3333-4333-8333-333333333333';

describe('upsertPendingSuggestion', () => {
  let knex: Knex;
  beforeEach(async () => {
    knex = await createTestDatabase();
    await insertHypothesis(knex, { id: H1 });
    await insertPlanning(knex, { id: TP1, hypothesisId: H1 });
  });
  afterEach(async () => knex.destroy());

  const completes = (confidence: number) => ({
    hypothesisId: H1,
    technicalPlanningId: TP1,
    kind: 'planning_progress' as const,
    payload: { effect: 'completes', expectedOutcome: null },
    rationale: `r${confidence}`,
    evidence: [],
    confidence,
  });

  it('merges a PR and the plan issue it closes into one suggestion with both sources', async () => {
    const pr = { artifactRef: 'acme/payments#pull/9', url: 'https://github.com/acme/payments/pull/9', kind: 'pull_request' as const };
    const issue = { artifactRef: 'acme/payments#issue/4', url: 'https://github.com/acme/payments/issues/4', kind: 'issue' as const };
    const first = await upsertPendingSuggestion(knex, { runId: null, source: pr }, completes(1));
    const second = await upsertPendingSuggestion(knex, { runId: null, source: issue }, completes(0.9));

    expect(second).toEqual({ id: first.id, merged: true });
    const rows = await knex('agent_suggestions');
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0].sources)).toEqual([pr, issue]);
    expect(rows[0].rationale).toBe('r1 r0.9');
  });

  it('keeps links to different URLs apart', async () => {
    const link = (url: string) => ({
      hypothesisId: H1, technicalPlanningId: null, kind: 'link' as const, payload: { url },
      rationale: 'r', evidence: [], confidence: 0.8,
    });
    const src = (url: string) => ({ artifactRef: url, url, kind: 'issue' as const });
    await upsertPendingSuggestion(knex, { runId: null, source: src('u1') }, link('u1'));
    await upsertPendingSuggestion(knex, { runId: null, source: src('u2') }, link('u2'));
    await upsertPendingSuggestion(knex, { runId: null, source: src('u1') }, link('u1'));
    expect(await knex('agent_suggestions')).toHaveLength(2);
  });
});
