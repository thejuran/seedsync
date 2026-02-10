from datetime import date
from dateutil.relativedelta import relativedelta

USE_YEAR_MONTHS = [2, 3, 4, 6, 8, 9, 10, 12]

def get_use_year_start(use_year_month: int, year: int) -> date:
    """Return the start date of a use year (1st of use_year_month in given year)."""
    return date(year, use_year_month, 1)

def get_use_year_end(use_year_month: int, year: int) -> date:
    """Return the end date of a use year (last day before next UY starts)."""
    start = get_use_year_start(use_year_month, year)
    return start + relativedelta(years=1) - relativedelta(days=1)

def get_banking_deadline(use_year_month: int, year: int) -> date:
    """Banking deadline is 8 months into the use year."""
    start = get_use_year_start(use_year_month, year)
    # Last day of the 8th month of the use year
    eight_months = start + relativedelta(months=8)
    return eight_months - relativedelta(days=1)
