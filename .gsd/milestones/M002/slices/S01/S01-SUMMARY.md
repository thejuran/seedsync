---
id: S01
parent: M002
milestone: M002
provides:
  - before_request auth hook validating Bearer tokens on /server/* with hmac.compare_digest
  - SSE (/server/stream) and webhook (/server/webhook/*) exemptions
  - Token auto-generation via secrets.token_urlsafe(32) on first run
  - request.auth_valid flag for downstream handler use
  - Dynamic meta tag injection of api-token into index.html at serve time
  - Angular functional interceptor reading token from meta tag, attaching Bearer header
requires:
  - slice: Phase48
    provides: Config.General.api_token field, _emit_startup_warnings()
affects:
  - S02
  - S03
key_files:
  - src/python/web/web_app.py
  - src/python/seedsync.py
  - src/python/web/web_app_builder.py
  - src/angular/src/app/services/utils/auth.interceptor.ts
  - src/angular/src/app/app.config.ts
  - src/python/tests/unittests/test_web/test_auth.py
  - src/python/tests/unittests/test_web/test_web_app.py
  - src/angular/src/app/tests/unittests/services/utils/auth.interceptor.spec.ts
key_decisions:
  - "Config passed to WebApp constructor for auth hook access"
  - "bottle.abort(401) for rejections — integrates with Bottle error handling"
  - "index.html cached at startup, meta tag injected per request"
  - "Functional interceptor over class-based — Angular recommendation"
  - "Token cached at module level in interceptor"
patterns_established:
  - "request.auth_valid attribute for cross-handler auth state propagation"
  - "Meta tag injection + interceptor pattern for SPA token delivery"
observability_surfaces:
  - "Startup log: 'Security: API token configured — all /server/* endpoints require Bearer authentication'"
  - "401 Unauthorized response on failed auth (no details leaked)"
drill_down_paths:
  - .gsd/milestones/M002/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002/slices/S01/tasks/T03-SUMMARY.md
duration: 55min
verification_result: passed
completed_at: 2026-03-25T21:00:00Z
---

# S01: API Token Authentication

**Bearer token auth on /server/* with SSE/webhook exemptions, auto-generated tokens, meta tag injection, and Angular interceptor**

## What Happened

Built the full API token authentication stack across Python backend and Angular frontend. The backend adds a before_request hook to Bottle that validates Authorization: Bearer tokens on all /server/* paths, with timing-safe comparison via hmac.compare_digest. SSE streams and webhook endpoints are exempt. When no token is configured, all requests pass through for backward compatibility. Default config now auto-generates a token with secrets.token_urlsafe(32). The Bottle index.html handler was modified to inject a `<meta name="api-token">` tag at serve time. The Angular frontend has a new functional interceptor that reads this meta tag, caches the token, and attaches it as a Bearer header to all HttpClient requests.

## Verification

- 19 Python auth middleware tests: all pass
- 12 Python meta tag injection tests: all pass
- 6 Angular interceptor tests: all pass
- 241 total Python web unit tests: all pass
- 400 total Angular unit tests: all pass

## Requirements Advanced

- R001 — Bearer token validation on /server/* endpoints: implemented and tested
- R002 — Token auto-generated with secrets.token_urlsafe(32): implemented and tested
- R003 — SSE stream exempt from token auth: implemented and tested
- R004 — Webhook endpoints exempt from token auth: implemented and tested
- R005 — No-token-configured allows all requests: implemented and tested
- R006 — Angular HttpClient interceptor sends Bearer token: implemented and tested
- R007 — Token injected into SPA via meta tag: implemented and tested
- R008 — Timing-safe token comparison: implemented (hmac.compare_digest) and tested

## Requirements Validated

- R001 — 19 unit tests cover authenticated/unauthenticated/wrong-token scenarios
- R002 — Tests verify token is non-empty, >30 chars, and unique per generation
- R003 — Tests verify /server/stream exempt from auth
- R004 — Tests verify /server/webhook/* exempt from auth
- R005 — Tests verify empty token = all pass through
- R006 — Angular tests verify Bearer header attached when token present
- R007 — Tests verify meta tag present in served index.html with correct value
- R008 — hmac.compare_digest used in code; timing safety is a code-level property

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None.

## Known Limitations

- Token is logged at startup but not yet visible in Settings UI (R017 deferred)
- index.html is cached at startup — if the Angular build changes while the server is running, a restart is needed (acceptable for production)

## Follow-ups

- S02 will use request.auth_valid to conditionally skip config redaction (CONF-04 fix)
- S02 will add Host header validation to the same before_request chain

## Files Created/Modified

- `src/python/web/web_app.py` — Auth hook, meta tag injection, index.html caching
- `src/python/web/web_app_builder.py` — Passes config to WebApp
- `src/python/seedsync.py` — Token auto-generation, startup info log
- `src/angular/src/app/services/utils/auth.interceptor.ts` — Functional interceptor
- `src/angular/src/app/app.config.ts` — withInterceptors registration
- `src/python/tests/unittests/test_web/test_auth.py` — 19 auth tests (new)
- `src/python/tests/unittests/test_web/test_web_app.py` — 12 meta tag tests (new)
- `src/angular/src/app/tests/unittests/services/utils/auth.interceptor.spec.ts` — 6 interceptor tests (new)

## Forward Intelligence

### What the next slice should know
- `request.auth_valid` is set as a boolean attribute on `bottle.request` by the before_request hook. S02 should read this in ConfigHandler to decide whether to return redacted or unredacted config.
- Host header validation should go in the same before_request hook — add it before the token check so DNS rebinding is blocked before auth is even attempted.

### What's fragile
- Meta tag injection uses string replace on `</head>` — if the Angular build ever outputs malformed HTML without `</head>`, injection silently fails and the interceptor won't have a token.

### Authoritative diagnostics
- `curl -v http://localhost:8800/server/status` without Authorization header → should get 401
- `curl -v http://localhost:8800/ | grep api-token` → should show the meta tag

### What assumptions changed
- None — all assumptions held.
