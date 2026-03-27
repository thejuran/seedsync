# M004: Polish & Dependency Updates — Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

## Project Description

SeedSync is a daemon that syncs files from a remote seedbox to a local server using lftp, with a web UI for monitoring and configuration. The frontend is Angular 21 with Immutable.js, Bootstrap 5, and an earthy dark palette. The backend is Python 3.12 with Bottle.

## Why This Milestone

Three deferred items need closing: R017 (API token display in Settings), R040 (toast notification restyle), and a failing Dependabot PR (#161) with 21 npm dependency updates including two major version bumps (Immutable.js 4→5, TypeScript 5→6). The CI also warns about Node.js 20 deprecation in GitHub Actions.

## User-Visible Outcome

### When this milestone is complete, the user can:

- See and copy the API token from the Settings page without needing startup logs
- See styled toast notifications matching the earthy UI palette
- Run on up-to-date dependencies with no known security advisories

### Entry point / environment

- Entry point: http://localhost:8080 (SeedSync web UI)
- Environment: local dev / browser / Docker / CI
- Live dependencies involved: none (all changes are frontend + dependency updates)

## Completion Class

- Contract complete means: Angular unit tests pass, Python unit tests pass, `ng build` succeeds
- Integration complete means: E2E Playwright tests pass, all pages functional in browser
- Operational complete means: none (no backend behavior changes)

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Settings page shows the API token in a copyable field for authenticated sessions
- Toast notifications render with earthy palette styling, not default Bootstrap
- All CI checks pass on master with updated dependencies
- No Angular build errors or TypeScript compilation failures

## Risks and Unknowns

- **Immutable.js 4→5 breaking changes** — Major version bump across 20+ files using Immutable.js. API changes (Map, List, Record) could require significant refactoring.
- **TypeScript 5→6 strictness** — TS6 has stricter null checks and type inference. CI already shows `null` not assignable errors in test files.
- **Node.js 20 deprecation in CI** — GitHub Actions warns Node.js 20 actions will be forced to Node.js 24 by June 2026. `actions/checkout@v4` needs updating.

## Existing Codebase / Prior Art

- `src/angular/src/app/services/settings/` — Config model and service, where token display will be added
- `src/angular/src/app/pages/settings/` — Settings page components
- `src/angular/src/app/services/utils/notification.service.ts` — Current toast notification service
- `src/angular/src/app/services/utils/auth.interceptor.ts` — Reads API token from meta tag
- `src/python/web/serialize/serialize_config.py` — Backend config serialization (already has conditional redaction)

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R017 — Token visible in Settings UI for authenticated users
- R040 — Triggarr-style toast notifications matching earthy palette

## Scope

### In Scope

- R017: API token display in Settings (read-only, copyable)
- R040: Toast notification restyle to earthy palette
- Dependabot PR #161: merge 21 npm dependency updates
- Fix Immutable.js 4→5 breaking changes
- Fix TypeScript 5→6 compilation errors
- Update GitHub Actions to Node.js 24-compatible versions if needed

### Out of Scope / Non-Goals

- Token rotation or regeneration UI
- New features beyond deferred polish items
- Python dependency updates (not in Dependabot PR)
- v3.3.0 release tagging (separate task)

## Technical Constraints

- Immutable.js is used in 20+ source files — changes must be systematic
- TypeScript version must remain compatible with Angular 21.2.6
- CSP autoCsp must continue to work after dependency updates

## Integration Points

- GitHub Actions CI — must pass all checks (Angular unit, Python unit, E2E, Docker build)
- Dependabot PR #161 — will be incorporated rather than merged directly (it has CI failures)

## Open Questions

- Immutable.js 5 API delta — need to check changelog for breaking changes before estimating effort
