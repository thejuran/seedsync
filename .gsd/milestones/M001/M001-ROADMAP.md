# M001: Angular 21 Migration

**Vision:** Upgrade the Angular frontend from v19 to v21, resolve all security alerts, and remove dependabot ignore rules.

## Success Criteria

- `ng build --configuration=production` succeeds on Angular 21
- All Angular unit tests pass (currently 394)
- E2E Playwright tests pass
- Full CI pipeline green
- `npm audit` shows 0 high/critical vulnerabilities
- `.github/dependabot.yml` ignore rules for Angular ecosystem removed

## Key Risks / Unknowns

- jQuery 3→4 API removals — may break DOM manipulation code
- zone.js compatibility with Angular 21 — app uses zone.js, Angular 21 pushes zoneless
- Third-party library compatibility — @angular/cdk, bootstrap, css-element-queries

## Proof Strategy

- jQuery risk → retire in S01 by proving the build compiles and tests pass after 19→20 (jQuery stays at 3)
- zone.js risk → retire in S02 by proving zone.js works with Angular 21 without going zoneless
- Third-party risk → retire in S01/S02 as each ng update surfaces incompatibilities

## Verification Classes

- Contract verification: `ng build`, `ng test`, `npm audit`
- Integration verification: Docker image build, Deb package build
- Operational verification: Full CI pipeline (all jobs green)
- UAT / human verification: none (framework upgrade, no UI changes)

## Milestone Definition of Done

This milestone is complete only when all are true:

- All three slices delivered and merged to master
- CI pipeline fully green (Python + Angular + Deb + Docker + E2E)
- npm audit clean (0 high/critical)
- Dependabot ignore rules removed, dependabot can propose updates freely
- No regressions in existing functionality

## Slices

- [ ] **S01: Angular 19 → 20** `risk:high` `depends:[]`
  > After this: Angular 20 builds, all 394 unit tests pass, CI green

- [ ] **S02: Angular 20 → 21 + security fixes** `risk:medium` `depends:[S01]`
  > After this: Angular 21 builds, all unit tests pass, npm audit clean, CI green

- [ ] **S03: Dependency cleanup + dependabot unblock** `risk:low` `depends:[S02]`
  > After this: jQuery 4, ESLint 10, remaining deps upgraded, dependabot ignore rules removed, CI green

## Boundary Map

### S01 → S02

Produces:
- Angular 20 with compatible TypeScript and zone.js versions
- All existing tests passing on Angular 20
- Updated package.json/package-lock.json

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- Angular 21 with serialize-javascript and webpack vulnerabilities resolved
- Clean npm audit for Angular ecosystem deps

Consumes:
- Stable Angular 20 build from S01

### S03 (final)

Produces:
- All dependabot ignore rules removed from `.github/dependabot.yml`
- jQuery 4, ESLint 10, globals 17, jasmine-core 6 upgraded
- Full CI pipeline green

Consumes:
- Stable Angular 21 build from S02
