# Pitfalls Research

**Domain:** Adding security hardening features to existing Bottle + Angular self-hosted app
**Researched:** 2026-02-25
**Confidence:** HIGH

This document is scoped to v3.2 Security Hardening II — the specific failure modes that arise when adding
(1) API auth middleware, (2) path traversal guards, (3) CSP nonce removal, (4) webhook auth hardening,
and (5) DNS rebinding prevention to an already-running application.

---

## Critical Pitfalls

### Pitfall 1: Auth Middleware Killing the SSE Stream

**What goes wrong:**
The SSE endpoint (`/server/stream`) is a long-lived generator function that yields events indefinitely. If a
Bearer-token auth middleware checks the `Authorization` header on every request and returns 401 for missing
tokens, the SSE stream is blocked at the HTTP handshake — before the generator ever starts. The Angular
frontend reconnects immediately (SSE spec), sees another 401, reconnects again, and the app enters an
infinite reconnection loop with no file list, no status updates, and no logs visible.

**Why it happens:**
Bottle does not have built-in middleware in the Django/Flask sense. Auth is typically implemented as:
(a) a decorator on each route, or (b) a `before_request` hook. Both approaches apply uniformly to ALL
routes unless the developer explicitly exempts the SSE endpoint. Since SSE connections arrive without a
request body (they are plain GET requests with `Accept: text/event-stream`), a naive token check that
only looks at a header will block it if the Angular `EventSource` constructor cannot send custom headers
(it cannot — `EventSource` in browsers does not support custom headers by design).

**How to avoid:**
1. **Do not use `Authorization: Bearer` headers with `EventSource`** — the browser's native `EventSource`
   API cannot send them. Instead, use one of:
   - A query-parameter token: `/server/stream?token=<tok>` (validate server-side, log only first N chars)
   - A short-lived session cookie set on first auth, sent automatically by the browser
   - A pre-flight REST handshake that issues a streaming token
2. In `web_app.py`'s `before_request` hook (if used), explicitly exempt `/server/stream` from token checks
   OR handle the stream token validation inside `__web_stream()` before the generator yields anything.
3. The current architecture instantiates all `IStreamHandler` objects inside `__web_stream()` before the
   yield loop. Auth validation belongs at the top of `__web_stream()`, returning a 401 `HTTPResponse`
   before `setup()` is called on any handler — this is safe.
4. Test SSE reconnect behavior explicitly: disconnect the browser, wait for the SSE client-side reconnect,
   verify the reconnected stream resumes without re-authenticating via a new token round-trip.

**Warning signs:**
- Browser console shows `EventSource` repeatedly firing `error` events (status 401/403)
- Angular `ConnectedService` oscillates between connected/disconnected rapidly
- File list never populates after auth is added
- `stream-service.registry.ts` reconnect counter climbs without bound
- Python logs show `Stream connection stopped by client` every few seconds

**Phase to address:**
Phase covering API authentication — must solve SSE auth strategy before writing any auth middleware.
Add explicit test: verify SSE stream delivers model events to an authenticated Angular client.

---

### Pitfall 2: Path Traversal Guard Broken by Symlinks

**What goes wrong:**
A guard that uses `os.path.abspath()` or `os.path.realpath()` to reject paths outside `local_path`
will behave differently for symlinks. If `local_path` itself is a symlink (common on seedboxes where
download dirs are symlinked from `/home/user/downloads` → `/mnt/storage/downloads`), `realpath()` resolves
through the symlink and the guard's base path changes. A file named `legit-file.mkv` that lives in the
real download directory passes, but a file that is itself a symlink pointing outside the download dir
(e.g., a symlink to `/etc/passwd`) will also pass the `abspath()` check if `abspath()` is used — because
`abspath()` does NOT follow symlinks for existence, it only normalizes the string.

**Why it happens:**
- `os.path.abspath(path)` normalizes `.` and `..` in the string but does NOT call `stat()` — it does not
  follow symlinks.
- `os.path.realpath(path)` follows all symlinks to their ultimate target. It is the correct choice for
  containment checks but changes semantics if the base dir is itself a symlink.
