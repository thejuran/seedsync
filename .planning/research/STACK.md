# Stack Research

**Domain:** Security Hardening — Bottle/Angular homelab web app
**Researched:** 2026-02-25
**Milestone:** v3.2 Security Hardening II
**Confidence:** HIGH

---

## Scope

This document covers only NEW stack additions or patterns needed for v3.2. Everything validated in prior milestones (Bottle web framework, Angular 19 frontend, HMAC webhook auth, CSP headers, credential redaction, SSH TOFU, POST/DELETE mutations, pexpect argv injection prevention, security headers via after_request hook) is NOT re-researched here.

The four new areas:

1. **API token authentication middleware for Bottle**
2. **CSP `unsafe-inline` removal for Angular 19 (legacy browser builder)**
3. **DNS rebinding TOCTOU fix for existing SSRF protection**
4. **Restrictive file permissions (0600) on config writes**

---

## Recommended Stack

### Core Technologies — NO NEW PACKAGES REQUIRED

All four features are implemented using Python stdlib or existing npm packages. Zero new dependencies.

| Technology | Version | Purpose | Why No New Package Needed |
|------------|---------|---------|--------------------------|
| `secrets` (Python stdlib) | Python 3.11+ | Token generation + constant-time comparison | `secrets.token_hex(32)` generates a 256-bit secure random token. `secrets.compare_digest()` does constant-time comparison. Both are standard library since Python 3.6. |
| `socket` (Python stdlib) | Python 3.11+ | DNS resolution for rebinding fix | Already imported in `config.py`. Used for the resolve-and-pin pattern. |
| `os` (Python stdlib) | Python 3.11+ | Restrictive file permissions | `os.open()` with `O_CREAT | O_WRONLY` and mode `0o600` creates config with correct permissions atomically. |
| `bottle` hooks | 0.13.4 (already installed) | API token auth middleware | `@hook('before_request')` runs before every route, including `/server/*` API paths. |
| `@angular/core CSP_NONCE` | 19.2.18 (already installed) | Angular nonce integration | `CSP_NONCE` injection token lets Angular apply nonces to its own generated inline scripts, without requiring SSR or builder migration. |

### What Was Investigated and Ruled Out

