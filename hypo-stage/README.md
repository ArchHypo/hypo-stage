# HypoStage (Frontend Plugin)

Architectural hypothesis management for [Backstage](https://backstage.io). Create, track, and validate architectural assumptions with uncertainty assessment, quality attributes, and technical planning.

**Package:** `@archhypo/plugin-hypo-stage`

> **Important:** This package requires the backend plugin `@archhypo/plugin-hypo-stage-backend` to be installed and configured in the same Backstage app.

---

## Features

- **Hypothesis management** — Create, edit, view, and delete architectural hypotheses
- **Uncertainty & impact** — Likert-scale assessment with evolution tracking
- **Quality attributes** — Associate hypotheses with performance, security, maintainability, etc.
- **Technical planning** — Link experiments, spikes, and tasks to hypotheses
- **Catalog integration** — Optional Hypotheses tab on entity pages; filter by entity and team

---

## Compatibility

- **Backstage:** v1.16.0+
- **Node.js:** 20+
- **React:** 16.13, 17, or 18

---

## Installation

### 1. Install packages

From your Backstage app root:

```bash
yarn --cwd packages/app add @archhypo/plugin-hypo-stage
yarn --cwd packages/backend add @archhypo/plugin-hypo-stage-backend
```

### 2. Configure routes

In `packages/app/src/App.tsx`:

```tsx
import {
  HypoStagePage,
  CreateHypothesisPage,
  HypothesisPage,
  EditHypothesisPage,
} from '@archhypo/plugin-hypo-stage';

// Inside <FlatRoutes>:
<Route path="/hypo-stage" element={<HypoStagePage />} />
<Route path="/hypo-stage/create-hypothesis" element={<CreateHypothesisPage />} />
<Route path="/hypo-stage/hypothesis/:hypothesisId" element={<HypothesisPage />} />
<Route path="/hypo-stage/hypothesis/:hypothesisId/edit" element={<EditHypothesisPage />} />
```

### 3. Add sidebar entry

In `packages/app/src/components/Root/Root.tsx` (or equivalent):

```tsx
import LaptopMacIcon from '@material-ui/icons/LaptopMac';

<SidebarItem icon={LaptopMacIcon} to="hypo-stage" text="Hypo Stage" />
```

### 4. Register the frontend API

In `packages/app/src/apis.ts`:

```tsx
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { HypoStageApiClient, HypoStageApiRef } from '@archhypo/plugin-hypo-stage';

createApiFactory({
  api: HypoStageApiRef,
  deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
  factory: ({ discoveryApi, fetchApi }) =>
    new HypoStageApiClient({ discoveryApi, fetchApi }),
}),
```

### 5. Register the backend plugin

In `packages/backend/src/index.ts`:

```ts
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();
// ... other plugins ...
backend.add(import('@archhypo/plugin-hypo-stage-backend'));
backend.start();
```

### 6. Database configuration

The backend needs a database. Ensure `app-config.yaml` has a database configured. For a dedicated plugin database (recommended), add:

```yaml
backend:
  database:
    client: pg
    connection:
      host: ${POSTGRES_HOST}
      port: ${POSTGRES_PORT}
      user: ${POSTGRES_USER}
      password: ${POSTGRES_PASSWORD}
      database: backstage
    plugin:
      hypo-stage:
        connection:
          database: backstage_plugin_hypo_stage
```

For SQLite: `client: better-sqlite3`, `connection: ':memory:'` or a file path. Migrations run automatically on backend startup.

---

## Optional: Catalog entity tab

To show a "Hypotheses" tab on catalog entity pages:

1. Import `EntityHypothesesTab` and add it to your `EntityPage` (e.g. in `packages/app/src/components/catalog/EntityPage.tsx`):

```tsx
import { EntityHypothesesTab } from '@archhypo/plugin-hypo-stage';

// In the entity page layout:
<EntityLayout.Route path="/hypotheses" title="Hypotheses">
  <EntityHypothesesTab />
</EntityLayout.Route>
```

2. Control visibility with the `hypo-stage` feature flag (optional). If the Feature Flags API is not registered, the tab is visible by default.

---

## Exports and API

| Export | Description |
|--------|-------------|
| `HypoStagePage` | Main list and dashboard |
| `CreateHypothesisPage` | Create hypothesis form |
| `HypothesisPage` | Hypothesis detail and technical planning |
| `EditHypothesisPage` | Edit hypothesis form |
| `HypoStageApiRef`, `HypoStageApiClient` | API to call the backend |
| `EntityHypothesesTab` | Catalog entity tab component |
| `HypothesisForm`, `HypothesisList` | Reusable form and list components |

---

## Documentation

Full documentation, run standalone, Docker, and E2E tests: [github.com/ArchHypo/hypo-stage](https://github.com/ArchHypo/hypo-stage)
