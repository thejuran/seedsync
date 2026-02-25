# Feature Research

**Domain:** Self-hosted file sync app security hardening (Python/Bottle backend, Angular 19 frontend)
**Researched:** 2026-02-25
**Confidence:** HIGH (table stakes, architecture dependencies), MEDIUM (CSP autoCsp interaction with Bootstrap/Bottle), LOW (SSRF resolve-once ROI)

## Context

This is a **subsequent milestone** on SeedSync v3.2 Security Hardening II. The goal is closing remaining gaps identified by a Huntarr-inspired audit. Features below are evaluated against:

- **Existing stack**: Python/Bottle backend, Angular 19 SPA frontend, Docker deployment, single-user self-hosted
- **Already shipped**: HMAC webhook auth, credential redaction in API responses, SSRF URL validation, security headers (CSP with unsafe-inline, X-Frame-Options, X-Content-Type-Options), POST/DELETE for mutations, SSH TOFU host key verification, getMessage() log scrubbing, 10 req/s rate limiting on bulk endpoints
- **Target audience**: Single user, self-hosted, likely on local network or behind VPN — not multi-tenant SaaS

The Huntarr audit revealed that self-hosted Python apps share a class of critical defects: auth bypass on config/settings endpoints, path traversal in file operations, credential disclosure in API responses, and injection in shell commands. SeedSync v3.1 closed most of these. v3.2 closes the remainder.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that security-conscious self-hosters assume exist. Missing these = the app is objectively insecure and unfit for internet exposure.

| Feature | Why Expected | Complexity | Architecture Notes |
|---------|--------------|------------|-------------------|
| Path traversal protection on file operations | Delete and extract endpoints accept user-supplied filenames. Without resolving symlinks and checking that the resolved path stays within the allowed base directory, attackers can escape the sync root. This is a critical severity class (cf. Huntarr shutil.rmtree via traversal). | LOW | Apply `pathlib.Path(base_dir / user_input).resolve().is_relative_to(base_dir.resolve())` to `/api/file/delete` and `/api/file/extract`. Python 3.9+ `is_relative_to()` is available (project requires 3.11+). Raise `400 Bad Request` on violation; do not reveal the resolved path in the error body. |
| Config file written with restrictive permissions | Config file contains LFTP credentials, Sonarr/Radarr API keys, webhook secret. Written world-readable (0644 default), any process on the host can read it. 0600 is the minimum for secrets-containing files. | LOW | Python `os.open(path, flags, 0o600)` opener or `os.chmod(path, 0o600)` after write. Apply on every config save. Also check startup — if config already exists at wrong permissions, fix on load. Docker containers often run as root, so 0600 still matters for world-readability. |
| API token authentication middleware | Self-hosted tools that expose any config write API without auth are a known attack class. The Huntarr critical finding was: `POST /api/settings/general` required no login, no session, no API key. Single-user apps use a static token in config rather than login flows. | MEDIUM | Bottle `before_request` hook checks `Authorization: Bearer <token>` header. Token stored in config, generated with `secrets.token_urlsafe(32)`. Exempt routes must be explicitly listed: webhook POST endpoints (HMAC-authenticated separately), SSE stream (EventSource API cannot set custom headers). If no token is configured, allow all requests but emit a startup warning. |
| Webhook endpoint hardening (payload size + startup warning) | Current HMAC auth skips verification when `webhook_secret` is empty (backward compat). Webhook endpoints have no payload size limit, enabling DoS via oversized body. Industry standard: reject payloads > 1MB before reading body; warn at startup when secret unconfigured. | LOW | Add `Content-Length` check before reading body in webhook handlers. Emit `logging.warning()` at startup if secret is empty. Rate limit already applies to bulk endpoints — confirm webhook routes are included. Keep HMAC-or-skip behavior, but the warning makes the insecurity visible to operators. |
| Config info disclosure fixes (remote host/username/path) | Remote host, username, and path reveal the attack surface of the seedbox. They should join password/API key fields in the redaction list. This closes a partial disclosure gap: v3.1 redacted credentials but not the connection topology. | LOW | Extend the existing serialization-layer redaction (established in v3.1) to also redact `remote_host`, `remote_username`, `remote_path`. Use the established `**REDACTED**` placeholder. Angular Settings page must not rely on API roundtrip to populate these fields for display — use local config state. |
| SSH command log redaction (user@host scrubbing) | SSH connection strings in logs expose remote credentials and network topology. Extends existing `getMessage()` log scrubbing, which already handles LFTP password patterns. | LOW | Add SSH pattern `r'\b\w+@[\w\.\-]+\b'` to the existing getMessage() filter. Test against: `ssh user@host`, `lftp -u user,pass sftp://host`, pexpect spawned command output. The pattern must not redact email addresses in unrelated log messages — scope to lines containing SSH/LFTP invocation strings. |
| Restart endpoint changed to POST | If the restart endpoint remains a GET, it is vulnerable to CSRF (malicious page loads `<img src="http://seedsync.local/api/restart">`). Moving it to POST closes this. Note: once Bearer token auth is in place, CSRF is structurally eliminated for authenticated endpoints (browsers cannot set Authorization header cross-origin). But the endpoint change is a safe, low-effort hardening regardless. | LOW | Single route change in Bottle handler. Angular must update the RestService helper from `GET` to `POST`. Test via the existing unit test suite. |

