# 08 — Cloudflare Workers, DNS and D1

## Domain registrar versus DNS provider

The project owner has confirmed that `peoplejuris.com` is registered with **GoDaddy**. The Cloudflare dashboard screenshots show the DNS zone/records for `peoplejuris.com`, including a proxied apex `Worker` record targeting `peoplejuris-website`.

These are different responsibilities:

| Layer | Service | Responsibility | Evidence status |
|---|---|---|---|
| Domain registrar | GoDaddy | Domain registration and renewal for `peoplejuris.com` | Owner-confirmed; no GoDaddy dashboard screenshot supplied |
| DNS hosting/management | Cloudflare | DNS zone and DNS records visible in Cloudflare dashboard | Dashboard screenshot-confirmed |
| Website routing | Cloudflare DNS Worker record | Proxied apex record sends `peoplejuris.com` traffic to `peoplejuris-website` | Dashboard screenshot-confirmed |

The domain is registered with GoDaddy, while Cloudflare is configured to manage its DNS zone and edge routing. The supplied Cloudflare dashboard shows the proxied apex Worker record routing `peoplejuris.com` to `peoplejuris-website`. Keep registration/renewal responsibilities distinct from DNS and website traffic handling.

The registrar is not normally in the live HTTP request path for each website visit. Cloudflare handles DNS resolution and edge routing for the configured domain.

## Current dashboard topology (screenshots supplied 1 November 2026)

The Workers & Pages list shows two deployed apps:

- `peoplejuris-website` — linked in the list to GitHub repository `Binaya1997/peoplejuris-website`, and showing `peoplejuris.com + 1 other route`.
- `peoplejuris-db-api` — exposed at `peoplejuris-db-api.patnaikbinaya61.workers.dev`.

The opened detail screens identify both as **Workers**. The screenshots do not show a separate current Pages project. Earlier documentation that stated `Cloudflare Pages` served `peoplejuris.com` was not consistent with this dashboard evidence and has been corrected. A previously discussed `peoplejuris-cloudflare.pages.dev` address is not established as the active production site by these screenshots.

## Worker 1 — `peoplejuris-website`

Dashboard evidence:
- Custom domain: `peoplejuris.com`.
- `workers.dev` is marked Disabled in the opened detail screen.
- Bindings: `0`.
- Workers: `0`.
- GitHub repository shown in the Workers & Pages list: `Binaya1997/peoplejuris-website`.
- Cloudflare DNS shows a proxied record with name `peoplejuris.com`, type `Worker`, content `peoplejuris-website`.

Role: public site/frontend entry point for the apex domain. Its detail screen shows no D1 binding. Do not describe this Worker as the D1 database gateway.

The repository `wrangler.jsonc` includes a Worker named `peoplejuris-website` and a static-assets directory setting (`.`). This is consistent with the site-hosting role, but confirm the deployed build/static-assets settings before relying on the local config as an exact record of production.

## Worker 2 — `peoplejuris-db-api`

Dashboard evidence:
- Worker URL: `peoplejuris-db-api.patnaikbinaya61.workers.dev`.
- One binding appears in the detail screen.
- Binding type: D1 database.
- Binding name: `DB`.
- Target database: `peoplejuris-d1`.

Role: server-side D1 API gateway called by the Python backend. The previously inspected Worker project had `src/index.ts`, D1 binding `DB`, and shared-secret authentication. The Worker source itself is not in the supplied website ZIP, so inspect the separate Worker repository/project before editing routes or authentication.

## Cloudflare D1 — `peoplejuris-d1`

The D1 list screenshot shows:
- Name: `peoplejuris-d1`.
- Tables: `0`.
- Queries: `353`.
- Size: `69.63 kB`.
- Created at: 31 October 2026, 3:17 AM (as displayed in the screenshot).

This conflicts with earlier migration output that listed `admins`, `sessions`, and `newsletters`. Do not assume the earlier schema is the current live schema. Use the read-only checks in `07-cloudflare-d1-migration.md` and confirm the correct database is selected before any migration or write.

## Apex domain and `www`

The DNS screenshot shows an apex record:
- Name: `peoplejuris.com`.
- Type: `Worker`.
- Content: `peoplejuris-website`.
- Proxy status: Proxied.

Cloudflare displays a recommendation that visitors cannot reach `www.peoplejuris.com` and suggests adding an A, AAAA, or CNAME record and optionally a redirect to the apex. The visible DNS records do not show a `www` record. This is a separate DNS issue; no record or redirect should be created without the owner's explicit approval and a review of the current GoDaddy/Cloudflare DNS setup.

## Request model and security boundary

1. Browser requests `https://peoplejuris.com` and reaches the `peoplejuris-website` Worker through the proxied apex Worker record.
2. Browser frontend calls the Render Python backend for public/admin API operations (exact deployed API origin still needs config verification).
3. Render's Python D1 adapter calls `peoplejuris-db-api` server-to-server using the configured Worker URL and shared secret.
4. `peoplejuris-db-api` accesses D1 through its binding named `DB`.

The Worker secret must remain in Render's server-side environment and must never be embedded in HTML/JavaScript or sent to a browser.

## Deployment and operational checks

- Verify GitHub integration branch, build command, output/static asset configuration, and production deployment triggers for `peoplejuris-website`.
- Identify the separate source repository and deployment workflow for `peoplejuris-db-api`.
- Verify Render's configured `PJ_DB_BACKEND`, Worker URL and secret presence (never reveal the secret value).
- Verify D1 tables using read-only SQL before running migrations.
- Preserve existing custom domains, Worker routes, DNS records, bindings and secrets unless the owner explicitly approves a specific change.
