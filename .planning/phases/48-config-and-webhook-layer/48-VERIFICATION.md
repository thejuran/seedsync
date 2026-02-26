---
phase: 48-config-and-webhook-layer
verified: 2026-02-25T00:00:00Z
status: passed
score: 11/11 must-haves verified
re_verification: false
---

# Phase 48: Config and Webhook Layer Verification Report

**Phase Goal:** The config API no longer discloses SSH topology fields, webhook endpoints have a payload size cap, and startup warnings surface insecure configuration states
**Verified:** 2026-02-25
**Status:** passed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | GET /server/config response shows **REDACTED** for remote_address, remote_username, and remote_path | VERIFIED | `_SENSITIVE_FIELDS["lftp"]` includes all three; `test_section_lftp` and `test_config_redacts_and_preserves_fields` assert `"**REDACTED**"` |
| 2 | GET /server/config response shows **REDACTED** for api_token in the general section | VERIFIED | `_SENSITIVE_FIELDS["general"]` includes `"api_token"`; `test_config_redacts_api_token` asserts `"**REDACTED**"` and `assertNotIn("super-secret-token", out)` |
| 3 | Non-sensitive lftp fields (remote_port, local_path, etc.) remain visible in the API response | VERIFIED | `test_section_lftp` asserts `remote_port == 3456` and `local_path == "/local/server/path"` unchanged |
| 4 | Settings UI continues to display user-entered values from local Angular state (CONF-04 satisfied by architecture) | VERIFIED (architecture) | CONF-04 requires no code change; confirmed by research that Angular Settings reads from local BehaviorSubject, not API response |
| 5 | Existing config files without api_token load successfully without errors (backward compatibility) | VERIFIED | `Config.from_dict()` at line 422: `if "api_token" not in general_dict: general_dict["api_token"] = ""`; `test_config_from_dict_without_api_token_defaults_to_empty` passes |
| 6 | A webhook POST with Content-Length exceeding 1MB receives HTTP 413 before the body is read | VERIFIED | `webhook.py` line 95-96: check is first guard in `_handle_webhook()` before `_verify_hmac()`; `test_oversized_payload_returns_413` asserts 413, checks `mock_request.body.read.assert_not_called()` |
| 7 | A webhook POST with Content-Length under 1MB is processed normally | VERIFIED | `test_payload_under_limit_is_accepted` (500 bytes -> 200) and `test_payload_at_limit_is_accepted` (1_048_576 -> 200) |
| 8 | Application startup log contains a WARNING when webhook_secret is not configured | VERIFIED | `_emit_startup_warnings()` line 357-361: warns when `not config.general.webhook_secret`; `test_startup_warns_when_webhook_secret_empty` asserts "webhook_secret" in warning |
| 9 | Application startup log contains a WARNING when no api_token is configured | VERIFIED | `_emit_startup_warnings()` line 362-366: warns when `not config.general.api_token`; `test_startup_warns_when_api_token_empty` asserts "API token" in warning |
| 10 | Application startup log contains a WARNING when bound to 0.0.0.0 without api_token | VERIFIED | `_emit_startup_warnings()` line 367-370: emits 0.0.0.0 warning paired with api_token warning; `test_startup_warns_when_api_token_empty` asserts "0.0.0.0" in warning |
| 11 | All startup warnings are emitted but the application continues to start and serve requests | VERIFIED | No `sys.exit()` or exception in `_emit_startup_warnings()`; `test_startup_warnings_do_not_raise` confirms no exception; `test_startup_warns_both_when_both_empty` asserts exactly 3 warnings emitted |

