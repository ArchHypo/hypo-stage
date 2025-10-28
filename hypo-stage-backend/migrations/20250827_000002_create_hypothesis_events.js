// @ts-check

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('hypothesisEvents', table => {
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('hypothesisId').notNullable();
    table.string('eventType').notNullable();
    table.text('changes').notNullable();

    // Foreign key constraint
    table.foreign('hypothesisId').references('id').inTable('hypothesis').onDelete('CASCADE');
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable('hypothesisEvents');
};
