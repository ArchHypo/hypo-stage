// @ts-check

/**
 * Remembers when a plan issue was last reopened, so a planning completed earlier can be
 * completed again after its plan issue is reopened.
 *
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('agent_issue_links', table => {
    table.timestamp('reopened_at').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  await knex.schema.alterTable('agent_issue_links', table => {
    table.dropColumn('reopened_at');
  });
};
