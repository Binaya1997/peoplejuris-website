# 05 — Backend and API

## Runtime

`server.py` uses Python standard-library `http.server`, `SimpleHTTPRequestHandler`, and `ThreadingMixIn`. `requirements.txt` lists no external dependencies. The source header specifies Python 3.12+ (README says Python 3.9+; treat the minimum version as needing confirmation and follow actual deployed runtime).

The backend serves static content from `BASE_DIR`, exposes JSON APIs, and uses adapter factories for database and file storage.

## API route inventory (from `server.py`)

| Method | Route | Access / purpose |
|---|---|---|
| GET | `/api/newsletters` | Public published newsletter records |
| GET | `/api/admin/me` | Authenticated admin identity |
| GET | `/api/admin/newsletters` | Authenticated admin list (published and drafts) |
| POST | `/api/admin/login` | Admin login |
| POST | `/api/admin/logout` | Logout and session deletion |
| POST | `/api/admin/forgot-password` | Recovery-code password reset |
| POST | `/api/admin/change-password` | Authenticated password change |
| POST | `/api/admin/regenerate-recovery-code` | Authenticated Recovery Code regeneration |
| POST | `/api/admin/newsletters` | Create/upload newsletter |
| PUT | `/api/admin/newsletters/{id}` | Update newsletter metadata |
| DELETE | `/api/admin/newsletters/{id}` | Delete newsletter and related assets |

The exact request schema is implemented in the handlers. Typical admin calls use JSON and browser credential inclusion; newsletter creation uses multipart form data.

## D1 Worker API routes used by `db_adapter.py`

The Python D1 adapter calls a separate Worker API. Route names visible in source include:
- `/api/v1/health`
- `/api/v1/admins/count`
- `/api/v1/admins/get-by-username`
- `/api/v1/admins/get-by-id`
- `/api/v1/admins/get-recovery-info`
- `/api/v1/admins/consume-recovery-code`
- `/api/v1/admins/update-password`
- `/api/v1/admins/regenerate-recovery-code`
- `/api/v1/admins/upsert-admin`
- `/api/v1/sessions/create`
- `/api/v1/sessions/validate`
- `/api/v1/sessions/delete`
- `/api/v1/sessions/cleanup-expired`
- `/api/v1/newsletters/public`
- `/api/v1/newsletters/all`
- `/api/v1/newsletters/{id}`
- `/api/v1/newsletters` (create)

Methods and payloads are in `D1WorkerAdapter`; Worker implementation is not included in this archive, so response shape and deployed route behavior require Worker-source verification.

## API behavior notes

- JSON responses set no-cache headers.
- CORS behavior reads `PJ_ALLOWED_ORIGINS` and checks same-host, explicitly allowed origins, and localhost.
- Successful authenticated requests can refresh the session cookie.
- Admin handlers validate session before protected changes.
- Error responses avoid exposing some underlying DB errors to the client; server logs may contain diagnostic context.

## Example public request

```bash
curl -i https://<api-host>/api/newsletters
```

Replace `<api-host>` with the configured backend origin. This is a read-only request.

## Example authenticated admin API

```bash
curl -i -b '<cookie-name>=***' \
  https://<api-host>/api/admin/me
```

Do not place actual session cookies in shell history, shared logs, documentation, or chat.
