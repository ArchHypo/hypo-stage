# HypoStage

HypoStage integrates architectural hypothesis management into your Backstage environment, enabling teams to document, track, and validate architectural decisions effectively. This plugin provides a comprehensive framework for managing architectural hypotheses with uncertainty assessment, quality attributes tracking, and technical planning capabilities.

---

## Quick start

Choose how you want to run HypoStage:

| Goal | Path | Section |
|------|------|---------|
| **Try it without a Backstage app** | Run frontend + backend standalone (3 terminals) | [Run standalone](#option-a-run-standalone-no-backstage-app) |
| **Add to an existing Backstage app** | Install packages and configure frontend & backend | [Installation](#installation) |

**Run standalone (fastest way to see the UI):**

```bash
# Terminal 1 – start PostgreSQL
make start-dependencies

# Terminal 2 – backend (from repo root: copy app-config first)
cp app-config.example.yaml app-config.yaml   # edit if needed
cd hypo-stage-backend && yarn install && yarn start

# Terminal 3 – frontend
cd hypo-stage && yarn install && yarn start
```

Then open **http://localhost:3000** and use the Hypo Stage UI (you’re signed in as a guest automatically). See [Running plugins standalone](#running-plugins-standalone) for details and alternatives (e.g. SQLite, frontend-only).

---

## Table of contents

**Get started**
- [What is HypoStage?](#what-is-hypostage)
- [Repository structure](#repository-structure)
- [Prerequisites](#prerequisites)
- [Option A: Run standalone](#option-a-run-standalone-no-backstage-app)
- [Option B: Add to a Backstage app](#option-b-add-to-a-backstage-app)

**Install & use**
- [Installation](#installation) (step-by-step for Backstage)
- [Usage](#usage)
- [Real usage walkthrough](#real-usage-walkthrough)

**Develop & validate**
- [Building the project](#building-the-project)
- [Running tests](#running-tests)
- [Code style (lint)](#code-style-lint)
- [Validating usage](#validating-usage)
- [CI (GitHub Actions)](#ci-github-actions)

**Reference**
- [Running plugins standalone](#running-plugins-standalone) (full details)
- [Running with Docker](#running-with-docker)
- [Compatibility with generic Backstage](#compatibility-with-generic-backstage)
- [Makefile reference](#makefile-reference)
- [API reference](#api-reference)
- [License](#license)

---

## What is HypoStage?

- **Hypothesis management** — Create, edit, and track architectural hypotheses with detailed metadata
- **Uncertainty assessment** — Evaluate uncertainty using Likert-scale ratings
- **Quality attributes** — Associate hypotheses with performance, security, maintainability, etc.
- **Technical planning** — Link technical planning items (experiments, spikes) to hypotheses
- **Visualization** — Evolution and validation status via interactive charts
- **Catalog integration** — Link hypotheses to Backstage entities; optional Hypotheses tab on component pages

---

## Repository structure

Monorepo (Yarn workspaces):

| Path | Package | Description |
|------|---------|-------------|
| `hypo-stage/` | `@internal/plugin-hypo-stage` | Frontend: UI, pages, catalog tab, API client |
| `hypo-stage-backend/` | `@internal/plugin-hypo-stage-backend` | Backend: REST API, database, HypothesisService |

From the repo root: `yarn build`, `yarn test`, `yarn lint` run for both packages. See [Makefile reference](#makefile-reference) for convenience targets.

---

## Prerequisites

- **Node.js** v20 or later ([nvm](https://github.com/nvm-sh/nvm): `nvm install 20 && nvm use 20`)
- **Yarn**
- **PostgreSQL** (or SQLite) for the backend. For local dev you can use the repo’s [Docker Compose](#running-with-docker) Postgres.
- **Docker & Docker Compose** (optional, for Postgres and/or a full Backstage app)

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

## Option A: Run standalone (no Backstage app)

Run the frontend and backend without a full Backstage app (good for development and trying the plugin).

1. **Start PostgreSQL**: `make start-dependencies`
2. **Config**: Copy `app-config.example.yaml` to `app-config.yaml` in the repo root; adjust database connection if needed.
3. **Backend**: `cd hypo-stage-backend && yarn install && yarn start` (listens on http://localhost:7007)
4. **Frontend**: `cd hypo-stage && yarn install && yarn start` (http://localhost:3000)

You’re signed in as a guest automatically. Full details (SQLite, frontend-only, backend-only): [Running plugins standalone](#running-plugins-standalone).

---

## Option B: Add to a Backstage app

1. Clone this repo and copy `hypo-stage` and `hypo-stage-backend` into your app’s `plugins/` directory.
2. Add the packages: `yarn --cwd packages/app add @internal/plugin-hypo-stage` and `yarn --cwd packages/backend add @internal/plugin-hypo-stage-backend`.
3. Configure [frontend](#step-2-configure-the-frontend) (routes + sidebar) and [backend](#step-3-configure-the-backend) (register plugin + API).

Full step-by-step: [Installation](#installation).

---

## Installation

Use these steps to add HypoStage to an existing Backstage application (v1.16.0+).

### Step 0: Clone and copy plugin directories

```bash
git clone https://github.com/ArchHypo/hypo-stage.git
cd hypo-stage

cp -r hypo-stage /path/to/your/backstage/plugins/
cp -r hypo-stage-backend /path/to/your/backstage/plugins/
```

### Step 1: Install the plugin packages

From your Backstage app root (adjust paths if you use `apps/web` or `apps/backend`):

```bash
yarn --cwd packages/app add @internal/plugin-hypo-stage
yarn --cwd packages/backend add @internal/plugin-hypo-stage-backend
```

### Step 2: Configure the frontend

**Routes** — In `packages/app/src/App.tsx`:

```tsx
import {
  HypoStagePage,
  CreateHypothesisPage,
  HypothesisPage,
  EditHypothesisPage,
} from '@internal/plugin-hypo-stage';

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
backend.add(import('@internal/plugin-hypo-stage-backend'));
backend.start();
```

**Register the frontend API** — In `packages/app/src/apis.ts`:

```ts
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { HypoStageApiClient, HypoStageApiRef } from '@internal/plugin-hypo-stage';

createApiFactory({
  api: HypoStageApiRef,
  deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
  factory: ({ discoveryApi, fetchApi }) =>
    new HypoStageApiClient({ discoveryApi, fetchApi }),
}),
```

---

## Usage

- **Open the plugin**: Sidebar → “Hypo Stage” or go to `/hypo-stage`.
- **Create a hypothesis**: “Create New Hypothesis” → statement, context, uncertainty/impact, quality attributes, evidence URLs → save.
- **Manage**: View, edit, and track evolution from the list and detail pages.
- **Technical planning**: On a hypothesis detail page, add and manage technical planning items.

---

## Real usage walkthrough

After [installing](#installation), start your Backstage app and open **Hypo Stage** (sidebar or `/hypo-stage`).

![HypoStage – real usage demo](docs/images/usage.gif)  
*Add `docs/images/usage.gif` for a short recording of the plugin in action.*

### 1. Home page: list and dashboard

- **See**: “Welcome to Hypo Stage!”, Create New Hypothesis, dashboard (totals, focus, uncertainty/impact), filters (Team, Component, Focus), hypothesis list.
- **Do**: Filter by team/component/focus; click a row to open the hypothesis detail page.

### 2. Create a new hypothesis

- **Go to**: Create New Hypothesis or `/hypo-stage/create-hypothesis`.
- **Fill**: Entity References (required), Hypothesis Statement, Source Type, Uncertainty, Impact, Quality Attributes, Related Artefacts (URLs), Notes.
- **Submit**: Create Hypothesis → redirect to list; open the new hypothesis to add technical planning or edit.

### 3. View hypothesis detail

- **Go to**: Click a row or `/hypo-stage/hypothesis/:hypothesisId`.
- **See**: Statement, status, uncertainty/impact, linked components, quality attributes, related artefacts, evolution chart, technical planning list.
- **Do**: Edit, add/edit technical planning items, or delete (with confirmation).

### 4. Edit a hypothesis

- **Go to**: Edit on detail page or `/hypo-stage/hypothesis/:hypothesisId/edit`.
- **Change**: Status, Source Type, Uncertainty, Impact, Quality Attributes, Related Artefacts, Notes (statement and entity refs are read-only).
- **Submit**: Update Hypothesis → detail page and evolution chart update.

### 5. Add technical planning items

- On a hypothesis detail page, use the add control in Technical planning. Fill Action type, Expected outcome, Target date, optional Documentations (URLs). Edit or delete from the same page.

### 6. Hypotheses tab on a catalog entity

- On a **Component** entity page, if the Hypo Stage tab is added (and feature flag `hypo-stage` is on when used): **Hypotheses** tab lists hypotheses that reference that component.

---

## Building the project

```bash
yarn install --ignore-engines
yarn build
```

Or: `make deps && make build`.

The build emits `dist/` (and `dist-types/`) in each package. No separate Backstage app is required; the repo is self-contained.

---

## Running tests

```bash
yarn test
```

Or: `make test` (runs once, no watch prompt). Frontend: Jest for components, hooks, API, utils. Backend: Jest for router and HypothesisService.

---

## Code style (lint)

```bash
yarn lint
```

Or: `make lint`. Warnings about frontend importing from the backend package are acceptable for this plugin’s shared types.

---

## Validating usage

To confirm everything works:

1. **Build, test, and lint**: From the repo root (Node 20+ recommended), run `make deps` then **`make check`** (runs build, test, and lint in one go, non-interactively). Or run `make build && make test && make lint`. From each package you can run `yarn build`, `yarn test`, `yarn lint`.
2. **Standalone**: [Run standalone](#option-a-run-standalone-no-backstage-app), then open http://localhost:3000.
3. **In an app**: [Install](#installation) into a Backstage app and open `/hypo-stage`.
4. **Docker**: [Running with Docker](#running-with-docker) for Postgres and optional full app.

---

## CI (GitHub Actions)

On pull requests and pushes to `main`/`master`, the workflow runs the same validation as [Validating usage](#validating-usage): **install** (frozen lockfile), **build** (type-check + Backstage CLI build for both packages), **lint**, and **test**. A PostgreSQL 16 service container is available for backend tests. Configuration: [.github/workflows/ci.yml](.github/workflows/ci.yml).

---

## Running plugins standalone

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
2. **Config**: Create `app-config.yaml` in the repo root (e.g. `cp app-config.example.yaml app-config.yaml`). Minimal:

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
   ```

   For SQLite: `client: better-sqlite3`, `connection: ':memory:'`.
3. **Start**: `cd hypo-stage-backend && yarn install && yarn start` (http://localhost:7007).

### Running both together

1. Terminal 1: `make start-dependencies`
2. Terminal 2: `cd hypo-stage-backend` (ensure `app-config.yaml` in repo root), then `yarn start`
3. Terminal 3: `cd hypo-stage && yarn start`

Open http://localhost:3000. Routes use `hypothesisId` (e.g. `/hypo-stage/hypothesis/:hypothesisId`).

---

## Running with Docker

**Start PostgreSQL** (for HypoStage backend or a Backstage app):

```bash
make start-dependencies
# or: docker-compose up -d
```

Use the plugin in a Backstage app: copy `hypo-stage` and `hypo-stage-backend` into your app’s `plugins/`, then [Installation](#installation). Point the app’s `app-config.yaml` at this Postgres (e.g. `host: localhost`, `port: 5432`, `user: postgres`, `password: postgres`, `database: backstage`).

**Stop**:

```bash
make stop-dependencies
# or: docker-compose down --volumes
```

---

## Compatibility with generic Backstage

- **Feature flags**: If the Feature Flags API is not registered, the Hypotheses tab is visible by default. To control it, register `HYPO_STAGE_FEATURE_FLAG` (`'hypo-stage'`).
- **Catalog `spec.team`**: Team filter uses `spec.team` on components; if unused, the filter is empty; rest of the plugin works.
- **Entity refs / teams API**: If backend entity-ref or teams endpoints fail, filter lists are empty; list and dashboard still work.

No organization-specific code is required.

---

## Makefile reference

| Target | Description |
|--------|-------------|
| `make help` | Show targets and descriptions |
| `make deps` | Install dependencies |
| `make build` | Build both plugins |
| `make test` | Run all tests (once, non-interactive) |
| `make lint` | Run lint |
| `make check` | Build, test, and lint in one go |
| `make start-dependencies` | Start PostgreSQL (Docker) |
| `make stop-dependencies` | Stop PostgreSQL and remove volumes |

---

## API reference

**Frontend:** `HypoStagePage`, `CreateHypothesisPage`, `HypothesisPage`, `EditHypothesisPage`; `HypothesisForm`, `HypothesisList`; `EntityHypothesesTab`, `useHypoStageTabEnabled`, `HYPO_STAGE_FEATURE_FLAG`; `HypoStageApiRef`, `HypoStageApiClient`.

**Backend:** `HypothesisService`; REST under `/hypotheses` and `/technical_plannings`; migrations in `hypo-stage-backend/migrations/`.

---

## License

LGPL-3.0. See [LICENSE](https://github.com/ArchHypo/hypo-stage/blob/main/LICENSE).
