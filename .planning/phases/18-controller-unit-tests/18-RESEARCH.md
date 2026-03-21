# Phase 18: Controller Unit Tests - Research

**Researched:** 2026-02-08
**Domain:** Python unit testing for Controller orchestration class and ControllerJob (unittest.TestCase + MagicMock + @patch)
**Confidence:** HIGH

## Summary

Phase 18 covers unit tests for `controller.py` (767 lines, zero unit tests) and `controller_job.py` (35 lines, zero unit tests). The Controller is the top-level orchestration class that coordinates ScanManager, LftpManager, FileOperationManager, ModelBuilder, and MemoryMonitor to manage the file sync lifecycle. It has a complex `__init__` that creates all internal managers, a `process()` method that drives the main loop (propagate exceptions, cleanup, process commands, update model), and 5 command handlers (QUEUE, STOP, EXTRACT, DELETE_LOCAL, DELETE_REMOTE).

The existing codebase has thorough unit tests for each individual manager (ScanManager, LftpManager, FileOperationManager, ModelBuilder) using `@patch` at the module level to mock their internal dependencies. For Controller unit tests, the same pattern applies at one level higher: patch all 6 internal dependencies (`ScanManager`, `LftpManager`, `FileOperationManager`, `ModelBuilder`, `MemoryMonitor`, `MultiprocessingLogger`) at the `controller.controller` module level so that `Controller.__init__` receives mock instances. Integration tests exist (`test_controller.py`, 600+ lines) that test Controller with real filesystem and LFTP, but they are slow and require a remote test server. Unit tests fill the gap by testing Controller logic in isolation.

**Primary recommendation:** Patch all 6 internal dependencies at `controller.controller.ScanManager`, `controller.controller.LftpManager`, etc. to mock them during Controller construction. Use real `ControllerPersist` instances (they are lightweight, in-memory data structures) and `MagicMock` contexts via the existing `mock_context` fixture. Test the public API methods directly (start, process, exit, queue_command, get_model_files, etc.) and the refactored helper methods (which are public `_single_underscore` methods).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| unittest | stdlib | Test framework | Already used by all 700+ tests in codebase |
| unittest.mock | stdlib | MagicMock, patch, PropertyMock | Used in test_scan_manager.py, test_lftp_manager.py patterns |
| pytest | 7.x+ | Test runner and conftest fixtures | Already configured, provides mock_context fixture |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| queue | stdlib | Queue for command processing | Creating real Command objects to queue |
| common.bounded_ordered_set | internal | BoundedOrderedSet | Used by ControllerPersist (use real instances) |
| model | internal | ModelFile, ModelDiff, ModelDiffUtil, Model, IModelListener | Creating test files and diffs |
| lftp | internal | LftpJobStatus, LftpError, LftpJobStatusParserError | Creating mock LFTP statuses and errors |

### Not Needed
| Library | Why Not |
|---------|---------|
| timeout_decorator | That is for integration tests with real processes |
| tempfile/shutil | No filesystem operations in unit tests |
| threading | Controller uses threading.Lock internally, but tests call methods directly |

**Installation:** No new dependencies needed. Everything is stdlib or already in pyproject.toml.

## Architecture Patterns

### Test File Layout
```
src/python/tests/unittests/test_controller/
    __init__.py                        # Already exists
    test_controller_persist.py         # Already exists
    test_file_operation_manager.py     # Already exists
    test_lftp_manager.py               # Already exists
    test_memory_monitor.py             # Already exists
    test_scan_manager.py               # Already exists
    test_auto_queue.py                 # Already exists
    test_model_builder.py              # Already exists
    test_controller.py                 # NEW - Controller unit tests
    test_controller_job.py             # NEW - ControllerJob unit tests
```

### Pattern 1: Module-Level @patch for Internal Dependencies
**What:** Patch classes at the module where they are imported, not where they are defined.
**When to use:** All Controller tests. Controller.__init__ imports and instantiates ScanManager, LftpManager, etc.
**Example (derived from test_scan_manager.py pattern):**
```python
@patch('controller.controller.MemoryMonitor')
@patch('controller.controller.MultiprocessingLogger')
@patch('controller.controller.FileOperationManager')
@patch('controller.controller.ScanManager')
@patch('controller.controller.LftpManager')
@patch('controller.controller.ModelBuilder')
class TestControllerInit(unittest.TestCase):
    def test_init_creates_all_managers(self, mock_mb, mock_lftp, mock_sm,
                                       mock_fom, mock_mpl, mock_mm):
        persist = ControllerPersist()
        controller = Controller(context=mock_context, persist=persist)
        mock_mb.assert_called_once()
        mock_lftp.assert_called_once()
        mock_sm.assert_called_once()
        mock_fom.assert_called_once()
```

