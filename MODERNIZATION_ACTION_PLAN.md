# SeedSync Modernization Action Plan

**Created:** January 30, 2026
**Based on:** MODERNIZATION_REPORT.md
**Optimization:** Claude Code session-sized work chunks

---

## Overview

This plan breaks the modernization effort into **15 focused sessions**, each optimized for a single Claude Code session. Sessions are designed to:

- Stay within ideal context limits
- Focus on related files/concerns
- Have clear success criteria
- Be completable in one session
- Build on each other logically

---

## Session Index

| Session | Title | Phase | Priority | Est. Complexity |
|---------|-------|-------|----------|-----------------|
| 1 | Quick Wins: Format String & Minor Bugs | 0 | Critical | Low |
| 2 | Python Dependency Security Updates | 0 | Critical | Low |
| 3 | Thread Safety: Server & Status Components | 0 | Critical | Medium |
| 4 | Thread Safety: Model & AutoQueue Listeners | 0 | Critical | Medium |
| 5 | Angular Memory Leaks: BaseWebService | 1 | Critical | Medium |
| 6 | Angular Memory Leaks: FileOptionsComponent | 1 | Critical | Medium |
| 7 | Angular Memory Leaks: ViewFileService & Others | 1 | Critical | Medium |
| 8 | Backend Performance: Deep Copy Optimization | 1 | Critical | High |
| 9 | Backend Performance: Collection Limits | 1 | High | Medium |
| 10 | Backend Performance: Queue Drain & Polling | 1 | High | Medium |
| 11 | Code Quality: API Response Standardization | 2 | Medium | Medium |
| 12 | Code Quality: build_model() Refactor | 2 | High | High |
| 13 | Code Quality: Controller __update_model() Refactor | 2 | High | High |
| 14 | Architecture: Controller Split (Part 1) | 3 | High | High |
| 15 | Architecture: Controller Split (Part 2) & Cleanup | 3 | High | High |

---

## Phase 0: Foundation

### Session 1: Quick Wins - Format String & Minor Bugs

**Focus:** Fix trivial bugs that have immediate impact
**Files:** `src/python/controller/controller.py`
**Estimated Time:** 15-30 minutes

#### Tasks

- [x] Fix format string bug at `controller.py:453`
  ```python
  # FROM: return False, "Lftp error: ".format(str(e))
  # TO:   return False, "Lftp error: {}".format(str(e))
  ```
- [x] Fix format string bug at `controller.py:466`
- [x] Search for any other format string issues in codebase
- [x] Run Python tests to verify fixes

#### Success Criteria

- All format string bugs fixed
- Tests pass
- No regressions

---

### Session 2: Python Dependency Security Updates

**Focus:** Update dependencies with known CVEs
**Files:** `src/python/pyproject.toml`, `poetry.lock`
**Estimated Time:** 30-45 minutes

#### Tasks

- [x] Update cryptography to >=43.0.1 — **N/A: Not a dependency**
- [x] Update setuptools to >=70.0.0 — **Already at 80.9.0** ✓
- [x] Update pip to >=25.3 — **N/A: Not managed by Poetry** (system tool)
- [x] Update wheel to >=0.46.2 — **N/A: Not a dependency**
- [x] Run `poetry lock` to regenerate lockfile — **No changes needed**
- [x] Run `poetry install` to verify compatibility — **Already installed**
- [x] Run Python tests to verify no breaking changes — **243 passed**

#### Success Criteria

- Zero high/critical CVEs in dependencies ✓
- All tests pass ✓
- Application starts successfully ✓

#### Notes

**Session 2 Finding:** The CVEs listed in the original analysis do not apply to this project:
- `cryptography` is not a direct or transitive dependency
- `setuptools` was already updated to 80.9.0 (exceeds requirement)
- `pip` and `wheel` are Python system tools, not application dependencies managed by Poetry

---

### Session 3: Thread Safety - Server & Status Components

**Focus:** Add synchronization to server and status listeners
**Files:** `src/python/web/handler/server.py`, `src/python/common/status.py`
**Estimated Time:** 45-60 minutes

#### Tasks

