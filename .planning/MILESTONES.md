# Project Milestones: SeedSync UI Polish

## v1.6 CI Cleanup (Shipped: 2026-02-10)

**Delivered:** Consolidated duplicate Docker CI workflows into a single master.yml pipeline and cleaned up test runner warning noise.

**Phases completed:** 20-21 (2 plans total)

**Key accomplishments:**

- Consolidated Docker publishing into single CI workflow (master.yml), gated on e2e test passage
- Eliminated duplicate docker-publish.yml that bypassed test gating
- `:dev` image auto-published on master push (multi-arch: amd64 + arm64)
- Suppressed pytest cache warnings and webob/cgi deprecation warnings in test output

**Stats:**

- 11 files changed (+706 lines, -72 lines)
- 2 phases, 2 plans, 4 tasks
- 1 day (2026-02-09 to 2026-02-10)

**Git range:** `eab6146` → `c3d369f`

**What's next:** Quality project complete. All 7 milestones shipped.

---

## v1.5 Backend Testing (Shipped: 2026-02-08)

**Delivered:** Comprehensive Python backend test coverage — 231 new tests across common modules, web handlers, and controller, with pytest-cov tooling and enforced 84% coverage threshold.

**Phases completed:** 15-19 (8 plans total)

**Key accomplishments:**

- Added pytest-cov tooling with coverage config, shared conftest.py fixtures, and `make coverage-python` target
- Unit tests for all 5 common modules achieving 100% coverage (constants, context, error, localization, types)
- Unit tests for all 7 untested web handlers (AutoQueue, Config, Server, Status, HeartbeatStream, ModelStream, StatusStream)
- Comprehensive controller unit tests: 106 tests covering init, lifecycle, commands, model pipeline, and ControllerJob
- Coverage improved from 77% to 84% (+314 statements covered, +231 tests)
- Enforced `fail_under = 84` threshold preventing future regression

**Stats:**

- 19 files changed (+2,315 lines)
- 14 new test files, 1 conftest.py
- 5 phases, 8 plans
- Same-day completion (2026-02-08)

**Git range:** `56463ad` → `03869bc`

**What's next:** Quality project complete. All UI polish and backend testing milestones shipped.

---

## v1.4 Sass @use Migration (Shipped: 2026-02-08)

**Delivered:** Migrated all application SCSS from deprecated @import to modern @use/@forward module system, proactively preparing for Dart Sass 3.0.

**Phases completed:** 12-14 (3 plans total)

**Key accomplishments:**

- Transformed `_common.scss` to @forward aggregation module with namespaced variable access
- Transformed `_bootstrap-overrides.scss` to @use with `bv.` and `fn.` namespaces
- Updated `styles.scss` to @use for application modules (hybrid architecture with Bootstrap @import)
- Eliminated all application SCSS deprecation warnings (zero from src/app/ paths)
- All 381 unit tests pass, zero visual regressions
- Only 3 SCSS files modified across entire migration — minimal blast radius

**Stats:**

- 3 SCSS files modified
- 44 insertions, 23 deletions
- 3 phases, 3 plans
- 2 days (2026-02-07 to 2026-02-08)

**Git range:** `d17c957` → `1001fdf`

**What's next:** UI Polish project complete. All Sass tech debt resolved.

---

## v1.3 Polish & Clarity (Shipped: 2026-02-04)

**Delivered:** Fixed 62 TypeScript lint errors and added file counts to status dropdown for at-a-glance clarity.

**Phases completed:** 10-11 (5 plans total)

**Key accomplishments:**

- Eliminated all TypeScript lint errors (`npm run lint` exits clean)
- All functions have explicit return types (~152 annotated)
- Zero `any` types in application code (~49 replaced)
- Non-null assertions replaced with optional chaining (~47 fixed)
- Status dropdown shows file counts per status (e.g., "Downloaded (5)")
- On-demand count refresh when dropdown opens

**Stats:**

- 77 files modified
- 3,946 insertions, 320 deletions
- 2 phases, 5 plans
- Same-day completion (2026-02-04)

**Git range:** `1cc4a97` → `921a63b`

**What's next:** Project complete. Future work could include dark mode toggle or Sass @use migration.

---

## v1.2 UI Cleanup (Shipped: 2026-02-04)

**Delivered:** Removed obsolete Details and Pin buttons from file options bar, simplifying UI to only functional controls.

**Phases completed:** 9 (1 plan total)

**Key accomplishments:**

- Removed Details button and all associated showDetails state
- Removed Pin button and all associated pinFilter state
- Simplified file options bar to only functional controls (search, status filter, sort)
- File options bar now always static positioning

**Stats:**

- 18 files modified
- 329 insertions, 344 deletions (net -15 LOC cleanup)
- 1 phase, 1 plan, 2 tasks
- Same-day completion

**Git range:** `a07b2e7` → `9426e66`

**What's next:** UI refinement complete. Run `/gsd:new-milestone` to start next milestone.

---

## v1.1 Dropdown & Form Migration (Shipped: 2026-02-04)

**Delivered:** Complete UI styling unification with Bootstrap-native dropdowns, consistent form inputs with teal focus states, and dark theme across all components.

**Phases completed:** 6-8 (4 plans total)

**Key accomplishments:**

- Migrated file dropdowns to Bootstrap's native component with dark theme styling
- Unified form inputs with teal focus rings across Settings, AutoQueue, and Files pages
- Implemented close-on-scroll behavior preventing orphaned dropdown menus
- Removed 150+ lines of custom SCSS placeholders in favor of CSS variable theming
- Verified 387 unit tests pass with visual QA approval at desktop and tablet widths
- Zero unused SCSS code confirmed via comprehensive audit

**Stats:**

- 24 files created/modified
- ~2,900 lines changed (mostly .planning documentation)
- 3 phases, 4 plans, 11 tasks
- 1 day (same-day completion)

**Git range:** `8d57357` → `03b3315`

**What's next:** Project styling unification complete. Future work could include dark mode toggle or full @use migration.

---

## v1.0 Unify UI Styling (Shipped: 2026-02-03)

**Delivered:** Unified Bootstrap 5 SCSS architecture across SeedSync's Angular frontend with consistent colors, selection highlighting, and button styling.

**Phases completed:** 1-5 (8 plans total)

**Key accomplishments:**

- Established Bootstrap SCSS infrastructure with two-layer customization system
- Consolidated all colors to Bootstrap variables with zero hardcoded hex values
- Unified selection highlighting using teal (secondary) color palette with visual hierarchy
- Standardized all buttons to Bootstrap semantic variants with 40px sizing
- Removed legacy custom %button SCSS placeholder entirely

**Stats:**

- 18 files created/modified
- 282 lines added, 234 deleted
- 5 phases, 8 plans, ~20 tasks
- 1 day from start to ship

**Git range:** `feat(01-01)` → `refactor(05-02)`

**What's next:** v1.1 Dropdown & Form Migration

---
