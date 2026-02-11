# HypoStage (Frontend Plugin)

Frontend plugin for [HypoStage](https://github.com/ArchHypo/hypo-stage): architectural hypothesis management in Backstage. Provides the Hypo Stage UI, pages, and catalog entity integration.

**Package:** `@internal/plugin-hypo-stage`

## Table of contents

- [Build, test and lint](#build-test-and-lint)
- [What this package provides](#what-this-package-provides)
  - [Pages (routed)](#pages-routed)
  - [Catalog integration](#catalog-integration)
  - [API](#api)
  - [Reusable components (for custom UIs)](#reusable-components-for-custom-uis)
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
yarn install          # if not already installed from root
yarn build            # needs dist-types from root first; use root `yarn build`
yarn test
yarn lint
```

For full validation (deps, build, test, lint for both frontend and backend), use the [main README](https://github.com/ArchHypo/hypo-stage/blob/main/README.md) and run `make validate` at the repo root.

---

## What this package provides

### Pages (routed)

- **HypoStagePage** – Main list and dashboard (`/hypo-stage`)
- **CreateHypothesisPage** – Create hypothesis form
- **HypothesisPage** – Hypothesis detail and technical planning
- **EditHypothesisPage** – Edit hypothesis form

### Catalog integration

- **EntityHypothesesTab** – Tab on catalog entity pages showing hypotheses that reference the entity
- **useHypoStageTabEnabled()** – Whether the Hypo Stage tab is enabled (e.g. via feature flag)
- **HYPO_STAGE_FEATURE_FLAG** – Feature flag name: `'hypo-stage'`

### API

- **HypoStageApiRef**, **HypoStageApiClient** – Frontend API to call the HypoStage backend
- **GetHypothesesOptions** – Type for list filters (entityRef, team)

### Reusable components (for custom UIs)

- **HypothesisForm**, **HypothesisList** – Forms and list
- **EntityRefLinks** – Render entity refs as catalog links
- **EntityReferencesAutocomplete** – Catalog entity search for forms

---

## Installation into a Backstage app

1. Copy this `hypo-stage` directory into your app’s `plugins/` folder.
2. From the app root:

   ```bash
   yarn --cwd packages/app add @internal/plugin-hypo-stage
   ```

3. Add routes and sidebar entry (see [main README – Configure the frontend](https://github.com/ArchHypo/hypo-stage#step-2-configure-the-frontend)).
4. Register **HypoStageApiRef** in `packages/app/src/apis.ts` (see [main README – Configure APIs](https://github.com/ArchHypo/hypo-stage#32-register-the-frontend-api--in-packagesappsrcapits)).

Full installation and Docker usage are documented in the [repository README](https://github.com/ArchHypo/hypo-stage/blob/main/README.md).
