---
phase: 3
plan: 1
subsystem: trip-explorer
tags: [api, engine, composition, pure-function]
dependency-graph:
  requires: [01-03, 02-01, 02-02]
  provides: [trip-explorer-engine, trip-explorer-api]
  affects: [frontend-trip-explorer-ui]
tech-stack:
  added: []
  patterns: [function-composition, pure-engine-function, orm-to-dict-bridge]
key-files:
  created:
    - backend/engine/trip_explorer.py
    - backend/api/trip_explorer.py
  modified:
    - backend/api/schemas.py
    - backend/main.py
decisions:
  - Uses check_in date (not today) for use year calculation in availability -- ensures correct point year for future trips
  - Pure function takes data as arguments (no DB access) following existing engine pattern
  - Results sorted cheapest-first (total_points ascending) for best UX
  - Nightly breakdown excluded from results to keep response compact (available via /api/point-charts/calculate)
  - Validation at API layer (422 for invalid dates) rather than engine layer
metrics:
  duration: 1m 41s
  completed: 2026-02-10
  tasks: 2
  tests-added: 0
  total-tests: 141
---

# Phase 3 Plan 1: Trip Explorer Backend Summary

Pure engine function composing existing availability, eligibility, and cost calculation to answer "what can I afford?" with a GET /api/trip-explorer endpoint returning all affordable resort/room options sorted cheapest-first.

## What Was Built

### Task 1: Trip Explorer engine function
- **`backend/engine/trip_explorer.py`**: Single pure function `find_affordable_options()` that takes contracts, balances, reservations, check_in, and check_out as arguments
- **Composition logic**: For each contract, calculates available points via `get_contract_availability()` (using check_in date for correct use year), gets eligible resorts via `get_eligible_resorts()`, then checks every room type at every eligible resort via `calculate_stay_cost()` and `load_point_chart()`
- **Output**: Sorted list of affordable options with contract info, resort details, room_key, total_points, points_remaining, nightly_avg; plus metadata (resorts_checked, resorts_skipped, total_options)
- **Skips**: Contracts with zero available points, resorts without chart data for the check_in year

### Task 2: API endpoint and schemas
- **Pydantic schemas** in `backend/api/schemas.py`: `TripExplorerOption` (13 fields) and `TripExplorerResponse` (7 fields including options list)
- **Router** in `backend/api/trip_explorer.py`: GET `/api/trip-explorer` with required `check_in` and `check_out` query params
- **Validation**: Returns 422 if check_out <= check_in or stay > 14 nights
- **DB pattern**: Same ORM-to-dict bridge as `backend/api/availability.py` (loads contracts, balances, non-cancelled reservations)
- **Router registration** in `backend/main.py`: `app.include_router(trip_explorer_router)`

## Deviations from Plan

None -- plan executed exactly as written.

## Test Results

141 existing tests all passing (no new tests in this plan; backend testing is a separate phase). Endpoint manually verified:
- Valid request: returns proper JSON with options array and metadata
- check_out <= check_in: returns 422 with clear message
- Stay > 14 nights: returns 422 with clear message

## Commits

| Task | Commit  | Description |
|------|---------|-------------|
| 1    | e6bb557 | feat(03-01): add trip explorer engine function |
| 2    | 909ed19 | feat(03-01): add trip explorer API endpoint and schemas |

## Self-Check: PASSED

All 4 created/modified files verified present on disk. Both task commits verified in git history.
