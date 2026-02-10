import json
from pathlib import Path
from functools import lru_cache
from datetime import date, timedelta

CHARTS_DIR = Path(__file__).parent.parent.parent / "data" / "point_charts"


@lru_cache
def load_point_chart(resort_slug: str, year: int) -> dict | None:
    """Load a point chart from JSON file. Returns None if not found."""
    file_path = CHARTS_DIR / f"{resort_slug}_{year}.json"
    if not file_path.exists():
        return None
    with open(file_path) as f:
        return json.load(f)


def get_available_charts() -> list[dict]:
    """List all available point chart files with resort and year."""
    charts = []
    for f in CHARTS_DIR.glob("*.json"):
        if f.name == "schema.json":
            continue
        parts = f.stem.rsplit("_", 1)  # split on last underscore to get year
        if len(parts) == 2:
            try:
                charts.append({"resort": parts[0], "year": int(parts[1]), "file": f.name})
            except ValueError:
                continue
    return sorted(charts, key=lambda c: (c["resort"], c["year"]))


def get_season_for_date(chart: dict, target_date: date) -> dict | None:
    """Find which season a target date falls into."""
    for season in chart["seasons"]:
        for start_str, end_str in season["date_ranges"]:
            start = date.fromisoformat(start_str)
            end = date.fromisoformat(end_str)
            if start <= target_date <= end:
                return season
    return None


def get_point_cost(chart: dict, room_key: str, target_date: date) -> int | None:
    """Get the point cost for a specific room on a specific date.

    Args:
        chart: loaded point chart dict
        room_key: composite key like 'deluxe_studio_lake'
        target_date: the date to look up

    Returns:
        Point cost (integer) or None if room/date not found.
    """
    season = get_season_for_date(chart, target_date)
    if season is None:
        return None
    room = season["rooms"].get(room_key)
    if room is None:
        return None
    # Friday (4) and Saturday (5) are weekend
    is_weekend = target_date.weekday() in (4, 5)
    return room["weekend"] if is_weekend else room["weekday"]


def calculate_stay_cost(resort_slug: str, room_key: str, check_in: date, check_out: date) -> dict | None:
    """Calculate total point cost for a stay.

    Returns dict with per-night breakdown and total, or None if chart not found.
    """
    year = check_in.year
    chart = load_point_chart(resort_slug, year)
    if chart is None:
        return None

    nights = []
    total = 0
    current = check_in
    while current < check_out:
        # Try current year's chart first
        current_chart = load_point_chart(resort_slug, current.year)
        if current_chart is None:
            current_chart = chart

        cost = get_point_cost(current_chart, room_key, current)
        if cost is None:
            return None  # missing data

        season = get_season_for_date(current_chart, current)
        nights.append({
            "date": current.isoformat(),
            "day_of_week": current.strftime("%A"),
            "season": season["name"] if season else "Unknown",
            "is_weekend": current.weekday() in (4, 5),
            "points": cost
        })
        total += cost
        current += timedelta(days=1)

    return {
        "resort": resort_slug,
        "room": room_key,
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "num_nights": len(nights),
        "total_points": total,
        "nightly_breakdown": nights
    }
