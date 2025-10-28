// @ts-check

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('technicalPlanning', table => {
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('hypothesisId').notNullable();
    table.string('entityRef').notNullable(); // Backstage entity reference
    table.string('actionType').notNullable();
    table.text('description').notNullable();
    table.text('expectedOutcome').notNullable();
    table.text('documentations').notNullable(); // Array of URLs
    table.date('targetDate').notNullable();

    // Foreign key constraint
    table.foreign('hypothesisId').references('id').inTable('hypothesis').onDelete('CASCADE');
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable('technicalPlanning');
};
