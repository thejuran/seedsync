---
phase: 30-scss-audit-color-fixes
plan: 02
subsystem: frontend/styling
tags: [css-variables, theming, component-scss, dark-mode]
dependency_graph:
  requires:
    - 30-01: Custom CSS variables (--app-*) defined for both light and dark themes
  provides:
    - theme_aware_components: "All component SCSS files use CSS variables instead of hardcoded colors"
    - dark_mode_ready: "Components render correctly in both light and dark themes"
  affects:
    - 31-*: Theme toggle UI will switch all components between themes seamlessly
tech_stack:
  added: []
  patterns:
    - "CSS custom properties consumption in component SCSS"
    - "Bootstrap CSS semantic variables for warning/danger/border colors"
    - "Dark mode scoped overrides for sidebar background"
key_files:
  created: []
  modified:
    - path: src/angular/src/app/pages/main/app.component.scss
      changes: "Replaced 6 hardcoded colors with CSS variables, added dark mode sidebar override"
      lines: 13
    - path: src/angular/src/app/pages/files/file-list.component.scss
      changes: "Replaced 3 hardcoded colors with CSS variables"
      lines: 5
    - path: src/angular/src/app/pages/logs/logs-page.component.scss
      changes: "Replaced 6 hardcoded colors/SCSS variables with Bootstrap CSS variables"
      lines: 10
    - path: src/angular/src/app/pages/about/about-page.component.scss
      changes: "Replaced 5 hardcoded colors with CSS variables"
      lines: 5
    - path: src/angular/src/app/pages/files/file.component.scss
      changes: "Replaced 2 hardcoded colors with CSS variables"
      lines: 2
    - path: src/angular/src/app/pages/main/sidebar.component.scss
      changes: "Replaced 2 hardcoded colors with CSS variables"
      lines: 2
    - path: src/angular/src/app/pages/main/header.component.scss
      changes: "Replaced 1 hardcoded color with CSS variable"
      lines: 1
decisions:
  - "Use Bootstrap CSS variables (--bs-warning-text-emphasis, etc.) for log level colors instead of SCSS variables to enable runtime theme adaptation"
  - "Use dark mode scoped override for sidebar background (#1e2125) instead of CSS variable since it's a compile-time SCSS variable"
metrics:
  duration_minutes: 3
  tasks_completed: 2
  files_modified: 7
  tests_passing: 412
  completed_date: "2026-02-12"
---

# Phase 30 Plan 02: Component SCSS Migrations Summary

**One-liner:** Migrated all seven component SCSS files to use theme-aware CSS variables, replacing 25 hardcoded hex colors and SCSS compile-time variables with runtime CSS variables for full dark/light theme support.

## What Was Built

This plan completed the SCSS audit by migrating all remaining hardcoded colors in component files to CSS variables, making every page and component fully theme-aware.

### Task 1: Migrate high-priority component SCSS files

**app.component.scss changes:**
- Line 14: `background-color: #f5f5f5` → `var(--app-top-header-bg)` (Safari toolbar tinting)
- Lines 25-26: `background-color: black; opacity: .25` → `var(--app-sidebar-overlay-bg)` (removed opacity since baked into rgba)
- Line 30: `background-color: $header-color` → `var(--app-header-bg)`
- Line 77: `color: $logo-color` → `var(--app-logo-color)` (sidebar logo text)
- Line 87: `color: red` → `var(--bs-danger)` (close button active state)
- Line 134: `background-color: $header-dark-color` → `var(--bs-secondary-bg)` (sidebar open button)
- Added dark mode override after line 92: `[data-bs-theme="dark"] #top-sidebar { background-color: #1e2125; }`

**file-list.component.scss changes:**
- Line 17: `background: rgba(white, 0.8)` → `var(--app-bulk-overlay-bg)`
- Line 27: `color: $gray-800` → `var(--bs-body-color)`
- Lines 91-92: `color: white; background-color: black` → `var(--app-file-header-color); var(--app-file-header-bg)`

**logs-page.component.scss changes:**
- Line 49: `color: darkgray` → `var(--bs-secondary-color)` (debug logs)
- Line 53: `color: black` → `var(--bs-body-color)` (info logs)
- Lines 57-59: SCSS warning variables → Bootstrap CSS variables (`--bs-warning-text-emphasis`, `--bs-warning-bg-subtle`, `--bs-warning-border-subtle`)
- Lines 63-65: SCSS danger variables → Bootstrap CSS variables (`--bs-danger-text-emphasis`, `--bs-danger-bg-subtle`, `--bs-danger-border-subtle`)
- Line 84: `border-bottom: 1px solid $gray-300` → `var(--bs-border-color)`
- Line 88: `background-color: $gray-100` → `var(--bs-tertiary-bg)`

**Key insight:** Bootstrap CSS variables (--bs-warning-text-emphasis, etc.) are runtime theme-aware, while SCSS variables ($warning-text-emphasis) are compile-time only and don't adapt to theme changes.