### Differentiators (Meaningful Beyond Baseline)

Features that go beyond "not embarrassingly insecure" and reflect that the developer takes security seriously. Valued by security-aware self-hosters.

| Feature | Value Proposition | Complexity | Architecture Notes |
|---------|-------------------|------------|-------------------|
| CSP without `unsafe-inline` (hash-based via Angular autoCsp) | Angular 19 introduced `autoCsp` in `angular.json` as a Developer Preview. Computes SHA-256 hashes of all static inline `<style>` and `<script>` blocks at build time and injects them into a `<meta>` CSP tag in `index.html`. Eliminates `unsafe-inline` from `style-src` and `script-src` without server-side nonce injection — ideal for a Bottle app serving a static Angular dist. | MEDIUM | Enable `"security": { "autoCsp": true }` in `angular.json` under the build target. The Bottle `after_request` CSP header must be updated: either align it with the hash-based policy (unmaintainable — hashes change per build), or scope the header to directives autoCsp does not cover (`default-src`, `img-src`, `connect-src`, `frame-ancestors`) and let autoCsp handle `script-src`/`style-src` via meta tag. Risk: Bootstrap 5.3 injects some inline styles; the CRT scan-line overlay uses inline CSS — these may produce violations. autoCsp is Developer Preview status in Angular 19. |
| DNS rebinding prevention (Host header validation) | A malicious website can redirect its DNS to `127.0.0.1` after browser DNS caching, allowing cross-origin JS to reach the local SeedSync instance. Fix: validate the `Host` header on every inbound request and reject anything that does not match the configured hostname or `localhost`/`127.0.0.1`/`[::1]`. Same class of fix applied to MCP Python SDK (CVE-2025-66416). | LOW-MEDIUM | Add to the `before_request` hook alongside API token auth. Allowlist: `localhost`, `127.0.0.1`, `[::1]`, and optionally a user-configured external hostname. Return `400 Bad Request` (no body) for Host header violations. This is an inbound protection; it complements but does not replace the existing outbound SSRF protection. |
| Startup security warning for insecure configuration | Emit prominent `logging.warning()` at startup when: no API token configured, webhook secret empty, app is bound to `0.0.0.0` without auth. Widely used in self-hosted ecosystem (Home Assistant, Frigate, Portainer) to guide operators toward secure configuration without blocking operation. | LOW | In `seedsync.py` startup, after loading config, check each insecure condition and emit a warning. Do not block startup. This is low effort and builds trust with security-conscious users who review logs. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Better Alternative |
|---------|---------------|-----------------|-------------------|
| Full login UI (username + password form) | "Real" apps have login pages | Single-user self-hosted tools do not need multi-user auth. A login form means session management, password hashing, brute-force protection, logout, session expiry — massive surface area. Huntarr's critical auth bypass started with an overcomplicated auth system that had gaps. | Static API token in config. User sets it once. All API calls include `Authorization: Bearer <token>`. Simple, auditable, no session state. |
| JWT tokens with expiry and refresh | JWT is the industry default for APIs | For a single-user self-hosted app, token expiry creates friction with zero security benefit — the user IS the only user. JWTs add parsing complexity and a jwt library dependency. The main JWT benefit (stateless verification in distributed systems) is irrelevant here. | Static `secrets.token_urlsafe(32)` stored in config. Verified with `hmac.compare_digest()`. Zero library dependencies beyond stdlib. |
| IP allowlisting as primary auth | "Only my IP can access it" | IPs change (VPNs, ISP rotations, dynamic addresses). IP allowlisting requires ongoing maintenance and gives false security (shared IPs, VPN exit nodes, spoofing). | Bearer token auth as primary. IP restriction as defense-in-depth via reverse proxy (nginx, Traefik), not application code. |
| Nonce-based CSP (server-side nonce injection) | Nonce-based is the "correct" strict CSP approach | Requires Bottle to generate a random nonce per request, inject it into `index.html` response AND set it in the CSP header. SeedSync serves Angular's static `index.html` as a file — adding nonce injection means templating `index.html` on every request, losing static file serving benefits, adding per-request string manipulation, and requiring Angular's `ngCspNonce` attribute which needs SSR support. SeedSync does not use SSR. | Hash-based autoCsp (Angular 19 build option). Computes hashes at build time, no server-side logic needed. Perfect fit for static Angular + Bottle architecture. |
| SSRF resolve-once DNS fix for Sonarr/Radarr | Closes TOCTOU between URL validation and request | The existing SSRF protection validates that Sonarr/Radarr URLs don't point to private IP ranges before making requests. The resolve-once fix prevents DNS rebinding between validation and connection time. However: Sonarr/Radarr are always localhost services for SeedSync's use case. The attack requires an attacker who controls DNS and has already reached the SeedSync network — at which point the threat model has already been compromised. Implementation is genuinely hard (custom HTTP adapter or socket override; `requests` library does not support "connect to pre-resolved IP"). | Accept the theoretical risk. Add documentation noting that Sonarr/Radarr URLs should always be localhost. If general SSRF protection for arbitrary URLs is needed in a future version, revisit then. |
| Rate limiting on every endpoint | "Security means rate limiting everything" | Rate limiting SSE reconnects causes reliability issues. Rate limiting the file list endpoint breaks normal usage when files churn. Blanket rate limiting is cargo-cult security for a single-user app. | Rate limit only: webhook POST endpoints, config write endpoints. The existing 10 req/s limit on bulk action endpoints is appropriate. SSE and read endpoints do not need rate limiting. |
| Persistent tamper-evident audit log | Compliance-grade audit trail | SeedSync is a personal tool. A separate audit database introduces a new write path that can fail, requires rotation, and adds storage management overhead. Compliance tooling for a single-user homelab app is over-engineering. | Structured application logging at appropriate levels (INFO for user actions, WARNING for security events). Existing Python logging infrastructure already serves this purpose. |

