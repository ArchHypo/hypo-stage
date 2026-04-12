# Adding HypoStage to the Official Backstage Plugin Directory

This guide walks through submitting HypoStage to the [Backstage Plugin Directory](https://backstage.io/plugins/) and includes pre-submission checks based on the [official documentation](https://backstage.io/docs/plugins/add-to-directory).

## Context and activity log

**Goal:** List HypoStage on the official plugin directory with correct npm packages, docs link, and icon.

**Performed in this repository (HypoStage)**

| When | What |
|------|------|
| **npm v1.0.0** | Both `@archhypo/plugin-hypo-stage` and `@archhypo/plugin-hypo-stage-backend` published publicly; install docs and README updated on `main`. |
| **Directory YAML** | [hypo-stage.yaml](./hypo-stage.yaml) updated for current Backstage validation: required **`status: active`**, **`documentation`** → README at Git tag **`v1.0.0`** (stable `blob/v1.0.0/README.md` URL; bump tag in YAML when you cut a new directory-relevant release), **`iconUrl`** → stable `raw.githubusercontent.com` URL for [icon/hypo-stage.png](./icon/hypo-stage.png) on **`main`** (merge this branch before the directory URL resolves), **`npmPackageName`** → frontend package, **`addedDate`** set for the prepared listing (change if upstream wants the merge date). |
| **Docs refresh** | This guide and [README.md](./README.md) updated with checklists, upstream PR steps, and suggested PR body for `backstage/backstage`. |
| **HypoStage PR** | Example tracking PR: [ArchHypo/hypo-stage#36](https://github.com/ArchHypo/hypo-stage/pull/36) — merge so `docs/backstage-directory/` on `main` is the source of truth before copying YAML upstream. |
| **Backstage fork + PR** | Fork: [ArchHypo/backstage](https://github.com/ArchHypo/backstage). Branch `add-hypo-stage-plugin-directory` pushed from `BACKSTAGE_ROOT=~/devs/backstage` (remotes: `origin` → fork, `upstream` → `backstage/backstage`). Upstream directory PR: [backstage/backstage#33853](https://github.com/backstage/backstage/pull/33853). Follow-up: `iconUrl` switched to HypoStage `main` raw PNG after [icon/hypo-stage.png](./icon/hypo-stage.png) is merged (addresses Copilot feedback on hotlinked avatar query params). |

**Still to do (outside this repo)**

1. Address review on [backstage/backstage#33853](https://github.com/backstage/backstage/pull/33853) (e.g. further `iconUrl` tweaks if requested).
2. After merge, **sync** the final YAML (and this log) back here.

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
- [x] **Icon** — [icon/hypo-stage.png](./icon/hypo-stage.png) lives in this repo; [hypo-stage.yaml](./hypo-stage.yaml) sets `iconUrl` to its **`main`** raw URL (no transient avatar query strings). *If* upstream prefers an asset inside Backstage, add `microsite/static/img/hypo-stage.png` there and switch `iconUrl` to `/img/hypo-stage.png`.

### 5. Directory YAML (`hypo-stage.yaml`)

The file in this folder matches current [verify-plugin-directory.js](https://github.com/backstage/backstage/blob/master/scripts/verify-plugin-directory.js) expectations:

| Field | HypoStage value |
|-------|-----------------|
| `status` | **`active`** (required upstream) |
| `addedDate` | Date of the directory PR (update if yours differs) |
| `documentation` | README at tag `v1.0.0` (`blob/v1.0.0/README.md`) |
| `iconUrl` | Optional; stable absolute URL (e.g. raw file on default branch) or `/img/...` on microsite |

---

## Submitting the PR to `backstage/backstage`

Use a **separate clone** of Backstage (not inside the HypoStage tree). Example paths used in practice:

```bash
export HYPOSTAGE_ROOT="$HOME/devs/hypo-stage"
export BACKSTAGE_ROOT="$HOME/devs/backstage"
```

Adjust if your directories differ.

### 1. Fork, clone, and remotes

1. Fork [backstage/backstage](https://github.com/backstage/backstage) on GitHub (your account or org).
2. Clone **the fork** (replace `<you>`):

```bash
git clone https://github.com/<you>/backstage.git "$BACKSTAGE_ROOT"
cd "$BACKSTAGE_ROOT"
git remote add upstream https://github.com/backstage/backstage.git
git fetch upstream
git checkout -b add-hypo-stage-plugin-directory upstream/master
```

If you already cloned **upstream** by mistake, point `origin` at your fork before pushing (do **not** push a contributor branch directly to `backstage/backstage`):

```bash
cd "$BACKSTAGE_ROOT"
git remote rename origin upstream
git remote add origin https://github.com/<you>/backstage.git
git fetch upstream && git checkout -b add-hypo-stage-plugin-directory upstream/master
```

### 2. Copy the directory YAML

From the HypoStage repo (source of truth on `main`):

```bash
cp "$HYPOSTAGE_ROOT/docs/backstage-directory/hypo-stage.yaml" \
  "$BACKSTAGE_ROOT/microsite/data/plugins/hypo-stage.yaml"
```

Alternatively, paste the contents of [hypo-stage.yaml](./hypo-stage.yaml) into that path in the Backstage repo.

### 3. Node and validate locally

Backstage’s Yarn 4 install expects **Node ≥ 18.12** (use **Node 20 LTS** if unsure):

```bash
cd "$BACKSTAGE_ROOT"
node -v   # e.g. v20.x
yarn install
node ./scripts/verify-plugin-directory.js
```

The verify script only needs `fs-extra`, `js-yaml`, and `zod` from the repo’s dependencies. If `yarn install` fails on **optional native builds** (for example `isolated-vm` on some macOS setups) but those packages are already present under `node_modules`, you can still run `node ./scripts/verify-plugin-directory.js` and fix any **schema** errors it prints. The PR’s CI is the final gate; resolve install issues if reviewers or CI require a clean install.

### 4. Commit

```bash
cd "$BACKSTAGE_ROOT"
git add microsite/data/plugins/hypo-stage.yaml
git commit -m "Add HypoStage plugin to plugin directory"
```

### 5. Push and open the PR

Push to **`origin`** on **your fork**, then open a PR against **`backstage/backstage`** default branch (`master` at time of writing):

```bash
git push -u origin add-hypo-stage-plugin-directory
```

Or open the PR in the browser from your fork’s branch page (**Compare & pull request** → base repository **backstage/backstage**, base branch **`master`**).

With [GitHub CLI](https://cli.github.com/), after `gh auth login`:

```bash
cd "$BACKSTAGE_ROOT"
gh pr create --repo backstage/backstage --base master --head <you>:add-hypo-stage-plugin-directory \
  --title "Add HypoStage plugin to plugin directory" \
  --body-file /path/to/pr-body.md
```

Put the markdown from the next subsection into `pr-body.md` (or paste it in the web form).

### 6. Suggested PR title and description

**Title:** `Add HypoStage plugin to plugin directory`

**Description** (edit links if needed):

```markdown
## Plugin

**HypoStage** — architectural hypothesis management for Backstage: uncertainty/impact, quality attributes, technical planning, catalog integration.

- **NPM (frontend):** https://www.npmjs.com/package/@archhypo/plugin-hypo-stage  
- **NPM (backend):** https://www.npmjs.com/package/@archhypo/plugin-hypo-stage-backend  
- **Docs (tagged README):** https://github.com/ArchHypo/hypo-stage/blob/v1.0.0/README.md  
- **Repo:** https://github.com/ArchHypo/hypo-stage  

Both packages are public at **v1.0.0**; install the same version of frontend + backend.

## Checklist

- [x] `microsite/data/plugins/hypo-stage.yaml` added
- [x] `node ./scripts/verify-plugin-directory.js` passes
- [x] `npmPackageName` matches published package `@archhypo/plugin-hypo-stage`
- [x] `documentation` uses a **version tag** (`blob/v1.0.0/README.md`), not default-branch `blob/main`
- [x] `iconUrl` points to repo-hosted branding on HypoStage `main` (raw.githubusercontent.com); happy to switch to `/img/...` in Backstage if preferred
```

### 7. After the Backstage PR merges

Sync this repo’s [hypo-stage.yaml](./hypo-stage.yaml) with any edits reviewers requested (e.g. `addedDate`, `documentation` tag, `iconUrl` path, wording).

---

## Submission tips (Backstage docs)

| Tip | Status |
|-----|--------|
| Screenshots / visual in docs | ✅ README hero GIF |
| Frontend + backend documented | ✅ README installation |
| NPM scope | ✅ `@archhypo` |
| Repo link on npm | ✅ `repository` in package.json |
| Public packages | ✅ |
| Icon | ✅ `iconUrl` in YAML (repo-hosted PNG on `main`) |

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
| `documentation` | string (URL) | Prefer a **version tag** (e.g. `blob/v1.0.0/README.md`) or a stable docs site URL |
| `iconUrl` | string (optional) | Relative `/img/...` on microsite or absolute URL |
| `npmPackageName` | string | **Frontend** package (quoted) |
| `addedDate` | `'YYYY-MM-DD'` | |
| `status` | `active` \| `inactive` \| `archived` | **Required** |
| `order` | number (optional) | |
| `staleSince` | date (optional) | |
