from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend.db.database import get_db
from backend.models.contract import Contract
from backend.models.reservation import Reservation
from backend.api.schemas import ReservationCreate, ReservationUpdate, ReservationResponse
from backend.engine.eligibility import get_eligible_resorts

router = APIRouter(tags=["reservations"])


@router.get("/api/reservations", response_model=list[ReservationResponse])
async def list_reservations(
    contract_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    upcoming: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """List all reservations with optional filters."""
    query = select(Reservation)

    if contract_id is not None:
        query = query.where(Reservation.contract_id == contract_id)
    if status_filter is not None:
        query = query.where(Reservation.status == status_filter)
    if upcoming:
        query = query.where(Reservation.check_in >= date.today())

    query = query.order_by(Reservation.check_in.asc())
    result = await db.execute(query)
    return result.scalars().all()


@router.get(
    "/api/contracts/{contract_id}/reservations",
    response_model=list[ReservationResponse],
)
async def list_contract_reservations(
    contract_id: int, db: AsyncSession = Depends(get_db)
):
    """List reservations for a specific contract."""
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Contract not found")

    result = await db.execute(
        select(Reservation)
        .where(Reservation.contract_id == contract_id)
        .order_by(Reservation.check_in.asc())
    )
    return result.scalars().all()


@router.get("/api/reservations/{reservation_id}", response_model=ReservationResponse)
async def get_reservation(reservation_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single reservation."""
    result = await db.execute(
        select(Reservation).where(Reservation.id == reservation_id)
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return reservation


@router.post(
    "/api/contracts/{contract_id}/reservations",
    response_model=ReservationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_reservation(
    contract_id: int, data: ReservationCreate, db: AsyncSession = Depends(get_db)
):
    """Create a reservation for a contract."""
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")

    # Validate resort eligibility
    eligible = get_eligible_resorts(contract.home_resort, contract.purchase_type)
    if data.resort not in eligible:
        raise HTTPException(
            status_code=422,
            detail=f"Resort '{data.resort}' is not eligible for this {contract.purchase_type} contract at {contract.home_resort}. Eligible resorts: {eligible}",
        )

    reservation = Reservation(
        contract_id=contract_id,
        resort=data.resort,
        room_key=data.room_key,
        check_in=data.check_in,
        check_out=data.check_out,
        points_cost=data.points_cost,
        status=data.status,
        confirmation_number=data.confirmation_number,
        notes=data.notes,
    )
    db.add(reservation)
    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.put("/api/reservations/{reservation_id}", response_model=ReservationResponse)
async def update_reservation(
    reservation_id: int, data: ReservationUpdate, db: AsyncSession = Depends(get_db)
):
    """Update a reservation (partial update)."""
    result = await db.execute(
        select(Reservation).where(Reservation.id == reservation_id)
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(reservation, field, value)

    await db.commit()
    await db.refresh(reservation)
    return reservation


@router.delete(
    "/api/reservations/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_reservation(
    reservation_id: int, db: AsyncSession = Depends(get_db)
):
    """Delete a reservation."""
    result = await db.execute(
        select(Reservation).where(Reservation.id == reservation_id)
    )
    reservation = result.scalar_one_or_none()
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found")

    await db.delete(reservation)
    await db.commit()
