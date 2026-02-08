# Phase 17: Web Handler Unit Tests - Research

**Researched:** 2026-02-08
**Domain:** Python unit testing for Bottle web handlers (unittest.TestCase + MagicMock)
**Confidence:** HIGH

## Summary

Phase 17 covers unit tests for 7 untested web handlers in SeedSync's Python backend. These handlers split into two natural groups: 4 request/response handlers (AutoQueueHandler, ConfigHandler, ServerHandler, StatusHandler) that implement `IHandler` and return `HTTPResponse` objects, and 3 streaming handlers (HeartbeatStreamHandler, ModelStreamHandler, StatusStreamHandler) that implement `IStreamHandler` with `setup()`/`get_value()`/`cleanup()` lifecycle methods.

The existing codebase provides a clear, well-established testing pattern. The `test_controller_handler.py` file (659 lines) demonstrates the exact approach: `unittest.TestCase` classes with `MagicMock` dependencies, testing handler methods directly (not through a test web server). Integration tests already exist for most handlers using `webtest.TestApp` (via `BaseTestWebApp`), but streaming handler integration tests are all `@unittest.skip`-ed because webtest cannot handle SSE streaming. This makes unit tests for the stream handlers particularly valuable.

**Primary recommendation:** Follow the test_controller_handler.py pattern exactly: `unittest.TestCase`, `MagicMock` for dependencies, call handler methods directly, assert on `HTTPResponse` status codes and bodies. For stream handlers, test the `IStreamHandler` lifecycle methods (`setup`, `get_value`, `cleanup`) directly without involving the WebApp streaming loop.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| unittest | stdlib | Test framework | Already used by all 700+ tests in codebase |
| unittest.mock | stdlib | MagicMock, patch | Used in test_controller_handler.py pattern |
| bottle | 0.12+ | HTTPResponse for handler returns | Production dependency |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| json | stdlib | Parse response bodies | Testing JSON responses from handlers |
| time | stdlib | Mock target for heartbeat tests | Only stream_heartbeat tests |

### Not Needed
| Library | Why Not |
|---------|---------|
| webtest/TestApp | Unit tests call handlers directly, not through HTTP |
| pytest fixtures | Existing pattern uses unittest.TestCase with setUp() |
| threading | Thread safety tested via Lock assertions, not real threads |

**Installation:** No new dependencies needed. Everything is stdlib or already in pyproject.toml.

## Architecture Patterns

### Test File Layout
```
src/python/tests/unittests/test_web/test_handler/
    __init__.py                      # Already exists (has copyright header)
    test_controller_handler.py       # Already exists (659 lines, the pattern to follow)
    test_stream_log.py               # Already exists (137 lines)
    test_auto_queue_handler.py       # NEW
    test_config_handler.py           # NEW
    test_server_handler.py           # NEW
    test_status_handler.py           # NEW
    test_stream_heartbeat.py         # NEW
    test_stream_model_handler.py     # NEW
    test_stream_status_handler.py    # NEW
```

### Pattern 1: Request/Response Handler Testing (IHandler)
**What:** Test handlers that accept HTTP requests and return HTTPResponse objects.
**When to use:** AutoQueueHandler, ConfigHandler, ServerHandler, StatusHandler.
**Example (from test_controller_handler.py):**
```python
# Source: src/python/tests/unittests/test_web/test_handler/test_controller_handler.py
class TestControllerHandlerBulkCommand(unittest.TestCase):
    def setUp(self):
        self.mock_controller = MagicMock(spec=Controller)
        self.handler = ControllerHandler(self.mock_controller)

    def test_missing_body_returns_400(self):
        response = self._call_bulk_handler(None)
        self.assertEqual(400, response.status_code)
        body = json.loads(response.body)
        self.assertIn("error", body)
```

**Key aspects:**
1. Create handler with mocked dependency in `setUp()`
2. Call the handler method directly (using name mangling for private methods: `handler._ClassName__method_name()`)
3. Assert on `HTTPResponse.status_code` (200, 400, 404, 409)
4. Assert on `HTTPResponse.body` (string content or JSON)

