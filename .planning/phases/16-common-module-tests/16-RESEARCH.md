# Phase 16: Common Module Tests - Research

**Researched:** 2026-02-08
**Domain:** Python unit testing for 5 common module files
**Confidence:** HIGH

## Summary

This phase covers writing unit tests for the 5 untested files in `src/python/common/`: `constants.py`, `context.py`, `error.py`, `localization.py`, and `types.py`. All 5 modules are small (11-70 lines each) with well-defined, narrowly-scoped APIs. The test directory `src/python/tests/unittests/test_common/` already exists with an `__init__.py` and 7 existing test files (test_config, test_persist, test_status, test_job, test_app_process, test_multiprocessing_logger, test_bounded_ordered_set) that establish clear conventions.

The existing codebase uses `unittest.TestCase` exclusively -- every single test file follows this pattern. No pytest-style function tests exist. The conftest.py from Phase 15 provides optional fixtures for new tests, but all existing tests predate it and use `setUp()`/`tearDown()`. Tests import from `common` directly (the `pythonpath = ["."]` in pyproject.toml makes this work).

**Primary recommendation:** Write 5 new test files using the established `unittest.TestCase` pattern, one per module. These are straightforward tests with no mocking complexity -- the modules under test have minimal dependencies.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| unittest | stdlib | Test framework | Every existing test in the project uses unittest.TestCase |
| pytest | ^7.4.4 | Test runner | Used as runner (via `poetry run pytest`), but tests are written as unittest.TestCase classes |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| unittest.mock (MagicMock) | stdlib | Mocking | Used in test_status.py, test_job.py; needed for Context tests (mock logger) |
| logging | stdlib | Logger creation | Needed for Context tests (Context requires a logger) |
| copy | stdlib | Copy testing | Needed for Context.create_child_context tests |

### Not Needed for This Phase
| Library | Why Not |
|---------|---------|
| testfixtures | No log capture needed; modules are too simple |
| conftest.py fixtures | Constants/error/localization/types need no fixtures; context tests can create their own mocks more simply |
| tempfile/shutil | No file I/O in these modules |

## Architecture Patterns

### Test File Organization
```
src/python/tests/unittests/test_common/
    __init__.py                       # EXISTS (empty)
    test_constants.py                 # NEW - tests for constants.py
    test_context.py                   # NEW - tests for context.py
    test_error.py                     # NEW - tests for error.py
    test_localization.py              # NEW - tests for localization.py
    test_types.py                     # NEW - tests for types.py
    test_config.py                    # EXISTS
    test_persist.py                   # EXISTS
    test_status.py                    # EXISTS
    test_job.py                       # EXISTS
    test_app_process.py               # EXISTS
    test_bounded_ordered_set.py       # EXISTS
    test_multiprocessing_logger.py    # EXISTS
```

### Pattern: unittest.TestCase with direct imports
**What:** Every test in the codebase is a class inheriting from `unittest.TestCase`. Imports come from `common` directly.
**Why:** This is the established convention -- 100% of existing tests follow it.
**Example (from test_persist.py):**
```python
import unittest
from common import overrides, Persist, AppError, Localization

class TestPersist(unittest.TestCase):
    @overrides(unittest.TestCase)
    def setUp(self):
        ...
    def test_from_file(self):
        ...
```

### Pattern: @overrides decorator on setUp/tearDown
**What:** Existing tests that override `setUp` and `tearDown` use `@overrides(unittest.TestCase)` decorator.
**Example (from test_persist.py):**
```python
@overrides(unittest.TestCase)
def setUp(self):
    self.temp_dir = tempfile.mkdtemp(prefix="test_persist")
```
**Note:** This is the project's own `overrides` decorator from `common.types`, not the third-party `overrides` package. It verifies the method exists in the parent class.

### Pattern: Copyright header
**What:** Every file starts with `# Copyright 2017, Inderpreet Singh, All rights reserved.`

### Pattern: Test method naming
**What:** Test methods use `test_` prefix with descriptive snake_case names.
**Examples:** `test_property_values`, `test_from_file_non_existing`, `test_copy_doesnt_copy_listeners`

### Anti-Patterns to Avoid
- **Don't use pytest-style functions:** All existing tests are unittest.TestCase classes. Stay consistent.
- **Don't import via relative paths:** Always use `from common import X` or `from common.module import Y`.
- **Don't skip the copyright header:** Every file has it.

## Module-by-Module Analysis

### 1. constants.py (17 lines)

