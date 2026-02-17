#!/usr/bin/env node
/**
 * Ensures BACKSTAGE_CONFIG_PATH is set to app-config.yaml (repo root or current dir)
 * so the backend loads backend.cors and backend.database when started via the CLI.
 * Run before starting the backend, or use: node scripts/ensure-config-path.js && backstage-cli package start
 */
const path = require('path');
const fs = require('fs');

const candidates = [
  path.resolve(process.cwd(), 'app-config.yaml'),
  path.resolve(process.cwd(), '..', 'app-config.yaml'),
  path.resolve(__dirname, '..', '..', 'app-config.yaml'),
];
const configPath = candidates.find((p) => fs.existsSync(p));
if (configPath && !process.env.BACKSTAGE_CONFIG_PATH) {
  process.env.BACKSTAGE_CONFIG_PATH = configPath;
}

// If we're the main module, exec the real start command so the child gets the env
if (require.main === module) {
  const { execSync } = require('child_process');
  execSync('backstage-cli package start', {
    stdio: 'inherit',
    env: process.env,
  });
}