**Key detail:** The `@patch` decorator order is bottom-up: the last `@patch` is the first argument after `self`. This is a common source of confusion.

### Pattern 2: Real ControllerPersist, Mock Everything Else
**What:** Use real ControllerPersist instances instead of mocking them.
**When to use:** All Controller tests that involve tracking downloaded/extracted/stopped files.
**Why:** ControllerPersist is a lightweight in-memory data structure (BoundedOrderedSet). Mocking it would require replicating set semantics (`__contains__`, `add`, `discard`, `difference_update`). Using real instances is simpler and more reliable.
```python
def setUp(self):
    self.persist = ControllerPersist(max_tracked_files=100)
    # Pre-populate if needed:
    self.persist.downloaded_file_names.add("already_downloaded")
```

### Pattern 3: Helper Method to Create Controller with Mocks
**What:** A setUp helper that creates a Controller with all dependencies patched and returns references to the mocks.
**When to use:** Most test classes.
**Example:**
```python
class TestControllerProcess(unittest.TestCase):
    def setUp(self):
        self.mock_context = MagicMock()
        self.mock_context.logger = MagicMock()
        self.persist = ControllerPersist()

        # Start patches
        self.patcher_mb = patch('controller.controller.ModelBuilder')
        self.patcher_lftp = patch('controller.controller.LftpManager')
        self.patcher_sm = patch('controller.controller.ScanManager')
        self.patcher_fom = patch('controller.controller.FileOperationManager')
        self.patcher_mpl = patch('controller.controller.MultiprocessingLogger')
        self.patcher_mm = patch('controller.controller.MemoryMonitor')

        self.mock_model_builder_cls = self.patcher_mb.start()
        self.mock_lftp_manager_cls = self.patcher_lftp.start()
        self.mock_scan_manager_cls = self.patcher_sm.start()
        self.mock_file_op_manager_cls = self.patcher_fom.start()
        self.mock_mp_logger_cls = self.patcher_mpl.start()
        self.mock_memory_monitor_cls = self.patcher_mm.start()

        # Create mock instances
        self.mock_model_builder = self.mock_model_builder_cls.return_value
        self.mock_lftp_manager = self.mock_lftp_manager_cls.return_value
        self.mock_scan_manager = self.mock_scan_manager_cls.return_value
        self.mock_file_op_manager = self.mock_file_op_manager_cls.return_value
        self.mock_mp_logger = self.mock_mp_logger_cls.return_value
        self.mock_memory_monitor = self.mock_memory_monitor_cls.return_value

        self.controller = Controller(context=self.mock_context, persist=self.persist)

    def tearDown(self):
        self.patcher_mb.stop()
        self.patcher_lftp.stop()
        self.patcher_sm.stop()
        self.patcher_fom.stop()
        self.patcher_mpl.stop()
        self.patcher_mm.stop()
```

### Pattern 4: Testing Command Processing
**What:** Create Command objects, queue them, then call process() to execute them.
**When to use:** All command handler tests (QUEUE, STOP, EXTRACT, DELETE_LOCAL, DELETE_REMOTE).
**Example:**
```python
def test_queue_command_success(self):
    # Set up model with a file
    file = ModelFile("test_file", False)
    file.remote_size = 1000
    file.state = ModelFile.State.DEFAULT
    self.controller._Controller__model.add_file(file)

    # Create and queue command
    cmd = Controller.Command(Controller.Command.Action.QUEUE, "test_file")
    mock_callback = MagicMock(spec=Controller.Command.ICallback)
    cmd.add_callback(mock_callback)
    self.controller.queue_command(cmd)

    # Process to execute command
    self.controller._Controller__started = True
    self.controller.process()

    # Verify
    self.mock_lftp_manager.queue.assert_called_once_with("test_file", False)
    mock_callback.on_success.assert_called_once()
```

