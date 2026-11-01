# 19 — Security Implementation

## Controls evidenced in supplied source

- PBKDF2-HMAC-SHA256 password hashing, 600,000 iterations, random salt.
- Constant-time password and recovery hash comparisons.
- One-time hashed Recovery Code.
- HttpOnly, Secure, SameSite=None session cookie.
- 15-minute inactivity and 12-hour absolute session limits.
- In-memory login rate limiting: five attempts per 15 minutes.
- CSRF/origin-host checks for mutating admin requests.
- CORS origin allowlist controlled by `PJ_ALLOWED_ORIGINS`.
- Session validation for protected admin routes.
- Multipart upload size/type/magic-byte checks.
- Safe generated upload filenames and path checks for asset deletion.
- GitHub token redaction in storage adapter errors.
- Worker shared-secret authentication in separately inspected Worker project.

## Important caveats

- In-memory rate limiting is process-local and may not be shared across multiple instances/restarts.
- GitHub token permissions and secret storage are deployment configuration; not verifiable from ZIP.
- Worker secret must never be sent to browser.
- Exact deployed CORS and cookie behavior depend on production domains and configuration.
- The automatic initial admin fallback in `run_server()` contains a known temporary password in source and prints it when no admin exists. It is documented as a risk/behavior, not recommended.
- No claim is made about implemented rate limiting at Cloudflare edge, external WAF, or provider-side spam controls unless separately verified.

## Recommended practices, distinct from implemented controls

- Verify no secret has ever been committed; rotate if exposed.
- Restrict GitHub token to the minimum repository permissions needed.
- Confirm Render/Worker secret configuration and deployment access.
- Verify backup encryption and restore permissions.
- Test authentication, recovery, file upload, CSRF, CORS and session expiry in a nonproduction environment.
- Review logs for accidental sensitive data.
- Remove or disable unsafe initial-admin fallback only through a separately approved code change; this documentation task does not change code.
