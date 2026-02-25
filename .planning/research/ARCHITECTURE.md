# Architecture Research: Security Hardening II

**Domain:** Security hardening of Bottle + Angular 19 web application
**Researched:** 2026-02-25
**Confidence:** HIGH (direct codebase inspection, no external research required)

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    Angular 19 SPA (Browser)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ RestService │  │BaseStream   │  │ ConfigService / Command  │  │
│  │ (GET/POST/  │  │Service (SSE │  │ Services                 │  │
│  │  DELETE)    │  │ /stream)    │  │                          │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────────────────────┘  │
│         │                │                                        │
│         └────────── HTTP + SSE requests ──────────────────────────┤
│                         to same origin (/ routes)                 │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                  Bottle WSGI (Paste httpserver)                    │
│                                                                   │
│   after_request hook ──→ Security Headers (CSP, X-Frame, etc.)   │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │                      WebApp (bottle.Bottle)                │   │
│  │                                                           │   │
│  │  Handler Layer:                                           │   │
│  │  ControllerHandler   ConfigHandler   WebhookHandler       │   │
│  │  ServerHandler       AutoQueueHandler  StatusHandler      │   │
│  │                                                           │   │
│  │  Stream Layer (SSE /server/stream):                       │   │
│  │  ModelStreamHandler  LogStreamHandler  StatusStreamHandler │   │
│  │  HeartbeatStreamHandler                                   │   │
│  │                                                           │   │
│  │  Static file serving (Angular dist/index.html)            │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌──────────────────────┐   ┌──────────────────────────┐
│   Controller Thread   │   │   Config / Persist Layer  │
│                       │   │                           │
│  Controller           │   │  Config.from_file()       │
│  ScanManager          │   │  Config.to_file()         │
│  LftpManager          │   │  persist.py (Persist ABC) │
│  FileOperationManager │   │  settings.cfg (INI)       │
│  WebhookManager       │   │  autoqueue.persist        │
│  AutoQueue            │   │  controller.persist       │
└──────────────────────┘   └──────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Current Security State |
|-----------|----------------|------------------------|
| **WebApp** (`web_app.py`) | Bottle subclass, route registration, SSE streaming, `after_request` hook | Security headers applied globally; CSP still uses `unsafe-inline` |
| **WebAppBuilder** (`web_app_builder.py`) | Wires handlers to WebApp | Entry point for adding auth middleware |
| **ControllerHandler** | File queue/stop/extract/delete actions | No auth; path validation missing |
| **ConfigHandler** | Config GET/SET, *arr test-connection | SSRF protection exists; DNS rebinding gap |
| **WebhookHandler** | Sonarr/Radarr POST events | HMAC optional (empty secret skips); no source-IP restrict |
| **ServerHandler** | Restart endpoint | GET method (CSRF risk); no auth |
| **Config** / `persist.py` | INI-format config read/write | No file permission enforcement on write |
| **SerializeConfig** | API-layer redaction | Redacts password/API key/webhook_secret; missing host/username/path |
| **Angular RestService** | HTTP GET/POST/DELETE | No auth header attachment |
| **Angular ConfigService** | Config fetch/set | No auth; uses GET for all config ops |

## Security Feature Integration Map

The v3.2 features are not independent. Each touches a specific layer of the stack. This section maps each feature to its exact integration points.

### Feature 1: API Token Authentication Middleware

**What it is:** Bearer token that Angular must present on every API request; Bottle validates it before dispatching to handlers.

**Integration layer:** Bottle `before_request` hook in `web_app.py`.

**Why `before_request` over per-handler:** The `after_request` hook is already used for security headers. A `before_request` hook runs before any handler, meaning auth protection is automatic for all existing and future routes — no handler needs to be modified individually.

**Exempt routes (must be listed explicitly):**
- `GET /` and Angular SPA routes (served as static files — no auth here)
- `GET /server/stream` — SSE long-poll; auth must happen at connection establishment, not per-chunk
- `POST /server/webhook/sonarr` and `POST /server/webhook/radarr` — these have their own HMAC auth

