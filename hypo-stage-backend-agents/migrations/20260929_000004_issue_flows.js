// @ts-check

/**
 * GitHub issue flows: issue triage, plans as issues (with sync back), coverage findings
 * and the maintenance report. Adds provenance/lineage to runs and multi-source suggestions.
 *
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.up = async function up(knex) {
  await knex.schema.alterTable('agent_runs', table => {
    table.string('artifact_kind').notNullable().defaultTo('pull_request'); // pull_request | issue
    table.string('handler').notNullable().defaultTo('pr_analysis'); // pr_analysis | issue_triage | plan_sync | plan_comment
    table.string('origin').notNullable().defaultTo('human'); // human | hypostage
  });

  await knex.schema.alterTable('agent_suggestions', table => {
    table.text('sources').nullable(); // JSON [{ artifactRef, url, kind }]
  });

  await knex.schema.createTable('agent_issue_links', table => {
    table
      .uuid('technical_planning_id')
      .primary()
      .references('id')
      .inTable('technicalPlanning')
      .onDelete('CASCADE');
    table
      .uuid('hypothesis_id')
      .notNullable()
      .references('id')
      .inTable('hypothesis')
      .onDelete('CASCADE');
    table.string('repository').notNullable();
    table.integer('issue_number').notNullable();
    table.string('issue_url').notNullable();
    table.string('state').notNullable().defaultTo('open'); // open | closed
    table.string('state_reason').nullable(); // completed | not_planned | reopened
    table.string('created_by').nullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('closed_at').nullable();

    table.unique(['repository', 'issue_number'], { indexName: 'agent_issue_links_issue_uq' });
  });

  await knex.schema.createTable('agent_issue_observations', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.string('repository').notNullable();
    table.integer('number').notNullable();
    table.string('url').notNullable();
    table.text('title').notNullable();
    table.string('author').nullable();
    table.text('labels').notNullable(); // JSON string[]
    table.string('state').notNullable();
    table.string('state_reason').nullable();
    table.timestamp('created_at').notNullable();
    table.timestamp('closed_at').nullable();
    table.integer('comments').notNullable().defaultTo(0);
    table.integer('reopened').notNullable().defaultTo(0);
    table.string('classification').nullable(); // bug | improvement | question | other
    table.text('quality_attributes').notNullable(); // JSON string[]
    table.text('related').notNullable(); // JSON [{ hypothesisId, evidenceType }]
    table.timestamp('analyzed_at').nullable();

    table.unique(['repository', 'number'], { indexName: 'agent_issue_observations_issue_uq' });
    table.index(['created_at'], 'agent_issue_observations_created_idx');
  });

  await knex.schema.createTable('agent_coverage_findings', table => {
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.string('group_key').notNullable(); // entityRef|qualityAttribute
    table.string('entity_ref').nullable();
    table.string('repository').notNullable();
    table.string('quality_attribute').notNullable();
    table.integer('window_days').notNullable();
    table.text('issues').notNullable(); // JSON urls
    table.text('impact_proxy').notNullable(); // JSON stats
    table.text('theme').notNullable();
    table.text('draft_statement').notNullable();
    table
      .uuid('review_id')
      .nullable()
      .references('id')
      .inTable('agent_hypothesis_reviews')
      .onDelete('SET NULL');
    table.string('status').notNullable().defaultTo('pending'); // pending | created | dismissed

    table.index(['group_key', 'status'], 'agent_coverage_findings_group_idx');
  });
};

/**
 * @param {import('knex').Knex} knex
 * @returns {Promise<void>}
 */
exports.down = async function down(knex) {
  await knex.schema.dropTable('agent_coverage_findings');
  await knex.schema.dropTable('agent_issue_observations');
  await knex.schema.dropTable('agent_issue_links');
  await knex.schema.alterTable('agent_suggestions', table => {
    table.dropColumn('sources');
  });
  await knex.schema.alterTable('agent_runs', table => {
    table.dropColumn('artifact_kind');
    table.dropColumn('handler');
    table.dropColumn('origin');
  });
};
