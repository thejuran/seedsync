# Roadmap: DVC Dashboard

## Shipped Milestones

- [x] **v1.0** -- Data foundation, calculations & reservations, dashboard & trip explorer (3 phases, 9 plans, 18 requirements) -- [archive](milestones/v1.0-ROADMAP.md)

## Current Milestone: v1.1 Share & Plan

**Milestone Goal:** Make the app shareable via Docker and add planning tools (booking impact preview, what-if scenarios, booking window alerts, cost heatmap) so users can plan trips, not just track points.

### Overview

Build on the shipped v1.0 dashboard in four phases: first package the app for self-hosting with Docker and establish configurable settings, then enrich existing pages with booking impact previews and booking window alerts, next add a standalone scenario playground for modeling multiple hypothetical trips, and finally deliver a seasonal cost heatmap for visual date comparison. Each phase delivers a complete, verifiable capability. Phases 4 and 7 are independent; Phase 6 depends on Phase 5's booking impact engine.

### Phases

- [x] **Phase 4: Docker Packaging + Settings** - One-command self-hosting with persistent data and configurable borrowing policy
- [x] **Phase 5: Booking Impact + Booking Windows** - See how a potential booking affects your points and when booking windows open
- [x] **Phase 6: What-If Scenarios** - Model multiple hypothetical bookings and compare against reality
- [ ] **Phase 7: Seasonal Cost Heatmap** - Visual full-year calendar showing point costs by resort and room type

### Phase Details

#### Phase 4: Docker Packaging + Settings
**Goal**: User can start the app on any machine with `docker compose up`, with persistent data and configurable borrowing policy
**Depends on**: Nothing (infrastructure phase, builds on shipped v1.0)
**Requirements**: DOCK-01, DOCK-02, DOCK-03, DOCK-04, DOCK-05, DOCK-06, CONF-01
**Success Criteria** (what must be TRUE):
  1. User can run `docker compose up` on a fresh machine and access the app in a browser
  2. User's contracts, reservations, and point balances survive container rebuilds (`docker compose down && up`)
  3. User can change port and database path via `.env` file without editing any code
  4. User can toggle borrowing policy between 100% and 50% and see it reflected in point calculations
  5. App works out of the box with pre-loaded 2026 point chart data (no manual data import required for charts)
**Plans:** 2 plans

Plans:
- [x] 04-01-PLAN.md -- Docker infrastructure + backend config (Dockerfile, compose, entrypoint, SPA serving, Pydantic Settings)
- [x] 04-02-PLAN.md -- App settings + borrowing policy (AppSetting model, settings API, borrowing enforcement, Settings page UI)

#### Phase 5: Booking Impact + Booking Windows
**Goal**: User can preview how a potential booking affects their point balances and see when booking windows open for any trip date
**Depends on**: Phase 4 (borrowing policy setting affects impact calculations)
**Requirements**: IMPT-01, IMPT-02, IMPT-03, IMPT-04, BKWN-01, BKWN-02, BKWN-03, BKWN-04
**Success Criteria** (what must be TRUE):
  1. User can expand any Trip Explorer result to see before/after point balance per contract and nightly point breakdown
  2. User sees a warning when a proposed booking would consume points that are still eligible for banking
  3. User can see the 11-month home resort and 7-month any-resort booking window open dates for each Trip Explorer result
  4. User sees upcoming booking window openings on the dashboard alerts section
**Plans:** 3 plans

Plans:
- [x] 05-01-PLAN.md -- Backend engine + preview API (booking_impact.py, booking_windows.py, POST /api/reservations/preview, tests)
- [x] 05-02-PLAN.md -- Trip Explorer expandable cards (BookingImpactPanel, BookingWindowBadges, expandable result cards, preview hook)
- [x] 05-03-PLAN.md -- Dashboard booking window alerts (GET /api/booking-windows/upcoming, UrgentAlerts extension)

#### Phase 6: What-If Scenarios
**Goal**: User can model multiple hypothetical bookings in a scenario workspace and compare cumulative impact against their current point reality
**Depends on**: Phase 5 (scenario engine composes the booking impact engine)
**Requirements**: SCEN-01, SCEN-02, SCEN-03, SCEN-04
**Success Criteria** (what must be TRUE):
  1. User can add multiple hypothetical reservations to a scenario and see cumulative point impact across all contracts
  2. User can see a side-by-side comparison of baseline (current reality) vs scenario point balances
  3. User can clear the scenario and start fresh without affecting real data
**Plans:** 3 plans

Plans:
- [x] 06-01-PLAN.md -- Scenario engine + evaluation endpoint (compute_scenario_impact, POST /api/scenarios/evaluate, schemas, tests)
- [x] 06-02-PLAN.md -- Frontend infrastructure (scenario types, Zustand store, evaluation hook, route, nav item)
- [x] 06-03-PLAN.md -- Scenario workspace UI (booking form, booking list, comparison table, full page composition)

#### Phase 7: Seasonal Cost Heatmap
**Goal**: User can visually compare point costs across an entire year for any resort and room type
**Depends on**: Phase 4 (runs in Docker; no dependency on Phases 5-6)
**Requirements**: HEAT-01, HEAT-02, HEAT-03, HEAT-04
**Success Criteria** (what must be TRUE):
  1. User can view a full-year calendar heatmap where each day is color-coded by point cost tier
  2. User can switch between resorts and room types to compare cost patterns
  3. User can distinguish weekday vs weekend cost differences visually and see exact details (date, season, cost) on hover
**Plans:** 1 plan

Plans:
- [ ] 07-01-PLAN.md -- Cost heatmap component + Point Charts page tab integration (CostHeatmap, heatColor extraction, 4th tab)

### Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 4. Docker + Settings | v1.1 | 2/2 | ✓ Complete | 2026-02-10 |
| 5. Impact + Windows | v1.1 | 3/3 | ✓ Complete | 2026-02-10 |
| 6. Scenarios | v1.1 | 3/3 | ✓ Complete | 2026-02-11 |
| 7. Heatmap | v1.1 | 0/1 | Not started | - |
