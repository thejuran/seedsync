# Phase 4: Docker Packaging + Settings - Research

**Researched:** 2026-02-10
**Domain:** Docker containerization, FastAPI SPA serving, SQLite persistence, Alembic migrations, app settings
**Confidence:** HIGH

## Summary

This phase packages the DVC Dashboard into a single Docker container that serves both the FastAPI backend and the React frontend build. The architecture is a multi-stage Dockerfile (node stage builds frontend, python stage runs everything) with FastAPI serving the React SPA via a custom `SPAStaticFiles` class. SQLite persistence requires mounting the *directory* containing the database (not the file itself) to handle WAL mode sidecar files. Alembic migrations run via an entrypoint shell script before uvicorn starts -- appropriate for this single-instance personal app.

The borrowing policy setting (CONF-01) is best implemented as a simple key-value `app_settings` table in SQLite with a CRUD API endpoint, rather than an environment variable, since this is a user-facing toggle that should be changeable from the UI without container restarts.

**Primary recommendation:** Use `python:3.12-slim` base image, multi-stage build with `node:22-slim` for frontend, shell entrypoint for migrations, `SPAStaticFiles` subclass for SPA catch-all, named Docker volume for SQLite directory, and Pydantic `BaseSettings` for environment configuration.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| FastAPI | >=0.128.0,<0.129.0 | Web framework + SPA serving | Already in requirements.txt |
| SQLAlchemy | >=2.0.46,<2.1.0 | ORM + async engine | Already in requirements.txt |
| aiosqlite | >=0.21.0,<0.22.0 | Async SQLite driver | Already in requirements.txt |
| Alembic | >=1.18.0,<1.19.0 | Database migrations | Already in requirements.txt |
| uvicorn | >=0.34.0,<0.35.0 | ASGI server | Already in requirements.txt |

### New Dependencies
| Library | Version | Purpose | Why Needed |
|---------|---------|---------|------------|
| pydantic-settings | >=2.7.0 | BaseSettings with .env loading | FastAPI official recommendation for env config |
| python-dotenv | >=1.0.0 | .env file reading | Required by pydantic-settings for env_file support |

