# 03 — Website Design and Frontend

## Pages found in the archive

| Page | Role |
|---|---|
| `index.html` | Homepage, hero/branding, 3D effect, enquiry form |
| `practice-areas.html` | Practice-area overview |
| `career.html` | Career/application form |
| `consultation.html` | Consultation routing/information |
| `free-consultation.html` | Free consultation form |
| `paid-consultation.html` | Paid consultation form |
| `newsletter.html` | Newsletter archive and subscription form |
| `admin-login.html` | Admin authentication |
| `admin-forgot-password.html` | Recovery-code password reset |
| `admin-dashboard.html` | Newsletter administration, password and recovery-code controls |
| `thank.html`, `thankyou.html` | Submission confirmation pages |

## Visual system

The README and source describe PeopleJuris branding with the tagline `people.community.corporate`, responsive layouts, hero photography, a Three.js celestial object, ambient motion controls, and a starfield background on subpages. Local `js/three.min.js` is the bundled Three.js runtime; `js/ambient-engine.js` implements animation/motion behavior; `js/script.js` handles site interactions.

The archive contains `css/style.css` and `css/mobile.css`. Detailed CSS selectors, breakpoints, exact animation calculations, and per-page component behavior should be confirmed by source review when a specific modification is needed; this document avoids claiming every README highlight is verified in live production.

## Values and data sources

- **Hardcoded/static**: page text, branding, imagery references, layout, external form action URLs, fallback cover asset path.
- **API-derived**: public newsletter listing from `/api/newsletters`; admin newsletter data and identity from admin APIs.
- **Database-derived**: newsletter metadata, admin/session records via active adapter.
- **Configuration-derived**: backend API base URL can be customized in browser local storage using `pj_backend_url`; server environment controls backend selection and CORS.
- **User input**: login credentials, recovery code/new password, newsletter title/description/category/date/status/latest flag, uploaded PDF and optional cover.
- **Generated**: session token, password hash, Recovery Code, safe upload filename, timestamps and IDs.

## Admin console behavior

The dashboard calls `/api/admin/me` to check current identity and uses credentialed fetches for protected routes. It supports newsletter create/edit/delete, password change, and Recovery Code regeneration. The dashboard UI includes a local backend URL setting. Backend authorization is enforced by server-side session validation; browser-side hiding alone is not a security boundary.

## Responsive/accessibility behavior

README/source describe responsive typography and navigation, ambient animation pause/resume control, `prefers-reduced-motion` support, and localStorage persistence for motion preferences. Verify behavior in the current browser and deployed website Worker version before treating a particular visual state as release-verified.
