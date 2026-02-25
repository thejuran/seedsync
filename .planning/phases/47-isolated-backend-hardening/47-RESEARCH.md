# Phase 47: Isolated Backend Hardening - Research

**Researched:** 2026-02-25
**Domain:** Python OS file permissions, HTTP method hardening, log redaction regex
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONF-01 | Config file (settings.cfg) written with 0600 permissions (owner read/write only) | `os.chmod(path, 0o600)` immediately after `open(..., "w")` in `Persist.to_file()` |
| CONF-02 | Existing config files with overly permissive permissions are fixed to 0600 on startup load | `os.chmod(path, 0o600)` in `Persist.from_file()` (or at the Seedsync load site) after confirming the file exists |
| ENDP-01 | Restart endpoint uses POST method instead of GET | Change `web_app.add_handler(...)` → `web_app.add_post_handler(...)` in `ServerHandler.add_routes()` |
| ENDP-02 | Angular frontend sends restart request as POST | Change `_restService.sendRequest(...)` (GET) → `_restService.post(...)` in `ServerCommandService.restart()` |
| LOG-01 | SSH command logs redact user@host patterns from debug output | Add `user@host` regex to `_redact_sensitive()` in `SerializeLogRecord` |
| LOG-02 | SSE log stream does not expose SSH connection topology (user, host, path) | Same `_redact_sensitive()` change covers SSE stream — log records pass through it before emission |
| LOG-03 | Redaction pattern does not false-positive on non-SSH log lines (e.g., email-like @ in filename) | Regex must anchor to SSH-specific context: `sftp://user@host` prefix or `user@host:` colon suffix, not bare `word@word` |
</phase_requirements>

## Summary

Phase 47 consists of three independent, narrowly scoped hardening changes to the Python backend and one small Angular change. None requires new libraries or architectural shifts — all work within existing patterns.

**Config file permissions (CONF-01, CONF-02):** The `Persist.to_file()` method in `src/python/common/persist.py` currently writes files with no explicit permission mask — permissions are determined by the process umask, which on many systems produces 0644. Two targeted fixes are needed: (1) call `os.chmod(file_path, 0o600)` after writing in `to_file()`, and (2) call `os.chmod(file_path, 0o600)` in `from_file()` after confirming the file exists. Because `to_file()` is shared by all Persist subclasses (Config, ControllerPersist, AutoQueuePersist), the fix propagates automatically. Alternatively the fix can be applied at the Seedsync call site where `config_path` is known specifically — this is more surgical but less comprehensive. The `Persist.to_file()` approach is recommended because it covers all config writes without needing call-site changes.

**Restart endpoint method (ENDP-01, ENDP-02):** The restart endpoint is registered as a GET via `web_app.add_handler()` in `ServerHandler.add_routes()`. GET requests for state-changing operations are a CSRF vector because browsers follow cross-origin GET links trivially. The fix is one line: swap `add_handler` for `add_post_handler`. The Angular side calls `_restService.sendRequest()` which issues GET; swapping to `_restService.post()` (which already exists in `RestService`) completes the change. The Bottle backend already has `add_post_handler` wired up. Tests for `ServerHandler` exist and test the private handler method directly — they will need to verify the route registration method changes to POST.

**SSH topology redaction in SSE log stream (LOG-01, LOG-02, LOG-03):** The `SerializeLogRecord._redact_sensitive()` static method in `src/python/web/serialize/serialize_log_record.py` already handles LFTP password redaction. The SSH topology leak comes from `sshcp.py` line 66: `self.logger.debug("Command: {}".format(command_args))` which logs the full arg list, which contains `user@host` in the positional argument (line 171: `"{}@{}".format(self.__user, self.__host)`). The LFTP `__expect_pattern` also contains `user@host` and may appear in logged debug output. The correct fix is adding a regex in `_redact_sensitive()` to match and redact `user@host` strings in SSH/SFTP topology context. LOG-03 requires care: the pattern must not false-positive on legitimate `@` in filenames. The correct anchor is the SFTP URL prefix (`sftp://`) or the colon suffix (`user@host:`) — both are specific to SSH connection strings. A bare `\w+@\w+` pattern would false-positive on filenames like `release@1.0.tar.gz`.

