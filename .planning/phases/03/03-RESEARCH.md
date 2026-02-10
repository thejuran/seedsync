# Phase 3: Dashboard & Trip Explorer - Research

**Researched:** 2026-02-09
**Domain:** React dashboard composition, aggregate API design, multi-resort trip search
**Confidence:** HIGH

## Summary

Phase 3 introduces two new features on top of a solid existing foundation: (1) a Dashboard home page aggregating contracts, point balances, and upcoming reservations with urgency alerts, and (2) a "What Can I Afford?" trip explorer that, given a date range, returns all bookable resort/room options filtered by eligibility and available points.

The backend already has nearly all the data and logic needed. The `/api/availability` endpoint already computes per-contract point availability with banking deadline info. The `/api/point-charts/calculate` endpoint already computes stay costs. The `/api/reservations?upcoming=true` endpoint already filters upcoming reservations. The primary backend work is a new `/api/trip-explorer` endpoint that iterates over all eligible resorts/rooms and checks affordability. The primary frontend work is a new `DashboardPage` composing existing data sources and a new `TripExplorerPage` with date-range input and results display.

**Primary recommendation:** Build a single new backend endpoint for trip exploration that composes existing engine functions (availability + cost calculation + eligibility). The dashboard is purely a frontend composition exercise -- it needs no new backend endpoints, only parallel fetches of existing ones.

## Standard Stack

### Core (already installed, continue using)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | ^19.2.4 | UI framework | Already in use |
| TanStack Query | ^5.90.20 | Server state management | Already used for all API hooks |
| react-router-dom | ^7.13.0 | Client routing | Already in use |
| shadcn/ui (radix-ui) | ^1.4.3 | Component primitives | Already in use (Card, Badge, Button, Dialog, Select, Table, Input, Label) |
| Tailwind CSS | ^4.1.18 | Styling | Already in use |
| lucide-react | ^0.563.0 | Icons | Already in use |
| date-fns | ^4.1.0 | Date utilities | Already installed, used in frontend |
| FastAPI | - | Backend framework | Already in use |
| SQLAlchemy (async) | - | ORM | Already in use |

### Supporting (no new dependencies needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Already installed; use for date formatting, relative time | Dashboard date displays, "X days until" |
| zustand | ^5.0.11 | Already installed; client state | Only if trip explorer needs persistent filter state across navigations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Multiple parallel fetches for dashboard | Single aggregate endpoint | Single endpoint couples data; parallel fetches use existing hooks with zero new backend code |
| New charting/visualization lib | Plain CSS progress bars | No charts needed for v1 dashboard -- just numbers and colored badges |

**Installation:**
```bash
# No new dependencies needed -- everything is already installed
```

## Architecture Patterns

### Recommended Project Structure
```
backend/
  api/
    dashboard.py          # New: dashboard aggregate endpoint (optional, see below)
    trip_explorer.py      # New: "what can I afford?" endpoint
    schemas.py            # Add: TripExplorerRequest, TripExplorerResult schemas
  engine/
    trip_explorer.py      # New: pure-function affordability calculator
    availability.py       # Existing: reuse get_contract_availability()
  data/
    point_charts.py       # Existing: reuse calculate_stay_cost(), get_available_charts()
    resorts.py            # Existing: reuse get_resort_slugs(), load_resorts()

frontend/
  src/
    pages/
      DashboardPage.tsx   # New: unified home page
      TripExplorerPage.tsx # New: "what can I afford?" page
    components/
      DashboardSummaryCards.tsx  # New: top-level stat cards
      UrgentAlerts.tsx          # New: banking deadline + expiration warnings
      UpcomingReservations.tsx   # New: compact reservation list
      TripExplorerForm.tsx       # New: date range + optional filters
      TripExplorerResults.tsx    # New: affordable options table/cards
    hooks/
      useDashboard.ts           # New: compose existing hooks for dashboard data
      useTripExplorer.ts        # New: hook for trip explorer API
```

