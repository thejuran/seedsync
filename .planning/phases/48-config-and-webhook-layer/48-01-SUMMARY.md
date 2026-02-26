---
phase: 48-config-and-webhook-layer
plan: 01
subsystem: api
tags: [config, redaction, security, api-hardening]

# Dependency graph
requires:
  - phase: 47-isolated-backend-hardening
    provides: SSH topology redaction in SSE log stream (LOG-01, LOG-02, LOG-03)
provides:
  - api_token field on Config.General with backward-compat empty-string default
  - Extended _SENSITIVE_FIELDS redacting remote_address, remote_username, remote_path (lftp) and api_token (general)
  - GET /server/config response hides SSH topology and api_token
affects:
  - 48-02 (startup warning can reference config.general.api_token)
  - 50-bearer-token-enforcement (api_token field already exists when Phase 50 wires auth)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Backward-compat default injection in Config.from_dict() before InnerConfig.from_dict() call"
    - "_SENSITIVE_FIELDS dict drives generic redaction loop — no per-field code needed"

key-files:
  created: []
  modified:
    - src/python/common/config.py
    - src/python/seedsync.py
    - src/python/web/serialize/serialize_config.py
    - src/python/tests/unittests/test_web/test_serialize/test_serialize_config.py

key-decisions:
  - "api_token PROP uses Checkers.null + Converters.null (same as webhook_secret) — no validation at config layer, validation deferred to startup warning"
  - "test_section_lftp updated to expect REDACTED for topology fields (direct consequence of CONF-03, not a separate deviation)"
  - "CONF-04 satisfied by architecture — Angular Settings UI reads from local BehaviorSubject, not API response"

patterns-established:
  - "Backward-compat default: add 'if key not in general_dict: general_dict[key] = default' before InnerConfig.from_dict()"

requirements-completed: [CONF-03, CONF-04]

# Metrics
duration: 2min
completed: 2026-02-26
---

# Phase 48 Plan 01: Config and Webhook Layer Summary

**api_token field added to Config.General and SSH topology fields + api_token redacted from GET /server/config response via extended _SENSITIVE_FIELDS dict**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-26T00:11:35Z
- **Completed:** 2026-02-26T00:13:08Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- Extended `_SENSITIVE_FIELDS` to redact `remote_address`, `remote_username`, `remote_path` (lftp) and `api_token` (general)
- Added `api_token` PROP to `Config.General` with backward-compat empty-string default in `Config.from_dict()`
- Set `api_token = ""` in `_create_default_config()` so `test_default_config` passes without modification
- Added 4 new redaction tests and renamed/updated 1 existing test; 21 tests total pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add api_token config field and extend config API redaction with tests** - `5c89961` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified
- `src/python/common/config.py` - Added api_token PROP to Config.General and backward-compat default in from_dict()
- `src/python/seedsync.py` - Added api_token = "" to _create_default_config()
- `src/python/web/serialize/serialize_config.py` - Extended _SENSITIVE_FIELDS with lftp topology fields and api_token
- `src/python/tests/unittests/test_web/test_serialize/test_serialize_config.py` - Updated test_section_lftp, renamed test_config_preserves_non_sensitive_fields to test_config_redacts_and_preserves_fields, added 4 new redaction tests

## Decisions Made
- `api_token` uses `Checkers.null + Converters.null` (same as `webhook_secret`) — no config-layer validation; Phase 48-02 adds startup WARNING for empty token
- CONF-04 requires no Angular code change — confirmed by research that Settings UI uses local BehaviorSubject state, not API response on re-render

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test_section_lftp to expect REDACTED for topology fields**
- **Found during:** Task 1 (extend _SENSITIVE_FIELDS)
- **Issue:** `test_section_lftp` asserted `remote_address`, `remote_username`, `remote_path` returned as-is; after CONF-03 these are redacted, so the test would fail
- **Fix:** Updated the three assertions in `test_section_lftp` to expect `"**REDACTED**"` and updated the comment; `remote_port` and `local_path` assertions left unchanged
- **Files modified:** `src/python/tests/unittests/test_web/test_serialize/test_serialize_config.py`
- **Verification:** All 21 tests pass including `test_section_lftp`
- **Committed in:** `5c89961` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Auto-fix was a direct consequence of the CONF-03 change and necessary for test correctness. No scope creep.

## Issues Encountered
None — all changes straightforward, tests passed on first run.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `Config.General.api_token` field is available for Phase 48-02 startup warning (checks if api_token is empty)
- Phase 50 can reference `config.general.api_token` for Bearer token enforcement without any further config changes
- All redaction tests passing; no regressions in existing test suite

---
*Phase: 48-config-and-webhook-layer*
*Completed: 2026-02-26*

## Self-Check: PASSED

- FOUND: .planning/phases/48-config-and-webhook-layer/48-01-SUMMARY.md
- FOUND: src/python/common/config.py
- FOUND: src/python/web/serialize/serialize_config.py
- FOUND: commit 5c89961
