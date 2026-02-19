# ⚙️ HypoStage Backend Plugin

Backend plugin for [HypoStage](https://github.com/ArchHypo/hypo-stage): persistence and API for architectural hypotheses and technical planning. Uses the Backstage database and catalog services.

**Package:** `@archhypo/plugin-hypo-stage-backend`

## 📑 Table of contents

- [✅ Requirements](#requirements)
- [🔨 Build, test and lint](#build-test-and-lint)
- [📦 What this package provides](#what-this-package-provides)
- [🗄️ Database migrations](#database-migrations)
- [📥 Installation into a Backstage app](#installation-into-a-backstage-app)

---

## ✅ Requirements

- **Backstage backend** with `coreServices.database` configured (PostgreSQL or SQLite in `app-config.yaml`).
- **PostgreSQL** (recommended for production) or SQLite (e.g. for local dev). For a local Postgres instance without modifying your app, use the repo’s Docker Compose: from the [repository root](https://github.com/ArchHypo/hypo-stage), run `make start-dependencies` (see [Running with Docker](https://github.com/ArchHypo/hypo-stage#running-with-docker) in the main README).

---

## 🔨 Build, test and lint

From the **repository root** (parent of this directory), run:

```bash
# All plugins (recommended)
make build    # or: yarn build
make test     # or: yarn test
make lint     # or: yarn lint
```

From **this directory** only:

```bash
yarn install    # if not already installed from root
yarn build      # needs dist-types from root first; use root `yarn build`
yarn test
yarn lint
```

For full validation (deps, build, test, lint for both frontend and backend), see [Validating usage](https://github.com/ArchHypo/hypo-stage/blob/main/README.md#validating-usage) in the main README.

---

## 📦 What this package provides

- **HypothesisService** – Create, read, update, delete hypotheses and technical planning items; event history.
- **REST API** – Mounted under the Backstage backend:
  - `GET/POST /hypotheses`, `GET/PUT/DELETE /hypotheses/:id`
  - `GET /hypotheses/:id/events`
  - `GET /hypotheses/entity-refs`, `GET /hypotheses/teams`, `GET /hypotheses/referenced-entity-refs`
  - `GET /hypotheses/stats`
  - `POST /hypotheses/:id/technical_plannings`, `PUT/DELETE /technical_plannings/:id`
- **Database** – Uses Backstage’s `coreServices.database` (Knex). Migrations in `migrations/` (hypothesis, hypothesisEvents, technicalPlanning tables).
- **Catalog integration** – Uses `CatalogService` for entity refs and team filtering (optional `spec.team` on components).

---

## 🗄️ Database migrations

Migrations run **automatically** when the Backstage backend starts: the plugin calls `database.getClient()` and runs `migrate.latest()` from the `migrations/` directory (unless the Backstage config sets `database.migrations.skip`). No manual migration step is required.

| Migration | Tables / purpose |
|-----------|-------------------|
| `20250716_000001_create_hypothesis.js` | `hypothesis` table |
| `20250827_000002_create_hypothesis_events.js` | `hypothesis_events` table (evolution history) |
| `20250902_00003_create_technical_planning.js` | `technical_planning` table |

---

## 📥 Installation into a Backstage app

1. Copy this `hypo-stage-backend` directory into your app’s `plugins/` folder.
2. From the app root:

   ```bash
   yarn --cwd packages/backend add @archhypo/plugin-hypo-stage-backend
   ```

3. In `packages/backend/src/index.ts`:

   ```ts
   import { createBackend } from '@backstage/backend-defaults';

   const backend = createBackend();
   // ... other plugins ...
   backend.add(import('@archhypo/plugin-hypo-stage-backend'));
   backend.start();
   ```

4. Ensure the backend has a database configured (PostgreSQL or SQLite via `app-config.yaml`). For a local Postgres instance you can use the [repo Docker Compose](https://github.com/ArchHypo/hypo-stage#running-with-docker): `make start-dependencies` at the repo root.

Full installation, configuration, and Docker usage are in the [repository README](https://github.com/ArchHypo/hypo-stage/blob/main/README.md).
