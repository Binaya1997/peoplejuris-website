# PeopleJuris™ — Law Firm Official Website

> **Tagline:** `people.community.corporate`  
> Official web platform for **PeopleJuris LLP** — Advocate, Legal Advisers & Corporate Consultants.

---

## Overview

PeopleJuris combines a high-aesthetic, responsive corporate web experience with a lightweight, secure Python administrative backend.

### Key Highlights
- **Dynamic 3D Celestial Engine**: Centered Three.js background with real-time scroll-coupled multi-axis rotation, gyroscopic momentum, vertical parallax, and depth recession.
- **Ambient Motion Accessibility Toggle**: Floating pill controller across all pages enabling visitors to pause or resume motion effects, with full `prefers-reduced-motion` operating system integration and `localStorage` persistence.
- **Deep Space Starfield**: Ultra-lightweight HTML5 2D canvas starfield on subpages for maximum rendering performance.
- **Responsive Layout**: Edge-to-edge photography, mobile drawer navigation, responsive typography, and crisp PeopleJuris™ branding.
- **Zero-Dependency Python Backend**: Standard-library HTTP server (`server.py`) with built-in SQLite data layer, PBKDF2 password hashing, 15-minute inactivity timeout, and CSRF protection.
- **Newsletter Publishing Suite**: Administrative console for managing, previewing, and publishing legal newsletters and client alerts with automatic fallback seeder.

---

## Project Structure

```text
peoplejuris-website/
├── index.html                   # Primary homepage with full 3D celestial canvas
├── practice-areas.html          # Legal practice areas overview
├── career.html                  # Careers and job application portal
├── consultation.html            # Consultation inquiry routing
├── free-consultation.html       # Pro bono / preliminary consultation form
├── paid-consultation.html       # Retained corporate consultation portal
├── newsletter.html              # Searchable legal newsletter archive
├── admin-login.html             # Secure administrator authentication portal
├── admin-dashboard.html         # Protected administrative control center
├── admin-forgot-password.html   # Single-use emergency recovery code reset
├── thankyou.html                # Inquiry submission confirmation
├── robots.txt                   # Search engine crawling policies
├── sitemap.xml                  # Canonical XML sitemap
├── server.py                    # Zero-dependency Python server & API
├── .gitignore                   # Production repository exclusions
├── css/
│   └── style.css                # Master unified stylesheets & design tokens
├── js/
│   ├── ambient-engine.js        # Three.js 3D engine & motion manager
│   ├── script.js                # Form validation, navigation, & newsletter pipeline
│   └── three.min.js             # Local Three.js library
├── images/                      # High-resolution logos, attorney photos, & hero assets
├── newsletters/                 # Published PDF editions
└── data/                        # SQLite storage (peoplejuris.db auto-generated)
```

---

## Getting Started Locally

### Option 1: Full-Stack Python Server (Recommended)
No external packages (`pip`) are required — runs on standard Python 3.9+:

```bash
# Navigate to the project directory
cd peoplejuris-website-main

# Launch the server
python server.py
```

- **Public Website:** [http://localhost:8000/index.html](http://localhost:8000/index.html)
- **Newsletter Portal:** [http://localhost:8000/newsletter.html](http://localhost:8000/newsletter.html)
- **Admin Console:** [http://localhost:8000/admin-login.html](http://localhost:8000/admin-login.html)

### Option 2: Static Hosting (GitHub Pages / Netlify / Vercel)
The public website is fully functional as a static site:
- Simply open `index.html` in any modern web browser or deploy directly to GitHub Pages.
- Client forms submit seamlessly via integrated FormSubmit and Brevo services.

---

## Administrative Setup & Security

To initialize or reset an administrator account with custom credentials:

```bash
python server.py --setup-admin
```

Security highlights:
- **PBKDF2-HMAC-SHA256**: 600,000 iterations for password hashing.
- **Session Protection**: HttpOnly, SameSite=Lax cookies with 15-minute sliding inactivity expiration.
- **CSRF Defense**: Origin and Host validation on all mutating administrative endpoints.
- **Emergency Recovery**: Single-use 16-character cryptographic recovery codes (`XXXX-XXXX-XXXX-XXXX`).

---

## License & Copyright

© 2026 PeopleJuris LLP. All Rights Reserved.  
PeopleJuris™ and the PeopleJuris logo are exclusive trademarks.
