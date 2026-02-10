from fastapi import APIRouter

router = APIRouter(prefix="/api/contracts", tags=["contracts"])

@router.get("/")
async def list_contracts():
    """List all contracts. Fully implemented in Plan 01-02."""
    return []
