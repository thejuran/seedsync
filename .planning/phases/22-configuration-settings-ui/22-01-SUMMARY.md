---
phase: 22-configuration-settings-ui
plan: 01
subsystem: backend-config
tags: [sonarr, config, api-endpoint, backend]
dependency-graph:
  requires: []
  provides: [Config.Sonarr, test-connection-endpoint, sonarr-defaults]
  affects: [config.py, seedsync.py, config-handler]
tech-stack:
  added: []
  patterns: [InnerConfig section, backward-compatible config parsing, GET JSON endpoint]
key-files:
  created: []
  modified:
    - src/python/common/config.py
    - src/python/seedsync.py
    - src/python/web/handler/config.py
    - src/python/tests/unittests/test_common/test_config.py
decisions:
  - "Sonarr config uses Checkers.null for all properties - validation at test endpoint, not config parse"
  - "Backward-compatible from_dict with optional Sonarr section via 'if Sonarr in config_dict'"
  - "Test connection returns HTTP 200 with JSON success/error body (matches RestService pattern)"
  - "sonarr_ prefix on URL and API key properties for future *arr integration disambiguation"
metrics:
  duration: ~5 minutes
  completed: 2026-02-10
---

# Phase 22 Plan 01: Backend Config + Test Connection Summary

Config.Sonarr InnerConfig with enabled/sonarr_url/sonarr_api_key properties, backward-compatible config parsing, default values, and GET /server/config/sonarr/test-connection endpoint calling Sonarr /api/v3/system/status.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add Config.Sonarr InnerConfig class | 7242704 | src/python/common/config.py |
| 2 | Add Sonarr defaults to _create_default_config | 312f460 | src/python/seedsync.py, tests/unittests/test_common/test_config.py |
| 3 | Add test connection endpoint to ConfigHandler | 850f500 | src/python/web/handler/config.py |

## What Was Built

### Config.Sonarr InnerConfig (Task 1)
- New `Config.Sonarr` inner class with 3 typed properties: `enabled` (bool), `sonarr_url` (str), `sonarr_api_key` (str)
- `Config.__init__` initializes `self.sonarr = Config.Sonarr()`
- `Config.from_dict` handles optional Sonarr section: parses if present, keeps None defaults if absent (backward-compatible with old config files)
- `Config.as_dict` includes Sonarr section in output

### Default Config (Task 2)
- `_create_default_config` sets `sonarr.enabled=False`, `sonarr.sonarr_url=""`, `sonarr.sonarr_api_key=""`
- Integration is opt-in: disabled by default on fresh install

### Test Connection Endpoint (Task 3)
- `GET /server/config/sonarr/test-connection` route added to ConfigHandler
- Reads URL and API key from persisted config (user saves via auto-save first)
- Validates URL and API key presence before calling Sonarr
- Calls `{sonarr_url}/api/v3/system/status` with `X-Api-Key` header, 10s timeout
- Returns JSON: `{"success": true, "version": "X.X.X"}` on success
- Returns specific error messages: "Sonarr URL is required", "Sonarr API key is required", "Invalid API key", "Connection refused - check Sonarr URL", "Connection timed out", "Sonarr returned status {code}"

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated test_to_file golden string for Sonarr section**
- **Found during:** Task 2
- **Issue:** `test_to_file` in test_config.py uses golden string comparison. Adding Sonarr to `as_dict()` caused the golden output to have 4 more lines (Sonarr section header + 3 properties) than expected.
- **Fix:** Added Sonarr property values to the test config setup and added `[Sonarr]` section with `enabled`, `sonarr_url`, `sonarr_api_key` to the golden string.
- **Files modified:** src/python/tests/unittests/test_common/test_config.py
- **Commit:** 312f460

**2. [Rule 1 - Bug] Updated test_has_section to include sonarr**
- **Found during:** Task 2
- **Issue:** `test_has_section` asserts specific known sections but did not include the new `sonarr` section.
- **Fix:** Added `self.assertTrue(config.has_section("sonarr"))` assertion.
- **Files modified:** src/python/tests/unittests/test_common/test_config.py
- **Commit:** 312f460

## Verification Results

- Config.Sonarr class exists with 3 properties (enabled, sonarr_url, sonarr_api_key)
- Config.__init__ creates self.sonarr
- Config.from_dict handles missing Sonarr section gracefully (backward compatibility verified with dict and INI formats)
- Config.as_dict includes Sonarr section
- Default config sets sonarr.enabled=False, sonarr_url="", sonarr_api_key=""
- GET /server/config/get returns sonarr section (via SerializeConfig which lowercases section names)
- GET /server/config/set/sonarr/<key>/<value> works for all 3 properties (via existing generic set handler)
- GET /server/config/sonarr/test-connection handler implemented with proper error handling
- All 15 config tests pass
- All 7 seedsync tests pass (including test_default_config and test_detect_incomplete_config)
- ConfigHandler imports without errors

## Self-Check: PASSED

All 5 files verified present. All 3 commit hashes verified in git log.
