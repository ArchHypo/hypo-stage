# HypoStage Backend Plugin

Backend plugin for [HypoStage](https://github.com/ArchHypo/hypo-stage): REST API, database, and services for architectural hypothesis management in [Backstage](https://backstage.io).

**Package:** `@archhypo/plugin-hypo-stage-backend`

> **Important:** The frontend package `@archhypo/plugin-hypo-stage` must be installed in the same Backstage app to use this backend.

---

## Features

- **HypothesisService** — CRUD for hypotheses and technical planning
- **REST API** — Full API for the frontend
- **Database** — Knex migrations; PostgreSQL or SQLite
- **Catalog integration** — Entity refs and team filtering

---

## Compatibility

- **Backstage:** v1.16.0+
- **Node.js:** 20+

---

## Installation

### 1. Install packages

From your Backstage app root:

```bash
yarn --cwd packages/app add @archhypo/plugin-hypo-stage
yarn --cwd packages/backend add @archhypo/plugin-hypo-stage-backend
```

### 2. Register the backend plugin

In `packages/backend/src/index.ts`:

```ts
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();
// ... other plugins ...
backend.add(import('@archhypo/plugin-hypo-stage-backend'));
backend.start();
```

### 3. Configure the database

The plugin uses Backstage's database. Add to `app-config.yaml`:

**PostgreSQL (recommended):**

```yaml
backend:
  database:
    client: pg
    connection:
      host: ${POSTGRES_HOST}
      port: ${POSTGRES_PORT}
      user: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}
      database: backstage
    plugin:
      hypo-stage:
        connection:
          database: backstage_plugin_hypo_stage
```

**SQLite (dev):**

```yaml
backend:
  database:
    client: better-sqlite3
    connection: ':memory:'
```

Migrations run automatically when the backend starts. No manual step required.

---

## REST API

The plugin mounts these routes under the Backstage backend:

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/hypotheses` | List hypotheses (query: entityRef, team, focus) |
| `POST` | `/hypotheses` | Create hypothesis |
| `GET` | `/hypotheses/:id` | Get hypothesis by ID |
| `PUT` | `/hypotheses/:id` | Update hypothesis |
| `DELETE` | `/hypotheses/:id` | Delete hypothesis |
| `GET` | `/hypotheses/:id/events` | Get evolution events |
| `GET` | `/hypotheses/entity-refs` | List entity refs for autocomplete |
| `GET` | `/hypotheses/teams` | List teams for filter |
| `GET` | `/hypotheses/referenced-entity-refs` | Entity refs referenced by hypotheses |
| `GET` | `/hypotheses/stats` | Aggregated stats |
| `POST` | `/hypotheses/:id/technical_plannings` | Add technical planning item |
| `PUT` | `/technical_plannings/:id` | Update technical planning item |
| `DELETE` | `/technical_plannings/:id` | Delete technical planning item |

---

## Database

### Migrations

Migrations run automatically on backend startup. Located in `migrations/`:

| Migration | Tables |
|-----------|--------|
| `20250716_000001_create_hypothesis.js` | `hypothesis` |
| `20250827_000002_create_hypothesis_events.js` | `hypothesis_events` (evolution history) |
| `20250902_00003_create_technical_planning.js` | `technical_planning` |

### Plugin-specific database

For production, use a dedicated database per plugin. Configure `backend.database.plugin.hypo-stage.connection` as shown above. The main `backend.database.connection` can point to the default Backstage DB; the plugin uses its own connection when `plugin.hypo-stage` is set.

---

## Frontend configuration

The frontend must be configured separately. See the [frontend package README](https://www.npmjs.com/package/@archhypo/plugin-hypo-stage) or [repository](https://github.com/ArchHypo/hypo-stage) for:

- Routes and sidebar
- API registration (`HypoStageApiRef` / `HypoStageApiClient`)

---

## Documentation

Full documentation, Docker, standalone run, and E2E tests: [github.com/ArchHypo/hypo-stage](https://github.com/ArchHypo/hypo-stage)