---

## Feature Dependencies

```
[API Token Auth Middleware]
    └──required by──> [All config write endpoints]
    └──required by──> [File delete/extract endpoints]
    └──exempts──> [Webhook POST endpoints] (HMAC-authenticated separately)
    └──exempts──> [SSE stream] (EventSource cannot set custom headers)
    └──enables──> [CSRF structural elimination] (Bearer in Authorization header = no CSRF)

[Path Traversal Protection]
    └──applies to──> [/api/file/delete]
    └──applies to──> [/api/file/extract]
    └──independent of──> [API Token Auth] (orthogonal layers — traversal can occur even with auth)

[Config Permissions 0600]
    └──applies at──> [Startup config write]
    └──applies at──> [Every config save]
    └──independent of all other features]

[Webhook Hardening]
    └──enhances──> [Existing HMAC webhook auth]
    └──does NOT require──> [API Token Auth] (webhook uses HMAC, not Bearer token)
    └──adds──> [Payload size limit, startup warning]

[CSP autoCsp (hash-based)]
    └──requires──> [Angular 19 build system] (already present)
    └──conflicts with──> [Nonce-based CSP] (choose one approach)
    └──requires update to──> [Bottle after_request CSP header] (must be reconciled with meta tag policy)

[DNS Rebinding Prevention]
    └──implemented in──> [before_request hook] (same hook as API Token Auth)
    └──independent of──> [SSRF outbound protection] (inbound vs outbound)
    └──does NOT replace──> [API Token Auth] (defense-in-depth, not a substitute)

[SSH Log Redaction]
    └──extends──> [Existing getMessage() log scrubbing]
    └──independent of all other features]

[Config Info Disclosure Fixes]
    └──extends──> [Existing serialization-layer redaction]
    └──independent of all other features]

[Restart Endpoint POST]
    └──enhances──> [Existing POST/DELETE mutation pattern from v3.1]
    └──made redundant by──> [API Token Auth] (but still good hygiene)
```

