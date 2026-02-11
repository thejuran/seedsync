---
phase: 25-auto-delete-with-safety
plan: 02
subsystem: controller
tags: [controller, auto-delete, timer, safety, unit-tests]
dependency_graph:
  requires: [Config.AutoDelete]
  provides: [Controller.__schedule_auto_delete, Controller.__execute_auto_delete, Controller.__pending_auto_deletes]
  affects: [controller-exit, sonarr-import-flow]
tech_stack:
  added: []
  patterns: [threading.Timer with daemon flag, config re-check at execution time, copy-under-iterate for dict cleanup]
key_files:
  created:
    - src/python/tests/unittests/test_controller/test_auto_delete.py
  modified:
    - src/python/controller/controller.py
    - src/python/tests/unittests/test_controller/test_controller_unit.py
decisions:
  - threading.Timer with daemon=True prevents timers from blocking process exit
  - Config re-checked at execution time for hot-toggle support (disable mid-flight)
  - Pending dict uses pop() for atomic remove-and-return (safe even if key missing)
  - BaseControllerTestCase defaults autodelete.enabled=False to prevent MagicMock Timer issues
metrics:
  duration: 4m
  completed: 2026-02-10
  tasks: 2
  files: 3
---

# Phase 25 Plan 02: Auto-Delete Timer Logic Summary

Timer-based auto-delete in Controller: threading.Timer with configurable delay, dry-run/disabled safety checks, delete_local ONLY (never delete_remote), exit cleanup.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | c8f01c5 | Add auto-delete scheduling and execution to Controller |
| 2 | a4faeef | Add unit tests for auto-delete scheduling, execution, and safety |

## What Was Built

### Controller Auto-Delete Logic (Task 1)

- **`__pending_auto_deletes: Dict[str, threading.Timer]`** - tracks active timers per file
- **`__schedule_auto_delete(file_name)`** - creates daemon Timer with `delay_seconds` delay, cancels existing timer for same file (re-detection support)
- **`__execute_auto_delete(file_name)`** - timer callback that:
  1. Removes from pending dict
  2. Re-checks `config.autodelete.enabled` (hot-toggle support)
  3. Checks `config.autodelete.dry_run` (logs without deleting)
  4. Calls `self.__file_op_manager.delete_local(file)` ONLY
  5. Catches `ModelError` if file no longer in model
- **`__check_sonarr_imports`** integration: schedules auto-delete when `autodelete.enabled` is True
- **`exit()`** cleanup: cancels all pending timers and clears dict

### Safety Verification

- `__execute_auto_delete` calls ONLY `delete_local`, NEVER `delete_remote` (verified via AST inspection and grep)
- `__execute_auto_delete` checks `config.autodelete.enabled` before deletion
- `__execute_auto_delete` checks `config.autodelete.dry_run` before deletion
- `__execute_auto_delete` catches `ModelError` if file no longer exists
- `exit()` cancels all pending timers
- `timer.daemon = True` set on all timers
- `__schedule_auto_delete` cancels existing timer for same file before scheduling new one

### Unit Tests (Task 2)

- **TestAutoDeleteScheduling** (5 tests): dict initialized empty, timer creation, daemon flag, re-schedule cancels old, multiple files
- **TestAutoDeleteExecution** (7 tests): calls delete_local, NEVER delete_remote, dry-run skips, disabled skips, ModelError handled, pending dict cleanup, cleanup on error
- **TestAutoDeleteShutdown** (2 tests): exit cancels all timers, exit with no timers
- **TestAutoDeleteIntegration** (2 tests): Sonarr import triggers schedule when enabled, skips when disabled

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Set autodelete.enabled=False in BaseControllerTestCase**
- **Found during:** Task 1 verification
- **Issue:** Existing Sonarr integration tests use MagicMock for context.config, which makes autodelete.enabled truthy by default. This triggered the new auto-delete scheduling code path with MagicMock as delay_seconds, causing a TypeError in threading.Timer.
- **Fix:** Added `self.mock_context.config.autodelete.enabled = False` to BaseControllerTestCase.setUp defaults
- **Files modified:** src/python/tests/unittests/test_controller/test_controller_unit.py
- **Commit:** c8f01c5

## Verification Results

1. Controller import: compiles successfully
2. Safety AST check: No delete_remote calls in auto-delete code path
3. Existing controller unit tests: 104 passed (no regressions)
4. New auto-delete tests: 16 passed
5. Combined test run: 135 passed (controller + auto-delete + sonarr)

## Self-Check: PASSED

All 3 files found, both commits verified, all content markers present.
