# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** For any future date, clearly show available points across all contracts and what resorts/rooms those points can actually book.
**Current focus:** Phase 6 in progress -- What-If Scenarios

## Current Position

Phase: 6 of 7 (What-If Scenarios)
Plan: 3/3 complete
Status: Phase complete
Last activity: 2026-02-11 -- Completed 06-03 (scenario UI workspace)

Progress: [███████░░░] 70%

## Performance Metrics

**Velocity:**
- Total plans completed: 9 (v1.1)
- Average duration: 3m 16s
- Total execution time: 29m 12s

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 4     | 2     | 9m 48s | 4m 54s |
| 5     | 3     | 11m 6s | 3m 42s  |
| 6     | 3     | 8m 18s | 2m 46s  |

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

Phase 5 decisions:
- DVC end-of-month roll-forward rule for booking window dates (not relativedelta clip-backward)
- Conservative banking warning: fires when booking COULD consume bankable current-year points
- Bundle booking impact + booking windows + banking warning in single preview endpoint
- Inline expand/collapse via useState per card (not shadcn Collapsible)
- Native HTML details/summary for nightly breakdown (no extra deps)
- ChevronDown icon with CSS rotate for expand indicator
- Dashboard booking window alerts capped at 5, sorted by soonest opening, filtered to non-open windows within 30 days
- Blue styling for booking window alerts (distinct from amber banking and red expiration)
- Booking window alerts load independently (supplementary, not blocking dashboard)

Phase 6 decisions:
- Use today's date as target_date for scenario evaluation (answers "how do my current points change")
- Enforce resort eligibility validation in scenario endpoint (model reality accurately)
- Inject all hypotheticals as confirmed reservations for cumulative impact calculation
- Zustand curried create<T>()(...) pattern for TypeScript type inference (per v5 docs)
- Evaluation hook strips client-only fields (id, contract_name, resort_name) before POST
- Scenarios nav item placed between Trip Explorer and Contracts (planning tools grouped)
- Resort dropdown filters by useAvailableCharts to prevent empty room type selectors
- Form preserves contract selection after adding booking (likely adding multiple for same contract)
- 10 booking cap with visual feedback at limit
- Clear All button in page header for quick reset

### Pending Todos

None.

### Blockers/Concerns

- Docker StaticFiles mount ordering: API routes must register before SPA catch-all (RESOLVED -- SPAStaticFiles redirects /api/ paths to trailing-slash)
- SQLite volume mount: must mount directory (not file) to include WAL/SHM sidecars (RESOLVED -- named volume mounts /app/data/db)
- Port mapping: entrypoint uses ${PORT} but compose hardcodes container port to 8000 (RESOLVED -- entrypoint defaults to 8000, compose maps host PORT to container 8000)

## Session Continuity

Last session: 2026-02-11
Stopped at: Completed 06-03-PLAN.md (Phase 6 complete)
Resume file: None
Next: Phase 7 planning or next milestone
