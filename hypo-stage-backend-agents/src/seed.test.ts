import { createTestDatabase } from './__testUtils__/fixtures';

const STATEMENT =
  'The new api-gateway can process at least 1000 requests per second while maintaining a latency under 200 milliseconds.';
const FIXTURE_SHA = 'demo-fixture';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const seed = require('../migrations/20261125_000006_seed_demo_agent_fixture.js');

async function insertWalkthroughHypothesis(knex: Awaited<ReturnType<typeof createTestDatabase>>) {
  await knex('hypothesis').insert({
    id: '11111111-1111-4111-8111-111111111111',
    entityRefs: JSON.stringify(['component:default/api-gateway']),
    status: 'Open',
    statement: STATEMENT,
    sourceType: 'Requirements',
    relatedArtefacts: JSON.stringify([]),
    qualityAttributes: JSON.stringify(['Performance', 'Security']),
    uncertainty: 'Medium',
    impact: 'Medium',
    notes: 'Sample from the recorded walkthrough.',
  });
}

describe('agents demo seed', () => {
  it('stays empty while NODE_ENV is test, even when the walkthrough hypothesis exists', async () => {
    const knex = await createTestDatabase();
    try {
      expect(process.env.NODE_ENV).toBe('test');
      await insertWalkthroughHypothesis(knex);
      await seed.up(knex);
      expect(await knex('agent_suggestions').where({ head_sha: FIXTURE_SHA })).toHaveLength(0);
    } finally {
      await knex.destroy();
    }
  });

  it('inserts one pending suggestion once the walkthrough hypothesis exists, and does not duplicate it', async () => {
    const knex = await createTestDatabase();
    const previous = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    try {
      await seed.up(knex);
      expect(await knex('agent_runs').where({ head_sha: FIXTURE_SHA })).toHaveLength(0);

      await insertWalkthroughHypothesis(knex);
      await seed.up(knex);

      const suggestions = await knex('agent_suggestions').where({ head_sha: FIXTURE_SHA });
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].status).toBe('pending');
      expect(suggestions[0].kind).toBe('new_planning');
      expect(suggestions[0].hypothesis_id).toBe('11111111-1111-4111-8111-111111111111');
      const runs = await knex('agent_runs').where({ head_sha: FIXTURE_SHA });
      expect(runs).toHaveLength(1);
      expect(runs[0].provider).toBe('fixture');

      await seed.up(knex);
      expect(await knex('agent_suggestions').where({ head_sha: FIXTURE_SHA })).toHaveLength(1);
      expect(await knex('agent_runs').where({ head_sha: FIXTURE_SHA })).toHaveLength(1);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
      await knex.destroy();
    }
  });
});
