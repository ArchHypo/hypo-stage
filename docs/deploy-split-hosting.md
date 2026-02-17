# Deploy Standalone (Split Hosting)

Deploy the HypoStage frontend to **Vercel** and the backend to **Render** (or Railway). The frontend calls the real backend API instead of the mock.

## Overview

| Component | Host | URL example |
|-----------|------|-------------|
| Frontend | Vercel | `https://hypo-stage-hypo-stage.vercel.app` |
| Backend  | Render or Railway | `https://<service>.onrender.com` or `https://<service>.railway.app` |

## 1. Deploy the backend (Render)

### Create a Render Web Service

1. Go to [render.com](https://render.com) and connect your repo.
2. Create a **Web Service**.
3. Configure:
   - **Root directory**: (leave empty; build from repo root)
   - **Build command**: `yarn install --ignore-engines && yarn build:types && cd hypo-stage-backend && yarn install && yarn build`
   - **Start command**: `cd hypo-stage-backend && node dev/index.js` (or `yarn start` if configured)
4. Add **PostgreSQL** from Render's dashboard (or use an external database).
5. Set **Environment variables**:
   - **`BACKSTAGE_CONFIG_PATH`** = `../app-config.production.yaml` (required — points to the committed config at repo root; start command runs from `hypo-stage-backend`)
   - Render sets `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` when you add Postgres; it also sets `RENDER_EXTERNAL_URL` for your service URL.

The repo includes **`app-config.production.yaml`** at the root. The backend injects `--config` from `BACKSTAGE_CONFIG_PATH` into the process so Backstage’s config loader uses this file instead of the default `app-config.yaml` (which is gitignored and not present on Render).

### Backend config for production

The file **`app-config.production.yaml`** at the repo root is committed and uses env var substitution:

See **`app-config.production.yaml`** in the repo. It uses `${RENDER_EXTERNAL_URL}` for `backend.baseUrl` (set automatically by Render) and `${PGHOST}`, `${PGPORT}`, etc. for the database (set when you attach Postgres). No need to create a new file — set `BACKSTAGE_CONFIG_PATH=../app-config.production.yaml` so the backend loads it.

### Alternative: Railway

You can deploy the backend on [Railway](https://railway.app) instead of Render:

1. Connect your repo and create a new **Service** from the `hypo-stage-backend` directory (or repo root with custom build).
2. Add **PostgreSQL** from Railway's marketplace.
3. Configure build: `yarn install --ignore-engines && yarn build:types && cd hypo-stage-backend && yarn install && yarn build`.
4. Start: `cd hypo-stage-backend && node dev/index.js`.
5. Set `VITE_BACKEND_URL` to the Railway service URL (e.g. `https://<service>.railway.app`).

Use the same `app-config.production.yaml` structure, and ensure CORS allows `https://hypo-stage-hypo-stage.vercel.app`.

### Seed the backend

After the backend is live, run the seed once (from your machine or a one-off job):

```bash
BACKSTAGE_CONFIG_PATH=app-config.production.yaml make seed-standalone
```

(Ensure `app-config.production.yaml` has the correct database connection.)

## 2. Configure Vercel (frontend)

### Connect the repo

1. Go to [vercel.com](https://vercel.com) and import your GitHub repo.
2. Vercel detects `vercel.json` at the repo root and uses it for build and output.

### Add the backend URL

1. In the Vercel project: **Settings** → **Environment Variables**.
2. Add: `VITE_BACKEND_URL` = `https://<your-backend>.onrender.com` (no trailing slash).

### Deploy

On push to `main` (or your production branch), Vercel builds and deploys automatically. The frontend will call the backend at `https://<your-backend>.onrender.com/api/hypo-stage` when `VITE_BACKEND_URL` is set.

## 3. CORS on the backend

The backend **must** allow the frontend origin in CORS. Set:

- `backend.cors.origin: https://hypo-stage-hypo-stage.vercel.app` (or your custom Vercel domain, e.g. `https://<project>.vercel.app`)

## Without VITE_BACKEND_URL

If the environment variable is not set, the frontend falls back to the **mock API** with embedded seed data (read-only). No backend is required.
