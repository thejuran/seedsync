# DVC Dashboard

## What This Is

A personal web application for managing Disney Vacation Club points across multiple contracts. It presents a unified dashboard that answers the key question: "For any future date, what points do I have and what can I book?" -- with Docker self-hosting, booking impact previews, what-if scenarios, and visual cost comparison tools.

## Core Value

For any future date, clearly show available points across all contracts and what resorts/rooms those points can actually book -- accounting for banking, borrowing, existing reservations, and resale restrictions.

## Current State

**Shipped:** v1.1 (2026-02-11)

v1.1 adds Docker packaging and trip planning tools on top of v1.0's foundation:
- Docker self-hosting with `docker compose up`, persistent data, auto-migrations, pre-seeded point charts
- Booking impact preview: expandable Trip Explorer cards with before/after point balances, nightly breakdown, banking warnings
- Booking window alerts: 11-month and 7-month window dates on Trip Explorer results + dashboard upcoming alerts
- What-if scenario playground: model up to 10 hypothetical bookings, see cumulative impact with baseline vs scenario comparison
- Seasonal cost heatmap: full-year calendar with per-day cost coloring, room selector, weekend indicators, hover tooltips
- Configurable borrowing policy (50%/100%) with UI toggle and server-side enforcement

**Tech stack:** FastAPI + SQLAlchemy (async) backend, React 19 + Vite + Tailwind 4 + shadcn/ui frontend, SQLite storage, Docker for deployment. ~5,800 TypeScript + ~2,800 Python + ~3,300 test Python = ~11,800 LOC.

<details>
<summary>v1.0 foundation (shipped 2026-02-10)</summary>

- Contract and point balance management with resale eligibility
- Versioned point chart data (Polynesian + Riviera 2026)
- Point availability calculator with banking/expiration/reservation accounting
- Reservation tracking with automatic point deductions
- Dashboard with summary cards, urgent alerts, upcoming reservations
- Trip Explorer ("what can I afford?") with date-range search
</details>

## Requirements

### Validated

- ✓ Dashboard showing all contracts with point balances, use years, and banking deadlines -- v1.0
- ✓ Point timeline calculator with per-contract breakdown accounting for banking/borrowing/commitments -- v1.0
- ✓ Trip explorer showing bookable resort/room options with point costs -- v1.0
- ✓ Reservation tracker with point impact on overall balance -- v1.0
- ✓ Per-contract resale/direct flag driving resort eligibility filtering -- v1.0
- ✓ Versioned point chart data by resort/room/season/day-of-week -- v1.0
- ✓ Docker packaging with docker-compose for self-hosting -- v1.1
- ✓ Booking impact preview for potential bookings (Trip Explorer integration) -- v1.1
- ✓ What-if scenario playground for modeling multiple hypothetical bookings -- v1.1
- ✓ Booking window alerts (11-month home resort, 7-month any resort opening dates) -- v1.1
- ✓ Seasonal cost heatmap for visual resort/room/date comparison -- v1.1
- ✓ Configurable borrowing policy (100%/50% setting) -- v1.1

### Deferred to v2

- [ ] DVC account scraping to import contracts, point balances, and reservations
- [ ] DVC point chart scraping to get current room costs by resort/season
- [ ] Save/name scenarios for later comparison
- [ ] Simulate banking points from current use year
- [ ] Model adding a hypothetical new contract
- [ ] Overlay "affordable dates" on heatmap based on current point balance
- [ ] Compare two resorts side-by-side on heatmap
- [ ] Browser notifications for upcoming booking windows
- [ ] Export booking window dates to calendar (iCal)

### Out of Scope

- Multi-user / sharing features -- personal tool, single user only
- Real-time availability checking -- fragile scraping, legally gray
- Automated booking -- violates Disney ToS
- Mobile native app -- web-first, accessible from any browser
- Railway/cloud deployment -- Docker for self-hosting; users deploy wherever they want
- Email/SMS notifications -- no auth infrastructure; in-app alerts sufficient
- Auto-optimization ("best plan") -- too many subjective factors; show numbers, user decides

## Context

- Owner has 2-3 DVC contracts at different home resorts (all resale)
- DVC points operate on a use-year system with banking/borrowing windows
- Point costs vary by resort, room type, and season
- The official DVC website doesn't provide cross-contract planning views
- v1 replaced spreadsheet-based tracking with proper web app
- v1.1 made it shareable and added planning intelligence

## Constraints

- **Data source**: Manual entry through v1.x; scraping deferred to v2
- **Resale rules**: Encodes DVC resale restriction rules (original 14 vs restricted 3)
- **Point charts**: Versioned JSON data, currently 2 resorts loaded
- **Single user**: No authentication needed
- **Deployment**: Docker single-container (FastAPI serves React build)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app (FastAPI + React) | Accessible from any device, mirrors proven NephSched pattern | ✓ Good |
| Manual entry for v1, scraping for v2 | Correct risk posture given Disney site fragility | ✓ Good |
| Per-contract resale/direct flag | Simpler than auto-detection; user knows their contracts | ✓ Good |
| Show bookable options, not live availability | Avoids fragile real-time scraping | ✓ Good |
| SQLite for storage | Single-user, zero-config, trivial backups | ✓ Good |
| Pure-function engine layer | Testable, composable, no DB coupling in business logic | ✓ Good |
| Docker for sharing, not Railway | Open-source self-hosted tool; no auth needed, no revenue model | ✓ Good |
| Single container (FastAPI serves React) | Simpler deployment, one port, one process | ✓ Good |
| Zustand for ephemeral scenario state | Already installed, lightweight, no persistence needed | ✓ Good |
| Server-side computation, client-side state for scenarios | Engine reuse, consistent business logic | ✓ Good |
| DVC end-of-month roll-forward rule | Matches DVC's actual booking window date calculation | ✓ Good |
| Conservative banking warning | Warns when booking COULD consume bankable points; safe default | ✓ Good |
| Client-side heatmap computation | No new API endpoint needed; useMemo from existing chart data | ✓ Good |
| Shared heatColor utility | Code reuse between PointChartTable and CostHeatmap | ✓ Good |

---
*Last updated: 2026-02-11 after v1.1 milestone*
