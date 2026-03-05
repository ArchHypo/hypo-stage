// @ts-check

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('hypothesisEvents', table => {
    table.uuid('technicalPlanningId').nullable();

    table.foreign('technicalPlanningId')
      .references('id')
      .inTable('technicalPlanning')
      .onDelete('SET NULL');
  });

  // Backfill: populate technicalPlanningId FK from changes JSON for seed/existing events
  const events = await knex('hypothesisEvents')
    .whereIn('eventType', ['TECHNICAL_PLANNING_CREATE', 'TECHNICAL_PLANNING_UPDATE'])
    .whereNull('technicalPlanningId')
    .select('id', 'changes');

  for (const event of events) {
    try {
      const changes = typeof event.changes === 'string'
        ? JSON.parse(event.changes)
        : event.changes;
      if (changes?.technicalPlanningId) {
        await knex('hypothesisEvents')
          .where('id', event.id)
          .update({ technicalPlanningId: changes.technicalPlanningId });
      }
    } catch {
      // skip malformed JSON
    }
  }
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('hypothesisEvents', table => {
    table.dropForeign(['technicalPlanningId']);
    table.dropColumn('technicalPlanningId');
  });
};
