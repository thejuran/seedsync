# Phase 15: Coverage Tooling & Shared Fixtures - Research

**Researched:** 2026-02-08
**Domain:** pytest-cov configuration, conftest.py fixtures, Python test infrastructure
**Confidence:** HIGH

## Summary

Phase 15 adds pytest-cov to the SeedSync Python backend, creates a root `conftest.py` with shared fixtures, establishes a baseline coverage measurement, and adds a Makefile target for local coverage reporting. The project currently has 711 tests across 42 test files organized into `unittests/` and `integration/` directories, using `unittest.TestCase` exclusively (no existing pytest-style tests or fixtures).

The most impactful shared fixtures will address the duplicated logger setup pattern (found in 20+ setUp methods across 85+ lines of boilerplate) and the duplicated mock context creation (5+ setUp methods with 10-15 lines of lftp config mocking each). The fixtures must be optional -- existing tests using `unittest.TestCase.setUp()` will continue working without modification.

**Primary recommendation:** Add pytest-cov ^7.0.0 to dev dependencies, configure coverage entirely in pyproject.toml (no .coveragerc), create conftest.py with `test_logger` and `mock_context` fixtures, and add `make coverage-python` target.

## Current State

### Project Test Infrastructure

| Aspect | Current Value |
|--------|--------------|
| Test framework | pytest ^7.4.4 (runner), unittest.TestCase (test style) |
| Test count | 711 tests |
| Test files | 42 .py files |
| Test runner | `pytest -v` (via Docker, see entrypoint.sh) |
| Coverage tooling | None |
| conftest.py | None (zero conftest.py files exist) |
| Shared fixtures | None (all setup is per-class in setUp()) |
| Test structure | `tests/unittests/` and `tests/integration/` |
| pythonpath config | `pythonpath = ["."]` in pyproject.toml |
| Timeout | 60 seconds per test |
| Docker runner | `src/docker/test/python/` with compose.yml |
| Docker WORKDIR | `/src/` with `PYTHONPATH=/src` |
| Local runner | `cd src/python && poetry run pytest` |

### pyproject.toml (current)

```toml
[tool.poetry.group.dev.dependencies]
pyinstaller = "^6.0.0"
testfixtures = "^10.0.0"
webtest = "^3.0.7"
pytest = "^7.4.4"
pytest-timeout = "^2.3.1"

[tool.pytest.ini_options]
pythonpath = ["."]
timeout = 60
```

No coverage configuration exists. No `addopts` are configured.

### Makefile Test Targets (current)

- `tests-python` -- Builds the Docker image for Python tests
- `run-tests-python` -- Runs tests via docker compose (depends on `tests-python`)
- No local test targets exist
- No coverage targets exist

### Identified Boilerplate Patterns

#### Pattern 1: Logger Setup (most common, 20+ occurrences)

Found in setUp methods across: test_auto_queue.py, test_model_builder.py, test_model.py, test_web_app.py, test_controller.py, test_dispatch.py, test_extract_process.py, test_scanner_process.py, test_remote_scanner.py, test_lftp.py, test_app_process.py, test_multiprocessing_logger.py, test_persist.py, and more.

```python
# 5-line pattern repeated 20+ times:
logger = logging.getLogger(TestClassName.__name__)
handler = logging.StreamHandler(sys.stdout)
logger.addHandler(handler)
logger.setLevel(logging.DEBUG)
formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s")
handler.setFormatter(formatter)
```

Some variations:
- Some use `logging.getLogger()` (root logger) instead of named logger
- Some assign to `self.logger`, others to local `logger`
- Some pass the logger to `self.context.logger = logger`
- Some pass to objects: `self.model.set_base_logger(logger)`

#### Pattern 2: Mock Context with LFTP Config (3 setUp methods)

Found in: test_scan_manager.py, test_lftp_manager.py, test_file_operation_manager.py

```python
# 10-15 lines repeated across 3 files:
self.mock_context = MagicMock()
self.mock_context.logger = MagicMock()
self.mock_context.config.lftp.local_path = "/local/path"
self.mock_context.config.lftp.remote_address = "remote.server.com"
self.mock_context.config.lftp.remote_username = "user"
self.mock_context.config.lftp.remote_password = "password"
self.mock_context.config.lftp.use_ssh_key = False
self.mock_context.config.lftp.remote_port = 22
self.mock_context.config.lftp.remote_path = "/remote/path"
# ... additional config attributes vary per file
```

#### Pattern 3: Mock Context with Real Config (2 setUp methods)

Found in: test_auto_queue.py, test_web_app.py (BaseTestWebApp)

