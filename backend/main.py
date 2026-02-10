from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db.database import engine, Base
from backend.api.contracts import router as contracts_router
from backend.api.points import router as points_router
from backend.api.point_charts import router as point_charts_router
from backend.api.reservations import router as reservations_router
from backend.api.availability import router as availability_router
from backend.data.resorts import load_resorts

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (dev convenience; production uses Alembic)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield

app = FastAPI(title="DVC Dashboard API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(contracts_router)
app.include_router(points_router)
app.include_router(point_charts_router)
app.include_router(reservations_router)
app.include_router(availability_router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}

@app.get("/api/resorts")
async def list_resorts():
    """Return all DVC resort metadata from data/resorts.json."""
    return load_resorts()
