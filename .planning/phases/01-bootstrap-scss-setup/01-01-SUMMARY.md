---
phase: 01-bootstrap-scss-setup
plan: 01
subsystem: ui
tags: [bootstrap, scss, sass, angular, styling]

# Dependency graph
requires:
  - phase: none
    provides: Initial project state with Bootstrap 5 pre-compiled CSS
provides:
  - Bootstrap SCSS source compilation infrastructure
  - Variable override system for customization
  - Post-compilation override system
  - ARM64 Docker test support (Chromium)
affects: [02-button-migration, 03-teal-selection, 04-session-styling, 05-final-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Bootstrap SCSS compilation from source
    - Two-layer customization (pre-variables, post-compilation)
    - Architecture-aware Docker builds (ARM64/AMD64)

key-files:
  created:
    - src/angular/src/app/common/_bootstrap-variables.scss
    - src/angular/src/app/common/_bootstrap-overrides.scss
  modified:
    - src/angular/src/styles.scss
    - src/angular/angular.json
    - src/docker/test/angular/Dockerfile

key-decisions:
  - "Use @import instead of @use for Bootstrap (Bootstrap not migrated to @use yet)"
  - "Two-layer customization: variables (pre-compilation) and overrides (post-compilation)"
  - "Use Chromium on ARM64, Chrome on AMD64 (Google Chrome not available for ARM64 Linux)"

patterns-established:
  - "Bootstrap SCSS import order: functions → variables → overrides → components → utilities API → post-overrides"
  - "Separation of concerns: _bootstrap-variables.scss for variable changes, _bootstrap-overrides.scss for component tweaks"

# Metrics
duration: 8min
completed: 2026-02-03
---

# Phase 01 Plan 01: Bootstrap SCSS Setup Summary

**Migrated from pre-compiled Bootstrap CSS to customizable Bootstrap SCSS source with two-layer override system**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-04T00:20:48Z
- **Completed:** 2026-02-04T00:28:26Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Replaced pre-compiled bootstrap.min.css with Bootstrap SCSS source imports
- Created infrastructure for Bootstrap variable customization (_bootstrap-variables.scss)
- Created infrastructure for post-compilation overrides (_bootstrap-overrides.scss)
- All 387 Angular unit tests passing without deprecation warnings
- Fixed ARM64 Docker test support using Chromium

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Bootstrap SCSS infrastructure files** - `4bfdea3` (feat)
2. **Task 2: Update styles.scss with Bootstrap SCSS imports** - `eed016f` (feat)
3. **Task 3: Update angular.json build configuration** - `698bb09` (feat)

**Deviation fix:** `e981c6b` (fix: ARM64 Docker test support)

**Plan metadata:** (will be committed separately)

## Files Created/Modified

- `src/angular/src/app/common/_bootstrap-variables.scss` - Placeholder for Bootstrap variable overrides (pre-compilation)
- `src/angular/src/app/common/_bootstrap-overrides.scss` - Post-compilation Bootstrap component overrides
- `src/angular/src/styles.scss` - Main stylesheet with Bootstrap SCSS imports in correct order
- `src/angular/angular.json` - Build configuration updated to remove pre-compiled CSS
- `src/docker/test/angular/Dockerfile` - Chrome/Chromium installation with ARM64 support

## Decisions Made

1. **silenceDeprecations not implemented** - Angular CLI 19.2 workspace schema includes `stylePreprocessorOptions.sass.silenceDeprecations`, but karma and browser builders haven't implemented it yet. Since there are no deprecation warnings in practice, this is acceptable.

2. **Two-layer customization approach** - Variables file for pre-compilation overrides (changing Bootstrap defaults), overrides file for post-compilation tweaks (modifying compiled components). This separates concerns and makes future customization clear.

3. **Chromium for ARM64** - Google Chrome isn't available for ARM64 Linux. Using Chromium from Debian repositories for ARM64, Chrome for AMD64. Symlink created for compatibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ARM64 Docker test incompatibility**
- **Found during:** Verification (running tests)
- **Issue:** Dockerfile hardcoded AMD64 Chrome download, failing on ARM64 systems (Apple Silicon Macs) with architecture mismatch error
- **Fix:** Added architecture detection using `dpkg --print-architecture`. ARM64 installs Chromium from Debian repos with symlink to google-chrome. AMD64 continues using Google Chrome.
- **Files modified:** src/docker/test/angular/Dockerfile
- **Verification:** All 387 tests pass on ARM64 system
- **Committed in:** e981c6b (separate fix commit)

**2. [Rule 3 - Blocking] Removed silenceDeprecations due to Angular CLI limitation**
- **Found during:** Task 3 verification (test run)
- **Issue:** Angular CLI 19.2's karma builder schema only supports `stylePreprocessorOptions.includePaths`, not `stylePreprocessorOptions.sass.silenceDeprecations`. The feature exists in workspace schema but isn't wired up to builders yet. This caused schema validation error.
- **Fix:** Removed silenceDeprecations configuration from angular.json. Build and tests run successfully without deprecation warnings anyway.
- **Files modified:** src/angular/angular.json (part of Task 3)
- **Verification:** Tests pass, no deprecation warnings in output
- **Committed in:** 698bb09 (Task 3 commit amended)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 blocking)
**Impact on plan:** Both fixes necessary for tests to run. No scope creep. ARM64 fix improves cross-platform support. silenceDeprecations removal has no impact since no warnings appear.

## Issues Encountered

1. **Angular CLI schema inconsistency** - Workspace schema includes advanced Sass options, but individual builder schemas don't. This appears to be a feature gap in Angular 19.2. No action needed since deprecation warnings don't appear in practice.

2. **Google Chrome ARM64 unavailability** - Google doesn't distribute Chrome for ARM64 Linux. Chromium from Debian repos is the standard alternative and works identically for headless testing.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Bootstrap SCSS compilation infrastructure complete
- Variable override system ready for customization
- All tests passing (387/387)
- No deprecation warnings
- Build system supports both ARM64 and AMD64 architectures
- Ready for button class migration in Phase 2

---
*Phase: 01-bootstrap-scss-setup*
*Completed: 2026-02-03*