**Source:** `src/python/common/constants.py`

**Public API:**
```python
class Constants:
    SERVICE_NAME = "seedsync"                           # str
    MAIN_THREAD_SLEEP_INTERVAL_IN_SECS = 0.5           # float
    MAX_LOG_SIZE_IN_BYTES = 10*1024*1024                # int (10 MB)
    LOG_BACKUP_COUNT = 10                               # int
    WEB_ACCESS_LOG_NAME = 'web_access'                  # str
    MIN_PERSIST_TO_FILE_INTERVAL_IN_SECS = 30           # int
    JSON_PRETTY_PRINT_INDENT = 4                        # int
    LFTP_TEMP_FILE_SUFFIX = ".lftp"                     # str
```

**What to test:**
- All constant values are present and correct (regression tests)
- Value types are correct (str vs int vs float)
- The computed value `MAX_LOG_SIZE_IN_BYTES` equals `10485760`
- Constants class is a simple class (not instantiated as singleton, etc.)

**Edge cases:** None -- these are just static class attributes.

**Dependencies:** None

**Test complexity:** Trivial. ~10 assertions.

### 2. context.py (70 lines)

**Source:** `src/python/common/context.py`

**Public API:**

```python
class Args:
    def __init__(self):
        self.local_path_to_scanfs = None
        self.html_path = None
        self.debug = None
        self.exit = None
    def as_dict(self) -> dict  # Returns OrderedDict with str representations

class Context:
    def __init__(self, logger, web_access_logger, config, args, status):
        # Stores all 5 parameters as attributes
    def create_child_context(self, context_name: str) -> "Context"
        # shallow copy with child logger
    def print_to_log(self):
        # Logs config and args to debug logger
```

**What to test:**

For `Args`:
- Default init values are all `None`
- `as_dict()` returns OrderedDict with correct keys: `local_path_to_scanfs`, `html_path`, `debug`, `exit`
- `as_dict()` converts values to strings via `str()`
- `as_dict()` handles `None` values (will produce `"None"` strings)

For `Context`:
- Constructor stores all 5 parameters as attributes
- `create_child_context()` returns a new Context (different object)
- `create_child_context()` has a child logger (logger.getChild called)
- `create_child_context()` shares the same config, args, status (shallow copy via `copy.copy`)
- `create_child_context()` shares the same web_access_logger
- `print_to_log()` calls logger.debug with config and args info

**Dependencies:** `Config` (from common.config), `Status` (from common.status) -- use MagicMock for these.

**Edge cases:**
- `as_dict()` on Args with None values: `str(None)` produces `"None"` -- test this behavior
- `create_child_context()` shallow copy means modifying shared objects (config, args) affects both parent and child

**Test complexity:** Moderate. Needs MagicMock for logger, config, args, status. ~15-20 assertions.

### 3. error.py (24 lines)

**Source:** `src/python/common/error.py`

**Public API:**
```python
class AppError(Exception):        # Base application error
class ServiceExit(AppError):      # Clean exit signal
class ServiceRestart(AppError):   # Restart signal
```

**What to test:**
- `AppError` is a subclass of `Exception`
- `ServiceExit` is a subclass of `AppError` (and transitively of `Exception`)
- `ServiceRestart` is a subclass of `AppError` (and transitively of `Exception`)
- All can be raised and caught
- All can be raised with a message
- Catching `AppError` also catches `ServiceExit` and `ServiceRestart`
- Catching `Exception` catches all three
- `ServiceExit` is NOT a `ServiceRestart` and vice versa

**Dependencies:** None

**Edge cases:**
- Exception hierarchy matters because code uses `except AppError` to catch all app-level errors

**Test complexity:** Trivial. ~15 assertions.

### 4. localization.py (11 lines)

**Source:** `src/python/common/localization.py`

**Public API:**
```python
class Localization:
    class Error:
        MISSING_FILE = "The file '{}' doesn't exist."
        REMOTE_SERVER_SCAN = "An error occurred while scanning the remote server: '{}'."
        REMOTE_SERVER_INSTALL = "An error occurred while installing scanner script to remote server: '{}'."
        LOCAL_SERVER_SCAN = "An error occurred while scanning the local system."
        SETTINGS_INCOMPLETE = "The settings are not fully configured."
```

