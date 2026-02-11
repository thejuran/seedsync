---
phase: 06-what-if-scenarios
plan: 02
subsystem: scenario-frontend-infrastructure
tags: [zustand, scenario-store, evaluation-hook, scenario-types, routing]
dependency_graph:
  requires: [06-01]
  provides: [useScenarioStore, useScenarioEvaluation, scenario-types, scenario-route]
  affects: [frontend/src/types/index.ts, frontend/src/App.tsx, frontend/src/components/Layout.tsx]
tech_stack:
  added: [zustand-first-activation]
  patterns: [zustand-curried-create, react-query-post-hook, enabled-guard-pattern]
key_files:
  created:
    - frontend/src/store/useScenarioStore.ts
    - frontend/src/hooks/useScenarioEvaluation.ts
    - frontend/src/pages/ScenarioPage.tsx
  modified:
    - frontend/src/types/index.ts
    - frontend/src/components/Layout.tsx
    - frontend/src/App.tsx
decisions:
  - Zustand curried create<T>()(...) pattern for TypeScript type inference (per v5 docs)
  - Evaluation hook strips client-only fields (id, contract_name, resort_name) before POST
  - Scenarios nav item placed between Trip Explorer and Contracts (planning tools grouped)
metrics:
  duration: 1m 41s
  completed: 2026-02-10
---

# Phase 6 Plan 2: Scenario Frontend Infrastructure Summary

Zustand store (first activation) with add/remove/clear for hypothetical bookings, React Query evaluation hook POSTing to /api/scenarios/evaluate with enabled guard, scenario TypeScript interfaces, /scenarios route with placeholder page wired to store.

## What Was Built

### Task 1: Scenario types + Zustand store + evaluation hook
**Commit:** 86f524b

- **frontend/src/types/index.ts**: Added HypotheticalBooking (id, contract_id, contract_name, resort, resort_name, room_key, check_in, check_out), ContractScenarioResult (baseline vs scenario available/total/committed with impact delta), ResolvedBooking (resolved cost details), and ScenarioEvaluateResponse (contracts array, summary, resolved_bookings, errors).
- **frontend/src/store/useScenarioStore.ts**: First Zustand store in the project. Uses curried `create<ScenarioState>()(...)` pattern for TypeScript inference. State: `bookings: HypotheticalBooking[]`. Actions: `addBooking` (generates UUID via crypto.randomUUID()), `removeBooking` (filters by id), `clearAll` (resets to empty array).
- **frontend/src/hooks/useScenarioEvaluation.ts**: React Query hook accepting `HypotheticalBooking[]`. Enabled only when bookings.length > 0. QueryKey includes all booking IDs for cache invalidation on change. Strips client-only fields (id, contract_name, resort_name) before POSTing to `/scenarios/evaluate`. staleTime: 30s.

### Task 2: Scenario route + nav item + placeholder page
**Commit:** 83761e7

- **frontend/src/components/Layout.tsx**: Added `{ to: "/scenarios", label: "Scenarios" }` to navItems array between Trip Explorer and Contracts.
- **frontend/src/App.tsx**: Added import for ScenarioPage and `<Route path="/scenarios" element={<ScenarioPage />} />` after trip-explorer route.
- **frontend/src/pages/ScenarioPage.tsx**: Placeholder page using shadcn Card and Button. Reads bookings from useScenarioStore, wires useScenarioEvaluation hook. Displays page header ("What-If Scenarios"), booking count, Clear All button (disabled when empty), and placeholder message for next plan.

## Verification Results

- TypeScript compilation: `npx tsc --noEmit` -- zero errors
- Vite production build: `npx vite build` -- succeeds (468.86 kB JS, 49.12 kB CSS)
- Zustand import verified in store file
- /scenarios route registered in App.tsx
- "Scenarios" nav item present in Layout.tsx sidebar

## Deviations from Plan

None -- plan executed exactly as written.

## Commits

| Task | Commit  | Message |
|------|---------|---------|
| 1    | 86f524b | feat(06-02): add scenario types, Zustand store, and evaluation hook |
| 2    | 83761e7 | feat(06-02): add scenario route, nav item, and placeholder page |

## Self-Check: PASSED
