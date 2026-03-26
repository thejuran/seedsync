---
estimated_steps: 8
estimated_files: 7
---

# T01: Backend auth middleware and token auto-generation

**Slice:** S01 — API Token Authentication
**Milestone:** M002

## Description

Add a Bottle before_request hook that validates Bearer tokens on /server/* endpoints, with exemptions for SSE streams and webhooks. Auto-generate the token on first run using secrets.token_urlsafe(32). Set a request.auth_valid flag for downstream handlers (needed by S02 CONF-04 fix).

## Steps

1. Read `src/python/web/web_app.py` to understand hook registration and request flow
2. Add `config` parameter to WebApp constructor so it can access api_token
3. Add before_request hook that:
   - Skips non-/server/* paths (static files, frontend routes)
   - Skips /server/stream (SSE exemption, R003)
   - Skips /server/webhook/* (webhook exemption, R004)
   - If config.general.api_token is empty, sets request.auth_valid=True and passes through (R005)
   - Otherwise extracts Authorization header, parses "Bearer TOKEN", compares with hmac.compare_digest (R008)
   - Returns 401 HTTPResponse with body "Unauthorized" on failure
   - Sets bottle.request.auth_valid = True on success
4. Update WebAppBuilder to pass config to WebApp
5. In Seedsync._create_default_config(), generate api_token = secrets.token_urlsafe(32)
6. Update _emit_startup_warnings(): when token IS configured, log info "Security: API token configured — all /server/* endpoints require Bearer authentication"
7. Write test file `tests/unittests/test_web/test_auth.py` covering:
   - Request to /server/* without token → 401
   - Request with correct Bearer token → 200
   - Request with wrong token → 401
   - Request with malformed Authorization header → 401
   - SSE path /server/stream exempt → passes through
   - Webhook path /server/webhook/sonarr exempt → passes through
   - Empty api_token config → all requests pass through
   - request.auth_valid flag set correctly
8. Update test_seedsync.py for token auto-generation in default config

## Must-Haves

- [ ] before_request hook validates Bearer token on /server/* paths
- [ ] SSE (/server/stream) exempt from auth
- [ ] Webhooks (/server/webhook/*) exempt from auth
- [ ] Empty token = all pass through with auth_valid=True
- [ ] hmac.compare_digest used for comparison
- [ ] Token auto-generated in default config
- [ ] request.auth_valid flag set on authenticated requests
- [ ] All existing Python tests still pass

## Verification

- `cd src/python && python -m pytest tests/unittests/test_web/test_auth.py -v`
- `cd src/python && python -m pytest tests/unittests/ -v` (all unit tests pass)

## Observability Impact

- Signals added/changed: Startup log message when token is configured; 401 responses for unauthorized access
- How a future agent inspects this: Check startup logs for auth status; curl endpoints with/without token
- Failure state exposed: 401 Unauthorized response (no details leaked)

## Inputs

- `src/python/web/web_app.py` — WebApp class with after_request hook pattern
- `src/python/common/config.py` — Config.General.api_token field (exists)
- `src/python/seedsync.py` — _emit_startup_warnings() and _create_default_config()
- `src/python/web/web_app_builder.py` — constructs WebApp

## Expected Output

- `src/python/web/web_app.py` — Modified with before_request auth hook, config parameter
- `src/python/web/web_app_builder.py` — Modified to pass config to WebApp
- `src/python/seedsync.py` — Modified with token generation and startup message
- `src/python/tests/unittests/test_web/test_auth.py` — New test file (8+ tests)
