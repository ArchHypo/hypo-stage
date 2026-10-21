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

Every run is traceable in the **Agent runs** tab of HypoStage.

## Requirements

- Node.js 20
- `@archhypo/plugin-hypo-stage-backend` and `@archhypo/plugin-hypo-stage` installed
- PostgreSQL for PR analysis and issue flows (the coach and plan designer also work on SQLite)
- An LLM provider: Anthropic, OpenAI, Google or a local Ollama

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

Every feature is off by default. This enables the coach and the plan designer, which need no GitHub setup:

```yaml
hypoStage:
  agents:
    defaultModel: gemini-flash
    providers:
      google: { apiKey: ${GOOGLE_API_KEY} }
    models:
      - { key: gemini-flash, provider: google, modelId: gemini-3.5-flash }
    coach: { enabled: true }
    planner: { enabled: true }
```

PR analysis and the GitHub issue flows additionally need a token, a webhook and the repositories to analyze — see the user guide.

## Documentation

- [User guide](https://github.com/ArchHypo/hypo-stage/blob/main/docs/agents/user-guide.md) — how each feature works, setup, how to try it and what to expect
- [Developer guide](https://github.com/ArchHypo/hypo-stage/blob/main/docs/agents/developer-guide.md) — architecture, building blocks and recipes for new agentic features

## License

Apache-2.0
