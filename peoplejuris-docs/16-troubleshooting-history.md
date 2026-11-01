# 16 — Troubleshooting History

This knowledge base includes only issues evidenced in the available project history. Some root causes remain unknown.

## FormSubmit Error 521

- **Timeframe:** October 2026.
- **Service:** FormSubmit / Cloudflare-facing form endpoint.
- **Symptom:** `https://formsubmit.co/info@peoplejuris.com` returned Cloudflare Error 521.
- **Investigation:** curl tests reported HTTP 521 using HTTP/1.1 and HTTP/2.
- **Root cause:** Not established from evidence.
- **Alternatives:** useformz was tested; curl reported a self-signed certificate issue. SubmitKit endpoints were then used in form HTML.
- **Outcome:** Current supplied HTML has SubmitKit endpoints for several forms and a Brevo/Sibforms newsletter subscription endpoint.
- **DNS/routing:** User explicitly wanted no production DNS changes; no such change is documented.
- **Rollback:** Restore prior form `action` value from a reviewed Git diff if a later form-only change is made. This is a maintenance recommendation, not a historical rollback.

## SubmitKit custom redirect limitation

- **Timeframe:** October 2026.
- **Symptom:** Custom redirect URL required Pro plan or higher.
- **Observed choice:** Leave redirect blank for provider default thank-you page or use available plan functionality; user continued testing form behavior.
- **Root cause:** Plan feature restriction observed by user.
- **Final behavior:** Current archive contains SubmitKit form actions; current provider redirect settings need confirmation.

## Admin password and Recovery Code both unavailable

- **Timeframe:** November 1, 2026.
- **Symptom:** Owner needed to recover admin access after losing password/Recovery Code.
- **Resolution:** Locally generated a compatible PBKDF2 hash using the project's `hash_password()` and manually updated the intended D1 admin record, clearing the recovery hash, marking code used, setting `must_change_password=1`, and updating timestamp. Owner confirmed successful login.
- **Secrets:** Temporary password/hash are deliberately not recorded.
- **Follow-up:** Change temporary password and regenerate a fresh Recovery Code in the admin dashboard.
- **Risk:** Manual D1 edits must target the correct production database/account and row.

## Cloudflare Worker API architecture

Prior investigation found:
- Worker uses shared-secret authentication.
- Worker admin fetch/upsert and session handlers support the Python D1 adapter.
- Worker response data at that time did not include a role field; current design remains single admin account.
- Worker source is separate from supplied ZIP, so current deployment code needs verification.

## Other known uncertainty

No reliable history was provided for exact Render deployment failures, website Worker build errors, GitHub Actions errors, D1 migration failure output, or backup restore tests. Do not invent them.