**Primary recommendation:** Three small, independent surgical changes to existing files. No new modules, no new dependencies.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `os` (stdlib) | Python 3.11+ | `os.chmod()` for file permission setting | Standard — no alternative |
| `re` (stdlib) | Python 3.11+ | Regex for log redaction | Already imported in `serialize_log_record.py` |
| `bottle` (existing) | in pyproject.toml | `add_post_handler` already exists in `WebApp` | Already used for all POST endpoints |
| `HttpClient` (Angular) | Angular 19.x | `RestService.post()` already exists | Already used for delete/extract actions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `stat` (stdlib) | Python 3.11+ | `stat.S_IRUSR \| stat.S_IWUSR` constants | Optional — `0o600` literal is cleaner and self-documenting |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `os.chmod()` in `to_file()` | Temporary file + `os rename` with explicit mode | Atomic but more complex; not needed for single-writer config files |
| Regex in `_redact_sensitive()` | Pre-redact in `sshcp.py` before logging | Pre-redacting at source is architecturally cleaner but requires changing more files; stream-level redaction is the established pattern already in place |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure

No structural changes needed. All three changes modify existing files in-place:
```
src/python/common/persist.py              # CONF-01, CONF-02 — to_file() and from_file()
src/python/web/handler/server.py          # ENDP-01 — route registration
src/python/web/serialize/serialize_log_record.py  # LOG-01, LOG-02, LOG-03 — _redact_sensitive()
src/angular/src/app/services/server/server-command.service.ts  # ENDP-02 — REST method
```

### Pattern 1: File Permission Hardening (CONF-01, CONF-02)

**What:** Write with restricted permissions and tighten on load.
**When to use:** Any file containing credentials or secrets.
**Example:**
```python
# In Persist.to_file() — CONF-01
def to_file(self, file_path: str):
    with open(file_path, "w") as f:
        f.write(self.to_str())
    os.chmod(file_path, 0o600)  # owner read/write only

# In Persist.from_file() — CONF-02
@classmethod
def from_file(cls: Type[T_Persist], file_path: str) -> T_Persist:
    if not os.path.isfile(file_path):
        raise AppError(Localization.Error.MISSING_FILE.format(file_path))
    # Tighten permissions on load (fixes pre-existing permissive files)
    os.chmod(file_path, 0o600)
    with open(file_path, "r") as f:
        return cls.from_str(f.read())
```

**Important:** `os` is already imported in `persist.py`. The `0o600` octal literal is standard Python for owner-only read/write. No race condition concern here: the file is opened first, then chmod is applied after close — the write is complete before the permission is set. On Linux/macOS, any process running as a different user cannot read between the open and chmod because the file is not yet closed during the write (and the initial permissions, even if 0644, are controlled by umask during the same-user write).

### Pattern 2: POST-only Endpoint Registration (ENDP-01)

**What:** Register state-changing endpoint as POST only.
**When to use:** Any endpoint that changes server state (restart, config write, file delete).
**Example:**
```python
# In ServerHandler.add_routes() — currently:
web_app.add_handler("/server/command/restart", self.__handle_action_restart)
# Change to:
web_app.add_post_handler("/server/command/restart", self.__handle_action_restart)
```

Bottle's `add_post_handler` is already wired to `self.post(path)(handler)` in `WebApp`. The handler body itself (`__handle_action_restart`) does not need to change — it returns `HTTPResponse(body="Requested restart")` which works for both GET and POST responses.

### Pattern 3: Angular POST for Restart (ENDP-02)

