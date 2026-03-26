---
id: T01
parent: S01
milestone: M002
provides:
  - before_request auth hook in WebApp validating Bearer tokens on /server/*
  - SSE and webhook path exemptions
  - hmac.compare_digest timing-safe comparison
  - Token auto-generation via secrets.token_urlsafe(32) in default config
  - request.auth_valid flag for downstream handler use
affects: [S02]
key_files:
  - src/python/web/web_app.py
  - src/python/seedsync.py
  - src/python/web/web_app_builder.py
  - src/python/tests/unittests/test_web/test_auth.py
key_decisions:
  - "Config passed to WebApp constructor for auth hook access"
  - "Auth check runs in before_request — Bottle's hook mechanism, not custom middleware"
  - "bottle.abort(401) used for rejections — integrates with Bottle error handling"
patterns_established:
  - "request.auth_valid attribute pattern for cross-handler auth state"
drill_down_paths:
  - .gsd/milestones/M002/slices/S01/tasks/T01-PLAN.md
duration: 25min
verification_result: pass
completed_at: 2026-03-25T20:30:00Z
---

# T01: Backend auth middleware and token auto-generation

**before_request hook validates Bearer tokens on /server/* with SSE/webhook exemptions and timing-safe comparison; token auto-generated on first run**

## What Happened

Added a before_request hook to WebApp that validates Authorization: Bearer tokens on all /server/* paths. SSE (/server/stream) and webhooks (/server/webhook/*) are exempt. When no token is configured, all requests pass through for backward compatibility. Token comparison uses hmac.compare_digest. Default config now auto-generates a token with secrets.token_urlsafe(32). Startup warnings updated to log info when token IS configured.

## Deviations

None — implemented as planned.

## Files Created/Modified

- `src/python/web/web_app.py` — Added before_request auth hook, config parameter, AUTH_EXEMPT_PATHS/PREFIXES
- `src/python/web/web_app_builder.py` — Passes context.config to WebApp constructor
- `src/python/seedsync.py` — Auto-generate token in _create_default_config(), info log in _emit_startup_warnings()
- `src/python/tests/unittests/test_web/test_auth.py` — 19 new tests covering all auth scenarios
- `src/python/tests/unittests/test_seedsync.py` — Updated token generation tests, added startup info test
