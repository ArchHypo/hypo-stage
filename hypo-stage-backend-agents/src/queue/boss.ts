import type { Knex } from 'knex';
import type { LoggerService } from '@backstage/backend-plugin-api';
import PgBoss from 'pg-boss';

/** Converts pg-style $1 placeholders into knex positional bindings. */
export function convertPgBindings(
  text: string,
  values: unknown[],
): { text: string; values: unknown[] } {
  const bindings: unknown[] = [];
  const convertedText = text.replace(/\$(\d+)\b/g, (_, index: string) => {
    bindings.push(values[Number(index) - 1]);
    return '?';
  });
  return { text: convertedText, values: bindings };
}

/** Starts pg-boss on the plugin's own database connection (through knex). */
export async function createPgBoss({
  knex,
  logger,
}: {
  knex: Knex;
  logger: LoggerService;
}): Promise<PgBoss> {
  const boss = new PgBoss({
    schema: 'pgboss',
    db: {
      executeSql: async (text: string, values: unknown[] = []) => {
        const converted = convertPgBindings(text, values);
        const result =
          converted.values.length > 0
            ? await knex.raw(converted.text, converted.values as Knex.RawBinding[])
            : await knex.raw(converted.text);
        return { rows: result?.rows ?? [], rowCount: result?.rowCount ?? 0 };
      },
    },
  });

  boss.on('error', error => {
    logger.error('pg-boss error', { error: String(error) });
  });

  await boss.start();
  return boss;
}
