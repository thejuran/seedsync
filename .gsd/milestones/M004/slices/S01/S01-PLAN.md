# S01: Dependency Updates

**Goal:** Incorporate all 21 npm dependency updates from Dependabot PR #161, fix Immutable.js 4→5 and TypeScript 5→6 breaking changes, and get CI green.
**Demo:** `ng build` succeeds, all Angular unit tests pass, `npm run lint` clean.

## Must-Haves

- All 21 packages updated to versions from PR #161
- Immutable.js 5.x working across all 20+ consuming files
- TypeScript 6.x compiling cleanly with no type errors
- Angular unit tests passing
- Build succeeds with no errors

## Proof Level

- This slice proves: contract
- Real runtime required: no (build + unit tests sufficient)
- Human/UAT required: no

## Verification

- `cd src/angular && npx ng build` exits 0
- `cd src/angular && npx ng test --watch=false` exits 0
- `cd src/angular && npm run lint` exits 0

## Observability / Diagnostics

- Runtime signals: none
- Inspection surfaces: CI pipeline status
- Failure visibility: TypeScript compiler errors, test runner output
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: none (first slice)
- New wiring introduced in this slice: none (dependency updates only)
- What remains before the milestone is truly usable end-to-end: S02 (token display), S03 (toast restyle), S04 (code review)

## Tasks

- [x] **T01: Update dependencies and fix compilation** `est:1h`
  - Why: PR #161 has 21 dependency bumps but fails CI. Need to apply updates and fix all resulting type errors.
  - Files: `src/angular/package.json`, `src/angular/package-lock.json`, test files with `null` type errors
  - Do: Update package.json versions to match PR #161. Run `npm install`. Fix TypeScript 6 strictness errors (null→string in WebReaction constructor calls, implicit any on spy variables). Fix any Immutable.js 5 breaking changes (default export removed — already using `import * as Immutable` so likely safe). Run build and tests, fix iteratively.
  - Verify: `ng build` succeeds, `ng test --watch=false` passes, `npm run lint` clean
  - Done when: All three verification commands exit 0

## Files Likely Touched

- `src/angular/package.json`
- `src/angular/package-lock.json`
- `src/angular/src/app/tests/unittests/services/utils/version-check.service.spec.ts`
- Any other test files with null/any type errors under TS6
