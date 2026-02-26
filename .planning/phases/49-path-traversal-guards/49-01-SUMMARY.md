---
phase: 49-path-traversal-guards
plan: "01"
subsystem: backend-security
tags: [security, path-traversal, tdd, controller-handler]
dependency_graph:
  requires: []
  provides: [PATH-01, PATH-02, PATH-03]
  affects: [controller-handler, web-app-builder]
tech_stack:
  added: []
  patterns: [realpath-containment-guard, tdd-red-green]
key_files:
  created: []
  modified:
    - src/python/web/handler/controller.py
    - src/python/web/web_app_builder.py
    - src/python/tests/unittests/test_web/test_handler/test_controller_handler.py
decisions:
  - "Guard uses os.path.realpath() + Path.is_relative_to() — not string matching — to handle both ../ sequences and symlinks"
  - "local_path defaults to empty string for backward compatibility; empty local_path sets __local_path_real to None making guard a no-op"
  - "_GUARDED_ACTIONS covers only delete_local, delete_remote, extract — queue/stop operate on model names not filesystem paths"
  - "400 response body is exactly 'Invalid file path' with no path details to prevent information leakage (PATH-03)"
  - "Bulk endpoint guards per-file before queuing; guarded files get error in results array while unguarded files continue"
metrics:
  duration: 258s
  completed_date: "2026-02-25"
  tasks_completed: 1
  files_modified: 3
---

# Phase 49 Plan 01: Path Traversal Guards Summary

Realpath-based path traversal guards added to all file-destructive endpoints (delete_local, delete_remote, extract) and the bulk endpoint, preventing directory traversal attacks via `../` sequences or symlinks.

## What Was Built

**Guard method `_check_path_safe`** on `ControllerHandler` uses `os.path.realpath()` to fully resolve both `../` sequences and symlinks before checking containment within `local_path` using `Path.is_relative_to()`. Returns `HTTPResponse(status=400, body="Invalid file path")` if path escapes the configured download directory, else `None`.

**Three individual handlers** (`__handle_action_delete_local`, `__handle_action_delete_remote`, `__handle_action_extract`) now call `_check_path_safe` immediately after `unquote(file_name)` and return early on traversal attempts.

**Bulk endpoint** (`_process_bulk_commands`) checks each filename against `_GUARDED_ACTIONS` set before queuing. Traversal filenames for guarded actions get a `{success: false, error: "Invalid file path", error_code: 400}` result without ever reaching `queue_command`.

**Constructor update**: `ControllerHandler.__init__` now accepts optional `local_path: str = ""`. Empty string (default) sets `__local_path_real = None` making the guard a no-op — backward compatible with all 38 existing tests that pass only `controller`.

**WebAppBuilder** wired to pass `context.config.lftp.local_path` to the constructor.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| RED  | Add 9 failing path traversal tests (TestControllerHandlerPathTraversal) | be88511 |
| GREEN | Implement guard: constructor, _check_path_safe, handler guards, bulk guards, WebAppBuilder wiring | 89c7a7c |

## Test Results

- 9 new path traversal tests: all pass
- 47 total tests in test_controller_handler.py: all pass
- No regressions in existing 38 tests
- Pre-existing failures (test_app_process, test_lftp) are infrastructure issues unrelated to this change

## Success Criteria Verification

- [x] delete_local with "../" filename returns 400 "Invalid file path" (PATH-01)
- [x] delete_remote with "../" filename returns 400 "Invalid file path" (PATH-01)
- [x] extract with "../" filename returns 400 "Invalid file path" (PATH-02)
- [x] Bulk delete_local/delete_remote/extract with traversal filename returns per-file error (PATH-01, PATH-02)
- [x] Bulk queue/stop with traversal filename is NOT rejected (non-destructive, no guard)
- [x] 400 response body is exactly "Invalid file path" — no filesystem paths (PATH-03)
- [x] Normal filenames (including subdirectory paths) pass through without rejection
- [x] Guard uses os.path.realpath() + Path.is_relative_to() (not string checks)
- [x] Existing tests (47 in test_controller_handler.py) pass without modification

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- `src/python/web/handler/controller.py` — FOUND (contains `_check_path_safe`, `_GUARDED_ACTIONS`, `realpath`, `is_relative_to`)
- `src/python/web/web_app_builder.py` — FOUND (contains `local_path=context.config.lftp.local_path`)
- `src/python/tests/unittests/test_web/test_handler/test_controller_handler.py` — FOUND (133 lines added, TestControllerHandlerPathTraversal class)
- Commit be88511 — FOUND (RED: failing tests)
- Commit 89c7a7c — FOUND (GREEN: implementation)
