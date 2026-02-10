"""Tests for point chart data loader and cost calculations."""
from datetime import date, timedelta

from backend.data.point_charts import (
    load_point_chart,
    get_available_charts,
    get_season_for_date,
    get_point_cost,
    calculate_stay_cost,
)


class TestLoadPointChart:
    def test_load_polynesian_2026(self):
        """load_point_chart returns valid chart with 6 seasons."""
        chart = load_point_chart("polynesian", 2026)
        assert chart is not None
        assert chart["resort"] == "polynesian"
        assert chart["year"] == 2026
        assert len(chart["seasons"]) >= 6

    def test_load_riviera_2026(self):
        """load_point_chart returns valid Riviera chart."""
        chart = load_point_chart("riviera", 2026)
        assert chart is not None
        assert chart["resort"] == "riviera"
        assert chart["year"] == 2026

    def test_load_nonexistent_chart(self):
        """load_point_chart returns None for missing chart."""
        chart = load_point_chart("nonexistent", 2026)
        assert chart is None


class TestGetAvailableCharts:
    def test_includes_sample_charts(self):
        """get_available_charts includes polynesian and riviera 2026."""
        charts = get_available_charts()
        resorts = [(c["resort"], c["year"]) for c in charts]
        assert ("polynesian", 2026) in resorts
        assert ("riviera", 2026) in resorts

    def test_charts_are_sorted(self):
        """Charts are sorted by resort name then year."""
        charts = get_available_charts()
        keys = [(c["resort"], c["year"]) for c in charts]
        assert keys == sorted(keys)


class TestGetSeasonForDate:
    def test_january_is_adventure(self):
        """January 15 falls in Adventure season."""
        chart = load_point_chart("polynesian", 2026)
        season = get_season_for_date(chart, date(2026, 1, 15))
        assert season is not None
        assert season["name"] == "Adventure"

    def test_july_is_dream(self):
        """July 1 falls in Dream season."""
        chart = load_point_chart("polynesian", 2026)
        season = get_season_for_date(chart, date(2026, 7, 1))
        assert season is not None
        assert season["name"] == "Dream"

    def test_september_is_adventure(self):
        """September (second Adventure range) returns Adventure."""
        chart = load_point_chart("polynesian", 2026)
        season = get_season_for_date(chart, date(2026, 9, 15))
        assert season is not None
        assert season["name"] == "Adventure"

    def test_december_31_is_premier(self):
        """December 31 falls in Premier season."""
        chart = load_point_chart("polynesian", 2026)
        season = get_season_for_date(chart, date(2026, 12, 31))
        assert season is not None
        assert season["name"] == "Premier"


class TestGetPointCost:
    def test_weekday_adventure_standard(self):
        """Weekday in Adventure for deluxe_studio_standard = 14."""
        chart = load_point_chart("polynesian", 2026)
        # Jan 15, 2026 is Thursday (weekday)
        cost = get_point_cost(chart, "deluxe_studio_standard", date(2026, 1, 15))
        assert cost == 14

    def test_weekend_adventure_standard(self):
        """Weekend (Friday) in Adventure for deluxe_studio_standard = 19."""
        chart = load_point_chart("polynesian", 2026)
        # Jan 16, 2026 is Friday (weekend)
        cost = get_point_cost(chart, "deluxe_studio_standard", date(2026, 1, 16))
        assert cost == 19

    def test_saturday_is_weekend(self):
        """Saturday is also weekend pricing."""
        chart = load_point_chart("polynesian", 2026)
        # Jan 17, 2026 is Saturday (weekend)
        cost = get_point_cost(chart, "deluxe_studio_standard", date(2026, 1, 17))
        assert cost == 19

    def test_nonexistent_room_returns_none(self):
        """Nonexistent room key returns None."""
        chart = load_point_chart("polynesian", 2026)
        cost = get_point_cost(chart, "nonexistent_room", date(2026, 1, 15))
        assert cost is None

    def test_riviera_tower_studio(self):
        """Riviera tower_studio_standard room key exists and returns valid cost."""
        chart = load_point_chart("riviera", 2026)
        cost = get_point_cost(chart, "tower_studio_standard", date(2026, 1, 15))
        assert cost is not None
        assert cost > 0

    def test_riviera_tower_studio_preferred(self):
        """Riviera tower_studio_preferred costs more than standard."""
        chart = load_point_chart("riviera", 2026)
        standard = get_point_cost(chart, "tower_studio_standard", date(2026, 1, 15))
        preferred = get_point_cost(chart, "tower_studio_preferred", date(2026, 1, 15))
        assert preferred > standard


