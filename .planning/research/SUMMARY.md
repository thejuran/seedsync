# Project Research Summary

**Project:** SeedSync v3.2 Security Hardening II
**Domain:** Security hardening — Bottle/Angular 19 self-hosted file sync web application
**Researched:** 2026-02-25
**Confidence:** HIGH

## Executive Summary

SeedSync v3.2 is a targeted security hardening milestone for an existing, functioning self-hosted application. The codebase (Python 3.11 / Bottle 0.13.4 backend, Angular 19 SPA frontend, Docker deployment) already shipped significant hardening in v3.1 — HMAC webhook auth, credential redaction, CSP headers, POST/DELETE mutations, SSH TOFU, and rate limiting. The v3.2 audit identified nine remaining gaps across four risk categories: authentication (no API token on config endpoints), input validation (path traversal on delete/extract), information disclosure (topology fields in API responses), and CSP (unsafe-inline still present). Critically, all nine fixes require zero new external dependencies — every implementation uses Python stdlib or already-installed packages.

The recommended approach is a five-phase delivery that sequences changes by risk and coupling. Low-risk, isolated changes (config permissions, restart POST migration, SSH log redaction) land first to build confidence. Config-layer and webhook hardening follow. Path traversal guards complete the backend before the highest-complexity change — API token authentication — is introduced last, since a broken auth middleware is the only change that can lock out the entire application. CSP nonce removal piggybacks on the index.html serving refactor introduced by auth, making it the natural final phase.

The dominant risk in this milestone is the SSE stream interaction with auth middleware: the browser's native `EventSource` API cannot send `Authorization` headers, so the `/server/stream` endpoint requires a separate token transport strategy (query-parameter token or cookie) or must be explicitly exempted from auth with the SSE stream scoped to non-sensitive file status data. This design decision must be made before any auth middleware code is written. Secondary risks are the DNS rebinding fix over-blocking legitimate localhost/LAN/Tailscale Sonarr-Radarr URLs, and the Angular-Python bilateral restart endpoint change requiring atomic deployment of both sides.

## Key Findings

### Recommended Stack

All v3.2 security features are implemented using existing dependencies — no new packages are introduced. Python stdlib modules (`secrets`, `socket`, `ipaddress`, `os`, `base64`) cover token generation, constant-time comparison, DNS resolution, file permissions, and nonce generation. The Bottle `@hook('before_request')` mechanism handles auth middleware using the same pattern already used for `after_request` security headers. Angular's `CSP_NONCE` injection token and `ngCspNonce` HTML attribute (part of `@angular/core` 19.2.18, already installed) cover the CSP nonce integration without requiring a builder migration.

**Core technologies:**
- `secrets` (Python stdlib): API token generation (`token_urlsafe(32)`) and constant-time comparison (`compare_digest`) — zero new dependencies
- `bottle` hooks (`@hook('before_request')`): Auth middleware — stable Bottle 0.13.x API, same pattern as the existing `after_request` security headers hook
- `@angular/core CSP_NONCE` / `ngCspNonce`: Angular nonce integration — available since Angular 16, present in installed 19.2.18
- `os` (Python stdlib): Restrictive config file permissions (0o600) — one-line addition to `Persist.to_file()`
- `socket` + custom `HTTPAdapter`: DNS resolve-and-pin for SSRF TOCTOU fix — uses already-installed `requests` 2.32.x adapter API