### Pattern 2: Stream Handler Testing (IStreamHandler)
**What:** Test streaming handlers that implement setup/get_value/cleanup lifecycle.
**When to use:** HeartbeatStreamHandler, ModelStreamHandler, StatusStreamHandler.
**Example (derived from stream_log tests and handler source):**
```python
class TestHeartbeatStreamHandler(unittest.TestCase):
    def test_first_get_value_returns_heartbeat(self):
        handler = HeartbeatStreamHandler()
        handler.setup()
        result = handler.get_value()
        self.assertIsNotNone(result)
        self.assertIn("event: ping", result)

    def test_cleanup_is_noop(self):
        handler = HeartbeatStreamHandler()
        handler.setup()
        handler.cleanup()  # Should not raise
```

**Key aspects:**
1. Instantiate stream handler directly with mocked dependencies
2. Call `setup()` before `get_value()`
3. Test `get_value()` returns correctly formatted SSE strings or None
4. Test `cleanup()` removes listeners/state properly
5. No WebApp streaming loop involvement

### Pattern 3: Name Mangling for Private Methods
**What:** Python handler methods are private (double underscore prefix). Tests access them via name mangling.
**When to use:** All IHandler subclass tests.
**Example:**
```python
# Handler defines: def __handle_get_autoqueue(self)
# Test calls: handler._AutoQueueHandler__handle_get_autoqueue()
```

### Anti-Patterns to Avoid
- **Using webtest.TestApp for unit tests:** Integration tests use TestApp. Unit tests call handler methods directly. The integration tests already exist and are the wrong model for this phase.
- **Testing serialization logic:** Serializers have their own test files in `test_web/test_serialize/`. Handler tests should mock serializers or just verify that the handler calls them correctly.
- **Real threading in tests:** ServerHandler uses a Lock, but unit tests should verify the lock-protected state, not create actual threads. Direct method calls suffice.
- **Testing WebApp routing:** Route registration is an integration concern. Unit tests verify handler behavior, not URL matching.

## Handler Analysis

### Group 1: Request/Response Handlers (Simpler - Plan 1)

#### AutoQueueHandler
**File:** `src/python/web/handler/auto_queue.py` (53 lines)
**Constructor:** `__init__(self, auto_queue_persist: AutoQueuePersist)`
**Routes:**
| Route | Method | Parameters | Response Codes |
|-------|--------|------------|----------------|
| `/server/autoqueue/get` | GET | none | 200 (JSON array of patterns) |
| `/server/autoqueue/add/<pattern>` | GET | pattern (URL-encoded) | 200 (success), 400 (ValueError), 409 (duplicate) |
| `/server/autoqueue/remove/<pattern>` | GET | pattern (URL-encoded) | 200 (success), 404 (not found) |

**Dependencies to mock:** `AutoQueuePersist` (`.patterns` property, `.add_pattern()`, `.remove_pattern()`)
**Key behaviors to test:**
- GET returns sorted patterns as JSON via `SerializeAutoQueue.patterns()`
- ADD URL-decodes the pattern (double-encoded), creates `AutoQueuePattern`, checks existence, calls `add_pattern()`
- ADD returns 409 for duplicate pattern
- ADD returns 400 when `add_pattern()` raises `ValueError` (blank pattern)
- REMOVE URL-decodes, checks existence, calls `remove_pattern()`
- REMOVE returns 404 for non-existing pattern

**Estimated tests:** ~10-12

#### ConfigHandler
**File:** `src/python/web/handler/config.py` (38 lines)
**Constructor:** `__init__(self, config: Config)`
**Routes:**
| Route | Method | Parameters | Response Codes |
|-------|--------|------------|----------------|
| `/server/config/get` | GET | none | 200 (JSON config) |
| `/server/config/set/<section>/<key>/<value>` | GET | section, key, value (URL-encoded) | 200 (success), 400 (ConfigError), 404 (missing section/key) |

