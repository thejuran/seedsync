---
phase: 47-isolated-backend-hardening
verified: 2026-02-25T23:55:00Z
status: passed
score: 9/9 must-haves verified
re_verification: false
---

# Phase 47: Isolated Backend Hardening Verification Report

**Phase Goal:** Harden isolated backend components — config file permissions, endpoint HTTP methods, and log stream redaction
**Verified:** 2026-02-25T23:55:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth                                                                                          | Status     | Evidence                                                                                |
|----|-----------------------------------------------------------------------------------------------|------------|-----------------------------------------------------------------------------------------|
| 1  | A newly written settings.cfg has mode 0600 (owner read/write only)                           | VERIFIED   | `persist.py` line 56: `os.chmod(file_path, 0o600)` after `with open(...)` in `to_file()` |
| 2  | An existing settings.cfg with permissive permissions is tightened to 0600 on the next load   | VERIFIED   | `persist.py` line 49: `os.chmod(file_path, 0o600)` before `open()` in `from_file()`     |
| 3  | The restart endpoint is registered as POST-only, not GET                                      | VERIFIED   | `server.py` line 19: `web_app.add_post_handler("/server/command/restart", ...)` — `add_handler` (GET) not present |
| 4  | The Angular restart button sends POST, not GET                                                | VERIFIED   | `server-command.service.ts` line 26: `return this._restService.post(this.RESTART_URL)` |
| 5  | A GET request to /server/command/restart returns 405 Method Not Allowed                       | VERIFIED   | Bottle returns 405 automatically for unregistered methods on POST-only routes — confirmed by `add_post_handler` usage and Python test asserting `add_handler` not called |
| 6  | sftp://user@host URLs in log messages are redacted                                            | VERIFIED   | `serialize_log_record.py` line 62: `re.sub(r'sftp://\S+@\S+', 'sftp://**REDACTED**@**REDACTED**', message)` |
| 7  | SSH command args containing user@host tokens are redacted                                     | VERIFIED   | `serialize_log_record.py` lines 67-70: lookbehind regex `(?<=[\s'"\[])(\w[\w.\-]*)@([a-zA-Z][\w.\-]*)` |
| 8  | A filename containing @ (e.g., file@720p.mkv) is NOT redacted                                | VERIFIED   | Pattern B RHS requires `[a-zA-Z]` start (hostnames start with letter, version/filenames with digit or word-char after non-space) — `test_no_redact_filename_with_at` and `test_no_redact_filename_at_version` confirm |
| 9  | The SSE log stream contains no user@host strings even when LFTP/SSH is actively connecting   | VERIFIED   | `_redact_sensitive()` called on every `record()` call at lines 79 and 84-87 — covers both `getMessage()` and `exc_text`/`exc_info` paths |

**Score:** 9/9 truths verified

---

## Required Artifacts

### Plan 01 — Config File Permissions (CONF-01, CONF-02)

| Artifact                                                        | Expected                                    | Status     | Details                                                              |
|-----------------------------------------------------------------|---------------------------------------------|------------|----------------------------------------------------------------------|
| `src/python/common/persist.py`                                  | File permission hardening in to_file() and from_file() | VERIFIED   | `os.chmod(file_path, 0o600)` at lines 49 and 56 — both paths wired |
| `src/python/tests/unittests/test_common/test_persist.py`        | Tests verifying 0600 permissions on write and load | VERIFIED   | 3 new test methods present: `test_to_file_sets_0600_permissions`, `test_from_file_tightens_permissive_permissions`, `test_to_file_overwrite_preserves_0600_permissions` |

### Plan 02 — Endpoint HTTP Methods (ENDP-01, ENDP-02)

| Artifact                                                                                      | Expected                              | Status     | Details                                                                          |
|-----------------------------------------------------------------------------------------------|---------------------------------------|------------|----------------------------------------------------------------------------------|
| `src/python/web/handler/server.py`                                                             | POST-only restart route registration  | VERIFIED   | Line 19: `add_post_handler` called; `add_handler` absent from `add_routes()`    |
| `src/angular/src/app/services/server/server-command.service.ts`                               | POST restart call                     | VERIFIED   | Line 26: `this._restService.post(this.RESTART_URL)` — `RestService.post()` confirmed at `rest.service.ts` line 58 |
| `src/python/tests/unittests/test_web/test_handler/test_server_handler.py`                     | Test verifying POST route registration | VERIFIED   | `test_restart_route_registered_as_post` at line 45 asserts `add_post_handler` called and `add_handler` not called |
| `src/angular/src/app/tests/unittests/services/server/server-command.service.spec.ts`          | Test verifying POST HTTP method       | VERIFIED   | Line 47-63: `"should send a POST restart command"` — `httpMock.expectOne` captures request, `expect(req.request.method).toBe("POST")` asserted |

### Plan 03 — Log Stream Redaction (LOG-01, LOG-02, LOG-03)

| Artifact                                                                                          | Expected                                          | Status     | Details                                                                         |
|---------------------------------------------------------------------------------------------------|---------------------------------------------------|------------|---------------------------------------------------------------------------------|
| `src/python/web/serialize/serialize_log_record.py`                                                | SSH topology redaction in `_redact_sensitive()`   | VERIFIED   | Lines 62-71: two-pattern approach present; Pattern A for `sftp://` URLs, Pattern B for bare `user@host` tokens with lookbehind |
| `src/python/tests/unittests/test_web/test_serialize/test_serialize_log_record.py`                 | Tests for SSH topology redaction and false-positive safety | VERIFIED   | `TestRedactSensitive` class at line 216 with 8 test methods covering all cases  |