### Anti-Patterns to Avoid
- **Mocking ControllerPersist:** It is a simple data structure. Use real instances to get accurate set/containment behavior.
- **Testing through integration:** Integration tests exist but require filesystem, LFTP, and SSH. Unit tests should mock all I/O.
- **Patching at definition site:** Always patch at `controller.controller.ScanManager`, not at `controller.scan_manager.ScanManager`. The Controller imports from the former.
- **Ignoring @patch order:** The `@patch` decorator order is reversed relative to method arguments. Bottom decorator = first argument.
- **Creating real Model objects via ModelBuilder:** For command tests, directly add ModelFile objects to `controller._Controller__model`. The ModelBuilder path is tested separately in Plan 2.

## Controller Analysis

### Public Methods
| Method | Purpose | Key Dependencies |
|--------|---------|-----------------|
| `__init__(context, persist)` | Creates all managers, model, command queue | ScanManager, LftpManager, FileOperationManager, ModelBuilder, MemoryMonitor, MultiprocessingLogger |
| `start()` | Starts scan_manager, file_op_manager, mp_logger | ScanManager.start(), FileOperationManager.start(), MultiprocessingLogger.start() |
| `process()` | Main loop tick: propagate exceptions, cleanup, process commands, update model | All managers |
| `exit()` | Stops all managers | All managers |
| `get_model_files()` | Returns copy of model files (thread-safe) | Model (internal) |
| `is_file_stopped(filename)` | Check if file is in stopped set | ControllerPersist |
| `is_file_downloaded(filename)` | Check if file is in downloaded set | ControllerPersist |
| `add_model_listener(listener)` | Register model listener (thread-safe) | Model (internal) |
| `remove_model_listener(listener)` | Unregister model listener (thread-safe) | Model (internal) |
| `get_model_files_and_add_listener(listener)` | Atomic get+listen operation | Model (internal) |
| `queue_command(command)` | Add command to processing queue | Command queue (internal) |

### Refactored Helper Methods (public, single underscore)
| Method | Purpose |
|--------|---------|
| `_collect_scan_results()` | Delegates to scan_manager.pop_latest_results() |
| `_collect_lftp_status()` | Delegates to lftp_manager.status() |
| `_collect_extract_results()` | Delegates to file_op_manager.pop_extract_statuses/pop_completed |
| `_update_active_file_tracking(lftp_statuses, extract_statuses)` | Updates downloading/extracting file name lists |
| `_feed_model_builder(remote, local, active, lftp, extract_statuses, extracted_results)` | Feeds data to model builder |
| `_detect_and_track_queued(diff)` | Tracks downloading files in persist |
| `_detect_and_track_download(diff)` | Tracks downloaded files in persist |
| `_prune_extracted_files()` | Removes deleted files from extracted tracking |
| `_prune_downloaded_files(remote_scan)` | Currently a no-op (BoundedOrderedSet handles eviction) |
| `_apply_model_diff(model_diff)` | Applies diffs to internal model |
| `_build_and_apply_model(remote_scan)` | Orchestrates model build and application |
| `_update_controller_status(remote_scan, local_scan)` | Updates context.status timestamps |

### Private Methods (name-mangled)
| Method | Purpose |
|--------|---------|
| `__update_model()` | Orchestrates model update pipeline (calls helper methods) |
| `__process_commands()` | Drains command queue and dispatches to handlers |
| `__handle_queue_command(file, cmd)` | Handle QUEUE action |
| `__handle_stop_command(file, cmd)` | Handle STOP action |
| `__handle_extract_command(file, cmd)` | Handle EXTRACT action |
| `__handle_delete_command(file, cmd)` | Handle DELETE_LOCAL/DELETE_REMOTE actions |
| `__propagate_exceptions()` | Propagates errors from all managers |
| `__get_model_files()` | Internal model file list retrieval |

### Command Types and Their Error Paths
| Command | Success Condition | Error: 404 | Error: 409 | Error: 500 |
|---------|-------------------|------------|------------|------------|
| QUEUE | file.remote_size is not None | "does not exist remotely" | -- | LftpError |
| STOP | state in {DOWNLOADING, QUEUED} | -- | "not Queued or Downloading" | LftpError, LftpJobStatusParserError |
| EXTRACT | state in {DEFAULT, DOWNLOADED, EXTRACTED} AND local_size not None | "does not exist locally" | "cannot be extracted" in wrong state | -- |
| DELETE_LOCAL | state in {DEFAULT, DOWNLOADED, EXTRACTED} AND local_size not None | "does not exist locally" | "cannot be deleted" in wrong state | -- |
| DELETE_REMOTE | state in {DEFAULT, DOWNLOADED, EXTRACTED, DELETED} AND remote_size not None | "does not exist remotely" | "cannot be deleted" in wrong state | -- |
| Any | file exists in model | "not found" (404 via ModelError) | -- | -- |

