# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** Reliable file sync from seedbox to local with automated media library integration
**Current focus:** v1.7 Sonarr Integration - Phase 25 (Auto-Delete with Safety)

## Current Position

Phase: 25 of 25 (Auto-Delete with Safety) -- COMPLETE
Plan: 25-02 complete (all plans done)
Status: Phase 25 complete -- all plans executed
Last activity: 2026-02-10 — Completed 25-02 (Auto-Delete Timer Logic)

Progress: [█████████████] 100% (25/25 phases complete)

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
- 25 phases completed
- 42 plans executed
- 8 days total (2026-02-03 to 2026-02-10)

**Phase 24-01:** 7 tasks, 10 files, 8m duration
**Phase 24-02:** 4 tasks, 4 files, 6m duration
**Phase 25-01:** 2 tasks, 6 files, 3m duration
**Phase 25-02:** 2 tasks, 3 files, 4m duration

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

**Phase 24-02 decisions:**
- No TypeScript changes needed for file.component.ts -- ViewFile = ViewFile already exposes ImportStatus namespace
- Subscribe to unfiltered ViewFileService.files (not filteredFiles) so toasts fire for all imports regardless of active filter
- First-emission skip prevents toasting files already in IMPORTED state on page load

**Phase 25-01 decisions:**
- Config.AutoDelete uses Checkers.null for enabled/dry_run (same pattern as Sonarr.enabled)
- delay_seconds uses Checkers.int_positive (must be > 0)
- AutoDelete section optional in from_dict for backward compatibility with older config files
- Frontend uses standard #optionsList template (no custom card needed like *arr Integration)
- AutoDelete section placed after *arr Integration card in left column

**Phase 25-02 decisions:**
- threading.Timer with daemon=True prevents timers from blocking process exit
- Config re-checked at execution time for hot-toggle support (disable mid-flight)
- Pending dict uses pop() for atomic remove-and-return (safe even if key missing)
- BaseControllerTestCase defaults autodelete.enabled=False to prevent MagicMock Timer issues

## Session Continuity

Last session: 2026-02-10
Stopped at: Completed 25-02-PLAN.md (Auto-Delete Timer Logic)
Next action: Phase 25 complete -- all v1.7 plans executed

---
*v1.0-v1.6 shipped: 2026-02-03 to 2026-02-10*
*v1.7 in progress: 2026-02-10*