**Token storage in Python:**
- Token lives in `Config.General` as a new `api_token` field (same pattern as `webhook_secret`)
- Loaded at startup, checked in `before_request`
- Token generation: `secrets.token_urlsafe(32)` on first startup if field is empty, written back to `settings.cfg`
- Constant-time comparison: `hmac.compare_digest()` (already used in `WebhookHandler._verify_hmac`)

**Config integration:**
```python
# config.py — Config.General section
api_token = PROP("api_token", Checkers.null, Converters.null)
```

```python
# seedsync.py — _create_default_config()
config.general.api_token = ""  # Empty = auto-generate on first run
```

```python
# web_app.py — WebApp.__init__() after existing after_request hook
@self.hook('before_request')
def _check_auth():
    # Exempt paths: static, SSE stream, webhooks
    path = bottle.request.path
    if path in _AUTH_EXEMPT_PATHS or path.startswith(_AUTH_EXEMPT_PREFIXES):
        return
    token = self._config.general.api_token
    if not token:
        return  # No token configured = open (backward compat)
    provided = bottle.request.headers.get("Authorization", "")
    if not provided.startswith("Bearer "):
        bottle.abort(401, "Unauthorized")
    if not hmac.compare_digest(token, provided[7:]):
        bottle.abort(401, "Unauthorized")
```

**Angular integration:**
- `RestService` gains an `Authorization: Bearer <token>` header on all requests
- Token must be available to Angular at startup — problem: Angular can't read `settings.cfg` directly
- **Solution:** A new `GET /server/config/auth-token` endpoint (exempt from auth) that returns the token only if the request originates from localhost/loopback. For Docker/homelab deployments, the UI is always same-origin.
- **Alternative (simpler):** The token is embedded into `index.html` at serve time via server-side template injection (nonce pattern already being considered for CSP). This avoids a second endpoint entirely.
- **Recommended approach:** Inject token into `index.html` via a `<meta name="api-token">` tag, populated when Bottle serves the file. Angular reads it from the DOM once on startup.

**Files modified:**
- `src/python/common/config.py` — add `api_token` field to `Config.General`
- `src/python/web/web_app.py` — add `before_request` auth hook
- `src/python/seedsync.py` — auto-generate token if empty, write back to config
- `src/python/web/serialize/serialize_config.py` — add `api_token` to `_SENSITIVE_FIELDS`
- `src/angular/src/app/services/utils/rest.service.ts` — attach `Authorization` header
- `src/angular/src/index.html` — add `<meta name="api-token">` placeholder (or server injects it)

### Feature 2: Path Traversal Guards on Delete/Extract

**What it is:** Prevent `../../etc/passwd` style inputs from escaping the configured `local_path`.

**Integration layer:** `ControllerHandler` in `web_app/handler/controller.py` and/or inside `FileOperationManager` / the delete processes.

**Current state:** `file_name` is URL-decoded in each handler (`unquote(file_name)`) then passed directly to the Controller command queue. No path validation exists.

**Where to add validation:**
- **Option A — Handler layer** (earlier catch, simpler): validate `file_name` in each `ControllerHandler.__handle_action_*` method before queuing.
- **Option B — Controller layer** (defense-in-depth): validate inside the Controller when processing DELETE/EXTRACT commands.
- **Recommendation:** Handler layer (Option A) for fast rejection with clean HTTP 400 response. Optionally also add assertion in Controller for defense-in-depth.

**Validation logic:**
```python
# Reusable guard function (add to handler/controller.py or common/)
def _is_safe_filename(file_name: str) -> bool:
    """
    Returns True if file_name is safe: no path separators, no null bytes,
    no traversal sequences. Must be a plain name, not a path.
    """
    if not file_name or not file_name.strip():
        return False
    # Reject anything with path components
    if os.sep in file_name or (os.altsep and os.altsep in file_name):
        return False
    # Reject traversal sequences (belt and suspenders after sep check)
    if ".." in file_name:
        return False
    # Reject null bytes
    if "\x00" in file_name:
        return False
    return True
```

