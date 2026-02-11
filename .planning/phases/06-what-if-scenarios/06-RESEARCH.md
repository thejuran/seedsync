# Phase 6: What-If Scenarios - Research

**Researched:** 2026-02-10
**Domain:** Scenario workspace with cumulative hypothetical bookings, Zustand client-side state, server-side computation via existing engine
**Confidence:** HIGH

## Summary

Phase 6 builds a "What-If Scenario Playground" -- a standalone page where the user adds multiple hypothetical reservations, sees cumulative point impact across all contracts, and compares baseline (current reality) vs scenario point balances side-by-side. No data persists to the database; the scenario lives entirely in ephemeral Zustand state on the client.

The architecture composes the existing Phase 5 infrastructure. The `compute_booking_impact()` pure function already calculates before/after point availability for a single proposed reservation. For scenarios, a new `POST /api/scenarios/evaluate` endpoint accepts a list of hypothetical reservations, loads real contract/balance/reservation data from the DB, then iteratively applies each hypothetical reservation to the availability engine to produce cumulative impact. This keeps all computation server-side (where the engine and point chart data live) while the client manages the list of hypothetical bookings in Zustand.

This is the first activation of Zustand in the project. It was installed in v1.1 Phase 4 (`zustand@^5.0.11`) but never used. The scenario store holds an array of hypothetical reservations and exposes actions (add, remove, clear). When the user adds or removes a booking, the frontend sends the full list to the evaluation endpoint and displays the cumulative result. The store is ephemeral -- refreshing the page clears it, which aligns with the "clear and start fresh" requirement (SCEN-04).

**Primary recommendation:** Build a single `POST /api/scenarios/evaluate` endpoint that accepts a list of hypothetical bookings and returns baseline vs scenario availability for all affected contracts. Use a Zustand store for the hypothetical booking list. Build a new `/scenarios` page with an "add booking" form, a booking list, and a baseline-vs-scenario comparison table.

## Standard Stack

### Core (Already in Project -- No New Dependencies)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| FastAPI | >=0.128.0 | New scenario evaluation endpoint | Already installed |
| zustand | ^5.0.11 | Ephemeral scenario state (hypothetical bookings list) | Already installed, first activation |
| @tanstack/react-query | ^5.90.20 | Mutation for scenario evaluation API | Already installed |
| shadcn/ui | ^3.8.4 | Card, Badge, Table, Button, Select, Input, Label | Already installed |
| lucide-react | ^0.563.0 | Icons (Plus, Trash2, RotateCcw, FlaskConical) | Already installed |
| date-fns | ^4.1.0 | Date formatting in scenario cards | Already installed |
| react-router-dom | ^7.13.0 | New /scenarios route | Already installed |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| python-dateutil | >=2.9.0 | Date math in engine layer | Already in requirements.txt |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand for scenario state | React Context + useReducer | Zustand is already installed and the decided technology; simpler API, no provider wrapper needed |
| Single evaluation endpoint | Multiple preview calls (one per booking) | Single endpoint handles cumulative impact correctly (booking 2 sees the effect of booking 1); N separate calls cannot |
| Server-side evaluation | Client-side point math | Server has the point chart data, engine functions, and DB access for real balances; duplicating this on the client would be massive |
| Ephemeral state (page refresh clears) | localStorage persistence | SCEN-05 (save/name scenarios) is explicitly deferred to v2+; ephemeral is correct for v1.1 |

**Installation:** None needed. All dependencies already present.

## Architecture Patterns