- `shutil.rmtree()` (used in `DeleteLocalProcess.run_once()`) follows symlinks into directories before
  v3.8 Python, and in all versions deletes symlinks as files but traverses into real directories. A
  symlink-to-directory that passes the guard could cause `rmtree` to delete outside the download dir.

**How to avoid:**
1. **Resolve both the base path and the target path with `realpath()` before comparing:**
   ```python
   base = os.path.realpath(self.__local_path)
   target = os.path.realpath(os.path.join(self.__local_path, file_name))
   if not target.startswith(base + os.sep):
       raise ValueError("Path traversal detected: {}".format(file_name))
   ```
2. **Detect when the target is itself a symlink** even if containment passes:
   ```python
   if os.path.islink(os.path.join(self.__local_path, file_name)):
       raise ValueError("Refusing to delete symlink: {}".format(file_name))
   ```
   This is conservative but correct for a security-hardened tool.
3. **Validate at the HTTP handler layer** (in `ControllerHandler`) rather than (only) inside the
   subprocess — the subprocess runs after the command is already on the queue; handler-layer rejection
   avoids the queuing entirely.
4. The file name arriving at `__handle_action_delete_local` comes from URL double-decode (`unquote`).
   Ensure the decoded name does not start with `/` or contain `..` components before passing to the
   controller. A simple check: `os.path.basename(file_name) == file_name` rejects anything with a path
   separator, which is the correct invariant for names that are supposed to be top-level entries in
   `local_path`.

**Warning signs:**
- Acceptance tests pass file names like `../../etc/passwd` or `../outside/file.txt` without rejection
- `local_path` in config is configured as a symlink and guard logic uses string-only normalization
- `shutil.rmtree` is called with a path that resolves outside the download directory
- Log messages show unusual paths being deleted (paths outside the configured `local_path`)

**Phase to address:**
Phase covering path traversal protection. Guards must be added at both the HTTP handler layer and
the `DeleteLocalProcess.run_once()` layer (defense in depth). Test with: `../x`, `../../etc`, absolute
paths like `/tmp/x`, symlinks within `local_path` pointing outside it.

---

### Pitfall 3: CSP `unsafe-inline` Removal Breaking Angular's Runtime

**What goes wrong:**
The current CSP in `web_app.py` includes `script-src 'self' 'unsafe-inline'`. Removing `'unsafe-inline'`
to improve security will immediately break Angular's production build in one or more of these ways:
(a) Angular inlines small scripts in `index.html` for zone.js bootstrapping and router preloading.
(b) Bootstrap JavaScript (Popper.js) may inject inline event handlers.
(c) Any use of `[innerHTML]` or `DomSanitizer.bypassSecurityTrust*` in Angular components will be blocked.
(d) The CRT scan-line overlay is implemented as a CSS pseudo-element, but if any style is applied via
    `element.style` in JavaScript, it will be blocked by a `style-src` without `'unsafe-inline'`.

A nonce-based CSP (`script-src 'nonce-<random>'`) is the correct replacement, but nonces require
per-response generation — meaning every response, including the `index.html` served by Bottle's
`static_file()`, must inject a fresh nonce. This is non-trivial because `static_file()` returns a file
directly without template rendering.

**Why it happens:**
Angular's production build (as of Angular 15+) supports CSP nonces via the `ngCspNonce` attribute
on `<app-root>` or the `CSP_NONCE` injection token. However, this only covers Angular-generated inline
styles (used for component styles in non-shadow-DOM setups). It does NOT cover:
- Scripts injected by third-party packages
- Inline scripts already present in `index.html` (Google Fonts `<link>` is not a script but the
  preconnect hints are sometimes inlined in some configs)
- Any script added by `DomService` or dynamic component creation

A strict CSP without `'unsafe-inline'` and without nonces will produce silent failures: components render
but event bindings silently fail because Angular couldn't execute bootstrapping scripts.