**Files modified:**
- `src/python/web/handler/controller.py` — add `_is_safe_filename()` check in all `__handle_action_*` methods, return 400 on invalid input

**Note:** The extract path (`controller.extract_path`) and local path (`lftp.local_path`) are already validated at config-load time as non-empty strings. The guard only needs to validate the incoming `file_name` parameter.

### Feature 3: Config File Written with Restrictive Permissions (0600)

**What it is:** After writing `settings.cfg`, `os.chmod(path, 0o600)` so only the owning user can read it.

**Integration layer:** `persist.py` — specifically the `Persist.to_file()` method, which is the sole write path for all persist files.

**Current state:** `Persist.to_file()` uses a plain `open(file_path, "w")` with no permission enforcement. The OS applies the process umask.

**Change:**
```python
# persist.py — Persist.to_file()
def to_file(self, file_path: str):
    with open(file_path, "w") as f:
        f.write(self.to_str())
    os.chmod(file_path, 0o600)
```

**Scope:** This applies to ALL persist files (`settings.cfg`, `autoqueue.persist`, `controller.persist`) since they all use `Persist.to_file()`. That is desirable — all three files can contain sensitive data or internal state.

**Subtlety — file creation vs. update:** If the file doesn't exist, `open(..., "w")` creates it. The OS applies the umask, then `chmod` corrects it. If the file already exists with wrong permissions (e.g., user manually created it), `chmod` corrects that too. No special case needed.

**Files modified:**
- `src/python/common/persist.py` — one-line `os.chmod` addition after write

### Feature 4: Webhook Endpoint Hardening (Require Secret or Restrict to Localhost)

**What it is:** Currently, an empty `webhook_secret` silently skips HMAC verification, allowing unauthenticated webhook posts. The hardening options are: (a) make an empty secret restrict webhooks to localhost-only requests, or (b) warn loudly when running without a secret.

**Integration layer:** `WebhookHandler._verify_hmac()` in `web/handler/webhook.py`.

**Current flow:**
```python
if not secret:
    return None  # Skip HMAC — accept any caller
```

**Hardened flow:**
```python
if not secret:
    # Fallback: only accept requests from loopback
    remote_addr = bottle.request.environ.get("REMOTE_ADDR", "")
    try:
        addr = ipaddress.ip_address(remote_addr)
        if not addr.is_loopback:
            logger.warning("Webhook rejected from non-localhost: %s (no secret configured)", remote_addr)
            return HTTPResponse(status=403, body="Webhook secret not configured; only localhost allowed")
    except ValueError:
        return HTTPResponse(status=403, body="Cannot verify caller address")
    return None  # Localhost with no secret: allow
```

**Important:** `REMOTE_ADDR` reflects the direct TCP peer. In Docker setups, `*arr` apps typically run in the same Docker network or on the same host. If using a reverse proxy, `X-Forwarded-For` is not safe to trust for access control (can be spoofed). Document this limitation in config notes.

**Files modified:**
- `src/python/web/handler/webhook.py` — update `_verify_hmac()` with localhost fallback

### Feature 5: Additional Config Field Redaction (host/username/path)

**What it is:** The `/server/config/get` endpoint already redacts `remote_password`, `sonarr_api_key`, `radarr_api_key`, and `webhook_secret`. The remaining sensitive fields are `remote_address` (seedbox hostname), `remote_username`, `remote_path`, and `remote_path_to_scan_script`.

**Integration layer:** `serialize_config.py` — the `_SENSITIVE_FIELDS` dict.

**Change:**
```python
_SENSITIVE_FIELDS = {
    "lftp": ["remote_password", "remote_address", "remote_username",
             "remote_path", "remote_path_to_scan_script"],
    "sonarr": ["sonarr_api_key"],
    "radarr": ["radarr_api_key"],
    "general": ["webhook_secret", "api_token"],  # api_token added here too
}
```