**What to test:**
- All error strings are present
- Strings with `{}` format placeholders produce correct messages when `.format()` is called
- `MISSING_FILE.format("/some/path")` produces expected output
- `REMOTE_SERVER_SCAN.format("connection refused")` produces expected output
- `REMOTE_SERVER_INSTALL.format("permission denied")` produces expected output
- `LOCAL_SERVER_SCAN` and `SETTINGS_INCOMPLETE` have no format placeholders (are plain strings)

**Dependencies:** None

**Edge cases:**
- Verify the format strings actually have `{}` placeholders where expected
- `MISSING_FILE` is used in `persist.py` line 48: `Localization.Error.MISSING_FILE.format(file_path)` -- already tested via test_persist.py `test_from_file_non_existing`

**Test complexity:** Trivial. ~10 assertions.

### 5. types.py (19 lines)

**Source:** `src/python/common/types.py`

**Public API:**
```python
def overrides(interface_class):
    """Decorator to check that decorated method is a valid override"""
    # assert(inspect.isclass(interface_class))  -- raises AssertionError if not a class
    # Returns overrider function that asserts method.__name__ in dir(interface_class)
```

**What to test:**

Success cases:
- Decorating a method that exists in parent class succeeds
- The decorated method is still callable and works normally
- Works with `unittest.TestCase` (common usage pattern in codebase)
- Works with ABC abstract methods

Failure cases:
- Passing a non-class (e.g., string, int, function) raises `AssertionError` with "Overrides parameter must be a class type"
- Decorating a method that does NOT exist in parent class raises `AssertionError` with "Method does not override super class"

**Dependencies:** `inspect` (stdlib, used internally)

**Edge cases:**
- The decorator uses `assert` statements, so behavior depends on Python's `-O` flag (assertions disabled in optimized mode). This is a known design choice in the project.
- `dir(interface_class)` includes inherited methods, so overriding a grandparent method works too
- The decorator checks `method.__name__ in dir(interface_class)` -- it checks by name, not signature

**Test complexity:** Moderate. ~10-12 assertions. Needs helper classes for testing inheritance.

**Widespread usage:** The `overrides` decorator is used throughout the codebase (30+ usages) -- status.py, app_process.py, config.py, all integration tests, web handlers. This makes it important to test thoroughly despite its small size.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mock logger | Custom logger subclass | `logging.getLogger("test")` or `MagicMock()` | Logger is simple enough; MagicMock works for verifying calls |
| Mock config/status | Full Config/Status objects | `MagicMock()` | Context tests only need attribute access, not real Config behavior |

## Common Pitfalls

### Pitfall 1: Import Path Confusion
**What goes wrong:** Using relative imports or wrong import paths
**Why it happens:** `common` is a package in `src/python/`, and `pythonpath = ["."]` means the working directory must be `src/python/`
**How to avoid:** Always use `from common import X` or `from common.module import Y`. Run pytest from `src/python/` directory.
**Warning signs:** `ModuleNotFoundError: No module named 'common'`

### Pitfall 2: Forgetting OrderedDict in Args.as_dict()
**What goes wrong:** Testing dict key order without accounting for OrderedDict
**Why it happens:** `Args.as_dict()` returns `collections.OrderedDict` with a specific key order
**How to avoid:** Test key order explicitly: `["local_path_to_scanfs", "html_path", "debug", "exit"]`

### Pitfall 3: Shallow Copy Behavior in create_child_context
**What goes wrong:** Assuming child context has independent copies of config/args/status
**Why it happens:** `create_child_context` uses `copy.copy()` (shallow copy), not `copy.deepcopy()`
**How to avoid:** Explicitly test that child and parent share the same config/args/status objects (same `id()`)

### Pitfall 4: Assert Statements in types.py
**What goes wrong:** Tests pass but `overrides` decorator doesn't actually validate anything
**Why it happens:** Running Python with `-O` flag disables assertions
**How to avoid:** Ensure tests run without `-O` flag (default pytest behavior). Do NOT test with optimized mode.

### Pitfall 5: Testing Constants Regression Value
**What goes wrong:** Testing the exact numeric value `10*1024*1024` as just `10485760` without testing the expression
**Why it happens:** Developer might update the expression but not the test
**How to avoid:** Test both the computed value and reasonableness (e.g., > 0, is int)

## Code Examples

### Example 1: Testing Constants (simple attribute tests)
```python
import unittest
from common import Constants

class TestConstants(unittest.TestCase):
    def test_service_name(self):
        self.assertEqual("seedsync", Constants.SERVICE_NAME)

    def test_max_log_size(self):
        self.assertEqual(10 * 1024 * 1024, Constants.MAX_LOG_SIZE_IN_BYTES)
        self.assertIsInstance(Constants.MAX_LOG_SIZE_IN_BYTES, int)
```