- [x] Review `server.py` for thread safety issues
- [x] Add `threading.Lock` to `__request_restart` flag in ServerHandler
  ```python
  def __init__(self):
      self.__restart_lock = threading.Lock()
      self.__request_restart = False

  def request_restart(self):
      with self.__restart_lock:
          self.__request_restart = True

  def is_restart_requested(self):
      with self.__restart_lock:
          return self.__request_restart
  ```
- [x] Review `status.py` for thread safety issues
- [x] Add `threading.Lock` to `StatusComponent.__listeners`
- [x] Ensure listener iteration uses copy-under-lock pattern
  ```python
  def _notify_listeners(self):
      with self.__listeners_lock:
          listeners = list(self.__listeners)
      for listener in listeners:
          listener.notify()
  ```
- [x] Run tests to verify thread safety — **243 passed**

#### Success Criteria

- All listener operations thread-safe ✓
- No race conditions in restart flag
- Tests pass

---

### Session 4: Thread Safety - Model & AutoQueue Listeners

**Focus:** Add synchronization to model and auto-queue listeners
**Files:** `src/python/model/model.py`, `src/python/controller/auto_queue.py`
**Estimated Time:** 45-60 minutes

#### Tasks

- [x] Review `model/model.py` for thread safety issues
- [x] Add `threading.Lock` to `Model.__listeners` (lines 59, 71-72)
- [x] Implement copy-under-lock pattern for listener notification
- [x] Review `auto_queue.py` for thread safety issues
- [x] Add `threading.Lock` to `AutoQueuePersist.__listeners` (lines 63, 76-83)
- [x] Ensure pattern modifications are atomic
- [x] Add thread-safety documentation comments
- [x] Run tests to verify — **243 passed**

#### Success Criteria

- All Model listener operations thread-safe ✓
- All AutoQueuePersist operations thread-safe ✓
- No list modification during iteration possible ✓
- Tests pass ✓

---

## Phase 1: Performance & Memory

### Session 5: Angular Memory Leaks - BaseWebService

**Focus:** Fix subscription leak in base web service
**Files:** `src/angular/src/app/services/base/base-web.service.ts`
**Estimated Time:** 30-45 minutes

#### Tasks

- [ ] Review current subscription handling in `BaseWebService`
- [ ] Add `destroy$` subject for cleanup
  ```typescript
  private destroy$ = new Subject<void>();
  ```
- [ ] Add `takeUntil(this.destroy$)` to subscriptions (lines 20-29)
- [ ] Implement `ngOnDestroy` to complete the subject
  ```typescript
  ngOnDestroy(): void {
      this.destroy$.next();
      this.destroy$.complete();
  }
  ```
- [ ] Review if BaseWebService needs to be Injectable with OnDestroy
- [ ] Run Angular tests

#### Success Criteria

- No subscription accumulation after navigation
- Service properly cleans up on destroy
- Angular tests pass

---

### Session 6: Angular Memory Leaks - FileOptionsComponent

**Focus:** Fix subscription leaks in file options component
**Files:** `src/angular/src/app/pages/files/file-options.component.ts`
**Estimated Time:** 45-60 minutes

#### Tasks

- [ ] Review subscription handling (lines 50-73)
- [ ] Identify all subscriptions that need cleanup
- [ ] Add `destroy$` subject pattern
- [ ] Add `takeUntil(this.destroy$)` to all subscriptions
- [ ] Implement `OnDestroy` interface
- [ ] Ensure component cleans up on navigation away
- [ ] Run Angular tests

#### Success Criteria

- Zero leaks per navigation cycle
- Component properly implements OnDestroy
- Tests pass

---

### Session 7: Angular Memory Leaks - ViewFileService & Others

**Focus:** Fix remaining Angular subscription leaks
**Files:** `src/angular/src/app/services/files/view-file.service.ts`, other services
**Estimated Time:** 45-60 minutes

#### Tasks

- [ ] Review `ViewFileService` for subscription leaks
- [ ] Audit all services in `src/angular/src/app/services/` for subscription issues
- [ ] Implement cleanup pattern consistently across services
- [ ] Add `takeUntil` or `async pipe` patterns as appropriate
- [ ] Consider adding ESLint rule for subscription cleanup
- [ ] Run full Angular test suite