---

## Key Link Verification

| From                                     | To                            | Via                                          | Status     | Details                                                                    |
|------------------------------------------|-------------------------------|----------------------------------------------|------------|----------------------------------------------------------------------------|
| `persist.py`                             | `os.chmod`                    | `os` module already imported (line 3)        | VERIFIED   | `os.chmod(file_path, 0o600)` present at lines 49 and 56                   |
| `server.py`                              | `web_app.py`                  | `add_post_handler` method                    | VERIFIED   | `web_app.add_post_handler_handler` confirmed exists at `web_app.py` line 112; called correctly in `server.py` |
| `server-command.service.ts`              | `rest.service.ts`             | `RestService.post()`                         | VERIFIED   | `RestService.post()` exists at `rest.service.ts` line 58; called via `this._restService.post(...)` in service |
| `serialize_log_record.py`                | SSE stream                    | `_redact_sensitive()` called on every record | VERIFIED   | Lines 79, 84, 87: `_redact_sensitive()` applied to `getMessage()` and both `exc_text`/`exc_info` branches in `record()` |

---

## Requirements Coverage

| Requirement | Source Plan | Description                                                                          | Status     | Evidence                                                                 |
|-------------|------------|--------------------------------------------------------------------------------------|------------|--------------------------------------------------------------------------|
| CONF-01     | Plan 01    | Config file written with 0600 permissions (owner read/write only)                   | SATISFIED  | `persist.py` `to_file()` calls `os.chmod(file_path, 0o600)` after write |
| CONF-02     | Plan 01    | Existing config files with overly permissive permissions fixed to 0600 on startup load | SATISFIED  | `persist.py` `from_file()` calls `os.chmod(file_path, 0o600)` before read |
| ENDP-01     | Plan 02    | Restart endpoint uses POST method instead of GET                                     | SATISFIED  | `server.py` `add_routes()` uses `add_post_handler`; Python test confirms and asserts `add_handler` not called |
| ENDP-02     | Plan 02    | Angular frontend sends restart request as POST                                       | SATISFIED  | `server-command.service.ts` uses `_restService.post()`; Angular spec asserts `req.request.method === "POST"` |
| LOG-01      | Plan 03    | SSH command logs redact user@host patterns from debug output                         | SATISFIED  | Pattern B in `_redact_sensitive()` with lookbehind; `test_redact_ssh_command_args_user_at_host` and `test_redact_scp_user_at_host_colon_path` pass |
| LOG-02      | Plan 03    | SSE log stream does not expose SSH connection topology (user, host, path)            | SATISFIED  | Pattern A for `sftp://` URLs + Pattern B for bare tokens; `_redact_sensitive()` applied to all message paths in `record()` |
| LOG-03      | Plan 03    | Redaction pattern does not false-positive on non-SSH log lines                       | SATISFIED  | Pattern B RHS requires `[a-zA-Z]` start (excludes version strings starting with digit); `test_no_redact_filename_with_at`, `test_no_redact_filename_at_version`, `test_no_redact_embedded_at_in_path` all confirm |

**All 7 requirements satisfied. No orphaned requirements — REQUIREMENTS.md traceability table marks CONF-01, CONF-02, ENDP-01, ENDP-02, LOG-01, LOG-02, LOG-03 as Complete under Phase 47.**

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No TODOs, FIXMEs, placeholder returns, or stub implementations found in any of the 6 modified files.

---

## Human Verification Required

None. All behavioral properties of this phase are mechanically verifiable:

- File permission bits are set by `os.chmod` and confirmed by `os.stat` in tests.
- HTTP method is asserted by `req.request.method` in Angular spec and by mock-call assertion in Python test.
- Regex redaction is covered by 8 unit tests on the static method directly.

No visual UI behavior, real-time stream behavior, or external service calls are introduced by this phase.

---

## Commit Verification

All commits referenced in SUMMARY files confirmed in git history:

| Commit   | Description                                             | Present |
|----------|---------------------------------------------------------|---------|
| `7f025d7` | test(47-01): failing tests for 0600 permission hardening | Yes    |
| `b5afc96` | feat(47-01): harden config file permissions to 0600      | Yes    |
| `97bb7d0` | test(47-03): add failing tests for SSH redaction (also includes server.py ENDP-01 change) | Yes |
| `b7c5a40` | feat(47-03): implement SSH topology redaction             | Yes    |
| `e99c1ec` | fix(47-02): change Angular restart service to POST       | Yes    |

**Note on commit 97bb7d0:** The SUMMARY for plan 02 correctly documents that the `server.py` backend change (ENDP-01) and the `test_server_handler.py` test were pre-committed in the 47-03 TDD setup commit. The code is correct and present — this is a commit bundling anomaly with no code impact.

---

## Gaps Summary

No gaps. All 9 observable truths verified, all 8 artifacts substantive and wired, all 4 key links confirmed, all 7 requirement IDs satisfied, no anti-patterns found.

---

_Verified: 2026-02-25T23:55:00Z_
_Verifier: Claude (gsd-verifier)_
