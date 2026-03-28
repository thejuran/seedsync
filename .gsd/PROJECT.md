# SeedSync

**What:** A maintained fork of ipsingh06/seedsync — a daemon that syncs files from a remote seedbox to a local server using lftp, with a web UI for monitoring and configuration.

**Stack:**
- Backend: Python 3.12 (FastAPI-like with Bottle, lftp subprocess management, aiosqlite)
- Frontend: Angular 21 (standalone components, Bootstrap 5, jQuery, Karma/Jasmine tests, esbuild)
- Build: Docker (multi-arch), Deb packages, PyInstaller binary
- CI: GitHub Actions (Python unit tests, Angular unit tests, E2E Playwright tests, Deb/Docker builds)
- Registry: ghcr.io/thejuran/seedsync

**Current state:** v3.3.0-dev on master. All milestones complete. CI fully green — all unit tests, E2E tests (amd64+arm64, Deb+Docker), builds, and `:dev` image published.

**Milestones:**
- M001: Angular 21 Migration ✅ (released as v3.2.0)
- M002: Finish v3.2 Security ✅ (API token auth, DNS rebinding, CSP hardening, CONF-04 fix)
- M003: UI Redesign — Earthy Palette ✅ (rethemed from terminal/hacker to clean modern dark UI)
- M004: Polish & Dependency Updates ✅ (R017, R040, 20 deps updated, code review)
- M005: Dashboard Polish & v3.3.0 Release 🔄 (fix alignment/fonts, tag release)
- M006: Triggarr-Style Layout + Deep Moss Palette ✅ (flat file rows, card containers, Deep Moss + Amber palette)
- M007: Settings Redesign, Documentation & v3.3.0 Release 📋 (planned)

**Repo:** https://github.com/thejuran/seedsync
