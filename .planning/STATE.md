# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-10)

**Core value:** For any future date, clearly show available points across all contracts and what resorts/rooms those points can actually book.
**Current state:** v1.1 milestone started. Defining requirements.

## Current Position

Phase: Not started (defining requirements)
Plan: --
Status: Defining requirements
Last activity: 2026-02-10 -- Milestone v1.1 started

## Accumulated Context

### Decisions

All v1.0 decisions archived in milestones/v1.0-ROADMAP.md.

Key architectural decisions carrying forward:
- Monorepo: FastAPI backend + React/Vite frontend
- SQLite for storage (single-user)
- Pure-function engine layer (no DB coupling)
- Point charts as versioned JSON data
- Eligibility computed at read time

v1.1 decisions:
- Docker for sharing (not Railway) -- open-source self-hosted tool
- No scraping in v1.x -- reserves v2 for data source change
- Configurable borrowing policy (100%/50%) to handle potential DVC policy change

### Pending Todos

None.

### Blockers/Concerns

- DVC borrowing policy may revert from 100% to 50% -- addressed in v1.1 scope

## Session Continuity

Last session: 2026-02-10
Stopped at: v1.1 milestone started, defining requirements.
Resume file: None