### Dependency Notes

- **API Token Auth exempts SSE**: The SSE `/api/serverevents` endpoint uses `EventSource` API in Angular, which cannot set custom request headers. Options: (a) exempt SSE entirely if the stream contains only file status data and no credentials — pragmatic and correct for this app; (b) require a short-lived query-param token; (c) use a cookie. Option (a) is recommended — SSE stream contains file names and status codes, not secrets.
- **CSP autoCsp vs existing Bottle header**: The Bottle `after_request` hook sets a `Content-Security-Policy` HTTP header. If autoCsp adds a `<meta>` CSP tag to `index.html`, both apply — per spec, the browser enforces the more restrictive union of both policies. The Bottle header should be scoped to directives that autoCsp does not cover (`default-src`, `img-src`, `connect-src`, `frame-ancestors`) to avoid maintaining hashes in the header.
- **CSRF solved by Bearer tokens**: With Bearer token auth in the Authorization header, CSRF is structurally impossible for authenticated endpoints — browsers enforce CORS and cannot set Authorization header cross-origin. The restart endpoint POST change is belt-and-suspenders good practice, but it becomes moot once auth middleware is in place.
- **Path traversal is independent of auth**: An authenticated user could still trigger path traversal if they are malicious or if the app were XSS-attacked. Traversal protection and auth middleware are orthogonal — both are needed.

---

## v3.2 Milestone Prioritization

This is a security hardening milestone, not a greenfield MVP. Prioritized by risk-reduction value per implementation effort:

### Must Ship in v3.2 (High Risk, Low-Medium Effort)

- [ ] Path traversal protection — two endpoints, one utility function; critical severity class if absent
- [ ] Config file permissions 0600 — single-line fix; eliminates credential file exposure
- [ ] API token authentication middleware — medium effort; closes largest remaining attack surface
- [ ] Webhook hardening (payload size limit + startup warning) — extends existing code
- [ ] Config info disclosure fixes (redact remote host/username/path) — extends existing redaction
- [ ] SSH command log redaction — extends existing getMessage() filter
- [ ] Restart endpoint changed to POST — single route change

### Add If Scope Allows (Medium Effort, Meaningful Improvement)

- [ ] Startup security warnings for all insecure conditions — low effort, high trust signal
- [ ] DNS rebinding prevention (Host header validation) — before_request hook, straightforward implementation
- [ ] CSP autoCsp (hash-based Angular build option) — Developer Preview status, needs validation against Bootstrap inline styles

### Defer Beyond v3.2 (High Complexity, Questionable ROI)

- [ ] SSRF resolve-once DNS fix for Sonarr/Radarr — high implementation complexity; threat model impact is marginal when Sonarr/Radarr are always localhost services
- [ ] Nonce-based CSP with server-side injection — requires SSR or per-request index.html templating; conflicts with static file serving

---

## Feature Prioritization Matrix

