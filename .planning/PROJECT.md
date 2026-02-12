# SeedSync

## What This Is

SeedSync is a file syncing tool that syncs files from a remote Linux server (like a seedbox) to a local machine using LFTP. v1.0-v1.6 focused on quality (UI polish, backend testing, CI cleanup). v1.7 shipped Sonarr integration. v1.8 shipped Radarr support and webhook-based import detection. v2.0 adds dark/light theme system with OS preference detection and cosmetic polish.

## Current Milestone: v2.0 Dark Mode & Polish

**Goal:** Add a true dark theme with light/dark toggle in Settings, auto-detect OS color scheme preference, and fix cosmetic issues from the *arr integration work.

**Target features:**
- Dark theme (true dark mode for the entire UI)
- Light theme preserved (current styling)
- OS `prefers-color-scheme` auto-detection
- Manual dark/light toggle in Settings page
- Toast text updated to say "Sonarr/Radarr" instead of just "Sonarr"
- Auto-delete description updated to reference both Sonarr and Radarr
- WAITING_FOR_IMPORT enum value added

## Core Value

Reliable file sync from seedbox to local with automated media library integration.

## Current State

All milestones shipped (v1.0-v1.8). 952+ Python tests, 84% coverage with fail_under threshold. Angular 19.x with Bootstrap 5.3, SCSS uses @use/@forward. All 381 Angular unit tests passing. Zero TypeScript lint errors. Single CI workflow (master.yml) handles all Docker publishing.

<details>
<summary>v1.8 Radarr + Webhooks (Shipped 2026-02-11)</summary>

- Radarr config and test connection (mirror of Sonarr pattern)
- Shared *arr Integration section in Settings UI (Sonarr + Radarr subsections)
- Webhook POST endpoints replacing polling for instant import detection
- WebhookManager with thread-safe Queue (web → controller thread)
- SonarrManager polling code removed (webhook-only architecture)
- 23 new unit tests, 381/381 Angular tests passing

</details>

<details>
<summary>v1.7 Sonarr Integration (Shipped 2026-02-10)</summary>

- Sonarr API integration (connection, queue polling, import detection)
- Auto-delete local files after Sonarr confirms import (global toggle, 60s delay)
- Import status badges in file list UI + toast notifications
- Settings UI for Sonarr configuration (URL, API key, enable/disable)
- 6-layer safety system for auto-delete (local-only, dry-run, hot-toggle, etc.)

</details>

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

### Validated

**v1.5 (Shipped 2026-02-08):**

- pytest-cov integration with coverage reporting and fail_under threshold
- Unit tests for common module gaps (5 modules, 100% coverage)
- Unit tests for web handler gaps (7 handlers, 69 tests)
- Unit tests for controller.py and controller_job.py (106 tests)
- Shared fixtures via conftest.py (3 fixtures)
- Coverage 77% → 84%, 231 new tests

### Validated

**v1.6 (Shipped 2026-02-10):**

- `:dev` Docker image published to GHCR on every master push (multi-arch) - v1.6
- `docker-publish.yml` removed — single CI workflow handles everything - v1.6
- Version tag publishing continues working on tag pushes - v1.6
- pytest cache warnings suppressed in Docker test runner - v1.6
- webob cgi deprecation warnings filtered from test output - v1.6

### Active

**v2.0 (In progress):**

- Dark theme for entire UI (backgrounds, text, components)
- Light theme preserved as current default
- OS `prefers-color-scheme` auto-detection
- Manual dark/light toggle in Settings page (Appearance section)
- Toast/notification text references both Sonarr and Radarr
- Auto-delete description references both Sonarr and Radarr
- WAITING_FOR_IMPORT enum value for file status

### Out of Scope

- E2E tests (Playwright) — separate concern
- Performance/load testing
- Refactoring production code to improve testability
- CI/CD coverage gates (GitHub Actions changes)
- Lidarr/Readarr support — defer to future milestone

## Context

**Technical notes:**
- Application SCSS uses @use/@forward; Bootstrap remains on @import (required by Bootstrap 5.3)
- Bootstrap subtle variables re-exported via @forward in _common.scss for component module access
- Third-party deprecation warnings (Bootstrap, Font-Awesome) accepted as noise
- ~~Sass @import deprecation~~ Resolved in v1.4
- ~~Backend test coverage gaps~~ Resolved in v1.5 (84% coverage, fail_under enforced)

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

**Status:** v2.0 in progress — Dark Mode & Polish

Quality project (v1.0-v1.6), Sonarr integration (v1.7), and Radarr + webhooks (v1.8) all shipped. Now adding dark mode and cosmetic fixes.

**Future work (if desired):**
- Lidarr/Readarr support (same *arr pattern)

---
*Last updated: 2026-02-11 after starting v2.0 milestone*
