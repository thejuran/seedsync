---
id: M010
provides:
  - Fresh dashboard and settings screenshots from live instance
  - Updated README.md and docs site with new screenshots
  - Version bump from 3.3.0-dev.1 to 4.0.0
  - GitHub release v4.0.0 with full changelog
key_decisions:
  - D025: Major version bump to 4.0.0 (not 3.3.0) — reflects scope of UI redesign + security hardening
patterns_established: []
observability_surfaces: []
requirement_outcomes:
  - id: D019
    from_status: deferred
    to_status: validated
    proof: Screenshots updated, docs updated, v4.0.0 tagged and released on GitHub
duration: 1 session
verification_result: passed
completed_at: 2026-03-28
---

# M010: Screenshots, Docs & v4.0.0 Release

**Fresh screenshots captured, docs updated, and v4.0.0 released on GitHub with full changelog.**

## What Happened

Captured fresh dashboard and settings screenshots from the live instance at maguffynas:8800 using headless Playwright. Updated README.md to show both screenshots (replacing single old dashboard image). Updated docs site index.md with settings screenshot. Bumped version from 3.3.0-dev.1 → 4.0.0 across package.json and debian/changelog. Created annotated git tag v4.0.0 and GitHub release with categorized changelog covering UI redesign, security, bug fixes, code quality, and technical details.

## Files Created/Modified

- `doc/images/screenshot-dashboard.png` — fresh dashboard screenshot
- `doc/images/screenshot-settings.png` — fresh settings screenshot
- `src/python/docs/images/dashboard.png` — updated docs site dashboard image
- `src/python/docs/images/settings.png` — new docs site settings image
- `README.md` — updated screenshots section
- `src/python/docs/index.md` — added settings screenshot
- `src/angular/package.json` — version 4.0.0
- `src/debian/changelog` — version 4.0.0
