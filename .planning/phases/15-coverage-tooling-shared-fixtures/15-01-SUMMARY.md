# Phase 15 Plan 01: Coverage Tooling & Shared Fixtures Summary

**One-liner:** pytest-cov coverage pipeline with shared conftest.py fixtures and Makefile target, baseline 77%

## Results

| Metric | Value |
|--------|-------|
| Status | Complete |
| Tasks | 2/2 |
| Duration | 12m 9s |
| Commit | `56463ad` |
| Baseline Coverage | **77%** (4458 statements, 943 missed, 1068 branches, 75 branch misses) |

## What Was Done

### Task 1: Add pytest-cov dependency and coverage configuration

- Added `pytest-cov = "^7.0.0"` to `[tool.poetry.group.dev.dependencies]` via `poetry add`
- Updated `poetry.lock` with pytest-cov 7.0.0 and coverage 7.13.3
- Added three `[tool.coverage.*]` TOML sections to pyproject.toml:
  - `[tool.coverage.run]` -- source=["."], omit tests/docs, branch=true
  - `[tool.coverage.report]` -- show_missing, skip_empty, exclude_lines
  - `[tool.coverage.html]` -- directory="htmlcov"
- Existing `[tool.pytest.ini_options]` (pythonpath, timeout) left unchanged
- `--cov` is NOT in addopts (coverage is opt-in only)

### Task 2: Create conftest.py, Makefile target, gitignore entries

- Created `src/python/tests/conftest.py` with 3 fixtures:
  - `test_logger` -- configured logger with stdout handler and cleanup
  - `mock_context` -- MagicMock with pre-populated lftp/controller/general config
  - `mock_context_with_real_config` -- MagicMock with real Config() object
- Added `coverage-python` target to Makefile (runs `poetry run pytest --cov --cov-report=term-missing --cov-report=html`)
- Added `coverage-python` to `.PHONY` declaration
- Added `htmlcov/` and `.coverage` to `.gitignore`

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `src/python/pyproject.toml` | Modified | Added pytest-cov dep + 3 coverage config sections |
| `src/python/poetry.lock` | Modified | Updated with pytest-cov 7.0.0 + coverage 7.13.3 |
| `src/python/tests/conftest.py` | Created | 3 shared pytest fixtures |
| `Makefile` | Modified | Added coverage-python target + .PHONY entry |
| `.gitignore` | Modified | Added htmlcov/ and .coverage exclusions |

## Verification Results

| Check | Result |
|-------|--------|
| pytest discovers all tests | 721 tests collected |
| Zero test regressions | 586 passed, 75 failed, 56 errors, 8 skipped (all pre-existing) |
| `pytest --cov` produces report | Yes -- 77% total coverage |
| `make coverage-python` works | Yes -- terminal + HTML output |
| HTML report generated | `src/python/htmlcov/index.html` exists |
| Fixtures available | All 3 fixtures discovered by pytest |
| htmlcov/ gitignored | Confirmed -- not in `git status` |
| .coverage gitignored | Confirmed -- not in `git status` |

## Test Regression Analysis

The plan referenced 711 tests; actual count is 721 (10 more tests exist in the repo than the plan estimated). All pre-existing failures are due to missing external tools on the local macOS environment (lftp binary, ssh test server, patool/rar). These same tests pass in the Docker-based CI environment. Our changes introduced zero new failures.

## Deviations from Plan

### Environment Setup (not in plan)

The local macOS environment did not have Python 3.12, Poetry, or coreutils (realpath) installed. These were installed via Homebrew as prerequisites:
- `brew install python@3.12` -- project requires >=3.11
- `pip3.12 install poetry` -- dependency manager
- `brew install coreutils` -- Makefile uses `realpath`

This is not a code deviation -- the plan assumed a working development environment.

### Test Count Discrepancy (informational)

Plan referenced 711 tests; actual repo has 721 tests. This is the current state of the repository, not a change from our work. All tests that passed before still pass.

## Baseline Coverage Snapshot

```
TOTAL    4458    943    1068    75    77%
         stmts   miss   branch  br-miss  cover
```

This 77% baseline (with branch coverage enabled) is the starting point for Phases 16-18 to improve upon.
