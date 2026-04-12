# Adding HypoStage to the Official Backstage Plugin Directory

This guide walks through submitting HypoStage to the [Backstage Plugin Directory](https://backstage.io/plugins/) and includes pre-submission checks based on the [official documentation](https://backstage.io/docs/plugins/add-to-directory).

## Context and activity log

**Goal:** List HypoStage on the official plugin directory with correct npm packages, docs link, and icon.

**Performed in this repository (HypoStage)**

| When | What |
|------|------|
| **npm v1.0.0** | Both `@archhypo/plugin-hypo-stage` and `@archhypo/plugin-hypo-stage-backend` published publicly; install docs and README updated on `main`. |
| **Directory YAML** | [hypo-stage.yaml](./hypo-stage.yaml) updated for current Backstage validation: required **`status: active`**, **`documentation`** → README on **main** (GitHub URL), **`iconUrl`** → ArchHypo org GitHub avatar (rights: org branding), **`npmPackageName`** → frontend package, **`addedDate`** set for the prepared listing (change if upstream wants the merge date). |
| **Docs refresh** | This guide and [README.md](./README.md) updated with checklists, upstream PR steps, and suggested PR body for `backstage/backstage`. |
| **HypoStage PR** | Example tracking PR: [ArchHypo/hypo-stage#36](https://github.com/ArchHypo/hypo-stage/pull/36) — merge so `docs/backstage-directory/` on `main` is the source of truth before copying YAML upstream. |

**Still to do (outside this repo)**

1. Fork [backstage/backstage](https://github.com/backstage/backstage), copy `hypo-stage.yaml` to `microsite/data/plugins/`, run `node ./scripts/verify-plugin-directory.js`.
2. Open the directory PR; address review (e.g. host icon under `microsite/static/img/` if requested).
3. After merge, **sync** the final YAML (and this log) back here.

---

## Prerequisites (HypoStage repo — status)

Before submitting a PR to the Backstage repository, ensure the following are complete:

### 1. Publish to NPM (Required)

- [x] **NPM scope** `@archhypo` with public packages.
- [x] **Publish both packages** as public (current line: **1.0.0**):
  - [@archhypo/plugin-hypo-stage](https://www.npmjs.com/package/@archhypo/plugin-hypo-stage) (frontend)
  - [@archhypo/plugin-hypo-stage-backend](https://www.npmjs.com/package/@archhypo/plugin-hypo-stage-backend) (backend)
- [x] **Repository link on NPM** — each `package.json` has `repository.url` → `https://github.com/ArchHypo/hypo-stage` and correct `directory`.
- [x] **`private: true` removed** — packages publish with `"access": "public"`.

> **Tip**: Keep frontend and backend versions **aligned** on npm (same semver).

### 2. Package name and Backstage metadata

✅ Packages use `@archhypo/plugin-hypo-stage` and `@archhypo/plugin-hypo-stage-backend`. `backstage.pluginId` and `backstage.pluginPackages` are set. Root `tsconfig.json` supports `backstage-cli package prepack`.

### 3. `repository.directory` in package.json

- **hypo-stage/package.json**: `"directory": "hypo-stage"`
- **hypo-stage-backend/package.json**: `"directory": "hypo-stage-backend"`

### 4. Documentation and icon

- [x] **README** — illustrative GIF and install/usage docs ([README.md](../../README.md)).
- [x] **Backend requirement** — README states both frontend and backend packages must be installed.
- [x] **Icon** — [hypo-stage.yaml](./hypo-stage.yaml) sets `iconUrl` to the ArchHypo org avatar (GitHub-hosted). *If* upstream maintainers ask for a file under their repo instead, add `microsite/static/img/hypo-stage.png` (or `.svg`) in the **Backstage** PR and switch `iconUrl` to `/img/hypo-stage.png`.

### 5. Directory YAML (`hypo-stage.yaml`)

The file in this folder matches current [verify-plugin-directory.js](https://github.com/backstage/backstage/blob/master/scripts/verify-plugin-directory.js) expectations:

| Field | HypoStage value |
|-------|-----------------|
| `status` | **`active`** (required upstream) |
| `addedDate` | Date of the directory PR (update if yours differs) |
| `documentation` | README on `main` |
| `iconUrl` | Optional; set to org avatar URL |

---

## Submitting the PR to `backstage/backstage`

### 1. Fork and clone

Fork [backstage/backstage](https://github.com/backstage/backstage), clone your fork, add `upstream` if you like:

```bash
git clone https://github.com/<your-user>/backstage.git
cd backstage
git remote add upstream https://github.com/backstage/backstage.git
git fetch upstream && git checkout -b add-hypo-stage-plugin upstream/master
```

### 2. Copy the YAML

From your **hypo-stage** clone:

```bash
cp /path/to/hypo-stage/docs/backstage-directory/hypo-stage.yaml microsite/data/plugins/hypo-stage.yaml
```

Or copy the contents of [hypo-stage.yaml](./hypo-stage.yaml) into `microsite/data/plugins/hypo-stage.yaml` in the Backstage repo.

### 3. Validate locally (required)

```bash
cd /path/to/backstage
yarn install
node ./scripts/verify-plugin-directory.js
```

Fix any reported errors before opening the PR.

### 4. Commit and push

```bash
git add microsite/data/plugins/hypo-stage.yaml
git commit -m "Add HypoStage plugin to directory"
git push origin add-hypo-stage-plugin
```

### 5. Open the PR

Target **`backstage/backstage`** `master` (or default branch). Suggested **title**:

`Add HypoStage plugin to plugin directory`

Suggested **description** (edit links if needed):

```markdown
## Plugin

**HypoStage** — architectural hypothesis management for Backstage: uncertainty/impact, quality attributes, technical planning, catalog integration.

- **NPM (frontend):** https://www.npmjs.com/package/@archhypo/plugin-hypo-stage  
- **NPM (backend):** https://www.npmjs.com/package/@archhypo/plugin-hypo-stage-backend  
- **Docs / repo:** https://github.com/ArchHypo/hypo-stage  

Both packages are public at **v1.0.0**; install the same version of frontend + backend.

## Checklist

- [x] `microsite/data/plugins/hypo-stage.yaml` added
- [x] `node ./scripts/verify-plugin-directory.js` passes
- [x] `npmPackageName` matches published package `@archhypo/plugin-hypo-stage`
- [x] `iconUrl` points to permitted branding (org avatar); happy to switch to `/img/...` in this repo if preferred
```

### 6. After the Backstage PR merges

Sync this repo’s [hypo-stage.yaml](./hypo-stage.yaml) with any edits reviewers requested (e.g. `addedDate`, `iconUrl` path, wording).

---

## Submission tips (Backstage docs)

| Tip | Status |
|-----|--------|
| Screenshots / visual in docs | ✅ README hero GIF |
| Frontend + backend documented | ✅ README installation |
| NPM scope | ✅ `@archhypo` |
| Repo link on npm | ✅ `repository` in package.json |
| Public packages | ✅ |
| Icon | ✅ `iconUrl` in YAML (avatar URL) |

---

## YAML field reference

Upstream validation (see `scripts/verify-plugin-directory.js`):

| Field | Type | Notes |
|-------|------|--------|
| `title` | string | Display name |
| `author` | string | |
| `authorUrl` | string (URL) | |
| `category` | string | Single category |
| `description` | string | **Max ~170 characters** on the site |
| `documentation` | string (URL) | e.g. README on GitHub |
| `iconUrl` | string (optional) | Relative `/img/...` on microsite or absolute URL |
| `npmPackageName` | string | **Frontend** package (quoted) |
| `addedDate` | `'YYYY-MM-DD'` | |
| `status` | `active` \| `inactive` \| `archived` | **Required** |
| `order` | number (optional) | |
| `staleSince` | date (optional) | |