**Dependencies to mock:** `Config` (`.has_section()`, section access via `getattr()`, inner config `.has_property()`, `.set_property()`)
**Key behaviors to test:**
- GET serializes config via `SerializeConfig.config()`
- SET URL-decodes value (double-encoded)
- SET returns 404 for missing section
- SET returns 404 for missing key (section exists, key doesn't)
- SET returns 400 for `ConfigError` (bad value conversion)
- SET returns 200 and applies value on success

**Estimated tests:** ~8-10

#### ServerHandler
**File:** `src/python/web/handler/server.py` (39 lines)
**Constructor:** `__init__(self, context: Context)`
**Routes:**
| Route | Method | Parameters | Response Codes |
|-------|--------|------------|----------------|
| `/server/command/restart` | GET | none | 200 ("Requested restart") |

**Dependencies to mock:** `Context` (only `.logger` used)
**Key behaviors to test:**
- Initial state: `is_restart_requested()` returns False
- After calling restart handler: `is_restart_requested()` returns True
- Calling restart handler multiple times: still True (idempotent)
- Thread safety: Lock protects `__request_restart` (verify via method calls, not real threads)
- Restart handler returns HTTPResponse with "Requested restart" body

**Estimated tests:** ~5-6

#### StatusHandler
**File:** `src/python/web/handler/status.py` (20 lines)
**Constructor:** `__init__(self, status: Status)`
**Routes:**
| Route | Method | Parameters | Response Codes |
|-------|--------|------------|----------------|
| `/server/status` | GET | none | 200 (JSON status) |

**Dependencies to mock:** `Status` (passed to `SerializeStatusJson.status()`)
**Key behaviors to test:**
- GET serializes status via `SerializeStatusJson.status()` and wraps in HTTPResponse
- Response body contains JSON (verify it's valid)

**Estimated tests:** ~3-4

### Group 2: Stream Handlers (Plan 2)

#### HeartbeatStreamHandler
**File:** `src/python/web/handler/stream_heartbeat.py` (62 lines)
**Constructor:** `__init__(self)` (no dependencies!)
**IStreamHandler lifecycle:**
- `setup()`: Resets `_last_heartbeat_time` to None
- `get_value()`: Returns SSE ping if interval elapsed, else None
- `cleanup()`: No-op

**Key behaviors to test:**
- **Initial heartbeat:** First `get_value()` after `setup()` returns a ping immediately (last_heartbeat_time is None)
- **Interval enforcement:** Second `get_value()` returns None if interval hasn't elapsed
- **Interval elapsed:** After HEARTBEAT_INTERVAL_S passes, returns ping again
- **SSE format:** Returned string contains `event: ping\ndata: <timestamp>\n\n`
- **Mock time.time():** Required to control timing without real delays
- **SerializeHeartbeat internal class:** Can test separately or through handler

**Estimated tests:** ~8-10

**CRITICAL: This handler is completely untested (per roadmap). No integration tests exist for it either.**

#### ModelStreamHandler
**File:** `src/python/web/handler/stream_model.py` (75 lines)
**Constructor:** `__init__(self, controller: Controller)`
**IStreamHandler lifecycle:**
- `setup()`: Calls `controller.get_model_files_and_add_listener(self.model_listener)`, stores initial files
- `get_value()`: First sends initial files one at a time as ADDED events, then polls listener queue for real-time updates
- `cleanup()`: Calls `controller.remove_model_listener(self.model_listener)`

**Contains inner class:** `WebResponseModelListener(IModelListener, StreamQueue[SerializeModel.UpdateEvent])`
- `file_added()`: Creates UpdateEvent(ADDED) and puts on queue
- `file_removed()`: Creates UpdateEvent(REMOVED) and puts on queue
- `file_updated()`: Creates UpdateEvent(UPDATED) and puts on queue

**Dependencies to mock:** `Controller` (`.get_model_files_and_add_listener()`, `.remove_model_listener()`)
**Key behaviors to test:**
- **Setup registers listener:** `setup()` calls `controller.get_model_files_and_add_listener()`
- **Initial files delivery:** `get_value()` returns initial files one at a time as ADDED events
- **Initial files exhaustion:** After all initial files sent, `get_value()` reads from listener queue
- **Real-time events:** Listener's `file_added/removed/updated` put events on queue, `get_value()` retrieves them
- **No events available:** `get_value()` returns None when queue empty and initial files exhausted
- **Cleanup removes listener:** `cleanup()` calls `controller.remove_model_listener()`
- **WebResponseModelListener:** Test file_added/removed/updated create correct UpdateEvent types

**Estimated tests:** ~12-15

**NOTE:** Integration tests are `@unittest.skip`-ed because webtest doesn't support SSE. This makes unit tests the only coverage path.

#### StatusStreamHandler
**File:** `src/python/web/handler/stream_status.py` (51 lines)
**Constructor:** `__init__(self, status: Status)`
**IStreamHandler lifecycle:**
- `setup()`: Calls `status.add_listener(self.status_listener)`
- `get_value()`: On first run, returns `status.copy()` serialized. After that, reads from listener queue.
- `cleanup()`: Calls `status.remove_listener(self.status_listener)`

**Contains inner class:** `StatusListener(IStatusListener, StreamQueue[Status])`
- `notify()`: Copies status and puts on queue

**Dependencies to mock:** `Status` (`.add_listener()`, `.remove_listener()`, `.copy()`)
**Key behaviors to test:**
- **Setup registers listener:** `setup()` calls `status.add_listener()`
- **First run:** First `get_value()` returns serialized current status copy
- **Subsequent calls:** `get_value()` reads from listener queue (returns events or None)
- **StatusListener notification:** When `notify()` is called, status copy is queued
- **Cleanup removes listener:** `cleanup()` calls `status.remove_listener()`

**Estimated tests:** ~8-10

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE format testing | Custom SSE parser | String assertions on `event:` and `data:` lines | SSE format is simple (2-3 lines), parser is overkill |
| Mock Config sections | Custom Config mock hierarchy | MagicMock with `has_section`/`has_property`/`set_property` | MagicMock auto-creates attributes as needed |
| Test web framework | Custom request/response simulator | Direct method calls returning HTTPResponse | Handlers return plain HTTPResponse objects, no framework needed |
| AutoQueuePersist mock | Real AutoQueuePersist with test data | MagicMock(spec=AutoQueuePersist) | Unit tests should isolate handler logic |

**Key insight:** Unlike the integration tests that need TestApp/webtest to simulate HTTP, unit tests call handler methods directly. The handlers return `bottle.HTTPResponse` objects with `.status_code` and `.body` attributes that are trivially assertable. Stream handlers return plain strings from `get_value()`. No web framework simulation needed at all.

## Common Pitfalls

### Pitfall 1: Name Mangling Access
**What goes wrong:** Handler methods are private (`__handle_foo`), and attempting `handler.__handle_foo()` raises AttributeError.
**Why it happens:** Python name-mangles double-underscore attributes to `_ClassName__attribute`.
**How to avoid:** Use `handler._AutoQueueHandler__handle_get_autoqueue()`.
**Warning signs:** AttributeError in test setup.

### Pitfall 2: URL Decoding in Handler Tests
**What goes wrong:** Passing already-decoded strings to handlers that call `unquote()`.
**Why it happens:** In production, Bottle decodes the URL once, and the handler calls `unquote()` a second time (double encoding). In unit tests, you pass strings directly.
**How to avoid:** Pass URL-encoded strings to handlers if testing the decode path. Or pass the already-decoded value and verify the handler's decode output. The handler uses `unquote()` on its input, so pass `quote("actual value")` to the handler method.
**Warning signs:** Handler tests failing because patterns contain `%20` instead of spaces.

### Pitfall 3: Testing Private Method Return Values
**What goes wrong:** Forgetting that `__handle_*` methods return `HTTPResponse` objects with `.status_code` as int and `.body` as string.
**Why it happens:** Bottle's HTTPResponse API is straightforward but has some subtleties.
**How to avoid:** Always check both `response.status_code` (int) and `response.body` (string). The `status` property returns a string like "200 OK", while `status_code` returns 200.
**Warning signs:** Comparing status to string "200" instead of int 200.

### Pitfall 4: MagicMock spec= vs no spec
**What goes wrong:** Tests pass even when calling non-existent methods on mocks.
**Why it happens:** Without `spec=`, MagicMock silently creates attributes for any access.
**How to avoid:** Use `MagicMock(spec=ClassName)` for dependency mocks where possible. The controller_handler tests use `MagicMock(spec=Controller)`. However, for Status which has dynamic properties, spec may be impractical -- use plain MagicMock.
**Warning signs:** Tests pass but miss bugs where handler calls wrong method name.

### Pitfall 5: time.time() Mocking for Heartbeat
**What goes wrong:** Tests using real time.time() either need `time.sleep()` (slow) or have race conditions.
**Why it happens:** HeartbeatStreamHandler calls `time.time()` to determine heartbeat intervals.
**How to avoid:** Use `@patch('web.handler.stream_heartbeat.time')` to mock the time module, exactly like `test_stream_log.py` mocks `@patch("web.handler.stream_log.time")`.
**Warning signs:** Flaky tests with heartbeat timing.

### Pitfall 6: Status.copy() Usage in Stream Tests
**What goes wrong:** Tests fail because Status objects have complex internal state with dynamic properties.
**Why it happens:** StatusStreamHandler calls `status.copy()` which creates a deep copy with StatusComponent properties.
**How to avoid:** For unit tests, mock Status with MagicMock and have `.copy()` return a MagicMock. The serializer tests already verify correct serialization of Status objects separately.
**Warning signs:** Complex test setup trying to create real Status objects.

## Code Examples

### Example 1: Testing IHandler Private Methods (established pattern)
```python
# Source: src/python/tests/unittests/test_web/test_handler/test_controller_handler.py
class TestControllerHandlerBulkCommand(unittest.TestCase):
    def setUp(self):
        self.mock_controller = MagicMock(spec=Controller)
        self.handler = ControllerHandler(self.mock_controller)

    def _call_bulk_handler(self, json_body):
        with patch('web.handler.controller.request') as mock_request:
            mock_request.json = json_body
            return self.handler._ControllerHandler__handle_bulk_command()
```

### Example 2: AutoQueueHandler Test Structure
```python
class TestAutoQueueHandler(unittest.TestCase):
    def setUp(self):
        self.mock_persist = MagicMock(spec=AutoQueuePersist)
        self.handler = AutoQueueHandler(self.mock_persist)

    def test_get_returns_sorted_patterns(self):
        pattern_a = AutoQueuePattern("alpha")
        pattern_b = AutoQueuePattern("beta")
        self.mock_persist.patterns = {pattern_b, pattern_a}

        response = self.handler._AutoQueueHandler__handle_get_autoqueue()

        self.assertEqual(200, response.status_code)
        # Body is JSON from SerializeAutoQueue.patterns()

    def test_add_existing_returns_409(self):
        existing = AutoQueuePattern("test")
        self.mock_persist.patterns = {existing}

        response = self.handler._AutoQueueHandler__handle_add_autoqueue(quote("test"))

        self.assertEqual(409, response.status_code)
```

### Example 3: Heartbeat Stream Handler with time.time() Mocking
```python
# Source pattern: src/python/tests/unittests/test_web/test_handler/test_stream_log.py
class TestHeartbeatStreamHandler(unittest.TestCase):
    @patch("web.handler.stream_heartbeat.time")
    def test_initial_heartbeat_sent_immediately(self, mock_time_module):
        mock_time_module.time.return_value = 1000.0
        handler = HeartbeatStreamHandler()
        handler.setup()

        result = handler.get_value()

        self.assertIsNotNone(result)
        self.assertIn("event: ping", result)
        self.assertIn("1000.0", result)

    @patch("web.handler.stream_heartbeat.time")
    def test_no_heartbeat_before_interval(self, mock_time_module):
        mock_time_module.time.return_value = 1000.0
        handler = HeartbeatStreamHandler()
        handler.setup()
        handler.get_value()  # consume initial heartbeat

        mock_time_module.time.return_value = 1005.0  # Only 5s, interval is 15s
        result = handler.get_value()

        self.assertIsNone(result)
```

### Example 4: ModelStreamHandler with Initial Files
```python
class TestModelStreamHandler(unittest.TestCase):
    def setUp(self):
        self.mock_controller = MagicMock(spec=Controller)
        self.handler = ModelStreamHandler(self.mock_controller)

    def test_setup_registers_listener(self):
        self.mock_controller.get_model_files_and_add_listener.return_value = []
        self.handler.setup()
        self.mock_controller.get_model_files_and_add_listener.assert_called_once()

    def test_initial_files_sent_one_at_a_time(self):
        file1 = ModelFile("a", False)
        file2 = ModelFile("b", True)
        self.mock_controller.get_model_files_and_add_listener.return_value = [file1, file2]
        self.handler.setup()

        result1 = self.handler.get_value()
        self.assertIsNotNone(result1)
        self.assertIn("model-added", result1)

        result2 = self.handler.get_value()
        self.assertIsNotNone(result2)
        self.assertIn("model-added", result2)

        result3 = self.handler.get_value()
        self.assertIsNone(result3)  # No more initial files, no queued events

    def test_cleanup_removes_listener(self):
        self.mock_controller.get_model_files_and_add_listener.return_value = []
        self.handler.setup()
        self.handler.cleanup()
        self.mock_controller.remove_model_listener.assert_called_once()
```

### Example 5: StatusStreamHandler with Listener
```python
class TestStatusStreamHandler(unittest.TestCase):
    def setUp(self):
        self.mock_status = MagicMock()
        self.handler = StatusStreamHandler(self.mock_status)

    def test_first_get_value_returns_current_status(self):
        mock_status_copy = MagicMock()
        self.mock_status.copy.return_value = mock_status_copy
        self.handler.setup()

        result = self.handler.get_value()

        self.assertIsNotNone(result)
        self.mock_status.copy.assert_called_once()
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Integration-only web handler testing | Unit tests + integration tests | Phase 17 (this phase) | Stream handlers had ZERO test coverage because integration tests were skipped |
| webtest.TestApp for SSE streams | Direct IStreamHandler method testing | Phase 17 (this phase) | All 3 stream handlers can finally be tested |
| No heartbeat handler testing | Unit tests for HeartbeatStreamHandler | Phase 17 (this phase) | New handler added during modernization, never tested |

**Deprecated/outdated:**
- The integration test approach for streaming handlers (using Timer-based server stops with TestApp) is `@unittest.skip`-ed and should not be used as a pattern. Unit tests that call `setup()`/`get_value()`/`cleanup()` directly are the correct approach.

## Plan Split Recommendation

The roadmap specifies 2 plans. The natural split:

### Plan 1: Request/Response Handlers (simpler)
- `test_auto_queue_handler.py` (~10-12 tests)
- `test_config_handler.py` (~8-10 tests)
- `test_server_handler.py` (~5-6 tests)
- `test_status_handler.py` (~3-4 tests)
- **Total:** ~26-32 tests
- **Why together:** All follow the same IHandler pattern. Simple request-in/response-out testing. No time mocking or complex lifecycle.

### Plan 2: Stream Handlers
- `test_stream_heartbeat.py` (~8-10 tests, includes SerializeHeartbeat)
- `test_stream_model_handler.py` (~12-15 tests, includes WebResponseModelListener)
- `test_stream_status_handler.py` (~8-10 tests, includes StatusListener)
- **Total:** ~28-35 tests
- **Why together:** All follow the IStreamHandler lifecycle pattern. Require different testing approach (setup/get_value/cleanup). Some need time mocking or listener event simulation.

## Mocking Strategy Summary

| Handler | Dependency | Mock Strategy |
|---------|-----------|---------------|
| AutoQueueHandler | AutoQueuePersist | `MagicMock(spec=AutoQueuePersist)`. Set `.patterns` as set property. Mock `add_pattern()` and `remove_pattern()`. |
| ConfigHandler | Config | `MagicMock()` (no spec -- Config has dynamic sections). Mock `has_section()`, `getattr()` returns mock inner config with `has_property()`, `set_property()`. |
| ServerHandler | Context | `MagicMock()` -- only `.logger` used for child logger creation. |
| StatusHandler | Status | `MagicMock()` -- passed to `SerializeStatusJson.status()`. |
| HeartbeatStreamHandler | None | No mocks needed for constructor. Mock `time.time()` at module level. |
| ModelStreamHandler | Controller | `MagicMock(spec=Controller)`. Mock `get_model_files_and_add_listener()` return value and `remove_model_listener()`. |
| StatusStreamHandler | Status | `MagicMock()`. Mock `add_listener()`, `remove_listener()`, `copy()`. |

## Edge Cases to Test

### AutoQueueHandler
- Patterns with special characters (spaces, slashes, quotes, percent signs)
- URL double-encoding/decoding behavior
- Empty pattern set for GET
- `ValueError` from `AutoQueuePersist.add_pattern()` (blank pattern)

### ConfigHandler
- Config value with slashes (route regex allows this: `<value:re:.+>`)
- Chain of checks: section exists -> key exists -> value valid
- `ConfigError` propagation from `set_property()`

### ServerHandler
- Multiple restart requests (idempotent)
- `is_restart_requested()` before any request
- Logger child creation in constructor

### HeartbeatStreamHandler
- Exact boundary: timestamp exactly at HEARTBEAT_INTERVAL_S
- Multiple heartbeat cycles
- Setup resets state (can be reused)

### ModelStreamHandler
- Empty initial model (no files)
- Large initial model (multiple files delivered one at a time)
- Mixed initial files and real-time events
- Cleanup before any events received
- Cleanup with no listener set (guard condition: `if self.model_listener`)

### StatusStreamHandler
- First run flag reset
- Multiple status updates queued
- Cleanup before first get_value
- StatusListener.notify() creates proper status copy

## Open Questions

1. **URL decoding in unit tests**
   - What we know: Handlers call `unquote(pattern)` on their string parameter. In production, Bottle decodes once from the URL, so the value arrives single-encoded. The handler does the second decode.
   - What's unclear: Should unit tests pass single-encoded strings (matching what Bottle would provide) or raw strings?
   - Recommendation: Pass single-encoded strings via `quote("actual value")` to test the decode path. Also test with already-decoded strings to verify behavior.

2. **SerializeAutoQueue/SerializeConfig mocking**
   - What we know: Handlers call serializers directly (static methods). The serializer tests exist separately.
   - What's unclear: Should handler tests mock the serializers or let them run?
   - Recommendation: Let serializers run -- they're simple, well-tested, and mocking static methods adds complexity. Just verify the response body is valid JSON.

## Sources

### Primary (HIGH confidence)
- `src/python/tests/unittests/test_web/test_handler/test_controller_handler.py` -- established unit test pattern (659 lines, 40+ tests)
- `src/python/tests/unittests/test_web/test_handler/test_stream_log.py` -- time.time() mocking pattern, CachedQueueLogHandler tests
- `src/python/tests/unittests/test_web/test_stream_queue.py` -- StreamQueue test pattern
- All 7 handler source files -- read in full for API analysis
- `src/python/web/web_app.py` -- IHandler and IStreamHandler interfaces
- `src/python/web/web_app_builder.py` -- handler construction and registration
- `src/python/tests/integration/test_web/` -- integration test patterns (what NOT to do for unit tests)
- `src/python/tests/conftest.py` -- available fixtures (test_logger, mock_context)
- `.planning/milestones/v1.5-ROADMAP.md` -- phase definition and constraints

### Secondary (MEDIUM confidence)
- `src/python/controller/auto_queue.py` -- AutoQueuePersist and AutoQueuePattern interfaces
- `src/python/common/status.py` -- Status, IStatusListener, StatusComponent interfaces
- `src/python/common/config.py` -- Config, ConfigError, has_section/has_property/set_property
- `src/python/model/model.py` and `src/python/model/file.py` -- IModelListener, ModelFile interfaces

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- existing pattern is clear and well-established across 700+ tests
- Architecture: HIGH -- handler source code is simple (20-75 lines each), APIs are straightforward
- Pitfalls: HIGH -- identified from real code patterns in existing tests and handler implementations
- Plan split: HIGH -- natural IHandler vs IStreamHandler grouping matches roadmap spec of 2 plans

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (stable codebase, no framework changes expected)