**Score:** 11/11 truths verified

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/python/web/serialize/serialize_config.py` | Extended `_SENSITIVE_FIELDS` with lftp topology + api_token | VERIFIED | Lines 11-16: dict includes `remote_address`, `remote_username`, `remote_path` in `"lftp"` and `"api_token"` in `"general"` |
| `src/python/common/config.py` | `api_token` property on `Config.General` with backward-compat default | VERIFIED | Line 239: `api_token = PROP(...)`, line 246: `self.api_token = None`, lines 421-423: backward-compat injection in `from_dict()` |
| `src/python/tests/unittests/test_web/test_serialize/test_serialize_config.py` | Tests verifying redaction of remote_address, remote_username, remote_path, api_token | VERIFIED | 214 lines; 4 dedicated redaction tests: `test_config_redacts_remote_address`, `test_config_redacts_remote_username`, `test_config_redacts_remote_path`, `test_config_redacts_api_token` |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/python/web/handler/webhook.py` | Content-Length check with `_WEBHOOK_MAX_BODY_BYTES` constant | VERIFIED | Line 20: `_WEBHOOK_MAX_BODY_BYTES = 1_048_576`, lines 94-96: guard as first check in `_handle_webhook()` before `_verify_hmac()` |
| `src/python/seedsync.py` | Startup security warning block in `run()` method | VERIFIED | Line 116: `Seedsync._emit_startup_warnings(self.context.logger, self.context.config)`; lines 354-370: static method with all three warning conditions |
| `src/python/tests/unittests/test_web/test_webhook_handler.py` | Tests for 413 payload rejection | VERIFIED | 300 lines; `TestWebhookPayloadSizeLimit` class with 4 tests |
| `src/python/tests/unittests/test_seedsync.py` | Tests for startup warning emission | VERIFIED | 247 lines; `TestSeedsyncApiTokenConfig` (3 tests) + `TestSeedsyncStartupWarnings` (5 tests) |

---

## Key Link Verification

### Plan 01 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `serialize_config.py` | `config.py` | `_SENSITIVE_FIELDS` dict drives redaction of Config fields | VERIFIED | Line 12: `"lftp": ["remote_password", "remote_address", "remote_username", "remote_path"]`; pattern `_SENSITIVE_FIELDS.*remote_address` found |
| `config.py` | `Config.from_dict()` | Backward-compat default injection for api_token | VERIFIED | Lines 421-423: `if "api_token" not in general_dict: general_dict["api_token"] = ""`; pattern `api_token.*not in.*general_dict` confirmed |

### Plan 02 Key Links

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `webhook.py` | `request.content_length` | WSGI environ Content-Length header check | VERIFIED | Line 95: `if request.content_length is not None and request.content_length > _WEBHOOK_MAX_BODY_BYTES`; check is first guard before `_verify_hmac()` |
| `seedsync.py` | `config.py` | Reads `config.general.webhook_secret` and `config.general.api_token` for warning checks | VERIFIED | Lines 357-362: `if not config.general.webhook_secret` and `if not config.general.api_token`; called via `_emit_startup_warnings(self.context.logger, self.context.config)` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| CONF-03 | 48-01 | API config endpoint redacts remote_address, remote_username, remote_path | SATISFIED | `_SENSITIVE_FIELDS["lftp"]` extended; 4 new test methods; REQUIREMENTS.md marks `[x]` |
| CONF-04 | 48-01 | Settings UI continues to function with additional fields redacted (uses local state) | SATISFIED | No Angular code change required; confirmed by architecture research; REQUIREMENTS.md marks `[x]` |
| WHOOK-01 | 48-02 | Webhook endpoints reject payloads exceeding 1MB with 413 before reading body | SATISFIED | `_WEBHOOK_MAX_BODY_BYTES = 1_048_576`; 413 guard first in `_handle_webhook()`; `test_oversized_payload_returns_413` asserts body not read; REQUIREMENTS.md marks `[x]` |
| WHOOK-02 | 48-02 | Startup log emits WARNING when webhook_secret is not configured | SATISFIED | `_emit_startup_warnings()` warns on falsy `webhook_secret`; `test_startup_warns_when_webhook_secret_empty` passes; REQUIREMENTS.md marks `[x]` |
| WARN-01 | 48-02 | Startup log emits WARNING when no API token is configured | SATISFIED | `_emit_startup_warnings()` warns on falsy `api_token`; `test_startup_warns_when_api_token_empty` asserts "API token" in call; REQUIREMENTS.md marks `[x]` |
| WARN-02 | 48-02 | Startup log emits WARNING when app is bound to 0.0.0.0 without API token | SATISFIED | Paired 0.0.0.0 warning emitted inside `if not config.general.api_token` block; `test_startup_warns_when_api_token_empty` asserts "0.0.0.0"; REQUIREMENTS.md marks `[x]` |
| WARN-03 | 48-02 | Startup warnings do not block application startup | SATISFIED | No `sys.exit()` or exception in `_emit_startup_warnings()`; `test_startup_warnings_do_not_raise` confirms; REQUIREMENTS.md marks `[x]` |

