# Requirements: SeedSync v3.2 Security Hardening II

**Defined:** 2026-02-25
**Core Value:** Reliable file sync from seedbox to local with automated media library integration

## v3.2 Requirements

Requirements for v3.2 milestone. Each maps to roadmap phases.

### Path Safety

- [ ] **PATH-01**: File delete endpoint rejects filenames that resolve outside the configured local_path via realpath() + is_relative_to() check
- [ ] **PATH-02**: File extract endpoint rejects archive paths that resolve outside the configured local_path or output directory
- [ ] **PATH-03**: Path traversal attempts return 400 Bad Request with no path details in the error body

### Config Hardening

- [ ] **CONF-01**: Config file (settings.cfg) is written with 0600 permissions (owner read/write only)
- [ ] **CONF-02**: Existing config files with overly permissive permissions are fixed to 0600 on startup load
- [ ] **CONF-03**: API config endpoint redacts remote_address, remote_username, and remote_path in addition to existing password/API key redaction
- [ ] **CONF-04**: Settings UI continues to function correctly with additional fields redacted (uses local state, not API roundtrip for display)

### API Authentication

- [ ] **AUTH-01**: Bottle before_request hook validates Authorization: Bearer token on all /server/* API endpoints
- [ ] **AUTH-02**: API token is generated with secrets.token_urlsafe(32) and stored in config file
- [ ] **AUTH-03**: SSE stream endpoint is exempt from token auth (EventSource cannot send custom headers)
- [ ] **AUTH-04**: Webhook endpoints are exempt from token auth (use existing HMAC authentication)
- [ ] **AUTH-05**: When no token is configured, all requests are allowed (backward compatibility) with startup warning
- [ ] **AUTH-06**: Angular RestService sends Bearer token in Authorization header on all API requests via HttpClient interceptor
- [ ] **AUTH-07**: API token is injected into Angular SPA at serve time via meta tag in index.html (avoids circular fetch)
- [ ] **AUTH-08**: Token comparison uses hmac.compare_digest() for timing-safe validation

### Webhook Hardening

- [ ] **WHOOK-01**: Webhook endpoints reject payloads exceeding 1MB with 413 status before reading body
- [ ] **WHOOK-02**: Startup log emits WARNING when webhook_secret is not configured

### DNS Rebinding Prevention

- [ ] **DNS-01**: Before_request hook validates Host header against allowlist (localhost, 127.0.0.1, [::1], configured hostname)
- [ ] **DNS-02**: Requests with non-allowlisted Host header receive 400 Bad Request with no body
- [ ] **DNS-03**: User can configure an additional allowed hostname in settings for reverse proxy setups

### Endpoint Hygiene

- [ ] **ENDP-01**: Restart endpoint uses POST method instead of GET
- [ ] **ENDP-02**: Angular frontend sends restart request as POST (RestService update)

### Log Redaction

- [ ] **LOG-01**: SSH command logs redact user@host patterns from debug output
- [ ] **LOG-02**: SSE log stream does not expose SSH connection topology (user, host, path)
- [ ] **LOG-03**: Redaction pattern does not false-positive on non-SSH log lines (e.g., email addresses in unrelated context)

### CSP Hardening

- [ ] **CSP-01**: Angular build uses autoCsp option to generate hash-based Content-Security-Policy meta tag
- [ ] **CSP-02**: Bottle after_request CSP header is scoped to directives not covered by autoCsp (default-src, img-src, connect-src, font-src, frame-ancestors)
- [ ] **CSP-03**: unsafe-inline is removed from both script-src and style-src directives
- [ ] **CSP-04**: No CSP violations in browser console during normal app usage (file list, settings, logs, about pages)

### Startup Warnings

- [ ] **WARN-01**: Startup log emits WARNING when no API token is configured
- [ ] **WARN-02**: Startup log emits WARNING when app is bound to 0.0.0.0 without API token
- [ ] **WARN-03**: Startup warnings do not block application startup

## Future Requirements

Deferred to future milestone.

### SSRF Hardening

- **SSRF-01**: Outbound SSRF validation resolves DNS once and pins the IP for the subsequent HTTP request (resolve-once pattern)
- **SSRF-02**: Custom HTTPAdapter subclass prevents DNS rebinding TOCTOU between validation and connection

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full login UI (username + password form) | Over-engineered for single-user self-hosted; static token is ecosystem standard (Sonarr, Radarr, Jellyfin) |
| JWT tokens with expiry/refresh | No benefit over static token for single-user app; adds library dependency and complexity |
| IP allowlisting as primary auth | IPs change; use reverse proxy for IP restriction instead of application code |
| Nonce-based CSP (server-side injection) | Conflicts with static Angular SPA serving; autoCsp hash-based approach is correct for Bottle + Angular |
| SSRF resolve-once DNS fix | High complexity (custom HTTP adapter); marginal ROI when Sonarr/Radarr are always localhost |
| Rate limiting on every endpoint | Cargo-cult security for single-user app; existing bulk endpoint limits are sufficient |
| Persistent audit log | Over-engineering for personal tool; structured application logging is sufficient |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PATH-01 | — | Pending |
| PATH-02 | — | Pending |
| PATH-03 | — | Pending |
| CONF-01 | — | Pending |
| CONF-02 | — | Pending |
| CONF-03 | — | Pending |
| CONF-04 | — | Pending |
| AUTH-01 | — | Pending |
| AUTH-02 | — | Pending |
| AUTH-03 | — | Pending |
| AUTH-04 | — | Pending |
| AUTH-05 | — | Pending |
| AUTH-06 | — | Pending |
| AUTH-07 | — | Pending |
| AUTH-08 | — | Pending |
| WHOOK-01 | — | Pending |
| WHOOK-02 | — | Pending |
| DNS-01 | — | Pending |
| DNS-02 | — | Pending |
| DNS-03 | — | Pending |
| ENDP-01 | — | Pending |
| ENDP-02 | — | Pending |
| LOG-01 | — | Pending |
| LOG-02 | — | Pending |
| LOG-03 | — | Pending |
| CSP-01 | — | Pending |
| CSP-02 | — | Pending |
| CSP-03 | — | Pending |
| CSP-04 | — | Pending |
| WARN-01 | — | Pending |
| WARN-02 | — | Pending |
| WARN-03 | — | Pending |

**Coverage:**
- v3.2 requirements: 32 total
- Mapped to phases: 0
- Unmapped: 32 (awaiting roadmap)

---
*Requirements defined: 2026-02-25*
*Last updated: 2026-02-25 after initial definition*
