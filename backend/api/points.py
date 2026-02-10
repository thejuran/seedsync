from fastapi import APIRouter

router = APIRouter(prefix="/api/points", tags=["points"])

@router.get("/")
async def list_points():
    """List all point balances. Fully implemented in Plan 01-02."""
    return []
