# 14 — Environment Configuration and Secrets

## Environment variable reference

| Variable | Purpose | Used by | Required | Example |
|---|---|---|---|---|
| `PORT` | HTTP listening port | `server.py`, Render | Render runtime | `10000` |
| `PJ_HOST` | Explicit bind host | `server.py` | Optional | `0.0.0.0` |
| `PJ_DB_BACKEND` | Select `sqlite` or `d1` | `db_adapter.py` | Optional; default SQLite | `d1` |
| `PJ_DB_PATH` | SQLite DB path | SQLite adapter | SQLite mode | `data/peoplejuris.db` |
| `PJ_WORKER_API_URL` | Worker API URL | D1 adapter | D1 mode | `https://<worker-host>` |
| `PJ_D1_WORKER_URL` | Alternate Worker URL variable | D1 adapter | D1 mode fallback | `https://<worker-host>` |
| `PJ_WORKER_API_SECRET` | Worker shared secret | D1 adapter | D1 mode | `***` |
| `PJ_D1_WORKER_KEY` | Alternate Worker secret variable | D1 adapter | D1 mode fallback | `***` |
| `PJ_WORKER_TIMEOUT_SECONDS` | Worker request timeout | D1 adapter | Optional; default 10 sec | `10` |
| `PJ_ALLOWED_ORIGINS` | Allowed origins for CORS | `server.py` | Optional | `https://peoplejuris.com` |
| `PJ_ADMIN_USER` | Initial admin username | Setup CLI | Optional | `***` |
| `PJ_ADMIN_PASS` | Initial admin password | Setup CLI | Optional; secret | `***` |
| `PJ_STORAGE_BACKEND` | `github` or `local` storage | `github_storage.py` | Optional | `github` |
| `PJ_GITHUB_TOKEN` | GitHub Contents API token | GitHub storage | Required for GitHub backend | `***` |
| `PJ_GITHUB_OWNER` | Repository owner | GitHub storage | Optional default | `***` |
| `PJ_GITHUB_REPO` | Repository name | GitHub storage | Optional default | `***` |
| `PJ_GITHUB_BRANCH` | Asset commit branch | GitHub storage | Optional default | `***` |
| `PJ_GITHUB_NEWSLETTER_PATH` | PDF asset directory | GitHub storage | Optional | `newsletters` |
| `PJ_GITHUB_COVER_PATH` | Cover asset directory | GitHub storage | Optional | `images/newsletter-covers` |
| `PJ_FILE_URL_STRATEGY` | Relative/raw URL strategy | GitHub storage | Optional | `relative` |
| `PJ_GITHUB_TIMEOUT_SECONDS` | GitHub API timeout | GitHub storage | Optional | `10` |

Names and defaults are based on supplied source. Confirm which are actually set in Render and Cloudflare before calling them current deployment configuration.

## Secret handling

- Keep `.env` and `.env.*` out of Git; `.gitignore` excludes them.
- Store Render values in Render environment settings.
- Store Worker shared secret as a Worker secret and corresponding Render environment value.
- Store GitHub token in Render secret configuration with only required repository permissions.
- Never put secrets in static frontend files, commits, issue comments, logs, documentation, or chat.
- Rotate a secret if it is exposed; do not copy it into this documentation.