**All 7 requirement IDs from plan frontmatter are accounted for. No orphaned requirements — REQUIREMENTS.md traceability table maps CONF-03, CONF-04, WHOOK-01, WHOOK-02, WARN-01, WARN-02, WARN-03 exclusively to Phase 48 and all are marked Complete.**

---

## Anti-Patterns Found

No blocker or warning anti-patterns found in any modified file.

Scan covered:
- `src/python/web/serialize/serialize_config.py`
- `src/python/common/config.py`
- `src/python/web/handler/webhook.py`
- `src/python/seedsync.py`
- `src/python/tests/unittests/test_web/test_serialize/test_serialize_config.py`
- `src/python/tests/unittests/test_web/test_webhook_handler.py`
- `src/python/tests/unittests/test_seedsync.py`

No TODO/FIXME/HACK/PLACEHOLDER comments. No empty return stubs. No stub handlers. Implementation is substantive in all files.

**Note (informational, not a gap):** The content_length guard at webhook.py line 95 reads `if request.content_length is not None and request.content_length > _WEBHOOK_MAX_BODY_BYTES`. The plan notes Bottle returns `-1` (not `None`) when Content-Length is absent. The `is not None` guard is an extra safety net that is harmless — with `-1` the second condition (`-1 > 1_048_576`) is False and the request passes through correctly. The test `test_missing_content_length_is_accepted` sets `content_length = -1` and confirms 200, so the actual Bottle behavior is covered.

---

## Human Verification Required

### 1. Settings UI displays user values despite config API redaction (CONF-04)

**Test:** Open the Settings page in a browser. Verify that SSH topology fields (remote_address, remote_username, remote_path) display the configured values — not `**REDACTED**`.
**Expected:** Field values appear as entered by the user.
**Why human:** Angular BehaviorSubject wiring requires a running Angular app to verify; the architectural claim cannot be fully confirmed by grep alone without inspecting Angular state management at runtime.

### 2. Startup warnings appear in actual log output

**Test:** Start the application without configuring `webhook_secret` and `api_token`. Check the application log output.
**Expected:** Three WARNING lines appear: one mentioning "webhook_secret is not configured", one mentioning "No API token configured", and one mentioning "0.0.0.0 without an API token". Application proceeds to serve requests normally.
**Why human:** `run()` starts threads and a blocking main loop; the unit tests mock the logger and call `_emit_startup_warnings()` directly. Confirming the full startup sequence (including `_emit_startup_warnings` being called from `run()`) requires observing live log output.

---

## Commit Verification

All commits documented in SUMMARYs confirmed present in git log:

| Commit | Description |
|--------|-------------|
| `5c89961` | feat(48-01): add api_token config field and extend config API redaction |
| `7063a03` | feat(48-02): add webhook payload size cap with tests |
| `e670f5d` | feat(48-02): add startup security warnings with tests |

---

## Summary

Phase 48 goal is fully achieved. All 7 requirements (CONF-03, CONF-04, WHOOK-01, WHOOK-02, WARN-01, WARN-02, WARN-03) have substantive implementation with tests. No stubs, no orphaned artifacts, no anti-patterns.

Key implementation facts verified directly against source:

- `_SENSITIVE_FIELDS` in `serialize_config.py` now contains `remote_address`, `remote_username`, `remote_path` under `"lftp"` and `"api_token"` under `"general"`.
- `Config.General` in `config.py` has `api_token = PROP(...)` with `self.api_token = None` in `__init__()` and backward-compat injection `if "api_token" not in general_dict: general_dict["api_token"] = ""` in `from_dict()`.
- `_WEBHOOK_MAX_BODY_BYTES = 1_048_576` is the first guard in `_handle_webhook()`, placed before `_verify_hmac()`, returning 413 without reading the body.
- `_emit_startup_warnings(logger, config)` is a static method on `Seedsync`, called from `run()` after logger init and before thread start. Emits up to 3 warnings, never raises, never exits.
- Test classes `TestWebhookPayloadSizeLimit` (4 tests) and `TestSeedsyncStartupWarnings` (5 tests) + `TestSeedsyncApiTokenConfig` (3 tests) provide direct behavioral coverage.

---

_Verified: 2026-02-25_
_Verifier: Claude (gsd-verifier)_
