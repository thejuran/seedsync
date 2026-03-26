# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R001 — Bearer token validation on /server/* endpoints
- Class: compliance/security
- Status: active
- Description: Bottle before_request hook validates Authorization: Bearer token on all /server/* API endpoints. Invalid or missing tokens receive 401 Unauthorized.
- Why it matters: Prevents unauthorized access to the API from any network client.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-01 in v3.2 audit

### R002 — Token auto-generated with secrets.token_urlsafe(32)
- Class: compliance/security
- Status: active
- Description: API token is auto-generated on first run using secrets.token_urlsafe(32), written to config file, and logged once at startup.
- Why it matters: Ensures cryptographically strong token without requiring user to generate one manually.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-02 in v3.2 audit

### R003 — SSE stream exempt from token auth
- Class: compliance/security
- Status: active
- Description: The /server/stream SSE endpoint is exempt from Bearer token auth because EventSource cannot send custom headers.
- Why it matters: SSE is the real-time data backbone; blocking it would break the entire UI.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-03. Accepts read-only data leak risk as documented.

### R004 — Webhook endpoints exempt from token auth
- Class: compliance/security
- Status: active
- Description: /server/webhook/* endpoints are exempt from Bearer token auth. They use existing HMAC authentication.
- Why it matters: Sonarr/Radarr send webhooks and cannot be configured to send Bearer tokens.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-04

### R005 — No-token-configured allows all requests with warning
- Class: compliance/security
- Status: active
- Description: When no API token is configured (empty string), all requests are allowed through without authentication. A startup warning is logged.
- Why it matters: Backward compatibility — existing installs upgrading must not be locked out.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-05. Startup warning already exists from Phase 48.

### R006 — Angular HttpClient interceptor sends Bearer token
- Class: compliance/security
- Status: active
- Description: A functional Angular HTTP interceptor reads the API token and attaches Authorization: Bearer header to all API requests via HttpClient.
- Why it matters: Transparent auth for the SPA without modifying every service.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-06. Uses Angular withInterceptors() functional pattern.

### R007 — Token injected into SPA via meta tag in index.html
- Class: compliance/security
- Status: active
- Description: Bottle dynamically injects a <meta name="api-token" content="..."> tag into index.html at serve time. The Angular interceptor reads this.
- Why it matters: Avoids circular fetch (can't GET the token if the GET needs the token).
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-07. Requires intercepting __index() in WebApp to inject meta tag.

### R008 — Timing-safe token comparison
- Class: compliance/security
- Status: active
- Description: Token comparison uses hmac.compare_digest() to prevent timing side-channel attacks.
- Why it matters: Standard security practice for secret comparison.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-08

### R009 — Host header allowlist validation
- Class: compliance/security
- Status: active
- Description: before_request hook validates Host header against allowlist: localhost, 127.0.0.1, [::1], and user-configured hostname. Includes port stripping.
- Why it matters: Prevents DNS rebinding attacks that bypass same-origin policy.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to DNS-01

### R010 — Non-allowlisted Host returns 400 with no body
- Class: compliance/security
- Status: active
- Description: Requests with a Host header not in the allowlist receive 400 Bad Request with an empty body.
- Why it matters: Reveals no information to the attacker about the service.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to DNS-02

### R011 — User-configurable allowed hostname
- Class: compliance/security
- Status: active
- Description: User can configure an additional allowed hostname in settings (Config.General.allowed_hostname) for reverse proxy setups.
- Why it matters: Reverse proxy users need their domain to pass Host validation.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to DNS-03. New config field needed.

### R012 — Settings UI displays unredacted config for authed requests
- Class: primary-user-loop
- Status: active
- Description: When the request carries a valid Bearer token, GET /server/config/get returns unredacted values. Settings UI displays real values instead of **REDACTED**.
- Why it matters: The Settings page is broken without this — users see **REDACTED** and risk saving redacted values.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: M002/S01
- Validation: unmapped
- Notes: Maps to CONF-04. Depends on S01 auth being in place.

### R013 — Angular autoCsp generates hash-based CSP meta tag
- Class: compliance/security
- Status: active
- Description: Angular build uses security.autoCsp option in angular.json to generate SHA-256 hash-based CSP meta tag for inline scripts and styles.
- Why it matters: Eliminates need for unsafe-inline without server-side nonce logic.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to CSP-01. Verified compatible with esbuild application builder.

### R014 — Bottle CSP scoped to non-autoCsp directives only
- Class: compliance/security
- Status: active
- Description: Bottle after_request CSP header covers only directives not handled by autoCsp: default-src, img-src, connect-src, font-src, frame-ancestors. Does not set script-src or style-src (those come from autoCsp meta tag).
- Why it matters: Avoids conflicting with Angular-generated CSP. Dual CSP headers/meta tags are merged by the browser.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to CSP-02

### R015 — unsafe-inline removed from script-src and style-src
- Class: compliance/security
- Status: active
- Description: The final CSP policy (autoCsp meta + Bottle header combined) contains no 'unsafe-inline' in script-src or style-src.
- Why it matters: unsafe-inline defeats XSS protection; removing it is the whole point of CSP hardening.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to CSP-03

### R016 — Zero CSP violations during normal app usage
- Class: quality-attribute
- Status: active
- Description: No CSP violations appear in the browser console when visiting all pages: file list, settings, logs, about.
- Why it matters: CSP violations mean something is broken or blocked.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to CSP-04. Google Fonts external sources are kept in CSP allowlist.

## Validated

(none yet)

## Deferred

### R017 — Token visible in Settings UI for authenticated users
- Class: admin/support
- Status: deferred
- Description: The Settings page displays the API token (copyable) for authenticated sessions.
- Why it matters: Convenience for users who lose the startup log output.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — token is logged at first startup. Can be a quick follow-up.

## Out of Scope

### R018 — OAuth / multi-user authentication
- Class: anti-feature
- Status: out-of-scope
- Description: No multi-user auth, OAuth, or session management. Single shared token.
- Why it matters: Prevents scope creep into identity management for a single-user daemon.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Single-user self-hosted tool.

### R019 — HTTPS termination
- Class: constraint
- Status: out-of-scope
- Description: HTTPS is handled by the reverse proxy, not by SeedSync itself.
- Why it matters: Avoids certificate management complexity in the daemon.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Standard practice for self-hosted services behind nginx/traefik.

### R020 — Rate limiting
- Class: constraint
- Status: out-of-scope
- Description: No request rate limiting on API endpoints.
- Why it matters: Prevents over-engineering for a single-user tool.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Can be added at reverse proxy layer if needed.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | compliance/security | active | M002/S01 | none | unmapped |
| R002 | compliance/security | active | M002/S01 | none | unmapped |
| R003 | compliance/security | active | M002/S01 | none | unmapped |
| R004 | compliance/security | active | M002/S01 | none | unmapped |
| R005 | compliance/security | active | M002/S01 | none | unmapped |
| R006 | compliance/security | active | M002/S01 | none | unmapped |
| R007 | compliance/security | active | M002/S01 | none | unmapped |
| R008 | compliance/security | active | M002/S01 | none | unmapped |
| R009 | compliance/security | active | M002/S02 | none | unmapped |
| R010 | compliance/security | active | M002/S02 | none | unmapped |
| R011 | compliance/security | active | M002/S02 | none | unmapped |
| R012 | primary-user-loop | active | M002/S02 | M002/S01 | unmapped |
| R013 | compliance/security | active | M002/S03 | none | unmapped |
| R014 | compliance/security | active | M002/S03 | none | unmapped |
| R015 | compliance/security | active | M002/S03 | none | unmapped |
| R016 | quality-attribute | active | M002/S03 | none | unmapped |
| R017 | admin/support | deferred | none | none | unmapped |
| R018 | anti-feature | out-of-scope | none | none | n/a |
| R019 | constraint | out-of-scope | none | none | n/a |
| R020 | constraint | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 16
- Mapped to slices: 16
- Validated: 0
- Unmapped active requirements: 0
