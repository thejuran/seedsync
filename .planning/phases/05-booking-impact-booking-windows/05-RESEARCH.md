# Phase 5: Booking Impact + Booking Windows - Research

**Researched:** 2026-02-10
**Domain:** DVC point impact calculation, booking window date math, dashboard alerts, Trip Explorer enhancement
**Confidence:** HIGH

## Summary

Phase 5 adds two complementary features to the existing Trip Explorer and Dashboard: (1) a booking impact preview showing before/after point balances when considering a reservation, and (2) booking window date calculations showing when 11-month and 7-month windows open. Both features compose existing pure-function engines with minimal new computation logic.

The booking impact preview is architecturally a "dry run" of the existing availability engine. The `get_contract_availability()` and `calculate_stay_cost()` functions are already pure (no DB access), so the preview simply runs them with a proposed reservation appended to the committed list and diffs the results. A new `POST /api/reservations/preview` endpoint wraps this logic, and the frontend displays it as an expandable detail row on each Trip Explorer result card.

Booking window calculations are trivial date arithmetic (`check_in - relativedelta(months=11)` and `check_in - relativedelta(months=7)`) using `python-dateutil` already in dependencies. The key complexity is an end-of-month edge case where DVC's actual behavior (roll forward to 1st of next month) differs from `relativedelta`'s behavior (clip to last day of current month). This difference is at most 1-2 days and should be handled with a custom function that detects the clip and rolls forward. Dashboard alerts for upcoming booking windows extend the existing `UrgentAlerts` component pattern.

**Primary recommendation:** Build a single `POST /api/reservations/preview` endpoint that returns before/after point balances plus nightly breakdown plus booking window dates. Add a `compute_booking_windows()` pure function to the engine layer. Frontend work is an expandable detail panel on Trip Explorer result cards and a new booking window alert type in the dashboard.

## Standard Stack

### Core (Already in Project -- No New Dependencies)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| FastAPI | >=0.128.0 | New preview endpoint | Already installed |
| python-dateutil | >=2.9.0 | `relativedelta` for booking window math | Already in requirements.txt |
| @tanstack/react-query | ^5.90.20 | Mutation hook for preview API call | Already installed |
| date-fns | ^4.1.0 | Frontend date formatting | Already installed |
| lucide-react | ^0.563.0 | Alert icons (CalendarCheck, CalendarClock) | Already installed |
| shadcn/ui | ^3.8.4 | Card, Badge, Table, Dialog components | Already installed |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | ^5.0.11 | Ephemeral scenario state (future Phase 6) | NOT needed this phase -- preview is stateless |
| Collapsible (shadcn) | N/A | Expandable Trip Explorer detail rows | May need `npx shadcn@latest add collapsible` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Server-side preview endpoint | Client-side calculation | Server keeps logic centralized; banking warning requires DB access for borrowing policy; server is correct |
| Expandable card rows | Modal dialog for preview | Expandable keeps context visible; dialog hides the list; expandable is better UX for comparison |
| Custom booking window function | Raw `relativedelta` only | `relativedelta` clips end-of-month wrong for DVC; custom function adds 1-2 day correction |

**Installation (if Collapsible not yet added):**
```bash
cd frontend && npx shadcn@latest add collapsible
```

No pip installs needed -- all Python deps already present.

## Architecture Patterns

### Recommended Project Structure (new/modified files)
```
backend/
  engine/
    booking_impact.py       # NEW: preview logic (pure function)
    booking_windows.py      # NEW: window date calculations (pure function)
  api/
    reservations.py         # MODIFIED: add POST /api/reservations/preview
    schemas.py              # MODIFIED: add preview request/response schemas
frontend/
  src/
    components/
      BookingImpactPanel.tsx    # NEW: expandable before/after panel
      BookingWindowBadges.tsx   # NEW: 11-mo/7-mo window date badges
      UrgentAlerts.tsx          # MODIFIED: add booking window alert type
      TripExplorerResults.tsx   # MODIFIED: expandable rows with impact + windows
    hooks/
      useBookingPreview.ts      # NEW: mutation hook for preview API
    types/
      index.ts                  # MODIFIED: add preview + window types
tests/
  test_booking_impact.py        # NEW: engine unit tests
  test_booking_windows.py       # NEW: window calculation unit tests
  test_api_reservations.py      # MODIFIED: add preview endpoint tests
```

