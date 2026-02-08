# SeedSync UI Polish

## What This Is

UI refinement and code quality work for SeedSync's Angular frontend. v1.0-v1.2 unified CSS/SCSS styling (Bootstrap migration, colors, buttons, dropdowns, forms, cleanup). v1.3 added code quality (lint fixes) and UX clarity (status dropdown counts). v1.4 modernizes the Sass module system from deprecated @import to @use/@forward.

## Core Value

Clean, maintainable codebase with intuitive user interface.

## Current State (v1.4 Shipped)

All planned UI Polish milestones are complete. The Sass @import deprecation tech debt is resolved.

**v1.4 Sass @use Migration** shipped 2026-02-08:
- All application SCSS migrated from @import to @use/@forward
- Zero deprecation warnings from application code
- 381 unit tests passing, zero visual regressions
- Only 3 files modified across entire migration

## Current State (v1.3 Shipped)

- Angular 19.x with Bootstrap 5.3 SCSS source imports
- Bootstrap theme colors defined in `_bootstrap-variables.scss`
- All component SCSS files use Bootstrap semantic variables
- Selection uses secondary (teal) color palette with visual hierarchy
- All buttons use Bootstrap btn classes with consistent 40px sizing
- Dropdowns use Bootstrap native component with dark theme via CSS variables
- Form inputs use Bootstrap classes with teal focus rings
- **Zero TypeScript lint errors** (`npm run lint` exits clean)
- **Status dropdown shows file counts** per status with on-demand refresh
- All 381 Angular unit tests passing
- Visual QA verified at desktop and tablet (768px) widths

## Requirements

### Validated

**v1.3 (Shipped 2026-02-04):**

- Fix TypeScript strictness lint errors (62 issues) - v1.3
- Status dropdown shows file counts per status - v1.3

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

### Validated

**v1.4 (Shipped 2026-02-08):**

- Migrate all @import to @use/@forward across Angular SCSS files
- Eliminate Sass @import deprecation warnings from build output
- Maintain identical visual output (zero regressions)
- All unit tests continue passing

### Out of Scope

- Adding new UI features - this is purely CSS refactoring
- Changing component behavior - styling only
- Major layout restructuring - preserve existing layouts
- Adding new dependencies - use existing Bootstrap 5
- Dark mode toggle - not part of current unification work
- ~~Full @use migration~~ - Completed in v1.4

## Context

**Technical notes:**
- Application SCSS uses @use/@forward; Bootstrap remains on @import (required by Bootstrap 5.3)
- Bootstrap subtle variables re-exported via @forward in _common.scss for component module access
- Third-party deprecation warnings (Bootstrap, Font-Awesome) accepted as noise
- ~~Sass @import deprecation~~ Resolved in v1.4

## Constraints

- **No functional regressions**: All existing features must continue working
- **Bootstrap 5 patterns**: Leverage Bootstrap classes where possible
- **Incremental lint fixes**: Fix errors without major refactoring

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
| Intent comment patterns for empty functions | Per typescript-eslint best practices | Good |
| Variadic function types for logger getters | Return bound console methods or no-op functions | Good |
| Use `as unknown as T` for test edge cases | Type-safe alternative to `as any` for invalid input tests | Good |
| Optional chaining in tests instead of `!` | Tests fail on undefined anyway, avoids lint errors | Good |
| Counts refresh on dropdown open | Performance: avoid continuous computation | Good |
| Single-pass count computation | Efficiency: O(n) forEach instead of multiple passes | Good |

## Project Status

**Status:** COMPLETE — All milestones shipped

UI Polish project with 5 milestones shipped:
- v1.0: Bootstrap SCSS infrastructure, colors, buttons
- v1.1: Dropdowns, forms, final polish
- v1.2: UI cleanup (removed obsolete buttons)
- v1.3: Lint fixes, status dropdown counts
- v1.4: Sass @use migration

**Future work (if desired):**
- Dark mode toggle feature

---
*Last updated: 2026-02-08 after v1.4 milestone shipped*
