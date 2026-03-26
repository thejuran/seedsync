# S01: API Token Authentication

**Goal:** All /server/* API endpoints are protected by Bearer token auth, with SSE and webhook exemptions. The Angular SPA authenticates transparently via an injected meta tag token. Token is auto-generated on first run.
**Demo:** curl to /server/config/get without token → 401; with token → 200. Angular UI loads, all pages work, SSE streams deliver events, webhooks still work.

## Must-Haves

- /server/* endpoints return 401 without valid Bearer token
- /server/stream (SSE) is exempt from auth
- /server/webhook/* is exempt from auth
- Empty api_token config means all requests pass through (backward compat)
- Token auto-generated with secrets.token_urlsafe(32) on first run
- Token logged once at startup
- Token comparison uses hmac.compare_digest()
- Angular interceptor reads meta tag and attaches Bearer header
- Bottle injects <meta name="api-token"> into index.html at serve time

## Proof Level

- This slice proves: integration
- Real runtime required: yes (webtest + Angular unit tests)
- Human/UAT required: no (verified by tests)

## Verification

- `cd src/python && python -m pytest tests/unittests/test_web/test_auth.py -v` — auth hook unit tests
- `cd src/python && python -m pytest tests/unittests/test_seedsync.py -v` — token generation tests
- `cd src/python && python -m pytest tests/unittests/test_web/ -v` — all web tests still pass
- `cd src/angular && npx ng test --watch=false` — Angular unit tests including interceptor

## Observability / Diagnostics

- Runtime signals: Startup log "Security: API token configured — all /server/* endpoints require Bearer authentication" or existing warning for no-token
- Inspection surfaces: Startup log contains generated token on first run
- Failure visibility: 401 response body contains "Unauthorized" (no details leaked)
- Redaction constraints: Token value never appears in API responses or error messages; only in startup log and config file

## Integration Closure

- Upstream surfaces consumed: Config.General.api_token (Phase 48), _emit_startup_warnings() (Phase 48)
- New wiring introduced: before_request auth hook in WebApp, meta tag injection in __index(), Angular interceptor in app.config.ts
- What remains before milestone is truly usable end-to-end: S02 (CONF-04 fix, DNS rebinding), S03 (CSP hardening)

## Tasks

- [x] **T01: Backend auth middleware and token auto-generation** `est:45m`
  - Why: Core auth infrastructure — before_request hook, token validation, token generation, exemptions for SSE/webhooks
  - Files: `src/python/web/web_app.py`, `src/python/seedsync.py`, `src/python/common/config.py`, `src/python/tests/unittests/test_web/test_auth.py`, `src/python/tests/unittests/test_seedsync.py`
  - Do: Add before_request hook to WebApp that checks Authorization: Bearer on /server/* paths (except /server/stream and /server/webhook/*). Use hmac.compare_digest for comparison. Pass config to WebApp constructor so it can read api_token. In Seedsync._create_default_config(), generate token with secrets.token_urlsafe(32). Add startup log for configured token. Set request.auth_valid flag for downstream handlers. Write comprehensive unit tests using webtest TestApp.
  - Verify: `cd src/python && python -m pytest tests/unittests/test_web/test_auth.py tests/unittests/test_seedsync.py -v`
  - Done when: Auth hook rejects unauthenticated /server/* requests with 401, allows SSE/webhooks, allows all when no token configured, and all existing tests pass

- [x] **T02: Bottle meta tag injection for Angular token delivery** `est:30m`
  - Why: Angular's EventSource can't send headers, and the interceptor needs the token before any API call. Injecting via meta tag in index.html at serve time solves the bootstrap problem.
  - Files: `src/python/web/web_app.py`, `src/python/tests/unittests/test_web/test_web_app.py`
  - Do: Modify WebApp.__index() to read index.html from disk, inject `<meta name="api-token" content="TOKEN">` before </head>, and return the modified content with correct Content-Type. Cache the file content (read once at startup). When no token configured, inject empty content attribute. Write tests verifying meta tag presence and correctness.
  - Verify: `cd src/python && python -m pytest tests/unittests/test_web/test_web_app.py -v`
  - Done when: index.html served by Bottle contains the api-token meta tag with correct token value

- [x] **T03: Angular functional interceptor and integration verification** `est:45m`
  - Why: The Angular SPA must read the injected token and attach it to all HTTP requests transparently.
  - Files: `src/angular/src/app/services/utils/auth.interceptor.ts`, `src/angular/src/app/app.config.ts`, `src/angular/src/app/tests/unittests/services/utils/auth.interceptor.spec.ts`
  - Do: Create functional interceptor that reads token from `<meta name="api-token">` at module init. If token present, clone request with Authorization: Bearer header. Register via provideHttpClient(withInterceptors([authInterceptor])) in app.config.ts. Write unit tests mocking the meta tag and verifying header attachment. Verify all existing Angular tests still pass.
  - Verify: `cd src/angular && npx ng test --watch=false`
  - Done when: Interceptor attaches Bearer token to outgoing requests, skips when no token, and all Angular tests pass

## Files Likely Touched

- `src/python/web/web_app.py`
- `src/python/seedsync.py`
- `src/python/common/config.py`
- `src/python/web/web_app_builder.py`
- `src/python/tests/unittests/test_web/test_auth.py` (new)
- `src/python/tests/unittests/test_web/test_web_app.py`
- `src/python/tests/unittests/test_seedsync.py`
- `src/angular/src/app/services/utils/auth.interceptor.ts` (new)
- `src/angular/src/app/app.config.ts`
- `src/angular/src/app/tests/unittests/services/utils/auth.interceptor.spec.ts` (new)
