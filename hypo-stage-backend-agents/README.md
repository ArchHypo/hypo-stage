# @archhypo/plugin-hypo-stage-backend-agents

AI agents for [HypoStage](https://github.com/ArchHypo/hypo-stage), the Backstage plugin for managing architectural hypotheses with ArchHypo.

This backend module adds agents that read pull requests and issues as evidence, coach hypothesis writing, design technical plans and bring plans into the GitHub backlog. **Agents only suggest** — every change is reviewed by a person and applied through the regular HypoStage API.

## Features

| Feature | What it does |
|---|---|
| **PR analysis** | Links pull requests to hypotheses and proposes planning progress, reassessments, new plannings and status changes |
| **Hypothesis coach** | Reviews statements (hypothesis vs requirement, risk or decision; falsifiability) and proposes rewrites — while writing, at save, or in the background |
| **Technical plan designer** | Proposes plan actions from the ArchHypo catalogue, with a strategy derived from uncertainty and impact |
| **Issue triage** | Classifies issues, links them to hypotheses, flags fired triggers and raises evidence alerts |
| **Plans as issues** | Opens technical plannings as GitHub issues and keeps both in sync |
| **Coverage** | Finds recurring, costly issue themes no hypothesis covers and drafts hypotheses for them |
| **Issues report** | Maintenance report of issues and plan activities, with a Markdown export |

A run starts in one of three ways: a **Review with AI** or **Suggest plan with AI** click, a GitHub webhook after a pull request or issue changes, or a scheduled pass over hypotheses that were never coached and over issue themes no hypothesis covers. The [user guide](https://github.com/ArchHypo/hypo-stage/blob/main/docs/agents/user-guide.md#three-ways-a-run-starts) says what the module does with the input in each case. Every run is stored with a trace. The **Agent runs** tab shows that trace once at least one flow can run.

## How it fits

This package is a backend **module** of the `hypo-stage` plugin (`pluginId: 'hypo-stage'`, `moduleId: 'agents'`), not a second plugin. It uses the same database and the same `/api/hypo-stage` router. It reads hypotheses and technical plannings and stores suggestions in `agent_*` tables. The frontend applies an accepted suggestion through the HypoStage REST API, so the original plugin still validates the write and records the evolution event.

Leaving the module unregistered, or leaving every feature flag false, does not change hypothesis create, edit, or planning. The job queue starts only when pull-request analysis or an issue flow is enabled.

This package is versioned on its own (currently `1.0.0`). A core HypoStage npm release publishes it only when this version equals the git tag. See [npm publishing](https://github.com/ArchHypo/hypo-stage/blob/main/docs/npm-publishing.md).

## Demo seed

Starting the module seeds one sample, the same way the HypoStage backend seeds its demo hypotheses. After migrations, `module.ts` inserts a pending technical-planning suggestion and a completed agent run (`provider: fixture`) on the walkthrough hypothesis. Nothing calls a model. The row is skipped while `NODE_ENV=test`. Accepting the suggestion still goes through the normal technical-planning API.

To apply it against the Docker Postgres from the repo root:

```bash
make start-dependencies
make seed-standalone
docker exec hypo-stage-postgres psql -U postgres -d backstage_plugin_hypo_stage -c \
  "SELECT provider, status FROM agent_runs WHERE head_sha = 'demo-fixture';"
```

`make seed-standalone` runs the plugin migrations, the hypothesis seed, the agents migrations, and this fixture. The [root README](https://github.com/ArchHypo/hypo-stage/blob/main/README.md#-running-with-docker) has the queries that confirm both migration tables and what to change if port 5432 is already taken.

## Requirements

- Node.js 22
- `@archhypo/plugin-hypo-stage-backend` and `@archhypo/plugin-hypo-stage` installed
- PostgreSQL for PR analysis and issue flows (the coach and plan designer also work on SQLite)
- An LLM provider when you turn a feature on: Anthropic, OpenAI, Google, or a local Ollama. No key is required while every flag stays off.

## Installation

```bash
yarn --cwd packages/backend add @archhypo/plugin-hypo-stage-backend-agents
```

```ts
// packages/backend/src/index.ts
backend.add(import('@archhypo/plugin-hypo-stage-backend'));
backend.add(import('@archhypo/plugin-hypo-stage-backend-agents'));
```

## Minimal configuration

Every feature is off by default. This enables the coach and the plan designer with a local model, which needs no GitHub setup and no paid API key. A cloud provider uses the same shape: set its `apiKey` and point `defaultModel` at that model key.

```yaml
hypoStage:
  agents:
    defaultModel: local
    providers:
      ollama:
        baseUrl: http://localhost:11434/v1
    models:
      - key: local
        provider: ollama
        modelId: qwen2.5:7b
        maxInputChars: 12000
    coach: { enabled: true }
    planner: { enabled: true }
```

PR analysis and the GitHub issue flows additionally need a token, a webhook and the repositories to analyze.

Restart the backend. `GET /api/hypo-stage/agents/health` reports each flag and whether that flow is `ready`. The screen renders a button or tab only when `ready` is true, so a flag without a callable model, a GitHub token, a webhook secret, or the PostgreSQL queue stays hidden. Then:

1. **Create New Hypothesis** → **Review with AI** → use a rewrite → save.
2. Open the hypothesis → **Technical Planning** → **Suggest plan with AI** → **Add** an action.
3. For GitHub, set `github.apiToken`, `github.webhookSecret`, and `agents.repositories`, then enable `agents.enabled` and/or `issues.triage` / `issues.planIssues`. Pending results show on the hypothesis **Agent Suggestions** card. Traces show on **Agent runs** once a feature is on.

The committed `app-config.example.yaml` leaves the flags off. The public demo does the same and does not call a paid model. A recorded coach and plan-designer session is in the user guide.

## Documentation

- [User guide](https://github.com/ArchHypo/hypo-stage/blob/main/docs/agents/user-guide.md) — how each feature works, setup, how to try it and what to expect
- [Developer guide](https://github.com/ArchHypo/hypo-stage/blob/main/docs/agents/developer-guide.md) — architecture, building blocks and recipes for new agentic features

## License

Apache-2.0
