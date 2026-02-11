# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** For any future date, clearly show available points across all contracts and what resorts/rooms those points can actually book.
**Current focus:** Phase 4 complete -- ready for Phase 5

## Current Position

Phase: 4 of 7 (Docker Packaging + Settings) -- COMPLETE
Plan: 2/2 complete, verified
Status: Phase complete
Last activity: 2026-02-10 -- Phase 4 verified (9/9 must-haves, 7/7 requirements)

Progress: [██░░░░░░░░] 25%

## Performance Metrics

**Velocity:**
- Total plans completed: 2 (v1.1)
- Average duration: 4m 54s
- Total execution time: 9m 48s

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 4     | 2     | 9m 48s | 4m 54s |

*Updated after each plan completion*

## Accumulated Context

### Decisions

All v1.0 decisions archived in milestones/v1.0-ROADMAP.md.

Key architectural decisions carrying forward:
- Monorepo: FastAPI backend + React/Vite frontend
- SQLite for storage (single-user)
- Pure-function engine layer (no DB coupling)
- Point charts as versioned JSON data

v1.1 decisions:
- Docker for sharing (not Railway) -- open-source self-hosted tool
- Single container: FastAPI serves React build via StaticFiles mount
- Zustand for ephemeral scenario state (already installed, first activation)
- Server-side computation, client-side state for scenarios

Phase 4 decisions (from planning):
- Multi-stage Dockerfile: node:22-slim builds frontend, python:3.12-slim runs everything
- SPAStaticFiles subclass (not catch-all route) for React SPA serving
- Shell entrypoint for Alembic migrations (not lifespan approach)
- Pydantic BaseSettings for env configuration (not raw os.getenv)
- Borrowing policy stored in DB app_settings table (not env var) -- UI-toggleable
- SQLite volume: mount directory /app/data/db (not file) for WAL sidecar support
- Key-value AppSetting model for extensible settings (not single-purpose table)
- Settings API validates allowed values server-side (50 or 100 only)
- Borrowing policy enforced on both create and update of borrowed balances
- Toggle-style UI cards for policy selection (not dropdown)

### Pending Todos

None.

### Blockers/Concerns

- Docker StaticFiles mount ordering: API routes must register before SPA catch-all (RESOLVED -- SPAStaticFiles redirects /api/ paths to trailing-slash)
- SQLite volume mount: must mount directory (not file) to include WAL/SHM sidecars (RESOLVED -- named volume mounts /app/data/db)
- Port mapping: entrypoint uses ${PORT} but compose hardcodes container port to 8000 (RESOLVED -- entrypoint defaults to 8000, compose maps host PORT to container 8000)

## Session Continuity

Last session: 2026-02-10
Stopped at: Phase 4 complete
Resume file: None
Next: `/gsd:plan-phase 5`
