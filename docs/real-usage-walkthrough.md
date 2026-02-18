# HypoStage: visual demonstration of capabilities

This page shows what HypoStage can do, with a short video for each capability. After [installing](../README.md#installation), open **Hypo Stage** in your Backstage app (sidebar or `/hypo-stage`) to try it yourself.

Clips are shown as **animated GIFs** so they play inline on GitHub; **WebM links** are provided for full-quality playback (e.g. in a new tab or when viewing the repo locally). Video files live in `docs/e2e/walkthrough-videos/`. To (re)generate GIFs from the WebM files, run `node scripts/webm-to-gif.js` (requires [ffmpeg](https://ffmpeg.org/) on PATH). The table at the bottom links capabilities to the E2E specs.

---

## 1. Home and dashboard

See the landing page: welcome message, **Create New Hypothesis** button, dashboard (totals by status, "Where to focus", uncertainty & impact), filters (Team, Component, Focus), and the hypotheses list.

![Home and dashboard](e2e/walkthrough-videos/walkthrough-1-home.gif)

*[Full video (WebM)](e2e/walkthrough-videos/walkthrough-1-home.webm)*

---

## 2. Create a hypothesis

Create a new hypothesis: pick entity references, write the statement, set source type, uncertainty, impact, quality attributes, related artefacts and notes, then submit. You are redirected to the list and can open the new hypothesis.

![Create a hypothesis](e2e/walkthrough-videos/walkthrough-2-create.gif)

*[Full video (WebM)](e2e/walkthrough-videos/walkthrough-2-create.webm)*

---

## 3. View hypothesis detail

Open a hypothesis from the list to see its statement, status, assessment (uncertainty/impact), linked components, quality attributes, related artefacts, evolution chart, and technical planning. From here you can edit, add or manage technical planning, or delete (with confirmation).

![View hypothesis detail](e2e/walkthrough-videos/walkthrough-3-view-detail.gif)

*[Full video (WebM)](e2e/walkthrough-videos/walkthrough-3-view-detail.webm)*

---

## 4. Edit a hypothesis

From the detail page, open **Edit** to change status, source type, uncertainty, impact, quality attributes, related artefacts, and notes (statement and entity refs stay read-only). Submit with **Update Hypothesis** to return to the detail view and see the evolution chart update.

![Edit a hypothesis](e2e/walkthrough-videos/walkthrough-4-edit.gif)

*[Full video (WebM)](e2e/walkthrough-videos/walkthrough-4-edit.webm)*

---

## 5. Technical planning

On a hypothesis detail page, use **Add Technical Planning** to add items: owner, action type, target date, description, expected outcome, and documentation links. You can edit or delete each item; delete requires confirmation.

![Technical planning](e2e/walkthrough-videos/walkthrough-5-technical-planning.gif)

*[Full video (WebM)](e2e/walkthrough-videos/walkthrough-5-technical-planning.webm)*

---

## 6. Delete a hypothesis

Remove a hypothesis from the **list** (row delete icon) or from the **detail** page (**Delete** in the action bar). In both cases you must type the full hypothesis statement to confirm; then the list refreshes or you are redirected to the list.

![Delete a hypothesis](e2e/walkthrough-videos/walkthrough-6-delete.gif)

*[Full video (WebM)](e2e/walkthrough-videos/walkthrough-6-delete.webm)*

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

To regenerate the clips: run the E2E suite, copy videos to the stable names, then (optionally) convert to GIF so they display on GitHub:

```bash
yarn test:e2e
node scripts/copy-walkthrough-videos.js
node scripts/webm-to-gif.js    # requires ffmpeg; produces GIFs for GitHub
```

Or use `yarn test:e2e:walkthrough` to run tests and copy in one go (then run `webm-to-gif.js` if you need to refresh the GIFs).