### Docker Images
| Image | Tag | Purpose | Why This One |
|-------|-----|---------|--------------|
| python | 3.12-slim | Runtime base | Matches project's Python version; slim is ~130MB vs ~1GB full; avoids Alpine musl compatibility issues with SQLite/wheels |
| node | 22-slim | Frontend build stage | LTS version; only used in build stage, not in final image |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| python:3.12-slim | python:3.12-alpine | Alpine is smaller (~52MB) but musl libc can break prebuilt wheels; not worth the risk for minimal size savings in a personal app |
| Shell entrypoint script | Alembic in FastAPI lifespan | Lifespan approach has async complications with Alembic (issue #1606); entrypoint is simpler, more debuggable, and standard practice |
| SPAStaticFiles subclass | Catch-all route `/{path:path}` | Catch-all route works but requires manual MIME type handling; SPAStaticFiles leverages Starlette's built-in file serving with proper MIME types |
| pydantic-settings | plain os.environ | pydantic-settings provides type validation, .env file loading, and testability via dependency injection |

**Installation (new deps only):**
```bash
pip install pydantic-settings python-dotenv
```

## Architecture Patterns

### Recommended Project Structure (new files)
```
/
├── Dockerfile                     # Multi-stage build
├── docker-compose.yml             # Single-service compose
├── .env.example                   # Template for user config
├── .dockerignore                  # Exclude .venv, node_modules, .git, etc.
├── entrypoint.sh                  # Migration + uvicorn startup
├── backend/
│   ├── config.py                  # NEW: Pydantic BaseSettings
│   ├── spa.py                     # NEW: SPAStaticFiles class
│   └── main.py                    # MODIFIED: mount SPA, use settings
└── data/
    └── point_charts/              # Baked into image, also mountable
```

### Pattern 1: Multi-Stage Dockerfile
**What:** Three-stage build -- frontend build, then Python runtime with built assets copied in.
**When to use:** Always for this project (single container serving frontend + backend).

```dockerfile
# Stage 1: Build frontend
FROM node:22-slim AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python runtime
FROM python:3.12-slim
WORKDIR /app

# Install Python dependencies first (cache layer)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/
COPY data/ ./data/
COPY alembic.ini ./

# Copy built frontend from stage 1
COPY --from=frontend-builder /frontend/dist ./frontend/dist

# Copy entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
```

**Source:** Pattern verified against [FastAPI Docker official docs](https://fastapi.tiangolo.com/deployment/docker/) and [multi-stage build guide](https://davidmuraya.com/blog/slimmer-fastapi-docker-images-multistage-builds/).

### Pattern 2: SPAStaticFiles for React Client-Side Routing
**What:** Subclass of Starlette's `StaticFiles` that catches 404s and serves `index.html`, enabling React Router to handle client-side routes.
**When to use:** When FastAPI serves a React SPA with `BrowserRouter` routes.

```python
# backend/spa.py
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            return await super().get_response(path, scope)
        except (StarletteHTTPException,) as ex:
            if ex.status_code == 404:
                return await super().get_response("index.html", scope)
            raise
```

**Critical ordering in main.py:**
```python
# 1. CORS middleware (first)
app.add_middleware(CORSMiddleware, ...)

# 2. API routers (second -- MUST be before SPA mount)
app.include_router(contracts_router)
app.include_router(points_router)
# ... all other routers ...

# 3. SPA mount (LAST -- catches everything else)
app.mount("/", SPAStaticFiles(directory="frontend/dist", html=True), name="spa")
```

**Source:** Pattern from [React + FastAPI SPA guide](https://davidmuraya.com/blog/serving-a-react-frontend-application-with-fastapi/) and [FastAPI GitHub gist](https://gist.github.com/ultrafunkamsterdam/b1655b3f04893447c3802453e05ecb5e).

### Pattern 3: Pydantic BaseSettings for Configuration
**What:** Centralized settings class that reads from environment variables and `.env` file with type validation.
**When to use:** For all configurable values (port, DB path, CORS origins).

```python
# backend/config.py
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./data/dvc.db"
    cors_origins: str = "*"  # Comma-separated origins, or "*" for all
    port: int = 8000
    host: str = "0.0.0.0"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

**Source:** [FastAPI official settings docs](https://fastapi.tiangolo.com/advanced/settings/).

### Pattern 4: Entrypoint Script for Migrations
**What:** Shell script that runs `alembic upgrade head` then starts uvicorn.
**When to use:** On every container start (Alembic's `upgrade head` is idempotent -- no-ops if already at head).

```bash
#!/bin/sh
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting server..."
exec uvicorn backend.main:app --host 0.0.0.0 --port "${PORT:-8000}"
```

**Key detail:** Use `exec` so uvicorn replaces the shell process and receives SIGTERM directly for clean shutdown.

**Source:** Standard Docker pattern verified via [migration startup analysis](https://pythonspeed.com/articles/schema-migrations-server-startup/) -- appropriate for single-instance personal apps.

### Pattern 5: SQLite Volume Mount (Directory, Not File)
**What:** Mount the directory containing the SQLite database, not the file itself.
**Why:** SQLite WAL mode creates `.db-wal` and `.db-shm` sidecar files. Mounting only the `.db` file would lose these sidecars, causing data corruption.

```yaml
# docker-compose.yml
services:
  dvc:
    build: .
    ports:
      - "${PORT:-8000}:8000"
    volumes:
      - dvc-data:/app/data/db
    env_file:
      - path: .env
        required: false
    environment:
      - DATABASE_URL=sqlite+aiosqlite:///./data/db/dvc.db

volumes:
  dvc-data:
```

**Source:** [SQLite Docker forum](https://sqlite.org/forum/info/87824f1ed837cdbb), [Docker volumes docs](https://docs.docker.com/engine/storage/volumes/).

### Pattern 6: Borrowing Policy as DB Setting (CONF-01)
**What:** Store user-configurable app settings in a simple `app_settings` SQLite table, exposed via API endpoints.
**Why env var is wrong here:** The borrowing policy (100% vs 50%) is a user-facing preference that should be toggleable from the UI without restarting the container.

```python
# Model
class AppSetting(Base):
    __tablename__ = "app_settings"
    key = Column(String, primary_key=True)
    value = Column(String, nullable=False)

# API: GET /api/settings, PUT /api/settings/{key}
# Default: {"borrowing_limit_pct": "100"}
```

**How it integrates:** The point balance validation in `backend/api/points.py` (line 108) already warns about borrowed points exceeding annual. The borrowing policy would cap `borrowed` points to `annual_points * (policy_pct / 100)`.

### Anti-Patterns to Avoid
- **Mounting SQLite file directly:** `volumes: ["./dvc.db:/app/dvc.db"]` -- WILL corrupt data in WAL mode due to missing sidecar files.
- **Running Alembic in lifespan:** Async complications with Alembic's engine setup (see [issue #1606](https://github.com/sqlalchemy/alembic/issues/1606)). Shell entrypoint is simpler and more reliable.
- **API routes after SPA mount:** The SPA `StaticFiles` mount catches ALL requests to `/`. If mounted before API routers, API calls return `index.html`.
- **Hardcoding CORS to localhost:** Container mode needs configurable CORS. Use env var with sensible default.
- **Using `CMD` shell form:** `CMD uvicorn ...` runs under `/bin/sh`, preventing proper signal handling. Use exec form or `exec` in entrypoint.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SPA static file serving | Custom route handler with manual MIME detection | `SPAStaticFiles` subclass of Starlette `StaticFiles` | Starlette handles MIME types, caching headers, directory traversal prevention |
| .env file parsing | Custom `os.environ` + manual parsing | `pydantic-settings` with `SettingsConfigDict(env_file=".env")` | Type validation, defaults, testability, official FastAPI recommendation |
| Container health check | Custom endpoint logic | Docker Compose `healthcheck` + existing `/api/health` endpoint | Already have health endpoint; just wire it to Docker |
| Migration running | Python subprocess in app code | `alembic upgrade head` in shell entrypoint | Direct CLI invocation is simpler, more debuggable, well-documented |

**Key insight:** Docker + FastAPI + Starlette provide all the building blocks. The implementation work is wiring them together correctly, not building custom solutions.

## Common Pitfalls

### Pitfall 1: SPA Mount Ordering
**What goes wrong:** Mounting `SPAStaticFiles` at `/` before `include_router()` causes API routes to never match. All requests (including `/api/*`) return `index.html`.
**Why it happens:** Starlette processes mounts and routes in registration order. A mount at `/` matches everything.
**How to avoid:** Register ALL `include_router()` calls BEFORE `app.mount("/", SPAStaticFiles(...))`. The mount MUST be the last thing registered.
**Warning signs:** API calls return HTML content instead of JSON; browser console shows JSON parse errors.

### Pitfall 2: SQLite File Mount vs Directory Mount
**What goes wrong:** Container restarts lose data or corrupt the database.
**Why it happens:** SQLite WAL mode creates `dvc.db-wal` and `dvc.db-shm` files in the same directory. A Docker bind mount of just `dvc.db` does not capture these sidecars.
**How to avoid:** Mount the DIRECTORY containing the database: `dvc-data:/app/data/db`. Set `DATABASE_URL` to point to the file within that directory.
**Warning signs:** "database is locked" errors, missing data after restart, sqlite3 "malformed" errors.

### Pitfall 3: Alembic Can't Find Modules
**What goes wrong:** `alembic upgrade head` fails with `ModuleNotFoundError: No module named 'backend'` when run inside Docker.
**Why it happens:** Alembic's `env.py` imports `from backend.db.database import Base` and `from backend.models import ...`. The Python path inside the container must include the project root.
**How to avoid:** Set `WORKDIR /app` in Dockerfile and ensure `alembic.ini`'s `prepend_sys_path = .` resolves correctly. The Alembic command runs from `/app`, so `backend/` is importable as a package.
**Warning signs:** Import errors on container startup, migrations never running.

### Pitfall 4: Alembic URL Not Matching Runtime URL
**What goes wrong:** Alembic uses the hardcoded URL from `alembic.ini` instead of the `DATABASE_URL` env var, creating a second database file.
**Why it happens:** `alembic.ini` has `sqlalchemy.url = sqlite+aiosqlite:///./dvc.db` but Docker container needs `sqlite+aiosqlite:///./data/db/dvc.db`.
**How to avoid:** In `env.py`, override the URL from environment: `config.set_main_option("sqlalchemy.url", os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./dvc.db"))`.
**Warning signs:** Migrations run but tables don't appear in the expected database; two `.db` files exist.

### Pitfall 5: Point Chart Path Resolution in Docker
**What goes wrong:** Point charts not found; API returns "chart not found" for valid resort/year combos.
**Why it happens:** `CHARTS_DIR = Path(__file__).parent.parent.parent / "data" / "point_charts"` resolves relative to the file's location. If the directory structure changes inside Docker, the path breaks.
**How to avoid:** Verify that the Dockerfile `COPY` structure preserves the relative path from `backend/data/point_charts.py` up to `data/point_charts/`. With `WORKDIR /app` and `COPY backend/ ./backend/` + `COPY data/ ./data/`, the path resolves to `/app/data/point_charts/` -- correct.
**Warning signs:** 404 on point chart endpoints, empty chart listings.

### Pitfall 6: Frontend API Base URL in Production
**What goes wrong:** Frontend API calls fail with network errors.
**Why it happens:** In dev, Vite proxies `/api` to `localhost:8000`. In production (Docker), there is no proxy -- the browser makes requests directly. Since `frontend/src/lib/api.ts` uses `const BASE_URL = "/api"` (relative path), this actually works correctly when FastAPI serves both the SPA and the API from the same origin.
**How to avoid:** Keep the relative `/api` prefix (already correct). Do NOT set `VITE_BACKEND_HOST` or use absolute URLs.
**Warning signs:** None -- the current implementation is already correct for single-container deployment.

### Pitfall 7: CORS Configuration in Docker
**What goes wrong:** CORS errors in browser console when accessing the containerized app.
**Why it happens:** CORS is hardcoded to `http://localhost:5173` (Vite dev server). In Docker, the app is accessed on a different port.
**How to avoid:** Make CORS configurable via env var. In single-container mode where FastAPI serves the frontend, CORS is technically unnecessary (same-origin), but should still be configurable for development scenarios (separate Vite dev server proxying to containerized backend).
**Warning signs:** Browser console shows "blocked by CORS policy" errors.

## Code Examples

### Complete docker-compose.yml
```yaml
services:
  dvc:
    build: .
    ports:
      - "${PORT:-8000}:8000"
    volumes:
      - dvc-data:/app/data/db
    env_file:
      - path: .env
        required: false
    environment:
      - DATABASE_URL=sqlite+aiosqlite:///./data/db/dvc.db
      - PORT=${PORT:-8000}
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

volumes:
  dvc-data:
```

### Complete .env.example
```bash
# DVC Dashboard Configuration
# Copy to .env and modify as needed

# Server port (default: 8000)
PORT=8000

# Database URL (default: SQLite in data/db/ directory)
# DATABASE_URL=sqlite+aiosqlite:///./data/db/dvc.db

# CORS origins (comma-separated, default: * in Docker, localhost:5173 in dev)
# CORS_ORIGINS=http://localhost:5173,http://localhost:8000
```

### Complete .dockerignore
```
.git
.venv
.pytest_cache
__pycache__
*.pyc
node_modules
frontend/dist
*.db
*.db-wal
*.db-shm
.env
.planning
tests
```

### Alembic env.py URL Override
```python
# Add at top of env.py, after config = context.config
import os
db_url = os.environ.get("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)
```

### Settings Integration in main.py
```python
from backend.config import get_settings
from backend.spa import SPAStaticFiles
from pathlib import Path

settings = get_settings()

# Update CORS to use settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(",") if settings.cors_origins != "*" else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount SPA LAST (only if dist directory exists -- allows dev mode without build)
spa_dir = Path(__file__).parent.parent / "frontend" / "dist"
if spa_dir.exists():
    app.mount("/", SPAStaticFiles(directory=str(spa_dir), html=True), name="spa")
```

### App Settings Table + Migration
```python
# New Alembic migration for app_settings
def upgrade() -> None:
    op.create_table('app_settings',
        sa.Column('key', sa.String(), nullable=False),
        sa.Column('value', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('key')
    )
    # Seed default borrowing policy
    op.execute("INSERT INTO app_settings (key, value) VALUES ('borrowing_limit_pct', '100')")

def downgrade() -> None:
    op.drop_table('app_settings')
```

### App Settings API
```python
# GET /api/settings - returns all settings as key-value dict
# GET /api/settings/{key} - returns single setting
# PUT /api/settings/{key} - update setting value
# Known keys: borrowing_limit_pct (values: "100" or "50")
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tiangolo/uvicorn-gunicorn-fastapi` base image | Official `python:3.x-slim` + `fastapi run` or `uvicorn` directly | 2024 -- image deprecated | Use official Python image, not deprecated convenience images |
| Single-stage Dockerfile | Multi-stage build (node + python) | Standard since 2020 | Smaller final images (no node_modules, no build tools) |
| `CMD ["uvicorn", ...]` | `ENTRYPOINT ["./entrypoint.sh"]` (for migration + start) | N/A -- depends on use case | Entrypoint allows pre-start tasks like migrations |
| Env vars via `os.environ.get()` | Pydantic `BaseSettings` + `.env` file | FastAPI recommendation since 2023+ | Type validation, defaults, testable via dependency injection |

**Deprecated/outdated:**
- `tiangolo/uvicorn-gunicorn-fastapi` Docker image: deprecated, use official Python images
- `python-dotenv` standalone for FastAPI config: use `pydantic-settings` which wraps it

## Open Questions

1. **Should the database directory be pre-created in the Dockerfile?**
   - What we know: Docker named volumes auto-create and are populated from the image on first use. If `/app/data/db/` exists in the image, the volume gets initialized with its contents.
   - What's unclear: Whether we should pre-create an empty db directory or let Alembic create it.
   - Recommendation: Create `data/db/` directory in the Dockerfile with a `.gitkeep`. Alembic + SQLAlchemy will create the `.db` file on first migration run.

2. **Should point chart data live inside or outside the volume?**
   - What we know: Point charts (JSON files) are baked into the image at `/app/data/point_charts/`. The database volume is at `/app/data/db/`. These are separate directories, so point charts stay in the image while DB is persisted.
   - What's unclear: Whether users should be able to add custom point charts.
   - Recommendation: For now, point charts are image-only (baked in). Users add new charts by rebuilding the image with new JSON files in `data/point_charts/`. A future phase could add upload functionality.

3. **Should we add `--reload` support for development?**
   - What we know: Docker Compose supports bind mounts for hot-reload. But the phase spec focuses on production-like `docker compose up`.
   - What's unclear: Whether a `docker-compose.override.yml` for dev mode is in scope.
   - Recommendation: Out of scope for Phase 4. A simple `docker-compose.override.yml` could be added later for development bind mounts.

## Sources

### Primary (HIGH confidence)
- [FastAPI Docker deployment docs](https://fastapi.tiangolo.com/deployment/docker/) - Dockerfile patterns, CMD exec form, cache optimization
- [FastAPI Settings docs](https://fastapi.tiangolo.com/advanced/settings/) - Pydantic BaseSettings pattern, dependency injection, lru_cache
- [Starlette StaticFiles docs](https://www.starlette.io/staticfiles/) - StaticFiles API, html mode behavior
- [Docker Volumes docs](https://docs.docker.com/engine/storage/volumes/) - Named volumes vs bind mounts
- [Docker Compose env_file best practices](https://docs.docker.com/compose/how-tos/environment-variables/best-practices/) - .env file handling

### Secondary (MEDIUM confidence)
- [Serving React with FastAPI (David Muraya)](https://davidmuraya.com/blog/serving-a-react-frontend-application-with-fastapi/) - SPAStaticFiles pattern, multi-stage Dockerfile, route ordering
- [Multi-stage FastAPI builds (David Muraya)](https://davidmuraya.com/blog/slimmer-fastapi-docker-images-multistage-builds/) - Build optimization patterns
- [Schema migrations at startup (Python Speed)](https://pythonspeed.com/articles/schema-migrations-server-startup/) - When entrypoint migrations are appropriate
- [SQLite Docker WAL discussion (SQLite Forum)](https://sqlite.org/forum/info/87824f1ed837cdbb) - Directory mount for WAL mode
- [Python Docker base images comparison (Python Speed)](https://pythonspeed.com/articles/base-image-python-docker-images/) - slim vs alpine analysis
- [FastAPI React Router gist](https://gist.github.com/ultrafunkamsterdam/b1655b3f04893447c3802453e05ecb5e) - Alternative SPA catch-all approaches

### Tertiary (LOW confidence)
- [Alembic env.py URL override discussion](https://github.com/sqlalchemy/alembic/discussions/1043) - Pattern for DATABASE_URL override in env.py

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs; project already uses most of them
- Architecture (Docker patterns): HIGH - Multi-stage builds and SPA serving are well-documented, verified patterns
- Architecture (SQLite volume): HIGH - Official SQLite forum + Docker docs confirm directory mount requirement
- Architecture (Alembic startup): HIGH - Entrypoint pattern is standard; confirmed appropriate for single-instance apps
- Architecture (borrowing policy): MEDIUM - DB settings table is straightforward but integration with existing point validation logic needs careful implementation
- Pitfalls: HIGH - Each pitfall is documented from official sources or known Docker/SQLite behavior

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (stable technologies, 30-day validity)
