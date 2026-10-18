// @ts-check

/**
 * Hypothesis coach: stores statement reviews and lets agent_suggestions hold
 * suggestions that do not come from a pull request (coach rewrites).
 *
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('agent_hypothesis_reviews', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table
      .uuid('hypothesis_id')
      .nullable()
      .references('id')
      .inTable('hypothesis')
      .onDelete('CASCADE');
    table.string('statement_hash', 64).notNullable();
    table.text('statement').notNullable();
    table.string('trigger').notNullable(); // on_demand | save | fallback
    table.string('requested_by').nullable();
    table.string('model_key').notNullable();
    table.string('provider').notNullable();
    table.string('status').notNullable(); // completed | failed
    table.text('error').nullable();
    table.text('result').nullable(); // JSON, guarded review
    table.integer('duration_ms').nullable();
    table.integer('input_tokens').nullable();
    table.integer('output_tokens').nullable();

    table.index(['statement_hash'], 'agent_hypothesis_reviews_hash_idx');
    table.index(['hypothesis_id'], 'agent_hypothesis_reviews_hypothesis_idx');
  });

  await knex.schema.alterTable('agent_suggestions', table => {
    table.uuid('run_id').nullable().alter();
    table.string('artifact_ref').nullable().alter();
    table.string('artifact_url').nullable().alter();
    table
      .uuid('review_id')
      .nullable()
      .references('id')
      .inTable('agent_hypothesis_reviews')
      .onDelete('SET NULL');
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  await knex('agent_suggestions').whereNull('run_id').del();
  await knex.schema.alterTable('agent_suggestions', table => {
    table.dropForeign(['review_id']);
    table.dropColumn('review_id');
    table.uuid('run_id').notNullable().alter();
    table.string('artifact_ref').notNullable().alter();
    table.string('artifact_url').notNullable().alter();
  });
  await knex.schema.dropTable('agent_hypothesis_reviews');
};