#### Success Criteria

- All services properly clean up subscriptions
- Consistent cleanup pattern across codebase
- Tests pass

---

### Session 8: Backend Performance - Deep Copy Optimization

**Focus:** Replace deep copy with efficient model access
**Files:** `src/python/controller/controller.py`, `src/python/model/model.py`
**Estimated Time:** 60-90 minutes

#### Tasks

- [ ] Review deep copy at `controller.py:302`
- [ ] Understand why deep copy was implemented (likely for thread safety)
- [ ] Design alternative approach:
  - Option A: Shallow copy + immutable file objects
  - Option B: Copy-on-write pattern
  - Option C: Incremental model updates
- [ ] Implement chosen approach
- [ ] Ensure thread safety is maintained
- [ ] Add benchmarks to measure improvement
- [ ] Run full test suite

#### Success Criteria

- No deep copy on every API request
- Memory churn reduced by 90%+
- Thread safety preserved
- All tests pass

#### Notes

This is a higher-risk change. Consider creating a feature flag to toggle between implementations during testing.

---

### Session 9: Backend Performance - Collection Limits

**Focus:** Implement bounds on downloaded/extracted collections
**Files:** `src/python/controller/controller.py`
**Estimated Time:** 45-60 minutes

#### Tasks

- [ ] Review unbounded collections at `controller.py:170-171`
- [ ] Determine appropriate size limits (consider typical usage patterns)
- [ ] Implement bounded collections (e.g., `collections.deque` with maxlen)
- [ ] Add configuration option for collection limits
- [ ] Implement LRU eviction for oldest entries
- [ ] Add memory monitoring/logging
- [ ] Run tests

#### Success Criteria

- Collections have reasonable upper bounds
- Memory growth is linear with bound, not file count
- Old entries evicted gracefully
- Tests pass

---

### Session 10: Backend Performance - Queue Drain & Polling

**Focus:** Fix CPU-intensive loops and optimize SSE polling
**Files:** `src/python/lftp/scanner_process.py`, `src/python/web/web_app.py`
**Estimated Time:** 45-60 minutes

#### Tasks

- [ ] Review tight loops in `scanner_process.py:113-126`
- [ ] Add CPU yield (`time.sleep(0.001)` or similar) to queue drain loops
- [ ] Review SSE polling at `web_app.py:153` (100ms per connection)
- [ ] Consider implementing backpressure or adaptive polling
- [ ] Profile CPU usage before and after changes
- [ ] Run tests

#### Success Criteria

- No CPU spikes from queue operations
- SSE polling efficient for multiple connections
- Reduced thread overhead
- Tests pass

---

## Phase 2: Code Quality

### Session 11: Code Quality - API Response Standardization

**Focus:** Create consistent API response format
**Files:** `src/python/web/handler/*.py`
**Estimated Time:** 60-90 minutes

#### Tasks

- [ ] Audit current API response formats
- [ ] Design standard response envelope:
  ```json
  {
    "success": true,
    "data": {...},
    "error": null,
    "timestamp": "..."
  }
  ```
- [ ] Create response helper functions
- [ ] Update command endpoints to use standard format
- [ ] Update status endpoint to use standard format
- [ ] Update config endpoint to use standard format
- [ ] Add proper HTTP status codes
- [ ] Update Angular services to handle new format
- [ ] Run E2E tests

#### Success Criteria

- All endpoints use consistent format
- Proper HTTP status codes returned
- Angular frontend handles new format
- E2E tests pass

---

### Session 12: Code Quality - build_model() Refactor

**Focus:** Break down the 249-line monster method
**Files:** `src/python/model/model_builder.py`
**Estimated Time:** 90-120 minutes

#### Tasks

- [ ] Read and understand `build_model()` completely
- [ ] Identify logical groupings of functionality
- [ ] Extract helper methods:
  - `_build_file_list()`
  - `_merge_remote_state()`
  - `_merge_local_state()`
  - `_calculate_transfer_state()`
  - etc.