| Option | Why Ruled Out |
|--------|---------------|
| `bottle-jwt` (PyPI) | Adds JWT complexity (expiry, refresh) inappropriate for a homelab local tool. Static pre-shared token is correct for this use case. |
| `secrets.compare_digest` via `hmac` module | Already used for HMAC webhook auth. `secrets.compare_digest` is identical in behavior — either works, `secrets` is slightly more readable. |
| `@angular/build:application` builder + `security.autoCsp` | This is the Angular 19 production-ready path for hash-based CSP. But SeedSync uses the **legacy `@angular-devkit/build-angular:browser` builder**. The `security.autoCsp` option requires the new `application` builder (confirmed via GitHub issue #29959). Migrating builders in a security milestone is a large blast radius change. The correct approach for the browser builder is the `ngCspNonce` attribute on the root component + Bottle generating nonces per-request. |
| `ssrfcheck` / `ssrf-protect` (PyPI) | Third-party SSRF libraries. The existing `_validate_url()` in `config.py` already uses `socket.getaddrinfo()` for IP validation — the only gap is DNS rebinding TOCTOU. Fixing that gap requires a custom requests adapter, not a new library. |
| `python-atomicwrites` (PyPI) | Adds a dep just for atomic write. `os.open()` with `O_CREAT | O_WRONLY | O_EXCL` + `os.chmod()` pattern achieves the same goal with stdlib only. |

---

## Area 1: API Token Authentication (Bottle)

### Pattern: `before_request` hook with header check

Bottle's `@hook('before_request')` runs before route dispatch for every request. The hook can abort the request by raising `HTTPError` or returning an `HTTPResponse`. Routes receiving the hook call are the `/server/*` API endpoints. Static file routes (`/`, `/dashboard`, `/settings`, etc. served by `static_file()`) must be exempted.

**Integration point:** `web_app.py` `WebApp.__init__()` already registers one `after_request` hook for security headers. The `before_request` hook follows the same pattern and is registered in the same `__init__` block.

```python
import secrets
from bottle import request, HTTPError

# In WebApp.__init__():
@self.hook('before_request')
def _check_api_token():
    path = request.path
    # Only protect /server/* routes; static files and frontend routes are exempt
    if not path.startswith('/server/'):
        return
    # No auth configured = skip (backward compat, same pattern as webhook_secret)
    api_token = context.config.general.api_token
    if not api_token:
        return
    # Check Authorization: Bearer <token>
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        raise HTTPError(401, 'Missing or malformed Authorization header')
    provided = auth_header[len('Bearer '):]
    if not secrets.compare_digest(api_token, provided):
        raise HTTPError(401, 'Invalid API token')
```

**Token generation:** `secrets.token_hex(32)` produces 64 hex characters (256 bits of entropy). Generated once on first startup if `api_token` is empty, written to config, displayed in logs once.

**Config integration:** Add `api_token` field to `Config.General` (same pattern as `webhook_secret`). Default empty = auth disabled (backward compat for existing installs).

**Frontend integration:** Angular `RestService` must add `Authorization: Bearer <token>` to all `/server/*` requests. Token is exposed via a new config-get endpoint or stored in a well-known location on the filesystem for the UI to read on boot.

**Confidence:** HIGH — Bottle `@hook('before_request')` is documented as stable API in 0.13.x. The pattern is stdlib-only with no external deps.

---

## Area 2: CSP `unsafe-inline` Removal (Angular 19 + Legacy Browser Builder)

### The Builder Constraint

The project uses `@angular-devkit/build-angular:browser` (confirmed in `angular.json`, line 22). The `security.autoCsp` option in `angular.json` only works with the `@angular-devkit/build-angular:application` builder (Angular CLI issue #29959). Migrating builders is out of scope for a security milestone.

### Correct Approach for the Browser Builder: `ngCspNonce`

Angular 19 supports nonce-based CSP via the `ngCspNonce` attribute on the root app element (or via the `CSP_NONCE` injection token). The backend generates a per-request cryptographically random nonce, injects it into the HTML `<app-root ngCspNonce="...">` tag, and sets the same nonce in the `Content-Security-Policy` response header. Angular reads the attribute and applies it to all inline scripts it generates.

**How it works:**

1. Bottle's `__index()` handler (currently serves `index.html` via `static_file()`) is replaced with a dynamic HTML response that injects the nonce.
2. The `after_request` CSP header now uses `'nonce-{value}'` instead of `'unsafe-inline'` for `script-src`.
3. Angular reads `ngCspNonce` from the root element attribute and applies it to any inline script it emits.

**The Bootstrap problem:** `bootstrap.bundle.min.js` is an external file served by the `@angular/cli` pipeline — it is NOT an inline script. The inline scripts that need nonces are Angular's own runtime bootstrap loader fragments in `index.html`. External `<script src="...">` tags do not need nonces; they are covered by `script-src 'self'`.

**Nonce generation in Bottle:**

```python
import secrets
import base64

def _generate_nonce() -> str:
    return base64.b64encode(secrets.token_bytes(16)).decode('ascii')  # 128-bit, URL-safe
```

**Dynamic index.html serving:**

The `__index()` method currently delegates to `static_file()`. It must be replaced with:

```python
def __index(self):
    nonce = _generate_nonce()
    # Read index.html, inject nonce into <app-root> tag
    with open(os.path.join(self._html_path, 'index.html'), 'r') as f:
        html = f.read()
    html = html.replace('<app-root>', '<app-root ngCspNonce="{}">'.format(nonce))
    bottle.response.content_type = 'text/html; charset=utf-8'
    bottle.response.set_header('Content-Security-Policy',
        "default-src 'self'; "
        "script-src 'self' 'nonce-{nonce}'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "connect-src 'self' https://api.github.com; "
        "img-src 'self' data:; "
        "frame-ancestors 'none'".format(nonce=nonce)
    )
    return html
```

Note: `style-src` keeps `'unsafe-inline'` for now because Bootstrap's `@use`/`@forward` SCSS pipeline and Angular's critical CSS inlining still produce inline styles. Removing `style-src 'unsafe-inline'` is a separate, larger effort.

**Angular `CSP_NONCE` injection token (optional):** If Angular code creates dynamic scripts at runtime (rare in this app), provide the nonce via `CSP_NONCE`:

```typescript
// In app.config.ts or main.ts
import { CSP_NONCE } from '@angular/core';
// ...
providers: [
  { provide: CSP_NONCE, useValue: document.querySelector('app-root')?.getAttribute('ngCspNonce') ?? '' }
]
```

This is only needed if Angular emits runtime inline scripts. The main build-time inline bootstrap loader fragments are handled by the `ngCspNonce` HTML attribute alone.

**Confidence:** HIGH for the nonce injection pattern (Angular official docs). MEDIUM for the scope of what inline scripts actually exist in the browser builder output — must verify with a production build audit.

---

## Area 3: DNS Rebinding TOCTOU Fix

### The Existing Gap

`ConfigHandler._validate_url()` in `config.py` already calls `socket.getaddrinfo()` to verify the hostname does not resolve to a private IP. This is the check step. The vulnerability is that `requests.get()` then re-resolves the hostname independently, and an attacker with a low-TTL DNS record can swap the resolved IP between the check and the actual connection (TOCTOU).

### Correct Pattern: Resolve-and-Pin via Custom HTTPAdapter

The fix is to resolve the hostname once, validate the resolved IP, then make the HTTP connection directly to that IP while overriding the `Host` header to maintain the original hostname (needed for TLS SNI and virtual hosting).

**No new libraries required.** `requests` 2.32.x (already a dependency) supports custom `HTTPAdapter` subclasses.

```python
import socket
import ipaddress
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.connection import create_connection

class SSRFSafeAdapter(HTTPAdapter):
    """
    Custom HTTPAdapter that resolves DNS once, validates the resolved IP against
    the private/loopback/reserved blocklist, then pins the connection to that IP.
    Prevents DNS rebinding TOCTOU: resolve-validate-pin all in one step.
    """
    def send(self, request, **kwargs):
        from urllib.parse import urlparse
        parsed = urlparse(request.url)
        hostname = parsed.hostname
        port = parsed.port or (443 if parsed.scheme == 'https' else 80)

        # Resolve once
        try:
            addr_infos = socket.getaddrinfo(hostname, port, proto=socket.IPPROTO_TCP)
        except socket.gaierror as e:
            raise requests.exceptions.ConnectionError("Cannot resolve hostname: {}".format(e))

        if not addr_infos:
            raise requests.exceptions.ConnectionError("No addresses resolved for hostname")

        # Validate the resolved IP
        ip_str = addr_infos[0][4][0]
        try:
            addr = ipaddress.ip_address(ip_str)
            if addr.is_private or addr.is_loopback or addr.is_reserved or addr.is_link_local:
                raise requests.exceptions.ConnectionError(
                    "Resolved IP {} is private/reserved".format(ip_str)
                )
        except ValueError:
            raise requests.exceptions.ConnectionError("Cannot parse resolved IP")

        # Pin: replace hostname in URL with resolved IP
        # Override Host header so the server sees the original hostname (SNI, virtual hosting)
        pinned_url = request.url.replace(hostname, ip_str, 1)
        request.url = pinned_url
        request.headers['Host'] = hostname

        return super().send(request, **kwargs)
```

**Usage in `config.py`:**

```python
session = requests.Session()
session.mount('http://', SSRFSafeAdapter())
session.mount('https://', SSRFSafeAdapter())
response = session.get(url, headers={"X-Api-Key": api_key}, timeout=10)
```

The existing `_validate_url()` pre-check can be kept as a fast-fail before attempting to connect, but the adapter provides the actual TOCTOU-safe guarantee.

**Confidence:** MEDIUM-HIGH. The pattern is well-documented in security advisories (AutoGPT GHSA-wvjg-9879-3m7w, mindsdb GHSA-4jcv-vp96-94xr). TLS with IP-pinned connections has nuances (SNI handling) that should be validated against the Sonarr/Radarr test connection flows. If the target URL uses HTTPS, the certificate is validated against the `Host` header hostname, not the IP — this is handled correctly by `urllib3` when `Host` is set.

---

## Area 4: Restrictive File Permissions on Config Write

### Pattern: `os.open()` + `os.chmod()` with 0600

The existing `Persist` base class in `common/persist.py` handles config writes. The change is to ensure that:

1. New config files are created with `0o600` permissions (owner read/write only, no group/other).
2. Existing config files have permissions corrected on every write.

**No new libraries.** Pure `os` stdlib.

```python
import os

def _write_config_file(path: str, content: str) -> None:
    """Write config file with restrictive permissions (0600)."""
    dir_path = os.path.dirname(path)

    if not os.path.exists(path):
        # Atomic create with correct permissions from the start
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w') as f:
            f.write(content)
    else:
        # File exists — write content then enforce permissions
        with open(path, 'w') as f:
            f.write(content)
        os.chmod(path, 0o600)
```

**Integration point:** The `Persist` class or its concrete `Config` implementation calls this helper instead of plain `open(path, 'w')`. The `common/persist.py` `save()` method is the write path to modify.

**Why not `umask` approach:** Setting `umask(0o177)` at process startup would prevent `0o600` from being the default, but it's a process-global side effect that could affect subprocess spawning (LFTP, pexpect). The explicit `os.open()` / `os.chmod()` approach is surgical and has no side effects.

**Confidence:** HIGH — `os.open()` with mode argument is documented Python stdlib behavior. OpenStack security guidelines explicitly recommend this pattern (confirmed via official OpenStack security docs).

---

## Installation

**No new Python packages.** All patterns use stdlib: `secrets`, `socket`, `ipaddress`, `os`, `base64`.

**No new npm packages.** `CSP_NONCE` is part of `@angular/core` 19.2.18 (already installed). `ngCspNonce` is an HTML attribute — no package needed.

```bash
# Verify no new deps needed — confirm existing packages
cd src/python && poetry show requests  # Should show 2.32.5+
cd src/angular && npm list @angular/core  # Should show 19.2.18
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `before_request` hook for auth | Bottle plugin system (install_plugin) | If you need per-route skip decorators. For this app where all `/server/*` routes need auth, the hook + path prefix check is simpler and has no plugin registration complexity. |
| Static token in config | JWT tokens | If tokens needed expiry, multiple clients, or delegation. Not applicable to a single-user homelab tool. |
| `ngCspNonce` attribute injection | Migrate to `application` builder + `security.autoCsp` | Correct long-term path. Worth doing in a dedicated builder migration milestone, NOT during a security hardening pass where blast radius must be minimal. |
| Resolve-and-pin adapter | Keep existing pre-check only | Only acceptable if the Sonarr/Radarr URLs are always localhost/LAN addresses that can't be DNS-rebound. The pre-check alone is insufficient for public hostnames with TTL=0. |
| `os.open()` 0600 create | `tempfile.mkstemp()` + rename | mkstemp creates 0600 by default (good) but adds rename complexity. Direct os.open is simpler for a non-crash-sensitive config write path. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `security.autoCsp` in `angular.json` | Only works with `@angular-devkit/build-angular:application` builder. SeedSync uses the legacy `browser` builder. Will silently be ignored or error. | `ngCspNonce` HTML attribute + Bottle nonce generation |
| Third-party auth packages (`bottle-jwt`, `Cork`) | Adds dependencies + complexity for a homelab app that needs a simple pre-shared token. Overkill. | stdlib `secrets` + `before_request` hook |
| `hmac.compare_digest` for token comparison | `secrets.compare_digest` is identical in behavior but semantically clearer. Either works. | `secrets.compare_digest` |
| Process-global `umask` change | Side effect on subprocesses spawned by pexpect/LFTP. | `os.open()` with explicit mode |
| Following redirects in SSRF-safe session | Redirects can forward to a private IP after the initial validation passes. | Set `allow_redirects=False` or validate each redirect destination |

---

## Version Compatibility

| Package | Current Version | Feature Used | Notes |
|---------|-----------------|--------------|-------|
| bottle | 0.13.4 | `@hook('before_request')`, `HTTPError` | Confirmed stable in 0.13.x API docs |
| requests | 2.32.5 | `HTTPAdapter.send()` subclass | Custom adapter API stable since requests 2.x |
| @angular/core | 19.2.18 | `CSP_NONCE` injection token | Available since Angular 16, confirmed in 19.x docs |
| Python | 3.11+ | `secrets`, `socket`, `os` | All stdlib. `secrets` module since Python 3.6. |

---

## Sources

**HIGH CONFIDENCE — Official Documentation:**
- [Angular CSP_NONCE API Reference](https://angular.dev/api/core/CSP_NONCE) — Official Angular docs for the CSP_NONCE injection token
- [Angular Security Best Practices](https://angular.dev/best-practices/security) — Official Angular security guide, ngCspNonce attribute
- [Python secrets module](https://docs.python.org/3/library/secrets.html) — Official Python docs, token_hex, compare_digest
- [Python os module](https://docs.python.org/3/library/os.html) — Official Python docs, os.open() mode flags
- [OpenStack Security: Apply Restrictive File Permissions](https://security.openstack.org/guidelines/dg_apply-restrictive-file-permissions.html) — Production-grade pattern for 0600 config files
- [Bottle 0.13.4 API Reference](https://bottlepy.org/docs/0.13/api.html) — Hook system, HTTPError

**HIGH CONFIDENCE — Verified Primary Sources:**
- [Angular CLI GitHub issue #29959](https://github.com/angular/angular-cli/issues/29959) — Confirms `security.autoCsp` not supported on `browser` builder
- [Angular CLI commit efb4341](https://github.com/angular/angular-cli/commit/efb434136d8c8df207747ab8fd87b7e2116b7106) — Auto-CSP implemented only for `application` builder schema

**MEDIUM CONFIDENCE — Security Advisories (verified patterns):**
- [AutoGPT GHSA-wvjg-9879-3m7w](https://github.com/Significant-Gravitas/AutoGPT/security/advisories/GHSA-wvjg-9879-3m7w) — DNS rebinding TOCTOU in Python requests wrapper, resolve-and-pin pattern
- [mindsdb GHSA-4jcv-vp96-94xr](https://github.com/mindsdb/mindsdb/security/advisories/GHSA-4jcv-vp96-94xr) — Same TOCTOU class of bug, confirms fix approach

---

*Stack research for: v3.2 Security Hardening II — Token auth, CSP nonce, DNS rebinding, file permissions*
*Researched: 2026-02-25*
*Confidence: HIGH (stdlib-only additions, confirmed against official docs and Angular CLI source)*