### Pattern 1: Dashboard as Frontend Composition
**What:** The dashboard page makes parallel TanStack Query calls to existing endpoints (`/api/contracts/`, `/api/availability?target_date=today`, `/api/reservations?upcoming=true`) and composes the results client-side. No new backend endpoint required.
**When to use:** When all the data already exists in separate endpoints and the aggregation is simple display logic.
**Example:**
```typescript
// DashboardPage.tsx - composing existing hooks
export default function DashboardPage() {
  const { data: contracts, isLoading: contractsLoading } = useContracts();
  const { data: availability, isLoading: availLoading } = useAvailability(todayISO());
  const { data: reservations, isLoading: resLoading } = useReservations({ upcoming: true });

  const isLoading = contractsLoading || availLoading || resLoading;

  // Derive urgent items from availability data
  const urgentItems = useMemo(() => {
    if (!availability) return [];
    return availability.contracts.filter(
      (c) => !c.banking_deadline_passed && c.days_until_banking_deadline <= 60
           || c.days_until_expiration <= 90
    );
  }, [availability]);

  return (
    <div className="space-y-6">
      <DashboardSummaryCards availability={availability} contracts={contracts} />
      {urgentItems.length > 0 && <UrgentAlerts items={urgentItems} />}
      <UpcomingReservations reservations={reservations} />
    </div>
  );
}
```

### Pattern 2: Trip Explorer as Backend-Driven Search
**What:** The "what can I afford?" query is a backend endpoint because it requires iterating over all eligible resorts, all room types, and computing costs per night across the date range -- too much data to fetch and compute client-side. The backend endpoint composes existing engine functions.
**When to use:** When the computation involves cross-referencing multiple data sources (contracts, eligibility, point charts) and the result set needs filtering before sending to the client.
**Example:**
```python
# backend/engine/trip_explorer.py - pure function
def find_affordable_options(
    contracts: list[dict],
    point_balances: list[dict],
    reservations: list[dict],
    check_in: date,
    check_out: date,
) -> list[dict]:
    """
    For each contract, determine available points, eligible resorts,
    then iterate over all room types at eligible resorts computing
    stay cost. Return options where cost <= available points.
    """
    results = []
    for contract in contracts:
        # Get available points using existing availability engine
        avail = get_contract_availability(...)
        available_points = avail["available_points"]

        # Get eligible resorts using existing eligibility engine
        eligible = get_eligible_resorts(contract["home_resort"], contract["purchase_type"])

        # For each eligible resort with a point chart, check all rooms
        for resort_slug in eligible:
            chart = load_point_chart(resort_slug, check_in.year)
            if not chart:
                continue
            room_keys = set()
            for season in chart["seasons"]:
                room_keys.update(season["rooms"].keys())

            for room_key in sorted(room_keys):
                cost_result = calculate_stay_cost(resort_slug, room_key, check_in, check_out)
                if cost_result and cost_result["total_points"] <= available_points:
                    results.append({
                        "contract_id": contract["id"],
                        "contract_name": contract.get("name") or contract.get("home_resort"),
                        "available_points": available_points,
                        "resort": resort_slug,
                        "room_key": room_key,
                        "total_points": cost_result["total_points"],
                        "num_nights": cost_result["num_nights"],
                        "points_remaining": available_points - cost_result["total_points"],
                    })
    return sorted(results, key=lambda r: r["total_points"])
```

### Pattern 3: Existing Hook Composition Pattern
**What:** Follow the established codebase pattern where each API entity has its own hook file with `useQuery`/`useMutation` calls.
**When to use:** Always -- maintain consistency with hooks like `useContracts()`, `useReservations()`, `useAvailability()`.
**Example:**
```typescript
// hooks/useTripExplorer.ts
export function useTripExplorer(checkIn: string | null, checkOut: string | null) {
  return useQuery({
    queryKey: ["trip-explorer", checkIn, checkOut],
    queryFn: () =>
      api.get<TripExplorerResponse>(
        `/trip-explorer?check_in=${checkIn}&check_out=${checkOut}`
      ),
    enabled: !!checkIn && !!checkOut,
  });
}
```

### Anti-Patterns to Avoid
- **Building a dedicated dashboard aggregation endpoint:** The data already exists in separate endpoints. Adding a `/api/dashboard` that duplicates the same queries and returns a super-object creates maintenance burden and cache invalidation complexity. Use parallel TanStack Query calls instead.
- **Client-side trip cost computation:** Don't fetch all point charts to the frontend and compute affordability there. The charts are large JSON files and the iteration over all resorts/rooms is O(resorts * rooms * nights). Keep this server-side.
- **Separate urgency calculation logic:** The AvailabilityContractResult already contains `days_until_banking_deadline`, `banking_deadline_passed`, and `days_until_expiration`. Don't recompute these -- derive urgency flags from the existing availability response.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Point availability calculation | Custom dashboard availability logic | `engine.availability.get_all_contracts_availability()` | Already handles use year detection, balance aggregation, reservation deduction |
| Resort eligibility filtering | Custom eligibility checks | `engine.eligibility.get_eligible_resorts()` | Already handles direct vs resale, restricted vs original-14 |
| Stay cost calculation | Custom cost loop | `data.point_charts.calculate_stay_cost()` | Already handles multi-season stays, weekend/weekday, year-boundary crossings |
| Date formatting | Manual date string manipulation | `date-fns` (already installed) | Edge cases around timezones, locale formatting |
| Room key parsing | Manual string splitting | `parseRoomKey()` from `lib/utils.ts` (already exists) | Already handles longest-match view category suffix |
| Data fetching + caching | Manual fetch + useState | TanStack Query hooks (already established pattern) | Handles caching, deduplication, stale-while-revalidate |