### Recommended Project Structure (new/modified files)
```
backend/
  engine/
    scenario.py              # NEW: compute_scenario_impact() pure function
  api/
    scenarios.py             # NEW: POST /api/scenarios/evaluate endpoint
    schemas.py               # MODIFIED: add scenario request/response schemas
frontend/
  src/
    store/
      useScenarioStore.ts    # NEW: Zustand store for hypothetical bookings
    pages/
      ScenarioPage.tsx        # NEW: scenario workspace page
    components/
      ScenarioBookingForm.tsx  # NEW: form to add hypothetical booking
      ScenarioBookingList.tsx  # NEW: list of added hypothetical bookings
      ScenarioComparison.tsx   # NEW: baseline vs scenario comparison table
    hooks/
      useScenarioEvaluation.ts # NEW: hook to call evaluation endpoint
    types/
      index.ts                # MODIFIED: add scenario types
    components/
      Layout.tsx              # MODIFIED: add Scenarios nav item
    App.tsx                   # MODIFIED: add /scenarios route
tests/
  test_scenario.py           # NEW: engine unit tests
  test_api_scenarios.py      # NEW: endpoint integration tests
```

### Pattern 1: Zustand Scenario Store (First Activation)
**What:** A Zustand store managing an array of hypothetical bookings with add/remove/clear actions.
**When to use:** Any time the user interacts with the scenario workspace.

```typescript
// frontend/src/store/useScenarioStore.ts
import { create } from "zustand";

export interface HypotheticalBooking {
  id: string;               // client-generated UUID for keying
  contract_id: number;
  contract_name: string;
  resort: string;
  resort_name: string;
  room_key: string;
  check_in: string;          // ISO date
  check_out: string;         // ISO date
}

interface ScenarioState {
  bookings: HypotheticalBooking[];
  addBooking: (booking: Omit<HypotheticalBooking, "id">) => void;
  removeBooking: (id: string) => void;
  clearAll: () => void;
}

export const useScenarioStore = create<ScenarioState>()((set) => ({
  bookings: [],
  addBooking: (booking) =>
    set((state) => ({
      bookings: [
        ...state.bookings,
        { ...booking, id: crypto.randomUUID() },
      ],
    })),
  removeBooking: (id) =>
    set((state) => ({
      bookings: state.bookings.filter((b) => b.id !== id),
    })),
  clearAll: () => set({ bookings: [] }),
}));
```

### Pattern 2: Cumulative Scenario Evaluation (Server-Side)
**What:** A pure engine function that applies multiple hypothetical reservations sequentially to compute cumulative impact across all affected contracts.
**When to use:** Every time the scenario booking list changes and the frontend requests re-evaluation.

```python
# backend/engine/scenario.py
from datetime import date
from backend.engine.availability import get_contract_availability
from backend.data.point_charts import calculate_stay_cost


def compute_scenario_impact(
    contracts: list[dict],
    point_balances: list[dict],
    reservations: list[dict],
    hypothetical_bookings: list[dict],
    target_date: date,
) -> dict:
    """
    Compute cumulative impact of multiple hypothetical bookings.

    For each contract, computes:
    - baseline: availability with only real reservations
    - scenario: availability with real + all hypothetical reservations

    Hypothetical bookings are resolved to point costs using calculate_stay_cost(),
    then injected as additional reservations into the availability engine.
    """
    # 1. Resolve each hypothetical booking to a point cost
    resolved_hypotheticals = []
    errors = []
    for hb in hypothetical_bookings:
        cost = calculate_stay_cost(
            hb["resort"], hb["room_key"],
            hb["check_in"], hb["check_out"],
        )
        if cost is None:
            errors.append({
                "resort": hb["resort"],
                "room_key": hb["room_key"],
                "error": "Point chart data not available",
            })
            continue
        resolved_hypotheticals.append({
            "contract_id": hb["contract_id"],
            "check_in": hb["check_in"],
            "check_out": hb["check_out"],
            "points_cost": cost["total_points"],
            "resort": hb["resort"],
            "room_key": hb["room_key"],
            "status": "confirmed",
            "num_nights": cost["num_nights"],
            "nightly_breakdown": cost["nightly_breakdown"],
        })

    # 2. Compute baseline and scenario for each contract
    contract_results = []
    for contract in contracts:
        cid = contract["id"]
        c_balances = [b for b in point_balances if b["contract_id"] == cid]
        c_real_reservations = [r for r in reservations if r["contract_id"] == cid]
        c_hypotheticals = [h for h in resolved_hypotheticals if h["contract_id"] == cid]

        baseline = get_contract_availability(
            contract_id=cid,
            use_year_month=contract["use_year_month"],
            annual_points=contract["annual_points"],
            point_balances=c_balances,
            reservations=c_real_reservations,
            target_date=target_date,
        )

        # Scenario = real reservations + resolved hypotheticals
        scenario_reservations = c_real_reservations + [
            {"check_in": h["check_in"], "points_cost": h["points_cost"],
             "status": "confirmed", "contract_id": cid}
            for h in c_hypotheticals
        ]

        scenario = get_contract_availability(
            contract_id=cid,
            use_year_month=contract["use_year_month"],
            annual_points=contract["annual_points"],
            point_balances=c_balances,
            reservations=scenario_reservations,
            target_date=target_date,
        )

        contract_results.append({
            "contract_id": cid,
            "contract_name": contract.get("name") or contract.get("home_resort"),
            "home_resort": contract.get("home_resort"),
            "baseline": baseline,
            "scenario": scenario,
            "hypothetical_bookings": c_hypotheticals,
        })

    # 3. Compute grand totals
    baseline_total = sum(c["baseline"]["available_points"] for c in contract_results)
    scenario_total = sum(c["scenario"]["available_points"] for c in contract_results)

    return {
        "target_date": target_date.isoformat(),
        "contracts": contract_results,
        "summary": {
            "baseline_available": baseline_total,
            "scenario_available": scenario_total,
            "total_impact": baseline_total - scenario_total,
            "num_hypothetical_bookings": len(resolved_hypotheticals),
        },
        "resolved_bookings": resolved_hypotheticals,
        "errors": errors,
    }
```