```python
self.context = MagicMock()
self.context.config = Config()  # Real Config object, not mock
self.context.logger = self.logger
```

#### Pattern 4: Controller Mock with Model Listener Capture (2 setUp methods)

Found in: test_auto_queue.py, test_web_app.py (BaseTestWebApp)

```python
self.controller = MagicMock()
self.controller.get_model_files_and_add_listener = MagicMock()
self.model_listener = None
def capture_listener(listener):
    self.model_listener = listener
    return self.model_files
self.controller.get_model_files_and_add_listener.side_effect = capture_listener
```

### Test File Style Analysis

All 711 tests use `unittest.TestCase`. The codebase does NOT use:
- pytest-style test functions (no bare `def test_*()` functions)
- pytest fixtures (`@pytest.fixture`)
- pytest parametrize
- pytest markers (beyond timeout)

This means conftest.py fixtures will primarily serve FUTURE tests (Phases 16-18) while being available to any existing test that wants to opt in.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pytest-cov | ^7.0.0 | Coverage measurement via pytest | De facto standard for pytest coverage; latest major version |

### Version Compatibility Note

pytest-cov 7.0.0 requires coverage >= 7.10.6 and Python >= 3.9. The project uses Python >=3.11,<3.13 which is fully compatible. pytest-cov 7.0.0 dropped subprocess measurement via .pth files -- this is irrelevant for SeedSync since its tests do not measure subprocess coverage.

**Confidence:** HIGH -- verified via PyPI and official docs.

### Installation

```bash
cd src/python
poetry add --group dev pytest-cov@^7.0.0
```

## Architecture Patterns

### Coverage Configuration in pyproject.toml

All coverage configuration goes in pyproject.toml (no separate .coveragerc file). This is the standard modern approach.

```toml
[tool.pytest.ini_options]
pythonpath = ["."]
timeout = 60

[tool.coverage.run]
source = ["."]
omit = [
    "tests/*",
    "docs/*",
]
branch = true

[tool.coverage.report]
show_missing = true
skip_empty = true
exclude_lines = [
    "pragma: no cover",
    "if __name__ == .__main__.",
    "pass",
]

[tool.coverage.html]
directory = "htmlcov"
```

**Key decisions:**
- `source = ["."]` -- measures all Python source in src/python/ (since pythonpath is ".")
- `omit = ["tests/*"]` -- excludes test files themselves from coverage measurement
- `branch = true` -- enables branch coverage (measures if/else paths)
- `show_missing = true` -- shows line numbers of uncovered code in terminal report
- `skip_empty = true` -- omits `__init__.py` files with no executable code
- Do NOT put `--cov` in `addopts` -- coverage should be opt-in, not forced on every test run (it slows tests down and adds noise during development)

**Confidence:** HIGH -- verified via coverage.py and pytest-cov official docs.

### conftest.py Location and Structure

```
src/python/tests/
    conftest.py          <-- NEW: root conftest, fixtures available to ALL tests
    __init__.py
    utils.py
    unittests/
        __init__.py
        test_controller/
        test_common/
        test_model/
        test_web/
        test_lftp/
        test_ssh/
        test_system/
    integration/
        __init__.py
        test_controller/
        test_web/
        test_lftp/
```

Place conftest.py at `src/python/tests/conftest.py`. This makes fixtures available to both `unittests/` and `integration/` subdirectories automatically. pytest discovers conftest.py files by walking up from the test file's directory.

**Do NOT create subdirectory conftest.py files in this phase.** One root conftest.py is sufficient for shared fixtures.

### Recommended conftest.py Fixtures

#### Fixture 1: test_logger

Replaces the 5-line logger setup boilerplate. Must produce a logger that:
- Outputs to stdout (matches existing pattern)
- Uses DEBUG level (matches existing pattern)
- Uses the standard formatter: `%(asctime)s - %(levelname)s - %(name)s - %(message)s`
- Uses the requesting test's name as the logger name (via `request.node.name`)

```python
import logging
import sys
import pytest
from unittest.mock import MagicMock

@pytest.fixture
def test_logger(request):
    """Provides a configured logger for test output.

    Replaces the common 5-line setUp pattern:
        logger = logging.getLogger(ClassName.__name__)
        handler = logging.StreamHandler(sys.stdout)
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
        handler.setFormatter(...)
    """
    logger = logging.getLogger(request.node.name)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s")
    )
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)
    yield logger
    # Cleanup: remove handler to prevent duplicate handlers on repeated runs
    logger.removeHandler(handler)
```

**Scope:** `function` (default) -- each test gets a fresh logger.

#### Fixture 2: mock_context

