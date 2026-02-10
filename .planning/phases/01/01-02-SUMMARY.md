---
phase: 1
plan: 2
subsystem: contracts-points-ui
tags: [api, crud, eligibility, points, timeline, react, frontend]
dependency-graph:
  requires: [01-01]
  provides: [contract-api, point-balance-api, eligibility-engine, timeline-api, contracts-ui]
  affects: [02-01, 02-02]
tech-stack:
  added: [pydantic-schemas, tanstack-query-hooks]
  patterns: [dependency-override-testing, enriched-response, grouped-aggregation]
key-files:
  created:
    - backend/api/schemas.py
    - tests/test_eligibility.py
    - tests/test_api_contracts.py
    - tests/test_api_points.py
    - frontend/src/hooks/useContracts.ts
    - frontend/src/hooks/usePoints.ts
    - frontend/src/components/ContractCard.tsx
    - frontend/src/components/ContractFormDialog.tsx
    - frontend/src/components/PointBalanceForm.tsx
    - frontend/src/components/UseYearTimeline.tsx
    - frontend/src/components/EligibleResorts.tsx
  modified:
    - backend/api/contracts.py
    - backend/api/points.py
    - backend/engine/eligibility.py
    - backend/engine/use_year.py
    - backend/main.py
    - tests/conftest.py
    - frontend/src/lib/api.ts
    - frontend/src/pages/ContractsPage.tsx
    - frontend/src/types/index.ts
decisions:
  - Pydantic schemas defined separately in schemas.py (not inline in router)
  - Points router uses full path routes (no prefix) for mixed /api/contracts and /api/points paths
  - Eligibility computed at read time, not stored (immediate update on purchase_type change)
  - API integration tests use dependency override with in-memory SQLite per fixture
  - PointBalanceForm shows grouped summary from API; individual balance edit/delete deferred to when detail endpoint returns IDs
metrics:
  duration: 6m 52s
  completed: 2026-02-10
  tasks: 3
  tests-added: 34
  tests-total: 51
  files-changed: 19
---

# Phase 1 Plan 2: Contract & Point Balance Management Summary

Full CRUD API for DVC contracts and point balances with resale eligibility engine, use year timeline computation, and complete React management UI.

## What Was Built

### Task 1: Contract CRUD API + Pydantic Schemas + Eligibility Engine
- **`backend/api/schemas.py`**: 8 Pydantic v2 models covering contract and point balance create/update/response patterns, including `ContractWithDetails` with enriched fields
- **`backend/api/contracts.py`**: Full CRUD -- GET list (enriched with eligibility + timeline), GET by ID, POST (201), PUT (partial update), DELETE (204 with cascade)
- **`backend/engine/eligibility.py`**: Complete resale restriction logic -- direct gets all 17, resale at original gets 14, resale at restricted (Riviera/DLH/Cabins) gets home only
- **`tests/test_eligibility.py`**: 8 tests covering all resale restriction scenarios
- **`tests/test_api_contracts.py`**: 10 integration tests via httpx AsyncClient with dependency-override in-memory DB

### Task 2: Point Balance API + Use Year Timeline
- **`backend/api/points.py`**: Full CRUD with grouped GET (balances by year with totals), POST with duplicate detection (409 Conflict), banked-exceeds-annual validation (422), borrowed-exceeds warning (log only)
- **`backend/engine/use_year.py`**: Extended with `get_current_use_year`, `get_use_year_status`, `build_use_year_timeline` functions
- **GET `/api/contracts/{id}/timeline`**: Returns current + next use year timelines with banking deadlines, expiration dates, and status
- **`tests/test_api_points.py`**: 16 tests covering CRUD, grouping, timeline, and use year engine functions

### Task 3: Contracts & Point Balances React UI
- **ContractsPage**: Responsive grid (1/2/3 columns), empty state, loading/error states, Add Contract button
- **ContractCard**: Resort name, use year, points summary, purchase type badge (green=Direct, amber=Resale), banking deadline snippet, expand/collapse for details
- **ContractFormDialog**: Create/edit dialog with resort dropdown (from /api/resorts), use year month selector, annual points input, purchase type select
- **PointBalanceForm**: Inline add form with year/type/points fields, grouped summary table with totals
- **UseYearTimeline**: Color-coded timeline entries (green=open, amber=approaching, red=passed) with formatted dates
- **EligibleResorts**: Grouped resort list by location with contextual messaging for direct/resale/restricted
- **Hooks**: `useContracts` (5 hooks) and `usePoints` (5 hooks) using TanStack Query with cache invalidation
- **api.ts**: Extended to handle 204 No Content responses
- **types/index.ts**: Added ContractWithDetails, UseYearTimeline, ContractPoints, Resort types

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added use year engine functions in Task 1 instead of Task 2**
- **Found during:** Task 1
- **Issue:** The contracts router imports `get_current_use_year` and `build_use_year_timeline` from use_year.py, but the plan placed these functions in Task 2. The contracts router would not compile without them.
- **Fix:** Added all three new use_year.py functions (get_current_use_year, get_use_year_status, build_use_year_timeline) in Task 1 alongside the contracts router.
- **Files modified:** backend/engine/use_year.py
- **Commit:** 67843c0

**2. [Rule 1 - Bug] Fixed api.ts 204 response handling**
- **Found during:** Task 3
- **Issue:** The original api.ts `request` function called `res.json()` on all successful responses, which would fail on DELETE 204 No Content responses.
- **Fix:** Added check for `res.status === 204` to return undefined instead of parsing JSON.
- **Files modified:** frontend/src/lib/api.ts
- **Commit:** 6f3e887

**3. [Rule 3 - Blocking] Points router uses full path routes instead of prefix**
- **Found during:** Task 2
- **Issue:** The points API needs routes under both `/api/contracts/{id}/points` and `/api/points/{id}`, which cannot be achieved with a single router prefix. The old stub used `prefix="/api/points"`.
- **Fix:** Removed the prefix and used full paths in route decorators. The router is still included via `app.include_router(points_router)` in main.py.
- **Files modified:** backend/api/points.py
- **Commit:** 32fac41

## Test Results

```
51 passed in 0.15s

test_models.py:          8 tests (unchanged from 01-01)
test_use_year.py:        9 tests (unchanged from 01-01)
test_eligibility.py:     8 tests (new)
test_api_contracts.py:  10 tests (new)
test_api_points.py:     16 tests (new)
```

## Commits

| Hash | Message |
|------|---------|
| 67843c0 | feat(01-02): contract CRUD API, Pydantic schemas, eligibility engine |
| 32fac41 | feat(01-02): point balance CRUD API + use year timeline endpoint |
| 6f3e887 | feat(01-02): contracts and point balances React UI |

## Self-Check: PASSED

All 19 created/modified files verified present. All 3 commit hashes verified in git log. 51/51 tests passing. Frontend builds and type-checks cleanly.