**How to avoid:**
1. **Do not simply delete `'unsafe-inline'`** without a replacement strategy. The correct sequence is:
   a. Enable CSP violation reporting first (`report-uri /csp-report` or `report-to`) to observe what
      would be blocked before enforcing.
   b. Switch to `Content-Security-Policy-Report-Only` header while testing.
   c. Only harden to enforcement once reporting shows zero violations for a full usage session.
2. **For the nonce approach** (cleanest long-term):
   - Generate a cryptographic nonce per request in Bottle's `after_request` hook (already in place).
   - The nonce must be injected into `index.html` at serve time, which requires moving `index.html`
     from a static file to a template rendered by Bottle's `template()` or Jinja2.
   - Pass the nonce to Angular via `<app-root ngCspNonce="{{ nonce }}">` (Angular 16+).
   - Add `'nonce-{{ nonce }}'` to both `script-src` and `style-src`.
3. **For the `'strict-dynamic'` approach** (simpler with Angular's module bundler):
   - Angular's build produces hashes for known inline scripts; these can replace `'unsafe-inline'`.
   - Build Angular, extract the `sha256-*` hashes from the build output, add them to CSP.
   - Angular 19's `ng build --output-hashing=all` facilitates this.
   - Drawback: hashes change on every build — CSP must be updated with every Angular deploy.
4. **Check `style-src` separately**: Angular uses style encapsulation that may inject component styles.
   The `ViewEncapsulation.Emulated` (default) mode adds `<style>` tags for component-scoped CSS, which
   are blocked by `style-src` without `'unsafe-inline'`. Angular 19 supports style nonces via
   `CSP_NONCE` injection token, but it must be provided with the same nonce value used in the HTTP header.

**Warning signs:**
- Angular app shows blank page or partial render after CSP change
- Browser console shows `Refused to execute inline script` or `Refused to apply inline style`
- The CRT scan-line overlay disappears (CSS pseudo-element itself is fine, but if it's applied via JS `setAttribute` on style, it's blocked)
- Google Fonts fail to load (check `connect-src` and `style-src` for fonts.googleapis.com)
- `Content-Security-Policy-Report-Only` header in DevTools shows repeated violations

**Phase to address:**
Phase covering CSP hardening. Must start with report-only mode. Angular's exact inline script situation
depends on the production build output — analyze the built `index.html` before writing the final CSP.
Do not harden CSP until Angular build artifacts are fully analyzed.

---

### Pitfall 4: Webhook Auth Defaults Breaking Sonarr/Radarr Integrations

**What goes wrong:**
The current HMAC verification logic in `WebhookHandler._verify_hmac()` skips verification when
`webhook_secret` is empty (backward compat for existing installs). If the hardening milestone changes
the default to "require secret or restrict to localhost-only," existing Sonarr/Radarr setups that send
webhooks without a secret will silently stop triggering imports. The auto-delete chain breaks: files
download but never get confirmed as imported → auto-delete never fires → disk fills up.

**Why it happens:**
Sonarr and Radarr's webhook configuration pages have a "Secret" field that defaults to empty. Users who
configured webhooks in v1.8 (before HMAC was introduced in v3.1) have empty secrets on both sides.
If the server side changes the default to "reject requests without a secret," those users see 401 responses
from the webhook endpoints, but Sonarr/Radarr do not surface these errors prominently — the webhook simply
"stops working" from the user's perspective with no obvious error in the SeedSync UI.

Additionally, Sonarr sends a `Test` event when you save the webhook configuration. If the server rejects
the Test with 401, Sonarr shows a connection error. But if the server rejects subsequent `Download` events
(after the Test somehow passed), the failure is invisible.

**How to avoid:**
1. **Do not change the default behavior for existing installs.** The current `empty secret = skip` logic
   is the correct backward-compatible default. Any hardening should be opt-in.
2. **If adding a "localhost-only" restriction as an alternative to HMAC**, implement it as a separate
   config option (e.g., `webhook_require_local_source = false`), not as a new default.
3. **Surface auth failures visibly**: When a webhook request fails HMAC (or localhost check), log at
   WARNING level with the source IP. Add a status indicator in the Settings UI if the last webhook
   attempt failed auth.
4. **Test with actual Sonarr/Radarr Test events**: Sonarr's Test event must receive a 200 response or it
   marks the webhook as failed. Ensure the HMAC check path handles Test events correctly — if the Test
   event carries a signature, verify it; if it doesn't (legacy Sonarr), the empty-secret skip still applies.
5. **Document the migration path clearly**: Users upgrading to stricter defaults need explicit instructions
   for generating and configuring a shared secret on both sides.

**Warning signs:**
- After hardening deploy, Sonarr/Radarr webhook Test shows "connection refused" or auth error
- Auto-delete stops triggering (downloads complete but files are never cleaned up)
- Python logs show `401 Invalid webhook signature` from the Sonarr/Radarr IP
- `WebhookManager` queue never receives new imports after upgrade

**Phase to address:**
Phase covering webhook hardening. Never change default from "empty secret = permissive" to "empty secret
= reject" without an explicit migration guide. New restriction modes must be opt-in config options.

---

### Pitfall 5: DNS Rebinding Fix Blocking Tailscale and Internal Sonarr/Radarr URLs

**What goes wrong:**
The current `ConfigHandler._validate_url()` uses `socket.getaddrinfo()` at config-set time and rejects
URLs that resolve to private/loopback IPs. This works for the intended SSRF scenario (attacker-controlled
URL that resolves to `127.0.0.1`). However, it also blocks legitimate use cases:
- Sonarr running on the same host as SeedSync: `http://localhost:8989` or `http://127.0.0.1:8989`
- Sonarr/Radarr on a local network: `http://192.168.1.100:8989`
- Sonarr/Radarr accessed via Tailscale: `http://100.x.y.z:8989` (Tailscale IPs are in `100.64.0.0/10`,
  which is a shared address space — `ipaddress.ip_address(addr).is_private` returns False for these
  addresses in Python < 3.11, but returns True in Python 3.11+ due to RFC 6598 classification)
- Sonarr accessed via a hostname in `/etc/hosts` or a local DNS (e.g., `http://sonarr.lan:8989`)

**Why it happens:**
The SSRF protection was designed for the threat model of an external attacker setting a malicious Sonarr
URL via the config API. But SeedSync is a self-hosted tool where `localhost`, `192.168.x.x`, and Tailscale
addresses are not only legitimate but are the primary deployment targets. The current blanket block on
private IPs is overly broad for the actual threat model.

Additionally, if a "resolve-once" DNS rebinding fix is added (resolve hostname once at config-save time,
cache the IP, use the cached IP for all subsequent requests), it introduces a new failure: Tailscale IP
addresses can change (machine re-enrolls, IP is recycled), and local DNS hostnames can legitimately point
to different IPs over time. Cached IPs become stale and connections silently fail.

**How to avoid:**
1. **Reconsider the threat model**: SeedSync has no public exposure — it's accessed via Tailscale or
   local network. The primary SSRF threat is a compromised client sending a malicious Sonarr URL, not
   an external attacker. The correct mitigation may be: validate that the URL looks like a reasonable
   Sonarr URL (correct path structure, not a local metadata endpoint) rather than checking the resolved IP.
2. **If keeping IP-based validation**: Add an explicit allowlist for private ranges when the user has
   explicitly configured them:
   ```python
   PRIVATE_RANGES_ALLOWED = [
       ipaddress.ip_network("127.0.0.0/8"),       # localhost
       ipaddress.ip_network("192.168.0.0/16"),    # local network
       ipaddress.ip_network("10.0.0.0/8"),        # local network
       ipaddress.ip_network("172.16.0.0/12"),     # local network
       ipaddress.ip_network("100.64.0.0/10"),     # Tailscale / CGNAT
   ]
   ```
   Then document that this is intentional (SeedSync is a self-hosted tool, private addresses are expected).
3. **For DNS rebinding specifically**: The actual rebinding attack requires an attacker to control DNS
   TTL and serve different IPs for the same hostname. For a self-hosted tool this is an extremely low-risk
   vector. If implementing resolve-once, do NOT cache indefinitely — cap at the DNS TTL or 60 seconds.
4. **Do not break the current test-connection button**: The test-connection endpoints in Settings call
   `_validate_url()` before making the outbound request. If users are testing `http://192.168.1.100:8989`,
   the URL must not be rejected. This is the primary user-visible action that validates the Sonarr config.
5. **Python version note**: `ipaddress.ip_address().is_private` behavior changed in Python 3.11 to
   include more ranges (RFC 6890). Test on the exact Python version in the Docker image.

**Warning signs:**
- Settings page "Test Connection" fails for `localhost`, `127.0.0.1`, or Tailscale IPs after fix
- Users report "URL resolves to a private/reserved IP address" for their normal Sonarr setup
- Sonarr/Radarr integration completely non-functional after DNS rebinding hardening
- Test suite passes (mocked `getaddrinfo`) but real-world behavior differs

**Phase to address:**
Phase covering SSRF / DNS rebinding fix. Must explicitly verify that the test-connection workflow
succeeds for localhost, LAN IPs (`192.168.x.x`), and Tailscale IPs (`100.x.x.x`). If the threat model
does not warrant blocking private IPs, remove that check and rely on other controls (HMAC on webhooks,
no credentials forwarded to arbitrary URLs).

---

### Pitfall 6: Restart Endpoint CSRF — GET-to-POST Migration Breaking Angular Client

**What goes wrong:**
`/server/command/restart` is currently registered as a GET handler in `ServerHandler.add_routes()`.
The CSRF fix is to change it to POST. However, the Angular `RestService.sendRequest()` uses `HttpClient.get()`
for the restart call. If the backend changes to POST without the Angular side being updated simultaneously,
the restart button sends a GET to a POST-only endpoint and receives a 405 Method Not Allowed — the
server restarts nothing, and the user sees an error. This is a bilateral change that must ship atomically.

**Why it happens:**
The Angular service calls are structured around `sendRequest()` (GET) and `post()` (POST) as separate
methods. Changing the backend without updating the corresponding Angular service call is easy to miss
during code review, especially since the restart flow is tested manually (UI click) rather than with
automated tests that exercise both sides.

**How to avoid:**
1. **Change both sides in the same commit/PR**: The backend `add_handler` → `add_post_handler` change
   and the Angular `RestService.sendRequest(url)` → `RestService.post(url)` change for the restart URL
   must be in the same diff.
2. **Verify with Angular unit tests**: `ServerCommandService` should have a test that the restart action
   uses HTTP POST, not GET. This test should be updated before the implementation change to drive the
   correct behavior.
3. **Check all callers**: Search for all references to `/server/command/restart` in the Angular codebase —
   there may be more than one call site if restart is triggered from multiple components.

**Warning signs:**
- Restart button produces a network error in browser DevTools (405 Method Not Allowed)
- Python logs show `GET /server/command/restart` after the backend was changed to POST-only
- Angular unit tests for restart pass (if they still use `sendRequest` which issues GET)

**Phase to address:**
Phase covering CSRF prevention / POST migration. A two-sided change — verify both sides ship together.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Exempting SSE from auth rather than fixing auth transport | Ships quickly | SSE stream is unprotected; attacker on LAN can read file names | Never for production — implement token-in-query-param or cookie |
| Using `abspath()` instead of `realpath()` for path traversal | Simpler code | Symlinks bypass the guard entirely | Never for security-critical path validation |
| CSP report-only mode permanently | Avoids breakage risk | CSP provides no protection in report-only mode | Acceptable for ≤1 week while gathering violations, not indefinitely |
| Keeping `'unsafe-inline'` in CSP while "investigating" | Zero breakage risk | Negates XSS protection entirely | Only during initial report-only observation phase |
| Caching DNS resolution result indefinitely | Fixes rebinding for session | Stale IPs when Tailscale IPs rotate or DNS changes | Never — cap cache at 60s or respect TTL |
| Adding auth only to new endpoints, not existing ones | Incremental rollout | Creates inconsistent security surface; some endpoints unprotected | Never — auth must apply uniformly via middleware/hook |

---

## Integration Gotchas

Common mistakes when connecting to external services or existing system components.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Sonarr/Radarr webhooks | Requiring HMAC secret by default on upgrade | Keep empty-secret = skip as backward-compat default; hardening is opt-in |
| Sonarr/Radarr test-connection | Blocking localhost/LAN IPs with SSRF guard | Explicitly allow private ranges for self-hosted tool; document threat model |
| Angular EventSource + auth | Sending `Authorization` header via EventSource | EventSource cannot send custom headers; use query-param token or cookie |
| Bottle after_request hook | Applying auth check to static file routes | Static files (`/`, `/<path>`, Angular assets) should be exempt from API auth |
| Angular `HttpClient` + CSRF | Forgetting to update Angular when backend changes GET→POST | Change both sides atomically; cover with unit test asserting HTTP method |
| Angular CSP nonce | Generating nonce server-side but not injecting into `index.html` | `index.html` must be served as a template (not raw static file) to inject nonce |
| `socket.getaddrinfo` Python version | `is_private` behavior differs across Python 3.9/3.10/3.11 | Pin Python version in Docker; test SSRF validation on the exact runtime version |

---

## Security Mistakes

Domain-specific security issues specific to this codebase.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Validating path at HTTP layer but not in subprocess | Path traversal guard bypassed by direct controller invocation in tests | Validate in both `ControllerHandler` and `DeleteLocalProcess.run_once()` |
| Using `os.path.basename(file_name) == file_name` as the only check | Passes for symlinks named without separators that point outside `local_path` | Also check for symlink: `os.path.islink()` |
| Logging the full token on auth failure | Token exposure in logs (even partial) | Log only first 4 chars and length: `tok[:4]***` |
| Nonce reuse across requests | Attacker can pre-compute nonce for CSP bypass | Nonce must be generated fresh per response (not once at startup) |
| Webhook IP restriction without testing Sonarr's outbound IP | Sonarr may send from container IP or reverse proxy IP, not its configured URL IP | Rely on HMAC, not IP allowlists — HMAC is portable across network topologies |
| Applying auth to `/server/stream` without token transport solution | SSE permanently broken for all users | Design SSE auth transport before implementing auth middleware |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Path traversal guard:** Often only checks string normalization — verify `realpath()` is used and symlinks within `local_path` pointing outside are rejected
- [ ] **SSE + auth:** Often auth is added but SSE is not tested — verify Angular file list populates after auth middleware is in place
- [ ] **CSP hardening:** Often `unsafe-inline` is removed without verifying Angular build output — verify app bootstraps and Google Fonts load after CSP change
- [ ] **Webhook auth defaults:** Often new default breaks existing installs — verify existing empty-secret configurations still receive webhooks
- [ ] **DNS rebinding fix:** Often blocks localhost — verify Settings test-connection works for `http://localhost:8989`, `http://192.168.x.x:8989`, and a Tailscale IP
- [ ] **Restart endpoint POST migration:** Often backend is updated but Angular client is not — verify restart button works end-to-end after the change
- [ ] **Auth middleware scope:** Often applies to all routes including static files — verify Angular app assets still load without auth headers
- [ ] **Config file permissions (0600):** Often the code sets permissions but existing config files are not migrated — verify the permission is set on first write AND on existing file at startup
- [ ] **Token rotation:** Often token auth is implemented with a static config value — verify there is a way to rotate the token without restarting (or document that restart is required)

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| SSE broken by auth middleware | LOW | Add auth exemption for `/server/stream` in hook; redeploy |
| Path traversal bypassed by symlink | MEDIUM | Add `realpath()` check and symlink rejection to both layers; audit logs for anomalous paths |
| CSP change breaks Angular | LOW | Revert CSP header to include `'unsafe-inline'` temporarily; switch to report-only; analyze violations |
| Webhook auth breaks Sonarr/Radarr | LOW | Set `webhook_secret` back to empty in config; redeploy; document migration path |
| DNS rebinding fix blocks Tailscale | LOW | Add `100.64.0.0/10` to allowed private ranges; redeploy |
| Restart endpoint 405 after GET→POST migration | LOW | Update Angular `ServerCommandService` to use `RestService.post()`; rebuild frontend |
| Auth middleware applied to static files | LOW | Scope middleware to `/server/` prefix only; redeploy |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Auth breaks SSE stream | API auth phase — design SSE token transport first | Angular file list populates with auth enabled; no reconnect loop |
| Path traversal bypasses symlinks | Path traversal guard phase — use `realpath()` at both layers | Test with symlinked `local_path` and symlinks within it pointing outside |
| CSP unsafe-inline removal | CSP hardening phase — report-only first | Zero violations in report-only for a full session; app bootstraps cleanly |
| Webhook defaults break existing installs | Webhook hardening phase — keep empty-secret skip | Existing empty-secret Sonarr/Radarr setups still deliver webhooks |
| DNS rebinding fix blocks Tailscale | SSRF/DNS rebinding phase — validate against real network topology | Test-connection works for localhost, LAN IPs, Tailscale IPs |
| Restart GET→POST breaks Angular | CSRF / POST migration phase — change both sides atomically | Restart button works end-to-end; Angular unit test asserts POST method |
| Auth scope includes static files | API auth phase — scope to `/server/` prefix | Angular SPA loads without auth headers; only API calls require token |

---

## Sources

**Bottle Framework:**
- [Bottle documentation: Hooks](https://bottlepy.org/docs/dev/api.html#bottle.Bottle.hook) — `before_request` hook applies to all routes unless explicitly exempted
- [Bottle documentation: Routing](https://bottlepy.org/docs/dev/routing.html) — route matching and handler registration

**Browser EventSource Limitations:**
- [MDN: EventSource](https://developer.mozilla.org/en-US/docs/Web/API/EventSource) — EventSource does not support custom request headers; credentials option only controls cookies
- [WHATWG: Server-sent events spec](https://html.spec.whatwg.org/multipage/server-sent-events.html) — EventSource reconnects automatically on connection loss

**Path Traversal and Symlinks:**
- [CWE-22: Improper Limitation of a Pathname](https://cwe.mitre.org/data/definitions/22.html) — includes symlink-based traversal as a variant
- [Python os.path.realpath docs](https://docs.python.org/3/library/os.path.html#os.path.realpath) — resolves symlinks; behavior difference from `abspath()`
- [Python shutil.rmtree docs](https://docs.python.org/3/library/shutil.html#shutil.rmtree) — symlink handling notes

**CSP and Angular:**
- [Angular: Content Security Policy](https://angular.dev/best-practices/security#content-security-policy) — Angular 16+ `ngCspNonce` attribute and `CSP_NONCE` token
- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) — nonce, hash, and strict-dynamic directives
- [MDN: CSP violations and reporting](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP#violation_reporting) — report-only mode

**DNS Rebinding:**
- [OWASP: DNS Rebinding](https://owasp.org/www-community/attacks/DNS_Rebinding) — attack mechanics and mitigations
- [Python ipaddress: is_private behavior change in 3.11](https://docs.python.org/3/library/ipaddress.html) — RFC 6890 ranges added in 3.11
- [Tailscale IP range: 100.64.0.0/10 CGNAT](https://tailscale.com/kb/1033/ip-and-dns-mappings) — Tailscale uses CGNAT address space

**Sonarr/Radarr Webhooks:**
- [Sonarr webhook documentation](https://wiki.servarr.com/sonarr/settings#connections) — Test event behavior and secret field
- [Radarr webhook documentation](https://wiki.servarr.com/radarr/settings#connections) — mirrors Sonarr webhook spec

**CSRF Prevention:**
- [OWASP: CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) — GET-to-POST migration rationale

---
*Pitfalls research for: Adding security hardening to existing Bottle + Angular self-hosted file sync app*
*Researched: 2026-02-25*
*Confidence: HIGH — Based on direct codebase analysis (web_app.py, webhook.py, config.py, delete_process.py), official docs, and known ecosystem behaviors*
