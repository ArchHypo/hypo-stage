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

**Npm:** **`@archhypo/plugin-hypo-stage@1.0.1`** and **`@archhypo/plugin-hypo-stage-backend@1.0.1`** — the **1.x** line (see [CHANGELOG.md](CHANGELOG.md)). Treat this as the **stable baseline** for Backstage adopters: SemVer applies from `1.0.0` onward (breaking changes would bump **major**). The optional agents package, `@archhypo/plugin-hypo-stage-backend-agents`, is versioned on its own and is not part of that 1.0.1 pair.

**Backstage:** HypoStage is a normal Backstage **frontend + backend** plugin pair. Install both packages at the **same version**, wire routes and the backend plugin, and configure a database as in [Installation](#installation). The [AI agents](#-ai-agents) module is a separate backend module you add only when you want it. Keep your app on a [maintained Backstage release](https://github.com/backstage/backstage/releases) and Node.js **22.x** (see [Prerequisites](#-prerequisites)).

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
- [🤖 AI agents](#-ai-agents)

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

To publish a new version: (1) set `"version": "X.Y.Z"` (using [Semantic Versioning](https://semver.org/)) in both `hypo-stage/package.json` and `hypo-stage-backend/package.json`, (2) merge via PR (main is protected), (3) create a GitHub Release with tag `vX.Y.Z` from main. The [publish workflow](.github/workflows/publish-npm.yml) runs automatically and publishes both core packages to NPM. The agents package keeps its own version. The workflow publishes it on that same tag only when `hypo-stage-backend-agents/package.json` is also `X.Y.Z`; otherwise the core release still succeeds and agents is skipped. That avoids failing the release by republishing an agents version npm already has. See [docs/npm-publishing.md](docs/npm-publishing.md) for the rule, setup (NPM token), and release steps. After publishing, update [CHANGELOG.md](CHANGELOG.md) and this README’s **Current release** section when you cut the next version.

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
| `hypo-stage-backend-agents/` | `@archhypo/plugin-hypo-stage-backend-agents` | Backend module: AI agents (PR and issue analysis, coach, plan designer, coverage, report) — see [docs/agents](docs/agents/) |
| `docs/agents/` | — | [User guide](docs/agents/user-guide.md) and [developer guide](docs/agents/developer-guide.md) for the AI agents |
| `tsconfig.json` | — | Root TypeScript config (required for prepack / NPM publishing) |
| `docs/images/` | — | Illustrative asset for the root README (`hypo-stage-demo.gif`). |
| `docs/backstage-directory/` | — | Materials for [Backstage Plugin Directory](#-backstage-plugin-directory) submission |
| `docs/npm-publishing.md` | — | [NPM publishing](#-npm-publishing) guide |
| `CHANGELOG.md` | — | Version history ([Keep a Changelog](https://keepachangelog.com/)) |
| `SECURITY.md` | — | How to report security issues |
| `CONTRIBUTING.md` | — | How to contribute |

From the repo root: `yarn build`, `yarn test`, and `yarn lint` run for the frontend, the backend, and the agents module. See [Makefile reference](#makefile-reference) for convenience targets.

---

## ✅ Prerequisites

- **Node.js** 22.x ([nvm](https://github.com/nvm-sh/nvm): `nvm install 22 && nvm use 22`)
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
2. **Use Node.js 22.x** so prebuilt binaries are used when possible: `nvm use 22`. An open range such as `>=20` makes Vercel install Node 26, which `better-sqlite3@12.6.2` rejects.
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

**Option A — From NPM** (recommended; use **matching** versions, e.g. **1.0.1**):

```bash
yarn --cwd packages/app add @archhypo/plugin-hypo-stage@^1.0.1
yarn --cwd packages/backend add @archhypo/plugin-hypo-stage-backend@^1.0.1
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

The plugin works with only that registration. To add the optional agents, install `@archhypo/plugin-hypo-stage-backend-agents` and register it **after** the plugin, then follow [AI agents](#-ai-agents). Leaving it out changes nothing in the hypothesis API.

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
- **AI agents (optional)**: With the agents module installed and a feature turned on, the same pages grow a coach, a plan designer, a suggestions card, and extra home tabs. See [AI agents](#-ai-agents).

---

## 🤖 AI agents

The optional package [`@archhypo/plugin-hypo-stage-backend-agents`](hypo-stage-backend-agents/README.md) is a Backstage **backend module** of the existing `hypo-stage` plugin. It is not a second plugin and it does not replace the hypothesis API. Install it only when you want model help. A Backstage app that never registers the module keeps the current HypoStage behaviour.

### How it fits the plugin

The module shares the plugin database and the `/api/hypo-stage` router. It **reads** `hypothesis`, `technicalPlanning`, and `hypothesisEvents`. It **writes only its own** `agent_*` tables. A person reviews each suggestion in the UI. Accepting one calls the same REST endpoints the forms already use, so validation, events, and the evolution chart stay in the original plugin.

| Piece you already have | What the module adds |
|---|---|
| Create and edit hypothesis forms | **Review with AI** on the statement, and an optional check when you save |
| Technical planning on the hypothesis page | **Suggest plan with AI**, then Add, Edit, or Dismiss each action |
| Hypothesis detail page | **Agent Suggestions** card for pending background proposals |
| Home page (`/hypo-stage`) | **Agent runs** and **Issues report** tabs, only while a matching feature is on |
| GitHub is outside the plugin today | Webhook, pull-request analysis, issue triage, and plans opened as issues |

Buttons and tabs stay off the page until that flow can run. `GET /api/hypo-stage/agents/health` reports each flag and a `ready` value. `ready` is true only when the flag is on and the backend can carry the flow out: a callable model for the coach, the plan designer, and coverage, and also the PostgreSQL queue, a GitHub token, and a webhook secret for pull requests, triage, and plan issues. A flag without those stays hidden. If the module is not installed, the health route is absent and the frontend treats agents as unavailable. Pending suggestions can still be reviewed when the module is installed, because accepting one uses the normal HypoStage API.

### Three ways a run starts

The module only runs when one of these happens. The [user guide](docs/agents/user-guide.md#three-ways-a-run-starts) walks through what it does with the input in each case.

| Way it starts | What it is given | What you see |
|---|---|---|
| **Review with AI** or **Suggest plan with AI** | The statement or hypothesis on the screen | The answer in the form or a dialog. **Use this** or **Add** applies it. Nothing is saved until you do that |
| A GitHub webhook | A notice that a pull request or issue changed. The module then downloads the text | A pending suggestion on the hypothesis. Accept uses the normal API |
| The scheduler | Hypotheses that never went through the coach, or issue themes no hypothesis covers | A rewrite suggestion, or a draft hypothesis on the Issues report |

### How a suggestion moves

1. A flow runs (you click a button, a webhook arrives, or a scheduled job fires).
2. Deterministic checks drop proposals the API would reject, or that this flow is not allowed to make. The reason is stored on the run trace.
3. What remains is a **pending** suggestion.
4. You **accept** or **reject** it. Accept applies the change through the HypoStage API. Reject changes nothing.
5. A newer artifact for the same fact **supersedes** the pending row instead of stacking a second one.

The coach and the plan designer show their result in the form or a dialog. They do not wait in the suggestions card. Pull-request analysis, issue triage, plan sync, and the demo fixture do.

### Install the module

HypoStage itself is already in place if you followed [Installation](#installation): routes, sidebar, the frontend API, and `backend.add(import('@archhypo/plugin-hypo-stage-backend'))`. There is no second frontend package and no new route. The steps below only add the backend module and point it at a local model.

**1. Add the package** to the backend of your Backstage app (skip this in this repository; the standalone backend already depends on it):

```bash
yarn --cwd packages/backend add @archhypo/plugin-hypo-stage-backend-agents
```

**2. Register it immediately after the HypoStage plugin** in `packages/backend/src/index.ts`. In this repository that line is already in `hypo-stage-backend/dev/index.ts`.

```ts
backend.add(import('@archhypo/plugin-hypo-stage-backend'));
backend.add(import('@archhypo/plugin-hypo-stage-backend-agents'));
```

**3. Paste the agents block into the `app-config.yaml` you already use.** Do not replace that file. This is the `hypoStage` section of [`app-config.example.yaml`](app-config.example.yaml). It turns on the coach and the plan designer with local [Ollama](https://ollama.com) and leaves pull-request analysis off. No API key.

```yaml
hypoStage:
  agents:
    enabled: false
    defaultModel: local
    providers:
      ollama:
        baseUrl: http://localhost:11434/v1
    models:
      - key: local
        provider: ollama
        modelId: qwen2.5:7b
        maxInputChars: 12000
    planner:
      enabled: true
    coach:
      enabled: true
      checkOnSave: false
```

**4. Start Ollama and download the model** named in that block:

```bash
ollama pull qwen2.5:7b
```

Leave the Ollama server running (`ollama serve` if it is not already).

**5. Restart the backend.** The module reads this config only at startup. On first start it creates the `agent_*` tables in the HypoStage database you already configured.

**6. Confirm the module is on** before opening the UI:

```bash
curl -s http://localhost:7007/api/hypo-stage/agents/health
```

`coach.ready` and `planner.ready` are `true`. A 404 means step 2 did not register the module. `coach.enabled: true` with `coach.ready: false` means `defaultModel` does not match a `models` key, or that key is not `provider: ollama`.

**7. Open the app you already have** at `/hypo-stage`. **Create New Hypothesis** shows **Review with AI**. A saved hypothesis shows **Suggest plan with AI** under Technical Planning. Those buttons call Ollama when you click them. Nothing else on the page changes until you turn on a GitHub flow below.

PostgreSQL is required only for the job queue (pull requests and issues). The coach and the plan designer also run on SQLite. The queue stays idle while `agents.enabled` and the issue flags are false.

A hosted model uses the same `hypoStage.agents` fields with an `apiKey`. [`app-config.production.yaml`](app-config.production.yaml) has that shape commented out, using Anthropic (`claude-sonnet-5`) plus GitHub. Leave it commented on the public demo, and do not commit a provider key.

### Use the coach and the plan designer

Recorded example: [hypothesis-coach-and-plan-designer.mp4](docs/agents/examples/hypothesis-coach-and-plan-designer.mp4) (about 2.5 minutes).

1. Open **Create New Hypothesis**.
2. Pick a catalog component and paste a statement that is still a requirement, for example `The new gateway will be fast, secure and cheaper to run than the old one`.
3. Click **Review with AI**. Read the findings, then **Use this** on a rewrite.
4. Set source type, uncertainty, impact, and quality attributes, then save. With `coach.checkOnSave: true` (default is `false`), a dialog can warn you and still lets you **Save anyway**.
5. Open the saved hypothesis. In **Technical Planning**, click **Suggest plan with AI**.
6. For each proposed action choose **Add**, **Edit before adding**, or **Dismiss**. **Add** creates the planning through the normal API.

### Use the GitHub flows

These stay off until you set a token, a webhook, and the repositories to watch.

1. `hypoStage.github.apiToken` — read for pull requests and issue triage; read and write to open and close plan issues.
2. `hypoStage.github.webhookSecret` — the same secret as the GitHub webhook.
3. Webhook URL: `https://<your-backend>/api/hypo-stage/webhooks/github`, content type JSON, events **Pull requests**, **Issues**, and **Issue comments**.
4. List each `owner/repo` under `hypoStage.agents.repositories`.

| Flag | What you do in the product |
|---|---|
| `agents.enabled: true` | Merged and open pull requests become suggestions: link, planning progress, reassessment, new planning, or status change |
| `repositories[].issues.triage: true` | A human issue can be linked to a hypothesis, fire a Trigger, or raise an evidence alert. Issues never reassess a hypothesis by themselves |
| `repositories[].issues.planIssues: true` | **Open as issue** on a planning. Closing the issue, commenting on it, or editing the planning text stays in sync. A comment is judged only against that planning's Goal and Evidence |
| `agents.coverage.enabled: true` | Recurring issues that match no hypothesis become a draft you can turn into a hypothesis from the Issues report. The finding is marked created only after that hypothesis is saved |

The **Agent runs** tab lists each run and why proposals were kept or dropped. It appears when the module is available and at least one feature flag is on. The **Issues report** tab appears when triage, plan issues, or coverage is on.

### Public demo

[https://hypo-stage-hypo-stage.vercel.app](https://hypo-stage-hypo-stage.vercel.app) does not enable a model and has no provider keys. The database includes the gateway hypothesis from the recording and one pending fixture suggestion, so you can open the suggestions card and accept it through the normal planning API. **Review with AI**, **Suggest plan with AI**, and the Agent runs tab stay hidden there.

### Where to read more

- **[User guide](docs/agents/user-guide.md)** — each feature: setup, a way to try it, outcomes, troubleshooting, and the configuration reference.
- **[Developer guide](docs/agents/developer-guide.md)** — module boundaries, checks, and recipes for a new suggestion kind, event, job, or provider.
- **[Package README](hypo-stage-backend-agents/README.md)** — install snippet and the smallest config.

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

Or: `make test` (runs once, no watch prompt). Frontend: Jest for components, hooks, API, utils. Backend: Jest for the router and HypothesisService, including a boot that lists hypotheses with the agents module absent. Agents: Jest for handlers, guardrails, and a boot with every feature flag off.

---

## ✨ Code style (lint)

```bash
yarn lint
```

Or: `make lint`. This runs lint for every workspace (frontend, backend, and the agents module) and for the root **`scripts/`** directory (Node scripts). Warnings about frontend importing from the backend package are acceptable for this plugin’s shared types.

---

## ✔️ Validating usage

To confirm everything works:

1. **Build, test, and lint**: From the repo root (Node.js 22.x), run `make deps` then **`make check`** (runs build, unit tests, and lint in one go, non-interactively). Or run `make build && make test && make lint`. From each package you can run `yarn build`, `yarn test`, `yarn lint`.
2. **Standalone**: Follow [Run standalone](#run-standalone-no-backstage-app-required) (including **`make seed-standalone`** for full demo data), then open http://localhost:3000.
3. **In an app**: [Install](#installation) into a Backstage app and open `/hypo-stage`.
4. **Docker**: [Running with Docker](#running-with-docker) for Postgres.

---

## 🔄 CI (GitHub Actions)

On pull requests and pushes to `main`/`master`, the workflow runs the same validation as [Validating usage](#validating-usage): **install** (frozen lockfile), **build** (type-check + Backstage CLI build for the frontend, backend, and agents module), **lint**, and **test** for every workspace. It then runs the plugin and agents migrations and both demo seeds against a PostgreSQL 16 service, and fails if the fixture suggestion is missing. The publish workflow runs that same database check before it publishes. Configuration: [.github/workflows/ci.yml](.github/workflows/ci.yml) and [.github/workflows/publish-npm.yml](.github/workflows/publish-npm.yml).

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

**Seed runs transparently**: When you start the backend, migrations run automatically and the seed migration fills the plugin database if it’s empty (idempotent). The agents module does the same for its own tables: on startup it inserts one pending suggestion and one fixture agent run (`provider: fixture`) on the walkthrough hypothesis. That row is sample data, not a model call. You don’t need to run `yarn seed` unless you want to reseed or populate the DB without starting the backend.

**Command to populate the plugin database with seed**

From the repo root, with `app-config.yaml` in place and Postgres running if using pg:

- **Recommended (one command)**: **`make seed-standalone`** — creates the plugin database if needed (when using Docker Postgres), then runs migrations and the demo seed, including the agents fixture. Use this to get example hypotheses, technical planning, and evolution data for the “Evolução da Incerteza e Impacto” chart, plus one pending suggestion on the walkthrough hypothesis.
- **Alternative**: `cd hypo-stage-backend && yarn seed` — same effect; use if you prefer not to use the Makefile.

When you run the backend standalone, the plugin database is filled with **example hypotheses**:

- **When it runs**: A migration runs on every backend start; it inserts seed hypotheses only when the `hypothesis` table is empty (idempotent). If the table already has rows, the seed backfills evolution events and technical planning for the payment and inventory hypotheses so the “Evolução da Incerteza e Impacto” chart and technical planning list have example data.
- **What you get**: Several hypotheses (e.g. payment service extraction, user API consolidation, API gateway) with varied uncertainty/impact; the payment and inventory hypotheses include technical planning items and multiple evolution points for the chart.

**How to run migrations with seed data**

1. **Automatic**: Migrations (including the seed) run when the backend starts. Start the backend (and frontend) as in [Run standalone](#run-standalone-no-backstage-app-required). No extra step needed.
2. **Manual**: From the repo root, with `app-config.yaml` present and the database reachable (e.g. Postgres via `make start-dependencies`, or SQLite), run **`make seed-standalone`** or `cd hypo-stage-backend && yarn seed`. This runs all pending plugin migrations, the demo hypothesis seed, the agents migrations, and the agents fixture seed (each idempotent). To use a different config file: `BACKSTAGE_CONFIG_PATH=/path/to/app-config.yaml cd hypo-stage-backend && yarn seed`.

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

**Migrations and seed.** From the repo root, with `app-config.yaml` pointing at this Postgres (`localhost:5432`, user `postgres`, password `postgres`, plugin database `backstage_plugin_hypo_stage`):

```bash
make seed-standalone
```

That creates the plugin database, runs the HypoStage migrations and demo hypothesis seed, then the agents migrations and the fixture seed. Run it again to confirm it is idempotent: hypothesis counts and the fixture row stay the same.

Check the result inside the container:

```bash
docker exec hypo-stage-postgres psql -U postgres -d backstage_plugin_hypo_stage -c \
  "SELECT name FROM knex_migrations ORDER BY id;"
docker exec hypo-stage-postgres psql -U postgres -d backstage_plugin_hypo_stage -c \
  "SELECT name FROM knex_migrations_hypo_stage_agents ORDER BY id;"
docker exec hypo-stage-postgres psql -U postgres -d backstage_plugin_hypo_stage -c \
  "SELECT provider, status, head_sha FROM agent_runs WHERE head_sha = 'demo-fixture';"
docker exec hypo-stage-postgres psql -U postgres -d backstage_plugin_hypo_stage -c \
  "SELECT kind, status FROM agent_suggestions WHERE head_sha = 'demo-fixture';"
```

You should see `20260216_000004_seed_demo_hypotheses.js` and `20261125_000005_seed_coach_example_hypothesis.js` in `knex_migrations`, `20261125_000006_seed_demo_agent_fixture.js` in `knex_migrations_hypo_stage_agents`, one `agent_runs` row with provider `fixture`, and one pending `new_planning` suggestion.

To replay only the agents migrations, drop those tables and seed again:

```bash
make reset-agents-db
make seed-standalone
```

If port 5432 is already in use, change the host port in `docker-compose.yaml` (for example `"5433:5432"`) and set `backend.database.connection.port` in `app-config.yaml` to that same port. `make create-db` talks to the container by name, so it does not use the host port.

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
| `make build` | Build the frontend, backend, and agents module |
| `make test` | Run unit tests for every workspace |
| `make lint` | Run lint (workspaces + root `scripts/`) |
| `make check` | Build, unit test, and lint in one go |
| `make start-dependencies` | Start PostgreSQL (Docker) |
| `make create-db` | Create HypoStage plugin database `backstage_plugin_hypo_stage` (if missing) |
| `make seed-standalone` | Create plugin DB (if needed) and run hypothesis and agents migrations + seeds |
| `make stop-dependencies` | Stop PostgreSQL and remove volumes |
| `make reset-agents-db` | Drop the agents tables and pg-boss schema (re-created on next backend start) |

---

## 📚 API reference

**Frontend:** `HypoStagePage`, `CreateHypothesisPage`, `HypothesisPage`, `EditHypothesisPage`; `HypothesisForm`, `HypothesisList`; `EntityHypothesesTab`, `useHypoStageTabEnabled`, `HYPO_STAGE_FEATURE_FLAG`; `HypoStageApiRef`, `HypoStageApiClient`.

**Backend:** `HypothesisService`; REST under `/hypotheses` and `/technical_plannings`; migrations in `hypo-stage-backend/migrations/`.

**Agents module (when installed):** routes under `/api/hypo-stage/agents` and `POST /api/hypo-stage/webhooks/github`. Those routes are absent when the module is not registered.

---

## 📄 License

LGPL-3.0. See [LICENSE](https://github.com/ArchHypo/hypo-stage/blob/main/LICENSE).
