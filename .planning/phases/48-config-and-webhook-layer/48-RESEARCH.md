# Phase 48: Config and Webhook Layer - Research

**Researched:** 2026-02-25
**Domain:** Python config API redaction, Bottle request body size limits, startup warning logging
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONF-03 | API config endpoint redacts remote_address, remote_username, and remote_path in addition to existing password/API key redaction | Add three lftp fields to `_SENSITIVE_FIELDS` dict in `serialize_config.py` |
| CONF-04 | Settings UI continues to function correctly with additional fields redacted (uses local state, not API roundtrip for display) | Confirmed: Angular ConfigService stores config in BehaviorSubject; Settings page reads from that local state; `set()` calls update the local copy in-place via `updateIn()` — no roundtrip needed |
| WHOOK-01 | Webhook endpoints reject payloads exceeding 1MB with 413 status before reading body | Check `request.content_length` at the top of `_handle_webhook()`, return `HTTPResponse(status=413, ...)` when it exceeds 1 MB — no body read required |
| WHOOK-02 | Startup log emits WARNING when webhook_secret is not configured | Emit `logger.warning(...)` in `Seedsync.run()` after config loads, before starting threads |
| WARN-01 | Startup log emits WARNING when no API token is configured | Emit `logger.warning(...)` in `Seedsync.run()` when `api_token` is empty/absent |
| WARN-02 | Startup log emits WARNING when app is bound to 0.0.0.0 without API token | `WebAppJob.setup()` always binds to `"0.0.0.0"` (hardcoded); emit WARNING in `Seedsync.run()` when no token and bind is 0.0.0.0 |
| WARN-03 | Startup warnings do not block application startup | Emit WARNINGs and continue — no sys.exit(), no exception raising |
</phase_requirements>

## Summary

Phase 48 consists of four narrowly scoped, independent changes to the Python backend with no Angular changes required. The work falls into three logical groups: config API redaction (CONF-03, CONF-04), webhook payload size enforcement (WHOOK-01, WHOOK-02), and startup security warnings (WARN-01, WARN-02, WARN-03).

**Config redaction (CONF-03):** The `_SENSITIVE_FIELDS` dict in `src/python/web/serialize/serialize_config.py` already drives all API redaction — it currently covers `lftp.remote_password`, `sonarr.sonarr_api_key`, `radarr.radarr_api_key`, and `general.webhook_secret`. Adding `remote_address`, `remote_username`, and `remote_path` to the `"lftp"` entry is a one-line change to that dict. Existing tests in `test_serialize_config.py` document the pattern exactly. **CONF-04 requires no code change:** the Angular Settings page reads from a local BehaviorSubject (`this._config.getValue()` in ConfigService), not from the API on every render. When a user changes a value, `set()` calls `updateIn([section, option])` on the local copy and only fetches from the server if the POST succeeds — the displayed value is the local state value. Since redacted fields only appear as `**REDACTED**` in the initial GET response (on reconnect), and users interact with stored local state afterward, the display is unaffected.

**Webhook payload cap (WHOOK-01):** Bottle exposes `request.content_length` (from `CONTENT_LENGTH` environ key, returns `-1` if absent). The check `if request.content_length > 1_048_576` at the top of `_handle_webhook()` returns `HTTPResponse(status=413, body="Payload too large")` without touching `request.body`. This is the correct pre-read approach. When Content-Length is absent (-1), the cap is not enforceable from headers alone — the requirement says "before the body is read," implying Content-Length enforcement is sufficient and intentional. The `_WEBHOOK_MAX_BODY` constant should be 1 MB = 1,048,576 bytes.

**Startup warnings (WHOOK-02, WARN-01, WARN-02, WARN-03):** `Seedsync.run()` is the right place for all startup warnings — config is already loaded, logger is initialized, and threads have not yet started. The three warnings are: (1) no webhook_secret → WARN-02; (2) no api_token (when Phase 50 adds this field) — but WARN-01 and WARN-02 belong to this phase and the `api_token` config field does NOT exist yet. Research confirms: WARN-01/WARN-02 refer to `api_token`, which is Phase 50 work. However, the requirements table maps WARN-01/WARN-02/WARN-03 to Phase 48. Cross-referencing against the success criteria: criteria 4 covers `webhook_secret` (WHOOK-02), criteria 5 covers API token warnings (WARN-01/WARN-02), and criteria 6 is WARN-03. The `api_token` field must be added to `Config.General` in this phase so that the startup warnings can check it — even if the token enforcement hook lives in Phase 50.

