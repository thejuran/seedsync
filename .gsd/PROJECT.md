# SeedSync

**What:** A maintained fork of ipsingh06/seedsync — a daemon that syncs files from a remote seedbox to a local server using lftp, with a web UI for monitoring and configuration.

**Stack:**
- Backend: Python 3.12 (FastAPI-like with Bottle, lftp subprocess management, aiosqlite)
- Frontend: Angular 21 (standalone components, Bootstrap 5, jQuery, Karma/Jasmine tests, esbuild)
- Build: Docker (multi-arch), Deb packages, PyInstaller binary
- CI: GitHub Actions (Python unit tests, Angular unit tests, E2E Playwright tests, Deb/Docker builds)
- Registry: ghcr.io/thejuran/seedsync

**Current state:** v3.3.0-dev on master. Security hardening and UI redesign complete. M004 in progress — closing deferred polish (R017 token in Settings, R040 toast restyle) and landing Dependabot dependency updates (Immutable.js 5, TypeScript 6, Angular 21.2.6).

**Milestones:**
- M001: Angular 21 Migration ✅ (released as v3.2.0)
- M002: Finish v3.2 Security ✅ (API token auth, DNS rebinding, CSP hardening, CONF-04 fix)
- M003: UI Redesign — Earthy Palette ✅ (rethemed from terminal/hacker to clean modern dark UI)
- M004: Polish & Dependency Updates 🚧 (R017, R040, Dependabot PR #161)

**Repo:** https://github.com/thejuran/seedsync
