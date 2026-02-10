from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.db.database import get_db
from backend.models.contract import Contract
from backend.models.point_balance import PointBalance
from backend.models.reservation import Reservation
from backend.engine.availability import get_all_contracts_availability

router = APIRouter(tags=["availability"])


@router.get("/api/availability")
async def get_availability(
    target_date: date = Query(..., description="Target date (YYYY-MM-DD) to check availability for"),
    db: AsyncSession = Depends(get_db),
):
    """
    Calculate point availability across all contracts for a target date.

    Returns per-contract breakdown showing:
    - Which use year is active
    - Point balances by allocation type
    - Points committed to reservations in that use year
    - Net available points
    - Banking deadline status

    Plus a summary with grand totals across all contracts.
    """
    # Load all contracts
    result = await db.execute(select(Contract))
    contracts = result.scalars().all()

    # Load all point balances
    result = await db.execute(select(PointBalance))
    all_balances = result.scalars().all()

    # Load all non-cancelled reservations
    result = await db.execute(
        select(Reservation).where(Reservation.status != "cancelled")
    )
    all_reservations = result.scalars().all()

    # Convert ORM objects to dicts for the pure-function engine
    contracts_data = [
        {
            "id": c.id,
            "name": c.name,
            "home_resort": c.home_resort,
            "use_year_month": c.use_year_month,
            "annual_points": c.annual_points,
            "purchase_type": c.purchase_type,
        }
        for c in contracts
    ]

    balances_data = [
        {
            "contract_id": b.contract_id,
            "use_year": b.use_year,
            "allocation_type": b.allocation_type,
            "points": b.points,
        }
        for b in all_balances
    ]

    reservations_data = [
        {
            "contract_id": r.contract_id,
            "check_in": r.check_in,
            "points_cost": r.points_cost,
            "status": r.status,
        }
        for r in all_reservations
    ]

    return get_all_contracts_availability(
        contracts=contracts_data,
        point_balances=balances_data,
        reservations=reservations_data,
        target_date=target_date,
    )