**Critical version constraints:**
- The `security.autoCsp` Angular build option requires `@angular-devkit/build-angular:application` builder; SeedSync uses the legacy `browser` builder. Migrating builders is out of scope — the nonce approach via `ngCspNonce` is the correct path for this builder (confirmed via Angular CLI GitHub issue #29959).
- `ipaddress.ip_address().is_private` behavior changed in Python 3.11 to include more RFC 6890 ranges (including Tailscale's `100.64.0.0/10`). SSRF validation must be tested on the exact Docker image Python version.

### Expected Features

**Must have (table stakes) — P1, must ship in v3.2:**
- Path traversal protection on `/api/file/delete` and `/api/file/extract` — use `pathlib.Path.resolve()` + `is_relative_to()`, not `abspath()` which does not follow symlinks
- Config file permissions 0600 — one-line `os.chmod()` addition to `Persist.to_file()`
- API token authentication middleware — Bottle `before_request` hook; static token in config, same pattern as `webhook_secret`; SSE transport strategy must be designed before writing any code
- Webhook hardening additions — payload size limit (1MB cap) + startup warning when secret is empty; do NOT change empty-secret default from "allow" to "reject"
- Config info disclosure fixes — extend `_SENSITIVE_FIELDS` to include `remote_address`, `remote_username`, `remote_path`
- SSH command log redaction — add `user@host` regex scrub to `LogStreamHandler` before yielding
- Restart endpoint changed to POST — bilateral Python + Angular change, must ship both sides atomically

**Should have (competitive) — P2, add when P1 scope is complete:**
- Startup security warnings for insecure configuration (no token, no webhook secret, bound to 0.0.0.0)
- DNS rebinding inbound prevention (Host header validation in `before_request` hook)
- CSP without `unsafe-inline` via nonce injection

**Defer beyond v3.2 — P3:**
- SSRF resolve-once DNS fix for Sonarr/Radarr — high implementation complexity; legitimate threat only if attacker controls DNS; Sonarr/Radarr are always localhost/LAN services for SeedSync's use case
- Full login UI / JWT tokens — overkill for single-user self-hosted; introduces more attack surface than it removes

### Architecture Approach

The existing architecture is well-suited for this hardening milestone. Security logic is centralized in two hooks: `after_request` (security headers) and the new `before_request` (auth). Handler-layer guards for path traversal follow. The `SerializeConfig` layer handles all API response redaction in one place. The `Persist` base class handles all config writes in one place. All nine features map to surgical modifications of existing files with no new components or directories. The highest coupling point is the index.html serving path: it must change from `static_file()` to a dynamic response that injects both the API token meta tag and the CSP nonce — this is shared infrastructure for both Phase 4 (auth) and Phase 5 (CSP nonce removal) and must be designed correctly once.

**Major components and their v3.2 changes:**
1. `web_app.py` — add `before_request` auth hook; replace `static_file()` index serving with dynamic nonce + token injection
2. `common/persist.py` — add `os.chmod(path, 0o600)` after every config write
3. `handler/controller.py` — add `_is_safe_filename()` path traversal guard in all action handlers
4. `handler/webhook.py` — add payload size limit and localhost-only fallback when secret is empty
5. `serialize/serialize_config.py` — extend `_SENSITIVE_FIELDS` to cover topology fields and new `api_token`
6. `handler/stream_log.py` — add SSH `user@host` regex scrub before yielding SSE events
7. `handler/server.py` + `server-command.service.ts` — change restart from GET to POST (bilateral, atomic)
8. `rest.service.ts` — attach `Authorization: Bearer <token>` to all `/server/*` requests
9. `handler/config.py` — resolve-and-pin DNS pattern to eliminate TOCTOU in SSRF validation

### Critical Pitfalls

1. **Auth middleware killing the SSE stream** — The browser's `EventSource` API cannot send `Authorization` headers. Naively applying `before_request` to `/server/stream` causes infinite reconnect loops (Angular file list never populates, `ConnectedService` oscillates, reconnect counter climbs without bound). Design SSE token transport before writing any auth code: either exempt SSE entirely (acceptable because the stream contains only file names/status codes, not secrets) or validate a query-parameter token at the top of `__web_stream()` before any generator yields.

2. **Path traversal guard broken by symlinks** — `os.path.abspath()` normalizes path strings but does NOT follow symlinks, so a symlink within `local_path` pointing outside it bypasses an `abspath()`-based guard. Use `os.path.realpath()` for both base and target, and additionally reject targets that are themselves symlinks with `os.path.islink()`. Guard at both the HTTP handler layer (fast 400 rejection) and inside `DeleteLocalProcess.run_once()` for defense in depth.

3. **CSP unsafe-inline removal breaking Angular runtime** — Removing `'unsafe-inline'` without first running report-only mode will break the Angular app silently (blank page or broken event bindings). Start with `Content-Security-Policy-Report-Only`, analyze violations from a full usage session, then enforce. Bootstrap 5.3 and the CRT scan-line overlay may produce violations beyond what Angular's nonce coverage addresses.

4. **Webhook auth defaults breaking Sonarr/Radarr integrations** — Changing the empty-secret default from "skip HMAC" to "reject" silently breaks existing installs. The auto-delete chain breaks invisibly (files download, are never cleaned up, disk fills). Keep `empty secret = allow` as the default; hardening must be opt-in config flags only.

5. **DNS rebinding fix over-blocking legitimate URLs** — `ipaddress.ip_address().is_private` in Python 3.11 classifies Tailscale's `100.64.0.0/10` CGNAT space as private. If the SSRF fix blocks private IPs without explicit allowlisting of localhost/LAN/Tailscale ranges, the Settings test-connection button will break for the majority of SeedSync's deployment scenarios.

6. **Restart GET-to-POST bilateral breakage** — The Python handler change and the Angular `RestService` change must ship atomically. A backend-only deploy produces 405 errors on the restart button with no obvious indication of cause.

## Implications for Roadmap

Based on research, the architecture's dependency graph and pitfall risk profile suggest a five-phase delivery:

### Phase 1: Isolated Backend Hardening
**Rationale:** Three changes with zero inter-dependencies and zero frontend coupling. Builds confidence before touching higher-risk areas. The restart endpoint change has frontend coupling but is trivial in isolation — commit both sides together.
**Delivers:** Config files written with 0600 permissions (credential protection), restart endpoint is CSRF-safe (POST method), SSH user@host strings scrubbed from log stream
**Addresses:** Config file permissions (P1), SSH log redaction (P1), restart endpoint POST (P1)
**Avoids:** Bilateral deployment risk — restart endpoint requires both Python handler and Angular service changes in same commit; verify Angular unit test for restart asserts HTTP POST method
**Research flag:** Standard patterns, no additional research needed

### Phase 2: Config and Webhook Layer Hardening
**Rationale:** Config redaction extension and webhook hardening are isolated to `serialize_config.py` and `webhook.py` respectively. No frontend changes. No auth dependency. Complete the config API and webhook surface before adding auth on top. Startup warnings are naturally grouped here as they check config state.
**Delivers:** Topology fields (`remote_address`, `remote_username`, `remote_path`) no longer disclosed in API responses; webhook endpoints have a payload size cap; startup warnings surface insecure configuration
**Addresses:** Config info disclosure fixes (P1), webhook hardening additions (P1), startup security warnings (P2)
**Avoids:** Webhook backward-compat breakage — explicitly keep `empty secret = allow` as default; any localhost restriction is an opt-in config flag, not a changed default
**Research flag:** Standard patterns, no additional research needed

### Phase 3: Path Traversal Guards
**Rationale:** Backend-only. Completes all input validation hardening before auth is added. Path traversal protection is orthogonal to auth — an authenticated user can still trigger traversal if the guard is absent; both layers are needed regardless.
**Delivers:** Delete and extract endpoints validate that file names resolve within `local_path` with `realpath()`-based containment check and symlink rejection; guard applied at handler layer and subprocess layer
**Addresses:** Path traversal protection (P1)
**Avoids:** Symlink bypass — use `realpath()` not `abspath()`; test with `../x`, `../../etc`, absolute paths (`/tmp/x`), and symlinks within `local_path` pointing outside it
**Research flag:** Standard patterns; symlink behavior is well-documented in Python stdlib

### Phase 4: API Token Authentication
**Rationale:** Highest-complexity change: Python `before_request` hook + new config field + token auto-generation + Angular `Authorization` header + `index.html` meta tag injection. This phase has the highest blast radius — a bug here locks out all API access. All preceding phases must be complete and stable. The index.html serving refactor (from `static_file()` to dynamic response) also lays the foundation for the CSP nonce work in Phase 5.
**Delivers:** All `/server/*` endpoints require `Authorization: Bearer <token>` header; token auto-generated on first startup; token injected into `index.html` at serve time via `<meta name="api-token">` for Angular to read on boot; DNS rebinding inbound prevention added to the same `before_request` hook
**Addresses:** API token authentication middleware (P1), DNS rebinding inbound prevention (P2)
**Avoids:** SSE stream breakage — the SSE token transport strategy must be decided explicitly before implementation tasks are written; exempt `/server/stream` from header auth OR validate query-parameter token inside `__web_stream()` before the generator yields; test that Angular file list populates and stays populated with auth enabled; test SSE reconnect behavior after browser disconnect
**Research flag:** Needs explicit design decision during plan writing — SSE auth transport mechanism (exempt vs. query-param token vs. cookie) must be chosen before any implementation tasks are created

### Phase 5: CSP Nonce Removal
**Rationale:** Shares the index.html serving refactor introduced in Phase 4. Bottle now serves `index.html` dynamically, making per-request nonce injection a natural extension. Must start with `Content-Security-Policy-Report-Only` before switching to enforcement. `style-src 'unsafe-inline'` stays for now — Angular component style encapsulation requires a separate, larger effort.
**Delivers:** `script-src 'unsafe-inline'` replaced with `'nonce-{random}'`; Angular reads nonce from `ngCspNonce` attribute on `<app-root>`
**Addresses:** CSP without unsafe-inline (P2)
**Avoids:** Angular runtime breakage — run report-only mode first, analyze violations for a full usage session, only enforce after zero violations confirmed; check Bootstrap 5.3 and CRT overlay for additional violation sources
**Research flag:** Needs attention during plan writing — must audit the production Angular build output (`ng build` + inspect generated `index.html`) for inline scripts before finalizing CSP directives

### Phase Ordering Rationale

- Auth is placed last among backend changes because it is the only change that can make the application completely inaccessible if deployed with a bug — all other changes are additive hardening
- CSP nonce follows auth because both require the index.html serving path to become dynamic; combining them avoids refactoring `__index()` twice and reduces total risk
- Config and webhook hardening precede auth because `api_token` must be in `_SENSITIVE_FIELDS` before the auth feature adds it to config — the redaction layer must be extended in Phase 2 before Phase 4 writes to it
- Path traversal guards precede auth because traversal is an orthogonal threat that exists independent of whether requests are authenticated

### Research Flags

Phases needing explicit design decisions during plan writing:
- **Phase 4 (API Token Auth):** SSE token transport strategy must be decided before implementation tasks are written. The three options (exempt SSE entirely, query-parameter token, short-lived cookie) have different security and complexity tradeoffs. The recommended default — exempt SSE because the stream contains only file names and status codes — should be explicitly confirmed against what the SSE stream actually transmits.
- **Phase 5 (CSP Nonce):** Production Angular build output must be audited for inline scripts before writing the final CSP policy. The browser builder's exact inline script content determines whether nonce on `<app-root>` alone is sufficient.

Phases with standard, well-documented patterns (skip additional research):
- **Phase 1** (config permissions, restart POST, SSH redaction): One-to-five line modifications of well-understood code
- **Phase 2** (config redaction, webhook hardening): Pattern established in v3.1; extend `_SENSITIVE_FIELDS` and `_verify_hmac()` along existing lines
- **Phase 3** (path traversal): `pathlib.Path.resolve()` + `is_relative_to()` is the Python 3.9+ documented standard

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All four features verified against official docs (Python stdlib, Bottle 0.13.x API docs, Angular 19 docs, Angular CLI GitHub source). Zero new dependencies confirmed. Builder constraint confirmed via Angular CLI issue #29959. |
| Features | HIGH | P1/P2/P3 prioritization grounded in Huntarr audit findings and *arr ecosystem conventions (Sonarr, Radarr, Jellyfin all use static Bearer tokens). The autoCsp vs. nonce distinction confirmed against Angular CLI source code. |
| Architecture | HIGH | Derived from direct codebase inspection of v3.1 source files. Component responsibilities, integration points, and build order are based on reading actual code, not inference. All integration points identified by file and method name. |
| Pitfalls | HIGH | SSE EventSource limitation is spec-documented (MDN + WHATWG spec). Symlink traversal bypass is CWE-22 documented. Tailscale CGNAT range and Python 3.11 `is_private` change are confirmed from official Python and Tailscale documentation. Webhook backward-compat risk is confirmed against Sonarr webhook documentation. |

**Overall confidence:** HIGH

### Gaps to Address

- **SSE auth transport mechanism:** Three viable options exist (exempt, query-param token, cookie). Correct choice depends on what data the SSE stream actually transmits today. Confirm stream content before writing Phase 4 implementation tasks.
- **Angular production build inline script audit:** The exact inline scripts in the browser builder's `index.html` output must be determined by running `ng build` and inspecting output before finalizing the Phase 5 CSP policy.
- **SSRF outbound validation scope (Phase 4):** The DNS rebinding fix for outbound Sonarr/Radarr requests is a P3 deferral, but inbound Host header validation is P2. Confirm during Phase 4 planning that the `before_request` hook is scoped only to inbound Host validation and does not inadvertently change outbound request behavior.
- **Webhook localhost restriction implementation:** Architecture research proposes a localhost-only fallback when `webhook_secret` is empty, but pitfalls research warns this breaks existing setups. Resolution is opt-in config flag. Confirm this is the explicit implementation plan before writing Phase 2 tasks.

## Sources

### Primary (HIGH confidence)
- [Angular CSP_NONCE API Reference](https://angular.dev/api/core/CSP_NONCE) — CSP_NONCE injection token, ngCspNonce attribute
- [Angular Security Best Practices](https://angular.dev/best-practices/security) — official CSP guidance
- [Angular CLI GitHub issue #29959](https://github.com/angular/angular-cli/issues/29959) — confirms autoCsp requires application builder, not browser builder
- [Angular CLI commit efb4341](https://github.com/angular/angular-cli/commit/efb434136d8c8df207747ab8fd87b7e2116b7106) — auto-CSP implemented only in application builder schema
- [Python secrets module](https://docs.python.org/3/library/secrets.html) — token_urlsafe, compare_digest
- [Python os module](https://docs.python.org/3/library/os.html) — os.open() mode flags
- [OpenStack Security: Apply Restrictive File Permissions](https://security.openstack.org/guidelines/dg_apply-restrictive-file-permissions.html) — 0600 pattern
- [OpenStack Security: Using File Paths](https://security.openstack.org/guidelines/dg_using-file-paths.html) — pathlib pattern, commonprefix warning
- [Bottle 0.13.4 API Reference](https://bottlepy.org/docs/0.13/api.html) — hook system, HTTPError
- [MDN: EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) — cannot send custom request headers
- [WHATWG: Server-sent events spec](https://html.spec.whatwg.org/multipage/server-sent-events.html) — automatic reconnect behavior
- [CWE-22: Improper Limitation of a Pathname](https://cwe.mitre.org/data/definitions/22.html) — symlink-based traversal variant
- [Python ipaddress documentation](https://docs.python.org/3/library/ipaddress.html) — is_private behavior change in 3.11
- [Tailscale IP range documentation](https://tailscale.com/kb/1033/ip-and-dns-mappings) — 100.64.0.0/10 CGNAT space

### Secondary (MEDIUM confidence)
- [Huntarr Security Review](https://github.com/rfsbraz/huntarr-security-review/blob/main/Huntarr.io_SECURITY_REVIEW.md) — real-world audit of self-hosted Python app with identical vulnerability classes (path traversal, auth bypass, credential disclosure)
- [AutoGPT GHSA-wvjg-9879-3m7w](https://github.com/Significant-Gravitas/AutoGPT/security/advisories/GHSA-wvjg-9879-3m7w) — DNS rebinding TOCTOU in Python requests wrapper, resolve-and-pin pattern
- [mindsdb GHSA-4jcv-vp96-94xr](https://github.com/mindsdb/mindsdb/security/advisories/GHSA-4jcv-vp96-94xr) — same TOCTOU class, confirms fix approach
- [Sonarr webhook documentation](https://wiki.servarr.com/sonarr/settings#connections) — Test event behavior and secret field
- [OWASP: DNS Rebinding](https://owasp.org/www-community/attacks/DNS_Rebinding) — attack mechanics and mitigations
- [Webhook Security Best Practices (Stytch)](https://stytch.com/blog/webhooks-security-best-practices/) — payload size limits, HMAC patterns
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) — nonce, hash, report-only directives

### Tertiary (LOW confidence, needs validation)
- Angular autoCsp interaction with Bootstrap 5.3 inline styles — not directly documented; requires hands-on validation during Phase 5 implementation
- CRT scan-line overlay inline CSS interaction with strict CSP — requires production build audit

---
*Research completed: 2026-02-25*
*Ready for roadmap: yes*
