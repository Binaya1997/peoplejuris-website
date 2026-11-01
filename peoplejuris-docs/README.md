# PeopleJuris Technical Documentation

> Documentation audit generated from the supplied repository archive, project history, owner confirmations, and Cloudflare dashboard screenshots supplied on 1 November 2026. This is a documentation artifact only; no application, database, DNS, route, secret, or deployment changes were made.

## Start here

1. [Project overview](01-project-overview.md)
2. [System architecture — updated Cloudflare topology](02-system-architecture.md)
3. [Project structure](04-project-structure.md)
4. [Backend and API](05-backend-and-api.md)
5. [Database schema and data model](06-database-schema-and-data-model.md)
6. [Cloudflare D1 migration](07-cloudflare-d1-migration.md)
7. [Cloudflare Workers, DNS and D1](08-cloudflare-workers-and-pages.md)
8. [Render deployment](09-render-deployment-and-backend.md)
9. [GitHub workflow and CI/CD](10-github-workflow-and-cicd.md)
10. [Admin authentication and recovery](11-admin-authentication-and-recovery.md)
11. [Newsletter management](12-newsletter-management.md)
12. [Forms and external services](13-forms-and-external-services.md)
13. [Environment configuration and secrets](14-environment-configuration-and-secrets.md)
14. [Commands and queries](15-commands-and-queries-reference.md)
15. [Troubleshooting history](16-troubleshooting-history.md)
16. [Deployment and rollback runbook](17-deployment-and-rollback-runbook.md)
17. [Backup and disaster recovery](18-backup-and-disaster-recovery.md)
18. [Security implementation](19-security-implementation.md)
19. [Maintenance and onboarding](20-maintenance-and-developer-onboarding.md)
20. [Known limitations and pending work](21-known-limitations-and-pending-work.md)
21. [Visual architecture and workflow diagrams](22-visual-architecture-and-workflow-diagrams.md)
22. [Cloudflare dashboard evidence audit](23-cloudflare-dashboard-evidence-audit.md)

## Evidence and scope

Primary source reviewed: supplied `peoplejuris-website-main (5).zip`, including `server.py`, `db_adapter.py`, `github_storage.py`, HTML/CSS/JS, `render.yaml`, `wrangler.jsonc`, `Procfile`, `README.md`, and `requirements.txt`.

Cloudflare dashboard screenshots supplied on 1 November 2026 show:
- Two applications in Workers & Pages: `peoplejuris-website` and `peoplejuris-db-api`.
- `peoplejuris-website` is associated with GitHub repository `Binaya1997/peoplejuris-website`; its opened detail screen shows custom domain `peoplejuris.com` and zero bindings.
- DNS contains a proxied Worker record for `peoplejuris.com` targeting `peoplejuris-website`.
- `peoplejuris-db-api` is exposed at `peoplejuris-db-api.patnaikbinaya61.workers.dev`; its opened detail screen shows D1 binding `DB` → `peoplejuris-d1`.
- The D1 list screenshot reports `peoplejuris-d1` with 0 tables, 353 queries and 69.63 kB. This conflicts with a prior migration output listing `admins`, `sessions`, and `newsletters`; current D1 schema requires read-only verification.
- Cloudflare shows a recommendation that `www.peoplejuris.com` cannot be reached and suggests a DNS record/redirect. No DNS change was made.

Domain/DNS ownership: GoDaddy is the registrar for `peoplejuris.com`, and Cloudflare is configured to manage its DNS zone. The Cloudflare dashboard shows the proxied apex Worker record targeting `peoplejuris-website`.

Other owner-confirmed deployment facts:
- Render service URL: `https://peoplejuris-feature-api.onrender.com`.
- D1 is intended as the production data store for administrator/session/newsletter metadata.
- Newsletter PDFs and cover images are stored in GitHub repository storage.
- Admin UI allows Recovery Code regeneration.
- Backup/restore process is unknown and has not been tested.

The supplied ZIP does not include the separate D1 Worker source, complete D1 migration history, Render dashboard evidence, or all deployment workflows. Dashed arrows identify deployment connections whose exact automation triggers are not shown in the available evidence.

## Status labels

- **Implemented in supplied source**: code/configuration exists in this archive.
- **Dashboard screenshot**: visible in the Cloudflare screenshots supplied on 1 November 2026.
- **User-confirmed deployment fact**: stated by the project owner.
- **Previously inspected**: supported by prior project discussion or code snippets, but not re-audited from this ZIP.
- **Unverified**: current deployed behavior or service configuration cannot be proven from the available evidence.
- **Unknown**: no adequate evidence is available.

## Security

No real credentials, secrets, passwords, recovery codes, tokens, session values, or actual secret values are included. Example secrets are represented as `***`. Do not commit production environment files or database exports containing private data.
