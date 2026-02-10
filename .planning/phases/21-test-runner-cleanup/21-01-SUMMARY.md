# Plan 21-01: Suppress pytest cache warnings and filter cgi deprecation warnings

**Status:** COMPLETE
**Duration:** ~5 min
**Date:** 2026-02-10

## What Changed

**src/python/pyproject.toml** — Added two settings to `[tool.pytest.ini_options]`:
- `cache_dir = "/tmp/.pytest_cache"` — redirects cache writes to writable `/tmp` path, eliminating cache warnings in read-only Docker mounts
- `filterwarnings = ["ignore:'cgi' is deprecated:DeprecationWarning"]` — suppresses cgi module deprecation warnings from webob and bottle (Python 3.11+ PEP 594)

## Verification

- 798 unit tests pass with zero warnings (run in devenv Docker container)
- `cachedir: /tmp/.pytest_cache` confirmed in pytest header output
- Read-only volume mount produces zero cache warnings
- Web handler tests (157 tests importing webob/bottle) pass with zero cgi deprecation warnings
- No other sections of pyproject.toml modified

## Notes

- `make run-tests-python` Docker build is broken on arm64 (Apple Silicon) due to `rar` package not available for arm64 in Debian repos. This is a pre-existing issue unrelated to this phase — the `rar` binary is proprietary and only packaged for amd64/i386. CI runs on amd64 and is unaffected.
- Verification was done using the devenv Docker image with volume-mounted source code, which exercises the same pytest configuration.
