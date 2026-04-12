# 🎬 HypoStage: visual demonstration of capabilities

This page shows what HypoStage can do, with a short video for each capability. After [installing](../README.md#installation), open **Hypo Stage** in your Backstage app (sidebar or `/hypo-stage`) to try it yourself.

Clips are shown as **animated GIFs** so they play inline on GitHub; **WebM links** are provided for full-quality playback (e.g. in a new tab or when viewing the repo locally). Media files live in [`docs/walkthrough-videos/`](walkthrough-videos/README.md). To regenerate GIFs from the WebM files, run **`yarn walkthrough:gif`** from the repo root (requires [ffmpeg](https://ffmpeg.org/) on PATH).

---

## 1. 🏠 Home and dashboard

See the landing page: welcome message, **Create New Hypothesis** button, dashboard (totals by status, "Where to focus", uncertainty & impact), filters (Team, Component, Focus), and the hypotheses list.

![Home and dashboard](walkthrough-videos/walkthrough-1-home.gif)

*[Full video (WebM)](walkthrough-videos/walkthrough-1-home.webm)*

---

## 2. 📝 Create a hypothesis

Create a new hypothesis: pick entity references, write the statement, set source type, uncertainty, impact, quality attributes, optional related-artefact links and notes, then submit. You are redirected to the list and can open the new hypothesis. Related-artefact URLs are optional at creation and can be added later from **Edit Hypothesis**.

![Create a hypothesis](walkthrough-videos/walkthrough-2-create.gif)

*[Full video (WebM)](walkthrough-videos/walkthrough-2-create.webm)*

---

## 3. 👁️ View hypothesis detail

Open a hypothesis from the list to see its statement, status, assessment (uncertainty/impact), linked components, quality attributes, related artefacts, evolution chart, and technical planning. From here you can edit, add or manage technical planning, or delete (with confirmation).

![View hypothesis detail](walkthrough-videos/walkthrough-3-view-detail.gif)

*[Full video (WebM)](walkthrough-videos/walkthrough-3-view-detail.webm)*

---

## 4. ✏️ Edit a hypothesis

From the detail page, open **Edit** to change status, source type, quality attributes, related artefacts, and notes (statement and entity refs stay read-only). Uncertainty and impact can no longer be changed from the edit form — use technical planning to reassess those values. Submit with **Update Hypothesis** to return to the detail view.

![Edit a hypothesis](walkthrough-videos/walkthrough-4-edit.gif)

*[Full video (WebM)](walkthrough-videos/walkthrough-4-edit.webm)*

---

## 5. 📅 Technical planning

On a hypothesis detail page, use **Add Technical Planning** to add items: owner, action type, target date, description, expected outcome, and optional documentation links (you can add links later when editing a plan). When creating or editing a plan, you can optionally reassess uncertainty and impact (pre-filled with current values). These changes are recorded as events and shown in the evolution chart with distinct square markers and tooltips displaying the technical planning number and short ID. You can edit or delete each item; delete requires confirmation.

![Technical planning](walkthrough-videos/walkthrough-5-technical-planning.gif)

*[Full video (WebM)](walkthrough-videos/walkthrough-5-technical-planning.webm)*

---

## 6. 🗑️ Delete a hypothesis

Remove a hypothesis from the **list** (row delete icon) or from the **detail** page (**Delete** in the action bar). In both cases you must type the full hypothesis statement to confirm; then the list refreshes or you are redirected to the list.

![Delete a hypothesis](walkthrough-videos/walkthrough-6-delete.gif)

*[Full video (WebM)](walkthrough-videos/walkthrough-6-delete.webm)*

---

## 📋 Capabilities covered

| # | Capability |
|---|------------|
| 1 | Home and dashboard |
| 2 | Create a hypothesis |
| 3 | View hypothesis detail |
| 4 | Edit a hypothesis |
| 5 | Technical planning |
| 6 | Delete a hypothesis |
