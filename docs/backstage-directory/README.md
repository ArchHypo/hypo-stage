# Backstage Plugin Directory

Materials for listing **HypoStage** on the [official Backstage Plugin Directory](https://backstage.io/plugins/).

## Current status

| Stage | State |
|-------|--------|
| **NPM** | **v1.0.0** published for both [`@archhypo/plugin-hypo-stage`](https://www.npmjs.com/package/@archhypo/plugin-hypo-stage) and [`@archhypo/plugin-hypo-stage-backend`](https://www.npmjs.com/package/@archhypo/plugin-hypo-stage-backend). |
| **HypoStage repo (this folder)** | Directory YAML and submission guide updated for upstream `verify-plugin-directory.js` (includes `status: active`, `iconUrl`, README `documentation` URL). |
| **Upstream `backstage/backstage`** | Directory PR opened from [ArchHypo/backstage](https://github.com/ArchHypo/backstage); track [backstage/backstage#33853](https://github.com/backstage/backstage/pull/33853). See [SUBMISSION.md](./SUBMISSION.md). |

## Activities performed (HypoStage repo)

- **SemVer 1.0.0** released to npm; packages public with `repository` / `directory` metadata.
- **`hypo-stage.yaml`** prepared for the microsite: `title`, `author`, `authorUrl`, `category: Discovery`, `description` (within length limits), `documentation` → README at **`v1.0.0`** (stable tag URL), `npmPackageName` → frontend package, **`status: active`**, **`addedDate`** (set when the directory entry was prepared; adjust if Backstage maintainers request the merge date), **`iconUrl`** → repo-hosted PNG under [icon/](./icon/) (stable `raw.githubusercontent.com` URL on `main`).
- **`SUBMISSION.md`** expanded with prerequisite checklists, fork/clone/validate/PR steps, **DCO (`git commit -s`)** and rebase remediation, **YAML sync** with the open Backstage PR, Copilot-driven **`documentation`** / **`iconUrl`** choices, and a suggested PR body for `backstage/backstage`.
- **Tracking PR:** [HypoStage #37 — directory docs & YAML](https://github.com/ArchHypo/hypo-stage/pull/37) (merge to `main` so this folder on the default branch matches what you copy into Backstage).

## Files in this folder

| File | Purpose |
|------|---------|
| [hypo-stage.yaml](./hypo-stage.yaml) | Copy into **Backstage** at `microsite/data/plugins/hypo-stage.yaml` when you open the directory PR. |
| [icon/hypo-stage.png](./icon/hypo-stage.png) | Plugin directory icon (ArchHypo branding); referenced by `iconUrl` in the YAML once this path exists on `main`. |
| [SUBMISSION.md](./SUBMISSION.md) | Full checklist, validation, DCO sign-off, YAML sync, suggested upstream PR text, and **activity log**. |

## After the Backstage directory PR merges

1. Note the **merged** `hypo-stage.yaml` from `backstage/backstage` (reviewers may change `addedDate`, `iconUrl`, or copy).
2. **Sync** any accepted edits back into this repo’s [hypo-stage.yaml](./hypo-stage.yaml) and add a short line to the **Activity log** in [SUBMISSION.md](./SUBMISSION.md).
3. Optionally add a link to the merged Backstage PR in this README’s activity section.
