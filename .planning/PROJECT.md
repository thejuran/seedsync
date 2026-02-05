# Unify UI Styling

## What This Is

CSS/SCSS refactoring work to unify visual styling across SeedSync's Angular frontend. The UI had inconsistencies from the Angular 4->19 and Bootstrap 4->5 migration - hardcoded colors, mixed button patterns, inconsistent selection highlighting. v1.0 standardized everything without changing functionality.

## Core Value

Consistent visual appearance across all pages while maintaining all existing functionality.

## Requirements

### Validated

**v1.0 (Shipped 2026-02-03):**

- Bootstrap SCSS infrastructure with customizable variables - v1.0
- All colors consolidated to Bootstrap theme variables - v1.0
- Selection highlighting unified with teal (secondary) palette - v1.0
- All buttons standardized to Bootstrap semantic variants - v1.0
- Custom %button SCSS placeholder removed - v1.0
- 40px consistent button sizing across all pages - v1.0

**Existing SeedSync functionality (not part of this work):**

- File sync from remote server via LFTP - existing
- Real-time status via SSE streaming - existing
- Queue/stop/extract/delete file operations - existing
- Settings configuration - existing
- AutoQueue pattern matching - existing
- Logs viewing - existing

### Active

**v2 work (deferred):**

- [ ] **DROP-01**: File options dropdowns use Bootstrap dropdown component
- [ ] **DROP-02**: Custom `%dropdown` and `%toggle` placeholders removed
- [ ] **DROP-03**: Dropdown positioning works correctly (z-index, overflow)
- [ ] **FORM-01**: All text inputs use consistent Bootstrap form styling
- [ ] **FORM-02**: Checkboxes and toggles styled consistently
- [ ] **FORM-03**: Form focus states use app color scheme
- [ ] **POLISH-01**: Full E2E test suite passes
- [ ] **POLISH-02**: Visual QA walkthrough complete
- [ ] **POLISH-03**: Responsive breakpoints tested
- [ ] **POLISH-04**: Unused CSS/SCSS removed

### Out of Scope

- Adding new UI features - this is purely CSS refactoring
- Changing component behavior - styling only
- Major layout restructuring - preserve existing layouts
- Adding new dependencies - use existing Bootstrap 5
- Dark mode - not part of current unification work
- Full @use migration - Bootstrap Sass @import approach maintained

## Context

**Current state (v1.0 shipped):**
- Angular 19.x with Bootstrap 5.3 SCSS source imports
- Bootstrap theme colors defined in `_bootstrap-variables.scss`
- All component SCSS files use Bootstrap semantic variables
- Selection uses secondary (teal) color palette with visual hierarchy
- All buttons use Bootstrap btn classes with consistent 40px sizing
- Custom %button placeholder removed from `_common.scss`
- All 387 Angular unit tests passing

**Technical notes:**
- Using @import for Bootstrap (not migrated to @use)
- Bootstrap subtle variables re-exported in _common.scss for component module access
- Third-party deprecation warnings (Bootstrap, Font-Awesome) accepted as noise

## Constraints

- **CSS only**: No JavaScript/TypeScript changes - styling refactoring only
- **No functional changes**: All button clicks, form submissions must work identically
- **Bootstrap 5 patterns**: Leverage Bootstrap classes where possible, override for customization
- **Preserve design**: Keep existing colors and spacing, just consolidate implementation

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use teal (secondary) for all selections | Teal is more distinctive than blue, already used in bulk selection | Good |
| Migrate to Bootstrap `btn` classes | Reduces custom CSS, leverages Bootstrap's states | Good |
| Keep @import for Bootstrap SCSS | Mixing @use/@import creates namespace conflicts | Good |
| Two-layer customization (variables + overrides) | Separates pre-compilation and post-compilation customization | Good |
| Re-export Bootstrap variables in _common.scss | Bridges @import (global) and @use (module) scopes | Good |
| 40px button sizing | Consistent touch-friendly targets across all pages | Good |
| Button semantic mapping | danger=destructive, success=additive, primary=positive | Good |

## Current Milestone: v1.1 Dropdown & Form Migration

**Goal:** Complete UI styling unification by migrating dropdowns to Bootstrap components and standardizing form inputs.

**Target features:**
- Dropdown migration to Bootstrap dropdown component
- Form input standardization (text inputs, checkboxes, toggles)
- Final polish (E2E tests, visual QA, responsive testing)

---
*Last updated: 2026-02-04 after v1.1 milestone start*
