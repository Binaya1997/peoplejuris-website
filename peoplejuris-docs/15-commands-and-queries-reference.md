# 15 — Commands and Queries Reference

> These commands are maintenance references. Except where explicitly noted in project history, they are not claimed as previously executed. Verify working directory, target and tool version first.

## Local Python

```bash
# Read-only / local
python3 --version
python3 server.py
```

Run in project root. Starts local server; writes to local DB/storage according to configuration.

## Admin setup

```bash
# Interactive credential setup; changes selected DB
python3 server.py --setup-admin
```

Requires correct DB backend environment. It creates or updates an admin and displays a one-time Recovery Code. Do not put real credentials into shell history.

## Git

```bash
git status
git branch --show-current
git log -5 --oneline
git pull --ff-only
git switch -c docs/<topic>
git add docs/
git commit -m "docs: update technical documentation"
git push -u origin docs/<topic>
```

These affect local repository/remote branch, not production DB. Confirm branch before add/commit/push.

## D1/Worker

Use Worker project directory, and inspect installed Wrangler version first:

```bash
npx wrangler --version
npx wrangler d1 list
```

Remote D1 queries and migrations can affect production. Use explicit local/remote target. Do not execute write commands without backup and approval.

## Read-only SQL checks

```sql
SELECT id, username, recovery_code_used, must_change_password FROM admins;
SELECT COUNT(*) AS session_count FROM sessions;
SELECT status, is_latest, COUNT(*) FROM newsletters GROUP BY status, is_latest;
SELECT id, title, issue_date, status, is_latest FROM newsletters ORDER BY issue_date DESC;
```

Execute in the confirmed database console. Read-only. Do not include passwords or hashes in output.

## HTTP checks

```bash
curl -i https://<backend-host>/api/newsletters
curl -i https://<backend-host>/api/admin/me
```

First is public read-only. Second should require a valid admin session. Never export real cookie values.

## Emergency manual Owner password reset

The full reviewed procedure, including local PBKDF2 hash generation, D1 pre-checks, the exact `UPDATE`, session deletion, verification queries and post-login Recovery Code regeneration, is in [Admin Authentication and Recovery — Manual D1 emergency recovery](11-admin-authentication-and-recovery.md#manual-d1-emergency-recovery--password-and-recovery-code-unavailable). Do not copy a real password or generated hash into documentation. Confirm the selected D1 database and backup before executing any write.

## Destructive operations

Database `UPDATE`, `DELETE`, migrations, GitHub asset deletes, production deploys, DNS edits and Worker route changes are destructive or consequential. Verify the target, backup, impact, rollback and explicit approval before use.