| Feature | Risk Reduction | Implementation Cost | Priority |
|---------|---------------|---------------------|----------|
| Path traversal protection | HIGH (critical severity) | LOW | P1 |
| Config file permissions 0600 | MEDIUM (credential file exposure) | LOW | P1 |
| API token authentication | HIGH (unauthenticated config API) | MEDIUM | P1 |
| Webhook hardening additions | MEDIUM (DoS surface) | LOW | P1 |
| Config info disclosure fixes | MEDIUM (topology exposure) | LOW | P1 |
| SSH log redaction | MEDIUM (credential in logs) | LOW | P1 |
| Restart endpoint POST | LOW (CSRF on one endpoint) | LOW | P1 |
| Startup security warnings | LOW (operational visibility) | LOW | P2 |
| DNS rebinding prevention | MEDIUM (browser-based local network attack) | LOW-MEDIUM | P2 |
| CSP autoCsp hash-based | LOW-MEDIUM (tightens XSS defense) | MEDIUM | P2 |
| SSRF resolve-once fix | LOW (marginal for localhost services) | HIGH | P3 |

**Priority key:**
- P1: Must have for v3.2 — closes known audit findings, high risk reduction per effort
- P2: Should have — meaningful improvement, add when P1 scope is complete
- P3: Defer — high complexity or questionable ROI for this use case and threat model

---

## Implementation Guidance: The Four Key Questions

### 1. API Token Auth for Single-User Self-Hosted Apps

**Pattern used by Sonarr, Radarr, Jellyfin, Home Assistant, and most *arr ecosystem tools**: static token in config, sent as `Authorization: Bearer <token>` or `X-Api-Key: <token>` header on every request.

**Implementation for Bottle**:

```python
# In web/app.py (before_request hook)
EXEMPT_ROUTES = frozenset({
    '/api/webhook/sonarr',
    '/api/webhook/radarr',
    '/api/serverevents',  # EventSource cannot set headers
})

@app.hook('before_request')
def require_auth():
    if bottle.request.path in EXEMPT_ROUTES:
        return
    token = config.get_api_token()
    if not token:
        return  # No token configured = open; startup warning handles this
    header = bottle.request.environ.get('HTTP_AUTHORIZATION', '')
    if not header.startswith('Bearer '):
        bottle.abort(401, 'Unauthorized')
    provided = header[len('Bearer '):]
    if not hmac.compare_digest(provided.encode(), token.encode()):
        bottle.abort(401, 'Unauthorized')
```

Token generation at first run (or via config): `secrets.token_urlsafe(32)`. Store in config file alongside other settings. No JWT, no login form, no session management.

**Angular side**: Store token in `localStorage`. RestService sends it in every API request via an HttpClient interceptor. Angular `EventSource` for SSE is exempt — no changes needed if SSE stream is credential-free.

**Confidence**: HIGH — this pattern is verified in the Huntarr audit findings, documented in Sonarr/Radarr architecture, and aligned with OWASP single-user API guidance.

### 2. Path Traversal Prevention

**Modern Python approach**: `pathlib.Path.resolve()` + `Path.is_relative_to()` (Python 3.9+). Available in this project (Python 3.11+ required).

```python
from pathlib import Path

def safe_path(base_dir: str, user_filename: str) -> Path:
    """Resolve user-supplied filename within base_dir.
    Raises ValueError on path traversal attempt."""
    base = Path(base_dir).resolve()
    candidate = (base / user_filename).resolve()
    if not candidate.is_relative_to(base):
        raise ValueError(f"Path traversal detected")
    return candidate
```

Apply to: `/api/file/delete` and `/api/file/extract`. Return `400 Bad Request` on `ValueError` — do not include the resolved path or user input in the error body (information disclosure). Unit test with: `../../../etc/passwd`, `..%2F..%2Fetc%2Fpasswd`, absolute paths (`/etc/passwd`), symlinks pointing outside base.

**Do NOT use `os.path.commonprefix`** — it is a string prefix check, not a path semantics check (`/var/fo` is a prefix of `/var/foo` but is not a parent directory). Use `is_relative_to()` which understands path boundaries.

**Confidence**: HIGH — `pathlib.Path.is_relative_to()` is the documented Python 3.9+ standard. Verified against OpenStack security guidelines and multiple security sources.

