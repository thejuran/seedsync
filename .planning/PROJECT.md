# Unify UI Styling

## What This Is

CSS/SCSS refactoring work to unify visual styling across SeedSync's Angular frontend. The UI has inconsistencies from the Angular 4→19 and Bootstrap 4→5 migration — hardcoded colors, mixed button patterns, inconsistent selection highlighting. This work standardizes everything without changing functionality.

## Core Value

Consistent visual appearance across all pages while maintaining all existing functionality.

## Requirements

### Validated

Existing SeedSync functionality (not part of this work):

- ✓ File sync from remote server via LFTP — existing
- ✓ Real-time status via SSE streaming — existing
- ✓ Queue/stop/extract/delete file operations — existing
- ✓ Settings configuration — existing
- ✓ AutoQueue pattern matching — existing
- ✓ Logs viewing — existing

### Active

**Session 1: Color Variable Consolidation**
- [ ] **STYLE-01**: All hardcoded colors replaced with variables in `_common.scss`
- [ ] **STYLE-02**: File list header uses color variables (not hardcoded #000/#fff)
- [ ] **STYLE-03**: AutoQueue page uses color variables (not hardcoded red/green)

**Session 2: Selection Color Unification**
- [ ] **STYLE-04**: Selection banner uses secondary (teal) colors, not primary (blue)
- [ ] **STYLE-05**: Bulk actions bar uses same selection color scheme
- [ ] **STYLE-06**: File row selection highlighting consistent with banner/bar

**Session 3: Button Standardization - File Actions**
- [ ] **STYLE-07**: Bootstrap button overrides defined in `_common.scss`
- [ ] **STYLE-08**: File action buttons use Bootstrap `btn` classes
- [ ] **STYLE-09**: Icon buttons maintain proper sizing and alignment

**Session 4: Button Standardization - Other Pages**
- [ ] **STYLE-10**: Settings page buttons use Bootstrap classes
- [ ] **STYLE-11**: AutoQueue page buttons use Bootstrap classes
- [ ] **STYLE-12**: Logs page buttons use Bootstrap classes (if applicable)
- [ ] **STYLE-13**: Custom `%button` placeholder removed or deprecated

### Out of Scope

- Dropdown migration to Bootstrap — deferred to future work (Session 5)
- Form input standardization — deferred to future work (Session 6)
- Adding new UI features — this is purely CSS refactoring
- Changing component behavior — styling only
- Major layout restructuring — preserve existing layouts
- Adding new dependencies — use existing Bootstrap 5

## Context

**Current state:**
- Angular 19.x with Bootstrap 5.3 (recently migrated from Angular 4/Bootstrap 4)
- Custom `%button` placeholder pattern in `_common.scss` conflicts with Bootstrap `btn` classes
- Hardcoded hex colors scattered across component SCSS files
- Inconsistent selection colors (blue in some places, teal in others)
- Button heights vary: 34px, 35px, 40px, 60px across different pages

**Existing color variables in `_common.scss`:**
```scss
$primary-color: #337BB7;              // Main blue
$primary-dark-color: #2e6da4;         // Darker blue
$primary-light-color: #D7E7F4;        // Light blue (backgrounds)
$secondary-color: #79DFB6;            // Teal/green (selections)
$secondary-light-color: #C5F0DE;      // Light teal
$secondary-dark-color: #32AD7B;       // Dark teal
$header-color: #DDDDDD;               // Light gray header
```

**Testing approach:**
- Run `make run-tests-angular` after each session (catches compile errors)
- Visual spot-check after each session
- Full E2E test suite runs in CI on PR

## Constraints

- **CSS only**: No JavaScript/TypeScript changes — styling refactoring only
- **No functional changes**: All button clicks, form submissions must work identically
- **Bootstrap 5 patterns**: Leverage Bootstrap classes where possible, override for customization
- **Preserve design**: Keep existing colors and spacing, just consolidate implementation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use teal (secondary) for all selections | Teal is more distinctive than blue, already used in bulk selection | — Pending |
| Migrate to Bootstrap `btn` classes | Reduces custom CSS, leverages Bootstrap's states (hover, active, disabled) | — Pending |
| Sessions 1-4 first, 5-6 later | Delivers biggest visual impact first, dropdowns/forms are lower priority | — Pending |

---
*Last updated: 2026-02-03 after initialization*
