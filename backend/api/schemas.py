from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime, date as date_type

VALID_USE_YEAR_MONTHS = [2, 3, 4, 6, 8, 9, 10, 12]


class ContractCreate(BaseModel):
    name: Optional[str] = None
    home_resort: str = Field(..., min_length=1)
    use_year_month: int
    annual_points: int = Field(..., gt=0, le=2000)
    purchase_type: str = Field(..., pattern="^(resale|direct)$")

    @field_validator("use_year_month")
    @classmethod
    def validate_use_year_month(cls, v):
        if v not in VALID_USE_YEAR_MONTHS:
            raise ValueError(f"Use year month must be one of {VALID_USE_YEAR_MONTHS}")
        return v

    @field_validator("home_resort")
    @classmethod
    def validate_home_resort(cls, v):
        from backend.data.resorts import get_resort_slugs
        if v not in get_resort_slugs():
            raise ValueError(f"Invalid resort slug. Must be one of: {get_resort_slugs()}")
        return v


class ContractUpdate(BaseModel):
    name: Optional[str] = None
    home_resort: Optional[str] = None
    use_year_month: Optional[int] = None
    annual_points: Optional[int] = Field(None, gt=0, le=2000)
    purchase_type: Optional[str] = Field(None, pattern="^(resale|direct)$")

    @field_validator("use_year_month")
    @classmethod
    def validate_use_year_month(cls, v):
        if v is not None and v not in VALID_USE_YEAR_MONTHS:
            raise ValueError(f"Use year month must be one of {VALID_USE_YEAR_MONTHS}")
        return v

    @field_validator("home_resort")
    @classmethod
    def validate_home_resort(cls, v):
        if v is not None:
            from backend.data.resorts import get_resort_slugs
            if v not in get_resort_slugs():
                raise ValueError("Invalid resort slug.")
        return v


class ContractResponse(BaseModel):
    id: int
    name: Optional[str]
    home_resort: str
    use_year_month: int
    annual_points: int
    purchase_type: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PointBalanceCreate(BaseModel):
    use_year: int = Field(..., ge=2020, le=2035)
    allocation_type: str = Field(..., pattern="^(current|banked|borrowed|holding)$")
    points: int = Field(..., ge=0)


class PointBalanceUpdate(BaseModel):
    points: int = Field(..., ge=0)


class PointBalanceResponse(BaseModel):
    id: int
    contract_id: int
    use_year: int
    allocation_type: str
    points: int
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContractWithDetails(ContractResponse):
    point_balances: list[PointBalanceResponse] = []
    eligible_resorts: list[str] = []
    use_year_timeline: dict = {}


# Point Chart schemas

class PointChartSummary(BaseModel):
    resort: str
    year: int
    file: str


class PointCostRequest(BaseModel):
    resort: str
    room_key: str
    check_in: str  # ISO date
    check_out: str  # ISO date


class NightlyCost(BaseModel):
    date: str
    day_of_week: str
    season: str
    is_weekend: bool
    points: int


class StayCostResponse(BaseModel):
    resort: str
    room: str
    check_in: str
    check_out: str
    num_nights: int
    total_points: int
    nightly_breakdown: list[NightlyCost]


# Reservation schemas

class ReservationCreate(BaseModel):
    resort: str = Field(..., min_length=1)
    room_key: str = Field(..., min_length=1)
    check_in: date_type
    check_out: date_type
    points_cost: int = Field(..., gt=0)
    status: str = Field("confirmed", pattern="^(confirmed|pending|cancelled)$")
    confirmation_number: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("resort")
    @classmethod
    def validate_resort(cls, v):
        from backend.data.resorts import get_resort_slugs
        if v not in get_resort_slugs():
            raise ValueError("Invalid resort slug.")
        return v

    @field_validator("check_out")
    @classmethod
    def validate_check_out(cls, v, info):
        check_in = info.data.get("check_in")
        if check_in and v <= check_in:
            raise ValueError("check_out must be after check_in")
        if check_in and (v - check_in).days > 14:
            raise ValueError("Stay cannot exceed 14 nights")
        return v


class ReservationUpdate(BaseModel):
    resort: Optional[str] = None
    room_key: Optional[str] = None
    check_in: Optional[date_type] = None
    check_out: Optional[date_type] = None
    points_cost: Optional[int] = Field(None, gt=0)
    status: Optional[str] = Field(None, pattern="^(confirmed|pending|cancelled)$")
    confirmation_number: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("resort")
    @classmethod
    def validate_resort(cls, v):
        if v is not None:
            from backend.data.resorts import get_resort_slugs
            if v not in get_resort_slugs():
                raise ValueError("Invalid resort slug.")
        return v


class ReservationResponse(BaseModel):
    id: int
    contract_id: int
    resort: str
    room_key: str
    check_in: date_type
    check_out: date_type
    points_cost: int
    status: str
    confirmation_number: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Availability schemas

class AvailabilityContractResult(BaseModel):
    contract_id: int
    contract_name: str
    home_resort: str
    annual_points: int
    use_year: int
    use_year_start: str
    use_year_end: str
    use_year_status: str
    banking_deadline: str
    banking_deadline_passed: bool
    days_until_banking_deadline: int
    days_until_expiration: int
    balances: dict
    total_points: int
    committed_points: int
    committed_reservation_count: int
    available_points: int


class AvailabilitySummary(BaseModel):
    total_contracts: int
    total_points: int
    total_committed: int
    total_available: int


class AvailabilityResponse(BaseModel):
    target_date: str
    contracts: list[AvailabilityContractResult]
    summary: AvailabilitySummary
