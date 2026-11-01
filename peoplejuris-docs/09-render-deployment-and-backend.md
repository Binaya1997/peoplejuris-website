# 09 — Render Deployment and Backend

## Owner-confirmed service

Render is deployed at:

`https://peoplejuris-feature-api.onrender.com`

The supplied `render.yaml` defines:

```yaml
services:
  - type: web
    name: peoplejuris
    runtime: python
    buildCommand: ""
    startCommand: "python server.py"
    envVars:
      - key: PORT
        value: 10000
```

`Procfile` also specifies `web: python server.py`.

## Runtime behavior

- Python standard-library HTTP server.
- Port from `PORT`, default 8000.
- When `PORT` exists, server defaults to bind host `0.0.0.0`.
- `PJ_DB_BACKEND=d1` selects the D1 Worker adapter; default is SQLite.
- `PJ_STORAGE_BACKEND=github` plus `PJ_GITHUB_TOKEN` selects GitHub repository storage; if unset, storage defaults to GitHub when token is present, otherwise local disk.
- Owner says production uses D1 and GitHub repository storage.

## Render-to-Cloudflare flow

Render's Python API server sends authenticated requests to the Cloudflare Worker API. Worker forwards data operations to D1. The precise Worker URL and secret are private configuration and intentionally omitted.

## Render details requiring dashboard confirmation

- Current runtime version and build image.
- Actual build/start settings overriding YAML.
- Environment variable values/names currently set.
- Persistent disk status.
- Health check path.
- Auto-deploy branch and deployment trigger.
- Logs retention and latest deployment commit.
- Whether frontend requests point to this API origin consistently.

## Operational caution

Render ephemeral filesystem should not be assumed durable. Owner confirms newsletter files use GitHub repository storage and D1 stores metadata. Do not treat a local `data/peoplejuris.db` file on Render as production source of truth.