### 3. Webhook Endpoint Security Defaults

**Already done (v3.1)**: HMAC-SHA256 with `hmac.compare_digest()` timing-safe comparison, skip verification when secret is empty (backward compat).

**What to add in v3.2**:

1. **Payload size limit**: Check `Content-Length` before reading body. Reject `> 1MB` with `413 Request Entity Too Large`. Prevents memory exhaustion DoS. Apply before any body parsing.

2. **Startup warning**: `logging.warning("Webhook secret not configured — HMAC signature verification is disabled")` in `seedsync.py` after config load. Do not block startup.

3. **Confirm rate limiting applies**: Verify the existing 10 req/s rate limiter covers webhook routes, not just bulk action endpoints.

4. **Do not add**: Replay timestamp window (complex, and webhooks come from trusted local services), IP allowlisting in app code (fragile, use reverse proxy), strict payload schema validation (Sonarr/Radarr payload schemas evolve — strict validation causes false rejections on app updates).

**Confidence**: HIGH — HMAC with timing-safe comparison is industry consensus. Size limit and startup warning are low-risk additions confirmed by webhook security best practices.

### 4. CSP Without `unsafe-inline` for Angular SPAs

**Approach**: Hash-based autoCsp via Angular 19 build option (Developer Preview as of Angular 19.x).

Enable in `angular.json` under the build target:
```json
{
  "projects": {
    "seedsync": {
      "architect": {
        "build": {
          "options": {
            "security": {
              "autoCsp": true
            }
          }
        }
      }
    }
  }
}
```

Angular CLI computes SHA-256 hashes of all static inline `<style>` and `<script>` blocks and adds them to a `<meta http-equiv="Content-Security-Policy">` tag in `index.html`. No server-side logic required.

**Bottle header reconciliation**: The existing after_request CSP header must be updated. Recommended approach: scope the Bottle header to directives that autoCsp does not cover:
- `default-src 'self'`
- `img-src 'self' data:`
- `connect-src 'self'` (SSE endpoint)
- `font-src 'self' https://fonts.gstatic.com` (Google Fonts CDN)
- `style-src-attr 'none'` (no inline style attributes)
- `frame-ancestors 'none'`

Remove `script-src` and `style-src` from the Bottle header — let autoCsp's meta tag policy govern those. Per spec, the browser intersects header and meta tag policies; removing those directives from the header means the meta tag's hash-based policy is the only policy for those directives.

**Known risks to validate**:
- Bootstrap 5.3 injects some inline `<style>` blocks — autoCsp should hash these, but test in Chrome DevTools
- CRT scan-line overlay uses inline CSS — may need to be extracted to a stylesheet
- Google Fonts CDN: `style-src` must allow fonts.googleapis.com (for `@import` in CSS)
- autoCsp is Developer Preview — behavior may change before Angular 19 stable

**Nonce-based alternative** (do not use): Requires SeedSync to template `index.html` on every request, generating a new nonce and injecting it into both the HTML attribute (`ngCspNonce`) and the CSP header. This conflicts with static file serving and requires SSR infrastructure. Not worth it for a Bottle-served SPA.

**Confidence**: MEDIUM — autoCsp feature existence verified across multiple Angular 19 sources. Interaction with Bootstrap 5.3 inline styles and the CRT overlay requires hands-on validation during implementation.

---

## Self-Hosted App Security Ecosystem Comparison

How common self-hosted Python apps handle the same concerns, to confirm SeedSync's approach is ecosystem-appropriate:

