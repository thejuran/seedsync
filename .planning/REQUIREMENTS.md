# Requirements: DVC Dashboard

**Defined:** 2026-02-09
**Core Value:** For any future date, clearly show available points across all contracts and what resorts/rooms those points can actually book — accounting for banking, borrowing, existing reservations, and resale restrictions.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Data & Contracts

- [ ] **DATA-01**: User can add a DVC contract with home resort, use year month, annual point allocation, and resale/direct purchase type
- [ ] **DATA-02**: User can edit or remove an existing contract
- [ ] **DATA-03**: User can manually enter current point balances per contract (current year, banked, borrowed)
- [ ] **DATA-04**: System stores DVC point charts (point costs per resort, room type, view category, season, and day-of-week)
- [ ] **DATA-05**: Point charts are versioned by year so current and future year charts can coexist

### Point Tracking

- [ ] **PNTS-01**: User can view point balance summary per contract showing current year, banked, and borrowed points
- [ ] **PNTS-02**: User can view use year timeline per contract showing banking deadline, use year start/end, and point expiration dates
- [ ] **PNTS-03**: System correctly identifies which resorts each contract can book at based on resale/direct status
- [ ] **PNTS-04**: User can pick a future date and see total available points across all contracts for that date
- [ ] **PNTS-05**: Point timeline calculator shows per-contract breakdown (which contract's points from which use year contribute to the total)
- [ ] **PNTS-06**: Point timeline calculator accounts for banking deadlines, expiration, and existing reservation commitments

### Trip Planning

- [ ] **TRIP-01**: User can look up point cost for a specific resort, room type, and date range
- [ ] **TRIP-02**: User can query "what can I afford?" — given available points for a date range, see all bookable resort/room options filtered by resale eligibility
- [ ] **TRIP-03**: User can view a list of existing reservations with resort, room type, dates, and point cost
- [ ] **TRIP-04**: User can manually add, edit, or remove reservations
- [ ] **TRIP-05**: Reservation point costs are deducted from available point balances in all calculations

### Dashboard

- [ ] **DASH-01**: User sees a dashboard home page with at-a-glance view of all contracts, point balances, and upcoming reservations
- [ ] **DASH-02**: Dashboard highlights urgent items (points expiring soon, upcoming banking deadlines)

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Scraping & Automation

- **SCRP-01**: System can authenticate with DVC member website and import contract/point data automatically
- **SCRP-02**: System can import existing reservations from DVC member website
- **SCRP-03**: User can trigger a manual sync and see "last synced" timestamp

### Advanced Planning

- **ADVN-01**: User can preview the impact of a potential booking on their point situation before committing
- **ADVN-02**: User can model what-if banking/borrowing scenarios and see projected point availability
- **ADVN-03**: System shows key date reminders (banking deadlines, 11-month/7-month booking windows)
- **ADVN-04**: User can view a seasonal cost heatmap showing point costs across an entire year for a given resort/room

## Out of Scope

| Feature | Reason |
|---------|--------|
| Multi-user / sharing | Personal tool, single user only. Adds auth/authorization complexity for no benefit |
| Real-time availability checking | Requires live scraping of Disney booking system; fragile and legally gray. Use DVCapp.com |
| Automated booking | Violates Disney ToS, risks account suspension |
| Point rental marketplace | Entire business (David's DVC Rentals) — massively out of scope |
| Dining / park reservation planning | Scope creep into general Disney planning; hundreds of apps do this |
| Mobile native app | Web-first, accessible from mobile browser. No App Store overhead |
| Annual dues tracking / financial analysis | Nice-to-have that doesn't improve point planning workflow |
| Community features | Personal tool, not a social platform. DISboards and DVCinfo serve this |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Pending |
| DATA-02 | Phase 1 | Pending |
| DATA-03 | Phase 1 | Pending |
| DATA-04 | Phase 1 | Pending |
| DATA-05 | Phase 1 | Pending |
| PNTS-01 | Phase 1 | Pending |
| PNTS-02 | Phase 1 | Pending |
| PNTS-03 | Phase 1 | Pending |
| PNTS-04 | Phase 2 | Pending |
| PNTS-05 | Phase 2 | Pending |
| PNTS-06 | Phase 2 | Pending |
| TRIP-01 | Phase 2 | Pending |
| TRIP-02 | Phase 3 | Pending |
| TRIP-03 | Phase 2 | Pending |
| TRIP-04 | Phase 2 | Pending |
| TRIP-05 | Phase 2 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after roadmap creation*
