# Unify UI Styling

## What This Is

UI refinement work for SeedSync's Angular frontend. v1.0-v1.1 unified CSS/SCSS styling (Bootstrap migration, color consolidation, button standardization). v1.2 removes obsolete UI elements made redundant by virtual scrolling and sticky action bar changes.

## Core Value

Consistent visual appearance across all pages while maintaining all existing functionality.

## Requirements

### Validated

**v1.2 (Shipped 2026-02-04):**

- Details button removed (incompatible with fixed-height virtual scroll rows) - v1.2
- Pin button removed (unnecessary since actions bar always visible) - v1.2

**v1.1 (Shipped 2026-02-04):**

- File options dropdowns use Bootstrap dropdown component - v1.1
- Custom `%dropdown` and `%toggle` placeholders removed - v1.1
- Dropdown positioning works correctly (z-index, overflow, flip behavior) - v1.1
- All text inputs use consistent Bootstrap form styling - v1.1
- Checkboxes and toggles styled consistently - v1.1
- Form focus states use app color scheme (teal) - v1.1
- Full E2E test suite passes (387 unit tests verified) - v1.1
- Visual QA walkthrough complete - v1.1
- Responsive breakpoints tested (768px+) - v1.1
- Unused CSS/SCSS removed - v1.1

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

(None — start next milestone with `/gsd:new-milestone`)

### Out of Scope

- Adding new UI features - this is purely CSS refactoring
- Changing component behavior - styling only
- Major layout restructuring - preserve existing layouts
- Adding new dependencies - use existing Bootstrap 5
- Dark mode toggle - not part of current unification work
- Full @use migration - Bootstrap Sass @import approach maintained

## Context

**Current state (v1.1 shipped):**
- Angular 19.x with Bootstrap 5.3 SCSS source imports
- Bootstrap theme colors defined in `_bootstrap-variables.scss`
- All component SCSS files use Bootstrap semantic variables
- Selection uses secondary (teal) color palette with visual hierarchy
- All buttons use Bootstrap btn classes with consistent 40px sizing
- Dropdowns use Bootstrap native component with dark theme via CSS variables
- Form inputs use Bootstrap classes with teal focus rings
- All 387 Angular unit tests passing
- Visual QA verified at desktop and tablet (768px) widths

**Technical notes:**
- Using @import for Bootstrap (not migrated to @use)
- Bootstrap subtle variables re-exported in _common.scss for component module access
- Third-party deprecation warnings (Bootstrap, Font-Awesome) accepted as noise
- Sass @import deprecation will need addressing before Dart Sass 3.0

## Constraints

- **Removal only**: v1.2 removes obsolete elements, doesn't add new features
- **No functional regressions**: Remaining buttons must continue working
- **Bootstrap 5 patterns**: Leverage Bootstrap classes where possible
- **Clean removal**: Remove all associated code (template, component logic, styles)

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
| CSS variables for Bootstrap theming | Easier maintenance, runtime flexibility vs SCSS overrides | Good |
| 150ms dropdown fade animation | Smooth but not sluggish transition | Good |
| Passive scroll listener outside Angular zone | Performance optimization for high-frequency events | Good |
| Bootstrap variable cascade for form theming | $component-active-bg propagates teal to all form states | Good |
| Focus ring: 0.25rem width, 25% opacity | Balances visibility with subtlety | Good |

## Project Status

**Status:** COMPLETE — v1.2 UI Cleanup shipped

All UI refinement work complete. Dropdowns, forms, buttons, and cleanup all done.

**Future work (if desired):**
- Dark mode toggle feature
- Full @use migration when Dart Sass 3.0 becomes urgent
- Pre-existing lint error cleanup (62 TypeScript strictness issues)

---
*Last updated: 2026-02-04 after v1.2 milestone completed*
