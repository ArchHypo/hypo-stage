# Standalone Demo: How We Deployed It

This document explains **how we deployed the standalone version** of HypoStage that runs at [https://hypo-stage-hypo-stage.vercel.app](https://hypo-stage-hypo-stage.vercel.app). It is intended for **developers curious about the plugin** who want a concrete, navigable sense of the tool in action.

> **Not for production.** This deployment is **not meant for production use**. It is an alternative way to see the plugin at work—a live demo with seed data, hosted for convenience. For production, integrate HypoStage into your Backstage app and deploy with your own infrastructure.

---

## What’s Deployed

| Component | Host | Purpose |
|-----------|------|---------|
| Frontend | Vercel | Serves the HypoStage UI (Vite build) |
| Backend  | Render | Serves the REST API and connects to Postgres |

The frontend calls the backend API. The backend uses a PostgreSQL database with seed data (hypotheses, technical planning, evolution events) so visitors can explore the plugin without creating data.

---

## How It Was Set Up

### Backend (Render)

1. **Web service** created from the repo.
2. **PostgreSQL** added via Render’s database offering.
3. **Build**: `yarn install --ignore-engines && yarn build:types && cd hypo-stage-backend && yarn install && yarn build`
4. **Start**: `cd hypo-stage-backend && node dev/index.js`
5. **Environment**: `BACKSTAGE_CONFIG_PATH=../app-config.production.yaml` so the backend loads the committed production config (env var substitution for DB and base URL).
6. **CORS**: `backend.cors.origin` allows the Vercel frontend URL.

The repo’s `app-config.production.yaml` at the root is committed and uses `${RENDER_EXTERNAL_URL}`, `${PGHOST}`, etc.

### Frontend (Vercel)

1. **Import** the repo into Vercel.
2. **Build** uses `vercel.json` at the repo root.
3. **Environment variable**: `VITE_BACKEND_URL` set to the Render backend URL (no trailing slash). The build **requires** this so the deployed app always talks to the backend, never static demo data.
4. **Deploy** on push to `main`.

### Seed Data

After the backend was live, we ran the seed once so the database has demo hypotheses and technical planning:

```bash
BACKSTAGE_CONFIG_PATH=app-config.production.yaml make seed-standalone
```

---

## Why This Approach?

- **Frontend + backend separate** — Keeps the demo simple: Vite frontend on Vercel, Node backend on Render.
- **Real API** — Visitors see the full flow (list, create, edit, technical planning, evolution chart).
- **No Backstage app** — You can explore HypoStage without running a full Backstage instance locally.

Again: this is a **demo deployment** for curiosity and evaluation, not a production setup.