### Pattern 1: Booking Impact as Availability Diff (Pure Function)
**What:** Compute "before" availability, inject proposed reservation, compute "after" availability, diff them.
**When to use:** Any time the user wants to see how a proposed booking affects their points.

```python
# backend/engine/booking_impact.py
from datetime import date
from backend.engine.availability import get_contract_availability
from backend.data.point_charts import calculate_stay_cost


def compute_booking_impact(
    contract: dict,
    point_balances: list[dict],
    reservations: list[dict],
    proposed_resort: str,
    proposed_room_key: str,
    proposed_check_in: date,
    proposed_check_out: date,
) -> dict:
    """
    Compute before/after point impact of a proposed booking.
    Pure function -- no DB access.
    """
    # "Before" state
    before = get_contract_availability(
        contract_id=contract["id"],
        use_year_month=contract["use_year_month"],
        annual_points=contract["annual_points"],
        point_balances=[b for b in point_balances if b["contract_id"] == contract["id"]],
        reservations=[r for r in reservations if r["contract_id"] == contract["id"]],
        target_date=proposed_check_in,
    )

    # Calculate stay cost (nightly breakdown)
    stay_cost = calculate_stay_cost(
        proposed_resort, proposed_room_key,
        proposed_check_in, proposed_check_out,
    )
    if stay_cost is None:
        return {"error": "Could not calculate stay cost"}

    # "After" state: add proposed reservation to committed list
    proposed_reservation = {
        "check_in": proposed_check_in,
        "points_cost": stay_cost["total_points"],
        "status": "confirmed",
        "contract_id": contract["id"],
    }
    after_reservations = [
        r for r in reservations if r["contract_id"] == contract["id"]
    ] + [proposed_reservation]

    after = get_contract_availability(
        contract_id=contract["id"],
        use_year_month=contract["use_year_month"],
        annual_points=contract["annual_points"],
        point_balances=[b for b in point_balances if b["contract_id"] == contract["id"]],
        reservations=after_reservations,
        target_date=proposed_check_in,
    )

    return {
        "before": before,
        "after": after,
        "stay_cost": stay_cost,
        "points_delta": stay_cost["total_points"],
    }
```

### Pattern 2: Booking Window Calculation with End-of-Month Correction
**What:** Calculate when 11-month and 7-month booking windows open, with DVC-correct end-of-month handling.
**When to use:** Any Trip Explorer result or reservation preview.

```python
# backend/engine/booking_windows.py
from datetime import date
from dateutil.relativedelta import relativedelta
import calendar


def _dvc_subtract_months(check_in: date, months: int) -> date:
    """
    Subtract months from check_in using DVC's booking window rule.

    DVC rule: booking window opens on the same day-of-month, N months prior.
    If that day doesn't exist in the target month, the window opens on the
    1st of the NEXT month (NOT the last day of the target month).

    Example: check_in Sep 30, 7 months back:
      - relativedelta gives Feb 28 (clips backward)
      - DVC rule gives Mar 1 (rolls forward)
    """
    naive = check_in - relativedelta(months=months)
    # If relativedelta clipped the day, DVC rolls forward to 1st of next month
    if naive.day < check_in.day:
        # The target month didn't have enough days
        # Roll to 1st of next month
        if naive.month == 12:
            return date(naive.year + 1, 1, 1)
        else:
            return date(naive.year, naive.month + 1, 1)
    return naive


def compute_booking_windows(check_in: date, is_home_resort: bool) -> dict:
    """
    Compute booking window open dates for a given check-in date.

    Returns 11-month (home resort) and 7-month (any resort) window dates.
    """
    home_window_date = _dvc_subtract_months(check_in, 11)
    any_resort_window_date = _dvc_subtract_months(check_in, 7)
    today = date.today()

    return {
        "home_resort_window": home_window_date.isoformat(),
        "home_resort_window_open": today >= home_window_date,
        "days_until_home_window": (home_window_date - today).days,
        "any_resort_window": any_resort_window_date.isoformat(),
        "any_resort_window_open": today >= any_resort_window_date,
        "days_until_any_window": (any_resort_window_date - today).days,
        "is_home_resort": is_home_resort,
    }
```

