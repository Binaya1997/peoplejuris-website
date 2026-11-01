# 21 — Known Limitations and Pending Work

## Known gaps / unknowns

| Item | Status | Evidence needed |
|---|---|---|
| D1 backup/restore process | Unknown | Cloudflare backup/export settings and successful restore evidence |
| Full D1 migration history | Partial | Worker project migration files and command history |
| Current Worker source/version | Not in supplied ZIP | Current Worker repo/source and dashboard release |
| Website Worker build/deploy settings | Partially visible; `peoplejuris-website` is GitHub-associated | Worker build command, branch filters, static asset behavior and release triggers |
| Render env configuration | Values not available (secrets intentionally omitted) | Owner/dashboard confirmation |
| GitHub Actions | No workflows in supplied ZIP | Current repo `.github/workflows` or confirmation none |
| Branch/PR conventions | Unknown | Git repository history/settings |
| Newsletter asset backup | Git history may exist; operational restore not verified | Tested recovery process |
| SQLite production usage | Not production source per owner; local/default code path exists | Runtime env confirmation |
| Form provider settings | Source actions visible; provider-side configuration unknown | Provider account configuration/test |
| Exact production API origins | Not fully verified | Deployed website Worker/frontend configuration and browser/network trace |
| Restore/rollback test | Unknown | Evidence of test run |

## New Cloudflare dashboard findings to reconcile

- `peoplejuris.com` is a proxied DNS Worker record pointing to `peoplejuris-website`.
- `peoplejuris-website` has 0 bindings shown; it is not the D1-bound Worker.
- `peoplejuris-db-api` has D1 binding `DB` → `peoplejuris-d1`.
- The D1 list reports 0 tables, conflicting with prior migration output for `admins`, `sessions`, and `newsletters`. This must be checked read-only before any database change.
- Cloudflare reports that `www.peoplejuris.com` cannot be reached. The visible DNS list does not show a `www` record. No change has been made.

## Source findings that deserve a separate engineering review

These are not changes made by this documentation task:
- `run_server()` auto-provisions an initial admin with a hardcoded temporary password if admin count is zero.
- Rate limiting is process-local in-memory state.
- GitHub asset upload and D1 metadata persistence are separate operations; partial failure can occur.
- Deletion order removes assets before deleting metadata, so asset or database failure needs careful handling.
- `wrangler.jsonc` in the supplied application ZIP and the separate `worker-d1-api` config represent distinct project configurations; do not assume they are interchangeable.
- README runtime minimum differs from the server header; verify supported Python version.
- No automated test suite or GitHub Actions workflow is present in this archive.

## Completeness audit

| Area | Investigated | Documented | Verified | Missing information |
|---|---|---|---|---|
| Source archive | Yes | Yes | Archive inspected | Live repository comparison |
| Frontend | Page inventory and design files | Yes | Source presence | Full visual regression |
| Python backend | Yes | Yes | Source routes/functions | Production runtime parity |
| Database | Adapter and prior D1 schema | Yes | Owner confirms D1 production | Full remote schema and migration chronology |
| Worker | Prior conversation/config evidence | Yes | Prior inspection only | Current Worker source/version |
| Cloudflare website Worker | Dashboard screenshots + repository config | Yes | `peoplejuris-website` is custom-domain Worker; zero bindings shown | Full live source/build/static asset settings |
| Render | YAML and owner URL | Yes | Owner confirms deployed | Environment and deploy settings |
| GitHub workflow | ZIP structure | Yes | No workflow in ZIP | Live workflow/branch details |
| Admin auth/recovery | Source and recent incident | Yes | Login recovery succeeded per owner | Recovery end-to-end current test |
| Newsletter | Source and owner storage answer | Yes | Owner confirms GitHub asset storage | Provider token/settings |
| Forms | HTML actions and prior history | Yes | Source endpoints | Provider-side success/redirect test |
| Backup/DR | User says unknown | Yes | No | Actual process and restore test |
| Security | Source controls | Yes | Source evidence | Production configuration verification |

## Missing information report

The user has confirmed the deployment roles and provided the Render URL, but the following still require external/dashboard or separate repository evidence:
- Full `peoplejuris-website` Worker source/build settings, branch filters and deploy trigger rules.
- Current Render environment variables (names/status only; never disclose secret values), persistent disk and health checks.
- Current `peoplejuris-db-api` Worker source/version, endpoint/auth implementation and all D1 migrations.
- Whether Worker/Render deploys are automatic and their exact triggers.
- Actual backup cadence, retention, storage, restore procedure and last test.
- Current Git branch strategy, PR rules, commit history, Actions workflows.
- Provider-side form spam protection, redirects, submission destination and active plan.
