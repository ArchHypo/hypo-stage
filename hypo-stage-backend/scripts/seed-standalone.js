#!/usr/bin/env node
/**
 * Seeds demo hypotheses into the HypoStage plugin's own database.
 * Uses backend.database.plugin.hypo-stage (or backend.database + default plugin DB name).
 * Run from repo root or set BACKSTAGE_CONFIG_PATH.
 *
 * Usage (from repo root):
 *   node hypo-stage-backend/scripts/seed-standalone.js
 * Or from hypo-stage-backend:
 *   node scripts/seed-standalone.js
 *
 * Ensures the plugin database exists, runs migrations, then the demo seed (idempotent).
 */
const path = require('path');
const fs = require('fs');

// Repo root: from hypo-stage-backend/scripts go up twice; from repo/plugins/hypo-stage-backend/scripts go up three times
const possibleRoots = [
  path.resolve(__dirname, '../..'),
  path.resolve(__dirname, '../../..'),
];
const repoRoot = possibleRoots.find((r) => fs.existsSync(path.join(r, 'app-config.yaml')) || fs.existsSync(path.join(r, 'app-config.example.yaml'))) || possibleRoots[0];
const configPath = process.env.BACKSTAGE_CONFIG_PATH || path.join(repoRoot, 'app-config.yaml');
const resolvedConfigPath = path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath);

if (!fs.existsSync(resolvedConfigPath)) {
  console.error('Config not found:', resolvedConfigPath);
  console.error('Copy app-config.example.yaml to app-config.yaml or set BACKSTAGE_CONFIG_PATH.');
  process.exit(1);
}

// Use Backstage's config loader so ${ENV_VAR} substitution and config includes are resolved
// (same as `yarn start`). Plain js-yaml would leave placeholders unresolved and can break connection.
let dbConfig;
async function loadResolvedConfig() {
  const configLoader = require('@backstage/config-loader');
  const source = configLoader.ConfigSources.default({
    argv: ['--config', resolvedConfigPath],
    rootDir: path.dirname(resolvedConfigPath),
  });
  const config = await configLoader.ConfigSources.toConfig(source);
  try {
    const backend = config.getOptional('backend');
    dbConfig = backend?.database;
  } finally {
    if (typeof config.close === 'function') config.close();
  }
}

// Load config then run the rest (knex setup and main) so we keep a single async entry point
(async function run() {
  try {
    await loadResolvedConfig();
  } catch (e) {
    console.error('Failed to load config:', e.message);
    process.exit(1);
  }

  if (!dbConfig) {
    console.error('backend.database not found in', resolvedConfigPath);
    process.exit(1);
  }

  // Use the plugin's own database: backend.database.plugin.hypo-stage, or default backstage_plugin_hypo_stage
  const PLUGIN_ID = 'hypo-stage';
  const DEFAULT_PLUGIN_DB = 'backstage_plugin_hypo_stage';
  const baseConnection = dbConfig.connection || dbConfig;
  const pluginConfig = dbConfig.plugin && dbConfig.plugin[PLUGIN_ID];
  const effectiveClient = pluginConfig && (pluginConfig.client || (pluginConfig.connection && pluginConfig.connection.client)) ? (pluginConfig.client || pluginConfig.connection.client) : dbConfig.client;
  const isSqlite = (effectiveClient || dbConfig.client) === 'better-sqlite3' || (effectiveClient || dbConfig.client) === 'sqlite3';

  let connection;
  if (pluginConfig) {
    const baseObj = typeof baseConnection === 'object' && baseConnection ? baseConnection : {};
    connection = { ...baseObj, ...(pluginConfig.connection || pluginConfig) };
  } else if (isSqlite) {
    // SQLite uses filename, not database. Knex/better-sqlite3 expects string or { filename }
    if (typeof baseConnection === 'string') {
      connection = { filename: baseConnection };
    } else if (typeof baseConnection === 'object' && baseConnection) {
      connection = baseConnection;
    } else {
      connection = { filename: ':memory:' };
    }
  } else {
    // PostgreSQL: use object with database
    const baseObj = typeof baseConnection === 'object' && baseConnection ? baseConnection : {};
    connection = { ...baseObj, database: baseObj.database || DEFAULT_PLUGIN_DB };
  }

  const knex = require('knex')({
    client: effectiveClient || dbConfig.client,
    connection,
    useNullAsDefault: true,
  });

  const migrationsDir = path.join(__dirname, '../migrations');

  async function ensurePostgresDatabase() {
    if ((effectiveClient || dbConfig.client) !== 'pg' || typeof connection !== 'object' || !connection) return;
    const dbName = connection.database;
    if (!dbName || dbName === 'postgres') return;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName)) return;
    const adminConnection = { ...connection, database: 'postgres' };
    const adminKnex = require('knex')({ client: 'pg', connection: adminConnection, useNullAsDefault: true });
    try {
      await adminKnex.raw('CREATE DATABASE ??', [dbName]);
      console.log(`Database "${dbName}" created.`);
    } catch (e) {
      if (e.code !== '42P04') throw e;
      // 42P04 = duplicate_database
    } finally {
      await adminKnex.destroy();
    }
  }

  try {
    await ensurePostgresDatabase();
    console.log('Running migrations...');
    await knex.migrate.latest({ directory: migrationsDir });
    console.log('Running demo seed (idempotent)...');
    const seedMigration = require('../migrations/20260216_000004_seed_demo_hypotheses.js');
    await seedMigration.up(knex);
    console.log('Done. Demo hypotheses are in the database.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await knex.destroy();
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