### Pattern 3: Preview Endpoint Composing Engine Functions
**What:** A single `POST /api/reservations/preview` endpoint that loads data from DB, calls pure engine functions, returns impact + windows.
**When to use:** When user clicks "expand" on a Trip Explorer result.

```python
# Addition to backend/api/reservations.py
@router.post("/api/reservations/preview")
async def preview_reservation(
    data: ReservationPreviewRequest,
    db: AsyncSession = Depends(get_db),
):
    # Load contract, balances, reservations from DB
    # Call compute_booking_impact() -- pure function
    # Call compute_booking_windows() -- pure function
    # Compute banking warning -- check if current UY points could still be banked
    # Return combined result
    ...
```

### Pattern 4: Expandable Trip Explorer Result Card
**What:** Each Trip Explorer result becomes expandable. Click/chevron reveals booking impact + window dates.
**When to use:** All Trip Explorer results.

```tsx
// Frontend pattern: expandable card with lazy-loaded preview data
function TripExplorerResultCard({ option }: { option: TripExplorerOption }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only fetch preview when expanded (lazy loading)
  const { data: preview, isLoading } = useBookingPreview(
    isExpanded ? {
      contract_id: option.contract_id,
      resort: option.resort,
      room_key: option.room_key,
      check_in: /* from parent */,
      check_out: /* from parent */,
    } : null
  );

  return (
    <Card>
      <CardContent onClick={() => setIsExpanded(!isExpanded)}>
        {/* Existing card content */}
        <ChevronDown className={isExpanded ? "rotate-180" : ""} />
      </CardContent>
      {isExpanded && (
        <div className="border-t px-4 py-3">
          {isLoading ? <Spinner /> : (
            <>
              <BookingImpactPanel preview={preview} />
              <BookingWindowBadges windows={preview?.booking_windows} />
            </>
          )}
        </div>
      )}
    </Card>
  );
}
```