- [ ] Ensure each method is <50 lines
- [ ] Add docstrings to new methods
- [ ] Maintain backwards compatibility
- [ ] Run full test suite

#### Success Criteria

- `build_model()` reduced to orchestration only
- All extracted methods <50 lines
- Cyclomatic complexity <10 per method
- Tests pass

---

### Session 13: Code Quality - Controller __update_model() Refactor

**Focus:** Simplify complex state management method
**Files:** `src/python/controller/controller.py`
**Estimated Time:** 90-120 minutes

#### Tasks

- [ ] Read and understand `__update_model()` (137 lines)
- [ ] Identify state transitions and side effects
- [ ] Extract logical groups:
  - `_update_scan_state()`
  - `_update_transfer_state()`
  - `_process_completed_transfers()`
  - etc.
- [ ] Consider state machine pattern if appropriate
- [ ] Reduce method to <50 lines
- [ ] Add state transition documentation
- [ ] Run tests

#### Success Criteria

- `__update_model()` reduced to clear orchestration
- State transitions documented
- Tests pass

---

## Phase 3: Architecture

### Session 14: Architecture - Controller Split (Part 1)

**Focus:** Extract ScanManager from Controller
**Files:** `src/python/controller/controller.py`, new file `src/python/controller/scan_manager.py`
**Estimated Time:** 120-150 minutes

#### Tasks

- [ ] Identify all scan-related methods in Controller
- [ ] Design `ScanManager` interface
- [ ] Create `src/python/controller/scan_manager.py`
- [ ] Extract scan methods:
  - Scanner process management
  - Scan state tracking
  - Scan-related callbacks
- [ ] Update Controller to delegate to ScanManager
- [ ] Ensure proper dependency injection
- [ ] Run full test suite

#### Success Criteria

- ScanManager is independent class
- Controller delegates scan operations
- No circular dependencies
- Tests pass

---

### Session 15: Architecture - Controller Split (Part 2) & Cleanup

**Focus:** Extract remaining managers and cleanup
**Files:** `src/python/controller/controller.py`, new manager files
**Estimated Time:** 120-150 minutes

#### Tasks

- [ ] Extract `FileOperationManager`:
  - Delete operations (local/remote)
  - Extract operations
  - File state tracking
- [ ] Extract `ProcessManager`:
  - LFTP process control
  - Process lifecycle
- [ ] Update Controller to coordinate managers
- [ ] Review and fix any layering violations
- [ ] Update imports throughout codebase
- [ ] Add integration documentation
- [ ] Run full test suite

#### Success Criteria

- Controller reduced to <200 lines
- Clear single responsibility for each manager
- No layering violations
- All tests pass

---

## Appendix A: Session Dependencies

```
Session 1 (Quick Wins)
    └── Independent, can start immediately

Session 2 (Dependencies)
    └── Independent, can start immediately

Session 3 (Thread Safety: Server/Status)
    └── Independent, can start immediately

Session 4 (Thread Safety: Model/AutoQueue)
    └── Recommended after Session 3

Session 5 (Angular: BaseWebService)
    └── Independent, can start immediately

Session 6 (Angular: FileOptionsComponent)
    └── Recommended after Session 5 (same pattern)

Session 7 (Angular: ViewFileService)
    └── After Sessions 5, 6 (cleanup pattern established)

Session 8 (Deep Copy)
    └── After Session 4 (thread safety established)

Session 9 (Collection Limits)
    └── Independent, after Session 8 preferred

Session 10 (Queue Drain)
    └── Independent

Session 11 (API Standardization)
    └── After Phase 0 and Phase 1 sessions

Session 12 (build_model Refactor)
    └── After Session 8 (model access patterns clear)

Session 13 (Controller Refactor)
    └── After Session 12 (related complexity)

Session 14 (Controller Split Part 1)
    └── After Sessions 12, 13 (code clean enough)

Session 15 (Controller Split Part 2)
    └── After Session 14
```

---

## Appendix B: Risk Mitigation

### Before Each Session

1. Ensure all tests pass before starting
2. Create a checkpoint commit
3. Have the report section ready for reference

