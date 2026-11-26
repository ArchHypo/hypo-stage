import type { Knex } from 'knex';
import { MockLanguageModelV3 } from 'ai/test';
import { mockServices } from '@backstage/backend-test-utils';
import { createTestDatabase, testConfig } from '../__testUtils__/fixtures';
import { statementHash } from '../store/reviews';
import { CoachTimeoutError, reviewHypothesis } from './review';

describe('reviewHypothesis', () => {
  let knex: Knex;
  const config = testConfig({
    coach: {
      enabled: true,
      model: 'mock',
      checkOnSave: true,
      fallback: { enabled: false, frequencyMinutes: 10, maxPerRun: 5, sinceDays: 7 },
    },
  });

  beforeEach(async () => {
    knex = await createTestDatabase();
  });
  afterEach(async () => {
    await knex.destroy();
  });

  it('records timeouts as failed reviews and throws CoachTimeoutError', async () => {
    const model = new MockLanguageModelV3({
      doGenerate: async () => {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      },
    });
    await expect(
      reviewHypothesis(
        { knex, logger: mockServices.logger.mock(), config, models: { resolve: () => model } },
        { statement: 'The system must process 1000 requests per second' },
        'save',
        'user:default/mock',
      ),
    ).rejects.toBeInstanceOf(CoachTimeoutError);

    const row = await knex('agent_hypothesis_reviews').first();
    expect(row).toMatchObject({ status: 'failed', trigger: 'save', hypothesis_id: null });
    expect(row.error).toMatch(/timed out/);
    expect(row.statement_hash).toBe(statementHash(' the system must PROCESS 1000 requests per second'));
  });
});