### State Management
- **__started flag:** Guards `process()` - raises ControllerError if False
- **__command_queue:** threading.Queue, drained in `__process_commands()`
- **__model:** Internal Model instance with Lock protection
- **__model_lock:** threading.Lock protecting model access
- **__active_downloading_file_names:** Updated from LFTP statuses (RUNNING state)
- **ControllerPersist:** Tracks downloaded_file_names, extracted_file_names, stopped_file_names

## ControllerJob Analysis

### Class Structure
```python
class ControllerJob(Job):
    def __init__(self, context, controller, auto_queue):
        # Stores controller and auto_queue references

    def setup(self):
        self.controller.start()

    def execute(self):
        self.controller.process()
        self.auto_queue.process()

    def cleanup(self):
        self.controller.exit()
```

### Testing Strategy
ControllerJob is a thin wrapper. Tests should verify:
1. `setup()` calls `controller.start()`
2. `execute()` calls `controller.process()` then `auto_queue.process()` (in order)
3. `cleanup()` calls `controller.exit()`
4. Constructor calls `super().__init__` with correct name

Both `controller` and `auto_queue` should be plain MagicMock instances. No patching needed since they are injected.

**Estimated tests:** 4-5

## Mocking Strategy

### What to Patch (Controller tests)
| Target | Patch Path | Why |
|--------|-----------|-----|
| ScanManager | `controller.controller.ScanManager` | Created in __init__ |
| LftpManager | `controller.controller.LftpManager` | Created in __init__ |
| FileOperationManager | `controller.controller.FileOperationManager` | Created in __init__ |
| ModelBuilder | `controller.controller.ModelBuilder` | Created in __init__ |
| MemoryMonitor | `controller.controller.MemoryMonitor` | Created in __init__ |
| MultiprocessingLogger | `controller.controller.MultiprocessingLogger` | Created in __init__ |

### What NOT to Patch
| Component | Why Use Real |
|-----------|-------------|
| ControllerPersist | Lightweight BoundedOrderedSet. Mocking set semantics is harder than using real. |
| Model | Created internally. Controller.__init__ creates `Model()` directly. Since Model is imported from `model` package into `controller.controller`, you could patch `controller.controller.Model`, but for command tests it is easier to access the internal `_Controller__model` directly and add real ModelFile objects. |
| ModelFile | Value objects. Create real ones for test assertions. |
| ModelDiff/ModelDiffUtil | Used in _apply_model_diff and _build_and_apply_model. For model update pipeline tests, may need to mock ModelBuilder.build_model() return value. |
| Command/ICallback | Value objects and interface. Create real commands with MagicMock callbacks. |

### What to Mock (ControllerJob tests)
| Dependency | Mock Strategy |
|-----------|---------------|
| Controller | `MagicMock()` - injected, just verify method calls |
| AutoQueue | `MagicMock()` - injected, just verify method calls |
| Context | `MagicMock()` - passed to Job.__init__ for logger |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Controller construction with mocks | Custom Controller factory | @patch decorators on setUp/tearDown | Standard pattern from existing tests |
| ModelFile creation for tests | Complex builder helpers | Direct ModelFile("name", is_dir) with property setters | ModelFile has simple constructor and setters |
| Command callback verification | Custom callback tracker | MagicMock(spec=Controller.Command.ICallback) | MagicMock has built-in call tracking |
| ControllerPersist with test data | Mock with set semantics | Real ControllerPersist(max_tracked_files=100) | Simpler and more accurate than mocking |

**Key insight:** Controller is an orchestrator. Its unit tests verify that it calls the right methods on its dependencies in the right order with the right arguments. The individual managers already have their own unit tests. Controller tests should not re-test manager behavior.

## Common Pitfalls

### Pitfall 1: @patch Argument Order
**What goes wrong:** Mock arguments are assigned to wrong parameters because decorator order is reversed.
**Why it happens:** Python's `@patch` decorators apply bottom-up, so the last decorator maps to the first parameter after `self`.
**How to avoid:** Always read decorator stack bottom-to-top when mapping to function parameters. Or use `patch.object()` in setUp/tearDown for clarity.
**Warning signs:** Tests pass but assertions fail because wrong mock is checked.

