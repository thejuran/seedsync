# Phase 49: Path Traversal Guards - Research

**Researched:** 2026-02-25
**Domain:** Python path safety, Bottle web handler validation
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PATH-01 | File delete endpoint rejects filenames that resolve outside the configured local_path via realpath() + is_relative_to() check | Guard function at web handler layer using `Path(os.path.realpath(...)).is_relative_to(local_path_real)` |
| PATH-02 | File extract endpoint rejects archive paths that resolve outside the configured local_path or output directory | Same guard applied before queuing extract command; child archive paths are built from ModelFile.full_path inside ExtractDispatch, so the guard must operate on the root file name at handler time |
| PATH-03 | Path traversal attempts return 400 Bad Request with no path details in the error body | Return `HTTPResponse(body="Invalid file path", status=400)` — no path information in the body string |
</phase_requirements>

## Summary

Phase 49 adds path traversal guards to the two file-destructive endpoints: delete (local and remote) and extract. The attack surface is the URL-encoded filename that flows from `ControllerHandler` → `Controller.Command` → `FileOperationManager` → `DeleteLocalProcess` / `ExtractDispatch`, where it is joined with `local_path` via `os.path.join()`. An attacker can inject `../../etc/passwd` or use a symlink into the filename to escape the configured directory.

The correct fix is to apply a guard function early in the request pipeline — inside the HTTP handler, before queuing the command — using `os.path.realpath()` + `Path.is_relative_to()`. `os.path.realpath()` resolves both `..` sequences and symlinks in one call. The check must apply `realpath()` to the base `local_path` too (in case it itself contains symlinks), and the error response must return only a generic message with no path details (PATH-03).

The implementation is a two-part change: (1) a private guard method on `ControllerHandler` that takes a filename and returns a `HTTPResponse | None`, and (2) early-exit calls to this guard at the top of `__handle_action_delete_local`, `__handle_action_delete_remote`, and `__handle_action_extract`. The `ControllerHandler` currently receives only a `Controller` instance — it must also receive `local_path` so the guard has the base path to compare against.

**Primary recommendation:** Add a `_check_path_safe(filename) -> HTTPResponse | None` method to `ControllerHandler`. If the resolved path escapes `local_path`, return `HTTPResponse(body="Invalid file path", status=400)`. Call it at the top of the three affected handlers before any other processing.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `pathlib.Path` | stdlib (Python 3.11+) | `Path.is_relative_to()` check | Built-in; `is_relative_to` available since Python 3.9, project targets >=3.11 |
| `os.path.realpath` | stdlib | Resolve symlinks + `..` in one call | Standard POSIX approach; resolves both attack vectors |
| `bottle.HTTPResponse` | 0.13.x (pinned) | Return 400 early from handler | Already used throughout `ControllerHandler` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `os.path.join` | stdlib | Build candidate path before realpath | Already in use throughout delete/extract code |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `os.path.realpath` + `is_relative_to` | `os.path.abspath` + `startswith` | `abspath` does NOT resolve symlinks — misses symlink bypass. Always use `realpath`. |
| Handler-level guard | Guard inside `DeleteLocalProcess.run_once()` or `ExtractDispatch.extract()` | Process-level guard fires too late (subprocess already spawned or task queued); HTTP 400 cannot be returned from subprocess. Web handler layer is correct. |
| Custom string `startswith` | `Path.is_relative_to()` | String prefix match can be fooled by `/local/path-evil` matching `/local/path` prefix. `is_relative_to()` compares path components cleanly. |

**Installation:** No new packages needed. All stdlib.

## Architecture Patterns

### Where the Guard Lives

The guard must sit in `src/python/web/handler/controller.py` inside `ControllerHandler`, applied **before** calling `self.__controller.queue_command(command)`.

The flow today:
```
URL /server/command/delete_local/<file_name>
  → ControllerHandler.__handle_action_delete_local(file_name)
    → unquote(file_name)
    → Controller.Command(DELETE_LOCAL, file_name)
    → controller.queue_command(command)            # ← no path check here
    → FileOperationManager.delete_local(file)
    → DeleteLocalProcess: os.path.join(local_path, file_name) → file system
```

The guard sits between `unquote()` and `queue_command()`.

### Constructor Change

`ControllerHandler.__init__` currently accepts only `controller: Controller`. It needs `local_path: str` added to run the guard.

In `WebAppBuilder`, `ControllerHandler` is instantiated as:
```python
self.controller_handler = ControllerHandler(controller)
```

This becomes:
```python
self.controller_handler = ControllerHandler(controller, local_path=context.config.lftp.local_path)
```

### Pattern: Guard Method

```python
# In ControllerHandler.__init__:
import os
from pathlib import Path

self.__local_path_real = Path(os.path.realpath(local_path))

# Private guard method:
def _check_path_safe(self, file_name: str):
    """
    Returns HTTPResponse(status=400) if file_name escapes local_path, else None.
    Uses realpath() to resolve both '..' sequences and symlinks.
    """
    candidate = Path(os.path.realpath(os.path.join(str(self.__local_path_real), file_name)))
    if not candidate.is_relative_to(self.__local_path_real):
        logger.warning("Rejected path traversal attempt for: %s", repr(file_name))
        return HTTPResponse(body="Invalid file path", status=400)
    return None
```