### During Each Session

1. Make incremental commits
2. Run tests frequently
3. Document any discovered issues

### After Each Session

1. Run full test suite
2. Update this plan with completion status
3. Note any spillover items for next session

---

## Appendix C: Progress Tracking

### Phase 0 Status

| Session | Status | Completed Date | Notes |
|---------|--------|----------------|-------|
| 1 | Completed | 2026-01-30 | Fixed 3 format string bugs (controller.py:453, 466, test_sshcp.py:227) |
| 2 | Completed | 2026-01-30 | No changes needed - CVEs don't apply (see notes) |
| 3 | Completed | 2026-01-30 | Added locks to ServerHandler and StatusComponent |
| 4 | Completed | 2026-01-30 | Added locks to Model and AutoQueuePersist |

### Phase 1 Status

| Session | Status | Completed Date | Notes |
|---------|--------|----------------|-------|
| 5 | Not Started | | |
| 6 | Not Started | | |
| 7 | Not Started | | |
| 8 | Not Started | | |
| 9 | Not Started | | |
| 10 | Not Started | | |

### Phase 2 Status

| Session | Status | Completed Date | Notes |
|---------|--------|----------------|-------|
| 11 | Not Started | | |
| 12 | Not Started | | |
| 13 | Not Started | | |

### Phase 3 Status

| Session | Status | Completed Date | Notes |
|---------|--------|----------------|-------|
| 14 | Not Started | | |
| 15 | Not Started | | |

---

## Appendix D: Session Learnings

### Session 1 Learnings

1. **Test infrastructure limitations**: Many tests (lftp, ssh, integration) require external services that may not be available in all environments. To run unit tests without external dependencies:
   ```bash
   cd src/python
   poetry run pytest tests/unittests/test_controller/ tests/unittests/test_model/ tests/unittests/test_common/ -v
   ```

2. **Codebase-wide searches are valuable**: The format string search found an additional bug in `test_sshcp.py:227` not listed in the original plan. Always perform broad searches when fixing bug patterns.

3. **Poetry setup required**: Run `poetry install` before tests if the virtualenv isn't initialized. The first test run will fail with import errors otherwise.

4. **Format string bug pattern**: Look for `"...".format(arg)` where the string has no `{}` placeholder - the argument is silently ignored.

### Session 2 Learnings

1. **Verify CVEs apply before acting**: Always check if flagged packages are actually dependencies. In this case:
   - `cryptography` was not a dependency at all
   - `pip` and `wheel` are system tools, not Poetry-managed dependencies
   - `setuptools` was already at a safe version

2. **Check lockfile for actual versions**: Use `grep -A5 'name = "package"' poetry.lock` to quickly check current versions.

3. **Distinguish direct vs transitive dependencies**: CVE scanners may flag packages that aren't actually used by the application.

### Session 3 Learnings

1. **Copy-under-lock pattern**: When iterating over a collection that might be modified by other threads, copy the collection while holding the lock, then iterate over the copy outside the lock. This prevents both race conditions and potential deadlocks.

2. **File path corrections**: The plan listed `src/python/web/server.py` but the actual file is at `src/python/web/handler/server.py`. Always verify file paths before starting.

3. **Status already partially thread-safe**: The `Status` class already had `_listeners_lock`, but `StatusComponent` didn't. When adding thread safety, check what's already in place.

### Session 4 Learnings

1. **Consistent pattern application**: The same copy-under-lock pattern used in Session 3 applies directly to Model and AutoQueuePersist. Consistency makes the codebase easier to understand and maintain.

2. **Lock both add and notification paths**: Don't just protect the iteration - also protect add_listener/remove_listener operations with the same lock to ensure complete thread safety.

3. **Documentation in docstrings**: Adding thread-safety documentation to class docstrings helps future developers understand the synchronization strategy without reading all the code.

4. **Poetry virtualenv caching**: When switching branches or sessions, the Poetry virtualenv may need to be recreated. Run `poetry install` if you see import errors about missing modules like `tblib` or `timeout_decorator`.

---

*Action plan generated from MODERNIZATION_REPORT.md*
