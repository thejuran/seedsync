---
id: M009
provides:
  - Hardened LFTP and SSH command paths against injection
  - Thread-safe model access and auto-delete timer management
  - Managed SSE subscription lifecycle preventing stale event delivery
  - Credential redaction in debug log output
  - Narrowed exception handlers, correct log levels, concrete types
  - Version sync across package.json and debian/changelog
key_decisions:
  - D023: Bare except in config.py kept as-is — requests mock in CI prevents catching RequestException by name
  - D024: pexpect process close on all exception paths uses explicit except blocks (not finally) to preserve post-close attribute access
patterns_established:
  - Dedicated threading.Lock per shared mutable dict (not reusing __model_lock)
  - collections.deque for BFS traversals throughout Python codebase
  - isinstance() guard before .decode() on pexpect before/after attributes
  - Inner Observable subscriptions connected to outer teardown via return () => sub.unsubscribe()
observability_surfaces:
  - Credential redaction in context.py print_to_log() for password, api_key, api_token, secret fields
  - ModelError in webhook BFS now logged at DEBUG instead of silently swallowed
requirement_outcomes: []
duration: 1 session
verification_result: passed
completed_at: 2026-03-28
---

# M009: Full Codebase Deep Review Fixes

**All 55 issues from full-codebase TuringMind review addressed across 17 files — security hardening, concurrency fixes, frontend bug fixes, and Python code quality improvements.**

## What Happened

A full-codebase TuringMind deep review identified 55 issues (22 reported ≥70 severity, 33 filtered <70). All were addressed in 4 slices executed sequentially on a single branch.

**S01 (Security)** hardened command injection vectors: LFTP `escape()` now rejects newline/CR/null characters raising `LftpError`; `remote_scanner.py` uses `shlex.quote()` for all shell-interpolated paths; `context.py` `print_to_log()` redacts sensitive config keys (password, api_key, api_token, secret, webhook_secret, remote_password).

**S02 (Concurrency)** fixed race conditions: `__process_commands` model read now under `__model_lock`; `__pending_auto_deletes` dict gets its own `__auto_delete_lock` (schedule/execute/cancel/exit all protected); shallow `copy.copy()` of frozen ModelFile now fixes child `__parent` references; webhook import loop batches all model updates under a single lock acquisition instead of N separate locks.

**S03 (Frontend)** fixed subscription leaks and data integrity: SSE subscription stored and unsubscribed on reconnect; view-file indices now updated on file-add even without sort comparator; pexpect TIMEOUT/after handled with `isinstance(bytes)` guard; inner Observable subscriptions in bulk-command.service and view-file.service connected to teardown; cached-reuse-strategy `store()` got null guard.

**S04 (Python quality)** cleaned up code patterns: bare `except Exception` narrowed to specific types in webhook.py (ValueError/JSONDecodeError); per-file filter-check and is_file_downloaded log levels dropped from INFO to DEBUG; `list.pop(0)` BFS replaced with `collections.deque.popleft()` in 4 files; `Optional[object]` replaced with concrete types; pexpect process closed on all exception paths in sshcp.py; `zip(keys,values)` simplified to `dict.items()`; debian/changelog synced to 3.3.0-dev.1.

## Cross-Slice Verification

- **No command injection vectors**: LFTP escape() rejects \n/\r/\x00; shlex.quote() wraps paths — verified via ast.parse() and CI test update
- **All model/dict access protected**: __model_lock wraps get_file in __process_commands; __auto_delete_lock wraps all __pending_auto_deletes access — verified via code review
- **SSE subscription lifecycle managed**: _currentSubscription stored, unsubscribed before reconnect — verified on live instance (SSE reconnects clean)
- **Credentials redacted**: print_to_log() masks sensitive keys — verified via code review
- **All tests pass**: 1134 Python tests, 401 Angular tests, CI green (run 23698948196)
- **UAT passed**: Live instance at maguffynas:8800 — dashboard, settings, logs, autoqueue redirect all verified

## Forward Intelligence

### What the next milestone should know
- The `except Exception` in config.py was intentionally kept — CI mocks `requests` in a way that prevents catching `requests.RequestException` by class name (TypeError at import time)
- SSE "Error in stream" console messages are expected on page navigation — the old EventSource is torn down and a new one created

### What's fragile
- `__parent` reference fix in ModelFile shallow copy — if new code adds children or restructures the tree after copy, the parent refs need re-fixing
- pexpect `before`/`after` can be `TIMEOUT` sentinel, `EOF` sentinel, bytes, or None depending on match state — always guard with isinstance

### Authoritative diagnostics
- CI run 23698948196 — full green after all fixes applied
- `git log --oneline 5f447de..2e08469` shows the 4 fix commits plus CI fix

### What assumptions changed
- Assumed `requests.RequestException` could replace bare except — CI's mock environment prevents this at class-resolution time
- shlex.quote() on clean paths returns them unquoted (no wrapping quotes) — test expectations needed updating
