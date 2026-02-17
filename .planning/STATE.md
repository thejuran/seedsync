# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** Reliable file sync from seedbox to local with automated media library integration
**Current focus:** v3.0 Terminal UI Overhaul

## Current Position

Phase: 34 - Shell (complete, pending verification)
Status: Phase 34 Plan 2/2 complete
Last activity: 2026-02-17 — Phase 34 Plan 02 executed (prompt indicator + version footer)

Progress: [████░░░░░░░░░░░░░░░░] 20% (1/5 phases)

## v3.0 Phases

| Phase | Name | Status |
|-------|------|--------|
| 33 | Foundation | Complete |
| 34 | Shell | Complete (pending verification) |
| 35 | Dashboard | Pending |
| 36 | Secondary Pages | Pending |
| 37 | Theme Cleanup | Pending |

## Milestones Shipped

| Milestone | Phases | Date |
|-----------|--------|------|
| v1.0 Unify UI Styling | 1-5 | 2026-02-03 |
| v1.1 Dropdown & Form Migration | 6-8 | 2026-02-04 |
| v1.2 UI Cleanup | 9 | 2026-02-04 |
| v1.3 Polish & Clarity | 10-11 | 2026-02-04 |
| v1.4 Sass @use Migration | 12-14 | 2026-02-08 |
| v1.5 Backend Testing | 15-19 | 2026-02-08 |
| v1.6 CI Cleanup | 20-21 | 2026-02-10 |
| v1.7 Sonarr Integration | 22-25 | 2026-02-10 |
| v1.8 Radarr + Webhooks | 26-28 | 2026-02-11 |
| v2.0 Dark Mode & Polish | 29-32 | 2026-02-12 |
| v2.0.1 Hotfix: Webhook Child Matching | — | 2026-02-14 |

## Performance Metrics

**Total Project:**
- 11 milestones (10 shipped, 1 in progress)
- 32 phases complete, 5 planned (33-37)
- 56 plans executed (34-02 complete)
- 13 days total (2026-02-03 to 2026-02-17)

## Accumulated Context

### Decisions Made

- [33-01] Hardcode data-bs-theme="dark" on html element and remove FOUC script — app is dark-only, no runtime JS needed
- [33-01] Use Google Fonts CDN for Fira Code + IBM Plex Sans — zero build-time cost, graceful fallback
- [33-01] Replace fn.shade-color/fn.tint-color with direct RGBA values in _common.scss — tint/shade produce light-mode colors
- [33-01] Remove $primary-light-color, $primary-lighter-color, $secondary-light-color, $header-color, $header-dark-color — light-mode only, unused by components
- [33-02] Use hardcoded hex in _bootstrap-overrides.scss for dropdown/form instead of SCSS variable interpolation — old variables don't map to new Terminal palette semantics
- [33-02] CRT scan-line overlay uses z-index 9999 with pointer-events:none — floats above all content without blocking interaction
- [33-03] ThemeService forced dark-only by hardcoding applyTheme('dark') on init — eliminates localStorage override; app is dark-only by design
- [33-03] $input-btn-font-family set to IBM Plex Sans — Bootstrap defaults to null (browser font), all interactive elements now consistently use the UI font
- [34-01] Keep $sidebar-width: 170px for mobile overlay animation — add $sidebar-collapsed-width (56px) and $sidebar-expanded-width (200px) alongside it
- [34-01] Content margin-left stays fixed at 56px — sidebar overlays content on hover (no margin-left animation, matches VS Code/terminal UX)
- [34-01] Logo block (#logo) hidden via CSS on large screens, kept in HTML for mobile overlay close button
- [34-02] Add filter: invert(1) to all sidebar icons — SVGs are black by default, invisible on dark background
- [34-02] Move hover .sidebar-label rule to sidebar.component.scss — Angular ViewEncapsulation prevents parent CSS from reaching child component DOM
- [34-02] Add mobile media query for sidebar-label opacity:1 — labels must be visible when overlay sidebar is open

### Todos

(None)

### Blockers

None.

## Tech Debt

- Bootstrap 5.3 still uses @import internally (blocked until Bootstrap 6)
- `make run-tests-python` Docker build fails on arm64 (Apple Silicon) — `rar` package only available for amd64. CI unaffected.
- WAITING_FOR_IMPORT enum exists as structural placeholder (no business logic sets it yet)

## Session Continuity

Last session: 2026-02-17
Stopped at: Completed 34-02-PLAN.md (Phase 34 Shell, Plan 2/2) — phase execution complete
Next action: Verify Phase 34 goal achievement

---
*v3.0 Terminal UI Overhaul: started 2026-02-16*
