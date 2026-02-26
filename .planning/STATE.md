---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: Security Hardening II
status: unknown
last_updated: "2026-02-26T00:27:08.841Z"
progress:
  total_phases: 37
  completed_phases: 34
  total_plans: 54
  completed_plans: 54
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-25)

**Core value:** Reliable file sync from seedbox to local with automated media library integration
**Current focus:** v3.2 Security Hardening II — Phase 48: Config and Webhook Layer

## Current Position

Phase: 49 of 51 (Path Traversal Guards)
Plan: 1 of 1 in current phase
Status: Complete
Last activity: 2026-02-25 — 49-01 path traversal guards (PATH-01, PATH-02, PATH-03): realpath-based guard, delete_local/delete_remote/extract protected, bulk endpoint per-file guard

Progress: [████████████████████░░░░░░░░░░] 46/51 phases complete (prior milestones)

## Milestones Shipped

| Milestone | Phases | Date |
|-----------|--------|------|
| v1.0 Unify UI Styling | 1-5 | 2026-02-03 |
| v1.1 Dropdown & Form Migration | 6-8 | 2026-02-04 |
| v1.2 UI Cleanup | 9 | 2026-02-04 |
| v1.3 Polish & Clarity | 10-11 | 2026-02-04 |
| v1.4 Sass @use Migration | 12-14 | 2026-02-08 |
| v1.5 Backend Testing | 15-19 | 2026-02-08 |
| v1.6 CI Cleanup | 20-21 | 2026-02-10 |
| v1.7 Sonarr Integration | 22-25 | 2026-02-10 |
| v1.8 Radarr + Webhooks | 26-28 | 2026-02-11 |
| v2.0 Dark Mode & Polish | 29-32 | 2026-02-12 |
| v2.0.1 Hotfix: Webhook Child Matching | — | 2026-02-14 |
| v3.0 Terminal UI Overhaul | 33-38 | 2026-02-17 |
| v3.1 Harden & Fix | 39-46 | 2026-02-24 |

## Performance Metrics

**Total Project:**
- 13 milestones shipped
- 46 phases complete
- 88 plans executed
- 22 days total (2026-02-03 to 2026-02-24)

## Accumulated Context

### Decisions

See PROJECT.md Key Decisions table for full list.

Recent decisions for v3.2:
- SSE stream exempted from Bearer token auth (EventSource cannot send custom headers; stream contains only file names/status codes, not secrets)
- Empty webhook_secret keeps "allow" default — do NOT change to "reject" on upgrade (breaks existing Sonarr/Radarr installs)
- Empty api_token keeps "allow all" default — startup WARNING provides visibility without lockout
- Angular autoCsp skipped (requires application builder; SeedSync uses browser builder) — CSP handled via Bottle after_request header + Angular build hashes
- DNS rebinding Host validation bundled into Phase 50 before_request hook alongside auth
- [Phase 47]: chmod placed after with-block in to_file() (file must be closed before chmod); placed before open() in from_file() (restrict before reading)
- [Phase 47-isolated-backend-hardening]: Pattern B RHS requires letter-start ([a-zA-Z][\w.\-]*) to prevent false-positives on version filenames like release@1.0.tar.gz
- [Phase 47-isolated-backend-hardening]: Two-pattern SSH redaction approach: sftp:// URL pattern + bare user@host token pattern maintained separately for clarity and independent maintainability
- [Phase 47-isolated-backend-hardening]: Restart endpoint uses POST-only via add_post_handler; GET returns 405 automatically via Bottle
- [Phase 48-01]: api_token uses Checkers.null + Converters.null (same as webhook_secret); no config-layer validation, deferred to Phase 48-02 startup warning
- [Phase 48-01]: CONF-04 satisfied by architecture — Angular Settings UI reads from local BehaviorSubject, no API response polling on re-render
- [Phase 48-02]: content_length check uses > _WEBHOOK_MAX_BODY_BYTES (strict greater-than); exactly 1MB is accepted — consistent with common gateway conventions
- [Phase 48-02]: WARN-02 (0.0.0.0 binding warning) always paired with WARN-01 (api_token warning) since WebAppJob hardcodes 0.0.0.0 bind address
- [Phase 48-02]: _emit_startup_warnings() factored into static method for direct unit testability without starting threads
- [Phase 49-01]: Guard uses os.path.realpath() + Path.is_relative_to() — not string matching — to handle both ../ sequences and symlinks
- [Phase 49-01]: local_path defaults to empty string for backward compatibility; empty local_path makes guard a no-op (None)
- [Phase 49-01]: _GUARDED_ACTIONS covers only delete_local, delete_remote, extract — queue/stop operate on model names not filesystem paths
- [Phase 49-01]: 400 response body is exactly "Invalid file path" with no path details to prevent information leakage (PATH-03)

### Todos

None.

### Blockers

- Phase 50 requires explicit SSE auth transport decision before writing implementation tasks (confirmed: exempt SSE entirely)
- Phase 51 requires production Angular build output audit before finalizing CSP directives (inline scripts must be enumerated)

## Tech Debt

- Bootstrap 5.3 still uses @import internally (blocked until Bootstrap 6)
- `make run-tests-python` Docker build fails on arm64 (Apple Silicon) — `rar` package amd64-only; CI unaffected
- WAITING_FOR_IMPORT enum exists as structural placeholder (no business logic sets it yet)

## Session Continuity

Last session: 2026-02-25
Stopped at: Completed 49-01-PLAN.md — path traversal guards (PATH-01, PATH-02, PATH-03)
Next action: Continue Phase 49 complete — proceed to Phase 50

---
*v3.2 Security Hardening II: phases 47-51, 32 requirements*