**Constraint:** Angular's Settings page currently displays these fields for editing. Displaying `**REDACTED**` in the input boxes would prevent the user from changing them. The established pattern (from v3.1) is that the Angular Settings UI does NOT pre-fill sensitive fields from the API — users re-type credentials when changing them. Verify this is already the case for `remote_password` before extending to host/username/path.

**Files modified:**
- `src/python/web/serialize/serialize_config.py` — extend `_SENSITIVE_FIELDS`

### Feature 6: SSRF DNS Rebinding Fix (Resolve-Once Pattern)

**What it is:** The current `ConfigHandler._validate_url()` calls `socket.getaddrinfo()` at validation time. The actual HTTP request (made by `requests.get()`) performs a second DNS resolution. An attacker using DNS rebinding can make the first resolution return a public IP (passing validation) and the second return a private IP (achieving SSRF).

**Integration layer:** `ConfigHandler` in `web/handler/config.py`.

**Current state:**
```python
addr_infos = socket.getaddrinfo(hostname, None)
# ... check all IPs are public ...
# Then later:
response = requests.get(url, ...)  # Performs its own DNS lookup
```

**Fix — resolve-once pattern:** Resolve the hostname to an IP once, validate the IP, then make the HTTP request to the IP directly (substituting the hostname in the URL with the resolved IP, or by providing a custom DNS resolver).

**Recommended approach:** Use `socket.getaddrinfo()` to resolve, pick the first valid public IP, then construct the request URL with the IP substituted and set the `Host` header manually:

```python
def _resolve_and_validate(url: str) -> tuple[str, Optional[str]]:
    """
    Resolve hostname, validate all IPs are public, return (ip_url, error).
    ip_url has the hostname replaced with the resolved IP, preventing re-resolution.
    """
    parsed = urlparse(url)
    hostname = parsed.hostname
    try:
        addr_infos = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80))
    except socket.gaierror:
        return ("", "Cannot resolve hostname")

    chosen_ip = None
    for addr_info in addr_infos:
        ip_str = addr_info[4][0]
        try:
            addr = ipaddress.ip_address(ip_str)
            if addr.is_private or addr.is_loopback or addr.is_reserved or addr.is_link_local:
                return ("", "URL resolves to a private/reserved IP address")
            if chosen_ip is None:
                chosen_ip = ip_str
        except ValueError:
            pass

    if not chosen_ip:
        return ("", "No valid public IP found for hostname")

    # Build URL with IP, keeping original Host for SNI/vhost
    ip_url = parsed._replace(netloc=chosen_ip).geturl()
    return (ip_url, None)
```

Then the HTTP request uses `ip_url` and sets `Host: {hostname}` header. This prevents a second DNS lookup.

**Files modified:**
- `src/python/web/handler/config.py` — replace `_validate_url()` with `_resolve_and_validate()` returning a tuple; update callers to use the returned IP-based URL

### Feature 7: Restart Endpoint Changed to POST (CSRF Prevention)

**What it is:** `GET /server/command/restart` can be triggered by a `<img src="...">` tag or browser prefetch. POST requires intentional form submission or JavaScript fetch, preventing cross-site attacks.

**Integration layer:** `ServerHandler` in `web/handler/server.py` and `ServerCommandService` in Angular.

**Python change:**
```python
# server.py
@overrides(IHandler)
def add_routes(self, web_app: WebApp):
    web_app.add_post_handler("/server/command/restart", self.__handle_action_restart)
    # Was: web_app.add_handler(...) which registers GET
```

**Angular change:**
```typescript
// server-command.service.ts
public restart(): Observable<WebReaction> {
    return this._restService.post(this.RESTART_URL);  // Was: sendRequest (GET)
}
```

**Files modified:**
- `src/python/web/handler/server.py` — change `add_handler` to `add_post_handler`
- `src/angular/src/app/services/server/server-command.service.ts` — change `sendRequest` to `post`

### Feature 8: SSH Command Log Redaction (user@host scrubbing)

