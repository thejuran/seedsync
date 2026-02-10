# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Reliable file sync from seedbox to local with automated media library integration
**Current focus:** v1.7 Sonarr Integration - Phase 24 (Status Visibility & Notifications)

## Current Position

Phase: 24 of 25 (Status Visibility & Notifications)
Plan: 24-01 complete, 24-02 next
Status: Phase 24 Plan 01 complete (import_status pipeline + ToastService)
Last activity: 2026-02-10 — Executed Phase 24 Plan 01 (7 tasks, 7 commits, 8m)

Progress: [█████████░] 92% (23/25 phases complete)

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

## Performance Metrics

**Total Project:**
- 7 milestones shipped
- 23 phases completed
- 39 plans executed
- 8 days total (2026-02-03 to 2026-02-10)

**Phase 24-01:** 7 tasks, 10 files, 8m duration

## Accumulated Context

### v1.7 Architecture Context

From research/SUMMARY.md:
- Backend: Python 3.11+, Bottle web framework, Manager pattern (SonarrManager follows ScanManager/LftpManager)
- Frontend: Angular 19.x, Bootstrap 5.3
- New dependencies: pyarr ^5.2.0 (Sonarr API client), ngx-toastr ^19.1.0 (toast notifications)
- Persistence: BoundedOrderedSet for tracking imported files (same pattern as downloaded_file_names)
- Config: InnerConfig section with typed properties
- Import detection: Queue diffing (detect by queue item disappearance, not history API)
- Safety: Configurable delay between import detection and auto-delete (default 60s)

### Critical Pitfalls (from research)

Top 3 risks identified:
1. Delete-Before-Import Race Condition - mitigate with queue disappearance signal + 60s safety delay
2. Season Pack Partial Import - track per-file imports, not per-torrent
3. File Name Mismatch - use history API with droppedPath/importedPath for correlation

### Tech Debt

- Bootstrap 5.3 still uses @import internally (blocked until Bootstrap 6)
- `make run-tests-python` Docker build fails on arm64 (Apple Silicon) — `rar` package only available for amd64. CI unaffected (runs on amd64).

### Key Decisions

See PROJECT.md Key Decisions table for full list.

**Phase 22-01 decisions:**
- Config.Sonarr uses Checkers.null (validation at test endpoint, not config parse)
- Backward-compatible from_dict: optional Sonarr section via `if "Sonarr" in config_dict`
- Test connection returns HTTP 200 with JSON body (matches RestService pattern)
- Uses `requests` library directly (not pyarr) for simple status check

**Phase 22-02 decisions:**
- Custom card (not #optionsList template) for *arr Integration section -- Test Connection button does not fit standard pattern
- HTML5 fieldset disabled pattern to grey out URL, API Key, Test Connection when toggle is OFF
- ChangeDetectorRef.markForCheck() for OnPush change detection with direct property bindings
- Backward-compatible Config constructor: falls back to DefaultSonarr if props.sonarr missing

**Phase 23 decisions:**
- SonarrManager follows Manager pattern (no separate thread, polls from Controller.process() loop)
- Import detection uses BOTH queue disappearance AND trackedDownloadState=="imported" signals
- First poll bootstraps previous state (None check) to prevent false detections on startup
- Network errors return None from _fetch_queue() to prevent false positives
- Case-insensitive name matching between Sonarr queue titles and ModelFile names
- ControllerPersist.imported_file_names uses dct.get() for backward compatibility
- SonarrManager re-reads config each process() call (hot-toggle without restart)

**Phase 24-01 decisions:**
- copy.copy() + manual _ModelFile__frozen = False for copy-on-write (frozen flag persists through shallow copy)
- Deferred WAITING_FOR_IMPORT enum value per research recommendation (start with NONE/IMPORTED only)
- ToastService uses Subject (not BehaviorSubject) since toasts are ephemeral events
- Toast lifecycle managed in AppComponent via setTimeout, not Bootstrap JS API

## Session Continuity

Last session: 2026-02-10
Stopped at: Phase 24 Plan 01 executed (7 tasks, 7 commits, 162 tests pass, build+lint clean)
Next action: Execute Phase 24 Plan 02 — Badge UI display and toast triggering

---
*v1.0-v1.6 shipped: 2026-02-03 to 2026-02-10*
*v1.7 in progress: 2026-02-10*