### Pitfall 2: Accessing Controller's Private Attributes
**What goes wrong:** Cannot access `controller.__model` or `controller.__started` directly.
**Why it happens:** Python name-mangles double-underscore attributes.
**How to avoid:** Use `controller._Controller__model`, `controller._Controller__started`, etc. This is the same pattern used in the web handler tests.
**Warning signs:** AttributeError when trying to set up model state for command tests.

### Pitfall 3: ModelFile Freeze Behavior
**What goes wrong:** Adding a ModelFile to the Model freezes it, preventing further property changes.
**Why it happens:** Model.add_file() calls file.freeze() to make it immutable.
**How to avoid:** Set all ModelFile properties BEFORE adding it to the model. Once added, the file is frozen and any setter call raises ValueError.
**Warning signs:** "Cannot modify frozen ModelFile" errors in test setup.

### Pitfall 4: Model.add_file() Requires Unique Names
**What goes wrong:** ModelError when adding a file with a name that already exists.
**Why it happens:** Model enforces uniqueness - "File already exists in the model".
**How to avoid:** For update tests, use `model.update_file()` not `model.add_file()`. For fresh tests, use unique file names.
**Warning signs:** "File already exists in the model" errors.

### Pitfall 5: process() Requires __started = True
**What goes wrong:** ControllerError when calling process() without start().
**Why it happens:** `process()` checks `self.__started` and raises if False.
**How to avoid:** Either call `controller.start()` first (which calls mocked manager.start()), or set `controller._Controller__started = True` directly.
**Warning signs:** "Cannot process, controller is not started" error.

### Pitfall 6: Command Processing Depends on Model State
**What goes wrong:** Commands fail with 404 because the file is not in the model.
**Why it happens:** `__process_commands()` calls `self.__model.get_file(command.filename)` which raises ModelError if file not found.
**How to avoid:** Add ModelFile objects to `controller._Controller__model` BEFORE queueing and processing commands.
**Warning signs:** All command tests getting 404 "File not found" callbacks.

### Pitfall 7: _detect_and_track_queued Has Nuanced Conditions
**What goes wrong:** Tests for download tracking miss edge cases.
**Why it happens:** `_detect_and_track_queued` only tracks when state is DOWNLOADING AND local_size > 0 AND the file is not already tracked. It also distinguishes between ADDED and UPDATED diffs.
**How to avoid:** Test each condition independently: wrong state, zero local_size, already tracked, ADDED vs UPDATED transitions.
**Warning signs:** Persist state not matching expectations after model diff application.

## Code Examples

### Example 1: Controller Initialization Test
```python
# Patches all 6 internal dependencies at module level
@patch('controller.controller.MemoryMonitor')
@patch('controller.controller.MultiprocessingLogger')
@patch('controller.controller.FileOperationManager')
@patch('controller.controller.ScanManager')
@patch('controller.controller.LftpManager')
@patch('controller.controller.ModelBuilder')
class TestControllerInit(unittest.TestCase):
    def test_init_creates_model_builder(self, mock_mb_cls, mock_lftp_cls,
                                         mock_sm_cls, mock_fom_cls,
                                         mock_mpl_cls, mock_mm_cls):
        mock_context = MagicMock()
        mock_context.logger = MagicMock()
        persist = ControllerPersist()

        controller = Controller(context=mock_context, persist=persist)

        mock_mb_cls.assert_called_once()
        mock_mb_instance = mock_mb_cls.return_value
        mock_mb_instance.set_base_logger.assert_called_once()
        mock_mb_instance.set_downloaded_files.assert_called_once_with(
            persist.downloaded_file_names
        )
        mock_mb_instance.set_extracted_files.assert_called_once_with(
            persist.extracted_file_names
        )
```

### Example 2: Start/Exit Lifecycle Test
```python
def test_start_starts_managers(self):
    # setUp creates self.controller with all mocks
    self.controller.start()

    self.mock_scan_manager.start.assert_called_once()
    self.mock_file_op_manager.start.assert_called_once()
    self.mock_mp_logger.start.assert_called_once()

def test_exit_stops_all_managers(self):
    self.controller.start()
    self.controller.exit()

    self.mock_lftp_manager.exit.assert_called_once()
    self.mock_scan_manager.stop.assert_called_once()
    self.mock_file_op_manager.stop.assert_called_once()
    self.mock_mp_logger.stop.assert_called_once()

def test_exit_without_start_is_safe(self):
    # Should not raise, should not call stop on managers
    self.controller.exit()
    self.mock_scan_manager.stop.assert_not_called()
```

