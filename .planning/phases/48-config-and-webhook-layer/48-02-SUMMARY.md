---
phase: 48-config-and-webhook-layer
plan: 02
subsystem: api
tags: [webhook, security, hardening, startup-warnings, payload-size]

# Dependency graph
requires:
  - phase: 48-01
    provides: api_token field on Config.General; startup warning can reference config.general.api_token
provides:
  - _WEBHOOK_MAX_BODY_BYTES constant + 413 guard before body read in webhook handler
  - _emit_startup_warnings() static method on Seedsync class
  - Startup warnings for empty webhook_secret, empty api_token, and 0.0.0.0 binding
affects:
  - 50-bearer-token-enforcement (api_token field + warning precedent established)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Content-Length guard before body read: check request.content_length > constant before _verify_hmac()"
    - "Testable startup warnings: extract warning block into static method _emit_startup_warnings(logger, config)"
    - "Existing test mock update pattern: set mock_request.content_length = -1 in tests that don't care about size"

key-files:
  created: []
  modified:
    - src/python/web/handler/webhook.py
    - src/python/tests/unittests/test_web/test_webhook_handler.py
    - src/python/seedsync.py
    - src/python/tests/unittests/test_seedsync.py

key-decisions:
  - "content_length check uses > _WEBHOOK_MAX_BODY_BYTES (not >=) so exactly 1MB is accepted — consistent with common practice"
  - "WARN-02 (0.0.0.0 warning) is always paired with WARN-01 (api_token warning) since bind address is hardcoded in WebAppJob"
  - "_emit_startup_warnings() factored into static method for direct unit testability without starting threads"
  - "Existing tests that mock request got content_length = -1 added (Rule 1 auto-fix — MagicMock broke > comparison)"

requirements-completed: [WHOOK-01, WHOOK-02, WARN-01, WARN-02, WARN-03]

# Metrics
duration: 6min
completed: 2026-02-26
---

# Phase 48 Plan 02: Webhook Payload Size Cap and Startup Security Warnings Summary

**413 payload size guard (> 1MB) added before body read in webhook handler; startup security warnings for empty webhook_secret, api_token, and 0.0.0.0 binding added via testable _emit_startup_warnings() static method**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-26T00:15:27Z
- **Completed:** 2026-02-26T00:21:33Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `_WEBHOOK_MAX_BODY_BYTES = 1_048_576` module-level constant in `webhook.py`
- Added content_length check as first guard in `_handle_webhook()`, before `_verify_hmac()` — payloads > 1MB return 413 without reading body
- Added `TestWebhookPayloadSizeLimit` class with 4 tests: oversized (413), at-limit (200), under-limit (200), missing CL (200)
- Added `_emit_startup_warnings(logger, config)` static method on `Seedsync` class
- Warning emitted when `webhook_secret` is falsy (WHOOK-02)
- Warning emitted when `api_token` is falsy (WARN-01) plus 0.0.0.0 binding warning (WARN-02)
- No `sys.exit()` or exception — warnings are advisory (WARN-03)
- `run()` calls `_emit_startup_warnings()` after logger init, before thread start
- Added `TestSeedsyncApiTokenConfig` (3 tests) and `TestSeedsyncStartupWarnings` (5 tests)
- Total: 43 tests pass in affected files (28 webhook + 15 seedsync)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add webhook payload size cap with tests** - `7063a03` (feat)
2. **Task 2: Add startup security warnings with tests** - `e670f5d` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/python/web/handler/webhook.py` - Added `_WEBHOOK_MAX_BODY_BYTES` constant and 413 guard in `_handle_webhook()`
- `src/python/tests/unittests/test_web/test_webhook_handler.py` - Added `TestWebhookPayloadSizeLimit` (4 tests); added `content_length = -1` to all existing `_handle_webhook()` call sites
- `src/python/seedsync.py` - Added `_emit_startup_warnings()` static method; `run()` calls it before `WebhookManager` construction
- `src/python/tests/unittests/test_seedsync.py` - Added `MagicMock` import; added `TestSeedsyncApiTokenConfig` (3 tests) and `TestSeedsyncStartupWarnings` (5 tests)

## Decisions Made

- `_WEBHOOK_MAX_BODY_BYTES` constant uses `> _WEBHOOK_MAX_BODY_BYTES` (strict greater-than) so exactly 1MB payload is accepted — consistent with common gateway/proxy conventions where the limit is the maximum allowed size
- WARN-02 (0.0.0.0 binding warning) is always emitted together with WARN-01 (api_token warning) since WebAppJob hardcodes the bind address to 0.0.0.0 — no separate bind-address config exists
- `_emit_startup_warnings()` factored into a static method taking `(logger, config)` parameters, making it directly testable without starting threads or mocking the full Seedsync lifecycle

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added content_length = -1 to existing webhook tests that call _handle_webhook()**
- **Found during:** Task 1 verification run
- **Issue:** Existing tests in `TestWebhookHandlerRoutes` and `TestWebhookHandlerHmacVerification` that call `_handle_webhook()` do not set `mock_request.content_length`. After adding the content_length guard, `mock_request.content_length` returns a `MagicMock` object, and the `> _WEBHOOK_MAX_BODY_BYTES` comparison raises `TypeError: '>' not supported between instances of 'MagicMock' and 'int'`
- **Fix:** Added `mock_request.content_length = -1` to each existing test that calls `_handle_webhook()` (8 test methods across `TestWebhookHandlerRoutes` and `TestWebhookHandlerHmacVerification`). Value `-1` matches Bottle's sentinel for absent Content-Length header — semantically correct.
- **Files modified:** `src/python/tests/unittests/test_web/test_webhook_handler.py`
- **Verification:** All 28 webhook handler tests pass
- **Committed in:** `7063a03` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** The fix was a direct consequence of introducing the content_length guard — pre-existing mocks needed to specify a concrete integer value. No scope creep.

## Issues Encountered

Pre-existing unit test failures on macOS arm64 (unrelated to plan changes):
- `test_lftp`: Latin-1 filesystem byte sequence (macOS HFS+ restriction)
- `test_sshcp`: SSH connection tests (no remote server)
- `test_multiprocessing_logger`, `test_scanner_process`, `test_extract_process`: Process/threading timing
- Integration tests: `rar` binary not available on arm64 macOS

None of these are related to Plan 02 changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `_emit_startup_warnings()` is in place for Phase 50 — when Bearer token enforcement is added, the startup warning already tells operators to configure `api_token`
- Webhook size guard is live — Sonarr/Radarr always send Content-Length so the `-1` graceful-degradation path is a safety net only
- All 43 tests in affected files pass; full unit test suite passes (pre-existing failures are environment-specific and unrelated)

---
*Phase: 48-config-and-webhook-layer*
*Completed: 2026-02-26*

## Self-Check: PASSED

- FOUND: src/python/web/handler/webhook.py (contains _WEBHOOK_MAX_BODY_BYTES)
- FOUND: src/python/seedsync.py (contains _emit_startup_warnings, webhook_secret is not configured, No API token configured, 0.0.0.0)
- FOUND: src/python/tests/unittests/test_web/test_webhook_handler.py (28 tests pass)
- FOUND: src/python/tests/unittests/test_seedsync.py (15 tests pass)
- FOUND: commit 7063a03
- FOUND: commit e670f5d