**Key insight:** Phase 3 is primarily a composition phase. The building blocks (availability engine, cost calculator, eligibility resolver, point chart loader) all exist. The work is wiring them together into new endpoints and UI views.

## Common Pitfalls

### Pitfall 1: Trip Explorer Performance
**What goes wrong:** Iterating all resorts * all rooms * all nights in the date range can be slow if many point chart files exist and the date range is long.
**Why it happens:** With 16 resorts, ~5 room types each, and 14-night max stays, that's 16 * 5 * 14 = 1120 point lookups per contract. With multiple contracts, this multiplies.
**How to avoid:** The `load_point_chart()` function is already `@lru_cache`-decorated, so repeated loads are free. Keep the max stay at 14 nights (already enforced). Only iterate resorts that have chart data (skip resorts without JSON files). Return results sorted by cost ascending so cheapest options appear first.
**Warning signs:** API response time > 500ms for trip explorer queries.

### Pitfall 2: Missing Point Chart Data
**What goes wrong:** Trip explorer silently returns no results for resorts that don't have point chart JSON files. Currently only `polynesian_2026.json` and `riviera_2026.json` exist.
**Why it happens:** Point charts are loaded from `data/point_charts/` and most resorts don't have data yet.
**How to avoid:** The trip explorer should clearly communicate which resorts were checked vs skipped. Include a `resorts_checked` and `resorts_skipped` field in the response so the user understands coverage. Display a note in the UI about missing chart data.
**Warning signs:** User gets "no affordable options" when they clearly have enough points because charts are simply missing.

### Pitfall 3: Dashboard Route Replaces Default
**What goes wrong:** The current default route `/` redirects to `/contracts`. Phase 3 changes this to redirect to `/dashboard` (or make `/` the dashboard). If not updated carefully, old bookmarks break.
**Why it happens:** `App.tsx` has `<Route path="/" element={<Navigate to="/contracts" replace />} />`.
**How to avoid:** Update the root route to navigate to `/dashboard` instead of `/contracts`. Add `/dashboard` to the nav items in `Layout.tsx` as the first item. Consider renaming "Point Calculator" back to "Availability" to avoid confusion with the new Trip Explorer.
**Warning signs:** After deployment, user lands on contracts page instead of dashboard.

### Pitfall 4: Timezone Date Issues
**What goes wrong:** Date inputs send local dates, but availability calculations happen server-side. If user is in a different timezone, "today" on the dashboard could be tomorrow on the server.
**Why it happens:** JavaScript `new Date().toISOString().split("T")[0]` uses UTC, but the user sees local time. The existing `AvailabilityPage` already has this pattern with `todayISO()`.
**How to avoid:** Continue using the existing `todayISO()` pattern that is already established and working. The dashboard auto-sends today's date for availability; the trip explorer sends explicit user-chosen dates.
**Warning signs:** "Points expiring soon" shows wrong day counts near midnight.

### Pitfall 5: Inconsistent Use Year for Trip Explorer
**What goes wrong:** A trip explorer query for dates in the next use year shows wrong available points because it uses the current use year's balances.
**Why it happens:** The availability engine calculates availability based on a `target_date`. For trip explorer, the relevant date is the check-in date.
**How to avoid:** Pass `check_in` as the `target_date` to `get_contract_availability()` in the trip explorer engine. This ensures the correct use year's balances are used.
**Warning signs:** Trip explorer shows more/fewer points than expected for dates in a different use year.

## Code Examples