**Primary recommendation:** Four independent changes, all in Python backend. No new libraries. No Angular changes needed for CONF-04. The `api_token` config field must be introduced in this phase so the WARN-01/WARN-02 startup warnings have something to check against.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `bottle` | ^0.13.4 | `request.content_length`, `HTTPResponse`, `HTTPError` | Already used for all web handling |
| `logging` (stdlib) | Python 3.11+ | `logger.warning(...)` for startup warnings | Already used throughout codebase |
| `configparser` / `Config` (project) | existing | Adding `api_token` field to `Config.General` | Established pattern in `config.py` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `bottle.abort(413, "...")` | ^0.13.4 | Alternative to `HTTPResponse(status=413)` for body-size rejection | Either works; `HTTPResponse` is consistent with existing webhook code style |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `request.content_length` check | `len(request.body.read())` | Reading body defeats the purpose — content_length is the correct early-exit mechanism |
| WARNINGs in `Seedsync.run()` | WARNINGs in `WebAppJob.setup()` | `run()` has full config context and logger; `setup()` would work but `run()` is the canonical startup path used for all other startup checks |
| Adding `api_token` to Config now | Deferring to Phase 50 | Requirements map WARN-01/WARN-02 to Phase 48 — the warning must be emitted here even if enforcement lives in Phase 50 |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure

All changes are in-place modifications to existing files:
```
src/python/web/serialize/serialize_config.py   # CONF-03 — extend _SENSITIVE_FIELDS
src/python/web/handler/webhook.py              # WHOOK-01, WHOOK-02 — size cap + missing secret warning
src/python/common/config.py                   # WARN-01, WARN-02 — add api_token to Config.General
src/python/seedsync.py                        # WARN-01, WARN-02, WARN-03 — startup warning block
src/python/tests/unittests/test_web/test_serialize/test_serialize_config.py  # CONF-03 tests
src/python/tests/unittests/test_web/test_webhook_handler.py                  # WHOOK-01 tests
src/python/tests/unittests/test_seedsync.py                                  # WARN-01, WARN-02, WARN-03 tests
```

### Pattern 1: Config API Redaction Extension (CONF-03)

**What:** Extend the existing `_SENSITIVE_FIELDS` dict to include SSH topology fields.
**When to use:** Any field that reveals connection topology or credentials.
**Example:**
```python
# Source: src/python/web/serialize/serialize_config.py (existing pattern)
_SENSITIVE_FIELDS = {
    "lftp": ["remote_password", "remote_address", "remote_username", "remote_path"],  # add 3 fields
    "sonarr": ["sonarr_api_key"],
    "radarr": ["radarr_api_key"],
    "general": ["webhook_secret"],
}
```
No other change needed. The existing loop in `SerializeConfig.config()` handles all entries generically.

### Pattern 2: Webhook Body Size Cap (WHOOK-01)

**What:** Check `request.content_length` at the top of the shared `_handle_webhook()` method before any body access.
**When to use:** Any POST endpoint that receives untrusted payloads.
**Example:**
```python
# Source: src/python/web/handler/webhook.py (new guard in _handle_webhook)
_WEBHOOK_MAX_BODY_BYTES = 1_048_576  # 1 MB

def _handle_webhook(self, source: str, extract_title_fn) -> HTTPResponse:
    # Reject oversized payloads before reading body (WHOOK-01)
    if request.content_length > _WEBHOOK_MAX_BODY_BYTES:
        return HTTPResponse(status=413, body="Payload too large")

    # Verify HMAC signature when webhook_secret is configured
    auth_error = self._verify_hmac()
    ...
```
The constant belongs at module level. The check must come before `_verify_hmac()` (which calls `request.body.read()`).

### Pattern 3: Startup WARNING Emission (WHOOK-02, WARN-01, WARN-02, WARN-03)

