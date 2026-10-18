// @ts-check

/**
 * Technical plan designer: stores proposals and what reviewers did with each action.
 *
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('agent_plan_proposals', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table
      .uuid('hypothesis_id')
      .notNullable()
      .references('id')
      .inTable('hypothesis')
      .onDelete('CASCADE');
    table.string('requested_by').nullable();
    table.string('model_key').notNullable();
    table.string('provider').notNullable();
    table.string('profile').notNullable();
    table.string('status').notNullable(); // completed | failed
    table.text('error').nullable();
    table.text('result').nullable(); // JSON: reading, actions, warnings
    table.integer('duration_ms').nullable();
    table.integer('input_tokens').nullable();
    table.integer('output_tokens').nullable();

    table.index(['hypothesis_id'], 'agent_plan_proposals_hypothesis_idx');
  });

  await knex.schema.createTable('agent_plan_proposal_actions', table => {
    table
      .uuid('proposal_id')
      .notNullable()
      .references('id')
      .inTable('agent_plan_proposals')
      .onDelete('CASCADE');
    table.integer('index').notNullable();
    table.string('decision').notNullable(); // added | edited | dismissed
    table
      .uuid('technical_planning_id')
      .nullable()
      .references('id')
      .inTable('technicalPlanning')
      .onDelete('SET NULL');
    table.string('decided_by').nullable();
    table.timestamp('decided_at').defaultTo(knex.fn.now());

    table.primary(['proposal_id', 'index']);
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable('agent_plan_proposal_actions');
  await knex.schema.dropTable('agent_plan_proposals');
};
