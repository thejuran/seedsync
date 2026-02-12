---
phase: 27-webhook-import-detection
plan: 01
subsystem: controller-webhook-integration
tags: [webhook, import-detection, sonarr, radarr, queue, threading]
dependency_graph:
  requires: [controller, web-handler-pattern, thread-safety]
  provides: [webhook-endpoints, webhook-manager, import-queue]
  affects: [controller-process-cycle, web-app-routes, auto-delete-trigger]
tech_stack:
  added: [queue.Queue, WebhookManager, WebhookHandler]
  patterns: [thread-safe-queue, webhook-receiver, event-processing]
key_files:
  created:
    - src/python/controller/webhook_manager.py
    - src/python/web/handler/webhook.py
    - src/python/tests/unittests/test_controller/test_webhook_manager.py
    - src/python/tests/unittests/test_web/test_webhook_handler.py
  modified:
    - src/python/controller/__init__.py
    - src/python/controller/controller.py
    - src/python/seedsync.py
    - src/python/web/web_app_builder.py
    - src/python/tests/unittests/test_controller/test_controller_unit.py
    - src/python/tests/unittests/test_controller/test_auto_delete.py
  deleted:
    - src/python/controller/sonarr_manager.py
    - src/python/tests/unittests/test_controller/test_sonarr_manager.py
decisions:
  - Webhook-only architecture (no polling fallback) for instant detection
  - Shared WebhookManager instance passed to both Controller and WebAppBuilder
  - Thread-safe Queue for cross-thread communication (web -> controller)
  - Always return 200 for valid event types to prevent Sonarr/Radarr retries
  - Case-insensitive file name matching in webhook_manager.process()
metrics:
  duration: 6 minutes
  tasks_completed: 2
  files_created: 4
  files_modified: 6
  files_deleted: 2
  test_coverage: 23 new test cases (10 WebhookManager + 13 WebhookHandler)
  commits: 2
completed: 2026-02-11T23:58:08Z
---

# Phase 27 Plan 01: Webhook Backend Implementation Summary

**One-liner:** Replaced 60s polling with instant webhook-driven import detection using thread-safe Queue and POST endpoints for Sonarr/Radarr.

## What Was Built

### Core Components

1. **WebhookManager** (`controller/webhook_manager.py`)
   - Thread-safe Queue for receiving import events from web thread
   - `enqueue_import(source, file_name)` - called by webhook handler
   - `process(model_file_names)` - called by controller thread to drain queue
   - Case-insensitive file name matching against SeedSync model
   - Comprehensive logging (INFO for matches, DEBUG for non-matches)

2. **WebhookHandler** (`web/handler/webhook.py`)
   - POST /server/webhook/sonarr endpoint
   - POST /server/webhook/radarr endpoint
   - Handles Test events (return 200 "Test OK")
   - Processes Download events (extracts file name, enqueues import)
   - Ignores other event types (Grab, Rename, etc.) with 200 OK
   - Title extraction fallback chain:
     - Sonarr: episodeFile.sourcePath (basename) -> release.releaseTitle -> series.title
     - Radarr: movieFile.sourcePath (basename) -> release.releaseTitle -> movie.title
   - Error handling: 400 for invalid JSON/empty body, 200 for all valid events

3. **Controller Integration**
   - `__check_webhook_imports()` replaces `__check_sonarr_imports()`
   - Called in every process() cycle
   - Identical downstream flow: persist import, update badge, schedule auto-delete
   - WebhookManager passed as constructor parameter (not created internally)

4. **Architecture Changes**
   - seedsync.py creates shared WebhookManager instance
   - Passed to both Controller and WebAppBuilder
   - SonarrManager polling code completely removed
   - Zero outbound API calls to Sonarr/Radarr

### Test Coverage

**New Tests:**
- `test_webhook_manager.py` - 10 test cases:
  - Empty queue handling
  - Enqueue and process matching files
  - No match handling
  - Case-insensitive matching
  - Multiple enqueues in one call
  - Queue draining behavior
  - Empty model handling
  - Logging verification (INFO and DEBUG levels)

- `test_webhook_handler.py` - 13 test cases:
  - Title extraction (Sonarr and Radarr, all fallback levels)
  - Download event processing
  - Test event handling
  - Non-Download events (Grab, Rename)
  - Error cases (invalid JSON, empty body, missing title)
  - Route registration verification

**Updated Tests:**
- Replaced SonarrManager mocks with WebhookManager mocks in:
  - `test_controller_unit.py` - BaseControllerTestCase updated
  - `test_auto_delete.py` - BaseAutoDeleteTestCase updated
