# DVC Dashboard

## What This Is

A personal web application for managing Disney Vacation Club points across multiple contracts. It connects to the DVC website to pull in contract data, point balances, and reservations, then presents a unified dashboard that answers the key question: "For any future date, what points do I have and what can I book?"

## Core Value

For any future date, clearly show available points across all contracts and what resorts/rooms those points can actually book — accounting for banking, borrowing, existing reservations, and resale restrictions.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. -->

- [ ] Dashboard showing all contracts with current point balances, use years, and banking deadlines
- [ ] Point timeline calculator — pick a future date, see total available points accounting for banking/borrowing/commitments
- [ ] Per-contract breakdown showing which use year's points contribute to the total for a given date
- [ ] Trip explorer — given available points for a date, show bookable resort/room options with point costs
- [ ] Reservation tracker — view existing bookings and their point impact on the overall balance
- [ ] DVC account scraping to import contracts, point balances, and reservations
- [ ] DVC point chart scraping to get current room costs by resort/season
- [ ] Per-contract resale/direct flag that drives resort eligibility filtering
- [ ] Banking/borrowing impact preview — show what happens to point situation if a potential booking is made

### Out of Scope

- Multi-user / sharing features — personal tool, single user only
- Non-DVC booking options (cruises, Adventures by Disney, hotels) — resale restrictions exclude these anyway
- Mobile native app — web-first, accessible from any browser
- Availability checking — the tool shows what you *could* book based on points, not real-time room availability from Disney
- Automated booking — this is a planning/tracking tool, not a booking agent

## Context

- Owner has 2-3 DVC contracts at different home resorts
- All contracts are resale, which restricts booking to DVC resorts only (no cruises, non-DVC hotels, etc.) and limits access to certain newer resorts
- DVC points operate on a use-year system with banking (carry forward) and borrowing (use future points) windows
- Point costs vary by resort, room type, and season — Disney publishes point charts that change periodically
- The official DVC website exists but is clunky and doesn't provide the unified cross-contract planning view needed
- Current workaround is spreadsheets, which are hard to maintain and don't handle the time-based point availability calculations well

## Constraints

- **Data source**: Must scrape DVC website — no official API exists
- **Resale rules**: Tool must encode DVC resale restriction rules to accurately filter bookable resorts per contract
- **Point charts**: Must stay current with Disney's published point charts (they change periodically)
- **Single user**: No authentication system needed beyond the owner's own DVC credentials for scraping

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web app over native | Accessible from any device, simpler to build and deploy | — Pending |
| Scrape DVC site for data | Manual entry is tedious and error-prone; automation is core to the value | — Pending |
| Per-contract resale/direct flag | Simpler than trying to auto-detect purchase type; user knows their contracts | — Pending |
| Show bookable options, not live availability | Real-time availability scraping is complex and fragile; point-based filtering is sufficient for planning | — Pending |

---
*Last updated: 2026-02-09 after initialization*
