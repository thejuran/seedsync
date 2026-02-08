---
phase: 18
plan: 02
subsystem: controller-unit-tests
tags: [testing, unit-tests, controller, model-pipeline, controller-job]
dependency-graph:
  requires: [18-01]
  provides: [controller-pipeline-tests, controller-tracking-tests, controller-job-tests]
  affects: [test-coverage]
tech-stack:
  added: []
  patterns: [unittest, MagicMock, ModelDiff-direct-creation, real-Model-for-build-tests]
key-files:
  created:
    - src/python/tests/unittests/test_controller/test_controller_job.py
  modified:
    - src/python/tests/unittests/test_controller/test_controller_unit.py
decisions: []
metrics:
  duration: 300s
  completed: 2026-02-08
---

# Phase 18 Plan 02: Controller Pipeline & ControllerJob Tests Summary

Unit tests for the Controller model update pipeline (collect/feed/track/prune/apply/status helper methods), exception propagation, and ControllerJob lifecycle. These cover the second half of Controller -- the model update pipeline that runs every tick via process().

## Results

- **Test files:** 2 (1 expanded, 1 new)
- **New test classes:** 11 (10 appended to test_controller_unit.py + 1 in test_controller_job.py)
- **New test methods:** 54 (49 pipeline + 5 ControllerJob)
- **Total controller tests:** 106 (52 from Plan 18-01 + 54 new)
- **All 106 tests passing**
- **Full regression:** 817 passed (763 baseline + 54 new), 0 new regressions

### Breakdown by Class

| Class | Test Methods | Coverage Focus |
|-------|-------------|----------------|
| TestControllerCollect | 3 | _collect_scan_results, _collect_lftp_status, _collect_extract_results delegation |
| TestControllerFeedModelBuilder | 8 | All _feed_model_builder input combinations (remote/local/active scan, lftp/extract statuses, extracted results) |
| TestControllerDetectAndTrackQueued | 8 | Download-start tracking: ADDED/UPDATED transitions, state/size boundary conditions, already-tracked guard |
| TestControllerDetectAndTrackDownload | 6 | Download-complete tracking: state transitions, already-DOWNLOADED guard |
| TestControllerPruneExtracted | 4 | Extracted file pruning: DELETED removal, non-DELETED retention, orphan retention, empty set |
| TestControllerApplyModelDiff | 6 | ADDED/REMOVED/UPDATED model application, mixed diffs, tracking integration |
| TestControllerActiveFileTracking | 4 | Active file name tracking: RUNNING filter, None preservation, scan_manager delegation |
| TestControllerBuildAndApplyModel | 4 | Build orchestration: no-changes skip, build triggered, diff applied, empty model |
| TestControllerUpdateStatus | 3 | Controller status updates with remote/local scan timestamps |
| TestControllerPropagateExceptions | 3 | Exception propagation from all 4 managers, cleanup_completed_processes call |
| TestControllerJob | 5 | ControllerJob lifecycle: setup/execute/cleanup delegation, execution order |

### Architecture

- Pipeline helper methods tested directly (single-underscore public API designed for testing)
- ModelDiff objects created directly for tracking tests (not via ModelDiffUtil.diff_models)
- Real Model objects used for _build_and_apply_model tests
- ControllerJob tests use simple MagicMock injection (no patching needed)

## Deviations from Plan

- Added `reset_mock()` calls in TestControllerFeedModelBuilder to isolate init-time `set_extracted_files` calls from test-time calls (Controller.__init__ calls set_extracted_files once during setup).

## Self-Check: PASSED

Both files verified. Commit e9ac251 confirmed.
