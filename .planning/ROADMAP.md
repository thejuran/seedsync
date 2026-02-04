# Roadmap: Unify UI Styling

## Overview

This roadmap transforms SeedSync's Angular frontend from fragmented styling patterns to a unified Bootstrap 5 SCSS architecture. Starting with infrastructure setup, we progressively consolidate hardcoded colors into variables, standardize button patterns, and unify selection highlighting across all pages. The journey delivers consistent visual appearance while maintaining all existing functionality.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Bootstrap SCSS Setup** - Establish customizable SCSS compilation infrastructure
- [ ] **Phase 2: Color Variable Consolidation** - Replace hardcoded colors with Bootstrap theme variables
- [ ] **Phase 3: Selection Color Unification** - Standardize teal selection highlighting across components
- [ ] **Phase 4: Button Standardization - File Actions** - Migrate file action buttons to Bootstrap classes
- [ ] **Phase 5: Button Standardization - Other Pages** - Complete button migration for all remaining pages

## Phase Details

### Phase 1: Bootstrap SCSS Setup
**Goal**: Proper SCSS compilation infrastructure with Bootstrap source imports
**Depends on**: Nothing (first phase)
**Requirements**: FOUND-01, FOUND-02, FOUND-03, FOUND-04
**Success Criteria** (what must be TRUE):
  1. Build compiles successfully without errors using Bootstrap SCSS source files
  2. All pages render with identical visual appearance to pre-migration state
  3. SCSS import order follows Bootstrap requirements (functions → variables → overrides → Bootstrap)
  4. Angular unit tests pass after migration
**Plans**: 1 plan

Plans:
- [x] 01-01-PLAN.md — Migrate from pre-compiled Bootstrap CSS to SCSS source imports

### Phase 2: Color Variable Consolidation
**Goal**: Single source of truth for colors using Bootstrap theme variables
**Depends on**: Phase 1
**Requirements**: COLOR-01, COLOR-02, COLOR-03, COLOR-04, COLOR-05
**Success Criteria** (what must be TRUE):
  1. Zero hardcoded hex colors remain in component SCSS files
  2. All colors derive from Bootstrap theme variables in `_variables.scss`
  3. File list header displays correct colors from variables
  4. AutoQueue page status buttons use variable-based colors
  5. Angular unit tests pass after color migration
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md — Define Bootstrap theme colors and update _common.scss
- [ ] 02-02-PLAN.md — Migrate component SCSS files to Bootstrap variables

### Phase 3: Selection Color Unification
**Goal**: Consistent teal selection highlighting across all components
**Depends on**: Phase 2
**Requirements**: SELECT-01, SELECT-02, SELECT-03, SELECT-04, SELECT-05
**Success Criteria** (what must be TRUE):
  1. Selection banner uses secondary (teal) colors instead of primary (blue)
  2. Bulk actions bar matches selection banner color scheme
  3. Selected file rows highlight consistently with banner and bar
  4. File row selection, bulk selection, and banner selection are visually cohesive
  5. Selection states remain clearly distinguishable from unselected states
**Plans**: TBD

Plans:
- TBD

### Phase 4: Button Standardization - File Actions
**Goal**: File action buttons use Bootstrap classes with consistent sizing and states
**Depends on**: Phase 3
**Requirements**: BTN-01, BTN-02, BTN-03, BTN-04, BTN-05
**Success Criteria** (what must be TRUE):
  1. File action buttons display with consistent 40px height
  2. All button states work correctly (default, hover, active, disabled)
  3. Icon buttons maintain proper sizing and alignment
  4. Button clicks trigger correct actions (no functional regressions)
  5. Dashboard page file selection and action buttons work correctly
**Plans**: TBD

Plans:
- TBD

### Phase 5: Button Standardization - Other Pages
**Goal**: Complete button migration across all pages with custom placeholder removed
**Depends on**: Phase 4
**Requirements**: BTN-06, BTN-07, BTN-08, BTN-09, BTN-10, BTN-11
**Success Criteria** (what must be TRUE):
  1. Settings page buttons use Bootstrap classes with consistent styling
  2. AutoQueue page buttons use Bootstrap classes with consistent styling
  3. Logs page buttons use Bootstrap classes (if applicable)
  4. All buttons across the application have consistent 40px height
  5. Custom `%button` placeholder no longer exists in `_common.scss`
  6. Angular unit tests pass after complete button migration
**Plans**: TBD

Plans:
- TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Bootstrap SCSS Setup | 1/1 | Complete | 2026-02-03 |
| 2. Color Variable Consolidation | 0/2 | Not started | - |
| 3. Selection Color Unification | 0/TBD | Not started | - |
| 4. Button Standardization - File Actions | 0/TBD | Not started | - |
| 5. Button Standardization - Other Pages | 0/TBD | Not started | - |
