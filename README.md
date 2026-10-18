<h1 align="center">💡 HypoStage</h1>

<p align="center">
  <img src="docs/images/hypo-stage-demo.gif" alt="HypoStage plugin: home and dashboard (illustrative preview)" />
</p>

<p align="center">
  <em>Document assumptions · Track uncertainty · Validate decisions</em>
</p>

<p align="center">
  <sub>Architectural hypothesis management that fits right into your Backstage.</sub>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@archhypo/plugin-hypo-stage"><img src="https://img.shields.io/npm/v/@archhypo/plugin-hypo-stage?label=frontend" alt="npm: frontend package" /></a>
  <a href="https://www.npmjs.com/package/@archhypo/plugin-hypo-stage-backend"><img src="https://img.shields.io/npm/v/@archhypo/plugin-hypo-stage-backend?label=backend" alt="npm: backend package" /></a>
  <a href="https://github.com/ArchHypo/hypo-stage/actions/workflows/ci.yml"><img src="https://github.com/ArchHypo/hypo-stage/actions/workflows/ci.yml/badge.svg" alt="CI status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-LGPL--3.0-blue.svg" alt="License LGPL-3.0" /></a>
</p>

---

HypoStage integrates architectural hypothesis management into your Backstage environment, enabling teams to document, track, and validate architectural decisions effectively. This plugin provides a comprehensive framework for managing architectural hypotheses with uncertainty assessment, quality attributes tracking, and technical planning capabilities.

The animated image at the top of this page is an **illustrative preview** of the plugin home and dashboard; it may not match the latest UI pixel-for-pixel.