### Example 3: Command Processing - QUEUE Success
```python
def test_queue_command_calls_lftp_queue(self):
    # Add file to model
    file = ModelFile("movie.mkv", False)
    file.remote_size = 5000
    self.controller._Controller__model.add_file(file)

    # Create command with callback
    cmd = Controller.Command(Controller.Command.Action.QUEUE, "movie.mkv")
    mock_cb = MagicMock(spec=Controller.Command.ICallback)
    cmd.add_callback(mock_cb)
    self.controller.queue_command(cmd)

    # Process (must be started first)
    self.controller._Controller__started = True
    # Make process() only run __process_commands by making update_model a no-op
    self.mock_scan_manager.pop_latest_results.return_value = (None, None, None)
    self.mock_lftp_manager.status.return_value = None
    self.mock_file_op_manager.pop_extract_statuses.return_value = None
    self.mock_file_op_manager.pop_completed_extractions.return_value = []
    self.mock_model_builder.has_changes.return_value = False

    self.controller.process()

    self.mock_lftp_manager.queue.assert_called_once_with("movie.mkv", False)
    mock_cb.on_success.assert_called_once()
```

### Example 4: Command Processing - STOP Error
```python
def test_stop_command_fails_for_default_state(self):
    file = ModelFile("movie.mkv", False)
    file.remote_size = 5000
    file.state = ModelFile.State.DEFAULT
    self.controller._Controller__model.add_file(file)

    cmd = Controller.Command(Controller.Command.Action.STOP, "movie.mkv")
    mock_cb = MagicMock(spec=Controller.Command.ICallback)
    cmd.add_callback(mock_cb)
    self.controller.queue_command(cmd)

    self.controller._Controller__started = True
    # ... set up no-op model update mocks ...
    self.controller.process()

    mock_cb.on_failure.assert_called_once()
    args = mock_cb.on_failure.call_args
    self.assertIn("not Queued or Downloading", args[0][0])
    self.assertEqual(409, args[0][1])
```

### Example 5: Model Update Pipeline Test
```python
def test_update_model_feeds_remote_scan_to_builder(self):
    self.controller._Controller__started = True

    # Set up scan results
    mock_remote_scan = MagicMock()
    mock_remote_scan.files = [MagicMock()]
    mock_remote_scan.timestamp = MagicMock()
    mock_remote_scan.failed = False
    mock_remote_scan.error_message = None

    self.mock_scan_manager.pop_latest_results.return_value = (
        mock_remote_scan, None, None
    )
    self.mock_lftp_manager.status.return_value = None
    self.mock_file_op_manager.pop_extract_statuses.return_value = None
    self.mock_file_op_manager.pop_completed_extractions.return_value = []
    self.mock_model_builder.has_changes.return_value = False

    self.controller.process()

    self.mock_model_builder.set_remote_files.assert_called_once_with(
        mock_remote_scan.files
    )
```

### Example 6: _detect_and_track_queued Test
```python
def test_detect_and_track_queued_adds_downloading_with_content(self):
    new_file = ModelFile("movie.mkv", False)
    new_file.state = ModelFile.State.DOWNLOADING
    new_file.local_size = 1000

    diff = ModelDiff(
        ModelDiff.Change.ADDED,
        None,
        new_file
    )

    self.controller._detect_and_track_queued(diff)

    self.assertIn("movie.mkv", self.persist.downloaded_file_names)

def test_detect_and_track_queued_ignores_queued_state(self):
    new_file = ModelFile("movie.mkv", False)
    new_file.state = ModelFile.State.QUEUED
    new_file.local_size = 0

    diff = ModelDiff(
        ModelDiff.Change.ADDED,
        None,
        new_file
    )

    self.controller._detect_and_track_queued(diff)

    self.assertNotIn("movie.mkv", self.persist.downloaded_file_names)
```