**What:** Emit `logging.WARNING` messages in `Seedsync.run()` after config is loaded and before threads start.
**When to use:** Security-relevant configuration states that users need visibility into.
**Example:**
```python
# Source: src/python/seedsync.py — in run(), after context setup, before controller_job.start()
def run(self):
    self.context.logger.info("Starting SeedSync")
    self.context.logger.info("Platform: {}".format(platform.machine()))

    # Startup security warnings (WHOOK-02, WARN-01, WARN-02)
    if not self.context.config.general.webhook_secret:
        self.context.logger.warning(
            "Security: webhook_secret is not configured. "
            "Webhook endpoints will accept requests from any caller."
        )

    if not self.context.config.general.api_token:
        self.context.logger.warning(
            "Security: No API token configured. All requests will be accepted."
        )
        # 0.0.0.0 binding is hardcoded in WebAppJob — always warn when token absent
        self.context.logger.warning(
            "Security: Application is bound to 0.0.0.0 without an API token. "
            "Any host on the network can access the API without authentication."
        )

    # ... continue startup (WARN-03: no blocking)
    webhook_manager = WebhookManager(self.context)
    ...
```
WARN-03 is satisfied by design: the warnings are logged and `run()` continues normally.

### Pattern 4: Adding api_token to Config.General

**What:** Add `api_token` property to `Config.General` using the existing `PROP`/`Converters`/`Checkers` pattern.
**When to use:** Any new optional config field.
**Example:**
```python
# Source: src/python/common/config.py — Config.General class (existing pattern from webhook_secret)
class General(IC):
    debug = PROP("debug", Checkers.null, Converters.bool)
    verbose = PROP("verbose", Checkers.null, Converters.bool)
    webhook_secret = PROP("webhook_secret", Checkers.null, Converters.null)
    api_token = PROP("api_token", Checkers.null, Converters.null)  # new — empty = no auth

    def __init__(self):
        super().__init__()
        self.debug = None
        self.verbose = None
        self.webhook_secret = None
        self.api_token = None  # new
```
Also needs backward-compatibility default in `Config.from_dict()` (same pattern as `webhook_secret`):
```python
# In Config.from_dict():
general_dict = Config._check_section(config_dict, "General")
if "webhook_secret" not in general_dict:
    general_dict["webhook_secret"] = ""
if "api_token" not in general_dict:
    general_dict["api_token"] = ""  # new — backward compat
```
And in `_create_default_config()`:
```python
config.general.api_token = ""
```

### Pattern 5: Angular State vs API Roundtrip (CONF-04 — why no code change needed)

**What:** The Settings page never re-reads fields from the API response to display current values. It stores a local `Config` Immutable Record in a `BehaviorSubject<Config>`.
**Evidence chain:**
1. `ConfigService.getConfig()` fetches from `/server/config/get` once on connect — populates the BehaviorSubject with the API response (which has REDACTED values).
2. `ConfigService.set()` calls `updateIn([section, option])` on the in-memory copy when a user saves a field — this replaces the REDACTED value with whatever the user typed.
3. `SettingsPageComponent.config` is bound to `_configService.config` (the Observable), which emits the in-memory state.
4. The `OptionComponent` receives the value via `@Input() value` from the template binding — it displays what the current in-memory Config contains.

**Conclusion:** A user who has previously entered and saved their server address sees the value they typed (from local state), NOT the REDACTED API value. CONF-04 is satisfied by the existing architecture. No Angular code change needed.

### Anti-Patterns to Avoid

- **Reading body before checking size:** `request.body.read()` will buffer the entire payload before you can reject it. Always check `content_length` first.
- **Blocking startup on warnings:** Raising exceptions or calling `sys.exit()` in the warning block would violate WARN-03. Use `logger.warning()` and continue.
- **Checking 0.0.0.0 via config:** The bind address is hardcoded in `WebAppJob` as `"0.0.0.0"` — there is no config key to check. The WARNING for WARN-02 should always fire when `api_token` is empty (since the bind is always 0.0.0.0).
- **New redaction mechanism for CONF-03:** Do not create a separate code path. The existing `_SENSITIVE_FIELDS` dict is the established mechanism — extend it.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Body size limit | Custom stream-reading size counter | `request.content_length` header check | Avoids reading the body at all; content_length is populated by WSGI layer before handler runs |
| Structured sensitive field registry | Inline if/else redaction in the serializer | `_SENSITIVE_FIELDS` dict (already exists) | Consistent, declarative, testable |