class TestCalculateStayCost:
    def test_three_weekday_nights_adventure(self):
        """3 weekday nights in Adventure = 3 x 14 = 42."""
        # Jan 12, 2026 is Monday
        result = calculate_stay_cost(
            "polynesian", "deluxe_studio_standard",
            date(2026, 1, 12), date(2026, 1, 15)
        )
        assert result is not None
        assert result["num_nights"] == 3
        assert result["total_points"] == 42
        assert all(n["points"] == 14 for n in result["nightly_breakdown"])

    def test_stay_spanning_weekday_weekend(self):
        """Stay from Fri-Sun has 2 weekend + 1 weekday nights."""
        # Jan 9, 2026 is Friday
        result = calculate_stay_cost(
            "polynesian", "deluxe_studio_standard",
            date(2026, 1, 9), date(2026, 1, 12)
        )
        assert result is not None
        assert result["num_nights"] == 3
        # Fri=19, Sat=19, Sun=14
        assert result["total_points"] == 52
        assert result["nightly_breakdown"][0]["is_weekend"] is True   # Friday
        assert result["nightly_breakdown"][0]["points"] == 19
        assert result["nightly_breakdown"][1]["is_weekend"] is True   # Saturday
        assert result["nightly_breakdown"][1]["points"] == 19
        assert result["nightly_breakdown"][2]["is_weekend"] is False  # Sunday
        assert result["nightly_breakdown"][2]["points"] == 14

    def test_stay_spanning_two_seasons(self):
        """Stay crossing season boundary has correct per-night seasons."""
        # Jan 31 = Adventure, Feb 1 = Choice
        result = calculate_stay_cost(
            "polynesian", "deluxe_studio_standard",
            date(2026, 1, 30), date(2026, 2, 2)
        )
        assert result is not None
        assert result["num_nights"] == 3
        # Jan 30 (Fri, Adventure weekend) = 19
        assert result["nightly_breakdown"][0]["season"] == "Adventure"
        assert result["nightly_breakdown"][0]["points"] == 19
        # Jan 31 (Sat, Adventure weekend) = 19
        assert result["nightly_breakdown"][1]["season"] == "Adventure"
        assert result["nightly_breakdown"][1]["points"] == 19
        # Feb 1 (Sun, Choice weekday) = 16
        assert result["nightly_breakdown"][2]["season"] == "Choice"
        assert result["nightly_breakdown"][2]["points"] == 16

    def test_nonexistent_chart_returns_none(self):
        """calculate_stay_cost returns None for missing chart."""
        result = calculate_stay_cost(
            "nonexistent", "deluxe_studio_standard",
            date(2026, 1, 12), date(2026, 1, 15)
        )
        assert result is None

    def test_invalid_room_returns_none(self):
        """calculate_stay_cost returns None for invalid room key."""
        result = calculate_stay_cost(
            "polynesian", "nonexistent_room",
            date(2026, 1, 12), date(2026, 1, 15)
        )
        assert result is None

    def test_nightly_breakdown_has_correct_fields(self):
        """Each nightly breakdown entry has all required fields."""
        result = calculate_stay_cost(
            "polynesian", "deluxe_studio_standard",
            date(2026, 1, 12), date(2026, 1, 14)
        )
        assert result is not None
        night = result["nightly_breakdown"][0]
        assert "date" in night
        assert "day_of_week" in night
        assert "season" in night
        assert "is_weekend" in night
        assert "points" in night


class TestDateCoverage:
    """Validate every day of 2026 is covered by exactly one season in each chart."""

    def _validate_full_year_coverage(self, resort_slug: str):
        chart = load_point_chart(resort_slug, 2026)
        assert chart is not None

        current = date(2026, 1, 1)
        end = date(2026, 12, 31)
        uncovered_dates = []
        while current <= end:
            season = get_season_for_date(chart, current)
            if season is None:
                uncovered_dates.append(current.isoformat())
            current += timedelta(days=1)

        assert uncovered_dates == [], f"Uncovered dates: {uncovered_dates}"

    def _validate_no_overlaps(self, resort_slug: str):
        chart = load_point_chart(resort_slug, 2026)
        assert chart is not None

        # Build a mapping of date -> season names
        date_seasons: dict[str, list[str]] = {}
        for season in chart["seasons"]:
            for start_str, end_str in season["date_ranges"]:
                current = date.fromisoformat(start_str)
                end = date.fromisoformat(end_str)
                while current <= end:
                    key = current.isoformat()
                    if key not in date_seasons:
                        date_seasons[key] = []
                    date_seasons[key].append(season["name"])
                    current += timedelta(days=1)

        overlapping = {d: s for d, s in date_seasons.items() if len(s) > 1}
        assert overlapping == {}, f"Overlapping dates: {overlapping}"

    def test_polynesian_full_year_coverage(self):
        """Every day of 2026 is covered in the Polynesian chart."""
        self._validate_full_year_coverage("polynesian")

    def test_polynesian_no_overlaps(self):
        """No date belongs to multiple seasons in the Polynesian chart."""
        self._validate_no_overlaps("polynesian")

    def test_riviera_full_year_coverage(self):
        """Every day of 2026 is covered in the Riviera chart."""
        self._validate_full_year_coverage("riviera")

    def test_riviera_no_overlaps(self):
        """No date belongs to multiple seasons in the Riviera chart."""
        self._validate_no_overlaps("riviera")