| Feature | Sonarr/Radarr | Home Assistant | Frigate | SeedSync v3.2 Target |
|---------|---------------|----------------|---------|----------------------|
| API auth | Static API key in `X-Api-Key` header | Long-lived access tokens (Bearer) | Bearer token in config | Bearer token in config |
| Path traversal | Allowlist-based filename validation + OS restrictions | Path normalization + OS permissions | Static file serving only | `Path.resolve()` + `is_relative_to()` |
| Config permissions | Application-managed (varies) | 0600 on `secrets.yaml` | Docker volume | 0600 on config file |
| Webhook auth | API key required in webhook URL | Signed payloads | None (local only) | HMAC-SHA256 (existing) + payload size limit |
| CSP | Moderate (`unsafe-inline` present) | Strict nonce-based (SSR) | Minimal | Hash-based autoCsp (target) |
| Log redaction | Partial | Built-in sensitive data scrubbing | Minimal | `getMessage()` filter (existing) + SSH extension |
| Startup warnings | Partial | Yes — extensive security warnings | No | Yes (new in v3.2) |

**Key insight**: The industry standard for self-hosted single-user apps is a **static Bearer token** configured once, validated on every request, with no login UI. SeedSync targeting this pattern aligns with ecosystem expectations. The Huntarr controversy demonstrated that the alternative — complex auth systems with gaps — is more dangerous than a simple token.

---

## Sources

- [Huntarr Security Review (rfsbraz/huntarr-security-review)](https://github.com/rfsbraz/huntarr-security-review/blob/main/Huntarr.io_SECURITY_REVIEW.md) — Real-world audit of a self-hosted Python app with identical vulnerability classes: path traversal via shutil.rmtree, auth bypass on settings endpoints, credential disclosure
- [Angular 19 and CSP (Medium, alyshovtapdig)](https://alyshovtapdig.medium.com/angular-19-and-content-security-policy-csp-en-5b49af4a7938) — autoCsp feature documentation and angular.json configuration
- [Hash-based CSP in Angular (Medium, JavaScript everyday)](https://medium.com/javascript-everyday/hash-based-csp-in-angular-boosting-security-with-simple-configuration-98bf0308322a) — Implementation walkthrough for hash-based vs nonce-based CSP
- [Angular Security Best Practices (angular.dev)](https://angular.dev/best-practices/security) — Official Angular CSP guidance including CSP_NONCE token
- [Angular autoCsp GitHub issue #29603](https://github.com/angular/angular-cli/issues/29603) — Known limitations with `media="print"` pattern in autoCsp
- [OWASP CSRF Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) — Bearer token in Authorization header eliminates CSRF for SPA APIs; double-submit cookie for cookie-based auth
- [Path Traversal Prevention (OpenStack Security Guidelines)](https://security.openstack.org/guidelines/dg_using-file-paths.html) — os.path.realpath / pathlib pattern, commonprefix warning
- [Path Traversal Remediation in Python (OSINT Team)](https://osintteam.blog/path-traversal-and-remediation-in-python-0b6e126b4746) — pathlib.Path.is_relative_to() approach
- [Webhook Security Fundamentals (Hooklistener, 2026)](https://www.hooklistener.com/learn/webhook-security-fundamentals) — HMAC, timing-safe comparison, replay prevention, payload size limits
- [Webhook Security Best Practices (Stytch)](https://stytch.com/blog/webhooks-security-best-practices/) — 5-minute timestamp window, rate limiting, HTTPS enforcement
- [DNS Rebinding CVE-2025-66416 (MCP Python SDK)](https://v2.cvefeed.io/vuln/detail/CVE-2025-66416) — Host header validation as DNS rebinding mitigation for localhost-bound servers
- [DNS Rebinding Explained (GitHub Blog)](https://github.blog/security/application-security/dns-rebinding-attacks-explained-the-lookup-is-coming-from-inside-the-house/) — Attack mechanism and prevention patterns
- [Best Logging Practices for Sensitive Data (BetterStack)](https://betterstack.com/community/guides/logging/sensitive-data/) — Custom log filter patterns for credential scrubbing
- [API Authentication with Tokens (Miguel Grinberg)](https://blog.miguelgrinberg.com/post/api-authentication-with-tokens) — Static token patterns for single-user REST APIs
- [Apply Restrictive File Permissions (OpenStack)](https://security.openstack.org/guidelines/dg_apply-restrictive-file-permissions.html) — 0600 for config files containing secrets

---

*Feature research for: self-hosted file sync app security hardening (SeedSync v3.2 Security Hardening II)*
*Researched: 2026-02-25*
