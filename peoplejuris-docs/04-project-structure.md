# 04 — Project Structure

## Directory tree from supplied archive

```text
peoplejuris-website-main/
├── .assetsignore
├── .gitignore
├── Procfile
├── README.md
├── admin-dashboard.html
├── admin-forgot-password.html
├── admin-login.html
├── career.html
├── consultation.html
├── css/
│   ├── mobile.css
│   └── style.css
├── data/
│   └── .gitkeep
├── db_adapter.py
├── favicon.ico
├── free-consultation.html
├── github_storage.py
├── images/
│   ├── background.jpg
│   ├── careerback.jpg
│   ├── favicon.png
│   ├── founder.jpg
│   ├── heroclasic.png
│   ├── mission.jpg
│   ├── newsletter-covers/
│   ├── swadhin.jpeg
│   ├── swadhin_backup.jpeg
│   └── team.jpg
├── index.html
├── js/
│   ├── ambient-engine.js
│   ├── script.js
│   └── three.min.js
├── newsletter.html
├── newsletters/
│   ├── Aug-2026.pdf
│   ├── june-2026.pdf
│   └── sept-2026.pdf
├── paid-consultation.html
├── practice-areas.html
├── render.yaml
├── requirements.txt
├── robots.txt
├── server.py
├── sitemap.xml
├── thank.html
├── thankyou.html
└── wrangler.jsonc
```

## File responsibility inventory

- `server.py`: Python HTTP server, static serving, routes, authentication, sessions, newsletter request handlers, initial admin CLI and server entry point.
- `db_adapter.py`: abstract DAL plus SQLite and D1 Worker adapters; schema/data operations.
- `github_storage.py`: local-disk and GitHub Contents API storage backends.
- `render.yaml`: Render service declaration; Python runtime and `python server.py` start command.
- `Procfile`: `web: python server.py`.
- `wrangler.jsonc`: Cloudflare Worker name and static asset directory configuration in the supplied archive.
- `requirements.txt`: states standard-library-only runtime; no pip dependencies listed.
- `.gitignore`: excludes SQLite DBs, journals, env files, virtual environments, generated upload patterns and editor files.
- `.assetsignore`: Cloudflare assets ignore rules; inspect exact contents before changing deployment.
- `README.md`: project overview, local setup, deployment options, and admin setup.
- HTML pages: public, admin, and confirmation interfaces.
- `css/style.css`, `css/mobile.css`: shared visual styles and responsive styling.
- `js/ambient-engine.js`: Three.js/motion engine.
- `js/script.js`: navigation, forms, validation and newsletter frontend logic.
- `js/three.min.js`: bundled third-party library.
- `data/.gitkeep`: preserves the otherwise empty runtime data folder; actual DB is ignored.
- `images/`: brand, team, background and cover assets.
- `newsletters/`: baseline PDF files tracked in the supplied archive; dynamic files may be created by runtime/storage adapter.
- `robots.txt`, `sitemap.xml`: crawler and sitemap resources.

## Files absent from this ZIP

No `.github/workflows/`, Worker `src/`, D1 migration folder, or `package.json` appears in the archive. Prior context identifies a separate `worker-d1-api` project. This ZIP therefore cannot prove GitHub Actions workflows or the exact Worker handlers currently deployed.
