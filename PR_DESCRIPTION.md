# Docs: README standalone sequence, seed tooling, make check, and CORS

## Summary

Improves standalone run instructions so they follow a single, exact sequence everywhere (Quick start, Run standalone, Running both together). Adds a one-command seed path (`make seed-standalone`), CORS handling for the dev backend, and a combined validation target (`make check`). README is updated throughout for consistency and missing details (Validating usage, troubleshooting, Docker).

## Changes

### README

- **Run standalone**: Steps are in a fixed order (1–6): start Postgres → config → **`make seed-standalone`** (recommended) → backend → frontend (new terminal) → open app. Explicit “from repo root” and “in order.”
- **Quick start**: Same sequence; Terminal 2 does config, then `make seed-standalone`, then backend; Terminal 3 frontend “from repo root.” Links and wording aligned with Run standalone.
- **Running both together**: Uses the same sequence as Run standalone; references `make seed-standalone` (recommended).
- **Demo seed**: Documents that the plugin has its own DB; seed runs via migration (idempotent); **`make seed-standalone`** recommended; backfill behavior when the hypothesis table already has rows (evolution events + technical planning for payment/inventory). “How to run migrations with seed data” no longer references a non-existent `make run-standalone`; points to “start backend (and frontend) as in Run standalone.”
- **Troubleshooting seed**: If the plugin DB doesn’t exist, recommend **`make seed-standalone`** first (creates DB and seeds); alternatives (`make create-db` then `yarn seed`, or manual `psql` + `make seed-standalone`) documented.
- **Validating usage**: Standalone check now says to follow Run standalone including **`make seed-standalone`** for full demo data.
- **Running with Docker**: When using Docker Postgres with the frontend run separately (e.g. standalone at 3000), note to set **`backend.cors`** in `app-config.yaml` (see `app-config.example.yaml`).
- **Table of contents / anchors**: “Option A/B” replaced with “Run standalone” and “Add to your existing Backstage app”; Prerequisites Docker line simplified to “optional, for Postgres.”

### Makefile

- **`make check`**: Runs build → test → lint in one go; prints `=== Build ===`, `=== Test ===`, `=== Lint ===` and a short summary (OK + metrics or FAILED); runs all three even if one fails; ends with “Check summary” and overall pass/fail.
- **`make create-db`**: Creates the HypoStage plugin database `backstage_plugin_hypo_stage` (e.g. in Docker Postgres).
- **`make seed-standalone`**: Runs `create-db` (best-effort), then `cd hypo-stage-backend && yarn seed` so one command sets up the plugin DB and seed from repo root.

### Backend

- **Scripts**:
  - **`ensure-config-path.js`**: Sets `BACKSTAGE_CONFIG_PATH` to `app-config.yaml` (repo root or current dir) then execs the Backstage backend so `app-config.yaml` (and thus `backend.cors`) is loaded when running `yarn start`.
  - **`seed-standalone.js`**: Used by `yarn seed`; runs migrations and seed (see migration below).
- **`package.json`**: `"start": "node scripts/ensure-config-path.js"` so CORS from config is applied in dev.
- **`dev/index.ts`**: Ensures `BACKSTAGE_CONFIG_PATH` is set for the dev server when needed.
- **Migration** `20260216_000004_seed_demo_hypotheses.js`: Seeds example hypotheses (payment, inventory, API gateway, etc.) with varied uncertainty/impact; adds evolution events for the “Evolução da Incerteza e Impacto” chart and technical planning for payment/inventory. **Backfill**: if the hypothesis table already has rows, still adds evolution events and technical planning for the payment and inventory hypotheses.

### Config and repo

- **`app-config.example.yaml`**: Adds `backend.cors` (for frontend at 3000) and `backend.database.plugin.hypo-stage` (plugin DB) so copy-paste gives a working standalone setup.
- **`.dockerignore`**: Added to keep image builds lean.

## How to verify

- **Standalone**: From repo root, in order: `make start-dependencies` → `cp app-config.example.yaml app-config.yaml` → `make seed-standalone` → `cd hypo-stage-backend && yarn start` (Terminal 2) → `cd hypo-stage && yarn start` (Terminal 3). Open http://localhost:3000; no CORS errors; hypotheses and evolution chart have data.
- **Validation**: `make deps && make check` — expect section headers and a final check summary.
- **Seed only**: With Postgres running and config in place, `make seed-standalone` creates the plugin DB (if needed) and seeds it; re-run is idempotent.
