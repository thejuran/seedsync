# Roadmap: DVC Dashboard

## Overview

Build a personal DVC points management dashboard in three phases: first establish the data foundation (contracts, point balances, point charts), then layer on the calculation engine and reservation tracking, and finally deliver the unified dashboard and trip explorer views. Scraping is deferred to v2 -- the entire v1 works with manual data entry, which is the correct risk posture given Disney site fragility.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Data Foundation** - Project scaffolding, contract/point management, and point chart data
- [x] **Phase 2: Calculations & Reservations** - Point timeline calculator, reservation tracking, and trip cost lookup
- [x] **Phase 3: Dashboard & Trip Explorer** - Unified dashboard with alerts and "what can I afford?" trip explorer

## Phase Details

### Phase 1: Data Foundation
**Goal**: User can manage their DVC contracts, enter point balances, and the system has point chart data to power all downstream calculations
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, PNTS-01, PNTS-02, PNTS-03
**Success Criteria** (what must be TRUE):
  1. User can add a DVC contract specifying home resort, use year, annual points, and resale/direct status, and can later edit or remove it
  2. User can enter and view current point balances per contract (current year, banked, borrowed) with a clear summary
  3. User can view use year timeline per contract showing banking deadline, use year start/end, and point expiration dates
  4. System contains versioned point chart data (by resort, room type, view, season, day-of-week) for current and upcoming years
  5. System correctly identifies which resorts each contract can book based on resale/direct status
**Plans**: 3 plans

Plans:
- [x] 01-01: Project scaffolding + database foundation (backend/frontend setup, models, migrations, resort data)
- [x] 01-02: Contract & point balance management (CRUD API + UI, eligibility logic, use year timeline)
- [x] 01-03: Point chart data system (JSON schema, data loading, versioned storage, cost lookup API + UI)

### Phase 2: Calculations & Reservations
**Goal**: User can pick any future date and see exactly what points are available across all contracts, manage reservations, and look up trip costs -- with reservations properly deducted from all calculations
**Depends on**: Phase 1
**Requirements**: PNTS-04, PNTS-05, PNTS-06, TRIP-01, TRIP-03, TRIP-04, TRIP-05
**Success Criteria** (what must be TRUE):
  1. User can pick a future date and see total available points across all contracts for that date
  2. Point timeline shows per-contract breakdown indicating which use year's points contribute to the total, accounting for banking deadlines, expiration, and existing reservations
  3. User can add, edit, and remove reservations with resort, room type, dates, and point cost
  4. User can look up the point cost for a specific resort, room type, and date range
  5. Reservation point costs are correctly deducted from available point balances in all calculations
**Plans**: 3 plans

Plans:
- [x] 02-01: Reservation model + point availability engine (Reservation SQLAlchemy model, Alembic migration, pure-function availability calculator with reservation deductions)
- [x] 02-02: Reservation & availability API (CRUD endpoints, eligibility validation, availability query endpoint with per-contract breakdown)
- [x] 02-03: Reservation & availability UI (Reservations page, point availability page, navigation updates, cost calculator integration)

### Phase 3: Dashboard & Trip Explorer
**Goal**: User has a unified home page showing their complete DVC picture at a glance and can query "what can I afford?" to discover bookable options
**Depends on**: Phase 2
**Requirements**: TRIP-02, DASH-01, DASH-02
**Success Criteria** (what must be TRUE):
  1. User sees a dashboard home page with at-a-glance view of all contracts, point balances, and upcoming reservations
  2. Dashboard highlights urgent items: points expiring soon and upcoming banking deadlines
  3. User can query "what can I afford?" for a date range and see all bookable resort/room options filtered by resale eligibility and available points
**Plans**: 3 plans

Plans:
- [x] 03-01: Trip Explorer backend (engine function + API endpoint composing existing availability, eligibility, and cost functions)
- [x] 03-02: Dashboard page (frontend composition of existing endpoints -- summary cards, urgent alerts, upcoming reservations)
- [x] 03-03: Trip Explorer UI + navigation updates (trip explorer page with date form and results, dashboard as landing page, nav restructure)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Data Foundation | 3/3 | Complete | 2026-02-09 |
| 2. Calculations & Reservations | 3/3 | Complete | 2026-02-09 |
| 3. Dashboard & Trip Explorer | 3/3 | Complete | 2026-02-10 |
