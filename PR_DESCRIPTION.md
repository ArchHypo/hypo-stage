# Integrate backstage-app enhancements and improve documentation

## Summary

This PR brings in the enhancements made to HypoStage while integrated in a Backstage app: new features (entity tab, dashboard, tests), standalone build and validation, documentation overhaul, and compatibility with generic Backstage instances.

---

## What's included

### Features & tests (from backstage-app)

- **Entity catalog integration**: `EntityHypothesesTab`, `EntityRefLinks`, `EntityReferencesAutocomplete`, `HypothesisListDashboard`, `QualityAttributesField`, `useHypoStageTabEnabled`, feature flags.
- **Unit tests** for frontend (API, components, hooks, utils) and backend (router, HypothesisService).
- **Jest** setup and coverage for the new code.

### Documentation

- **Table of contents** at the top of the root README and both plugin READMEs for easier navigation.
- **README overhaul**: Prerequisites, Building the project, Running tests, Code style (lint), Validating usage, Running with Docker (PostgreSQL), Installation, Usage, **Real usage walkthrough** (step-by-step flows 1–6), Compatibility, Makefile reference, API reference.
- **Single GIF placeholder** for real usage demo: add `docs/images/usage.gif` to show the plugin in action (replaces multiple screenshot placeholders).
- **Plugin READMEs** updated with build/test/lint instructions, what each package provides, installation steps, and links to the main README.
- **All cross-README links** use full GitHub URLs (`https://github.com/ArchHypo/hypo-stage`).

### Standalone build & validation

- **Makefile**: `help`, `deps`, `build`, `test`, `lint`, `validate`, `start-dependencies`, `stop-dependencies`.
- **Build**: `yarn build` runs `build:types` (TypeScript declaration emit for both packages) then Backstage CLI build. No separate Backstage app required; uses per-package `tsconfig.build.json` and a type stub for `react-markdown`.
- **Docker**: `docker-compose.yaml` with PostgreSQL for backend; `make start-dependencies` / `make stop-dependencies` to run it when validating with a Backstage app.

### Generic Backstage compatibility

- **Feature flags optional**: `useHypoStageTabEnabled()` uses `useApiHolder().get(featureFlagsApiRef)` and returns `true` when the Feature Flags API is not registered, so the Hypotheses tab is visible by default in any Backstage app.
- **Optional filter APIs**: `getEntityRefs()`, `getTeams()`, and `getReferencedEntityRefs()` return `[]` on failure so the hypothesis list and dashboard still render when catalog/team endpoints are unavailable or fail.

---

## How to test

From the repo root (Node 20+):

```bash
make deps
make build
make test
make lint
# or in one go:
make validate
```

Optional: `make start-dependencies` to start Postgres for use with a Backstage app that includes the plugin.

---

## Checklist

- [x] Lint passes (warnings only for frontend importing backend types, as before).
- [x] All tests pass (frontend + backend).
- [x] Build succeeds in the standalone repo.
- [x] README and plugin READMEs have TOC and full-GitHub links.
- [x] Single GIF placeholder in place for real usage demo; add `docs/images/usage.gif` when ready.
