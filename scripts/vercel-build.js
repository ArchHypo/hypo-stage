#!/usr/bin/env node
/**
 * Vercel build: ensure VITE_BACKEND_URL is set, build types, then frontend.
 * Run from repo root. Keeps vercel.json buildCommand under 256 chars.
 */
const { execSync } = require('child_process');

if (!process.env.VITE_BACKEND_URL) {
  console.error('Set VITE_BACKEND_URL in Vercel env vars (Settings → Environment Variables).');
  process.exit(1);
}

execSync('yarn build:types', { stdio: 'inherit' });
execSync('yarn build:standalone', { stdio: 'inherit', cwd: 'hypo-stage' });