### Pattern: Early Exit in Handlers

```python
def __handle_action_delete_local(self, file_name: str) -> HTTPResponse:
    file_name = unquote(file_name)
    guard = self._check_path_safe(file_name)
    if guard:
        return guard
    # ... existing logic unchanged ...
```

Apply identically to `__handle_action_delete_remote` and `__handle_action_extract`.

### Anti-Patterns to Avoid

- **Logging the rejected filename in the response body:** PATH-03 requires no path info in the body. Log to server log only. Body must be a generic string like `"Invalid file path"`.
- **Using `os.path.abspath` instead of `os.path.realpath`:** `abspath` normalizes `.` and `..` but does NOT resolve symlinks. A symlink at `/local/path/sneaky` pointing to `/etc` would pass an `abspath` check. Use `realpath` only.
- **Checking inside the subprocess (`DeleteLocalProcess.run_once`):** By the time the subprocess runs, the Controller thread has already accepted the command. The 400 response cannot be returned from a subprocess. Guard must be at the HTTP handler level.
- **Using `str.startswith` on path strings:** `/local/path-evil` starts with `/local/path`. Use `Path.is_relative_to()` which compares components.
- **Not applying `realpath` to the base path:** If `local_path` itself is a symlink, `os.path.join(local_path, file_name)` would resolve to a path that does not share the unresolved prefix. Always `realpath(local_path)` in `__init__` and compare against that.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Symlink resolution | Custom symlink-following loop | `os.path.realpath()` | Handles nested symlinks, platform edge cases, circular detection |
| Path containment check | String prefix matching | `Path.is_relative_to()` | Component-aware; avoids prefix false matches |

**Key insight:** Path traversal is the domain where hand-rolled checks fail in subtle ways (symlinks, double-encode, Windows UNC, trailing slash edge cases). The stdlib `realpath` + `is_relative_to` pair is the ecosystem standard for this exact problem.

## Common Pitfalls

### Pitfall 1: Only Checking for `../` in the String
**What goes wrong:** String-level `if '../' in file_name` misses URL-encoded variants (`%2e%2e%2f`) and encoded sequences that `unquote()` resolves before the check. The code already calls `unquote(file_name)` before passing to guard — so the decoded string is what needs guarding.
**Why it happens:** String filtering seems simple; realpath-based approach seems overkill.
**How to avoid:** Use `realpath()` on the joined path instead of inspecting the filename string.
**Warning signs:** Tests pass for `../../etc/passwd` but fail for `%2e%2e%2fetc%2fpasswd`.

Note: In this codebase `unquote(file_name)` already happens before the guard, so `%2e%2e` → `../` is decoded first. The `realpath` approach handles both the decoded and symlink cases.

### Pitfall 2: Not Guarding `delete_remote`
**What goes wrong:** `delete_remote` is guarded against remote path traversal by SSH quoting (`shlex.quote`), but the local `file_name` is still joined with `remote_path` in `DeleteRemoteProcess`. Requirements say PATH-01 covers the delete endpoint — this includes both local and remote variants.
**Why it happens:** Remote delete doesn't write to local disk, so the risk seems lower.
**How to avoid:** Apply the guard to `__handle_action_delete_remote` too. The filename is the same user input. Consistent behavior is required by the success criteria.

### Pitfall 3: Error Body Leaking Path Information
**What goes wrong:** Error message like `"Path '/etc/passwd' is outside local_path '/downloads'"` reveals filesystem structure.
**Why it happens:** Helpful error messages are a developer instinct.
**How to avoid:** Body must be a generic static string — `"Invalid file path"` or similar. Log the rejected path server-side for debugging.
**Warning signs:** Success criterion 3 says "no filesystem path details" in the response body.

### Pitfall 4: `ControllerHandler` Has No `local_path` Today
**What goes wrong:** Forgetting to thread `local_path` through `WebAppBuilder` → `ControllerHandler` constructor.
**Why it happens:** `ControllerHandler` currently only takes `controller`.
**How to avoid:** Update both `WebAppBuilder` (which constructs `ControllerHandler`) and `ControllerHandler.__init__` in the same plan.

### Pitfall 5: Non-Existent Files and `realpath`
**What goes wrong:** `os.path.realpath('/local/path/nonexistent.mkv')` returns `/local/path/nonexistent.mkv` even if the file doesn't exist — it resolves as much as it can. This is correct behavior for the guard: we want to validate the path structure, not file existence.
**Why it happens:** Developers assume `realpath` requires the file to exist.
**How to avoid:** No issue — `realpath` works correctly on non-existent paths for structural validation. Existence is checked later by the controller (`file.local_size is None`).

## Code Examples

Verified patterns from stdlib docs and empirical testing:

