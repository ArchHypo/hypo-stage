import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('hypothesis', table => {
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.increments('id').primary();
    table.string('title').notNullable();
    table.string('description').notNullable();
    table.string('uncertainty').notNullable();
    table.string('impact').notNullable();
    table.string('technical_planning').notNullable();
    table.string('status').notNullable();
    table.string('owner').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('hypothesis');
}
