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
