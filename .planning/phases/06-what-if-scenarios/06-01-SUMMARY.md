---
phase: 06-what-if-scenarios
plan: 01
subsystem: scenario-evaluation-backend
tags: [scenario-engine, scenario-api, cumulative-impact, pure-function, pydantic-schemas]
dependency_graph:
  requires: []
  provides: [compute_scenario_impact, POST-/api/scenarios/evaluate, scenario-schemas]
  affects: [backend/api/schemas.py, backend/main.py]
tech_stack:
  added: []
  patterns: [pure-function-engine, cumulative-injection, orm-to-dict-conversion]
key_files:
  created:
    - backend/engine/scenario.py
    - backend/api/scenarios.py
    - tests/test_scenario.py
    - tests/test_api_scenarios.py
  modified:
    - backend/api/schemas.py
    - backend/main.py
decisions:
  - Use today's date as target_date for scenario evaluation (answers "how do my current points change")
  - Enforce resort eligibility validation in scenario endpoint (model reality accurately)
  - Inject all hypotheticals as confirmed reservations for cumulative impact calculation
metrics:
  duration: 3m 36s
  completed: 2026-02-10
---

# Phase 6 Plan 1: Scenario Evaluation Backend Summary

Pure-function scenario engine computing cumulative impact of N hypothetical bookings across M contracts using existing availability and point chart infrastructure, plus POST /api/scenarios/evaluate endpoint with resort eligibility validation and comprehensive test coverage (13 tests).

## What Was Built

### Task 1: Scenario engine + Pydantic schemas + unit tests
**Commit:** 2d16549

- **backend/engine/scenario.py**: `compute_scenario_impact()` pure function. Accepts contracts, point_balances, reservations, hypothetical_bookings, and target_date. Resolves each hypothetical via `calculate_stay_cost()`, captures errors for unresolvable bookings. Computes baseline availability (real reservations only) and scenario availability (real + all resolved hypotheticals injected as confirmed). Returns per-contract baseline/scenario dicts, grand total summary, resolved_bookings list, and errors list.
- **backend/api/schemas.py**: Added 5 schemas: `HypotheticalBooking` (with field_validator: check_out > check_in, max 14 nights), `ScenarioEvaluateRequest`, `ContractScenarioResult` (baseline/scenario available/total/committed + impact), `ResolvedBooking` (cost details), `ScenarioEvaluateResponse`.
- **tests/test_scenario.py**: 6 unit tests: single booking (verify baseline != scenario, impact > 0, 42 pts), multiple same-contract cumulative, cross-contract bookings (verify independent impact), invalid booking to errors (other bookings still process), empty bookings (zero impact), cancelled reservations excluded from baseline.

### Task 2: Scenario evaluation endpoint + router registration + integration tests
**Commit:** 227451c

- **backend/api/scenarios.py**: `POST /api/scenarios/evaluate` endpoint. Loads all contracts, validates resort eligibility per hypothetical booking via `get_eligible_resorts()`, loads all balances and non-cancelled reservations, converts ORM to dicts, calls `compute_scenario_impact()`, maps engine result to `ScenarioEvaluateResponse`. Returns 200 with empty results when no contracts exist. Returns 422 for ineligible resort/contract combos or missing contracts.
- **backend/main.py**: Registered `scenarios_router` after `booking_windows_router`, before SPA mount.
- **tests/test_api_scenarios.py**: 7 integration tests: valid hypothetical (200, full response structure), empty bookings (200, zero impact), ineligible resort (422), missing contract (422), check_out before check_in (422 Pydantic), multiple bookings cumulative impact, no contracts (200 empty).

## Verification Results

- `python -m pytest tests/test_scenario.py -v` -- 6/6 passed
- `python -m pytest tests/test_api_scenarios.py -v` -- 7/7 passed
- `python -m pytest tests/ -v --tb=short` -- 185/185 passed, no regressions
- `from backend.engine.scenario import compute_scenario_impact` -- OK
- `from backend.api.schemas import ScenarioEvaluateRequest, ScenarioEvaluateResponse` -- OK
- `from backend.api.scenarios import router` -- OK
- Engine purity check: `backend/engine/scenario.py` has no DB/ORM imports

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Task | Commit  | Message |
|------|---------|---------|
| 1    | 2d16549 | feat(06-01): scenario engine + Pydantic schemas + unit tests |
| 2    | 227451c | feat(06-01): scenario evaluation endpoint + router registration + integration tests |

## Self-Check: PASSED
