---
phase: 47-isolated-backend-hardening
plan: 02
subsystem: api
tags: [bottle, angular, csrf, post, rest, http-methods]

# Dependency graph
requires:
  - phase: 47-isolated-backend-hardening
    provides: Phase context and research for CSRF hardening
provides:
  - POST-only restart endpoint in Python backend (ENDP-01)
  - Angular ServerCommandService using POST for restart (ENDP-02)
  - Python test verifying add_post_handler used for restart route
  - Angular spec verifying POST HTTP method for restart
affects:
  - 47-03-PLAN.md
  - e2e tests that call /server/command/restart

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "State-changing endpoints registered via add_post_handler, not add_handler"
    - "Angular services use RestService.post() for state-changing commands"

key-files:
  created: []
  modified:
    - src/python/web/handler/server.py
    - src/python/tests/unittests/test_web/test_handler/test_server_handler.py
    - src/angular/src/app/services/server/server-command.service.ts
    - src/angular/src/app/tests/unittests/services/server/server-command.service.spec.ts

key-decisions:
  - "Restart endpoint uses POST-only via add_post_handler; GET returns 405 automatically via Bottle"
  - "No body needed for restart POST request — RestService.post(url) with null body is correct"

patterns-established:
  - "State-mutating endpoints: always use add_post_handler to prevent CSRF via image tags or GET requests"

requirements-completed: [ENDP-01, ENDP-02]

# Metrics
duration: 8min
completed: 2026-02-25
---

# Phase 47 Plan 02: Restart Endpoint CSRF Fix Summary

**Restart endpoint hardened from GET to POST in both Python Bottle backend and Angular frontend, eliminating image-tag CSRF attack vector**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-02-25T23:38:53Z
- **Completed:** 2026-02-25T23:41:42Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Backend restart route registered via `add_post_handler` instead of `add_handler` (GET) — Bottle now returns 405 for GET requests automatically
- Added Python test `test_restart_route_registered_as_post` confirming `add_post_handler` called and `add_handler` not called
- Angular `ServerCommandService.restart()` changed from `sendRequest` (GET) to `post()` (POST)
- Angular spec updated to verify `req.request.method === "POST"` instead of expecting GET

## Task Commits

Each task was committed atomically:

1. **Task 1: Change restart to POST in backend and update Python test** - `97bb7d0` (test — pre-committed as part of TDD setup for 47-03)
2. **Task 2: Change restart to POST in Angular service and update spec** - `e99c1ec` (fix)

**Plan metadata:** (included in docs commit below)

## Files Created/Modified
- `src/python/web/handler/server.py` - Changed `add_handler` to `add_post_handler` for restart route
- `src/python/tests/unittests/test_web/test_handler/test_server_handler.py` - Added `test_restart_route_registered_as_post` test method
- `src/angular/src/app/services/server/server-command.service.ts` - Changed `sendRequest()` to `post()` for restart
- `src/angular/src/app/tests/unittests/services/server/server-command.service.spec.ts` - Updated test to verify POST method

## Decisions Made
- Used existing `RestService.post(url)` with no body — restart requires no payload, consistent with other no-body POST commands in the codebase
- Kept handler body (`__handle_action_restart`) unchanged — `HTTPResponse(body="Requested restart")` works correctly for POST responses

## Deviations from Plan

**1. [Pre-committed] Task 1 Python changes were already applied in prior commit**
- **Found during:** Task 1 execution
- **Issue:** Commit `97bb7d0` (test(47-03): add failing tests for SSH topology redaction) bundled the Task 1 changes (server.py route change + test_server_handler.py new test) alongside the TDD test setup for plan 47-03
- **Impact:** No work lost — changes are correct and all 8 Python tests pass
- **Resolution:** Recognized pre-committed state, verified tests pass, proceeded to Task 2

---

**Total deviations:** 1 (pre-committed work from concurrent TDD setup — no code impact)
**Impact on plan:** None — all required changes are present and verified.

## Issues Encountered
- `poetry` not on PATH in bash subshell — used full path `/Users/julianamacbook/Library/Python/3.12/bin/poetry` to run tests
- Angular `node_modules/@angular/cli/bin/ng` path from PLAN.md didn't exist — used `node_modules/.bin/ng` instead (both are valid approaches)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Restart endpoint is now POST-only (ENDP-01, ENDP-02 complete)
- All 8 Python handler tests pass; all 394 Angular tests pass
- Ready for Phase 47 Plan 03: SSH topology redaction in log records

---
*Phase: 47-isolated-backend-hardening*
*Completed: 2026-02-25*