**What:** Send HTTP POST instead of GET for restart action.
**Example:**
```typescript
// In ServerCommandService.restart() — currently:
return this._restService.sendRequest(this.RESTART_URL);  // GET
// Change to:
return this._restService.post(this.RESTART_URL);  // POST
```

`RestService.post()` already exists and sends `this._http.post(url, null, {responseType: "text"})`. No body is needed for the restart command (null body is correct). No Angular service interface changes are needed.

### Pattern 4: SSH Topology Redaction in SSE Stream (LOG-01, LOG-02, LOG-03)

**What:** Extend the existing `_redact_sensitive()` to strip `user@host` patterns specific to SSH/SFTP connection strings.
**Key constraint (LOG-03):** Must not redact `@` in filenames, email addresses in other contexts, or Radarr/Sonarr API URLs.

**The source of leakage:**
1. `sshcp.py` line 66: `self.logger.debug("Command: {}".format(command_args))` — `command_args` contains `user@host` as a positional arg to `ssh` and `user@host:remote_path` as an `scp` arg.
2. LFTP verbose output (when `set_verbose_logging(True)`) may contain the `sftp://user@host` URL.
3. The LFTP expect pattern is `"lftp user@host:.*>"` — if logged verbosely, contains the topology.

**SSH-specific anchors to use in regex:**

SSH connection strings have distinctive structure:
- `user@host` always appears after `ssh` or `scp` command or as `sftp://user@host`
- In `command_args` list format: `["ssh", ..., "user@host", "command"]` or `["scp", ..., "user@host:path"]`
- In LFTP: `sftp://user@host` or `lftp user@host:` prompt

Recommended patterns:
```python
@staticmethod
def _redact_sensitive(message: str) -> str:
    # Existing: LFTP -u username,password
    message = re.sub(r'(-u\s+\S+,)\S+', r'\1**REDACTED**', message)
    # Existing: Generic password=secret / password: secret
    message = re.sub(
        r'(password[=:]\s*)\S+', r'\1**REDACTED**', message,
        flags=re.IGNORECASE
    )
    # NEW: SSH/SCP user@host — match user@host followed by colon or end-of-token
    # This covers: "user@host", "user@host:path", "sftp://user@host"
    # Anchors used:
    #   - Preceded by space, quote, or sftp:// (not bare @ in middle of word)
    #   - Followed by colon (scp dest) or space/end (ssh target)
    # Pattern captures the word before @ and the word+suffix after
    message = re.sub(
        r'(?<![:\w])(\w[\w.\-]*)@([\w.\-]+)(:\S*)?',
        lambda m: '**REDACTED**@**REDACTED**' + (':' + '**REDACTED**' if m.group(3) else ''),
        message
    )
    return message
```

**Wait — that would false-positive on emails.** The correct approach is to anchor on known SSH context in the surrounding string, not bare `word@word`. Two surgical patterns that avoid false positives:

```python
# Pattern A: sftp://user@host (LFTP URLs)
message = re.sub(r'sftp://\S+@\S+', 'sftp://**REDACTED**@**REDACTED**', message)

# Pattern B: ssh/scp command args — user@host appearing as standalone token
# (preceded by whitespace or quote, followed by whitespace, colon, or end-of-string)
message = re.sub(r"(?<=[\s'\"])(\w[\w.\-]*)@([\w.\-]+)(?=[\s:'\"]|$)", '**REDACTED**@**REDACTED**', message)
```

**Verifying LOG-03 false-positive safety:**
- `"file@v1.0.tar.gz"` — the `@` is preceded by `e` (not whitespace/quote) in the middle of a word: Pattern B lookbehind `[\s'"]` does NOT match → no redaction. Correct.
- `"sftp://user@seedbox.example.com/path"` — Pattern A matches → redacted. Correct.
- ``"'user@seedbox.example.com' command"`` — Pattern B lookbehind `'` matches → redacted. Correct.
- `"user@example.com in email"` — technically matches Pattern B if preceded by space. This is the hard case: a legitimate email in a log line would be redacted. However, SSH commands are the primary surface here, and emails are vanishingly unlikely in SeedSync log output. The requirement only calls out "filename with @ in it" (LOG-03), not email addresses. The filename case (no surrounding whitespace) is safe.