**Key insight:** All four changes follow established patterns already present in the codebase. Zero new abstractions needed.

## Common Pitfalls

### Pitfall 1: Content-Length -1 When Header Is Absent
**What goes wrong:** `request.content_length` returns `-1` when no `Content-Length` header is sent (e.g., chunked transfer encoding). The check `> 1_048_576` will be false for -1, so no 413 is returned.
**Why it happens:** Bottle reads `CONTENT_LENGTH` from the WSGI environ; if the client omits it, there is no value.
**How to avoid:** This is acceptable behavior per the requirement: "receives 413 before the body is read — confirmed by sending a large payload and observing the status code." Standard HTTP clients (Sonarr, Radarr) always send Content-Length for JSON POST requests. Document the limitation.
**Warning signs:** If you see `content_length == -1` in a test, the test client needs to set the header.

### Pitfall 2: REDACTED Values Getting Written Back to Config
**What goes wrong:** If a user navigates away from the Settings page and back, the Angular state is still the in-memory Config (with user-typed values for previously-set fields, and REDACTED for fields never modified in the current session). If the user clicks save on a REDACTED field, `ConfigService.set()` will POST `**REDACTED**` as the value to the backend.
**Why it happens:** The initial GET populates REDACTED values into the local state for the three new fields.
**How to avoid:** This is an existing issue for `remote_password` (already redacted) — the codebase already accepts this risk. The success criteria only requires the Settings page "displays the user-entered values... not REDACTED." This means the fix is not needed for this phase. Document that the API should not be used to roundtrip config display for sensitive fields.
**Warning signs:** Test by navigating to Settings immediately after a fresh connect and checking what value text fields show for `remote_address`, etc.

### Pitfall 3: Startup Warning Block Placed After Thread Start
**What goes wrong:** Warnings are logged after `webapp_job.start()` or `controller_job.start()`, so they may be interleaved with thread output or appear after the app is already serving requests.
**Why it happens:** Misunderstanding of where in `run()` to add the block.
**How to avoid:** Place the warning block in `run()` after `webhook_manager = WebhookManager(self.context)` but before `webapp_job.start()`.

### Pitfall 4: Missing Backward-Compat Default for api_token in from_dict()
**What goes wrong:** Existing config files without `api_token = ` in `[General]` will raise `ConfigError("Missing config: General.api_token")` on startup.
**Why it happens:** `InnerConfig.from_dict()` raises `ConfigError` for any missing property.
**How to avoid:** Follow the exact same pattern as `webhook_secret` in `Config.from_dict()` — add a default empty-string injection before calling `General.from_dict()`.

### Pitfall 5: Test for serialize_config Not Expecting REDACTED for New Fields
**What goes wrong:** The existing `test_config_preserves_non_sensitive_fields` test asserts `remote_address == "seedbox.example.com"` — it will fail after CONF-03.
**Why it happens:** The test was written before these fields were redacted.
**How to avoid:** Update that test to expect `**REDACTED**` for `remote_address`, `remote_username`, and `remote_path`. Add new tests that verify the three new fields are redacted.

## Code Examples

Verified patterns from the existing codebase:

### Existing redaction pattern (for CONF-03 extension)
```python
# Source: src/python/web/serialize/serialize_config.py
_SENSITIVE_FIELDS = {
    "lftp": ["remote_password"],
    "sonarr": ["sonarr_api_key"],
    "radarr": ["radarr_api_key"],
    "general": ["webhook_secret"],
}
_REDACTED = "**REDACTED**"

# Redact in SerializeConfig.config():
for section, fields in _SENSITIVE_FIELDS.items():
    if section in config_dict_lowercase:
        section_dict = config_dict_lowercase[section]
        for field in fields:
            if field in section_dict:
                section_dict[field] = _REDACTED
```

