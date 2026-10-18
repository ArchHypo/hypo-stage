import type { Knex } from 'knex';
import { MockLanguageModelV3 } from 'ai/test';
import type { LanguageModelV3CallOptions } from '@ai-sdk/provider';
import { mockServices } from '@backstage/backend-test-utils';
import { createTestDatabase, insertHypothesis, insertPlanning, testConfig } from '../__testUtils__/fixtures';
import { designPlan, HypothesisNotFoundError, HypothesisWithoutComponentsError } from './design';

const H1 = '11111111-1111-4111-8111-111111111111';
const TP1 = '33333333-3333-4333-8333-333333333333';

const output = {
  reading: 'High uncertainty and impact: act in the first iteration.',
  actions: [
    {
      actionType: 'Analytics',
      goal: 'reduce_uncertainty',
      description: 'Measure gateway throughput from production metrics',
      evidence: 'If p95 stays under 200 ms at 1000 rps, uncertainty drops to Low',
      expectedEffect: { uncertainty: 'Low', impact: null },
      iteration: 1,
      entityRef: null,
      rationale: 'Cheap information first',
    },
  ],
};

function model(fail = false) {
  return new MockLanguageModelV3({
    doGenerate: async () => {
      if (fail) throw new Error('provider down');
      return {
        content: [{ type: 'text', text: JSON.stringify(output) }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 400, noCache: 400, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 120, text: 120, reasoning: 0 },
        },
        warnings: [],
      };
    },
  });
}

const userText = (options: LanguageModelV3CallOptions) =>
  JSON.stringify(options.prompt.filter(m => m.role === 'user'));

describe('designPlan', () => {
  let knex: Knex;
  const config = testConfig({
    planner: { enabled: true, model: 'mock', iterationDays: 14, maxActions: 4 },
  });
  const deps = (m: MockLanguageModelV3) => ({
    knex,
    logger: mockServices.logger.mock(),
    config,
    models: { resolve: () => m },
    describeComponents: jest.fn().mockResolvedValue([
      { entityRef: 'component:default/payments', description: 'Payment gateway client', system: 'checkout' },
    ]),
  });

  beforeEach(async () => {
    knex = await createTestDatabase();
    await insertHypothesis(knex, { id: H1 });
    await insertPlanning(knex, { id: TP1, hypothesisId: H1 });
  });
  afterEach(async () => {
    await knex.destroy();
  });

  it('designs a plan grounded in the profile, existing plannings and components', async () => {
    const m = model();
    const proposal = await designPlan(deps(m), H1, 'user:default/mock');

    expect(proposal).toMatchObject({
      hypothesisId: H1,
      profile: 'act_now',
      warnings: [],
      actions: [
        {
          actionType: 'Analytics',
          entityRef: 'component:default/payments',
          expectedOutcome: expect.stringMatching(/^Goal: Reduce uncertainty\. Evidence: /),
        },
      ],
    });
    const prompt = userText(m.doGenerateCalls[0]);
    expect(prompt).toContain('Strategy (act_now)');
    expect(prompt).toContain('Load test the gateway client with connection pooling'); // existing planning
    expect(prompt).toContain('Payment gateway client');

    const row = await knex('agent_plan_proposals').first();
    expect(row).toMatchObject({ status: 'completed', profile: 'act_now', input_tokens: 400, requested_by: 'user:default/mock' });
    expect(JSON.parse(row.result).actions).toHaveLength(1);
  });

  it('records failures', async () => {
    await expect(designPlan(deps(model(true)), H1, null)).rejects.toThrow('provider down');
    expect((await knex('agent_plan_proposals').first()).status).toBe('failed');
  });

  it('rejects unknown hypotheses and hypotheses without components', async () => {
    await expect(designPlan(deps(model()), '99999999-9999-4999-8999-999999999999', null)).rejects.toBeInstanceOf(
      HypothesisNotFoundError,
    );
    await knex('hypothesis').where('id', H1).update({ entityRefs: '[]' });
    await expect(designPlan(deps(model()), H1, null)).rejects.toBeInstanceOf(HypothesisWithoutComponentsError);
  });
});
