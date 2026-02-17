# HypoStage: visual demonstration of capabilities

This page shows what HypoStage can do, with a short video for each capability. After [installing](../README.md#installation), open **Hypo Stage** in your Backstage app (sidebar or `/hypo-stage`) to try it yourself.

Each clip is a recording from the E2E test suite; the table at the bottom links capabilities to the corresponding E2E specs and how to run them. Video files live in `docs/e2e/walkthrough-videos/`.

---

## 1. Home and dashboard

See the landing page: welcome message, **Create New Hypothesis** button, dashboard (totals by status, “Where to focus”, uncertainty & impact), filters (Team, Component, Focus), and the hypotheses list.

<video src="e2e/walkthrough-videos/walkthrough-1-home.webm" controls width="640">Your browser does not support the video tag.</video>

*[Open video](e2e/walkthrough-videos/walkthrough-1-home.webm)*

---

## 2. Create a hypothesis

Create a new hypothesis: pick entity references, write the statement, set source type, uncertainty, impact, quality attributes, related artefacts and notes, then submit. You are redirected to the list and can open the new hypothesis.

<video src="e2e/walkthrough-videos/walkthrough-2-create.webm" controls width="640">Your browser does not support the video tag.</video>

*[Open video](e2e/walkthrough-videos/walkthrough-2-create.webm)*

---

## 3. View hypothesis detail

Open a hypothesis from the list to see its statement, status, assessment (uncertainty/impact), linked components, quality attributes, related artefacts, evolution chart, and technical planning. From here you can edit, add or manage technical planning, or delete (with confirmation).

<video src="e2e/walkthrough-videos/walkthrough-3-view-detail.webm" controls width="640">Your browser does not support the video tag.</video>

*[Open video](e2e/walkthrough-videos/walkthrough-3-view-detail.webm)*

---

## 4. Edit a hypothesis

From the detail page, open **Edit** to change status, source type, uncertainty, impact, quality attributes, related artefacts, and notes (statement and entity refs stay read-only). Submit with **Update Hypothesis** to return to the detail view and see the evolution chart update.

<video src="e2e/walkthrough-videos/walkthrough-4-edit.webm" controls width="640">Your browser does not support the video tag.</video>

*[Open video](e2e/walkthrough-videos/walkthrough-4-edit.webm)*

---

## 5. Technical planning

On a hypothesis detail page, use **Add Technical Planning** to add items: owner, action type, target date, description, expected outcome, and documentation links. You can edit or delete each item; delete requires confirmation.

<video src="e2e/walkthrough-videos/walkthrough-5-technical-planning.webm" controls width="640">Your browser does not support the video tag.</video>

*[Open video](e2e/walkthrough-videos/walkthrough-5-technical-planning.webm)*

---

## 6. Delete a hypothesis

Remove a hypothesis from the **list** (row delete icon) or from the **detail** page (**Delete** in the action bar). In both cases you must type the full hypothesis statement to confirm; then the list refreshes or you are redirected to the list.

<video src="e2e/walkthrough-videos/walkthrough-6-delete.webm" controls width="640">Your browser does not support the video tag.</video>

*[Open video](e2e/walkthrough-videos/walkthrough-6-delete.webm)*

---

## Capabilities ↔ E2E specs

| # | Capability              | E2E spec                          |
|---|--------------------------|------------------------------------|
| 1 | Home and dashboard       | `e2e/home-dashboard.spec.js`      |
| 2 | Create a hypothesis      | `e2e/create-hypothesis.spec.js`   |
| 3 | View hypothesis detail   | `e2e/view-hypothesis-detail.spec.js` |
| 4 | Edit a hypothesis        | `e2e/edit-hypothesis.spec.js`     |
| 5 | Technical planning       | `e2e/technical-planning.spec.js`   |
| 6 | Delete a hypothesis      | `e2e/delete-hypothesis.spec.js`   |

To regenerate the clips: run the E2E suite then copy videos to the stable names so the links above keep working (see [E2E tests](e2e/e2e-tests.md#test-artifacts)):

```bash
yarn test:e2e
node scripts/copy-walkthrough-videos.js
```

Or use `yarn test:e2e:walkthrough` to run tests and copy in one go.
