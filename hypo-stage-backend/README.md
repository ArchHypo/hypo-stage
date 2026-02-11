# HypoStage Backend

HypoStage is an [ArchHypo](https://github.com/ArchHypo) plugin for Backstage.

## Installation

This plugin is installed via the `@internal/plugin-hypo-stage-backend` package. To install it to your backend package, run the following command:

```bash
# From your root directory
yarn --cwd packages/backend add @internal/plugin-hypo-stage-backend
```

Then add the plugin to your backend in `packages/backend/src/index.ts`:

```ts
const backend = createBackend();
// ...
backend.add(import('@internal/plugin-hypo-stage-backend'));
```