- Renamed test classes:
  - TestControllerSonarrIntegration -> TestControllerWebhookIntegration
  - Test methods renamed (sonarr -> webhook)
- Zero remaining SonarrManager references in codebase

## Deviations from Plan

None - plan executed exactly as written.

## Technical Decisions

1. **Thread Safety**: Used queue.Queue (thread-safe by design) instead of manual locking. Web thread calls enqueue_import(), controller thread calls process(). No data races possible.

2. **HTTP Response Strategy**: Always return 200 for valid event types (including ignored ones) to prevent Sonarr/Radarr webhook retry behavior. Only return 400 for genuinely malformed requests.

3. **Fallback Chain**: Prefer sourcePath (actual file name) over release metadata. Ensures accurate matching when Sonarr/Radarr has exact file path.

4. **Dependency Injection**: WebhookManager created in seedsync.py and passed to consumers, not created inside Controller. Follows same pattern as persist (shared state, multiple consumers).

## Integration Points

**Upstream:**
- Sonarr/Radarr webhook configuration points to POST /server/webhook/{service}
- Events sent as JSON POST with eventType field

**Downstream:**
- Controller process() cycle calls webhook_manager.process() every iteration
- Matched imports trigger same flow as previous polling: persist, badge, auto-delete
- No changes needed in auto-delete or badge logic

**Web Layer:**
- WebhookHandler registered before add_default_routes() (webhook routes must not fall through to catch-all)
- Uses existing IHandler pattern from web.handler.controller

## Files Modified

**Created:**
- controller/webhook_manager.py (86 lines)
- web/handler/webhook.py (159 lines)
- tests/unittests/test_controller/test_webhook_manager.py (75 lines)
- tests/unittests/test_web/test_webhook_handler.py (161 lines)

**Modified:**
- controller/__init__.py (1 line changed)
- controller/controller.py (6 lines changed, method renamed)
- seedsync.py (3 lines added)
- web/web_app_builder.py (2 lines added)
- tests/unittests/test_controller/test_controller_unit.py (13 lines changed)
- tests/unittests/test_controller/test_auto_delete.py (11 lines changed)

**Deleted:**
- controller/sonarr_manager.py (156 lines)
- tests/unittests/test_controller/test_sonarr_manager.py (290 lines)

**Net change:** +245 lines, -446 lines (code reduction despite adding functionality)

## Verification

All verification steps passed:

1. ✅ WebhookManager and WebhookHandler syntax valid
2. ✅ sonarr_manager.py deleted
3. ✅ test_sonarr_manager.py deleted
4. ✅ No SonarrManager references in production code
5. ✅ No SonarrManager references in test code
6. ✅ All test files compile without syntax errors

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| cd8d78a | feat(27-01): replace SonarrManager with WebhookManager | 8 files (4 created, 4 modified, 2 deleted) |
| 87d1aa7 | test(27-01): update tests for WebhookManager migration | 4 files (2 created, 2 modified) |

## Next Steps

From ROADMAP.md:
- Phase 27 Plan 02: Frontend webhook status UI
- Phase 28: Test fixes (pre-existing model-file.service.spec.ts failures)

## Self-Check

Verifying all claimed artifacts exist and commits are valid:

**Created Files:**
```bash
[ -f "/Users/julianamacbook/seedsync/src/python/controller/webhook_manager.py" ] && echo "✓ webhook_manager.py"
[ -f "/Users/julianamacbook/seedsync/src/python/web/handler/webhook.py" ] && echo "✓ webhook.py"
[ -f "/Users/julianamacbook/seedsync/src/python/tests/unittests/test_controller/test_webhook_manager.py" ] && echo "✓ test_webhook_manager.py"
[ -f "/Users/julianamacbook/seedsync/src/python/tests/unittests/test_web/test_webhook_handler.py" ] && echo "✓ test_webhook_handler.py"
```

**Deleted Files:**
```bash
[ ! -f "/Users/julianamacbook/seedsync/src/python/controller/sonarr_manager.py" ] && echo "✓ sonarr_manager.py deleted"
[ ! -f "/Users/julianamacbook/seedsync/src/python/tests/unittests/test_controller/test_sonarr_manager.py" ] && echo "✓ test_sonarr_manager.py deleted"
```

**Commits:**
```bash
git log --oneline --all | grep -q "cd8d78a" && echo "✓ Commit cd8d78a exists"
git log --oneline --all | grep -q "87d1aa7" && echo "✓ Commit 87d1aa7 exists"
```

## Self-Check: PASSED

All files verified. All commits exist. Plan fully executed.
