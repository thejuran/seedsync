# SeedSync

**What:** A maintained fork of ipsingh06/seedsync — a daemon that syncs files from a remote seedbox to a local server using lftp, with a web UI for monitoring and configuration.

**Stack:**
- Backend: Python 3.12 (FastAPI-like with Bottle, lftp subprocess management, aiosqlite)
- Frontend: Angular 21 (standalone components, Bootstrap 5, jQuery, Karma/Jasmine tests, esbuild)
- Build: Docker (multi-arch), Deb packages, PyInstaller binary
- CI: GitHub Actions (Python unit tests, Angular unit tests, E2E Playwright tests, Deb/Docker builds)
- Registry: ghcr.io/thejuran/seedsync

**Current state:** v3.2.0 stable. M002 in progress — completing API token auth, DNS rebinding prevention, CSP hardening, and CONF-04 Settings UI fix. M003 planned — UI redesign with earthy palette matching Triggarr's design language.

**Milestones:**
- M001: Angular 21 Migration ✅ (released as v3.2.0)
- M002: Finish v3.2 Security 🚧 (API token auth, DNS rebinding, CSP hardening, CONF-04 fix)
- M003: UI Redesign — Earthy Palette 📋 (retheme from terminal/hacker to clean modern dark UI)

**Repo:** https://github.com/thejuran/seedsync
