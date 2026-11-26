import type { Knex } from 'knex';
import { MockLanguageModelV3 } from 'ai/test';
import { mockServices } from '@backstage/backend-test-utils';
import { createTestDatabase, insertHypothesis, testConfig } from '../__testUtils__/fixtures';
import { insertReview } from '../store/reviews';
import { runCoachFallback } from './fallback';

const H1 = '11111111-1111-4111-8111-111111111111';
const H2 = '22222222-2222-4222-8222-222222222222';
const H3 = '33333333-3333-4333-8333-333333333333';

const needsWork = {
  classification: 'requirement',
  classificationReason: 'It states a target.',
  falsifiable: false,
  refutingEvidence: null,
  issues: [{ type: 'not_a_hypothesis', severity: 'warning', message: 'Target, not belief', concept: 'Beliefs' }],
  rewrites: [{ statement: 'A single instance can sustain 1000 requests per second', reason: 'belief' }],
  splitInto: [],
  suggestedSourceType: null,
  suggestedQualityAttributes: ['Scalability'],
};
const good = { ...needsWork, classification: 'hypothesis', issues: [], rewrites: [] };

function model(outputs: unknown[] | (() => never)) {
  let i = 0;
  return new MockLanguageModelV3({
    doGenerate: async () => {
      if (typeof outputs === 'function') outputs();
      const out = (outputs as unknown[])[Math.min(i++, (outputs as unknown[]).length - 1)];
      return {
        content: [{ type: 'text', text: JSON.stringify(out) }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 5, text: 5, reasoning: 0 },
        },
        warnings: [],
      };
    },
  });
}

describe('runCoachFallback', () => {
  let knex: Knex;
  const config = testConfig({
    coach: {
      enabled: true,
      model: 'mock',
      checkOnSave: true,
      fallback: { enabled: true, frequencyMinutes: 10, maxPerRun: 2, sinceDays: 7 },
    },
  });
  const deps = (m: MockLanguageModelV3) => ({
    knex,
    logger: mockServices.logger.mock(),
    config,
    models: { resolve: () => m },
  });

  beforeEach(async () => {
    knex = await createTestDatabase();
  });
  afterEach(async () => {
    await knex.destroy();
  });

  it('reviews uncovered recent hypotheses and proposes rewrites', async () => {
    await insertHypothesis(knex, { id: H1, statement: 'The system must process 1000 requests per second' });
    await insertHypothesis(knex, { id: H2, statement: 'The gateway can be replaced without touching order code' });
    await insertHypothesis(knex, {
      id: H3,
      statement: 'An old hypothesis created long ago and never reviewed',
      createdAt: new Date('2020-01-01'),
    });

    const m = model([needsWork, good]);
    const result = await runCoachFallback(deps(m));

    expect(result).toEqual({ reviewed: 2, linked: 0, suggestions: 1, failed: 0 });
    const suggestions = await knex('agent_suggestions');
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({ kind: 'rewrite', run_id: null, artifact_url: null, hypothesis_id: expect.any(String) });
    expect(JSON.parse(suggestions[0].payload)).toMatchObject({
      statement: 'A single instance can sustain 1000 requests per second',
      addQualityAttributes: ['Scalability'],
    });
    expect((await knex('agent_hypothesis_reviews').whereNotNull('hypothesis_id')).length).toBe(2);

    // Second run: everything recent is covered, nothing is reviewed again
    expect(await runCoachFallback(deps(m))).toEqual({ reviewed: 0, linked: 0, suggestions: 0, failed: 0 });
    expect(m.doGenerateCalls).toHaveLength(2);
  });

  it('links drafts reviewed in the form by statement hash instead of reviewing again', async () => {
    await insertReview(knex, {
      hypothesisId: null,
      statement: 'The gateway can be replaced  without touching ORDER code ',
      trigger: 'on_demand',
      requestedBy: 'user:default/mock',
      modelKey: 'mock',
      provider: 'ollama',
      status: 'completed',
      result: good,
      durationMs: 10,
    });
    await insertHypothesis(knex, { id: H2, statement: 'The gateway can be replaced without touching order code' });

    const m = model([needsWork]);
    expect(await runCoachFallback(deps(m))).toMatchObject({ reviewed: 0, linked: 1 });
    expect(m.doGenerateCalls).toHaveLength(0);
    expect((await knex('agent_hypothesis_reviews').first()).hypothesis_id).toBe(H2);
  });

  it('retries failed reviews up to three times', async () => {
    await insertHypothesis(knex, { id: H1, statement: 'The system must process 1000 requests per second' });
    const failing = model(() => {
      throw new Error('provider down');
    });
    for (let i = 0; i < 4; i++) {
      await runCoachFallback(deps(failing));
    }
    expect(await knex('agent_hypothesis_reviews').where('status', 'failed')).toHaveLength(3);
  });
});