**What it is:** SSH connection logs (and possibly LFTP logs) emit `user@host` strings. `LogStreamHandler` should scrub these in the SSE log stream.

**Integration layer:** `stream_log.py` (LogStreamHandler) and possibly the logging formatter in `seedsync.py`.

**Current state:** The v3.1 `getMessage()` override in the logging handler catches format-arg passwords, but `user@host` patterns in SSH/LFTP command outputs are literal strings in log records, not format args.

**Change:** Add a regex substitution in the log stream handler before yielding each line:
```python
import re
_SSH_USER_HOST_RE = re.compile(r'\b[\w\-.]+@[\w\-.]+\b')

def _scrub_log_line(line: str) -> str:
    return _SSH_USER_HOST_RE.sub("***@***", line)
```

**Files modified:**
- `src/python/web/handler/stream_log.py` — add scrubbing in `get_value()` before yielding

### Feature 9: CSP `unsafe-inline` Removal (Nonce-Based Policy)

**What it is:** The current CSP includes `script-src 'self' 'unsafe-inline'`. Removing `unsafe-inline` requires either (a) nonces on every inline script/style, or (b) moving all inline scripts to external files.

**Integration layer:** `web_app.py` (`_add_security_headers` hook) and `src/angular/src/index.html`.

**The problem:** Angular's production build does NOT use inline scripts. The issue is:
1. Google Fonts `<link rel="preconnect">` preload tags (not inline scripts — these are fine with `connect-src`)
2. Any server-side injected inline content (if adding nonce-based token injection from Feature 1)

**Nonce approach:**
- Generate a cryptographically random nonce per request: `secrets.token_urlsafe(16)`
- Set it in CSP: `script-src 'self' 'nonce-{nonce}'`
- The nonce must be present on any `<script>` tag in the served HTML
- Angular production builds have no inline scripts, so the nonce in CSP is mainly for defense against injected scripts

**Serving index.html with nonce injection:**
```python
# web_app.py — __index() modified
def __index(self):
    nonce = secrets.token_urlsafe(16)
    # Store nonce in thread-local for after_request hook
    bottle.request.environ['csp_nonce'] = nonce
    # Read, inject nonce, serve
    index_path = os.path.join(self._html_path, "index.html")
    with open(index_path, "r") as f:
        content = f.read()
    # Inject api-token meta and nonce
    content = content.replace(
        '</head>',
        f'<meta name="api-token" content="{self._get_api_token()}">\n</head>'
    )
    return content
```

```python
# After-request hook updates CSP with per-request nonce
@self.hook('after_request')
def _add_security_headers():
    nonce = bottle.request.environ.get('csp_nonce', '')
    nonce_directive = f" 'nonce-{nonce}'" if nonce else ""
    bottle.response.set_header(
        'Content-Security-Policy',
        f"default-src 'self'; "
        f"script-src 'self'{nonce_directive}; "  # unsafe-inline removed
        f"style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        f"font-src 'self' https://fonts.gstatic.com; "
        f"connect-src 'self' https://api.github.com; "
        f"img-src 'self' data:; "
        f"frame-ancestors 'none'"
    )
    # ... other headers unchanged
```

**Note on `style-src 'unsafe-inline'`:** Angular uses inline styles for component view encapsulation. Removing `style-src 'unsafe-inline'` requires `::ng-deep` removal or `nonce` on styles — significant Angular refactor. Keep `style-src 'unsafe-inline'` for now; focus on `script-src` only.

**Files modified:**
- `src/python/web/web_app.py` — generate nonce, inject into `index.html` serving, update CSP header
- `src/angular/src/index.html` — add `<meta name="api-token">` placeholder (or server injects after `<head>`)

## Component Classification: New vs. Modified

