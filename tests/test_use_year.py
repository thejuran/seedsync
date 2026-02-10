from datetime import date
from backend.engine.use_year import get_use_year_start, get_use_year_end, get_banking_deadline


def test_june_use_year_start():
    """June use year starts June 1."""
    assert get_use_year_start(6, 2026) == date(2026, 6, 1)


def test_june_use_year_end():
    """June use year ends May 31 of the following year."""
    assert get_use_year_end(6, 2026) == date(2027, 5, 31)


def test_june_banking_deadline():
    """June use year banking deadline is end of January (8 months into June UY)."""
    assert get_banking_deadline(6, 2026) == date(2027, 1, 31)


def test_december_use_year_start():
    """December use year starts December 1."""
    assert get_use_year_start(12, 2025) == date(2025, 12, 1)


def test_december_use_year_end():
    """December use year ends November 30 of the following year."""
    assert get_use_year_end(12, 2025) == date(2026, 11, 30)


def test_december_banking_deadline():
    """December use year banking deadline is end of July (8 months into Dec UY)."""
    assert get_banking_deadline(12, 2025) == date(2026, 7, 31)


def test_february_use_year_start():
    """February use year starts February 1."""
    assert get_use_year_start(2, 2026) == date(2026, 2, 1)


def test_february_use_year_end():
    """February use year ends January 31 of the following year."""
    assert get_use_year_end(2, 2026) == date(2027, 1, 31)


def test_february_banking_deadline():
    """February use year banking deadline is end of September (8 months into Feb UY)."""
    assert get_banking_deadline(2, 2026) == date(2026, 9, 30)
