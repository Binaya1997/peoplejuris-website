# 01 — Project Overview

## Purpose

PeopleJuris is the public website and administrator-managed newsletter publishing platform for PeopleJuris LLP. The supplied source describes the public legal-services website, enquiry forms, responsive design, and protected newsletter administration.

The evidence-backed deployment includes a Cloudflare Worker named `peoplejuris-website` for the public apex domain, a separate Cloudflare Worker named `peoplejuris-db-api` with a D1 binding, a Render-hosted Python backend, GitHub source/file storage, and Cloudflare D1. The current Cloudflare screenshots do **not** show a separate Pages project serving the production domain.

## Main capabilities evidenced in source

- Public pages: home, practice areas, career, consultation, free consultation, paid consultation, newsletter archive, thank/thank-you pages.
- Motion design: Three.js celestial/3D homepage effect, ambient-motion control, canvas starfield and reduced-motion support described in README/source.
- Admin login, logout, forgot-password recovery code flow, password change, Recovery Code regeneration.
- Newsletter list, create/upload, update, delete, published/draft status, latest-newsletter selection.
- Database adapter supports SQLite or Cloudflare D1 through a Worker API.
- Storage adapter supports local disk or GitHub Contents API.
- Python `server.py` provides REST-style application endpoints.

## Deployment facts and evidence status

| Item | Current status |
|---|---|
| Domain registrar | GoDaddy — owner-confirmed |
| DNS management | Cloudflare — dashboard shows the `peoplejuris.com` DNS zone and a proxied `Worker` record targeting `peoplejuris-website` |
| Domain/DNS relationship | Domain registered with GoDaddy; DNS configured in Cloudflare |
| Public domain routing | `peoplejuris.com` apex Worker record targets `peoplejuris-website` (Cloudflare screenshot) |
| Public frontend entry point | Cloudflare Worker `peoplejuris-website`; dashboard shows GitHub repo connection and zero bindings |
| Database API | Separate Worker `peoplejuris-db-api` at `peoplejuris-db-api.patnaikbinaya61.workers.dev` |
| D1 binding | `peoplejuris-db-api` binding `DB` → `peoplejuris-d1` |
| D1 current schema | **Unreconciled**: D1 list screenshot reports 0 tables; prior migration output listed 3 application tables |
| Render | Deployed at `https://peoplejuris-feature-api.onrender.com` — owner confirmed |
| Newsletter assets | GitHub repository storage — owner confirmed and supported by `github_storage.py` |
| Admin Recovery Code regeneration | Available after login — owner confirmed |
| `www.peoplejuris.com` | Cloudflare recommends adding a DNS record/redirect; not changed |
| Backups/restore | Unknown; no verified runbook supplied |

## Domain and DNS ownership

GoDaddy is the domain registrar for `peoplejuris.com`, and Cloudflare is configured to manage its DNS zone and edge routing. GoDaddy handles domain registration/renewal; Cloudflare manages DNS records and routes the proxied apex Worker record to `peoplejuris-website`. See [08 — Cloudflare Workers, DNS and D1](08-cloudflare-workers-and-pages.md).

## Architecture correction

Earlier wording identified the production frontend host as Cloudflare Pages. The screenshots supplied on 1 November 2026 show a different current setup: `peoplejuris-website` is a Worker, its custom domain is `peoplejuris.com`, and its dashboard displays zero bindings. `peoplejuris-db-api` is a separate Worker and is the one with D1 binding `DB`. Refer to [02 — System Architecture](02-system-architecture.md) and [08 — Cloudflare Workers, DNS and D1](08-cloudflare-workers-and-pages.md) for the corrected topology.

## New developer orientation

Read the architecture and project structure first. Before any production operation, identify the active website Worker, D1 API Worker, Render service, D1 database, GitHub branch, and newsletter storage repository. Use read-only checks first. Do not infer production configuration from local defaults or older Pages references.
