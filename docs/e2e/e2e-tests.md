# End-to-end tests (Playwright)

This document describes the Playwright E2E test suite for HypoStage. For a quick start, see the [End-to-end tests (Playwright)](../../README.md#end-to-end-tests-playwright) section in the root README.

**Note:** E2E tests are **not** run as part of `make check` (they are expensive and require the app to be running). `make check` runs build, unit tests, and lint only. The **`e2e/`** and **`scripts/`** directories are included in **`yarn lint`** / **`make lint`** (lint only, no test execution).

---

## Prerequisites

- **App running**: Backend on port 7007, frontend on port 3000 (e.g. [Run standalone](../../README.md#run-standalone-no-backstage-app-required)).
- **Seed data** (recommended): Run `make seed-standalone` from the repo root so the list and detail tests have hypotheses to work with.
- **Browsers**: Run `npx playwright install` once to install Chromium (and optionally other browsers).

---

## Running tests

From the **repo root**. First-time setup: ensure dependencies are installed (`yarn install`) and browsers are installed (`npx playwright install`). Start the app (e.g. [Run standalone](../../README.md#run-standalone-no-backstage-app-required)) before running E2E.

| Command | Description |
|--------|--------------|
| `yarn test:e2e` | Run all E2E tests headlessly. |
| `yarn test:e2e:ui` | Open the Playwright UI to run and debug tests. |
| `yarn test:e2e:headed` | Run all E2E tests with a visible browser window. |

**Run a single test** by name (substring match):

```bash
npx playwright test -g "shows Welcome"
```

**Run a single test with a visible browser** (useful for debugging):

```bash
npx playwright test -g "shows Welcome" --headed
```

**Run a single file** (by scenario/domain):

```bash
npx playwright test e2e/hypo-stage.spec.js
npx playwright test e2e/home-dashboard.spec.js
npx playwright test e2e/create-hypothesis.spec.js
npx playwright test e2e/view-hypothesis-detail.spec.js
npx playwright test e2e/edit-hypothesis.spec.js
npx playwright test e2e/delete-hypothesis.spec.js
npx playwright test e2e/technical-planning.spec.js
```

---

## Test artifacts

| Location | Content |
|----------|--------|
| `e2e/e2e-videos/` | Video recording of each test run (one folder per test; each contains `video.webm`). **Gitignored.** |
| `docs/e2e/walkthrough-videos/` | Stable walkthrough clips (WebM + GIF) for [Real usage walkthrough](../real-usage-walkthrough.md). **Committed.** |
| `e2e/e2e-report/` | HTML report; open `index.html` in a browser after a run. Gitignored. |

Videos are written into **hashed folders** under `e2e/e2e-videos/`. After running tests, copy the latest recordings into `docs/e2e/walkthrough-videos/` so the walkthrough doc links work:

```bash
node scripts/copy-walkthrough-videos.js
```

Or run tests and copy in one go:

```bash
yarn test:e2e:walkthrough
```

**Generate GIFs for GitHub:** The walkthrough page uses animated GIFs so clips play inline on GitHub (WebM does not). After copying WebM clips, generate GIFs with:

```bash
yarn walkthrough:gif
```

This runs `scripts/webm-to-gif.js` and requires [ffmpeg](https://ffmpeg.org/) on your PATH. Output: `walkthrough-1-home.gif` … `walkthrough-6-delete.gif` in `docs/e2e/walkthrough-videos/`.

---

## What's covered

The suite validates the [Real usage walkthrough](../../README.md#real-usage-walkthrough) and all main plugin capabilities:

- **Home page & dashboard**: Welcome, Create button, Overview stats, Where to focus, Uncertainty & impact, filters (Team, Component, Focus), hypothesis list.
- **Filtering**: Applying the Team filter (and visibility of Component/Focus).
- **Create hypothesis**: All required fields, submit, redirect to list.
- **View hypothesis detail**: Statement, assessment, technical planning, Edit/Delete actions.
- **Edit hypothesis**: Open edit page, change status (e.g. to Validated), submit, return to detail.
- **Delete hypothesis**: From detail page (type statement to confirm, redirect to list) and from list (row delete icon, type statement to confirm).
- **Technical planning**: Add item (Owner, Action type, Target date, Description, Expected outcome, Documentation URL); edit item; delete item (with confirmation).

---

## Test files (by scenario / domain)

The E2E suite is split into one file per scenario or domain. Each file has a short header comment describing what it covers and which part of the [Real usage walkthrough](../../README.md#real-usage-walkthrough) it corresponds to.

| File | Domain | Description |
|------|--------|-------------|
| `e2e/hypo-stage.spec.js` | Smoke | Home page, Create button, create page loads. |
| `e2e/home-dashboard.spec.js` | Home & dashboard | Landing page: Welcome, Overview stats, Where to focus, Uncertainty & impact, filters (Team, Component, Focus), and navigation from list to detail. Walkthrough § 1. |
| `e2e/create-hypothesis.spec.js` | Create hypothesis | Create flow: form fields (Entity References, Statement, Source Type, Uncertainty, Impact, Quality Attributes, etc.), submit, redirect to list. Walkthrough § 2. |
| `e2e/view-hypothesis-detail.spec.js` | View detail | Hypothesis detail page: Statement, Assessment, Technical Planning, action bar (Back, Edit, Delete), optional Quality Attributes / Related Artefacts. Walkthrough § 3. |
| `e2e/edit-hypothesis.spec.js` | Edit hypothesis | Edit flow: open edit page, change Status (e.g. Validated), submit, return to detail. Walkthrough § 4. |
| `e2e/delete-hypothesis.spec.js` | Delete hypothesis | Delete from detail (action bar) and from list (row icon); both require typing the hypothesis statement to confirm. |
| `e2e/technical-planning.spec.js` | Technical planning | Add, edit, and delete technical planning items on a hypothesis (Owner, Action type, Target date, Description, Expected outcome, Documentation URLs). Walkthrough § 5. |

**Configuration:** `playwright.config.ts` at the repo root. E2E spec files are JavaScript (`.spec.js`) so root lint does not require TypeScript tooling and avoids conflicts with the workspace Backstage ESLint setup. Base URL defaults to `http://localhost:3000`; override with the `BASE_URL` environment variable (e.g. for the deployed app). Chromium, video on, report and videos under `e2e/`.

---

## Scheduled E2E (GitHub Actions)

The workflow **E2E (scheduled)** (`.github/workflows/e2e-scheduled.yml`) runs the full E2E suite **once a week** (Sunday 00:00 UTC) against the deployed demo app:

- **Target:** [https://hypo-stage-hypo-stage.vercel.app](https://hypo-stage-hypo-stage.vercel.app) (Vercel).
- **Trigger:** `schedule` (cron `0 0 * * 0`) and **manual** (`workflow_dispatch` from the Actions tab).
- **Artifacts:** On failure, the HTML report and videos are uploaded for 7 days.

To run the same tests locally against the deployed app:

```bash
BASE_URL=https://hypo-stage-hypo-stage.vercel.app yarn test:e2e
```