### Backend: Trip Explorer Endpoint
```python
# backend/api/trip_explorer.py
from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db.database import get_db
from backend.models.contract import Contract
from backend.models.point_balance import PointBalance
from backend.models.reservation import Reservation
from backend.engine.trip_explorer import find_affordable_options

router = APIRouter(tags=["trip-explorer"])

@router.get("/api/trip-explorer")
async def trip_explorer(
    check_in: date = Query(..., description="Check-in date (YYYY-MM-DD)"),
    check_out: date = Query(..., description="Check-out date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
):
    """Find all affordable resort/room options for the given date range."""
    # Load all data (same pattern as availability endpoint)
    contracts = (await db.execute(select(Contract))).scalars().all()
    balances = (await db.execute(select(PointBalance))).scalars().all()
    reservations = (await db.execute(
        select(Reservation).where(Reservation.status != "cancelled")
    )).scalars().all()

    # Convert to dicts for pure-function engine
    contracts_data = [{"id": c.id, "name": c.name, "home_resort": c.home_resort,
                       "use_year_month": c.use_year_month, "annual_points": c.annual_points,
                       "purchase_type": c.purchase_type} for c in contracts]
    balances_data = [{"contract_id": b.contract_id, "use_year": b.use_year,
                      "allocation_type": b.allocation_type, "points": b.points} for b in balances]
    reservations_data = [{"contract_id": r.contract_id, "check_in": r.check_in,
                          "points_cost": r.points_cost, "status": r.status} for r in reservations]

    return find_affordable_options(
        contracts=contracts_data,
        point_balances=balances_data,
        reservations=reservations_data,
        check_in=check_in,
        check_out=check_out,
    )
```

### Backend: Trip Explorer Engine (Pure Function)
```python
# backend/engine/trip_explorer.py
from datetime import date
from backend.engine.availability import get_contract_availability
from backend.engine.eligibility import get_eligible_resorts
from backend.data.point_charts import calculate_stay_cost, get_available_charts
from backend.data.resorts import load_resorts

def find_affordable_options(
    contracts: list[dict],
    point_balances: list[dict],
    reservations: list[dict],
    check_in: date,
    check_out: date,
) -> dict:
    # Build set of resorts that have chart data for the check-in year
    available_charts = get_available_charts()
    resorts_with_charts = {c["resort"] for c in available_charts if c["year"] == check_in.year}
    all_resorts = load_resorts()
    resort_names = {r["slug"]: r["short_name"] for r in all_resorts}

    options = []
    resorts_checked = set()
    resorts_skipped = set()

    for contract in contracts:
        c_balances = [b for b in point_balances if b["contract_id"] == contract["id"]]
        c_reservations = [r for r in reservations if r["contract_id"] == contract["id"]]

        avail = get_contract_availability(
            contract_id=contract["id"],
            use_year_month=contract["use_year_month"],
            annual_points=contract["annual_points"],
            point_balances=c_balances,
            reservations=c_reservations,
            target_date=check_in,  # Use check_in as target for correct use year
        )
        available_pts = avail["available_points"]
        if available_pts <= 0:
            continue

        eligible = get_eligible_resorts(contract["home_resort"], contract["purchase_type"])

        for resort_slug in eligible:
            if resort_slug not in resorts_with_charts:
                resorts_skipped.add(resort_slug)
                continue
            resorts_checked.add(resort_slug)

            cost_result_cache = {}
            chart = ...  # load and iterate rooms
            # ... (see full pattern in Architecture Patterns section above)

    return {
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "num_nights": (check_out - check_in).days,
        "options": options,
        "resorts_checked": sorted(resorts_checked),
        "resorts_skipped": sorted(resorts_skipped),
        "total_options": len(options),
    }
```

### Frontend: Dashboard Summary Cards
```typescript
// components/DashboardSummaryCards.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AvailabilityResponse, ContractWithDetails } from "../types";

interface Props {
  availability: AvailabilityResponse | undefined;
  contracts: ContractWithDetails[] | undefined;
}

export default function DashboardSummaryCards({ availability, contracts }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{contracts?.length ?? "--"}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Total Points</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">
            {availability?.summary.total_points ?? "--"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Available Points</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-green-600">
            {availability?.summary.total_available ?? "--"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Committed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-amber-600">
            {availability?.summary.total_committed ?? "--"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Frontend: Urgent Alerts Component
```typescript
// components/UrgentAlerts.tsx
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangleIcon, ClockIcon } from "lucide-react";
import type { AvailabilityContractResult } from "../types";

interface Props {
  items: AvailabilityContractResult[];
}