Replaces the mock context + lftp config boilerplate. Provides a MagicMock with all standard lftp config attributes pre-populated. Tests can override individual attributes as needed.

```python
@pytest.fixture
def mock_context(test_logger):
    """Provides a MagicMock context with standard lftp config attributes.

    Replaces the common 10-15 line setUp pattern for mocking context
    with lftp configuration. Individual tests can override any attribute.
    """
    context = MagicMock()
    context.logger = test_logger

    # Standard lftp config defaults
    context.config.lftp.local_path = "/local/path"
    context.config.lftp.remote_address = "remote.server.com"
    context.config.lftp.remote_username = "user"
    context.config.lftp.remote_password = "password"
    context.config.lftp.use_ssh_key = False
    context.config.lftp.remote_port = 22
    context.config.lftp.remote_path = "/remote/path"
    context.config.lftp.remote_path_to_scan_script = "/usr/bin/scanfs"
    context.config.lftp.use_temp_file = False
    context.config.lftp.num_max_parallel_downloads = 2
    context.config.lftp.num_max_parallel_files_per_download = 3
    context.config.lftp.num_max_connections_per_root_file = 4
    context.config.lftp.num_max_connections_per_dir_file = 2
    context.config.lftp.num_max_total_connections = 8

    # Controller config defaults
    context.config.controller.interval_ms_downloading_scan = 500
    context.config.controller.interval_ms_local_scan = 30000
    context.config.controller.interval_ms_remote_scan = 30000
    context.config.controller.use_local_path_as_extract_path = True
    context.config.controller.extract_path = "/extract/path"

    # General config defaults
    context.config.general.verbose = False

    # Args defaults
    context.args.local_path_to_scanfs = "/local/bin/scanfs"

    return context
```

#### Fixture 3: mock_context_with_real_config

For tests that need a real Config object (like test_auto_queue.py, test_web_app.py):

```python
from common import Config

@pytest.fixture
def mock_context_with_real_config(test_logger):
    """Provides a MagicMock context with a REAL Config object.

    Used by tests that need actual Config behavior (validation,
    defaults, serialization) rather than MagicMock attribute access.
    """
    context = MagicMock()
    context.config = Config()
    context.logger = test_logger
    return context
```

### Makefile Coverage Target

```makefile
coverage-python:
	cd ${SOURCEDIR}/python && poetry run pytest --cov --cov-report=term-missing --cov-report=html
```

This target:
- Runs locally (not in Docker) for developer convenience
- Produces terminal output with missing line numbers
- Generates HTML report in `src/python/htmlcov/`
- Uses configuration from pyproject.toml (source, omit, branch settings)

Add `htmlcov/` to `.gitignore` if not already present.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coverage measurement | Custom coverage scripts | pytest-cov + coverage.py | Accurate instrumentation, branch coverage, report formats |
| Coverage config | Separate .coveragerc file | `[tool.coverage.*]` in pyproject.toml | Single config file, no duplication, modern standard |
| Shared test setup | Copy-pasting setUp boilerplate | conftest.py fixtures | Automatic discovery, parameterizable, cleaner |
| Coverage in CI | Separate coverage step | `pytest --cov` (single invocation) | No test-run duplication, coverage measured during test execution |

## Common Pitfalls

### Pitfall 1: Putting --cov in addopts

**What goes wrong:** Every `pytest` invocation measures coverage, slowing down development runs and polluting output.
**Why it happens:** Tutorials often show `addopts = "--cov"` as "best practice."
**How to avoid:** Keep `addopts` clean. Use `--cov` only when explicitly requested via command line or Makefile target.
**Warning signs:** Developers complaining tests are slow, coverage output in normal test runs.

### Pitfall 2: conftest.py Fixtures Breaking unittest.TestCase Tests

**What goes wrong:** pytest fixtures and unittest.TestCase setUp/tearDown coexist but interact differently. Fixtures cannot be injected into unittest.TestCase test methods as function arguments.
**Why it happens:** unittest.TestCase tests don't support pytest fixture injection.
**How to avoid:** Fixtures in conftest.py are for NEW pytest-style tests (Phases 16-18). Existing unittest.TestCase tests continue using their setUp() methods unchanged. If an existing test WANTS to use a fixture, it must be converted to a pytest-style function -- but this is explicitly NOT required.
**Warning signs:** ImportError or unexpected None values in existing tests.

### Pitfall 3: Wrong source Path in Coverage Config

