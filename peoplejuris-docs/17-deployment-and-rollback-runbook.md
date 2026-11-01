# 17 — Deployment and Rollback Runbook

## Current service map

- Public domain: `peoplejuris.com` → proxied Cloudflare DNS Worker record → `peoplejuris-website` Worker.
- Website Worker: `peoplejuris-website`, associated with GitHub repository `Binaya1997/peoplejuris-website` in the Cloudflare Workers & Pages list; exact build/trigger settings still need checking.
- Backend API: `https://peoplejuris-feature-api.onrender.com` (owner-confirmed Render service).
- D1 API: separate Worker `peoplejuris-db-api` at `peoplejuris-db-api.patnaikbinaya61.workers.dev`.
- Database binding: `peoplejuris-db-api` binding `DB` → D1 database `peoplejuris-d1`.
- Newsletter files: GitHub repository storage (owner-confirmed).
- Current D1 table status: dashboard screenshot reported zero tables; reconcile against live schema before database operations.

## Documentation-only delivery

1. Review docs locally.
2. Add docs on a documentation branch.
3. Inspect `git diff --check` and `git diff`.
4. Commit and push.
5. Open PR and review.
6. Merge only when owner approves.

No application deployment is required for a docs-only change unless repository automation is configured to deploy every push; verify workflow settings first.

## Production release process: not fully verified

The Cloudflare dashboard shows the website Worker associated with the GitHub repository, but exact build command, branch filters, and deployment trigger behavior were not fully visible. The current screenshots do not show Render deployment settings or the D1 API Worker release pipeline. Do not assume a push automatically deploys all three services.

## Pre-deployment checklist

- Confirm the target: website Worker, Render backend, or D1 API Worker.
- Confirm repository, branch, commit SHA, and change scope.
- Review environment variable names and secret presence without revealing values.
- Confirm the current D1 database and schema read-only before any data/schema operation.
- Confirm backup and file-storage recovery status.
- Confirm health/API smoke tests and a service-specific rollback plan.
- Obtain explicit owner approval for production deployment.

## Rollback

- **Website Worker (`peoplejuris-website`)**: use Cloudflare Worker deployment/version history for this Worker, after confirming the version and custom-domain association. Do not use a Pages rollback procedure based on the current screenshots.
- **Render**: use Render deployment history/rollback controls if supported for the service; verify prior commit/config.
- **D1 API Worker (`peoplejuris-db-api`)**: restore a previous deployment or deploy a reviewed revert; verify the D1 `DB` binding and server-side secret configuration remain correct.
- **D1**: database restore or corrective migration requires a tested backup plan. The current dashboard/schema discrepancy must be resolved before a write.
- **GitHub asset commits**: restore files/paths with a reviewed commit; do not delete or overwrite assets without confirming metadata references.
- **DNS/custom domain**: do not change the apex Worker record, `www` configuration, nameservers, or redirects without explicit owner approval and a documented rollback.

These are operational guidelines, not claims that rollback has been tested. No production or DNS settings were changed during this documentation update.
