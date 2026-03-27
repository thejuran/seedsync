# M004: Polish & Dependency Updates

**Vision:** Close deferred polish items (API token in Settings, toast restyle) and land all pending dependency updates from Dependabot PR #161 — including Immutable.js 4→5 and TypeScript 5→6 major bumps — with full CI green.

## Success Criteria

- Settings page displays the API token in a read-only, copyable field for authenticated sessions
- Toast notifications render with earthy palette styling (not default Bootstrap blue/white)
- All 21 npm dependency updates from PR #161 are incorporated and working
- Immutable.js 5.x API used correctly across all 20+ consuming files
- TypeScript 6.x compiles cleanly with no type errors
- Angular unit tests pass, Python unit tests pass, E2E tests pass
- `ng build` succeeds with no errors or warnings
- GitHub Actions CI fully green on master

## Key Risks / Unknowns

- **Immutable.js 4→5 breaking changes** — Major version bump touching 20+ files. Could require Record/Map/List API changes, import path changes, or type signature updates. Medium risk.
- **TypeScript 5→6 strictness** — Already causing `null` assignability and implicit `any` errors in test files. Known fixes needed but scope may be larger than CI shows. Low-medium risk.

## Proof Strategy

- Immutable.js 5 breakage → retire in S01 by proving all Angular unit tests pass and `ng build` succeeds after the upgrade
- TypeScript 6 strictness → retire in S01 alongside Immutable.js since the errors are in the same test files

## Verification Classes

- Contract verification: Angular unit tests pass, Python unit tests pass, `ng build` clean, `npm run lint` clean
- Integration verification: E2E Playwright tests pass, Settings page shows token, toasts render correctly
- Operational verification: none (no backend behavior changes)
- UAT / human verification: Visual check of token field in Settings, toast styling in browser

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 3 slice deliverables are complete
- Settings page token display works for authenticated sessions
- Toast notifications use earthy palette colors
- All dependencies from PR #161 are at their updated versions
- Full CI pipeline passes (Angular unit, Python unit, E2E, Docker build)
- No TypeScript compilation errors, no SCSS errors, no console errors in browser

## Requirement Coverage

- Covers: R017, R040
- Partially covers: none
- Leaves for later: none
- Orphan risks: none

## Slices

- [x] **S01: Dependency updates** `risk:medium` `depends:[]`
  > After this: All 21 npm packages updated including Immutable.js 5 and TypeScript 6; Angular unit tests, build, and lint all pass in CI.

- [x] **S02: API token in Settings** `risk:low` `depends:[S01]`
  > After this: Settings page shows the API token in a read-only copyable field; token is only visible for authenticated sessions.

- [x] **S03: Toast notification restyle** `risk:low` `depends:[S01]`
  > After this: Toast notifications use earthy palette colors and styling consistent with the rest of the UI.

- [x] **S04: Deep code review & fixes** `risk:low` `depends:[S01,S02,S03]`
  > After this: All findings from deep code review skill addressed — code quality, security, and correctness issues fixed across the codebase.

## Boundary Map

### S01 → S02

Produces:
- Updated `package.json` and `package-lock.json` with all 21 dependency bumps
- Working Immutable.js 5 imports and API usage across all consuming files
- Clean TypeScript 6 compilation with no type errors
- All Angular unit tests passing

Consumes:
- nothing (first slice)

### S01 → S03

Produces:
- Same as S01 → S02 (stable build baseline for further UI changes)

Consumes:
- nothing (first slice)

### S02 (standalone)

Produces:
- Token display field in Settings page component
- Backend already serves unredacted config for authenticated requests (D001, existing)

Consumes from S01:
- Clean build baseline with updated dependencies

### S03 (standalone)

Produces:
- Restyled toast component/SCSS using earthy palette CSS custom properties
- Updated notification rendering matching --app-* design tokens from M003

Consumes from S01:
- Clean build baseline with updated dependencies

### S04 (terminal)

Produces:
- Fixes for all actionable findings from deep code review (security, correctness, quality)
- All tests still passing after fixes

Consumes from S01, S02, S03:
- Final codebase state with all prior slices complete