**What goes wrong:** Coverage reports show 0% or measure the wrong files because `source` doesn't match the actual project layout.
**Why it happens:** SeedSync's Python code is at `src/python/` with `pythonpath = ["."]`, meaning imports are relative to `src/python/`. Coverage runs from `src/python/` so `source = ["."]` measures everything under that directory.
**How to avoid:** Set `source = ["."]` and `omit = ["tests/*", "docs/*"]` to measure source code but exclude tests.
**Warning signs:** Coverage report showing 0% or including test files in coverage numbers.

### Pitfall 4: Logger Handler Accumulation

**What goes wrong:** If the test_logger fixture doesn't clean up handlers, repeated test runs or test discovery can add duplicate handlers, causing duplicated log output.
**Why it happens:** `logging.getLogger()` returns the same logger instance for the same name. Adding handlers without removing them accumulates.
**How to avoid:** Use `yield` in the fixture and remove the handler in the teardown phase (after yield).
**Warning signs:** Duplicate log lines appearing during test runs.

### Pitfall 5: Docker vs Local Coverage Path Differences

**What goes wrong:** Coverage config that works locally fails in Docker because paths differ (`/src/` in Docker vs `src/python/` locally).
**Why it happens:** Docker WORKDIR is `/src/` with bind mount, local runs from `src/python/`.
**How to avoid:** Use relative paths in coverage config (`source = ["."]` not absolute paths). The Makefile coverage target runs locally, not in Docker. Docker test runs don't need coverage (they verify tests pass, not measure coverage).
**Warning signs:** Coverage reports showing no source files found.

### Pitfall 6: Breaking Existing Tests

**What goes wrong:** Adding conftest.py or pytest-cov changes test discovery or import behavior, causing existing tests to fail.
**Why it happens:** conftest.py is automatically loaded by pytest. If it imports modules that fail or changes the test environment, all tests are affected.
**How to avoid:** Keep conftest.py minimal. Only define fixtures. Do not add module-level side effects. Run full test suite after adding conftest.py to verify zero regressions.
**Warning signs:** Tests that passed before suddenly failing with import errors.

## Code Examples

### Complete pyproject.toml Configuration

```toml
[tool.poetry.group.dev.dependencies]
pyinstaller = "^6.0.0"
testfixtures = "^10.0.0"
webtest = "^3.0.7"
pytest = "^7.4.4"
pytest-timeout = "^2.3.1"
pytest-cov = "^7.0.0"

[tool.pytest.ini_options]
pythonpath = ["."]
timeout = 60

[tool.coverage.run]
source = ["."]
omit = [
    "tests/*",
    "docs/*",
]
branch = true

[tool.coverage.report]
show_missing = true
skip_empty = true
exclude_lines = [
    "pragma: no cover",
    "if __name__ == .__main__.",
    "pass",
]

[tool.coverage.html]
directory = "htmlcov"
```

### Complete conftest.py

```python
# Copyright 2017, Inderpreet Singh, All rights reserved.

"""
Shared pytest fixtures for SeedSync tests.

These fixtures are automatically discovered by pytest for all tests
under the tests/ directory. They are OPTIONAL -- existing unittest.TestCase
tests continue to use their setUp() methods without modification.

New pytest-style tests can request these fixtures by name as function arguments.
"""

import logging
import sys

import pytest
from unittest.mock import MagicMock

from common import Config


@pytest.fixture
def test_logger(request):
    """Provides a configured logger for test output.

    Replaces the common setUp pattern:
        logger = logging.getLogger(ClassName.__name__)
        handler = logging.StreamHandler(sys.stdout)
        logger.addHandler(handler)
        logger.setLevel(logging.DEBUG)
        handler.setFormatter(...)

    Usage in pytest-style tests:
        def test_something(test_logger):
            my_object.set_base_logger(test_logger)
    """
    logger = logging.getLogger(request.node.name)
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter("%(asctime)s - %(levelname)s - %(name)s - %(message)s")
    )
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)
    yield logger
    logger.removeHandler(handler)


@pytest.fixture
def mock_context(test_logger):
    """Provides a MagicMock context with standard config attributes.

    All lftp, controller, and general config attributes are pre-populated
    with sensible defaults. Individual tests can override any attribute:

        def test_ssh_key_mode(mock_context):
            mock_context.config.lftp.use_ssh_key = True
            ...
    """
    context = MagicMock()
    context.logger = test_logger

    # lftp config
    context.config.lftp.local_path = "/local/path"
    context.config.lftp.remote_address = "remote.server.com"
    context.config.lftp.remote_username = "user"
    context.config.lftp.remote_password = "password"
    context.config.lftp.use_ssh_key = False
    context.config.lftp.remote_port = 22
    context.config.lftp.remote_path = "/remote/path"
    context.config.lftp.remote_path_to_scan_script = "/usr/bin/scanfs"
    context.config.lftp.use_temp_file = False
    context.config.lftp.num_max_parallel_downloads = 2
    context.config.lftp.num_max_parallel_files_per_download = 3
    context.config.lftp.num_max_connections_per_root_file = 4
    context.config.lftp.num_max_connections_per_dir_file = 2
    context.config.lftp.num_max_total_connections = 8

    # controller config
    context.config.controller.interval_ms_downloading_scan = 500
    context.config.controller.interval_ms_local_scan = 30000
    context.config.controller.interval_ms_remote_scan = 30000
    context.config.controller.use_local_path_as_extract_path = True
    context.config.controller.extract_path = "/extract/path"

    # general config
    context.config.general.verbose = False

    # args
    context.args.local_path_to_scanfs = "/local/bin/scanfs"

    return context


@pytest.fixture
def mock_context_with_real_config(test_logger):
    """Provides a MagicMock context with a REAL Config object.

    Use this when tests need actual Config behavior (validation,
    defaults, serialization) rather than MagicMock attribute access.

        def test_autoqueue_config(mock_context_with_real_config):
            mock_context_with_real_config.config.autoqueue.enabled = True
            ...
    """
    context = MagicMock()
    context.config = Config()
    context.logger = test_logger
    return context
```