| Feature | New Components | Modified Components |
|---------|---------------|---------------------|
| API token auth | none | `web_app.py` (before_request hook), `config.py` (new field), `serialize_config.py` (redaction), `seedsync.py` (auto-generate), `rest.service.ts` (header), `index.html` (meta tag) |
| Path traversal guard | `_is_safe_filename()` utility fn | `handler/controller.py` (validation in each handler) |
| Config file permissions | none | `common/persist.py` (chmod after write) |
| Webhook hardening | none | `handler/webhook.py` (_verify_hmac localhost fallback) |
| Config redaction | none | `serialize/serialize_config.py` (_SENSITIVE_FIELDS extension) |
| DNS rebinding fix | none | `handler/config.py` (_resolve_and_validate refactor) |
| Restart → POST | none | `handler/server.py` (method change), `server-command.service.ts` (method change) |
| SSH log redaction | none | `handler/stream_log.py` (regex scrub) |
| CSP nonce | none | `web_app.py` (nonce generation + injection) |

## Data Flow Changes

### Auth Request Flow (New)

```
[Angular] — HTTP request with Authorization: Bearer <token>
    ↓
[Bottle WSGI]
    ↓
[before_request hook] — check Authorization header
    ├─ Exempt path? → pass through immediately
    ├─ No token configured? → pass through (backward compat)
    ├─ Invalid/missing token? → abort(401)
    └─ Valid token? → continue to handler
    ↓
[Handler] — processes request normally
    ↓
[after_request hook] — sets security headers (unchanged)
```

### Config File Write Flow (Modified)

```
[Controller/WebApp] — config value changed
    ↓
[Seedsync.persist()] — called every N seconds
    ↓
[Config.to_file(path)] — calls Persist.to_file()
    ↓
[open(path, "w")] — write INI content
    ↓
[os.chmod(path, 0o600)] — NEW: enforce restrictive permissions
```

### Webhook Request Flow (Modified)

```
[Sonarr/Radarr] — POST /server/webhook/{source}
    ↓
[WebhookHandler._verify_hmac()]
    ├─ Secret configured? → HMAC verify (unchanged)
    └─ No secret? → NEW: check REMOTE_ADDR is loopback
        ├─ Loopback? → allow
        └─ Remote? → 403 Forbidden
    ↓
[Webhook processing] — unchanged
```

### *arr Test-Connection Flow (Modified)

```
[Angular] — GET /server/config/{arr}/test-connection
    ↓
[ConfigHandler.__handle_test_{arr}_connection()]
    ↓
[_resolve_and_validate(url)] — NEW: single DNS resolution
    ├─ Resolution fails? → error response
    ├─ Private IP found? → error response
    └─ Returns (ip_url, None) — IP-substituted URL
    ↓
[requests.get(ip_url, headers={"Host": hostname, ...})]
    — No second DNS resolution possible
```

## Recommended Project Structure Changes

No new directories are needed. All changes are modifications to existing files:

```
src/
├── python/
│   ├── common/
│   │   ├── config.py              # MODIFY: add api_token to Config.General
│   │   └── persist.py             # MODIFY: chmod after write
│   ├── web/
│   │   ├── web_app.py             # MODIFY: before_request auth + CSP nonce
│   │   └── handler/
│   │       ├── controller.py      # MODIFY: path traversal guard
│   │       ├── config.py          # MODIFY: resolve-once SSRF fix
│   │       ├── server.py          # MODIFY: GET → POST for restart
│   │       ├── webhook.py         # MODIFY: localhost fallback
│   │       └── stream_log.py      # MODIFY: SSH user@host scrub
│   │   └── serialize/
│   │       └── serialize_config.py # MODIFY: extend _SENSITIVE_FIELDS
│   └── seedsync.py                # MODIFY: auto-generate api_token
└── angular/
    └── src/
        ├── index.html             # MODIFY: meta tag placeholder for api-token
        └── app/
            └── services/
                ├── server/
                │   └── server-command.service.ts  # MODIFY: GET → POST restart
                └── utils/
                    └── rest.service.ts            # MODIFY: attach Authorization header
```

## Architectural Patterns

### Pattern 1: Bottle Hook for Cross-Cutting Concerns