### Example 7: ControllerJob Test
```python
class TestControllerJob(unittest.TestCase):
    def setUp(self):
        self.mock_context = MagicMock()
        self.mock_context.logger = MagicMock()
        self.mock_controller = MagicMock()
        self.mock_auto_queue = MagicMock()
        self.job = ControllerJob(
            context=self.mock_context,
            controller=self.mock_controller,
            auto_queue=self.mock_auto_queue
        )

    def test_setup_starts_controller(self):
        self.job.setup()
        self.mock_controller.start.assert_called_once()

    def test_execute_processes_controller_then_auto_queue(self):
        call_order = []
        self.mock_controller.process.side_effect = lambda: call_order.append('controller')
        self.mock_auto_queue.process.side_effect = lambda: call_order.append('auto_queue')

        self.job.execute()

        self.assertEqual(['controller', 'auto_queue'], call_order)

    def test_cleanup_exits_controller(self):
        self.job.cleanup()
        self.mock_controller.exit.assert_called_once()
```

## Plan Split Recommendation

The roadmap specifies 2 plans. The natural split follows the Controller's two main responsibilities:

### Plan 1: Controller Initialization, Lifecycle, Public API, Command Processing
- **TestControllerInit:** Constructor creates all managers with correct args (~6 tests)
- **TestControllerLifecycle:** start/exit/process guards, idempotency (~6 tests)
- **TestControllerPublicAPI:** get_model_files, is_file_stopped, is_file_downloaded, add/remove_model_listener, get_model_files_and_add_listener (~10 tests)
- **TestControllerCommandQueue:** QUEUE success/errors, STOP success/errors (~8 tests)
- **TestControllerCommandExtract:** EXTRACT success/errors (~5 tests)
- **TestControllerCommandDelete:** DELETE_LOCAL success/errors, DELETE_REMOTE success/errors (~10 tests)
- **TestControllerCommandCommon:** File not found, callback notification, multiple callbacks, persist side effects (stopped_file_names updates) (~6 tests)
- **Total:** ~51 tests
- **Why together:** These test Controller as an orchestrator/dispatcher. Command tests need model state setup but not the model update pipeline.

### Plan 2: Model Update Pipeline, Tracking/Pruning, ControllerJob
- **TestControllerUpdateModel:** __update_model orchestration, _collect_* methods (~6 tests)
- **TestControllerActiveTracking:** _update_active_file_tracking (~4 tests)
- **TestControllerFeedModelBuilder:** _feed_model_builder with various input combos (~8 tests)
- **TestControllerDetectAndTrackQueued:** _detect_and_track_queued transitions (~8 tests)
- **TestControllerDetectAndTrackDownload:** _detect_and_track_download transitions (~6 tests)
- **TestControllerPruneExtracted:** _prune_extracted_files (~4 tests)
- **TestControllerPruneDownloaded:** _prune_downloaded_files (verify no-op) (~2 tests)
- **TestControllerApplyModelDiff:** _apply_model_diff with ADDED/REMOVED/UPDATED (~6 tests)
- **TestControllerBuildAndApplyModel:** _build_and_apply_model integration (~4 tests)
- **TestControllerUpdateStatus:** _update_controller_status (~3 tests)
- **TestControllerPropagateExceptions:** __propagate_exceptions (~3 tests)
- **TestControllerJob:** ControllerJob lifecycle (~5 tests)
- **Total:** ~59 tests
- **Why together:** These test the model update pipeline and file tracking logic. They exercise the refactored helper methods and the diff/tracking system. ControllerJob is small (4-5 tests) and fits naturally here.

## Edge Cases to Test

### Initialization
- persist.set_base_logger is called
- model_builder receives downloaded_file_names and extracted_file_names from persist
- memory_monitor registers all 7 data sources (downloaded, extracted, stopped, model_files, downloaded_evictions, extracted_evictions, stopped_evictions)

### Command Processing
- Command for file not in model (404 with ModelError)
- QUEUE when file has no remote_size (404)
- QUEUE when LftpError raised (500)
- QUEUE removes file from stopped_file_names
- STOP on file in DEFAULT state (409)
- STOP when LftpError raised (500)
- STOP when LftpJobStatusParserError raised (500)
- STOP adds file to stopped_file_names
- EXTRACT on DOWNLOADING file (409)
- EXTRACT on file with no local_size (404)
- DELETE_LOCAL adds to stopped_file_names (prevents re-queue)
- DELETE_REMOTE on DELETED file (success - allowed)
- DELETE_REMOTE on DOWNLOADING file (409)
- Multiple commands in single process() call
- Command with no callbacks (no crash)
- Command with multiple callbacks (all notified)

