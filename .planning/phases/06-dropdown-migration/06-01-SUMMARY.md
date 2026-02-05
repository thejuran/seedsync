---
phase: 06-dropdown-migration
plan: 01
subsystem: ui
tags: [bootstrap, scss, angular, dropdown, css-variables]

# Dependency graph
requires:
  - phase: v1.0
    provides: Bootstrap 5.3 upgrade and Angular 19 modernization
provides:
  - Bootstrap-native dropdown component with dark theme styling
  - CSS variable-based dropdown theming via data-bs-theme attribute
  - Close-on-scroll behavior for dropdown menus
  - Removal of 150+ lines of custom SCSS placeholder code
affects: [07-form-migration, future-ui-components]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CSS variables for Bootstrap theme customization"
    - "NgZone.runOutsideAngular for performance-optimized scroll handlers"

key-files:
  created: []
  modified:
    - src/angular/src/app/common/_bootstrap-overrides.scss
    - src/angular/src/app/pages/files/file-options.component.scss
    - src/angular/src/app/pages/files/file-options.component.html
    - src/angular/src/app/pages/files/file-options.component.ts

key-decisions:
  - "Use CSS variables for dark theme instead of hardcoded SCSS"
  - "150ms fade animation for dropdown open/close"
  - "100ms hover transition for dropdown items"
  - "Passive scroll listener outside Angular zone for performance"

patterns-established:
  - "data-bs-theme=\"dark\" attribute triggers CSS variable overrides for Bootstrap components"
  - "Scroll listeners run outside Angular zone with passive flag for performance"
  - "Bootstrap dropdown instances accessed via bootstrap.Dropdown.getInstance()"

# Metrics
duration: 3min 20sec
completed: 2026-02-04
---

# Phase 6 Plan 1: Dropdown Migration Summary

**File options dropdowns migrated to Bootstrap's native component with CSS variable-based dark theme and close-on-scroll behavior, removing 150+ lines of custom SCSS**

## Performance

- **Duration:** 3 min 20 sec
- **Started:** 2026-02-04T17:55:39Z
- **Completed:** 2026-02-04T17:58:59Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Removed 150+ lines of custom SCSS placeholder code (%dropdown, %toggle)
- Implemented Bootstrap-native dropdowns with proper positioning (dropdown-menu-end)
- Dark theme styling via CSS variables matching app color scheme
- 150ms fade animation and 100ms hover transitions
- Close-on-scroll behavior prevents orphaned dropdown menus

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Bootstrap dark dropdown theme overrides** - `8d57357` (feat)
2. **Task 2: Migrate dropdown HTML and remove SCSS placeholders** - `b9aecaf` (refactor)
3. **Task 3: Add close-on-scroll behavior** - `7e718cb` (feat)

## Files Created/Modified
- `src/angular/src/app/common/_bootstrap-overrides.scss` - CSS variable overrides for dark dropdown theme, fade animation, hover transitions
- `src/angular/src/app/pages/files/file-options.component.html` - Added data-bs-theme="dark" and dropdown-menu-end to dropdown containers
- `src/angular/src/app/pages/files/file-options.component.scss` - Removed %dropdown and %toggle placeholders, replaced with component-specific Bootstrap-native styling
- `src/angular/src/app/pages/files/file-options.component.ts` - Added scroll listener with NgZone optimization to close dropdowns on scroll

## Decisions Made
- **CSS variables for theming:** Used Bootstrap's CSS variable system (--bs-dropdown-bg, etc.) instead of SCSS overrides for easier maintenance and runtime flexibility
- **150ms fade animation:** Based on user decision from research phase for smooth but not sluggish dropdown open/close
- **100ms hover transitions:** Subtle hover feedback without feeling delayed
- **Passive scroll listener outside Angular zone:** Performance optimization - scroll events fire frequently and don't need change detection

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 6 Plan 2:** Form control migration can proceed. Dropdown pattern established:
- Dark theme via data-bs-theme attribute
- CSS variables in _bootstrap-overrides.scss
- Component-specific styling without placeholders

**Pattern established for future components:**
1. Add theme CSS variables to _bootstrap-overrides.scss
2. Use data-bs-theme attribute on component containers
3. Keep component-specific styling in component SCSS (no placeholders/extends)
4. Use NgZone.runOutsideAngular for high-frequency event handlers

**No blockers or concerns.**

---
*Phase: 06-dropdown-migration*
*Completed: 2026-02-04*