### Pattern 3: Evaluation Endpoint
**What:** A single `POST /api/scenarios/evaluate` endpoint that accepts hypothetical bookings and returns baseline vs scenario comparison.
**When to use:** Frontend calls this whenever the scenario booking list changes.

```python
# backend/api/scenarios.py
@router.post("/api/scenarios/evaluate")
async def evaluate_scenario(
    data: ScenarioEvaluateRequest,
    db: AsyncSession = Depends(get_db),
):
    # 1. Load all contracts, balances, reservations from DB
    # 2. Convert ORM -> dicts (same pattern as trip_explorer.py)
    # 3. Call compute_scenario_impact() pure function
    # 4. Return ScenarioEvaluateResponse
    ...
```

### Pattern 4: Side-by-Side Comparison UI
**What:** A table showing baseline vs scenario point balances per contract.
**When to use:** The main output of the scenario page, updates reactively when bookings change.

```
+------------------+----------+----------+--------+
| Contract         | Baseline | Scenario | Impact |
+------------------+----------+----------+--------+
| Polynesian (Feb) | 200 pts  | 145 pts  | -55    |
| Riviera (Oct)    | 160 pts  | 60 pts   | -100   |
+------------------+----------+----------+--------+
| TOTAL            | 360 pts  | 205 pts  | -155   |
+------------------+----------+----------+--------+
```

### Pattern 5: Add Booking Form (Reusing Existing Data)
**What:** A form to add a hypothetical booking to the scenario. Uses existing contract list, resort list, and room types.
**When to use:** Primary interaction for building a scenario.