export default function UrgentAlerts({ items }: Props) {
  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="pt-4">
        <h3 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
          <AlertTriangleIcon className="size-4" />
          Action Needed
        </h3>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.contract_id} className="text-sm">
              {!item.banking_deadline_passed && item.days_until_banking_deadline <= 60 && (
                <span className="text-amber-700">
                  <ClockIcon className="size-3 inline mr-1" />
                  {item.contract_name}: Banking deadline in {item.days_until_banking_deadline} days
                  ({item.available_points} pts available)
                </span>
              )}
              {item.days_until_expiration <= 90 && (
                <span className="text-red-700">
                  <AlertTriangleIcon className="size-3 inline mr-1" />
                  {item.contract_name}: Points expire in {item.days_until_expiration} days
                </span>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate pages for each entity | Dashboard overview + detail pages | Phase 3 | User starts at dashboard, drills into detail pages |
| Root route goes to /contracts | Root route goes to /dashboard | Phase 3 | Dashboard becomes the home page |
| "Point Calculator" in nav | "Availability" or keep as-is | Phase 3 | Consider renaming to avoid confusion with Trip Explorer |

**No deprecated patterns to worry about:** The existing codebase uses modern React 19, TanStack Query v5, Tailwind v4, and shadcn/ui. All patterns are current.

## Open Questions

1. **Urgency thresholds -- what "soon" means**
   - What we know: Banking deadline and expiration dates are already computed. AvailabilityCard already uses 30 days for "urgent" banking deadline.
   - What's unclear: Should the dashboard use the same 30-day threshold, or a different one? Should there be multiple tiers (e.g., 60 days = warning, 30 days = urgent)?
   - Recommendation: Use 60 days for banking deadline warnings and 90 days for expiration warnings on the dashboard. These are wider windows than the per-card view because the dashboard is an early warning system.

2. **Trip explorer scope with limited chart data**
   - What we know: Only 2 of 16 resorts have point chart data (polynesian_2026, riviera_2026). Trip explorer will only return results for those 2.
   - What's unclear: Should the UI prominently call this out, or is it fine since the user knows they entered the data manually?
   - Recommendation: Show a clear "X of Y eligible resorts checked (Z skipped -- no chart data)" message. The user needs to understand why results are limited.

3. **Navigation restructuring**
   - What we know: Current nav is: Contracts, Point Calculator, Reservations, Point Charts. Dashboard needs to be added as the first/home item.
   - What's unclear: Whether "Point Calculator" (availability page) should be renamed to avoid confusion with Trip Explorer.
   - Recommendation: Nav order should be: Dashboard, Trip Explorer, Contracts, Reservations, Point Charts. Remove "Point Calculator" as a standalone nav item -- its functionality is now absorbed into the dashboard (which shows availability) and the trip explorer (which uses availability to find options). If the availability page is still useful standalone, keep it as "Availability" in nav.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Complete read of all backend and frontend source files:
  - `backend/engine/availability.py` - Availability engine with per-contract and aggregate calculations
  - `backend/engine/eligibility.py` - Resale/direct eligibility resolver
  - `backend/data/point_charts.py` - Point chart loader with `@lru_cache`, cost calculator
  - `backend/api/availability.py` - Availability API endpoint pattern
  - `backend/api/schemas.py` - All Pydantic schemas including AvailabilityContractResult with banking/expiration fields
  - `frontend/src/pages/AvailabilityPage.tsx` - Existing availability page pattern (parallel queries, summary card + per-contract cards)
  - `frontend/src/hooks/` - All existing TanStack Query hook patterns
  - `frontend/src/components/AvailabilityCard.tsx` - Existing urgency display (banking deadline coloring at 30 days)
  - `frontend/src/types/index.ts` - All TypeScript types
  - `frontend/src/App.tsx` - Routing structure, QueryClient config
  - `frontend/src/components/Layout.tsx` - Navigation sidebar structure
  - `frontend/package.json` - All dependencies (React 19, TanStack Query 5, radix-ui, date-fns, zustand, shadcn)
  - `data/resorts.json` - 16 resorts, 3 restricted (Riviera, DLH, Cabins FW)
  - `data/point_charts/` - Only polynesian_2026.json and riviera_2026.json exist

### Secondary (MEDIUM confidence)
- `.planning/ROADMAP.md` - Phase 3 requirements (TRIP-02, DASH-01, DASH-02) and success criteria
- `.planning/REQUIREMENTS.md` - Full requirement definitions and traceability

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies needed; everything verified from package.json and existing code
- Architecture: HIGH - Patterns directly extend existing codebase conventions (same hook pattern, same card components, same API structure)
- Pitfalls: HIGH - Identified from actual codebase analysis (limited chart data, timezone handling, route conflicts)
- Trip explorer algorithm: HIGH - Composes three existing pure functions (availability, eligibility, cost calculation) that are already tested

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (stable; no external dependency changes expected)