**Files modified:**
- `src/angular/src/app/pages/main/app.component.scss`: 13 line changes
- `src/angular/src/app/pages/files/file-list.component.scss`: 5 line changes
- `src/angular/src/app/pages/logs/logs-page.component.scss`: 10 line changes

### Task 2: Migrate remaining component SCSS files

**about-page.component.scss changes:**
- Line 23: `color: $logo-color` → `var(--app-logo-color)` (banner logo text)
- Line 60: `color: $logo-color` → `var(--app-logo-color)` (bullet points)
- Line 75: `color: #999` → `var(--app-separator-color)` (link separators)
- Line 90: `color: #666` → `var(--app-muted-text)` (fork note)
- Line 95: `color: #999` → `var(--app-separator-color)` (icon credits)

**file.component.scss changes:**
- Line 11: `border-bottom: 1px solid #ddd` → `var(--app-file-border-color)`
- Line 24: `background-color: $primary-lighter-color` → `var(--app-file-row-even)` (even-row striping)

**sidebar.component.scss changes:**
- Line 27: `border-color: #6ac19e` → `var(--app-accent-teal-border)` (selected item teal border)
- Line 50: `border: 1px solid $header-dark-color` → `var(--bs-border-color)` (hr dividers)

**header.component.scss changes:**
- Line 20: `color: red` → `var(--bs-danger)` (close button active state)

**Files modified:**
- `src/angular/src/app/pages/about/about-page.component.scss`: 5 line changes
- `src/angular/src/app/pages/files/file.component.scss`: 2 line changes
- `src/angular/src/app/pages/main/sidebar.component.scss`: 2 line changes
- `src/angular/src/app/pages/main/header.component.scss`: 1 line change

## Verification Results

All verification criteria passed:

1. **Build:** `ng build --configuration development` completed successfully (Hash: ce6ba6c5fa0e434f, 1075ms)
2. **Linting:** Pre-existing errors in ThemeService tests (Phase 29), no new errors introduced
3. **Tests:** All 412 unit tests pass in 0.291 seconds
4. **Hardcoded colors audit:** Zero hardcoded hex colors remain in component SCSS files (except intentional dark mode override)
5. **CSS variable references:** All --app-* and --bs-* variable references correspond to definitions in styles.scss and Bootstrap 5.3
6. **Log colors:** Warning/error log colors use Bootstrap CSS semantic variables for runtime theme adaptation

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 3f1d7d2 | feat(30-02): migrate app, file-list, and logs component SCSS to theme-aware CSS variables |
| 2 | 27fb582 | feat(30-02): migrate about, file, sidebar, and header component SCSS to theme-aware CSS variables |

## Integration Points

**Downstream dependencies:**
- Phase 31 theme toggle UI will switch between themes, all components will adapt automatically
- All pages (Files, Settings, About, Logs, Autoqueue) are now fully theme-aware
- Teal accent colors (logo, sidebar selection, etc.) adapt to theme via --app-accent-teal-border and --app-logo-color

**Color migration summary:**

| Component | Hardcoded Colors Removed | CSS Variables Used |
|-----------|--------------------------|-------------------|
| app.component | 6 | --app-top-header-bg, --app-sidebar-overlay-bg, --app-header-bg, --app-logo-color, --bs-danger, --bs-secondary-bg |
| file-list.component | 3 | --app-bulk-overlay-bg, --bs-body-color, --app-file-header-color, --app-file-header-bg |
| logs-page | 6 | --bs-secondary-color, --bs-body-color, --bs-warning-*, --bs-danger-*, --bs-border-color, --bs-tertiary-bg |
| about-page | 5 | --app-logo-color, --app-muted-text, --app-separator-color |
| file.component | 2 | --app-file-border-color, --app-file-row-even |
| sidebar | 2 | --app-accent-teal-border, --bs-border-color |
| header | 1 | --bs-danger |

**Total:** 25 hardcoded colors replaced across 7 component SCSS files.

## Self-Check: PASSED

**Created files verified:**
- FOUND: .planning/phases/30-scss-audit-color-fixes/30-02-SUMMARY.md

**Modified files verified:**
- FOUND: src/angular/src/app/pages/main/app.component.scss
- FOUND: src/angular/src/app/pages/files/file-list.component.scss
- FOUND: src/angular/src/app/pages/logs/logs-page.component.scss
- FOUND: src/angular/src/app/pages/about/about-page.component.scss
- FOUND: src/angular/src/app/pages/files/file.component.scss
- FOUND: src/angular/src/app/pages/main/sidebar.component.scss
- FOUND: src/angular/src/app/pages/main/header.component.scss

**Commits verified:**
- FOUND: 3f1d7d2 (Task 1 - High-priority component SCSS migrations)
- FOUND: 27fb582 (Task 2 - Remaining component SCSS migrations)

**Build verification:**
- Build successful: Hash ce6ba6c5fa0e434f
- All 412 tests passing
- Zero hardcoded hex colors in component SCSS files (except intentional dark mode override)

All claims verified successfully.
