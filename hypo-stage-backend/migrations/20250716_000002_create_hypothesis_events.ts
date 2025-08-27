import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('hypothesisEvents', table => {
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.uuid('id').primary().defaultTo(knex.fn.uuid());
    table.uuid('hypothesisId').notNullable();
    table.string('eventType').notNullable();
    table.text('changes').notNullable();

    // Foreign key constraint
    table.foreign('hypothesisId').references('id').inTable('hypothesis').onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('hypothesisEvents');
}
