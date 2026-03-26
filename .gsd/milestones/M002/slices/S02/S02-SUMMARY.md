---
id: S02
parent: M002
milestone: M002
provides:
  - Conditional config redaction (authenticated=True skips redaction)
  - Host header validation in before_request (DNS rebinding prevention)
  - Config.General.allowed_hostname for reverse proxy support
  - ConfigHandler passes auth state to serializer
requires:
  - slice: S01
    provides: request.auth_valid flag from auth hook
affects: []
key_files:
  - src/python/web/serialize/serialize_config.py
  - src/python/web/handler/config.py
  - src/python/web/web_app.py
  - src/python/common/config.py
key_decisions:
  - "Combined host+auth into single before_request hook (Bottle only keeps last hook per name)"
  - "Host validation runs before auth — blocks DNS rebinding before auth is attempted"
patterns_established:
  - "authenticated parameter pattern for conditional serialization"
drill_down_paths:
  - .gsd/milestones/M002/slices/S02/S02-PLAN.md
duration: 25min
verification_result: passed
completed_at: 2026-03-25T21:15:00Z
---

# S02: CONF-04 Fix + DNS Rebinding Prevention

**Conditional config redaction for authenticated requests, Host header allowlist validation with configurable hostname**

## What Happened

Added an `authenticated` parameter to SerializeConfig.config() that skips field redaction when True. ConfigHandler reads request.auth_valid (set by S01's auth hook) and passes it through. Added Host header validation to the combined before_request hook — checks against {localhost, 127.0.0.1, [::1]} plus the user-configured allowed_hostname. Non-matching Host → 400. Added Config.General.allowed_hostname field with backward compat.

## Verification

- 4 new conditional redaction tests pass
- 8 new Host validation tests pass
- 271 total web+seedsync unit tests pass
- All existing redaction tests pass unchanged (default = redacted)

## Requirements Validated

- R009 — Host header validated against allowlist
- R010 — Non-allowlisted Host returns 400
- R011 — User-configurable allowed_hostname works
- R012 — Authenticated config GET returns unredacted values

## Deviations

- Discovered Bottle only keeps the last `@self.hook('before_request')` — had to combine host validation and auth into a single hook instead of separate hooks.

## Files Created/Modified

- `src/python/web/serialize/serialize_config.py` — authenticated parameter
- `src/python/web/handler/config.py` — passes auth_valid to serializer
- `src/python/web/web_app.py` — Host validation in combined hook
- `src/python/common/config.py` — allowed_hostname field
- `src/python/seedsync.py` — allowed_hostname in default config
- `src/python/tests/unittests/test_web/test_auth.py` — 8 Host validation tests
- `src/python/tests/unittests/test_web/test_serialize/test_serialize_config.py` — 4 conditional redaction tests

## Forward Intelligence

### What the next slice should know
- The before_request hook is now `_check_host_and_auth` — a single combined function. Any future hook additions need to go inside this function.
- Bottle hooks are per-name and the decorator overwrites, not appends. This is a known Bottle limitation.