### Makefile Target

```makefile
coverage-python:
	cd ${SOURCEDIR}/python && poetry run pytest --cov --cov-report=term-missing --cov-report=html
```

### How Future Tests Use Fixtures (Phase 16+ example)

```python
# Example: tests/unittests/test_common/test_context.py (Phase 16)

def test_context_initialization(test_logger):
    """Test Context can be created with valid args."""
    # test_logger is automatically injected -- no setUp needed
    ...

def test_controller_init(mock_context):
    """Test controller initializes with mocked context."""
    # mock_context has all config attributes pre-populated
    mock_context.config.lftp.use_ssh_key = True  # override one attribute
    ...
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| .coveragerc separate file | `[tool.coverage.*]` in pyproject.toml | coverage.py 5.0+ (2019) | Single config file, no .coveragerc needed |
| pytest-cov 5.x | pytest-cov 7.0.0 | Sep 2025 | Dropped subprocess .pth measurement, requires coverage >= 7.10.6 |
| Copy-paste setUp boilerplate | conftest.py fixtures | Always available in pytest | Automatic discovery, DRY test setup |

## Open Questions

1. **htmlcov in .gitignore**
   - What we know: `make coverage-python` generates `htmlcov/` in `src/python/`
   - What's unclear: Whether `.gitignore` already covers this
   - Recommendation: Check and add `src/python/htmlcov/` to `.gitignore` if not present

2. **Docker coverage target**
   - What we know: Tests run in Docker via `make run-tests-python`
   - What's unclear: Whether coverage should also run in Docker
   - Recommendation: Keep coverage local-only for this phase. Docker tests verify correctness, local coverage measures coverage. Adding Docker coverage can be done later if needed.

3. **Baseline coverage number**
   - What we know: 711 tests exist, but coverage percentage is unknown
   - What's unclear: What the baseline will be
   - Recommendation: Run coverage once after setup, record the number in PLAN.md verification step. Do NOT set a fail-under threshold in this phase (that's Phase 19).

## Sources

### Primary (HIGH confidence)
- [pytest-cov 7.0.0 docs](https://pytest-cov.readthedocs.io/en/latest/config.html) -- configuration reference
- [pytest-cov PyPI](https://pypi.org/project/pytest-cov/) -- version 7.0.0, Python >=3.9
- [coverage.py config reference](https://coverage.readthedocs.io/en/latest/config.html) -- pyproject.toml sections
- [pytest fixtures docs](https://docs.pytest.org/en/stable/how-to/fixtures.html) -- conftest.py, fixture scopes
- Direct codebase analysis -- all 42 test files read, boilerplate patterns identified

### Secondary (MEDIUM confidence)
- [pytest conftest best practices](https://pytest-with-eric.com/pytest-best-practices/pytest-conftest/) -- fixture organization patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- pytest-cov 7.0.0 is current, verified on PyPI
- Architecture: HIGH -- pyproject.toml config format verified via coverage.py docs
- Pitfalls: HIGH -- based on direct codebase analysis (all 42 test files reviewed)
- Fixtures: HIGH -- boilerplate patterns identified from actual code, not hypothetical

**Research date:** 2026-02-08
**Valid until:** 2026-05-08 (stable domain, slow-moving)
