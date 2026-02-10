# DVC Dashboard

## What This Is

A personal web application for managing Disney Vacation Club points across multiple contracts. It presents a unified dashboard that answers the key question: "For any future date, what points do I have and what can I book?"

## Core Value

For any future date, clearly show available points across all contracts and what resorts/rooms those points can actually book -- accounting for banking, borrowing, existing reservations, and resale restrictions.

## Current Milestone: v1.1 Share & Plan

**Goal:** Make the app shareable via Docker and add planning tools (booking impact preview, what-if scenarios, booking window alerts, cost heatmap) so users can plan trips, not just track points.

**Target features:**
- Docker packaging with docker-compose for self-hosting
- Booking impact preview integrated into Trip Explorer
- Standalone scenario playground for modeling multiple hypothetical bookings
- Booking window alerts (11-month home resort, 7-month any resort)
- Seasonal cost heatmap for visual resort/room/date comparison
- Configurable borrowing policy (100%/50%)

## Current State

**Shipped:** v1.0 (2026-02-10)

v1.0 delivers the complete manual-entry DVC point tracking experience:
- Contract and point balance management with resale eligibility
- Versioned point chart data (Polynesian + Riviera 2026)
- Point availability calculator with banking/expiration/reservation accounting
- Reservation tracking with automatic point deductions
- Dashboard with summary cards, urgent alerts, upcoming reservations
- Trip Explorer ("what can I afford?") with date-range search

**Tech stack:** FastAPI + SQLAlchemy (async) backend, React 19 + Vite + Tailwind 4 + shadcn/ui frontend, SQLite storage. 141 backend tests, 81 source files, 18,638 LOC.

## Requirements

### Validated (v1.0)

- [x] Dashboard showing all contracts with point balances, use years, and banking deadlines
- [x] Point timeline calculator with per-contract breakdown accounting for banking/borrowing/commitments
- [x] Trip explorer showing bookable resort/room options with point costs
- [x] Reservation tracker with point impact on overall balance
- [x] Per-contract resale/direct flag driving resort eligibility filtering
- [x] Versioned point chart data by resort/room/season/day-of-week

### Active (v1.1)

- [ ] Docker packaging with docker-compose for self-hosting
- [ ] Booking impact preview for potential bookings (Trip Explorer integration)
- [ ] What-if scenario playground for modeling multiple hypothetical bookings
- [ ] Booking window alerts (11-month home resort, 7-month any resort opening dates)
- [ ] Seasonal cost heatmap for visual resort/room/date comparison
- [ ] Configurable borrowing policy (100%/50% setting)

### Deferred to v2

- [ ] DVC account scraping to import contracts, point balances, and reservations
- [ ] DVC point chart scraping to get current room costs by resort/season

### Out of Scope

- Multi-user / sharing features -- personal tool, single user only
- Real-time availability checking -- fragile scraping, legally gray
- Automated booking -- violates Disney ToS
- Mobile native app -- web-first, accessible from any browser

## Context

- Owner has 2-3 DVC contracts at different home resorts (all resale)
- DVC points operate on a use-year system with banking/borrowing windows
- Point costs vary by resort, room type, and season
- The official DVC website doesn't provide cross-contract planning views
- v1 replaced spreadsheet-based tracking with proper web app

## Constraints

- **Data source**: Manual entry through v1.x; scraping deferred to v2
- **Resale rules**: Encodes DVC resale restriction rules (original 14 vs restricted 3)
- **Point charts**: Versioned JSON data, currently 2 resorts loaded
- **Single user**: No authentication needed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app (FastAPI + React) | Accessible from any device, mirrors proven NephSched pattern | Shipped v1.0 |
| Manual entry for v1, scraping for v2 | Correct risk posture given Disney site fragility | Shipped v1.0 |
| Per-contract resale/direct flag | Simpler than auto-detection; user knows their contracts | Shipped v1.0 |
| Show bookable options, not live availability | Avoids fragile real-time scraping | Shipped v1.0 |
| SQLite for storage | Single-user, zero-config, trivial backups | Shipped v1.0 |
| Pure-function engine layer | Testable, composable, no DB coupling in business logic | Shipped v1.0 |

| Docker for sharing, not Railway | Open-source self-hosted tool; no auth needed, no revenue model | v1.1 |
| v1.x = manual entry, v2 = scraping | Reserves major version for data source change | v1.1 |

---
*Last updated: 2026-02-10 after v1.1 milestone start*
