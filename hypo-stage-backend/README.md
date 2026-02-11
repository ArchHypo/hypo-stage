# HypoStage Backend Plugin

Backend plugin for [HypoStage](https://github.com/ArchHypo/hypo-stage): persistence and API for architectural hypotheses and technical planning. Uses the Backstage database and catalog services.

**Package:** `@internal/plugin-hypo-stage-backend`

## Table of contents

- [Build, test and lint](#build-test-and-lint)
- [What this package provides](#what-this-package-provides)
- [Installation into a Backstage app](#installation-into-a-backstage-app)

---

## Build, test and lint

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

For full validation (deps, build, test, lint for both frontend and backend), use the [main README](https://github.com/ArchHypo/hypo-stage/blob/main/README.md) and run `make validate` at the repo root.

---

## What this package provides

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

## Installation into a Backstage app

1. Copy this `hypo-stage-backend` directory into your app’s `plugins/` folder.
2. From the app root:

   ```bash
   yarn --cwd packages/backend add @internal/plugin-hypo-stage-backend
   ```

3. In `packages/backend/src/index.ts`:

   ```ts
   import { createBackend } from '@backstage/backend-defaults';

   const backend = createBackend();
   // ... other plugins ...
   backend.add(import('@internal/plugin-hypo-stage-backend'));
   backend.start();
   ```

4. Ensure the backend has a database configured (PostgreSQL or SQLite via `app-config.yaml`). For a local Postgres instance you can use the [repo Docker Compose](https://github.com/ArchHypo/hypo-stage#running-with-docker): `make start-dependencies` at the repo root.

Full installation, configuration, and Docker usage are in the [repository README](https://github.com/ArchHypo/hypo-stage/blob/main/README.md).
