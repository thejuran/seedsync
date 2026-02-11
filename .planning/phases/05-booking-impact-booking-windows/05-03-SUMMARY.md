---
phase: 05-booking-impact-booking-windows
plan: 03
subsystem: dashboard-booking-alerts
tags: [booking-windows, dashboard-alerts, urgent-alerts, upcoming-endpoint]
dependency_graph:
  requires: [05-01]
  provides: [booking-window-alerts-endpoint, dashboard-booking-alerts-ui]
  affects: [frontend/src/components/UrgentAlerts.tsx, frontend/src/pages/DashboardPage.tsx]
tech_stack:
  added: []
  patterns: [react-query-hook-for-alerts, blue-styled-booking-alerts, optional-prop-extension]
key_files:
  created:
    - backend/api/booking_windows.py
    - frontend/src/hooks/useBookingWindows.ts
    - tests/test_api_booking_windows.py
  modified:
    - backend/api/schemas.py
    - backend/main.py
    - frontend/src/types/index.ts
    - frontend/src/components/UrgentAlerts.tsx
    - frontend/src/pages/DashboardPage.tsx
decisions:
  - Backend endpoint filters to windows not yet open within configurable look-ahead (default 30 days)
  - Alerts capped at 5 sorted by soonest opening to prevent dashboard overload
  - Blue styling distinguishes booking window alerts from amber banking and red expiration alerts
  - Booking window alerts load independently (supplementary, not blocking dashboard render)
metrics:
  duration: 4m 4s
  completed: 2026-02-10
---

# Phase 5 Plan 3: Dashboard Booking Window Alerts Summary

GET /api/booking-windows/upcoming endpoint returning up to 5 sorted alerts for upcoming 11-month/7-month booking window openings, integrated into dashboard UrgentAlerts with blue CalendarCheck/CalendarClock icons and date-fns formatting.

## What Was Built

### Task 1: Backend booking windows upcoming endpoint with tests
**Commit:** c6ac266 (created during 05-02 execution; code identical to plan specification)

- **backend/api/booking_windows.py**: New API module with `GET /api/booking-windows/upcoming` endpoint. Query param `days` (1-90, default 30). Loads all contracts and non-cancelled future reservations, calls `compute_booking_windows()` for each, builds alert dicts with contract_name, resort, resort_name, check_in, window_type, window_date, and days_until_open. Filters to windows not yet open within look-ahead period. Sorts by days_until_open ascending, caps at 5.
- **backend/api/schemas.py**: Added `BookingWindowAlert` Pydantic model with contract_name, resort, resort_name, check_in, window_type, window_date, days_until_open fields.
- **backend/main.py**: Registered `booking_windows_router` before SPA mount.
- **tests/test_api_booking_windows.py**: 7 integration tests: empty state returns [], any-resort window alert, home-resort window alert, sort order verification, cap at 5, cancelled exclusion, already-open window exclusion.

### Task 2: Dashboard booking window alerts in UrgentAlerts component
**Commit:** 7e1436e

- **frontend/src/types/index.ts**: Added `BookingWindowAlert` interface with contract_name, resort, resort_name, check_in, window_type ("home_resort" | "any_resort"), window_date, days_until_open.
- **frontend/src/hooks/useBookingWindows.ts**: New React Query hook `useUpcomingBookingWindows()` fetching `GET /api/booking-windows/upcoming` with queryKey `["booking-windows", "upcoming"]`.
- **frontend/src/components/UrgentAlerts.tsx**: Extended props with optional `bookingWindowAlerts?: BookingWindowAlert[]`. Added CalendarCheckIcon (home resort) and CalendarClockIcon (any resort) from lucide-react. Blue styling (`text-blue-700`) distinguishes from amber banking and red expiration. Each alert displays: `{contract_name} @ {resort_name}: {11-month|7-month} window opens in {N} day(s) ({MMM d}) -- check-in {MMM d, yyyy}`.
- **frontend/src/pages/DashboardPage.tsx**: Added `useUpcomingBookingWindows()` hook call. Updated conditional to show UrgentAlerts when either urgentItems or bookingWindowAlerts exist. Passes `bookingWindowAlerts ?? []` to component.

## Verification Results

- TypeScript compilation: `npx tsc --noEmit` -- zero errors
- Vite production build: `npx vite build` -- succeeds (466.91 kB JS, 49.12 kB CSS)
- Backend tests: 172 passed, 0 failures, no regressions
- Booking windows API tests: 7/7 pass
- Endpoint correctly filters to non-open windows within look-ahead period
- Alerts sorted by soonest opening, capped at 5

## Deviations from Plan

### Note: Task 1 artifacts pre-existing

**Found during:** Task 1 execution
**Issue:** The backend endpoint (backend/api/booking_windows.py), schema addition, router registration, and integration tests were already committed in the 05-02 plan execution (commit c6ac266). The 05-02 executor created these files as part of its broader scope.
**Resolution:** Verified the existing code matches the plan specification exactly. All 7 tests pass. No code changes needed -- proceeded directly to Task 2.
**Impact:** None -- Task 1 deliverables are identical to the plan specification.

## Commits

| Task | Commit  | Message |
|------|---------|---------|
| 1    | c6ac266 | feat(05-02): add expandable Trip Explorer cards with booking impact and window badges (pre-existing) |
| 2    | 7e1436e | feat(05-03): add dashboard booking window alerts to UrgentAlerts component |

## Self-Check: PASSED
