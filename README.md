# HypoStage

HypoStage integrates architectural hypothesis management into your Backstage environment, enabling teams to document, track, and validate architectural decisions effectively. This plugin provides a comprehensive framework for managing architectural hypotheses with uncertainty assessment, quality attributes tracking, and technical planning capabilities.

## Table of contents

- [Repository structure](#repository-structure)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Building the project](#building-the-project)
- [Running tests](#running-tests)
- [Code style (lint)](#code-style-lint)
- [CI (GitHub Actions)](#ci-github-actions)
- [Validating usage](#validating-usage)
- [Running with Docker](#running-with-docker)
  - [1. Start dependencies (PostgreSQL)](#1-start-dependencies-postgresql)
  - [2. Use the plugin in a Backstage app](#2-use-the-plugin-in-a-backstage-app)
  - [3. Stop dependencies](#3-stop-dependencies)
- [Installation](#installation)
  - [Step 0: Clone and copy plugin directories](#step-0-clone-and-copy-plugin-directories)
  - [Step 1: Install the plugin packages](#step-1-install-the-plugin-packages)
  - [Step 2: Configure the frontend](#step-2-configure-the-frontend)
  - [Step 3: Configure the backend](#step-3-configure-the-backend)
- [Usage](#usage)
- [Real usage walkthrough](#real-usage-walkthrough)
  - [1. Home page: list and dashboard](#1-home-page-list-and-dashboard)
  - [2. Create a new hypothesis](#2-create-a-new-hypothesis)
  - [3. View hypothesis detail](#3-view-hypothesis-detail)
  - [4. Edit a hypothesis](#4-edit-a-hypothesis)
  - [5. Add technical planning items](#5-add-technical-planning-items)
  - [6. Hypotheses tab on a catalog entity](#6-hypotheses-tab-on-a-catalog-entity)
- [Compatibility with generic Backstage](#compatibility-with-generic-backstage)
- [Makefile reference](#makefile-reference)
- [API reference](#api-reference)
  - [Frontend](#frontend)
  - [Backend](#backend)
- [License](#license)

---

## Repository structure

This repository is a **monorepo** (Yarn workspaces):

| Path | Package | Description |
|------|---------|-------------|
| `hypo-stage/` | `@internal/plugin-hypo-stage` | Frontend plugin: UI, pages, catalog tab, API client |
| `hypo-stage-backend/` | `@internal/plugin-hypo-stage-backend` | Backend plugin: REST API, database, HypothesisService |

Root `package.json` scripts (`yarn build`, `yarn test`, `yarn lint`) run across both packages. Use the root for building, testing, and linting; use the [Makefile](#makefile-reference) for convenience targets.

---

## Features

- **Hypothesis Management**: Create, edit, and track architectural hypotheses with detailed metadata
- **Uncertainty Assessment**: Evaluate hypothesis uncertainty using Likert scale ratings
- **Quality Attributes Tracking**: Associate hypotheses with specific quality attributes (performance, security, maintainability, etc.)
- **Technical Planning**: Create and manage technical planning items linked to hypotheses
- **Visualization**: Track hypothesis evolution and validation status through interactive charts
- **Integration**: Seamlessly integrates with Backstage's catalog and entity system
- **Status Tracking**: Monitor hypothesis lifecycle from creation to validation

---

## Prerequisites

- **Node.js** v20 or later ([nvm](https://github.com/nvm-sh/nvm) recommended: `nvm install 20 && nvm use 20`)
- **Yarn** package manager
- **PostgreSQL** (or SQLite) for the backend — when integrating into a Backstage app, the backend must have a database configured. For local development you can use the repo’s [Docker Compose](#running-with-docker) Postgres.
- **Docker & Docker Compose** (optional, for running a local Postgres and/or a generic Backstage instance)

---

## Building the project

Build the plugin packages (generates declaration files and bundle output):

```bash
# Install dependencies first (required for build)
yarn install --ignore-engines

# Build both frontend and backend plugins
yarn build
```

Or use the Makefile:

```bash
make deps    # install dependencies
make build   # run full build
```

The build step:

1. Emits TypeScript declaration files into `dist-types/` (gitignored)
2. Runs the Backstage CLI build for `hypo-stage` and `hypo-stage-backend`, producing `dist/` in each package

No separate Backstage app is required; this repo is self-contained.

---

## Running tests

Run the full test suite for both plugins:

```bash
yarn test
```

Or:

```bash
make test
```

- **Frontend**: Jest tests for components, hooks, API client, and utilities
- **Backend**: Jest tests for router and HypothesisService

---

## Code style (lint)

Check code style and lint rules:

```bash
yarn lint
```

Or:

```bash
make lint
```

Lint runs the Backstage CLI linter in both `hypo-stage` and `hypo-stage-backend`. You may see warnings about frontend importing types from the backend package; these are acceptable for this plugin’s shared types.

---

## CI (GitHub Actions)

On every **pull request** and **push** to `main` or `master`, GitHub Actions runs a single job:

1. **Install** — `yarn install --ignore-engines --frozen-lockfile`
2. **Type-check** — `yarn build:types` (TypeScript for both packages)
3. **Build** — `yarn workspaces run build` (Backstage CLI build)
4. **Lint** — `yarn lint`
5. **Test** — `yarn test`

A **PostgreSQL 16** service container is started so backend tests can run against a real database. The workflow uses `concurrency` to cancel in-flight runs when a new push is made to the same branch.

Configuration: [.github/workflows/ci.yml](.github/workflows/ci.yml).

---

## Validating usage

To confirm the plugin works end-to-end:

1. **Build and test** (recommended before integrating):

   ```bash
   make deps build test lint
   ```

2. **Install into a Backstage app**: Follow [Installation](#installation) below and add the plugin to an existing Backstage application, then run that app and open `/hypo-stage`.

3. **Run with a generic Backstage instance using Docker**: Use the provided Docker setup to run dependencies and optionally a Backstage app that includes the plugin. See [Running with Docker](#running-with-docker) below.

---

## Running with Docker

You can run a generic Backstage application with HypoStage using Docker for validation or local development.

### 1. Start dependencies (PostgreSQL)

The HypoStage backend uses PostgreSQL. Start it with:

```bash
make start-dependencies
```

Or directly:

```bash
docker-compose up -d
```

This starts a PostgreSQL container (port `5432`) that any Backstage app can use for the HypoStage backend. If port 5432 is already in use (e.g. another PostgreSQL), stop that service or change the port in `docker-compose.yaml`.

### 2. Use the plugin in a Backstage app

- **Option A – Existing Backstage app**: Copy the `hypo-stage` and `hypo-stage-backend` directories into your app’s `plugins/` folder, install and configure as in [Installation](#installation). Point the app’s backend to this PostgreSQL in `app-config.yaml` (e.g. `backend.database.client: pg` and connection with `host: localhost`, `port: 5432`, `user: postgres`, `password: postgres`, `database: backstage`).

- **Option B – New app**: Create a new Backstage app with `npx @backstage/create-app@latest`, then add the plugin as in [Installation](#installation). Run the app with `yarn dev` and ensure the backend config uses the PostgreSQL instance started in step 1.

### 3. Stop dependencies

```bash
make stop-dependencies
```

Or:

```bash
docker-compose down --volumes
```

---

## Installation

Use these steps to add HypoStage to an existing Backstage application (v1.16.0 or later).

### Step 0: Clone and copy plugin directories

Clone this repository and copy both plugin directories into your Backstage project:

```bash
git clone https://github.com/ArchHypo/hypo-stage.git
cd hypo-stage

# From the hypo-stage repo root, copy into your Backstage app (adjust path as needed)
cp -r hypo-stage /path/to/your/backstage/plugins/
cp -r hypo-stage-backend /path/to/your/backstage/plugins/
```

### Step 1: Install the plugin packages

From your Backstage application root (adjust `packages/app` and `packages/backend` if your app uses different paths, e.g. `apps/web` or `apps/backend`):

```bash
# Frontend plugin
yarn --cwd packages/app add @internal/plugin-hypo-stage

# Backend plugin
yarn --cwd packages/backend add @internal/plugin-hypo-stage-backend
```

### Step 2: Configure the frontend

**2.1 Routes** – In `packages/app/src/App.tsx`:

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

**2.2 Sidebar** – In your root component (e.g. `packages/app/src/components/Root/Root.tsx`):

```tsx
import LaptopMacIcon from '@material-ui/icons/LaptopMac';

<SidebarItem icon={LaptopMacIcon} to="hypo-stage" text="Hypo Stage" />
```

### Step 3: Configure the backend

**3.1 Register the backend plugin** – In `packages/backend/src/index.ts`:

```ts
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();

// ... other plugins ...
backend.add(import('@internal/plugin-hypo-stage-backend'));

backend.start();
```

**3.2 Register the frontend API** – In `packages/app/src/apis.ts`:

```ts
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { HypoStageApiClient, HypoStageApiRef } from '@internal/plugin-hypo-stage';

// Add to your API factory array:
createApiFactory({
  api: HypoStageApiRef,
  deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
  factory: ({ discoveryApi, fetchApi }) =>
    new HypoStageApiClient({ discoveryApi, fetchApi }),
}),
```

---

## Usage

- **Open the plugin**: In the sidebar, click “Hypo Stage” or go to `/hypo-stage`.
- **Create a hypothesis**: Use “Create New Hypothesis”, fill statement, context, uncertainty/impact, quality attributes, and evidence URLs, then save.
- **Manage hypotheses**: View, edit, and track evolution from the list and detail pages.
- **Technical planning**: On a hypothesis detail page, add and manage technical planning items.

---

## Real usage walkthrough

The following flows describe how to use HypoStage end-to-end in a Backstage instance. After [installing the plugin](#installation), start your Backstage app and open **Hypo Stage** from the sidebar or go to `/hypo-stage`.

You can add a **single GIF** that demonstrates real usage (e.g. navigating the plugin, creating a hypothesis, viewing detail). Place it at `docs/images/usage.gif`; the placeholder below will display it.

![HypoStage – real usage demo](docs/images/usage.gif)

*Add `docs/images/usage.gif` to show a recording of the plugin in action.*

---

### 1. Home page: list and dashboard

- **What you see**: A “Welcome to Hypo Stage!” header, a **Create New Hypothesis** button, then a **dashboard** (Overview with Total / Validated / Open / Created (30d), “Where to focus” with Need attention / Can postpone, and Uncertainty & Impact distribution), followed by filter dropdowns (Team, Component, Focus) and the **hypothesis list** (statement, status, uncertainty, impact, dates).
- **What you can do**: Use the **Team** or **Component** filters if your catalog has `spec.team` or hypotheses linked to components. Use **Focus** to show “Need attention”, “Can postpone”, or “No tag”. Click a row to open the hypothesis detail page.

### 2. Create a new hypothesis

- **Go to**: Click **Create New Hypothesis** (or `/hypo-stage/create-hypothesis`).
- **Fill in** (example):
  - **Entity References**: Search and select one or more catalog components (e.g. `component:default/my-service`). At least one is required.
  - **Hypothesis Statement** (required, up to 500 chars): e.g. *“The new auth library supports our SSO protocol and will not increase latency above 50ms.”*
  - **Source Type**: e.g. Requirements, Solution, Quality Attribute, or Other.
  - **Uncertainty** (Likert 1–5): e.g. High — how uncertain you are about the hypothesis.
  - **Impact** (Likert 1–5): e.g. High — impact if the hypothesis is wrong.
  - **Quality Attributes**: e.g. Performance, Security, Maintainability.
  - **Related Artefacts (URLs)**: Optional links (e.g. ADR or design doc).
  - **Notes**: Optional free text.
- **Submit**: Click **Create Hypothesis**. You are redirected to the home page and the new hypothesis appears in the list; you can open it to add technical planning or edit later.

### 3. View hypothesis detail

- **Go to**: From the home list, click a hypothesis row (or open `/hypo-stage/hypothesis/:id`).
- **What you see**:
  - **Header**: Statement, status (Open / In Review / Validated / etc.), uncertainty and impact chips, created/updated dates.
  - **Linked components**: Entity refs as links to the catalog (if any).
  - **Quality attributes** and **Related artefacts** cards.
  - **Evolution chart**: Status and rating changes over time.
  - **Technical planning** section: list of items (type, expected outcome, target date, etc.) with add/edit/delete.
- **What you can do**: Click **Edit** to change status, uncertainty, impact, related artefacts, or notes; add or edit **Technical planning** items; or **Delete** the hypothesis (with confirmation).

### 4. Edit a hypothesis

- **Go to**: From the hypothesis detail page, click **Edit** (or `/hypo-stage/hypothesis/:id/edit`).
- **What you see**: A form with the same fields as create, except **Hypothesis Statement** and **Entity References** are read-only. You can change **Status**, **Source Type**, **Uncertainty**, **Impact**, **Quality Attributes**, **Related Artefacts**, and **Notes**.
- **Submit**: Click **Update Hypothesis**. The detail page reflects the new data and the evolution chart gains an entry for the change.

### 5. Add technical planning items

- **Go to**: Open a hypothesis detail page.
- **Add item**: In the Technical planning section, use the add control. Fill **Action type** (e.g. Experiment, Spike, Tracer Bullet), **Expected outcome**, **Target date**, and optional **Documentations** (URLs). Save.
- **What you see**: The new item appears in the list. You can edit or delete it from the same page.

### 6. Hypotheses tab on a catalog entity

- **Where**: On a Backstage **Component** entity page, if the app has added the Hypo Stage tab (and, when using feature flags, the `hypo-stage` flag is on).
- **What you see**: A **Hypotheses** tab that lists hypotheses whose **Entity References** include the current component. Same list behaviour as on the home page (filters, focus, click-through to detail).
- **Use case**: See all hypotheses that reference a given service or app in one place.

---

## Compatibility with generic Backstage

HypoStage is designed to work with **any** Backstage instance:

- **Feature flags**: If the Feature Flags API is not registered, `useHypoStageTabEnabled()` returns `true` so the Hypotheses tab is visible by default. To control visibility via a flag, register `HYPO_STAGE_FEATURE_FLAG` (`'hypo-stage'`).
- **Catalog `spec.team`**: Teams are derived from components that have `spec.team` and are referenced by hypotheses. If your catalog does not use `spec.team`, the team filter will be empty; the rest of the plugin works unchanged.
- **Entity refs / teams API**: If the backend endpoints for entity refs or teams fail, the frontend shows empty filter lists; the hypothesis list and dashboard still work.

No organization-specific code is required.

---

## Makefile reference

From the repo root:

| Target | Description |
|--------|-------------|
| `make help` | Show all targets and descriptions |
| `make deps` | Install dependencies (`yarn install --ignore-engines`) |
| `make build` | Build both plugins (`yarn build`) |
| `make test` | Run all tests (`yarn test`) |
| `make lint` | Run lint (`yarn lint`) |
| `make start-dependencies` | Start Docker dependencies (PostgreSQL) |
| `make stop-dependencies` | Stop and remove Docker dependencies and volumes |
| `make validate` | Install, build, test and lint (full validation in one go) |

Full validation in one command:

```bash
make validate
```

Or step by step: `make deps && make build && make test && make lint`

---

## API reference

### Frontend

- `HypoStagePage`, `CreateHypothesisPage`, `HypothesisPage`, `EditHypothesisPage` – Page components
- `HypothesisForm`, `HypothesisList` – Reusable UI
- `EntityHypothesesTab`, `useHypoStageTabEnabled`, `HYPO_STAGE_FEATURE_FLAG` – Catalog entity integration
- `HypoStageApiRef`, `HypoStageApiClient` – API client and ref

### Backend

- `HypothesisService` – Hypothesis and technical planning persistence
- REST API under `/hypotheses` and `/technical_plannings`
- Database migrations in `hypo-stage-backend/migrations/`

---

## License

LGPL-3.0. See [LICENSE](https://github.com/ArchHypo/hypo-stage/blob/main/LICENSE).