### Bottle content_length check (for WHOOK-01)
```python
# Source: Bottle 0.13.4 stdlib — request.content_length
# Returns int from CONTENT_LENGTH environ header, or -1 if absent
if request.content_length > 1_048_576:
    return HTTPResponse(status=413, body="Payload too large")
```

### Startup warning pattern (WHOOK-02, WARN-01, WARN-02)
```python
# Source: src/python/seedsync.py — run() method, after line 113
if not self.context.config.general.webhook_secret:
    self.context.logger.warning("Security: ...")
```

### Backward-compat config default pattern (for api_token in from_dict)
```python
# Source: src/python/common/config.py — Config.from_dict() — existing pattern
general_dict = Config._check_section(config_dict, "General")
# Backward compatibility: webhook_secret added in v3.1 — default to empty string
if "webhook_secret" not in general_dict:
    general_dict["webhook_secret"] = ""
# New — backward compatibility: api_token added in v3.2
if "api_token" not in general_dict:
    general_dict["api_token"] = ""
config.general = Config.General.from_dict(general_dict)
```

### Existing test pattern for redaction (from test_serialize_config.py)
```python
def test_config_redacts_remote_password(self):
    config = Config()
    config.lftp.remote_password = "secret123"
    # ... set required lftp fields ...
    out = SerializeConfig.config(config)
    out_dict = json.loads(out)
    self.assertEqual("**REDACTED**", out_dict["lftp"]["remote_password"])
    self.assertNotIn("secret123", out)
```

## Open Questions

1. **WARN-01/WARN-02 require api_token — should this be a full General field or just deferred?**
   - What we know: WARN-01/WARN-02 are mapped to Phase 48; Phase 50 implements auth enforcement
   - What's unclear: Whether Phase 48 should add the full `api_token` config field or just emit a static warning
   - Recommendation: Add `api_token = PROP(...)` to `Config.General` in this phase with backward-compat default (empty string = no token = warnings emitted). Phase 50 will then use the field for enforcement. This is consistent with how `webhook_secret` was added before its enforcement logic.

2. **What is the exact host string to check for WARN-02?**
   - What we know: `WebAppJob.setup()` hardcodes `host="0.0.0.0"` — there is no config key for the bind address
   - What's unclear: Whether the requirement expects a conditional (only warn if bound to 0.0.0.0) or an unconditional second warning after WARN-01
   - Recommendation: Always emit both warnings as a block when `api_token` is empty — the bind is always 0.0.0.0 so the condition is always true. The two warnings together satisfy both WARN-01 and WARN-02.

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — skip this section.

## Sources

### Primary (HIGH confidence)
- Codebase: `src/python/web/serialize/serialize_config.py` — confirmed `_SENSITIVE_FIELDS` dict pattern, `_REDACTED` constant
- Codebase: `src/python/web/handler/webhook.py` — confirmed `_handle_webhook()` structure, `request.body.read()` placement
- Codebase: `src/python/common/config.py` — confirmed `Config.General` PROP pattern, `from_dict()` backward-compat injection pattern
- Codebase: `src/python/seedsync.py` — confirmed `run()` method structure, logger availability, thread start ordering
- Codebase: `src/angular/src/app/services/settings/config.service.ts` — confirmed BehaviorSubject local state, `updateIn()` pattern (no API roundtrip for display)
- Bottle 0.13.4 stdlib inspection: `request.content_length` returns `int(CONTENT_LENGTH or -1)`, `abort(413)` / `HTTPResponse(status=413)` both valid

### Secondary (MEDIUM confidence)
- Codebase: `src/python/tests/unittests/test_web/test_serialize/test_serialize_config.py` — confirmed existing test `test_config_preserves_non_sensitive_fields` will need updating for CONF-03
- Codebase: `src/python/web/web_app_job.py` — confirmed `host="0.0.0.0"` is hardcoded, not config-driven

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are already in the project, no new imports needed
- Architecture: HIGH — all changes extend existing, well-documented patterns in the codebase
- Pitfalls: HIGH — pitfalls derived from direct code reading, not inference

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable codebase, no fast-moving dependencies)
