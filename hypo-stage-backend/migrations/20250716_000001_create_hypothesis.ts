import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('hypothesis', table => {
    table.string('entityRef').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.uuid('id').primary();
    table.string('text').notNullable();
    table.string('uncertainty').notNullable();
    table.string('impact').notNullable();
    table.string('status').notNullable();
    table.string('technicalPlanning').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('hypothesis');
}