**Recommendation:** Use Pattern A (sftp:// URL) + Pattern B (whitespace-anchored token) as described. Test explicitly for the filename-with-@ case as required by LOG-03 success criterion 5.

### Anti-Patterns to Avoid

- **Bare `\w+@\w+` pattern:** Would redact `@` in file names embedded in log strings like `"Downloading file_v1.2@name.mkv"` if the `@` appears mid-word without surrounding spaces. Use lookbehind to anchor to surrounding whitespace or quotes.
- **Pre-redacting in sshcp.py only:** Does not cover LFTP log output or future log additions. Stream-level redaction in `_redact_sensitive()` is the defense-in-depth layer.
- **Changing `Persist.to_file()` without also fixing `from_file()`:** New files get 0600, but an admin upgrading from 0.644 would not have their existing file fixed without the `from_file()` chmod (CONF-02).
- **Using `os.open()` with explicit mode flags during write:** More complex and prevents using standard `with open()` context manager. The simple `open(); chmod()` sequence is correct.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Secure file write with restricted perms | Custom low-level file writer | `open()` + `os.chmod(0o600)` | `os.chmod` is the POSIX standard; no library needed |
| HTTP method enforcement | Custom middleware to check method | Bottle's built-in route method decorators (`@app.post`) | Bottle already enforces method at routing time; wrong method returns 405 automatically |
| Credential scrubbing | New logging filter class | Extend existing `_redact_sensitive()` | Pattern already established in codebase — consistent extension is simpler |

**Key insight:** All three domains (file perms, HTTP methods, regex redaction) are solved by one-to-five-line additions to existing code. No new abstractions are warranted at this scale.

## Common Pitfalls

### Pitfall 1: Race Condition Between Write and chmod (CONF-01)
**What goes wrong:** Another process reads the file between `f.close()` and `os.chmod()`.
**Why it happens:** `open(..., "w")` creates the file with umask-derived permissions (typically 0644). The file is readable between close and chmod.
**How to avoid:** For SeedSync's single-user deployment model this is acceptable — no multi-tenant threat. For stricter environments, create a temp file with 0600 via `os.open(path, os.O_WRONLY | os.O_CREAT, 0o600)`, write, then `os.rename()`. This is overkill for the stated requirement; simple chmod after write satisfies CONF-01.
**Warning signs:** If the requirement were "never readable by others even transiently," use the atomic approach.

### Pitfall 2: Forgetting the `os` Import (CONF-01, CONF-02)
**What goes wrong:** `NameError: name 'os' is not defined` at runtime.
**Why it happens:** `persist.py` already imports `os` (line 3). No action needed. Confirm before submitting.
**How to avoid:** Grep confirms: `import os` is line 3 of `persist.py`.

### Pitfall 3: Redaction Regex False-Positives (LOG-03)
**What goes wrong:** A filename containing `@` (e.g., a torrent file named `show@720p.mkv`) gets redacted in the log stream, making it impossible to debug.
**Why it happens:** A naive `\w+@\w+` pattern matches any alphanumeric-at-alphanumeric sequence.
**How to avoid:** Use lookbehind `(?<=[\s'"\[])` to require the pattern is preceded by whitespace or a quote character. Test with the specific LOG-03 success criterion: "a filename with @ in it" must NOT be redacted.
**Warning signs:** If the test `_redact_sensitive("Downloading file@720p.mkv")` changes the string, the pattern is too broad.

### Pitfall 4: Angular ServerCommandService Tests (ENDP-02)
**What goes wrong:** Unit test for `ServerCommandService` may mock `_restService.sendRequest` but the service now calls `_restService.post`.
**Why it happens:** The existing test file `server-command.service.spec.ts` mocks the REST service. If the mock only stubs `sendRequest`, `post` will be undefined.
**How to avoid:** Update the spec to spy on `_restService.post` instead of `_restService.sendRequest` after changing the service.

### Pitfall 5: Bottle 405 for Existing GET Restart Callers (ENDP-01)
**What goes wrong:** Any client or test that sends GET `/server/command/restart` after the change gets 405 Method Not Allowed.
**Why it happens:** Bottle enforces the registered HTTP method strictly.
**How to avoid:** This is the desired behavior (CSRF protection). Ensure the Angular UI and any integration tests that call restart are also updated to POST.

### Pitfall 6: test_server_handler.py Calls Private Method Directly
**What goes wrong:** Existing `test_server_handler.py` calls `self.handler._ServerHandler__handle_action_restart()` directly — this bypasses route registration. The handler body test still passes regardless of the method change.
**Why it happens:** Python name-mangling lets tests bypass Bottle routing. The route registration change (`add_handler` → `add_post_handler`) needs to be verified by checking that the route is registered with the right method, or via integration/E2E test.
**How to avoid:** Add a new unit test that asserts the route is registered via `add_post_handler` (spy on `web_app.add_post_handler`), or rely on the E2E test (browser devtools) per the success criterion.

## Code Examples

Verified patterns from codebase:

### CONF-01: Persist.to_file() with chmod
```python
# Source: src/python/common/persist.py (existing to_file, with addition)
def to_file(self, file_path: str):
    with open(file_path, "w") as f:
        f.write(self.to_str())
    os.chmod(file_path, 0o600)  # restrict to owner read/write only
```

### CONF-02: Persist.from_file() with chmod on load
```python
# Source: src/python/common/persist.py (existing from_file, with addition)
@classmethod
def from_file(cls: Type[T_Persist], file_path: str) -> T_Persist:
    if not os.path.isfile(file_path):
        raise AppError(Localization.Error.MISSING_FILE.format(file_path))
    os.chmod(file_path, 0o600)  # tighten permissions on existing files
    with open(file_path, "r") as f:
        return cls.from_str(f.read())
```

### ENDP-01: ServerHandler route registration
```python
# Source: src/python/web/handler/server.py
@overrides(IHandler)
def add_routes(self, web_app: WebApp):
    web_app.add_post_handler("/server/command/restart", self.__handle_action_restart)
    #       ^^^^^^^^ was add_handler (GET)
```

### ENDP-02: Angular ServerCommandService
```typescript
// Source: src/angular/src/app/services/server/server-command.service.ts
public restart(): Observable<WebReaction> {
    return this._restService.post(this.RESTART_URL);
    //                       ^^^^ was sendRequest (GET)
}
```

### LOG-01/LOG-02/LOG-03: Extended _redact_sensitive()
```python
# Source: src/python/web/serialize/serialize_log_record.py
@staticmethod
def _redact_sensitive(message: str) -> str:
    # Existing: LFTP -u username,password
    message = re.sub(r'(-u\s+\S+,)\S+', r'\1**REDACTED**', message)
    # Existing: Generic password= / password:
    message = re.sub(
        r'(password[=:]\s*)\S+', r'\1**REDACTED**', message,
        flags=re.IGNORECASE
    )
    # NEW: sftp://user@host URLs (LFTP connection strings)
    message = re.sub(r'sftp://\S+@[^\s:]+', 'sftp://**REDACTED**@**REDACTED**', message)
    # NEW: user@host tokens in SSH command output (space/quote/bracket-anchored)
    # Covers: ssh args like "'user@host'" and command output like "user@host: path"
    # Does NOT match: "file@version.tar.gz" (no leading whitespace/quote before "file")
    message = re.sub(
        r"(?<![:\w])(\w[\w.\-]*)@([\w.\-]+)(?=[\s:'\"\]]|$)",
        '**REDACTED**@**REDACTED**',
        message
    )
    return message
```

**Test cases for LOG-03 validation:**
```python
# Must be redacted (SSH topology):
assert "sftp://**REDACTED**@**REDACTED**" in _redact_sensitive("sftp://user@seedbox.example.com/path")
assert "**REDACTED**@**REDACTED**" in _redact_sensitive("'user@seedbox.example.com' run cmd")

# Must NOT be redacted (filenames with @):
assert _redact_sensitive("Downloading file@720p.mkv") == "Downloading file@720p.mkv"
assert _redact_sensitive("file@v1.0.tar.gz") == "file@v1.0.tar.gz"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Restart via GET (common legacy pattern) | POST required for state-changing endpoints | OWASP guidance, pre-dates this project | GET restart is a CSRF vector — any page with an `<img src="/server/command/restart">` forces restart |
| File written with umask-default perms | Explicit 0600 after write | Best practice for credentials files | Prevents other OS users from reading config (remote_password, API keys) |
| Log redaction for passwords only | Extend to SSH topology | v3.1 added password redaction; v3.2 extends it | Prevents user/host leakage through SSE stream to browser |

**Deprecated/outdated:**
- GET-based action endpoints: Replaced by POST everywhere state changes. The existing GET for restart is the only remaining violation.

## Open Questions

1. **Should `from_file()` chmod be in `Persist` base class or only at the Seedsync config load site?**
   - What we know: `Persist.from_file()` is called for Config, ControllerPersist, AutoQueuePersist. Only `settings.cfg` contains credentials. ControllerPersist and AutoQueuePersist do not contain secrets.
   - What's unclear: Whether applying 0600 to non-secret persist files (autoqueue.persist, controller.persist) is a problem in practice.
   - Recommendation: Apply in the base class `Persist.from_file()` and `to_file()` for simplicity and defense-in-depth — all persist files deserve restricted access. Alternatively, only apply in `Config` by overriding `to_file()` and `from_file()` there, but that adds complexity.

2. **Regex precision for LOG-03 on the sshcp `command_args` list representation**
   - What we know: `sshcp.py` line 66 logs `command_args` as a Python list: `"Command: ['ssh', '-p', '22', ..., 'user@host', 'cmd']"`. The `user@host` token is preceded by `', ` (quote-comma-space).
   - What's unclear: Whether the lookbehind `(?<![:\w])` correctly handles this in all Python list repr formats.
   - Recommendation: Test with a realistic sshcp debug log string before shipping. The `(?<![:\w])` negative lookbehind ensures `user@host` is not preceded by a colon or word char — this correctly handles the `', user@host'` case (preceded by space) and excludes `sftp://user@host` (handled by Pattern A).

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — skipping this section.

## Sources

### Primary (HIGH confidence)
- CPython stdlib docs — `os.chmod`, `os.open` file modes — standard behavior, no version concerns
- SeedSync codebase — `persist.py`, `server.py`, `server-command.service.ts`, `serialize_log_record.py`, `sshcp.py` — direct code inspection
- Python `re` module docs — lookbehind assertions, negative lookbehind syntax

### Secondary (MEDIUM confidence)
- OWASP CSRF prevention — POST for state-changing endpoints is the established standard
- Python file permissions pattern — `open()` + `os.chmod()` is the common idiom; atomic `os.open(O_CREAT, mode)` + rename is the stricter alternative

### Tertiary (LOW confidence)
- None — all claims are based on direct code inspection or stdlib documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — stdlib only, direct codebase inspection
- Architecture: HIGH — all patterns exist in codebase already, changes are minimal
- Pitfalls: HIGH — regex false-positive and test update pitfalls verified by code inspection; chmod ordering well-understood

**Research date:** 2026-02-25
**Valid until:** 2026-04-25 (stable domain — file permissions and HTTP methods do not change)