### Example 2: Testing Error Hierarchy
```python
import unittest
from common import AppError, ServiceExit, ServiceRestart

class TestAppError(unittest.TestCase):
    def test_is_exception(self):
        self.assertTrue(issubclass(AppError, Exception))

    def test_service_exit_is_app_error(self):
        self.assertTrue(issubclass(ServiceExit, AppError))

    def test_catch_hierarchy(self):
        with self.assertRaises(AppError):
            raise ServiceExit("shutting down")
```

### Example 3: Testing overrides Decorator
```python
import unittest
from common import overrides

class Base:
    def my_method(self):
        pass

class Child(Base):
    @overrides(Base)
    def my_method(self):
        return "overridden"

class TestOverrides(unittest.TestCase):
    def test_valid_override(self):
        c = Child()
        self.assertEqual("overridden", c.my_method())

    def test_non_class_raises(self):
        with self.assertRaises(AssertionError):
            @overrides("not_a_class")
            def some_method(self):
                pass

    def test_non_existent_method_raises(self):
        with self.assertRaises(AssertionError):
            @overrides(Base)
            def nonexistent_method(self):
                pass
```

### Example 4: Testing Context with MagicMock
```python
import unittest
import logging
from unittest.mock import MagicMock
from common import Context, Args

class TestContext(unittest.TestCase):
    def test_create_child_context(self):
        logger = logging.getLogger("test")
        web_logger = logging.getLogger("web_test")
        config = MagicMock()
        args = Args()
        status = MagicMock()
        ctx = Context(logger, web_logger, config, args, status)
        child = ctx.create_child_context("child_name")
        # Child has different logger
        self.assertIsNot(ctx.logger, child.logger)
        # But shares same config, args, status
        self.assertIs(ctx.config, child.config)
        self.assertIs(ctx.args, child.args)
        self.assertIs(ctx.status, child.status)
```

## Test Count Estimates

| Module | Test Class(es) | Estimated Test Methods | Estimated Assertions |
|--------|---------------|----------------------|---------------------|
| constants.py | TestConstants | 8-10 | ~10-12 |
| context.py | TestArgs, TestContext | 10-12 | ~20-25 |
| error.py | TestAppError, TestServiceExit, TestServiceRestart | 8-10 | ~15-18 |
| localization.py | TestLocalization | 5-7 | ~10-12 |
| types.py | TestOverrides | 6-8 | ~10-12 |
| **Total** | **~7 classes** | **~37-47 methods** | **~65-79 assertions** |

## Open Questions

1. **Should tests verify `@overrides` behavior with `-O` flag?**
   - What we know: The `overrides` decorator uses `assert` statements which are disabled with `-O`
   - What's unclear: Whether the project ever runs in optimized mode
   - Recommendation: Do NOT test optimized mode behavior. Document it as a known limitation. The project never uses `-O` based on pyproject.toml and Makefile review.

2. **Should Context.print_to_log() be tested with real Config or MagicMock?**
   - What we know: `print_to_log()` calls `self.config.as_dict()` and iterates the result, and `self.args.as_dict()` and iterates that
   - What's unclear: Whether using MagicMock for config.as_dict() return value is sufficient
   - Recommendation: Use MagicMock with `config.as_dict.return_value` set to a sample dict structure. This isolates the test from Config internals. A real Config object is unnecessary complexity.

## Sources

### Primary (HIGH confidence)
- Direct source code inspection of all 5 modules under test
- Direct inspection of 7 existing test files in `test_common/` for patterns
- `pyproject.toml` for pytest configuration and pythonpath setting
- `conftest.py` for shared fixture patterns

### Supporting (HIGH confidence)
- `common/__init__.py` for understanding module exports
- `common/config.py` and `common/status.py` for understanding Context dependencies
- `common/persist.py` for understanding how `overrides` and `Localization` are used together

## Metadata

**Confidence breakdown:**
- Module APIs: HIGH -- direct source inspection of small files
- Test patterns: HIGH -- inspected 7 existing test files in same directory
- Edge cases: HIGH -- modules are simple enough for complete analysis
- Import paths: HIGH -- verified via pyproject.toml pythonpath setting and existing tests

**Research date:** 2026-02-08
**Valid until:** No expiration -- these modules are stable legacy code unchanged since 2017