The form needs:
1. Contract selector (from `useContracts()`)
2. Resort selector (filtered by selected contract's eligibility)
3. Room type selector (from point chart data for selected resort)
4. Check-in / check-out date inputs
5. "Add to Scenario" button

This mirrors the Trip Explorer flow but reversed: instead of "show me what I can afford," the user specifies exactly what they want to book hypothetically.

### Anti-Patterns to Avoid
- **Calling the preview endpoint once per hypothetical booking:** The preview endpoint computes single-booking impact. For cumulative impact, booking #2 must see booking #1's effect. A dedicated scenario evaluation endpoint handles this correctly.
- **Storing hypothetical bookings in the database:** Violates the ephemeral nature of scenarios. SCEN-04 requires "clear without affecting real data." Zustand state + page refresh = natural clear.
- **Computing point costs on the frontend:** Point chart data lives on the server. The server resolves each hypothetical booking to a point cost.
- **Re-evaluating on every keystroke:** Debounce or trigger evaluation only when a booking is added/removed, not while the form is being filled out.
- **Showing scenario page when no contracts exist:** The scenario form requires contracts. Show an empty state with a link to the Contracts page.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cumulative availability calculation | Manual point subtraction across bookings | Existing `get_contract_availability()` with injected hypothetical reservations | Already handles UY boundaries, banking deadlines, all allocation types |
| Stay cost resolution | Manual season/rate lookup | Existing `calculate_stay_cost()` | Already handles cross-season, weekend rates, multi-year stays |
| Resort eligibility filtering | Manual home-resort/resale logic | Existing `get_eligible_resorts()` | Already encodes DVC resale restriction rules |
| Client-side state management | React Context + useReducer boilerplate | Zustand `create()` store | Already installed, simpler API, no provider required |
| UUID generation | Custom counter or timestamp | `crypto.randomUUID()` | Built into all modern browsers, collision-free |
| Form select components | Custom dropdowns | shadcn `<Select>` (already in components/ui/) | Already installed, accessible, consistent design |

**Key insight:** This phase is 80% frontend work. The backend adds one new engine function (`compute_scenario_impact`) that composes existing functions, and one new endpoint. The real complexity is the scenario workspace UI: form with cascading selectors, booking list with remove, comparison table, and clear action.

## Common Pitfalls

### Pitfall 1: Cumulative Impact Order Dependency
**What goes wrong:** Scenario shows impact of each booking independently, not cumulatively. Booking 2 doesn't reflect that booking 1 already consumed points.
**Why it happens:** Calling the single-booking preview endpoint for each hypothetical booking independently.
**How to avoid:** The `compute_scenario_impact()` function injects ALL hypothetical bookings at once into the reservation list before computing scenario availability. The availability engine sees all of them as committed reservations.
**Warning signs:** Scenario shows 200 pts available after booking 1 (cost 50) AND 200 pts available after booking 2 (cost 50), instead of 200 -> 150 -> 100.

### Pitfall 2: Target Date for Availability Calculation
**What goes wrong:** Scenario shows availability for today, but hypothetical bookings might be in different use years (e.g., one booking in March, another in November).
**Why it happens:** `get_contract_availability()` takes a single `target_date` that determines which use year to evaluate. If hypothetical bookings span multiple use years, a single target_date cannot capture the full picture.
**How to avoid:** For v1.1, use today's date as the target_date for the baseline/scenario comparison. This shows "how do my currently available points change if I add these bookings?" The availability engine already correctly assigns reservations to use years based on their check_in dates. Bookings that fall outside the current use year simply don't affect the current availability number. Document this as a known limitation -- multi-year scenario modeling is deferred to v2+ (SCEN-08).
**Warning signs:** User adds a booking in a future use year and sees no impact on the current availability display.

### Pitfall 3: Resort/Room Selector Cascading Dependencies
**What goes wrong:** User selects a contract, then a resort, then changes the contract. The previously selected resort may not be eligible for the new contract.
**Why it happens:** Form state doesn't cascade -- changing the parent selector doesn't reset dependent selectors.
**How to avoid:** When contract changes, clear resort and room selection. When resort changes, clear room selection. Standard cascading form pattern.
**Warning signs:** Form submits with a resort that's not eligible for the selected contract (would fail server-side validation anyway).

### Pitfall 4: Empty Scenario Evaluation
**What goes wrong:** Frontend calls the evaluation endpoint with an empty booking list.
**Why it happens:** User clears all bookings or initial page load.
**How to avoid:** Only call the evaluation endpoint when there are 1+ hypothetical bookings. With 0 bookings, show the baseline data from `useAvailability()` directly (no need for a server call). Show a "no bookings added yet" empty state.
**Warning signs:** Unnecessary API calls, or the comparison shows identical baseline/scenario columns.

### Pitfall 5: Room Key Discovery
**What goes wrong:** The form doesn't know which room types are available for a selected resort.
**Why it happens:** Room types come from point chart data, not from the resorts endpoint. The `/api/point-charts` endpoint returns chart summaries, and `/api/point-charts/{resort}/{year}` returns full chart data including room keys per season.
**How to avoid:** When the user selects a resort, fetch the point chart for the current year and extract available room keys from the chart data. Use the existing `usePointCharts()` pattern or a new hook that fetches the chart and extracts room keys.
**Warning signs:** Room selector is empty or shows wrong room types for the selected resort.

### Pitfall 6: Zustand Store Not Resetting on Navigation
**What goes wrong:** User navigates away from /scenarios and back, expecting a fresh workspace, but old bookings are still there.
**Why it happens:** Zustand stores persist across navigation within an SPA (they're module-level singletons).
**How to avoid:** This is actually the DESIRED behavior -- the scenario persists within a session. The "clear" button (SCEN-04) is the explicit reset mechanism. Page refresh also resets since there's no persistence middleware. Document this in the UI: "Your scenario is saved for this session."
**Warning signs:** None -- this is correct behavior. Only flag if the user expects persistence across page refreshes (which is a v2+ feature, SCEN-05).

## Code Examples

### Scenario Evaluation Request/Response Schemas

```python
# backend/api/schemas.py additions

class HypotheticalBooking(BaseModel):
    contract_id: int
    resort: str
    room_key: str
    check_in: date_type
    check_out: date_type

    @field_validator("check_out")
    @classmethod
    def validate_check_out(cls, v, info):
        check_in = info.data.get("check_in")
        if check_in and v <= check_in:
            raise ValueError("check_out must be after check_in")
        if check_in and (v - check_in).days > 14:
            raise ValueError("Stay cannot exceed 14 nights")
        return v


class ScenarioEvaluateRequest(BaseModel):
    hypothetical_bookings: list[HypotheticalBooking]


class ContractScenarioResult(BaseModel):
    contract_id: int
    contract_name: str
    home_resort: str
    baseline_available: int
    baseline_total: int
    baseline_committed: int
    scenario_available: int
    scenario_total: int
    scenario_committed: int
    impact: int  # baseline_available - scenario_available


class ResolvedBooking(BaseModel):
    contract_id: int
    resort: str
    room_key: str
    check_in: date_type
    check_out: date_type
    points_cost: int
    num_nights: int


class ScenarioEvaluateResponse(BaseModel):
    contracts: list[ContractScenarioResult]
    summary: dict  # baseline_available, scenario_available, total_impact, num_bookings
    resolved_bookings: list[ResolvedBooking]
    errors: list[dict]
```

### Frontend Types

```typescript
// types/index.ts additions

export interface HypotheticalBooking {
  id: string;
  contract_id: number;
  contract_name: string;
  resort: string;
  resort_name: string;
  room_key: string;
  check_in: string;
  check_out: string;
}

export interface ContractScenarioResult {
  contract_id: number;
  contract_name: string;
  home_resort: string;
  baseline_available: number;
  baseline_total: number;
  baseline_committed: number;
  scenario_available: number;
  scenario_total: number;
  scenario_committed: number;
  impact: number;
}

export interface ResolvedBooking {
  contract_id: number;
  resort: string;
  room_key: string;
  check_in: string;
  check_out: string;
  points_cost: number;
  num_nights: number;
}

export interface ScenarioEvaluateResponse {
  contracts: ContractScenarioResult[];
  summary: {
    baseline_available: number;
    scenario_available: number;
    total_impact: number;
    num_hypothetical_bookings: number;
  };
  resolved_bookings: ResolvedBooking[];
  errors: { resort: string; room_key: string; error: string }[];
}
```

### Scenario Evaluation Hook

```typescript
// hooks/useScenarioEvaluation.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ScenarioEvaluateResponse, HypotheticalBooking } from "../types";

export function useScenarioEvaluation(bookings: HypotheticalBooking[]) {
  return useQuery({
    queryKey: ["scenario-evaluate", bookings.map(b => `${b.contract_id}-${b.resort}-${b.room_key}-${b.check_in}`)],
    queryFn: () =>
      api.post<ScenarioEvaluateResponse>("/scenarios/evaluate", {
        hypothetical_bookings: bookings.map(b => ({
          contract_id: b.contract_id,
          resort: b.resort,
          room_key: b.room_key,
          check_in: b.check_in,
          check_out: b.check_out,
        })),
      }),
    enabled: bookings.length > 0,
    staleTime: 30_000,
  });
}
```

### Room Key Discovery Pattern

```typescript
// The existing point chart API provides room keys.
// GET /api/point-charts/{resort}/{year} returns full chart data.
// Extract room keys from chart.seasons[0].rooms keys.

// Hook pattern:
function useRoomKeys(resort: string | null) {
  const year = new Date().getFullYear();
  return useQuery({
    queryKey: ["point-chart-rooms", resort, year],
    queryFn: async () => {
      const chart = await api.get<PointChart>(`/point-charts/${resort}/${year}`);
      // Collect all room keys across all seasons
      const keys = new Set<string>();
      chart.seasons.forEach(s => Object.keys(s.rooms).forEach(k => keys.add(k)));
      return Array.from(keys).sort();
    },
    enabled: !!resort,
  });
}
```

### Scenario Page Layout

```
/scenarios page layout:

+-----------------------------------------------+
| What-If Scenarios                              |
| Model hypothetical bookings and compare impact |
+-----------------------------------------------+
|                                                |
| [Add Hypothetical Booking Form]                |
| Contract: [select] Resort: [select]            |
| Room: [select] Check-in: [date] Out: [date]   |
| [+ Add to Scenario]                            |
|                                                |
+-----------------------------------------------+
|                                                |
| Scenario Bookings (3)              [Clear All] |
| +-------------------------------------------+ |
| | Polynesian - Deluxe Studio Standard        | |
| | Jan 12-15, 2026 (3 nights) - 42 pts   [x] | |
| +-------------------------------------------+ |
| | Riviera - One Bedroom Preferred            | |
| | Mar 5-9, 2026 (4 nights) - 120 pts    [x] | |
| +-------------------------------------------+ |
| | Polynesian - One Bedroom Standard          | |
| | Jun 1-4, 2026 (3 nights) - 78 pts     [x] | |
| +-------------------------------------------+ |
|                                                |
+-----------------------------------------------+
|                                                |
| Comparison: Current Reality vs Scenario        |
| +------------------+----------+----------+---+ |
| | Contract         | Baseline | Scenario | +/-| |
| +------------------+----------+----------+---+ |
| | Polynesian (Feb) | 200 pts  | 80 pts   |-120| |
| | Riviera (Oct)    | 160 pts  | 40 pts   |-120| |
| +------------------+----------+----------+---+ |
| | TOTAL            | 360 pts  | 120 pts  |-240| |
| +------------------+----------+----------+---+ |
|                                                |
+-----------------------------------------------+
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redux for all client state | Zustand for isolated ephemeral stores | 2023+ | Simpler API, no boilerplate, no provider |
| Server sessions for "what-if" state | Client-side state with server computation | SPA pattern | No server cleanup, natural page-refresh reset |
| Full page reload to clear state | In-memory store with `clearAll()` action | SPA pattern | Instant clear, no navigation |
| Multiple independent preview calls | Single bulk evaluation endpoint | This phase | Correct cumulative impact, fewer API calls |

**Deprecated/outdated:**
- None -- all technologies are current and already in use in this project

## Open Questions

1. **Target date for availability: today vs per-booking?**
   - What we know: `get_contract_availability()` evaluates one use year at a time, determined by `target_date`. If hypothetical bookings span different use years, a single target_date shows only one UY's picture.
   - What's unclear: Whether to evaluate availability at today (showing current UY impact) or at each booking's check-in date (showing impact in the UY the booking lands in).
   - Recommendation: Use today's date. This answers "how do my CURRENT points change?" -- the most intuitive question for a planning tool. Bookings in the current UY will reduce available points; bookings in a future UY may not impact current availability but will show in that UY's evaluation. Multi-UY scenario modeling is explicitly deferred (SCEN-08). If this feels limiting, we could add a "target date" selector to the comparison view as a future enhancement.

2. **Should we validate resort eligibility in the scenario endpoint?**
   - What we know: The real reservation endpoint validates that a contract can book at a given resort. The scenario endpoint could skip this for flexibility ("what if I had a direct contract...") or enforce it for accuracy.
   - Recommendation: Enforce eligibility validation. The scenario should model reality accurately. If a resale contract can't book at Riviera, the scenario shouldn't pretend it can. Return an error for ineligible resort/contract combinations.

3. **How many hypothetical bookings to allow?**
   - What we know: Each evaluation requires N availability calculations (where N = number of contracts). More hypothetical bookings don't increase the computation cost significantly (they're just added to the reservation list).
   - Recommendation: Cap at 10 hypothetical bookings. This is generous for planning purposes and prevents UI clutter. Enforce on the frontend (disable "Add" button at cap) rather than the backend.

4. **Should the resolved booking show nightly breakdown?**
   - What we know: The single-booking preview (Phase 5) shows nightly breakdown. The scenario evaluation resolves costs but the primary output is the comparison table.
   - Recommendation: Include `points_cost` and `num_nights` in the resolved bookings list (shown in the booking cards), but don't include full nightly breakdown in the evaluation response. Users who want nightly detail can use Trip Explorer. This keeps the scenario response lean.

## Sources

### Primary (HIGH confidence)
- **Codebase:** `backend/engine/availability.py` -- `get_contract_availability()` and `get_all_contracts_availability()` pure functions
- **Codebase:** `backend/engine/booking_impact.py` -- `compute_booking_impact()` pattern for before/after comparison
- **Codebase:** `backend/data/point_charts.py` -- `calculate_stay_cost()` for resolving hypothetical bookings to point costs
- **Codebase:** `backend/engine/eligibility.py` -- `get_eligible_resorts()` for contract/resort validation
- **Codebase:** `backend/api/trip_explorer.py` -- pattern for loading DB data, converting to dicts, calling engine
- **Codebase:** `backend/api/reservations.py` -- `preview_reservation()` pattern for composing engine functions
- **Codebase:** `frontend/src/hooks/useBookingPreview.ts` -- pattern for POST-based query hook
- **Codebase:** `frontend/src/components/TripExplorerResults.tsx` -- card-based result display pattern
- **Codebase:** `frontend/package.json` -- confirms zustand@^5.0.11 installed
- **Codebase:** `.planning/STATE.md` -- confirms "Zustand for ephemeral scenario state (first activation)"
- [Zustand TypeScript Guide](https://zustand.docs.pmnd.rs/guides/advanced-typescript) -- `create<T>()(...)` curried pattern for TS
- [Zustand GitHub](https://github.com/pmndrs/zustand) -- v5 API reference

### Secondary (MEDIUM confidence)
- [Zustand Getting Started (v5)](https://jsdev.space/howto/zustand5-react/) -- confirmed `create<T>()()` pattern and best practices
- [TkDodo - Working with Zustand](https://tkdodo.eu/blog/working-with-zustand) -- multiple small stores pattern, selector best practices

### Tertiary (LOW confidence)
- None -- all findings verified against codebase and official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all already installed and pattern-verified
- Backend architecture: HIGH -- pure composition of existing tested engine functions
- Zustand store: HIGH -- official docs confirm v5 TypeScript pattern, project already has it installed
- Frontend UI: HIGH -- follows existing patterns (Card, Table, Form) already used throughout app
- Cumulative impact logic: HIGH -- uses same availability engine with injected reservations (same pattern as booking_impact.py)
- Target date handling: MEDIUM -- single target_date works for current UY but multi-UY scenarios are a known limitation (deferred)

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable technologies, no fast-moving dependencies)
