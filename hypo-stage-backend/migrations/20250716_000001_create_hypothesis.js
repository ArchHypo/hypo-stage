// @ts-check

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('hypothesis', table => {
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.text('entityRefs').notNullable(); // Array of entity references
    table.string('status').notNullable();
    table.string('statement').notNullable();
    table.string('sourceType').notNullable();
    table.text('relatedArtefacts').notNullable(); // Array of URLs
    table.text('qualityAttributes').notNullable(); // Array of quality attributes
    table.string('uncertainty').notNullable();
    table.string('impact').notNullable();
    table.text('notes').nullable();
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable('hypothesis');
};
