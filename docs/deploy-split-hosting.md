# Deploy Standalone (Split Hosting)

Deploy the HypoStage frontend to **Vercel** and the backend to **Render** (or Railway). The frontend calls the real backend API instead of the mock.

## Overview

| Component | Host | URL example |
|-----------|------|-------------|
| Frontend | Vercel | `https://hypo-stage.vercel.app` |
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
   - `BACKSTAGE_CONFIG_PATH`: path to your config (see below)
   - Or use individual vars for database and CORS (Backstage supports `${ENV_VAR}` in config).

### Backend config for production

Create an `app-config.production.yaml` (or use env vars) with:

```yaml
backend:
  baseUrl: https://<your-backend>.onrender.com
  listen:
    port: 7007
  cors:
    origin: https://hypo-stage.vercel.app
    methods: [GET, HEAD, PATCH, POST, PUT, DELETE, OPTIONS]
    allowedHeaders: [Content-Type, Authorization, X-Requested-With, Accept]
  database:
    client: pg
    connection:
      host: ${PGHOST}
      port: ${PGPORT}
      user: ${PGUSER}
      password: ${PGPASSWORD}
      database: ${PGDATABASE}
    plugin:
      hypo-stage:
        connection:
          database: backstage_plugin_hypo_stage
```

Render provides `PGHOST`, `PGPORT`, etc. when you add a Postgres instance. Point the HypoStage plugin at the same Postgres and use a dedicated database for the plugin.

### Alternative: Railway

You can deploy the backend on [Railway](https://railway.app) instead of Render:

1. Connect your repo and create a new **Service** from the `hypo-stage-backend` directory (or repo root with custom build).
2. Add **PostgreSQL** from Railway's marketplace.
3. Configure build: `yarn install --ignore-engines && yarn build:types && cd hypo-stage-backend && yarn install && yarn build`.
4. Start: `cd hypo-stage-backend && node dev/index.js`.
5. Set `VITE_BACKEND_URL` to the Railway service URL (e.g. `https://<service>.railway.app`).

Use the same `app-config.production.yaml` structure, and ensure CORS allows `https://hypo-stage.vercel.app`.

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

- `backend.cors.origin: https://hypo-stage.vercel.app` (or your custom Vercel domain, e.g. `https://<project>.vercel.app`)

## Without VITE_BACKEND_URL

If the environment variable is not set, the frontend falls back to the **mock API** with embedded seed data (read-only). No backend is required.