### Model Update Pipeline
- All scan results are None (no-op)
- Only remote scan available
- Only LFTP statuses available
- Mixed data from all sources
- model_builder.has_changes() returns False (no diff applied)
- Empty model_diff (no changes to apply)
- Diff with ADDED files only
- Diff with REMOVED files only
- Diff with UPDATED files only
- Mixed diff (ADDED + REMOVED + UPDATED)

### Tracking and Pruning
- _detect_and_track_queued: DOWNLOADING with local_size=0 (not tracked)
- _detect_and_track_queued: DOWNLOADING with local_size=None (not tracked)
- _detect_and_track_queued: DOWNLOADING with local_size>0 (tracked)
- _detect_and_track_queued: already in downloaded_file_names (not re-added)
- _detect_and_track_queued: UPDATED from DEFAULT to DOWNLOADING with content (tracked)
- _detect_and_track_queued: UPDATED from DOWNLOADING to DOWNLOADING (not re-tracked if already has content)
- _detect_and_track_download: transition to DOWNLOADED (tracked)
- _detect_and_track_download: already DOWNLOADED (not re-tracked)
- _prune_extracted_files: DELETED file removed from extracted set
- _prune_extracted_files: non-DELETED file kept in extracted set
- _prune_extracted_files: file not in model kept (scans may not be available)

### Lifecycle Edge Cases
- exit() without start() (safe, no calls to managers)
- exit() called twice (second call is no-op because __started is False)
- process() without start() raises ControllerError
- start() sets __started flag

## Open Questions

1. **Model patching vs direct access**
   - What we know: Controller creates `Model()` in __init__. We could patch `controller.controller.Model` or access `controller._Controller__model` directly.
   - What's unclear: Which approach is cleaner for command tests that need model state.
   - Recommendation: Use direct access `controller._Controller__model` for command tests (add real ModelFile objects). For model update pipeline tests, the model_builder mock controls what gets built.

2. **process() test granularity**
   - What we know: `process()` calls 5 methods: __propagate_exceptions, cleanup_completed_processes, __process_commands, __update_model, log_stats_if_due.
   - What's unclear: Should we test process() as a whole or test each sub-step independently?
   - Recommendation: Test process() integration lightly (verify it calls each step), then test each step in isolation. The refactored helper methods with single-underscore names are designed for isolated testing.

## Sources

### Primary (HIGH confidence)
- `src/python/controller/controller.py` -- full source analysis (767 lines)
- `src/python/controller/controller_job.py` -- full source analysis (35 lines)
- `src/python/controller/controller_persist.py` -- full source analysis (154 lines)
- `src/python/tests/unittests/test_controller/test_scan_manager.py` -- @patch pattern reference
- `src/python/tests/unittests/test_controller/test_lftp_manager.py` -- @patch pattern reference
- `src/python/tests/unittests/test_controller/test_file_operation_manager.py` -- @patch pattern reference
- `src/python/tests/unittests/test_controller/test_model_builder.py` -- ModelFile/Model test patterns
- `src/python/tests/unittests/test_controller/test_controller_persist.py` -- ControllerPersist usage patterns
- `src/python/tests/conftest.py` -- mock_context fixture
- `src/python/model/model.py` -- Model, IModelListener interfaces
- `src/python/model/file.py` -- ModelFile, State enum
- `src/python/model/diff.py` -- ModelDiff, ModelDiffUtil
- `src/python/common/job.py` -- Job base class (for ControllerJob)
- `src/python/lftp/job_status.py` -- LftpJobStatus (for model update tests)

### Secondary (MEDIUM confidence)
- `src/python/tests/integration/test_controller/test_controller.py` -- integration test coverage reference (not a pattern to follow for unit tests)
- `.planning/phases/17-web-handler-unit-tests/17-RESEARCH.md` -- format reference

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- existing @patch pattern is clear and well-established across manager tests
- Architecture: HIGH -- Controller source code thoroughly analyzed, all methods mapped
- Mocking strategy: HIGH -- follows exact pattern from test_scan_manager.py and test_lftp_manager.py
- Pitfalls: HIGH -- identified from real code patterns (freeze behavior, name mangling, @patch order)
- Plan split: HIGH -- natural separation between command dispatch (Plan 1) and model pipeline (Plan 2)

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable codebase, no framework changes expected)
