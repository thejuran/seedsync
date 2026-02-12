---
phase: 30-scss-audit-color-fixes
plan: 01
subsystem: frontend/styling
tags: [css-variables, theming, forms, dropdowns]
dependency_graph:
  requires:
    - 29-01: ThemeService infrastructure for data-bs-theme attribute management
    - 29-02: ThemeService unit tests for multi-tab sync and OS preference detection
  provides:
    - custom_css_variables: "--app-* variables for both light and dark themes"
    - theme_aware_forms: "Form controls adapt to active theme"
    - global_dropdown_theming: "Dropdowns inherit from global data-bs-theme"
  affects:
    - 30-02: Component SCSS files will consume --app-* variables
    - 31-*: Theme toggle UI will switch between themes
tech_stack:
  added: []
  patterns:
    - "CSS custom properties with data-bs-theme scoping"
    - "Theme-scoped SCSS blocks for light/dark variants"
key_files:
  created: []
  modified:
    - path: src/angular/src/styles.scss
      changes: "Added 25 custom --app-* CSS variables for light and dark themes"
      lines: 60
    - path: src/angular/src/app/common/_bootstrap-overrides.scss
      changes: "Restructured form controls to be theme-aware (dark mode only overrides)"
      lines: 18
    - path: src/angular/src/app/pages/files/file-options.component.html
      changes: "Removed 2 hardcoded data-bs-theme='dark' attributes from dropdowns"
      lines: 4
decisions: []
metrics:
  duration_minutes: 2
  tasks_completed: 2
  files_modified: 3
  tests_passing: 412
  completed_date: "2026-02-12"
---

# Phase 30 Plan 01: Custom CSS Variables & Theme-Aware Forms Summary

**One-liner:** Custom --app-* CSS variables defined for 13 color properties across light/dark themes, form controls and dropdowns now theme-aware via global data-bs-theme.

## What Was Built

This plan established the CSS variable foundation that Phase 30 Plan 02 component migrations depend on, and fixed two cross-cutting concerns (forms and dropdowns) that are styled in shared SCSS files.

### Task 1: Custom CSS Variables & Theme-Aware Forms

**Added custom CSS variables to styles.scss:**
- Created `:root, [data-bs-theme="light"]` block with 13 light mode variables
- Created `[data-bs-theme="dark"]` block with 13 dark mode variables
- Variables organized by category: layout backgrounds (3), file list (5), text (3), accents (2)

**Key design decisions:**
- File header intentionally stays dark (`#212529`) in light mode as a design accent
- File header uses very dark gray (`#1a1d20`) in dark mode for better integration
- Light mode gets Bootstrap's default white form backgrounds and dark text
- Dark mode gets explicit dark form backgrounds (`#212529`) and light text

**Restructured form controls in _bootstrap-overrides.scss:**
- Removed unscoped `.form-control` and `.form-check-input` blocks (43 lines)
- Added theme-scoped `[data-bs-theme="dark"]` block with form controls (40 lines)
- Light mode now uses Bootstrap defaults (no overrides needed)
- Dark mode retains existing dark styling with explicit backgrounds

**Files modified:**
- `src/angular/src/styles.scss`: Added 60 lines of custom CSS variables
- `src/angular/src/app/common/_bootstrap-overrides.scss`: Restructured 43 lines into theme-scoped blocks

### Task 2: Global Dropdown Theming

**Removed hardcoded theme attributes:**
- Line 12: Removed `data-bs-theme="dark"` from `#filter-status` dropdown
- Line 116: Removed `data-bs-theme="dark"` from `#sort-status` dropdown

**Updated dropdown comment:**
- Changed from "Uses CSS variables so components only need data-bs-theme='dark' attribute"
- To "Applied when global data-bs-theme='dark' is set on documentElement by ThemeService"

**Result:**
- Dropdowns now inherit from global theme set by ThemeService
- Dark mode applies custom blue/teal dropdown styling (existing `[data-bs-theme="dark"]` block)
- Light mode gets Bootstrap defaults (white background, dark text, standard hover)

**Files modified:**
- `src/angular/src/app/pages/files/file-options.component.html`: Removed 2 hardcoded attributes
- `src/angular/src/app/common/_bootstrap-overrides.scss`: Updated 2 comment lines

## Verification Results

All verification criteria passed:

1. **Build:** `ng build --configuration development` completed successfully (820ms final build)
2. **Linting:** Pre-existing errors in ThemeService tests (Phase 29), no new errors introduced
3. **Tests:** All 412 unit tests pass in 0.288 seconds
4. **Hardcoded attributes:** Zero matches for `data-bs-theme="dark"` in HTML templates
5. **CSS variables:** 25 `--app-` variable references found in styles.scss
6. **Theme scoping:** 2 `[data-bs-theme="dark"]` blocks in _bootstrap-overrides.scss (dropdowns + forms)

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 9a32aa9 | feat(30-01): add custom CSS variables and theme-aware form controls |
| 2 | 88d6258 | feat(30-01): remove hardcoded data-bs-theme from dropdowns |

## Integration Points

**Downstream dependencies:**
- Phase 30 Plan 02 component SCSS files will consume `var(--app-*)` variables
- Phase 31 theme toggle UI will trigger theme switching via ThemeService
- All form inputs now automatically adapt to theme changes

**CSS variable usage pattern:**
```scss
// Component SCSS files (Plan 02) will use:
background-color: var(--app-header-bg);
color: var(--app-logo-color);
border-color: var(--app-file-border-color);
```

## Self-Check: PASSED

**Created files verified:**
- FOUND: .planning/phases/30-scss-audit-color-fixes/30-01-SUMMARY.md

**Modified files verified:**
- FOUND: src/angular/src/styles.scss
- FOUND: src/angular/src/app/common/_bootstrap-overrides.scss
- FOUND: src/angular/src/app/pages/files/file-options.component.html

**Commits verified:**
- FOUND: 9a32aa9 (Task 1 - Custom CSS variables and theme-aware forms)
- FOUND: 88d6258 (Task 2 - Remove hardcoded data-bs-theme from dropdowns)

**Build verification:**
- Build successful: Hash a6c38bcdbaf9ca54
- All 412 tests passing
- Zero hardcoded data-bs-theme in HTML templates

All claims verified successfully.