A **demo with seed data** is available for a quick overview: [https://hypo-stage-hypo-stage.vercel.app](https://hypo-stage-hypo-stage.vercel.app/). It is not for production—just an alternative way to see the plugin in action. See [Standalone demo deployment](docs/standalone-demo-deployment.md) for how we set it up.

## 📌 Current release, Backstage, and community

**Npm:** **`@archhypo/plugin-hypo-stage@1.0.0`** and **`@archhypo/plugin-hypo-stage-backend@1.0.0`** — the first **1.x** line. Treat this as the **stable baseline** for Backstage adopters: SemVer applies from `1.0.0` onward (breaking changes would bump **major**).

**Backstage:** HypoStage is a normal Backstage **frontend + backend** plugin pair. Install both packages at the **same version**, wire routes and the backend module, and configure a database as in [Installation](#installation). Keep your app on a [maintained Backstage release](https://github.com/backstage/backstage/releases) and Node.js **20+** (see [Prerequisites](#-prerequisites)).

**Open source:** [CHANGELOG.md](CHANGELOG.md) · [Security policy](SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Issues](https://github.com/ArchHypo/hypo-stage/issues)

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
- [📌 Current release, Backstage, and community](#-current-release-backstage-and-community)
- [📖 What is HypoStage?](#-what-is-hypostage)
- [📁 Repository structure](#-repository-structure)
- [✅ Prerequisites](#-prerequisites)
- [🖥️ Run standalone](#-run-standalone-no-backstage-app-required)
- [🔌 Add to a Backstage app](#-add-to-your-existing-backstage-app)

**Install & use**
- [📦 Installation](#-installation) (step-by-step for Backstage)
- [🎯 Usage](#-usage)
- [🤖 AI agents: pull request analysis](#-ai-agents-pull-request-analysis)

**Develop & validate**
- [🔨 Building the project](#-building-the-project)
- [🧪 Running tests](#-running-tests)
- [✨ Code style (lint)](#-code-style-lint)
- [✔️ Validating usage](#-validating-usage)
- [🔄 CI (GitHub Actions)](#-ci-github-actions)

**Reference**
- [🖥️ Running plugins standalone](#-running-plugins-standalone) (full details)
- [🌐 Standalone demo deployment](#-standalone-demo-deployment)
- [🐳 Running with Docker](#-running-with-docker)
- [🔌 Compatibility with generic Backstage](#-compatibility-with-generic-backstage)
- [📋 Makefile reference](#-makefile-reference)
- [📚 API reference](#-api-reference)
- [📄 License](#-license)
- [📜 Backstage Plugin Directory](#-backstage-plugin-directory)
- [📦 NPM publishing](#-npm-publishing)
- [📜 Changelog](CHANGELOG.md)
- [🔒 Security](SECURITY.md)
- [🤝 Contributing](CONTRIBUTING.md)

---

## 📜 Backstage Plugin Directory

HypoStage can be added to the [official Backstage Plugin Directory](https://backstage.io/plugins/). See [docs/backstage-directory/SUBMISSION.md](docs/backstage-directory/SUBMISSION.md) for the full submission checklist, including NPM publishing, the directory YAML file, and PR instructions. The plugin requires both the **frontend** and **backend** packages to be installed.

## 📦 NPM publishing

To publish a new version: (1) set `"version": "X.Y.Z"` (using [Semantic Versioning](https://semver.org/)) in both `hypo-stage/package.json` and `hypo-stage-backend/package.json`, (2) merge via PR (main is protected), (3) create a GitHub Release with tag `vX.Y.Z` from main. The [publish workflow](.github/workflows/publish-npm.yml) runs automatically and publishes both packages to NPM. See [docs/npm-publishing.md](docs/npm-publishing.md) for version guidelines, setup (NPM token), and release steps. After publishing, update [CHANGELOG.md](CHANGELOG.md) and this README’s **Current release** section when you cut the next version.

---

## 📖 What is HypoStage?

- **📝 Hypothesis management** — Create, edit, and track architectural hypotheses with detailed metadata
- **📊 Uncertainty assessment** — Evaluate uncertainty and impact using Likert-scale ratings; values are set on creation and can only be changed through technical planning actions
- **🏷️ Quality attributes** — Associate hypotheses with performance, security, maintainability, etc.
- **📅 Technical planning** — Link technical planning items (experiments, spikes) to hypotheses; optionally reassess uncertainty and impact when creating or editing a plan
- **📈 Visualization** — Evolution chart with distinct visual markers for manual vs. technical-planning-linked changes and informative tooltips
- **🔗 Catalog integration** — Link hypotheses to Backstage entities; optional Hypotheses tab on component pages

---

## 📁 Repository structure

Monorepo (Yarn workspaces):

| Path | Package / purpose | Description |
|------|-------------------|-------------|
| `hypo-stage/` | `@archhypo/plugin-hypo-stage` | Frontend: UI, pages, catalog tab, API client |
| `hypo-stage-backend/` | `@archhypo/plugin-hypo-stage-backend` | Backend: REST API, database, HypothesisService |
| `hypo-stage-backend-agents/` | `@archhypo/plugin-hypo-stage-backend-agents` | Backend module: GitHub PR webhook, pg-boss queue, AI analysis that proposes hypothesis changes |
| `tsconfig.json` | — | Root TypeScript config (required for prepack / NPM publishing) |
| `docs/images/` | — | Illustrative asset for the root README (`hypo-stage-demo.gif`). |
| `docs/backstage-directory/` | — | Materials for [Backstage Plugin Directory](#-backstage-plugin-directory) submission |
| `docs/npm-publishing.md` | — | [NPM publishing](#-npm-publishing) guide |
| `CHANGELOG.md` | — | Version history ([Keep a Changelog](https://keepachangelog.com/)) |
| `SECURITY.md` | — | How to report security issues |
| `CONTRIBUTING.md` | — | How to contribute |

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
2. Configure [frontend](#step-2-configure-the-frontend) (routes + sidebar) and [backend](#step-3-configure-the-backend) (register plugin + API + database).

Full step-by-step: [Installation](#installation). Package-specific setup guides: [frontend (NPM)](https://www.npmjs.com/package/@archhypo/plugin-hypo-stage) | [backend (NPM)](https://www.npmjs.com/package/@archhypo/plugin-hypo-stage-backend).

---

## 📦 Installation

Use these steps to add HypoStage to an existing Backstage application (Backstage **1.x** app layout; align plugin versions with your app’s Backstage packages).

### Step 0: Add the plugin packages

**Option A — From NPM** (recommended; use **matching** versions, e.g. **1.0.0**):

```bash
yarn --cwd packages/app add @archhypo/plugin-hypo-stage@^1.0.0
yarn --cwd packages/backend add @archhypo/plugin-hypo-stage-backend@^1.0.0
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

**Register the frontend API** — In `packages/app/src/apis.ts` (or `apps/web/src/apis.ts`):

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

**Database** — Ensure your backend has a database configured in `app-config.yaml`. For a dedicated plugin database (recommended), add `backend.database.plugin.hypo-stage`. See the [backend package README](https://www.npmjs.com/package/@archhypo/plugin-hypo-stage-backend) or [Running the backend plugin standalone](#running-the-backend-plugin-standalone) for a full example.

**CORS** — If the browser loads the app from a different origin than the backend (e.g. Vite dev server on port **3000** and backend on **7007**), configure **`backend.cors`** in your app’s YAML (`app-config.yaml`, `app-config.local.yaml`, or env-specific files). Backstage applies this at the backend level; the HypoStage plugin **does not** ship hardcoded allowlists.

Example (local dev, aligned with the default Backstage app template):

```yaml
backend:
  cors:
    origin: http://localhost:3000
    methods: [GET, HEAD, PATCH, POST, PUT, DELETE]
    credentials: true
```

For standalone development in this repo, copy [app-config.example.yaml](app-config.example.yaml) to `app-config.yaml` — it already includes a fuller `backend.cors` block (`methods`, `allowedHeaders`, `credentials`). Production-style sample: [app-config.production.yaml](app-config.production.yaml).

---

## 🎯 Usage

- **Open the plugin**: Sidebar → “Hypo Stage” or go to `/hypo-stage`.
- **Create a hypothesis**: “Create New Hypothesis” → statement, context, uncertainty/impact, quality attributes, optional related-artefact links → save.
- **Manage**: View, edit, and track evolution from the list and detail pages. On **Edit**, you can change the hypothesis statement, status, source type, entity references, quality attributes, optional links, and notes (uncertainty and impact are still adjusted only via technical planning). **Delete** a hypothesis from the list (row icon) or from the detail page; both require typing the current hypothesis statement to confirm. The detail view shows clearly labeled assessment chips (Status, Uncertainty, Impact, Focus).
- **Technical planning**: On a hypothesis detail page, add, edit, and delete technical planning items (documentation URLs are optional on create and can be added or updated later when editing a plan). When creating or editing a plan, you can optionally reassess uncertainty and impact — these are the only way to change those values after initial creation. Changes are recorded as events and displayed in the evolution chart with distinct markers.

---

## 🤖 AI agents

**Pull request analysis.** The optional backend module `@archhypo/plugin-hypo-stage-backend-agents` receives GitHub pull request webhooks and asks an LLM how the change affects your hypotheses and their technical plannings. It never edits hypotheses: it stores **suggestions** that appear in the **Agent Suggestions** card of the hypothesis page, where a reviewer accepts or rejects each one. Accepting applies the change through the regular HypoStage API, so it is validated and recorded in the evolution chart like a manual edit.

| Suggestion | Applied on accept |
|------------|-------------------|
| Related artefact | PR URL added to the hypothesis related artefacts |
| Planning progress | PR URL added to the planning documentations, expected outcome optionally updated |
| Reassessment | New uncertainty/impact recorded on the technical planning the PR executes |
| New technical planning | Planning created with the PR as documentation (may carry a reassessment) |
| Status change | Hypothesis status updated (only proposed for merged PRs) |

**Pipeline** (one [pg-boss](https://github.com/timgit/pg-boss) job per PR commit, [Vercel AI SDK](https://ai-sdk.dev) structured outputs):

1. **Context:** PR metadata and per-file patches (lockfiles/binaries dropped, size-bounded per model); open hypotheses scoped to the catalog components whose `github.com/project-slug` annotation matches the repository (falls back to all open hypotheses), with their technical plannings and recent evolution.
2. **Triage:** one call selects the hypotheses the PR may affect.
3. **Assess:** one call per selected hypothesis proposes links, reassessments, planning progress, new plannings and status changes.
4. **Guardrails:** deterministic checks drop low-confidence output, invented ids, no-op changes, and anything the backend would reject.
5. **Persist:** suggestions replace earlier pending ones for the same PR; each run is logged in `agent_runs` with a step trace and token usage.

**Setup**

1. Requires PostgreSQL (pg-boss). Add the module next to the backend plugin: `backend.add(import('@archhypo/plugin-hypo-stage-backend-agents'));`
2. Configure `hypoStage.github` and `hypoStage.agents` (see [app-config.example.yaml](app-config.example.yaml)). Supported providers: `anthropic`, `openai`, `google` and `ollama` (any OpenAI-compatible local endpoint). Each repository picks a model key.
3. On GitHub, add a webhook to `https://<backend>/api/hypo-stage/webhooks/github` with content type `application/json`, the configured secret, and the **Pull requests** event. For local testing use `gh webhook forward` or [smee.io](https://smee.io).

Handled actions: `opened`, `reopened`, `synchronize`, `ready_for_review`, `edited` (title/body), and `closed` (merged → final analysis; not merged → pending suggestions superseded). Drafts are ignored.

**Hypothesis coach.** Independent of GitHub, the coach (`hypoStage.agents.coach`) helps write better hypotheses, the part of ArchHypo teams find hardest to learn. It classifies a statement as a hypothesis, requirement, risk or decision, checks whether it is falsifiable, explains each issue with the ArchHypo concept behind it, and proposes rewrites, splits, a source type and quality attributes. It never assesses uncertainty or impact, which remain the team's own reflection.

- **While writing:** a **Review with AI** button under the statement in the create and edit forms; "Use this" copies a rewrite into the field.
- **At save** (`checkOnSave`): an unreviewed statement is reviewed before saving; if it needs work a dialog offers **Back to edit** or **Save anyway**. It never blocks saving, and editing a hypothesis without changing its statement skips the check.
- **After creation** (`fallback`): a scheduled job reviews recent hypotheses that never went through the coach (e.g. created through the API) and proposes a **Statement rewrite** in the Agent Suggestions card of the hypothesis page. Reviews are stored in `agent_hypothesis_reviews`.

**Technical plan designer.** The **Suggest plan with AI** button in the Technical Planning card of a hypothesis (`hypoStage.agents.planner`) proposes 2–4 plan actions from the ArchHypo catalogue (Experiment, Analytics, Spike, Tracer Bullet, Modularization, Trigger, Guideline). The strategy is derived deterministically from the hypothesis assessment, following the ArchHypo paper:

| Uncertainty / Impact | Strategy |
|---|---|
| high / high | Act in the first iteration: accept/refute or reduce uncertainty now, optionally reduce impact in parallel |
| high / medium | Investigate early, plus a trigger that says when to decide |
| high or medium / low | Postpone with criteria (architectural trigger, landing zone) |
| low / high | Reduce the impact (modularization, anti-corruption layer) or settle it with a tracer bullet |
| low / low–medium | Monitor with a guideline or trigger |
| medium / medium–high | Balance uncertainty and impact reduction |

Each action states its goal and the evidence to look for in its expected outcome (`Goal: Reduce uncertainty. Evidence: … Expected effect: uncertainty High → Low.`), and gets a target date from its iteration (`iterationDays`). Reviewers **Add** an action, **Edit before adding** (opens the pre-filled create form) or **Dismiss** it; decisions are stored in `agent_plan_proposal_actions`. The designer never changes uncertainty or impact. The PR agent uses the stated evidence to recognize when a pull request executes a planning, and keeps the `Goal:` prefix when it proposes progress updates.

**GitHub issue flows.** With `repositories[].issues` enabled and the webhook subscribed to **Issues** and **Issue comments**, HypoStage treats issues the way the ArchHypo authors analysed support reports after release, and brings technical plans into the backlog:

| Flow | What it does |
|---|---|
| Issue triage (`issues.triage`) | Classifies human issues (bug, improvement, quality attributes), links them to hypotheses, proposes **Trigger-Fired** when an issue meets a Trigger planning's condition, and raises an **evidence alert** once `alertThreshold` issues support or contradict the same hypothesis. It never reassesses: a report is a claim, and the assessment stays with the team. |
| Plans as issues (`issues.planIssues`) | **Open as issue** on a technical planning creates a labelled issue (`archhypo:plan`, action type, hypothesis). Closing it as completed proposes the planning as done; reopening withdraws that; comments reporting results are assessed against the planning's `Goal:`/`Evidence:`. A PR saying `Fixes #N` is matched to the planning without the model, and merges with the issue-closed suggestion. |
| Coverage (`coverage.enabled`) | Groups recent unrelated issues by component and quality attribute; recurring themes that were costly (slow to close, reopened, discussed) become draft hypotheses, reviewed by the coach. Quick fixes are skipped as low impact. |
| Issues report | A home page tab (and Markdown export) with issues by type and quality attribute, related vs unrelated, resolution time, plan activities by action type and month, and uncovered themes. |

Loops are prevented by construction: issues HypoStage created are recognised by their link record or a hidden body marker and are only synced, never triaged; only human-originated artifacts count as evidence; and each handler may emit only specific suggestion kinds. Set `hypoStage.github.botLogin` only for a dedicated bot account.

**Agent runs tab.** When the agents module is installed, the HypoStage home page shows an **Agent runs** tab (`/hypo-stage?tab=agent-runs`) that lists every run with its repository, PR, model, status and suggestion count. Click a row to see its trace: which hypotheses triage selected or dropped (and why), what the model proposed for each one, which suggestions were kept or filtered out by the guardrails, token usage, and errors of failed runs. Without the module (e.g. the read-only demo) the tab is hidden.

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

---

## ✨ Code style (lint)

```bash
yarn lint
```

Or: `make lint`. This runs lint for both workspace packages (frontend and backend) and for the root **`scripts/`** directory (Node scripts). Warnings about frontend importing from the backend package are acceptable for this plugin’s shared types.

---

## ✔️ Validating usage

To confirm everything works:

1. **Build, test, and lint**: From the repo root (Node 20+ recommended), run `make deps` then **`make check`** (runs build, unit tests, and lint in one go, non-interactively). Or run `make build && make test && make lint`. From each package you can run `yarn build`, `yarn test`, `yarn lint`.
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
     cors:
       origin: http://localhost:3000
       methods: [GET, HEAD, PATCH, POST, PUT, DELETE, OPTIONS]
       allowedHeaders: [Content-Type, Authorization, X-Requested-With, Accept]
       credentials: true
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

   **CORS** is required when the frontend runs on another origin (e.g. `hypo-stage` on port 3000). Omitting `backend.cors` here will cause browser “Failed to fetch” / missing `Access-Control-Allow-Origin` errors. For SQLite: `client: better-sqlite3`, `connection: ':memory:'`.
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

**If you see "Failed to fetch" or CORS errors** (e.g. "No 'Access-Control-Allow-Origin' header") when the frontend calls the backend, the backend must load `app-config.yaml` so **`backend.cors`** is applied (the plugin router no longer sets CORS headers itself). The `yarn start` script in `hypo-stage-backend` runs `scripts/ensure-config-path.js`, which sets `BACKSTAGE_CONFIG_PATH` to `app-config.yaml` (repo root or current dir) before starting the backend. Ensure `app-config.yaml` exists in the repo root (or in `hypo-stage-backend`) and contains a `backend.cors` block (see [app-config.example.yaml](app-config.example.yaml)). If problems persist, set it explicitly: `BACKSTAGE_CONFIG_PATH=/absolute/path/to/app-config.yaml cd hypo-stage-backend && yarn start`.

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

Use the plugin in a Backstage app: [Installation](#installation) (from NPM or copy from source). Point the app’s `app-config.yaml` at this Postgres and configure the plugin’s database (e.g. `backend.database.connection` and `backend.database.plugin.hypo-stage.connection.database: backstage_plugin_hypo_stage`). If you run the frontend separately (e.g. for standalone dev), ensure `backend.cors` in `app-config.yaml` allows the frontend origin (see `app-config.example.yaml`).

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
| `make test` | Run unit tests (frontend + backend) |
| `make lint` | Run lint (workspaces + root `scripts/`) |
| `make check` | Build, unit test, and lint in one go |
| `make start-dependencies` | Start PostgreSQL (Docker) |
| `make create-db` | Create HypoStage plugin database `backstage_plugin_hypo_stage` (if missing) |
| `make seed-standalone` | Create plugin DB (if needed) and run migrations + seed (one command) |
| `make stop-dependencies` | Stop PostgreSQL and remove volumes |
| `make reset-agents-db` | Drop the agents tables and pg-boss schema (re-created on next backend start) |

---

## 📚 API reference

**Frontend:** `HypoStagePage`, `CreateHypothesisPage`, `HypothesisPage`, `EditHypothesisPage`; `HypothesisForm`, `HypothesisList`; `EntityHypothesesTab`, `useHypoStageTabEnabled`, `HYPO_STAGE_FEATURE_FLAG`; `HypoStageApiRef`, `HypoStageApiClient`.

**Backend:** `HypothesisService`; REST under `/hypotheses` and `/technical_plannings`; migrations in `hypo-stage-backend/migrations/`.

---

## 📄 License

LGPL-3.0. See [LICENSE](https://github.com/ArchHypo/hypo-stage/blob/main/LICENSE).
