# 20 — Maintenance and Developer Onboarding

## New developer sequence

1. Read this documentation index and project overview.
2. Read architecture and project structure.
3. Review `server.py`, `db_adapter.py`, and `github_storage.py`.
4. Understand whether the local environment uses SQLite/local storage or configured D1/GitHub adapters.
5. Run local tests only with nonproduction data.
6. Identify the active branch and review Git status before changes.
7. Never use production credentials in local files or commit secrets.
8. Make small scoped changes and inspect diffs.
9. Use PR review and confirm deployment automation before merging.

## Local development

```bash
python3 --version
python3 server.py
```

Default local port is 8000; local DB defaults to `data/peoplejuris.db`. Ensure no production `PJ_DB_BACKEND`, Worker secret, or GitHub token is unintentionally loaded into the local environment.

Admin setup, if required in a local sandbox:

```bash
python3 server.py --setup-admin
```

This changes the selected database and prints a Recovery Code once. Use local-only credentials.

## Routine checks

- Public page loads and static assets resolve.
- `/api/newsletters` returns published records.
- Admin login and logout work.
- Admin session expiry behavior is correct.
- Recovery Code can be regenerated and is saved securely.
- Newsletter upload, latest selection, edit and delete work with test assets.
- Database asset paths correspond to stored files.
- Provider forms submit to the expected destination.
- Review logs and GitHub commits for errors.
- Verify backups/restore independently; current state is unknown.

## Change safety

The project owner requires incremental changes, no surprise production changes, impact and rollback explained before production/DNS changes, and explicit approval for domain/routing changes. This document describes maintenance and does not authorize production operations.
