# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** Reliable file sync from seedbox to local with automated media library integration
**Current focus:** v3.0 Terminal UI Overhaul

## Current Position

Phase: 36 - Secondary Pages (complete)
Status: Phase 36 Plan 2/2 complete — phase done
Last activity: 2026-02-17 — Phase 36 Plan 02 executed (terminal log colors, ASCII art About banner, Fira Code markers)

Progress: [████░░░░░░░░░░░░░░░░] 20% (1/5 phases complete, 36 in progress)

## v3.0 Phases

| Phase | Name | Status |
|-------|------|--------|
| 33 | Foundation | Complete |
| 34 | Shell | Complete (pending verification) |
| 35 | Dashboard | Complete (3/3 plans done) |
| 36 | Secondary Pages | Complete (2/2 plans done) |
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
- 61 plans executed (36-02 complete)
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
- [35-01] Padding-left reduced from 30px to 24px for search input — > character narrower than 20px SVG icon, less padding needed
- [35-01] Placeholder text lowercased to "filter by name..." — terminal aesthetic consistency
- [35-02] @HostBinding('class') getter returns status-based classes; Angular merges with parent-set [class.even-row] — even-row striping unaffected
- [35-02] green-pulse keyframe reused from styles.scss (defined in phase 33) — no duplication needed in file.component.scss
- [35-02] statusDotClass uses optional chaining (file?.status ?? 'default') to safely handle undefined file during initial render
- [35-03] getAsciiBar() uses Math.min/Math.max clamp on percentDownloaded — safe against out-of-range values from backend
- [35-03] Unicode escapes \u2588/\u2591 used in TypeScript source instead of literal block characters — avoids encoding issues
- [35-03] Ghost button color semantics: Queue → btn-outline-success (green), Stop/Delete → btn-outline-danger (red), Extract → btn-outline-secondary (gray)
- [36-01] color: #8b949e direct hex for subsection headers — consistent with Phase 33-35 terminal palette, not var(--bs-secondary) which may drift
- [36-01] .btn.terminal-header scoped selector for card headers — prevents conflict with other .btn usages in the page (e.g. test connection buttons)
- [36-01] ghost-btn added as sibling inside #controls block in AutoQueue SCSS — consistent with Phase 35 dashboard ghost-btn placement pattern
- [36-02] Direct hex values for log level colors — dark-only app, Bootstrap variable indirection unnecessary, matches Terminal palette from Phase 33
- [36-02] ASCII art font-size 0.5rem with white-space:pre and overflow:hidden — compact but readable rendering without layout overflow
- [36-02] margin-bottom: 10px added to #banner in About SCSS — ASCII art needed explicit separation from version line that image banner did not

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
Stopped at: Completed 36-02-PLAN.md (Phase 36 Secondary Pages, Plan 2/2) — terminal log colors, ASCII art About banner, Fira Code markers — Phase 36 complete
Next action: Execute Phase 37 (Theme Cleanup)

---
*v3.0 Terminal UI Overhaul: started 2026-02-16*