**What:** Use `@app.hook('before_request')` and `@app.hook('after_request')` for security logic that applies to all routes.

**When to use:** Auth, security headers, audit logging — anything that should run on every request without per-handler modifications.

**Trade-offs:**
- Pro: Zero handler changes when adding new routes later
- Pro: Single code path to audit
- Con: Must explicitly enumerate exempt paths (can miss new routes if not careful)

**Example:**
```python
@self.hook('before_request')
def _check_auth():
    path = bottle.request.path
    if path in AUTH_EXEMPT:
        return
    # ... auth logic
```

### Pattern 2: Redact at Serialization, Not Storage

**What:** Internal code reads real values; API responses see `**REDACTED**`. Implemented in `SerializeConfig.config()`.

**When to use:** Any field that must be writable through the UI but should not be readable through the API.

**Trade-offs:**
- Pro: No complexity at read/write path in Config internals
- Pro: Single redaction point is easy to audit
- Con: Frontend must handle the UX of "redacted" values (don't pre-fill inputs)

### Pattern 3: Constant-Time Comparison for Secrets

**What:** Use `hmac.compare_digest()` instead of `==` for token/HMAC comparisons.

**When to use:** Any comparison of a caller-provided value against a secret.

**Rationale:** `==` short-circuits on first mismatch, creating a timing side channel. `hmac.compare_digest()` always takes the same time regardless of where the strings differ.

**Example (already in WebhookHandler, replicate for auth middleware):**
```python
if not hmac.compare_digest(expected_token, provided_token):
    bottle.abort(401, "Unauthorized")
```

### Pattern 4: Resolve-Once for SSRF Protection

**What:** Resolve DNS once, validate the IP, then use the IP directly for the outbound request.

**When to use:** Any server-side HTTP request to a user-supplied URL.

**Trade-offs:**
- Pro: Eliminates the TOCTOU window between DNS validation and actual request
- Con: Slightly more complex; must set `Host` header manually for virtual hosting
- Con: May break with services that rotate IPs (CDNs) — but SSRF protection is worth it

## Build Order: Dependency-Aware Sequence

The features have dependencies that constrain build order:

```
Feature 3 (config permissions)
    — no dependencies, can be done first
    — low risk, one-line change

Feature 7 (restart → POST)
    — no dependencies, safe early
    — both Python and Angular sides must ship together

Feature 8 (SSH log redaction)
    — no dependencies, isolated to stream_log.py

Feature 5 (config redaction expansion)
    — no dependencies, isolated change

Feature 4 (webhook hardening)
    — no dependencies, isolated to webhook.py

Feature 6 (DNS rebinding fix)
    — no dependencies (builds on existing _validate_url)
    — moderate complexity

Feature 2 (path traversal guard)
    — no dependencies (handler-only)
    — should be done before Feature 1 (auth) so guards are present before requests flow through auth

Feature 1 (API token auth)  ←— depends on Feature 5 (redaction covers api_token)
    — most complex: Python hook + config field + Angular header + index.html injection
    — must ship Python and Angular changes atomically

Feature 9 (CSP nonce)  ←— should be done after Feature 1 (shares index.html injection)
    — complex: nonce generation + per-request CSP update + index.html templating
    — can reuse the same index.html serving refactor as Feature 1
```

**Recommended phase order:**

| Phase | Features | Rationale |
|-------|----------|-----------|
| 1 | Config permissions (3) + Restart POST (7) + SSH redaction (8) | Zero-risk, isolated, no inter-dependencies |
| 2 | Config redaction expansion (5) + Webhook hardening (4) + DNS rebinding fix (6) | Config-layer and network-layer hardening, no frontend changes |
| 3 | Path traversal guard (2) | Backend-only, completes backend hardening before auth layer |
| 4 | API token auth (1) | Highest complexity, Python + Angular must ship together; do last to avoid breaking other phases |
| 5 | CSP nonce removal (9) | Shares index.html refactor with auth; piggybacks on Feature 1's serving changes |

**Why auth (Feature 1) goes last:** It's the only change that, if shipped broken, locks the UI out of the entire backend. All other features are additive hardening. Auth must be tested thoroughly and shipped with both sides (Python hook + Angular header) in sync.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Sonarr/Radarr (webhook callers) | POST /server/webhook/{source} with HMAC | Webhook hardening adds localhost restriction when no secret — verify *arr runs on same host |
| Google Fonts CDN | `<link>` tags in index.html, `connect-src` in CSP | No change; already in CSP allowlist |
| GitHub API (version check) | GET https://api.github.com — `connect-src` in CSP | No change |

### Internal Boundaries

| Boundary | Communication | Security Notes |
|----------|---------------|----------------|
| Angular ↔ Bottle API | HTTP on same origin | Auth header added; all mutations already POST/DELETE |
| Angular ↔ Bottle SSE stream | Long-poll GET /server/stream | Auth must be checked at connect time (connection establishment), not mid-stream |
| Bottle ↔ Config file | `persist.py` read/write | chmod enforced on write |
| Bottle ↔ Controller thread | Thread-safe command queue | No change |
| WebhookHandler ↔ caller | Direct HTTP POST | Hardened: HMAC required or localhost-only |

## Anti-Patterns

### Anti-Pattern 1: Per-Handler Auth Checks

**What people do:** Add `if not _check_token(): return 401` at the top of every handler method.

**Why it's wrong:** New handlers added later will silently lack auth. The exemption list is scattered across dozens of methods.

**Do this instead:** Single `before_request` hook with an explicit exemption list. New handlers get auth automatically.

### Anti-Pattern 2: Two DNS Lookups (Current SSRF approach)

**What people do:** Validate URL with one DNS resolution, make the HTTP request with another.

**Why it's wrong:** DNS rebinding attacks exploit the gap between these two lookups.

**Do this instead:** Resolve once, validate the resolved IP, use the IP directly for the request.

### Anti-Pattern 3: Trusting X-Forwarded-For for Webhook Source Restriction

**What people do:** Use `request.headers.get("X-Forwarded-For")` to check if webhook came from a trusted host.

**Why it's wrong:** `X-Forwarded-For` is a client-provided header and can be spoofed. Only `REMOTE_ADDR` (the direct TCP peer) is reliable for access control.

**Do this instead:** Use `bottle.request.environ.get("REMOTE_ADDR")` for source-IP checks.

### Anti-Pattern 4: Storing Token in Client-Readable Config Endpoint

**What people do:** Return the API token through `/server/config/get` for Angular to read.

**Why it's wrong:** Any page that can make GET requests (including XSS scripts) can read the token. The token endpoint itself should be exempt from auth, creating a circular problem.

**Do this instead:** Inject the token into `index.html` at serve time (server-side), where it is part of the initial document and not separately fetchable.

## Sources

All findings are HIGH confidence — derived from direct inspection of the SeedSync codebase (v3.1 state). No external research required for integration point mapping.

- `src/python/web/web_app.py` — after_request hook, static serving, SSE stream
- `src/python/web/web_app_builder.py` — handler wiring
- `src/python/web/handler/webhook.py` — existing HMAC pattern
- `src/python/web/handler/config.py` — existing SSRF validation
- `src/python/web/handler/controller.py` — delete/extract handler structure
- `src/python/web/handler/server.py` — restart endpoint (GET method)
- `src/python/web/serialize/serialize_config.py` — existing redaction pattern
- `src/python/common/config.py` — Config.General, InnerConfig property system
- `src/python/common/persist.py` — Persist.to_file() write path
- `src/python/seedsync.py` — startup/config init flow
- `src/angular/src/index.html` — SPA entry point structure
- `src/angular/src/app/services/utils/rest.service.ts` — HTTP request patterns
- `src/angular/src/app/services/server/server-command.service.ts` — restart call site

---
*Architecture research for: SeedSync v3.2 Security Hardening II*
*Researched: 2026-02-25*
