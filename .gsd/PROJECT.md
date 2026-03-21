# SeedSync

**What:** A maintained fork of ipsingh06/seedsync — a daemon that syncs files from a remote seedbox to a local server using lftp, with a web UI for monitoring and configuration.

**Stack:**
- Backend: Python 3.12 (FastAPI-like with Bottle, lftp subprocess management, aiosqlite)
- Frontend: Angular 19 (standalone components, Bootstrap 5, jQuery, Karma/Jasmine tests)
- Build: Docker (multi-arch), Deb packages, PyInstaller binary
- CI: GitHub Actions (Python unit tests, Angular unit tests, E2E Playwright tests, Deb/Docker builds)
- Registry: ghcr.io/thejuran/seedsync

**Current state:** v3.1.2 stable. Security hardening (v3.2) in progress. Angular frontend is on v19 with 3 unresolvable security alerts blocked on Angular 21 migration.

**Repo:** https://github.com/thejuran/seedsync
