<h1 align="center">💡 HypoStage</h1>

<p align="center">
  <img src="docs/e2e/walkthrough-videos/walkthrough-1-home.gif" alt="Home and dashboard" />
</p>

<p align="center">
  <em>Document assumptions · Track uncertainty · Validate decisions</em>
</p>

<p align="center">
  <sub>Architectural hypothesis management that fits right into your Backstage.</sub>
</p>

---

HypoStage integrates architectural hypothesis management into your Backstage environment, enabling teams to document, track, and validate architectural decisions effectively. This plugin provides a comprehensive framework for managing architectural hypotheses with uncertainty assessment, quality attributes tracking, and technical planning capabilities.

A **demo with seed data** is available for a quick overview: [https://hypo-stage-hypo-stage.vercel.app](https://hypo-stage-hypo-stage.vercel.app/). It is not for production—just an alternative way to see the plugin in action. See [Standalone demo deployment](docs/standalone-demo-deployment.md) for how we set it up.

---

## 🚀 Quick start

Choose how you want to run HypoStage:

| Goal | Path | Section |
|------|------|---------|
| **Try it without a Backstage app** | Run frontend + backend standalone (3 terminals) | [Run standalone](#run-standalone-no-backstage-app-required) |
| **Add to an existing Backstage app** | Install packages and configure frontend & backend | [Installation](#installation) |

**Run standalone (fastest way to see the UI):**

From the **repo root**, in order:

```bash
# Terminal 1 – start PostgreSQL
make start-dependencies

# Terminal 2 – config, then seed, then backend (all from repo root)
cp app-config.example.yaml app-config.yaml   # edit if needed
make seed-standalone                           # plugin DB + migrations + seed (optional but recommended)
cd hypo-stage-backend && yarn install && yarn start

# Terminal 3 – frontend (from repo root)
cd hypo-stage && yarn install && yarn start
```

Then open **http://localhost:3000** and use the Hypo Stage UI (you’re signed in as a guest automatically). Full steps and alternatives (SQLite, CORS, seed): [Run standalone](#run-standalone-no-backstage-app-required) and [Running plugins standalone](#running-plugins-standalone).

---

## 📑 Table of contents

**Get started**
- [📖 What is HypoStage?](#-what-is-hypostage)
- [📁 Repository structure](#-repository-structure)
- [✅ Prerequisites](#-prerequisites)
- [🖥️ Run standalone](#-run-standalone-no-backstage-app-required)
- [🔌 Add to a Backstage app](#-add-to-your-existing-backstage-app)

**Install & use**
- [📦 Installation](#-installation) (step-by-step for Backstage)
- [🎯 Usage](#-usage)
- [🎬 Real usage walkthrough](#-real-usage-walkthrough)

**Develop & validate**
- [🔨 Building the project](#-building-the-project)
- [🧪 Running tests](#-running-tests)
- [End-to-end tests (Playwright)](#end-to-end-tests-playwright)
- [✨ Code style (lint)](#-code-style-lint)
- [✔️ Validating usage](#-validating-usage)
- [🔄 CI (GitHub Actions)](#-ci-github-actions)

**Reference**
- [🖥️ Running plugins standalone](#-running-plugins-standalone) (full details)
- [🎬 Real usage walkthrough](docs/real-usage-walkthrough.md) (step-by-step guide and demo video)
- [E2E tests](docs/e2e/e2e-tests.md) (Playwright: how to run, artifacts, coverage)
- [🌐 Standalone demo deployment](#-standalone-demo-deployment)
- [🐳 Running with Docker](#-running-with-docker)
- [🔌 Compatibility with generic Backstage](#-compatibility-with-generic-backstage)
- [📋 Makefile reference](#-makefile-reference)
- [📚 API reference](#-api-reference)
- [📄 License](#-license)
- [📜 Backstage Plugin Directory](#-backstage-plugin-directory)
- [📦 NPM publishing](#-npm-publishing)

---

## 📜 Backstage Plugin Directory

HypoStage can be added to the [official Backstage Plugin Directory](https://backstage.io/plugins/). See [docs/backstage-directory/SUBMISSION.md](docs/backstage-directory/SUBMISSION.md) for the full submission checklist, including NPM publishing, the directory YAML file, and PR instructions. The plugin requires both the **frontend** and **backend** packages to be installed.

## 📦 NPM publishing

To publish a new version: (1) set `"version": "X.Y.Z"` (using [Semantic Versioning](https://semver.org/)) in both `hypo-stage/package.json` and `hypo-stage-backend/package.json`, (2) merge via PR (main is protected), (3) create a GitHub Release with tag `vX.Y.Z` from main. The [publish workflow](.github/workflows/publish-npm.yml) runs automatically and publishes both packages to NPM. See [docs/npm-publishing.md](docs/npm-publishing.md) for version guidelines, setup (NPM token), and release steps.

---

## 📖 What is HypoStage?

- **📝 Hypothesis management** — Create, edit, and track architectural hypotheses with detailed metadata
- **📊 Uncertainty assessment** — Evaluate uncertainty using Likert-scale ratings
- **🏷️ Quality attributes** — Associate hypotheses with performance, security, maintainability, etc.
- **📅 Technical planning** — Link technical planning items (experiments, spikes) to hypotheses
- **📈 Visualization** — Evolution and validation status via interactive charts
- **🔗 Catalog integration** — Link hypotheses to Backstage entities; optional Hypotheses tab on component pages

---

## 📁 Repository structure

Monorepo (Yarn workspaces):

| Path | Package / purpose | Description |
|------|-------------------|-------------|
| `hypo-stage/` | `@archhypo/plugin-hypo-stage` | Frontend: UI, pages, catalog tab, API client |
| `hypo-stage-backend/` | `@archhypo/plugin-hypo-stage-backend` | Backend: REST API, database, HypothesisService |
| `tsconfig.json` | — | Root TypeScript config (required for prepack / NPM publishing) |
| `e2e/` | — | Playwright E2E tests; see [End-to-end tests (Playwright)](#end-to-end-tests-playwright) and [E2E tests](docs/e2e/e2e-tests.md) |
| `e2e/e2e-videos/` | — | Per-test video output (from `yarn test:e2e`). Gitignored. |
| `docs/e2e/walkthrough-videos/` | — | Walkthrough clips for [Real usage walkthrough](docs/real-usage-walkthrough.md). After E2E: `node scripts/copy-walkthrough-videos.js` (WebM); then `yarn walkthrough:gif` (GIFs for GitHub; requires [ffmpeg](https://ffmpeg.org/)). Committed. |
| `e2e/e2e-report/` | — | HTML test report (generated by `yarn test:e2e`, gitignored) |

From the repo root: `yarn build`, `yarn test`, `yarn lint` run for both packages. See [Makefile reference](#makefile-reference) for convenience targets.

---

## ✅ Prerequisites

- **Node.js** v20 or later ([nvm](https://github.com/nvm-sh/nvm): `nvm install 20 && nvm use 20`)
- **Yarn**
- **PostgreSQL** (or SQLite) for the backend. For local dev you can use the repo’s [Docker Compose](#running-with-docker) Postgres.
- **Docker & Docker Compose** (optional, for Postgres)

### Troubleshooting install (node-gyp / better-sqlite3)

If `yarn install` or `make deps` fails building **better-sqlite3** or **cpu-features** with:

```text
ModuleNotFoundError: No module named 'distutils'
```

node-gyp is using a Python that no longer provides `distutils` (e.g. Python 3.12+). Fix it:

1. **Install setuptools** (recommended): `pip install setuptools` then run `yarn install --ignore-engines` again.
2. **Use Node.js 20+** so prebuilt binaries are used when possible: `nvm use 20`.
3. **Use Python 3.11 or earlier for node-gyp**: `npm config set python /path/to/python3.11`.

The **cpu-features** failure is optional; **better-sqlite3** is required only if you use SQLite for the backend.

---

## 🖥️ Run standalone (no Backstage app required)

Run the frontend and backend without a full Backstage app (good for development and trying the plugin). **Run every command from the repo root** unless stated otherwise. Follow the steps in this order:

1. **Start PostgreSQL**: `make start-dependencies` (or use your own Postgres; see [Running with Docker](#running-with-docker)).
2. **Config**: Copy `app-config.example.yaml` to `app-config.yaml`. The example includes `backend.cors` (so the frontend can call the API) and `backend.database.plugin.hypo-stage` (the plugin’s own database). Adjust the database connection if needed.
3. **Plugin database and seed (recommended)**: Run **`make seed-standalone`**. This creates the plugin database if needed (Postgres), runs migrations, and seeds example hypotheses, technical planning, and evolution data. If you skip this, the backend will run migrations and seed on first start when the hypothesis table is empty.
4. **Backend**: In a terminal, `cd hypo-stage-backend && yarn install && yarn start` (listens on http://localhost:7007). The dev server loads `app-config.yaml` from the repo root so CORS and the database are applied.
5. **Frontend**: In a **new** terminal, `cd hypo-stage && yarn install && yarn start` (http://localhost:3000).
6. **Open the app**: In your browser, go to **http://localhost:3000**. You’re signed in as a guest automatically.

On first backend start, migrations run and the database is seeded if empty ([demo seed data](#demo-seed-data-standalone)). For SQLite, frontend-only, or backend-only options, see [Running plugins standalone](#running-plugins-standalone).

---

## 🔌 Add to your existing Backstage app

1. Add the packages: `yarn --cwd packages/app add @archhypo/plugin-hypo-stage` and `yarn --cwd packages/backend add @archhypo/plugin-hypo-stage-backend` (or [copy from source](#step-0-add-the-plugin-packages) into `plugins/`).
2. Configure [frontend](#step-2-configure-the-frontend) (routes + sidebar) and [backend](#step-3-configure-the-backend) (register plugin + API).

Full step-by-step: [Installation](#installation).

---

## 📦 Installation

Use these steps to add HypoStage to an existing Backstage application (v1.16.0+).

### Step 0: Add the plugin packages

**Option A — From NPM** (when published):

```bash
yarn --cwd packages/app add @archhypo/plugin-hypo-stage
yarn --cwd packages/backend add @archhypo/plugin-hypo-stage-backend
```

**Option B — From source** (clone and copy into your app’s `plugins/` directory):

```bash
git clone https://github.com/ArchHypo/hypo-stage.git
cd hypo-stage
cp -r hypo-stage /path/to/your/backstage/plugins/
cp -r hypo-stage-backend /path/to/your/backstage/plugins/
```

### Step 1: Install the plugin packages (if using Option B)

From your Backstage app root, after copying the plugin directories (adjust paths if you use `apps/web` or `apps/backend`):

```bash
yarn --cwd packages/app add @archhypo/plugin-hypo-stage
yarn --cwd packages/backend add @archhypo/plugin-hypo-stage-backend
```

*If you used Option A (NPM), the packages are already installed; proceed to Step 2.*

### Step 2: Configure the frontend

**Routes** — In `packages/app/src/App.tsx`:

```tsx
import {
  HypoStagePage,
  CreateHypothesisPage,
  HypothesisPage,
  EditHypothesisPage,
} from '@archhypo/plugin-hypo-stage';

// Inside your <FlatRoutes>:
<Route path="/hypo-stage" element={<HypoStagePage />} />
<Route path="/hypo-stage/create-hypothesis" element={<CreateHypothesisPage />} />
<Route path="/hypo-stage/hypothesis/:hypothesisId" element={<HypothesisPage />} />
<Route path="/hypo-stage/hypothesis/:hypothesisId/edit" element={<EditHypothesisPage />} />
```

**Sidebar** — e.g. in `packages/app/src/components/Root/Root.tsx`:

```tsx
import LaptopMacIcon from '@material-ui/icons/LaptopMac';
<SidebarItem icon={LaptopMacIcon} to="hypo-stage" text="Hypo Stage" />
```

### Step 3: Configure the backend

**Register the backend plugin** — In `packages/backend/src/index.ts`:

```ts
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();
// ... other plugins ...
backend.add(import('@archhypo/plugin-hypo-stage-backend'));
backend.start();
```

**Register the frontend API** — In `packages/app/src/apis.ts`:

```ts
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { HypoStageApiClient, HypoStageApiRef } from '@archhypo/plugin-hypo-stage';

createApiFactory({
  api: HypoStageApiRef,
  deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
  factory: ({ discoveryApi, fetchApi }) =>
    new HypoStageApiClient({ discoveryApi, fetchApi }),
}),
```

---

## 🎯 Usage

- **Open the plugin**: Sidebar → “Hypo Stage” or go to `/hypo-stage`.
- **Create a hypothesis**: “Create New Hypothesis” → statement, context, uncertainty/impact, quality attributes, evidence URLs → save.
- **Manage**: View, edit, and track evolution from the list and detail pages. **Delete** a hypothesis from the list (row icon) or from the detail page; both require typing the hypothesis statement to confirm.
- **Technical planning**: On a hypothesis detail page, add, edit, and delete technical planning items (each with optional documentation URLs).

---

## 🎬 Real usage walkthrough

A **visual demonstration** of HypoStage’s capabilities (home and dashboard, create, view detail, edit, technical planning, delete, catalog tab) is in **[Real usage walkthrough](docs/real-usage-walkthrough.md)**. That page has one short video per capability, recorded by the E2E suite, and links each to the corresponding E2E spec.

**Refreshing the walkthrough clips:** Run the E2E suite, then copy WebM clips with `node scripts/copy-walkthrough-videos.js` (or use `yarn test:e2e:walkthrough` to run E2E and copy in one go). To generate **animated GIFs** so the clips play inline on GitHub, run **`yarn walkthrough:gif`** (requires [ffmpeg](https://ffmpeg.org/) on your PATH). See [E2E tests → Test artifacts](docs/e2e/e2e-tests.md#test-artifacts) for details.

---

## 🔨 Building the project

```bash
yarn install --ignore-engines
yarn build
```

Or: `make deps && make build`.

The build emits `dist/` (and `dist-types/`) in each package. No separate Backstage app is required; the repo is self-contained.

---

## 🧪 Running tests

```bash
yarn test
```

Or: `make test` (runs once, no watch prompt). Frontend: Jest for components, hooks, API, utils. Backend: Jest for router and HypothesisService.

### End-to-end tests (Playwright)

E2E tests run in a real browser against the running app and cover the [Real usage walkthrough](#real-usage-walkthrough) and all main capabilities (home and dashboard, create, view, edit, delete hypotheses, technical planning). For **how to run them** (full suite, single test, single test with visible browser, or by file), prerequisites, test artifacts, and the list of scenario-based test files, see **[E2E tests](docs/e2e/e2e-tests.md)**. A **weekly GitHub Actions workflow** runs the full E2E suite against the [deployed demo](https://hypo-stage-hypo-stage.vercel.app/hypo-stage) (see [Scheduled E2E](docs/e2e/e2e-tests.md#scheduled-e2e-github-actions)).

---

## ✨ Code style (lint)

```bash
yarn lint
```

Or: `make lint`. This runs lint for both workspace packages (frontend and backend) and for the root **`e2e/`** (Playwright specs) and **`scripts/`** (Node scripts). Warnings about frontend importing from the backend package are acceptable for this plugin’s shared types.

---

## ✔️ Validating usage

To confirm everything works:

1. **Build, test, and lint**: From the repo root (Node 20+ recommended), run `make deps` then **`make check`** (runs build, unit tests, and lint in one go, non-interactively; **E2E tests are not run**—they are expensive and run separately via `yarn test:e2e`). Or run `make build && make test && make lint`. From each package you can run `yarn build`, `yarn test`, `yarn lint`.
2. **Standalone**: Follow [Run standalone](#run-standalone-no-backstage-app-required) (including **`make seed-standalone`** for full demo data), then open http://localhost:3000.
3. **In an app**: [Install](#installation) into a Backstage app and open `/hypo-stage`.
4. **Docker**: [Running with Docker](#running-with-docker) for Postgres.

---

## 🔄 CI (GitHub Actions)

On pull requests and pushes to `main`/`master`, the workflow runs the same validation as [Validating usage](#validating-usage): **install** (frozen lockfile), **build** (type-check + Backstage CLI build for both packages), **lint**, and **test**. A PostgreSQL 16 service container is available for backend tests. Configuration: [.github/workflows/ci.yml](.github/workflows/ci.yml).

---

## 🖥️ Running plugins standalone

Detailed options for running the plugins without a full Backstage app.

### Running the frontend plugin standalone

```bash
cd hypo-stage
yarn install
yarn start
```

- Dev server at http://localhost:3000, using `dev/index.tsx` and the HypoStage API client.
- The frontend needs the backend at http://localhost:7007 for API calls.
- Sign-in uses **Standalone guest** (automatic; no auth backend).

### Running the backend plugin standalone

1. **PostgreSQL**: `make start-dependencies` or your own instance.
2. **Config**: Create `app-config.yaml` in the repo root (e.g. `cp app-config.example.yaml app-config.yaml`). The HypoStage plugin uses **its own database** (see `backend.database.plugin.hypo-stage`); migrations and seed run against that database. Minimal:

   ```yaml
   backend:
     baseUrl: http://localhost:7007
     listen:
       port: 7007
     database:
       client: pg
       connection:
         host: localhost
         port: 5432
         user: postgres
         password: postgres
         database: backstage
       plugin:
         hypo-stage:
           connection:
             database: backstage_plugin_hypo_stage
   ```

   For SQLite: `client: better-sqlite3`, `connection: ':memory:'`.
3. **Start**: `cd hypo-stage-backend && yarn install && yarn start` (http://localhost:7007).
4. **Demo seeds**: On first start, migrations seed the database with example hypotheses (see [Demo seed data](#demo-seed-data-standalone) below).

### Demo seed data (standalone)

The HypoStage plugin has **its own database** (e.g. `backstage_plugin_hypo_stage` via `backend.database.plugin.hypo-stage`). Migrations create the plugin’s tables there, and the **seed creates hypothesis data in that plugin database** so you can try the UI without creating data yourself.

**Seed runs transparently**: When you start the backend, migrations run automatically and the seed migration fills the plugin database if it’s empty (idempotent). You don’t need to run `yarn seed` unless you want to reseed or populate the DB without starting the backend.

**Command to populate the plugin database with seed**

From the repo root, with `app-config.yaml` in place and Postgres running if using pg:

- **Recommended (one command)**: **`make seed-standalone`** — creates the plugin database if needed (when using Docker Postgres), then runs migrations and the demo seed. Use this to get example hypotheses, technical planning, and evolution data for the “Evolução da Incerteza e Impacto” chart.
- **Alternative**: `cd hypo-stage-backend && yarn seed` — same effect; use if you prefer not to use the Makefile.

When you run the backend standalone, the plugin database is filled with **example hypotheses**:

- **When it runs**: A migration runs on every backend start; it inserts seed hypotheses only when the `hypothesis` table is empty (idempotent). If the table already has rows, the seed backfills evolution events and technical planning for the payment and inventory hypotheses so the “Evolução da Incerteza e Impacto” chart and technical planning list have example data.
- **What you get**: Several hypotheses (e.g. payment service extraction, user API consolidation, API gateway) with varied uncertainty/impact; the payment and inventory hypotheses include technical planning items and multiple evolution points for the chart.

**How to run migrations with seed data**

1. **Automatic**: Migrations (including the seed) run when the backend starts. Start the backend (and frontend) as in [Run standalone](#run-standalone-no-backstage-app-required). No extra step needed.
2. **Manual**: From the repo root, with `app-config.yaml` present and the database reachable (e.g. Postgres via `make start-dependencies`, or SQLite), run **`make seed-standalone`** or `cd hypo-stage-backend && yarn seed`. This runs all pending migrations, then the demo seed migration (idempotent). To use a different config file: `BACKSTAGE_CONFIG_PATH=/path/to/app-config.yaml cd hypo-stage-backend && yarn seed`.

**Requirements for manual seed**: `app-config.yaml` at repo root (or path in `BACKSTAGE_CONFIG_PATH`) with `backend.database` (and optionally `backend.database.plugin.hypo-stage`) set. For Postgres, start it first with `make start-dependencies`.

If the seed fails with **`database "backstage_plugin_hypo_stage" does not exist`** (or the name in your plugin config), the plugin database was never created. The seed script will try to create it on the server in `app-config.yaml`; if it still fails, you may have **two different Postgres** (e.g. Docker + local on port 5432).

- **Only Docker Postgres**: run **`make seed-standalone`** (creates the plugin DB and runs the seed) or `make create-db` then `cd hypo-stage-backend && yarn seed`.
- **Local Postgres** (or seed still fails): create the plugin database on the server your app uses: `psql -h localhost -p 5432 -U postgres -c 'CREATE DATABASE backstage_plugin_hypo_stage;'` then run **`make seed-standalone`** or `cd hypo-stage-backend && yarn seed` again. To see what is on 5432: `lsof -i :5432` (macOS/Linux).

### Running both together

Use the same sequence as [Run standalone](#run-standalone-no-backstage-app-required):

1. **Terminal 1** (from repo root): `make start-dependencies`
2. **Terminal 2** (from repo root): ensure `app-config.yaml` exists (e.g. `cp app-config.example.yaml app-config.yaml`), then run **`make seed-standalone`** (recommended), then `cd hypo-stage-backend && yarn start`
3. **Terminal 3** (from repo root): `cd hypo-stage && yarn start`

Open http://localhost:3000. Routes use `hypothesisId` (e.g. `/hypo-stage/hypothesis/:hypothesisId`).

**If you see "Failed to fetch" or CORS errors** (e.g. "No 'Access-Control-Allow-Origin' header") when the frontend calls the backend, the backend must load `app-config.yaml` so `backend.cors` is applied. The `yarn start` script in `hypo-stage-backend` runs `scripts/ensure-config-path.js`, which sets `BACKSTAGE_CONFIG_PATH` to `app-config.yaml` (repo root or current dir) before starting the backend so CORS is applied. Ensure `app-config.yaml` exists in the repo root (or in `hypo-stage-backend`) and contains the `backend.cors` block (see `app-config.example.yaml`). If problems persist, set it explicitly: `BACKSTAGE_CONFIG_PATH=/absolute/path/to/app-config.yaml cd hypo-stage-backend && yarn start`.

---

## 🌐 Standalone demo deployment

The live demo at [https://hypo-stage-hypo-stage.vercel.app](https://hypo-stage-hypo-stage.vercel.app) is a **standalone deployment** (frontend on Vercel, backend on Render) for developers who want to see the plugin in action. **It is not for production use**—just an alternative way to explore the UI and API.

For how we set it up and the rationale, see [docs/standalone-demo-deployment.md](docs/standalone-demo-deployment.md).

---

## 🐳 Running with Docker

**Postgres only** (for [Run standalone](#run-standalone-no-backstage-app-required) or your own Backstage app):

```bash
make start-dependencies
# or: docker-compose up -d
```

Use the plugin in a Backstage app: copy `hypo-stage` and `hypo-stage-backend` into your app’s `plugins/`, then [Installation](#installation). Point the app’s `app-config.yaml` at this Postgres and configure the plugin’s database (e.g. `backend.database.connection` and `backend.database.plugin.hypo-stage.connection.database: backstage_plugin_hypo_stage`). If you run the frontend separately (e.g. for standalone dev), ensure `backend.cors` in `app-config.yaml` allows the frontend origin (see `app-config.example.yaml`).

**Stop**:

```bash
make stop-dependencies
# or: docker-compose down --volumes
```


---

## 🔌 Compatibility with generic Backstage

- **Feature flags**: If the Feature Flags API is not registered, the Hypotheses tab is visible by default. To control it, register `HYPO_STAGE_FEATURE_FLAG` (`'hypo-stage'`).
- **Catalog `spec.team`**: Team filter uses `spec.team` on components; if unused, the filter is empty; rest of the plugin works.
- **Entity refs / teams API**: If backend entity-ref or teams endpoints fail, filter lists are empty; list and dashboard still work.

No organization-specific code is required.

---

## 📋 Makefile reference

| Target | Description |
|--------|-------------|
| `make help` | Show targets and descriptions |
| `make deps` | Install dependencies |
| `make build` | Build both plugins |
| `make test` | Run unit tests (frontend + backend; E2E tests are not run) |
| `make lint` | Run lint (workspaces + root `e2e/` and `scripts/`) |
| `make check` | Build, unit test, and lint in one go (no E2E) |
| `make start-dependencies` | Start PostgreSQL (Docker) |
| `make create-db` | Create HypoStage plugin database `backstage_plugin_hypo_stage` (if missing) |
| `make seed-standalone` | Create plugin DB (if needed) and run migrations + seed (one command) |
| `make stop-dependencies` | Stop PostgreSQL and remove volumes |

---

## 📚 API reference

**Frontend:** `HypoStagePage`, `CreateHypothesisPage`, `HypothesisPage`, `EditHypothesisPage`; `HypothesisForm`, `HypothesisList`; `EntityHypothesesTab`, `useHypoStageTabEnabled`, `HYPO_STAGE_FEATURE_FLAG`; `HypoStageApiRef`, `HypoStageApiClient`.

**Backend:** `HypothesisService`; REST under `/hypotheses` and `/technical_plannings`; migrations in `hypo-stage-backend/migrations/`.

---

## 📄 License

LGPL-3.0. See [LICENSE](https://github.com/ArchHypo/hypo-stage/blob/main/LICENSE).
