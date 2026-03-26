# M002: Finish v3.2 Security

**Vision:** Close all remaining v3.2 security gaps — API token authentication with transparent SPA auth, DNS rebinding prevention, CSP hardening with Angular autoCsp, and the CONF-04 Settings UI fix.

## Success Criteria

- Unauthenticated requests to /server/* endpoints receive 401
- Authenticated requests with valid Bearer token succeed normally
- SSE streams connect without auth errors (EventSource exempt)
- Webhooks work without Bearer token (HMAC auth unchanged)
- Fresh installs with no token allow all requests + log a startup warning
- Host header validation blocks DNS rebinding (non-allowlisted Host → 400)
- Reverse proxy setups work via user-configured allowed hostname
- CSP header contains no unsafe-inline in script-src or style-src
- Angular SPA functions fully under stricter CSP policy
- Browser console shows zero CSP violations during normal usage
- Settings UI displays actual config values, not **REDACTED**

## Key Risks / Unknowns

- **Token injection into static index.html** — Bottle serves index.html via static_file(); must switch to reading the file, injecting a meta tag, and returning modified content. Risk: cache/performance concerns, template injection bugs.
- **Angular autoCsp + esbuild builder** — autoCsp is relatively new (Angular 19 developer preview, stable in 21). Must verify hash generation works correctly with the esbuild application builder and doesn't conflict with Bottle's CSP header.

## Proof Strategy

- Token injection → retire in S01 by proving Angular UI reads token from meta tag, attaches Bearer header, and all API requests succeed
- autoCsp + esbuild → retire in S03 by proving the Angular app builds with autoCsp, loads in browser, and has zero CSP violations

## Verification Classes

- Contract verification: Python unit tests (auth hook, Host validation, token generation, conditional redaction); Angular unit tests (interceptor); build verification (autoCsp output)
- Integration verification: curl auth flows, Angular UI full-page navigation, SSE stream connectivity, webhook delivery
- Operational verification: Docker upgrade scenario — existing config without token continues to work
- UAT / human verification: Visual check that Settings page shows real values; browser console clean of CSP violations

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 16 active requirements (R001–R016) pass verification
- Auth middleware is wired into WebApp and exercised by real requests
- Angular interceptor reads injected token and attaches it to all API calls
- Settings UI displays unredacted config values and saves correctly
- CSP active with zero violations during normal usage
- Existing deployments without a token configured continue to work
- All existing tests pass (Python unit, Angular unit, E2E)

## Requirement Coverage

- Covers: R001, R002, R003, R004, R005, R006, R007, R008, R009, R010, R011, R012, R013, R014, R015, R016
- Partially covers: none
- Leaves for later: R017 (token display in Settings UI)
- Orphan risks: none

## Slices

- [x] **S01: API Token Authentication** `risk:high` `depends:[]`
  > After this: curl to /server/* without token gets 401; Angular UI loads, authenticates via injected Bearer token, and all pages work; SSE streams deliver events; webhooks still work without Bearer token
- [x] **S02: CONF-04 Fix + DNS Rebinding Prevention** `risk:medium` `depends:[S01]`
  > After this: Settings UI shows real config values (not **REDACTED**); Host header from unknown origin returns 400; reverse proxy hostname is configurable in settings
- [ ] **S03: CSP Hardening** `risk:medium` `depends:[S01]`
  > After this: CSP has no unsafe-inline; Angular app runs fully under strict hash-based CSP; zero CSP violations in browser console across all pages

## Boundary Map

### S01 → S02

Produces:
- `WebApp.before_request` auth hook that validates Bearer token on /server/* routes
- `_validate_token(config, request)` returning bool — uses hmac.compare_digest()
- Token exemption for paths: /server/stream, /server/webhook/*
- `Config.General.api_token` auto-populated on first run via secrets.token_urlsafe(32)
- `WebApp.__index()` modified to inject `<meta name="api-token" content="...">` into index.html
- Angular functional interceptor `authInterceptor` reading token from meta tag, attaching `Authorization: Bearer` header
- `provideHttpClient(withInterceptors([authInterceptor]))` in app.config.ts
- `bottle.request` carries auth state (e.g. request.auth_valid flag) for downstream handlers

Consumes:
- `Config.General.api_token` field (exists from Phase 48)
- `_emit_startup_warnings()` no-token warning (exists from Phase 48)

### S01 → S03

Produces:
- Stable, functional app with auth in place (S03 modifies CSP, needs app to be working to verify zero violations)

Consumes:
- nothing directly (S03 modifies build config and Bottle CSP header independently)

### S02 (standalone additions)

Produces:
- `Config.General.allowed_hostname` config field
- Host header validation in before_request hook (localhost, 127.0.0.1, [::1], configured hostname)
- `SerializeConfig.config(config, authenticated=False)` — conditional redaction parameter
- `ConfigHandler.__handle_get_config()` passes auth state to serializer

Consumes from S01:
- `request.auth_valid` flag set by auth hook (to determine whether to return unredacted config)
- Auth hook infrastructure (Host validation is added to the same before_request chain)

### S03 (standalone additions)

Produces:
- `angular.json` with `security.autoCsp: true`
- Built index.html containing `<meta http-equiv="Content-Security-Policy" content="...">` with SHA-256 hashes
- Modified Bottle after_request CSP header: only default-src, img-src, connect-src, font-src, frame-ancestors (no script-src, no style-src)
- Removal of 'unsafe-inline' from all CSP directives

Consumes from S01:
- Working auth flow (to exercise all pages and verify zero CSP violations)
