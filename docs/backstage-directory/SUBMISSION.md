# Adding HypoStage to the Official Backstage Plugin Directory

This guide walks through submitting HypoStage to the [Backstage Plugin Directory](https://backstage.io/plugins/) and includes pre-submission checks based on the [official documentation](https://backstage.io/docs/plugins/add-to-directory).

## Prerequisites

Before submitting a PR to the Backstage repository, ensure the following are complete:

### 1. Publish to NPM (Required)

- [ ] **Create NPM scope**: Create an [NPM organization](https://www.npmjs.com/org/create) named `archhypo` (or use your preferred scope that matches your GitHub org).
- [ ] **Publish both packages** as public:
  - `@archhypo/plugin-hypo-stage` (frontend)
  - `@archhypo/plugin-hypo-stage-backend` (backend)
- [ ] **Repository link on NPM**: Ensure each package's NPM page has a link back to https://github.com/ArchHypo/hypo-stage (set via `repository` in `package.json`).
- [x] **Remove `private: true`** — Done; packages are ready for publishing.

> **Tip**: Use an NPM scope that matches your organization name (`@archhypo`) — this builds trust per Backstage's submission guidelines.

### 2. Package Name Migration

✅ Complete. Packages use `@archhypo/plugin-hypo-stage` and `@archhypo/plugin-hypo-stage-backend`. `backstage.pluginId` and `backstage.pluginPackages` are set (via `backstage-cli repo fix --publish`). A root `tsconfig.json` exists for prepack.

### 3. Fix `repository.directory` in package.json

The `repository` field in `package.json` should point to the correct subdirectory in the monorepo:

- **hypo-stage/package.json**: `"directory": "hypo-stage"` (not `plugins/hypo-stage`)
- **hypo-stage-backend/package.json**: `"directory": "hypo-stage-backend"` (not `plugins/hypo-stage-backend`)

This ensures NPM displays the correct repository link.

### 4. Documentation Checklist

- [x] **README** includes screenshots (you have walkthrough GIFs in [real-usage-walkthrough.md](../real-usage-walkthrough.md)).
- [x] **Backend requirement** is clearly mentioned — the main README states that the backend plugin must be installed.
- [ ] **Icon** (optional): If you add a custom icon, ensure you have rights to use it. Otherwise, the directory will use the default Backstage logo.

---

## Submitting the PR to Backstage

1. **Fork and clone** the [Backstage repository](https://github.com/backstage/backstage).

2. **Copy the YAML file** from this repo into the Backstage microsite:
   ```bash
   cp docs/backstage-directory/hypo-stage.yaml /path/to/backstage/microsite/data/plugins/
   ```

3. **Update the YAML** in your PR:
   - Ensure `npmPackageName` matches your published NPM package exactly (e.g. `'@archhypo/plugin-hypo-stage'`).
   - If you published with a different scope, update accordingly.
   - Add `iconUrl` if you contributed an icon to Backstage's `microsite/static/img/` (e.g. `iconUrl: /img/hypo-stage.svg`).

4. **Validate the YAML** from the Backstage repo root:
   ```bash
   cd /path/to/backstage
   yarn install
   node ./scripts/verify-plugin-directory.js
   ```

5. **Create a PR** against `backstage/backstage` with the new `microsite/data/plugins/hypo-stage.yaml` file. Use a descriptive title such as: "Add HypoStage plugin to directory".

---

## Submission Tips (from Backstage docs)

| Tip | Status |
|-----|--------|
| Include screenshots in documentation | ✅ [Real usage walkthrough](../real-usage-walkthrough.md) has multiple GIFs |
| Link docs to frontend, mention backend requirement | ✅ README covers both |
| Use NPM scope matching org/user | 🔲 Publish as `@archhypo/plugin-hypo-stage` |
| NPM package links back to repo | 🔲 Verify in package.json `repository` |
| Package is public on NPM | 🔲 Publish with `"access": "public"` |
| Icon rights (if custom) | ✅ Omitting iconUrl uses default |

---

## YAML Field Reference

The plugin directory entry requires these fields (see [verify-plugin-directory.js](https://github.com/backstage/backstage/blob/master/scripts/verify-plugin-directory.js) for validation):

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Display name of the plugin |
| `author` | string | Author or organization name |
| `authorUrl` | string | URL (e.g. GitHub profile, company site) |
| `category` | string | Single category (e.g. Discovery, CI, Monitoring) |
| `description` | string | Max 170 characters |
| `documentation` | string | URL to documentation (e.g. GitHub README) |
| `iconUrl` | string (optional) | Logo URL; omit for default |
| `npmPackageName` | string | Frontend NPM package name (quoted) |
| `addedDate` | string | Date in `'YYYY-MM-DD'` format |