### Pattern 5: Banking Warning Logic
**What:** Detect when a proposed booking uses points from the current use year that are still eligible for banking (banking deadline hasn't passed).
**When to use:** Part of the booking impact computation.

```python
def compute_banking_warning(
    contract: dict,
    before_availability: dict,
    points_cost: int,
    borrowing_limit_pct: int,
) -> dict | None:
    """
    Check if the proposed booking would use points that could still be banked.

    Warning fires when:
    1. Banking deadline for the active use year has NOT passed
    2. The proposed booking reduces available points below what could theoretically
       be banked (i.e., uses current-year allocation points)
    3. Current-year points are being consumed (not banked or borrowed points)
    """
    if before_availability["banking_deadline_passed"]:
        return None  # No warning -- deadline already passed

    # Points that could still be banked = current allocation minus committed
    current_alloc = before_availability["balances"].get("current", 0)
    bankable = max(0, current_alloc - before_availability["committed_points"])

    if bankable <= 0:
        return None  # Nothing left to bank anyway

    if points_cost > (before_availability["available_points"] - bankable):
        # This booking dips into bankable points
        return {
            "warning": True,
            "bankable_points": bankable,
            "banking_deadline": before_availability["banking_deadline"],
            "days_until_deadline": before_availability["days_until_banking_deadline"],
            "message": (
                f"This booking would use points that are still eligible for banking. "
                f"Banking deadline: {before_availability['banking_deadline']} "
                f"({before_availability['days_until_banking_deadline']} days away). "
                f"Up to {bankable} points could still be banked."
            ),
        }

    return None  # Booking doesn't touch bankable points
```

### Pattern 6: Dashboard Booking Window Alerts
**What:** Extend the existing `UrgentAlerts` component to show upcoming booking windows alongside banking deadlines and point expirations.
**When to use:** Dashboard page, alongside existing alert types.

The existing dashboard already fetches availability and reservations. Booking window alerts need the list of confirmed/pending reservations and compute window dates for each. A new backend endpoint `GET /api/booking-windows/upcoming` returns window openings in the next 30 days.

```python
# New endpoint: GET /api/booking-windows/upcoming
# Fetches all confirmed + pending reservations with future check-in dates
# Computes booking windows for each
# Returns only those where the window opens within the next N days
# Includes contract name, resort, check-in date, window type (home/any), window date
```

### Anti-Patterns to Avoid
- **Computing preview on the frontend:** The banking warning requires knowing the borrowing policy from the DB. Server-side preview keeps all logic centralized.
- **Fetching preview for all Trip Explorer results eagerly:** Could be dozens of results. Use lazy loading -- only fetch when user expands a card.
- **Storing booking window dates in the database:** These are pure functions of check-in date. Compute on the fly; never persist.
- **Using `relativedelta` directly for DVC window dates without correction:** It clips end-of-month backward; DVC rolls forward. The difference is 1-2 days but matters for "window opens tomorrow" alerts.
- **Adding a `planned` reservation status this phase:** That's over-engineering. Dashboard alerts can be computed from existing confirmed/pending reservations. A `planned` status is a Phase 6 concern if needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Point availability calculation | Custom subtraction logic | Existing `get_contract_availability()` | Already tested, handles UY boundaries, all allocation types |
| Nightly cost breakdown | Manual season lookup | Existing `calculate_stay_cost()` | Already handles cross-season stays, weekend detection |
| Month subtraction with day clipping | Manual day counting | `dateutil.relativedelta` + DVC correction wrapper | Edge cases in month lengths are error-prone |
| Expandable UI components | Custom show/hide state | shadcn Collapsible or simple state toggle | Accessible, animated, consistent with design system |
| Date formatting on frontend | Manual string manipulation | `date-fns` (already installed) | Handles locales, relative dates, formatting |

**Key insight:** This phase is almost entirely composition of existing engine functions. The booking impact preview is `get_contract_availability(before) + calculate_stay_cost() + get_contract_availability(after)`. Booking windows are one new pure function. The real work is frontend -- making the expandable UI, wiring the lazy-loaded preview, and integrating window alerts.

## Common Pitfalls

### Pitfall 1: Incorrect Banking Warning Logic
**What goes wrong:** Warning fires when the booking actually uses banked or borrowed points (not current-year allocation), or doesn't fire when it should.
**Why it happens:** The availability engine sums all allocation types into `total_points` and doesn't track which allocation type is consumed first. DVC's actual deduction order is undefined in this app.
**How to avoid:** The banking warning should be conservative. If the banking deadline hasn't passed AND the booking cost exceeds the non-bankable portion of available points (banked + borrowed + holding), then warn. This means: if `points_cost > (available_points - current_year_balance)` is false (i.e., the cost can be covered entirely by non-current-year points), no warning needed.
**Warning signs:** Users getting spurious banking warnings when they have plenty of banked points covering the stay.

### Pitfall 2: End-of-Month Booking Window Dates
**What goes wrong:** App shows booking window opens Feb 28 when DVC says March 1 for check-in dates like Sep 29-30.
**Why it happens:** `dateutil.relativedelta` clips to the last day of the target month. DVC's rule is to roll forward to the 1st of the next month when the day doesn't exist.
**How to avoid:** Use the `_dvc_subtract_months()` wrapper that detects day clipping (output day < input day) and rolls forward. Write explicit test cases for: Sep 29, Sep 30, Oct 31, Mar 31 check-ins.
**Warning signs:** Booking window dates off by 1-2 days vs. Disney's online calculator.

### Pitfall 3: Lazy Loading Race Conditions
**What goes wrong:** User rapidly expands/collapses Trip Explorer cards; stale preview data appears in wrong card.
**Why it happens:** React Query mutations or queries fire for one card, user expands another, results arrive out of order.
**How to avoid:** Use `queryKey` that includes `contract_id + resort + room_key` so each card has its own cache entry. Use `enabled: isExpanded` to cancel queries when collapsed.
**Warning signs:** Preview data showing wrong resort/room combination.

### Pitfall 4: Trip Explorer Results Missing Check-In/Check-Out in Response
**What goes wrong:** Frontend can't compute booking windows or call preview endpoint because check_in/check_out aren't in the individual option objects.
**Why it happens:** The current `TripExplorerOption` type doesn't include check_in/check_out -- they're only on the parent `TripExplorerResponse`. The frontend needs to pass them from the parent context.
**How to avoid:** Either (a) thread check_in/check_out as props from the parent `TripExplorerResults` down to each card, or (b) add them to each option in the backend response. Option (a) is simpler (no API change).
**Warning signs:** Undefined check_in when calling preview API from card component.

### Pitfall 5: Home Resort Detection for Booking Windows
**What goes wrong:** Booking window shows 11-month window for a resort that isn't the user's home resort.
**Why it happens:** Each Trip Explorer result already includes `contract_id`, which maps to a contract with `home_resort`. The window calculation needs to compare the result's `resort` slug with the contract's `home_resort` to determine if it's an 11-month or 7-month window.
**How to avoid:** The preview endpoint receives `contract_id` and `resort`. Load the contract, compare `contract.home_resort == resort` to set `is_home_resort`. Pass this to `compute_booking_windows()`.
**Warning signs:** All results showing 11-month window regardless of resort.

### Pitfall 6: Dashboard Alert Overload
**What goes wrong:** Dashboard shows dozens of booking window alerts for all future reservations.
**Why it happens:** Every reservation has two booking windows. If the user has 5 reservations, that's 10 potential alerts.
**How to avoid:** Filter to only show windows opening in the next 30 days (configurable). Sort by soonest opening. Cap at 5 alerts. Only show windows that haven't opened yet.
**Warning signs:** Urgent alerts section scrolls forever, pushing banking/expiration alerts out of view.

## Code Examples

### Preview API Request/Response Schema

```python
# backend/api/schemas.py additions

class ReservationPreviewRequest(BaseModel):
    contract_id: int
    resort: str
    room_key: str
    check_in: date_type
    check_out: date_type

class BookingWindowInfo(BaseModel):
    home_resort_window: str
    home_resort_window_open: bool
    days_until_home_window: int
    any_resort_window: str
    any_resort_window_open: bool
    days_until_any_window: int
    is_home_resort: bool

class BankingWarning(BaseModel):
    warning: bool
    bankable_points: int
    banking_deadline: str
    days_until_deadline: int
    message: str

class AvailabilitySnapshot(BaseModel):
    total_points: int
    committed_points: int
    available_points: int
    balances: dict  # {allocation_type: points}

class ReservationPreviewResponse(BaseModel):
    before: AvailabilitySnapshot
    after: AvailabilitySnapshot
    points_delta: int
    nightly_breakdown: list[NightlyCost]  # reuse existing schema
    total_points: int
    num_nights: int
    booking_windows: BookingWindowInfo
    banking_warning: BankingWarning | None
```

### Frontend Types

```typescript
// types/index.ts additions

export interface BookingWindowInfo {
  home_resort_window: string;
  home_resort_window_open: boolean;
  days_until_home_window: number;
  any_resort_window: string;
  any_resort_window_open: boolean;
  days_until_any_window: number;
  is_home_resort: boolean;
}

export interface BankingWarning {
  warning: boolean;
  bankable_points: number;
  banking_deadline: string;
  days_until_deadline: number;
  message: string;
}

export interface AvailabilitySnapshot {
  total_points: number;
  committed_points: number;
  available_points: number;
  balances: Record<string, number>;
}

export interface ReservationPreview {
  before: AvailabilitySnapshot;
  after: AvailabilitySnapshot;
  points_delta: number;
  nightly_breakdown: NightlyCost[];
  total_points: number;
  num_nights: number;
  booking_windows: BookingWindowInfo;
  banking_warning: BankingWarning | null;
}
```

### Preview Hook (Lazy-Loaded)

```typescript
// hooks/useBookingPreview.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ReservationPreview } from "../types";

interface PreviewRequest {
  contract_id: number;
  resort: string;
  room_key: string;
  check_in: string;
  check_out: string;
}

export function useBookingPreview(request: PreviewRequest | null) {
  return useQuery({
    queryKey: ["booking-preview", request],
    queryFn: () =>
      api.post<ReservationPreview>("/reservations/preview", request),
    enabled: !!request,
    staleTime: 30_000,  // cache for 30s to avoid re-fetching on rapid expand/collapse
  });
}
```

### Booking Window Engine Tests (Critical Edge Cases)

```python
# tests/test_booking_windows.py
from datetime import date
from backend.engine.booking_windows import _dvc_subtract_months, compute_booking_windows

def test_standard_11_month_window():
    """Standard case: March 15 check-in -> April 15 previous year."""
    result = _dvc_subtract_months(date(2026, 3, 15), 11)
    assert result == date(2025, 4, 15)

def test_standard_7_month_window():
    """Standard case: March 15 check-in -> August 15 previous year."""
    result = _dvc_subtract_months(date(2026, 3, 15), 7)
    assert result == date(2025, 8, 15)

def test_end_of_month_sept30_rolls_forward():
    """DVC rule: Sept 30 - 7 months = March 1 (NOT Feb 28)."""
    result = _dvc_subtract_months(date(2026, 9, 30), 7)
    assert result == date(2026, 3, 1)  # NOT Feb 28

def test_end_of_month_sept29_non_leap():
    """DVC rule: Sept 29 - 7 months = March 1 in non-leap year (NOT Feb 28)."""
    result = _dvc_subtract_months(date(2026, 9, 29), 7)
    assert result == date(2026, 3, 1)  # 2026 is not a leap year

def test_end_of_month_sept29_leap_year():
    """Leap year: Sept 29 - 7 months = Feb 29 (day exists)."""
    result = _dvc_subtract_months(date(2028, 9, 29), 7)
    assert result == date(2028, 2, 29)  # 2028 IS a leap year

def test_end_of_month_oct31():
    """Oct 31 - 7 months = March 31 (both have 31 days, no clipping)."""
    result = _dvc_subtract_months(date(2026, 10, 31), 7)
    assert result == date(2026, 3, 31)

def test_end_of_month_jan31_11_months():
    """Jan 31 - 11 months = March 1 (NOT Feb 28)."""
    result = _dvc_subtract_months(date(2026, 1, 31), 11)
    assert result == date(2025, 3, 1)  # Feb doesn't have 31 days
```

### Dashboard Booking Window Alert Component

```tsx
// Extension to UrgentAlerts.tsx pattern
interface BookingWindowAlert {
  contract_name: string;
  resort_name: string;
  check_in: string;
  window_type: "home_resort" | "any_resort";
  window_date: string;
  days_until_open: number;
}

// Renders as:
// CalendarCheck icon: "Poly @ Beach Club: 11-month window opens in 5 days (Feb 15)"
// CalendarClock icon: "Riviera @ Polynesian: 7-month window opens Mar 1"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate "preview" and "book" pages | Inline expandable previews in search results | Modern SPA pattern | Single-page flow, no context switch |
| Server computes everything upfront | Lazy-load detail data on expand | React Query + enabled flag | Fast initial load, detail on demand |
| Client-side date subtraction | Server-side with DVC-specific edge case handling | DVC community knowledge | Correct window dates for end-of-month check-ins |

**Deprecated/outdated:**
- None for this phase -- all technologies are current and already in use

## Open Questions

1. **Banking warning: which points get consumed first?**
   - What we know: DVC doesn't enforce a strict deduction order (current vs banked vs borrowed). The app tracks allocation types but the availability engine sums them.
   - What's unclear: Should the warning assume worst-case (current-year points consumed first, maximizing banking loss) or best-case?
   - Recommendation: Warn if the booking COULD consume bankable points (i.e., total cost exceeds non-current-year balance). This is conservative but appropriate for a planning tool. The warning message should say "could" not "will."

2. **Dashboard alerts: which reservations get booking window alerts?**
   - What we know: The dashboard currently shows banking deadline and point expiration alerts. Booking window alerts should show windows opening soon for existing reservations.
   - What's unclear: Should we alert on confirmed reservations (window already opened, user already booked) or only pending/future ones?
   - Recommendation: Alert on reservations where the booking window has NOT yet opened AND opens within 30 days. Already-open windows are not actionable. Only show for confirmed and pending reservations with future check-in dates.

3. **Should the preview endpoint also return booking windows?**
   - What we know: IMPT-04 and BKWN-03 both relate to Trip Explorer results. Bundling impact + windows in one response is efficient.
   - What's unclear: Whether the booking window data should be in the preview response or a separate call.
   - Recommendation: Bundle them. One API call returns impact + windows. The preview endpoint already has all the data needed (contract, resort, check_in). This avoids N+1 API calls.

4. **Collapsible component: shadcn or custom?**
   - What we know: shadcn has a Collapsible primitive from Radix UI. The project already uses shadcn for Card, Badge, Table, Dialog, etc.
   - What's unclear: Whether Collapsible is already installed or needs adding.
   - Recommendation: Check `components/ui/` for collapsible.tsx. If absent, install via `npx shadcn@latest add collapsible`. If that adds unwanted complexity, a simple `{isExpanded && <div>...</div>}` with state toggle works fine.

## Sources

### Primary (HIGH confidence)
- **Codebase:** `backend/engine/availability.py` -- pure-function availability engine, already tested
- **Codebase:** `backend/engine/trip_explorer.py` -- pure-function trip finder, composes availability + cost
- **Codebase:** `backend/data/point_charts.py` -- `calculate_stay_cost()` with nightly breakdown
- **Codebase:** `backend/engine/use_year.py` -- banking deadline calculations, use year boundaries
- **Codebase:** `frontend/src/components/UrgentAlerts.tsx` -- existing alert pattern
- **Codebase:** `frontend/src/components/TripExplorerResults.tsx` -- current card grid layout
- **Codebase:** `.planning/research/FEATURES.md` -- v1.1 feature research with implementation notes
- [DVC Official FAQ - Booking Window](https://disneyvacationclub.disney.go.com/faq/resort-reservations/booking-window/) -- 11-month and 7-month rules
- [DVC Official FAQ - Home Resort Priority](https://disneyvacationclub.disney.go.com/faq/resort-reservations/home-resort-priority/) -- home resort vs non-home

### Secondary (MEDIUM confidence)
- [DVC Shop - 7 and 11 Month Windows Explained](https://dvcshop.com/the-7-and-11-month-booking-windows-explained/) -- detailed booking window rules
- [DVC Field Guide - Key Dates Calculator](https://dvcfieldguide.com/blog/key-membership-dateshow-to-calculate) -- date calculation methodology
- [Diservations - DVC Date Calculator](https://diservations.com/calculator/) -- confirms Feb 28 for Sep 30 check-in at 7 months

### Tertiary (LOW confidence -- needs validation)
- [DISboards Forum - 7 Month Booking Calculator](https://www.disboards.com/threads/dvc-7-month-booking-calculator.3916248/) -- end-of-month edge case: "cannot reserve Sep 29 or 30 until March 1" (moderator claim, not verified with Disney officially). The roll-forward-to-1st rule conflicts with the Diservations calculator (which shows Feb 28). **Recommendation:** Implement the roll-forward rule with a comment noting the ambiguity. The 1-2 day difference is conservative (tells user window opens slightly later than it might), which is safer for a planning tool.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all libraries already in project
- Booking impact architecture: HIGH -- pure composition of existing tested engine functions
- Booking window date math: HIGH for standard cases, MEDIUM for end-of-month edge cases (DVC's exact rule is not officially documented for edge cases; community sources provide conflicting info)
- Frontend patterns: HIGH -- extends existing Card/Badge/Alert patterns with lazy loading
- Banking warning logic: MEDIUM -- DVC doesn't define deduction order; our warning is necessarily conservative
- Dashboard alert integration: HIGH -- follows established UrgentAlerts pattern

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable technologies, DVC booking rules don't change)
