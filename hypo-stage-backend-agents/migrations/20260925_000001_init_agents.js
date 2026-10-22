// @ts-check

/**
 * Tables owned by the HypoStage agents module. Hypotheses and technical
 * plannings belong to @archhypo/plugin-hypo-stage-backend and are only read
 * here; suggestions are applied through that plugin's REST API.
 *
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.up = async function up(knex) {
  await knex.schema.createTable('agent_runs', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.string('repository').notNullable();
    table.integer('pr_number').notNullable();
    table.string('head_sha').nullable();
    table.string('pr_url').nullable();
    table.string('trigger_action').notNullable();
    table.string('model_key').notNullable();
    table.string('provider').notNullable();
    table.string('status').notNullable(); // running | completed | failed | skipped
    table.text('error').nullable();
    table.text('trace').nullable(); // JSON: steps, durations, token usage
    table.timestamp('started_at').notNullable();
    table.timestamp('completed_at').nullable();

    table.index(['repository', 'pr_number'], 'agent_runs_pr_idx');
    table.index(['status'], 'agent_runs_status_idx');
  });

  await knex.schema.createTable('agent_suggestions', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table
      .uuid('run_id')
      .notNullable()
      .references('id')
      .inTable('agent_runs')
      .onDelete('CASCADE');
    table
      .uuid('hypothesis_id')
      .notNullable()
      .references('id')
      .inTable('hypothesis')
      .onDelete('CASCADE');
    table
      .uuid('technical_planning_id')
      .nullable()
      .references('id')
      .inTable('technicalPlanning')
      .onDelete('CASCADE');
    // link | reassessment | planning_progress | new_planning | status_change
    table.string('kind').notNullable();
    table.text('payload').notNullable(); // JSON, shape depends on kind
    table.text('rationale').notNullable();
    table.text('evidence').notNullable(); // JSON array of { file, note }
    table.decimal('confidence', 4, 3).notNullable();
    table.string('artifact_ref').notNullable(); // owner/repo#pull/N
    table.string('artifact_url').notNullable(); // PR html_url
    table.string('head_sha').nullable();
    table.string('status').notNullable().defaultTo('pending'); // pending | accepted | rejected | superseded
    table.string('reviewed_by').nullable();
    table.timestamp('reviewed_at').nullable();

    table.index(['hypothesis_id', 'status'], 'agent_suggestions_hypothesis_idx');
    table.index(['artifact_ref', 'status'], 'agent_suggestions_artifact_idx');
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable('agent_suggestions');
  await knex.schema.dropTable('agent_runs');
};
