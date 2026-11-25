// @ts-check
/**
 * Adds the hypothesis from the recorded coach walkthrough on databases that
 * already have rows. The earlier demo seed returns immediately when any
 * hypothesis exists, so production would never see this statement otherwise.
 *
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
const STATEMENT =
  'The new api-gateway can process at least 1000 requests per second while maintaining a latency under 200 milliseconds.';

exports.up = async function up(knex) {
  // Unit tests migrate a fresh database and assert on the rows they insert.
  if (process.env.NODE_ENV === 'test') return;

  const existing = await knex('hypothesis').where('statement', STATEMENT).first('id');
  if (existing) return;

  const row = {
    entityRefs: JSON.stringify(['component:default/api-gateway']),
    status: 'Open',
    statement: STATEMENT,
    sourceType: 'Requirements',
    relatedArtefacts: JSON.stringify([]),
    qualityAttributes: JSON.stringify(['Performance', 'Security']),
    uncertainty: 'Medium',
    impact: 'Medium',
    notes:
      'Sample from the recorded hypothesis coach and plan designer walkthrough. It is not the output of a model.',
  };
  const [inserted] = await knex('hypothesis').insert(row).returning('id');
  if (!inserted?.id) return;
  await knex('hypothesisEvents').insert({
    hypothesisId: inserted.id,
    eventType: 'CREATE',
    changes: JSON.stringify(row),
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  const row = await knex('hypothesis').where('statement', STATEMENT).first('id');
  if (!row) return;
  await knex('hypothesisEvents').where('hypothesisId', row.id).del();
  await knex('hypothesis').where('id', row.id).del();
};