### Guard Method (complete)
```python
# Source: stdlib os.path.realpath + pathlib.Path.is_relative_to (Python 3.9+)
import os
from pathlib import Path

# In __init__:
self.__local_path_real = Path(os.path.realpath(local_path))

# Guard method:
def _check_path_safe(self, file_name: str):
    """Returns HTTPResponse 400 if file_name resolves outside local_path, else None."""
    candidate = Path(os.path.realpath(
        os.path.join(str(self.__local_path_real), file_name)
    ))
    if not candidate.is_relative_to(self.__local_path_real):
        logger.warning("Rejected traversal attempt: %s", repr(file_name))
        return HTTPResponse(body="Invalid file path", status=400)
    return None
```

### Verified: Symlink Bypass Caught
```python
# Empirically tested:
# - symlink at /local/path/sneaky -> /outside/secret
# - realpath("/local/path/sneaky") = "/outside/secret"
# - Path("/outside/secret").is_relative_to(Path("/local/path")) = False  ✓

# - filename "../../etc/passwd" with local_path "/local/path"
# - realpath("/local/path/../../etc/passwd") = "/etc/passwd"
# - Path("/etc/passwd").is_relative_to(Path("/local/path")) = False  ✓

# - normal file "movie.mkv"
# - realpath("/local/path/movie.mkv") = "/local/path/movie.mkv"
# - Path("/local/path/movie.mkv").is_relative_to(Path("/local/path")) = True  ✓
```

### WebAppBuilder Change
```python
# src/python/web/web_app_builder.py
# Before:
self.controller_handler = ControllerHandler(controller)

# After:
self.controller_handler = ControllerHandler(
    controller,
    local_path=context.config.lftp.local_path
)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `os.path.abspath` + string `startswith` | `os.path.realpath` + `Path.is_relative_to()` | Python 3.9 (is_relative_to) | Symlink bypass protection + no false prefix match |
| Check inside subprocess | Check at HTTP handler layer | Security best practice | Allows proper 400 response before command is queued |

**Deprecated/outdated:**
- String-level `../` filtering: Does not handle URL encoding, alternate separators, or symlinks. Do not use.

## Open Questions

1. **Should `delete_remote` also be path-guarded?**
   - What we know: `delete_remote` runs `rm -rf` on the remote server via SSH. The local `file_name` used in the URL is also joined with the remote path in `DeleteRemoteProcess`. The remote is outside `local_path` by definition.
   - What's unclear: Does PATH-01 mean only local filesystem paths, or also the delete_remote endpoint for consistency?
   - Recommendation: Apply the guard to `delete_remote` for consistency. The filename is the same user input. The success criterion says "delete requests" (plural) should return 400 for traversal attempts — treat both variants as covered.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 7.4.4 |
| Config file | `src/python/pyproject.toml` (`[tool.pytest.ini_options]`) |
| Quick run command | `cd src/python && poetry run pytest tests/unittests/test_web/test_handler/test_controller_handler.py -x` |
| Full suite command | `cd src/python && poetry run pytest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PATH-01 | Delete (local+remote) with `../` filename → 400, no path in body | unit | `pytest tests/unittests/test_web/test_handler/test_controller_handler.py -x` | ✅ (extend) |
| PATH-02 | Extract with traversal filename → 400, no path in body | unit | `pytest tests/unittests/test_web/test_handler/test_controller_handler.py -x` | ✅ (extend) |
| PATH-03 | 400 body contains no filesystem path details | unit | same as above | ✅ (extend) |

All three requirements map to the same test file (`test_controller_handler.py`), adding new test methods.

### Sampling Rate
- **Per task commit:** `cd src/python && poetry run pytest tests/unittests/test_web/test_handler/test_controller_handler.py -x`
- **Per wave merge:** `cd src/python && poetry run pytest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all phase requirements. `test_controller_handler.py` exists and contains the `TestControllerHandlerSingleAction` class where new path traversal tests slot in directly.

## Sources

### Primary (HIGH confidence)
- `src/python/web/handler/controller.py` — ControllerHandler implementation; confirmed constructor signature, handler methods, early-return pattern
- `src/python/web/web_app_builder.py` — Confirmed ControllerHandler instantiation point for constructor change
- `src/python/controller/delete/delete_process.py` — Confirmed `os.path.join(local_path, file_name)` is the filesystem call that traversal exploits
- `src/python/controller/extract/dispatch.py` — Confirmed extract path construction for both single-file and directory cases
- `src/python/pyproject.toml` — Confirmed Python >=3.11; `Path.is_relative_to()` available since 3.9
- Python stdlib docs — `os.path.realpath`, `pathlib.Path.is_relative_to` (empirically tested in local Python 3.9.6; valid for 3.11+)

### Secondary (MEDIUM confidence)
- Empirical testing of guard pattern in local Python 3.9 interpreter — traversal and symlink cases both correctly blocked; normal filenames pass

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — stdlib only, no new dependencies, empirically verified
- Architecture: HIGH — code read confirmed all construction points and handler structure
- Pitfalls: HIGH — all pitfalls derived from direct code inspection (not abstract advice)

**Research date:** 2026-02-25
**Valid until:** 2026-03-25 (stable stdlib domain; no expiry concern)
