# M001: Angular 21 Migration — Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

## Project Description

Upgrade the SeedSync Angular frontend from v19 to v21, resolving all remaining security alerts and removing the dependabot ignore rules that block automatic dependency updates.

## Why This Milestone

3 high/low-severity dependabot security alerts (serialize-javascript RCE, 2x webpack SSRF) cannot be resolved without upgrading past Angular 19. The dependabot config currently ignores major bumps for 12+ packages. Until Angular is upgraded, security debt accumulates and the frontend falls further behind.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Run SeedSync with zero known npm security vulnerabilities
- Receive and merge dependabot PRs without manual intervention for compatible updates

### Entry point / environment

- Entry point: `npm run build` / `ng build` / `ng test` in `src/angular/`
- Environment: CI (GitHub Actions), local dev, Docker build
- Live dependencies involved: none (frontend build/test only)

## Completion Class

- Contract complete means: Angular build succeeds, all 394 Karma tests pass, E2E tests pass
- Integration complete means: Docker image builds and runs, Deb package builds
- Operational complete means: CI pipeline green on all jobs

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- `ng build --configuration=production` succeeds on Angular 21
- All 394 Angular unit tests pass
- E2E Playwright tests pass in Docker
- Full CI pipeline green (Python + Angular + Deb + Docker + E2E)
- `npm audit` shows 0 high/critical vulnerabilities
- Dependabot ignore rules for Angular/TypeScript/webpack/jQuery/ESLint removed from `.github/dependabot.yml`

## Risks and Unknowns

- **jQuery 3→4 breaking changes** — jQuery is used for DOM manipulation; v4 drops some APIs
- **zone.js removal/changes in Angular 21** — Angular 21 pushes zoneless; the app currently uses zone.js
- **TypeScript 5.7→5.9+ breaking changes** — may surface type errors in existing code
- **Third-party library compatibility** — bootstrap, @angular/cdk, css-element-queries, @popperjs/core
- **Karma/Jasmine test framework changes** — jasmine-core 5→6, @types/jasmine 5→6

## Existing Codebase / Prior Art

- `src/angular/package.json` — all Angular deps currently at 19.2.20
- `src/angular/src/app/app.config.ts` — standalone ApplicationConfig (no NgModules — good)
- `src/angular/karma.conf.js` — Karma test runner config
- `.github/dependabot.yml` — ignore rules to be removed post-migration
- `.github/workflows/master.yml` — CI pipeline

## Scope

### In Scope

- Angular 19→20→21 stepwise migration
- TypeScript upgrade (5.7→compatible version for Angular 21)
- zone.js upgrade
- jQuery 3→4 migration
- webpack/serialize-javascript vulnerability resolution
- ESLint and test framework upgrades
- Dependabot config cleanup
- All existing tests passing

### Out of Scope / Non-Goals

- Migrating to zoneless Angular (keep zone.js for now)
- Rewriting components or adding features
- Python backend changes
- New test coverage beyond what exists

## Technical Constraints

- Must upgrade one Angular major version at a time (19→20→21)
- `ng update` schematics handle most breaking changes automatically
- Docker build must work on both amd64 and arm64
- Node version must be compatible with Angular 21

## Open Questions

- Does Angular 21 require Node 20+? — need to check CI runner and Docker base image Node versions
