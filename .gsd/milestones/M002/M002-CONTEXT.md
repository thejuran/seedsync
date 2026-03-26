# M002: Finish v3.2 Security — Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

## Project Description

SeedSync is a daemon that syncs files from a remote seedbox to a local server using lftp, with a web UI for monitoring and configuration. The v3.2 security hardening was partially completed (phases 47–49: config hardening, webhook layer, path traversal). This milestone completes the remaining work: API token authentication, DNS rebinding prevention, CSP hardening, and the CONF-04 Settings UI integration fix.

## Why This Milestone

The v3.2 security audit identified 32 requirements. 16 are satisfied from prior phases, 1 was partial (CONF-04), and 15 were unsatisfied. Without this milestone, the web UI is open to unauthenticated access and DNS rebinding attacks, the CSP allows unsafe-inline scripts, and the Settings UI displays **REDACTED** instead of real values.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Configure an API token that protects all /server/* endpoints from unauthorized access
- Access the web UI through a reverse proxy with a custom hostname without being blocked
- See zero CSP violation warnings in the browser console during normal usage
- View and edit correct (non-redacted) values in the Settings UI

### Entry point / environment

- Entry point: SeedSync web UI at http://localhost:8800 and API at /server/*
- Environment: Docker container or local dev (Python 3.12 + Angular 21)
- Live dependencies involved: Bottle web server, Angular SPA, SSE streams, Sonarr/Radarr webhook endpoints

## Completion Class

- Contract complete means: All 16 requirements pass unit/integration tests
- Integration complete means: Angular SPA authenticates via Bearer token, SSE streams work without auth headers, Settings UI displays real values, CSP active with zero violations
- Operational complete means: Existing Docker deployments upgrade without lockout (no-token = allow-all backward compat)

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- A curl request to /server/* without a Bearer token gets 401; with the correct token gets 200
- The Angular UI loads, authenticates transparently, and all pages function (files, settings, logs, about)
- SSE streams (model, status, log, heartbeat) connect and deliver events without auth errors
- Webhook POST from Sonarr/Radarr works without Bearer token
- Settings page displays actual config values (not **REDACTED**) and saves correctly
- Browser console shows zero CSP violations across all pages
- A fresh install with no token configured allows all requests with a startup warning

## Risks and Unknowns

- **SSE + auth** — EventSource API cannot send custom headers; SSE must be exempt from token auth. This is an accepted read-only data leak vector per AUTH-03.
- **Angular autoCsp + esbuild** — autoCsp generates hash-based CSP at build time; must verify it works with the esbuild application builder and doesn't conflict with Bottle's CSP header. Research confirms compatibility.
- **Token injection into static index.html** — Bottle serves Angular dist via static_file(); __index() must be modified to read index.html, inject meta tag, and return modified content instead of using static_file().
- **CSP dual-source behavior** — When both a meta tag (autoCsp) and HTTP header (Bottle) set CSP, browsers enforce the intersection. Bottle must NOT set script-src or style-src — only directives autoCsp doesn't cover.

## Existing Codebase / Prior Art

- `src/python/web/web_app.py` — Bottle app. Has after_request hook for CSP headers. __index() serves index.html via static_file(). before_request hook for auth goes here.
- `src/python/web/web_app_builder.py` — Central handler wiring. Passes context (with config) to WebApp.
- `src/python/common/config.py` — Config model. `Config.General.api_token` already exists (added Phase 48). Need to add `allowed_hostname`.
- `src/python/seedsync.py` — App entrypoint. `_emit_startup_warnings()` already warns about missing token. Token auto-generation on first run goes here.
- `src/python/web/serialize/serialize_config.py` — `SerializeConfig.config()` redacts sensitive fields. CONF-04 fix: conditionally skip redaction for authenticated requests.
- `src/python/web/handler/config.py` — ConfigHandler.__handle_get_config() calls SerializeConfig.config(). Needs to pass auth state for conditional redaction.
- `src/python/web/handler/webhook.py` — WebhookHandler with HMAC auth. Must be exempt from Bearer token auth.
- `src/angular/src/app/services/utils/rest.service.ts` — RestService wrapping HttpClient. Interceptor attaches to HttpClient via provideHttpClient(withInterceptors([...])).
- `src/angular/src/app/app.config.ts` — Angular app config with providers. Interceptor registration goes here.
- `src/angular/src/app/services/settings/config.service.ts` — ConfigService reads from API and populates BehaviorSubject. With unredacted API responses, this just works.
- `src/angular/src/index.html` — Static index.html. Meta tag injection target.
- `src/angular/angular.json` — Build config. `security.autoCsp: true` goes in architect.build.options.

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions.

## Implementation Decisions (from discussion)

- **CONF-04 approach:** Return unredacted config when request carries valid Bearer token. Keep redaction for unauthenticated/no-token mode.
- **Token lifecycle:** Auto-generate on first run with secrets.token_urlsafe(32). Write to config file. Log once at startup.
- **Token discovery:** Log at startup + display in Settings UI (deferred to R017).
- **Host allowlist default:** localhost, 127.0.0.1, [::1] only. User adds reverse proxy hostname via config.
- **External fonts:** Keep Google Fonts CDN in CSP allowlist.
- **Bootstrap JS:** Stays as-is — bundled into dist by esbuild, served from same origin, covered by script-src 'self'.

## Relevant Requirements

- R001–R008: API token authentication (S01)
- R009–R011: DNS rebinding prevention (S02)
- R012: CONF-04 Settings UI fix (S02)
- R013–R016: CSP hardening (S03)

## Scope

### In Scope

- Bearer token auth middleware (before_request hook)
- Auto-generation of token on first run
- Angular functional HTTP interceptor for Bearer token
- Token injection via index.html meta tag at serve time
- Host header validation with configurable allowlist
- allowed_hostname config field
- Conditional config redaction (unredacted for authed requests)
- autoCsp in angular.json
- Scoped Bottle CSP header (no script-src/style-src)
- Tech debt: test_server.py GET→POST fix, controller.persist chmod

### Out of Scope / Non-Goals

- OAuth / multi-user authentication
- HTTPS termination
- Rate limiting
- Session management

## Technical Constraints

- Bottle framework (before_request/after_request hooks, no middleware stack)
- EventSource cannot send custom headers (SSE auth exemption required)
- Angular 21 with esbuild application builder
- Backward compatible — empty api_token means open access
- CSP meta tag (autoCsp) + HTTP header (Bottle) = browser enforces both

## Integration Points

- Bottle before_request → token validation + Host header check
- Bottle __index() → index.html meta tag injection
- Bottle after_request → scoped CSP header (no script-src/style-src)
- Angular provideHttpClient(withInterceptors([authInterceptor]))
- Angular interceptor reads <meta name="api-token"> at init
- ConfigHandler.__handle_get_config() → conditional redaction based on auth state
- Docker entrypoint → no changes needed (token stored in config file)

## Open Questions

- None — all gray areas resolved during discussion.
