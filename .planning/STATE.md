# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Reliable file sync from seedbox to local with automated media library integration
**Current focus:** v3.1 Harden & Fix — Phase 39: Critical Security Chain

## Current Position

Phase: 39 of 45 (Critical Security Chain)
Plan: 2 of 2 complete in current phase
Status: Phase 39 complete
Last activity: 2026-02-24 — Phase 39 Plan 02 complete (JSON migration: pickle RCE elimination)

Progress: [█░░░░░░░░░] 10% (v3.1)

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

## Performance Metrics

**Total Project:**
- 12 milestones shipped
- 39 phases complete (phases 1-39)
- 65 plans executed
- 15 days total (2026-02-03 to 2026-02-24)

**v3.1 so far:** 1 phase, 2 plans

## Accumulated Context

### Decisions

- **SSH TOFU mode:** Use StrictHostKeyChecking=accept-new (Trust On First Use) rather than reject-all — preserves first-connect usability while blocking MITM on subsequent connections
- **UserKnownHostsFile removed:** Removed /dev/null redirect so known_hosts persists across reconnects
- **MITM detection:** Added REMOTE HOST IDENTIFICATION HAS CHANGED pattern in both pexpect branches (password and key-auth paths) in sshcp.py
- **Test exception documented:** test/python/Dockerfile keeps StrictHostKeyChecking=no for ephemeral localhost test container — documented with explicit comment
- **Pickle replaced with JSON (CWE-502):** SystemFile uses to_dict/from_dict; scan_fs outputs json.dumps; remote_scanner uses json.loads — eliminates RCE vector from untrusted SSH stdout
- **Error message format-agnostic:** Changed "Invalid pickled data" to "Invalid scan data" to avoid leaking transport format details

### Todos

None.

### Blockers

None.

## Tech Debt

- Bootstrap 5.3 still uses @import internally (blocked until Bootstrap 6)
- `make run-tests-python` Docker build fails on arm64 (Apple Silicon) — `rar` package amd64-only; CI unaffected
- WAITING_FOR_IMPORT enum exists as structural placeholder (no business logic sets it yet)

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 39-02-PLAN.md (JSON migration: pickle RCE elimination)
Next action: /gsd:execute-phase 39 (if more plans) or /gsd:plan-phase 40

---
*v3.1 Harden & Fix: phase 39 plan 02 complete 2026-02-24*
