---
phase: 26-radarr-config-shared-arr-settings-ui
plan: 01
subsystem: backend-config
tags: [radarr, config, api, backward-compatible]
dependency_graph:
  requires: []
  provides: [Config.Radarr, /server/config/radarr/test-connection]
  affects: [config.py, seedsync.py, config-handler]
tech_stack:
  added: []
  patterns: [InnerConfig mirroring, backward-compatible config sections]
key_files:
  created: []
  modified:
    - src/python/common/config.py
    - src/python/seedsync.py
    - src/python/web/handler/config.py
    - src/python/tests/unittests/test_common/test_config.py
    - src/python/tests/unittests/test_web/test_handler/test_config_handler.py
decisions:
  - "Radarr InnerConfig mirrors Sonarr exactly with different property names and default port 7878"
  - "Backward-compatible parsing defaults missing [Radarr] section to disabled"
  - "Test connection uses same /api/v3/system/status endpoint as Sonarr"
metrics:
  duration: 214s
  completed: 2026-02-11
---

# Phase 26 Plan 01: Radarr Backend Config and Test Connection Summary

Config.Radarr InnerConfig class with enabled/radarr_url/radarr_api_key properties, backward-compatible config parsing for older config files, default values for fresh installs, and GET /server/config/radarr/test-connection endpoint mirroring the Sonarr implementation.

## What Was Built

### Config.Radarr InnerConfig Class
- Added `Config.Radarr` inner class with three properties: `enabled` (bool), `radarr_url` (str), `radarr_api_key` (str)
- Positioned between Sonarr and AutoDelete in all config operations (init, from_dict, as_dict)
- Backward-compatible: config files without `[Radarr]` section load without error, defaulting to disabled

### Default Config Values
- Fresh installs get `radarr.enabled=False`, `radarr.radarr_url=""`, `radarr.radarr_api_key=""`
- Added in both `Config.from_dict` (for existing installs) and `_create_default_config` (for new installs)

### Test Connection Endpoint
- `GET /server/config/radarr/test-connection` registered in ConfigHandler
- Validates URL and API key presence before making request
- Calls Radarr `/api/v3/system/status` with `X-Api-Key` header and 10-second timeout
- Returns JSON: `{"success": true, "version": "..."}` or `{"success": false, "error": "..."}`
- Handles all error cases: missing URL, missing API key, 401 (invalid key), connection refused, timeout

### Unit Tests
- Updated `test_has_section` to assert `radarr` section exists
- Updated `test_to_file` golden string with `[Radarr]` section
- `test_from_file` validates backward compatibility (no Radarr section in old configs)
- 7 new Radarr test connection tests: URL validation, API key validation, success with version, 401 error, connection error, timeout, trailing slash normalization

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Config.Radarr InnerConfig class | d12305e | config.py, seedsync.py, test_config.py |
| 2 | Test connection endpoint and tests | 815a19d | handler/config.py, test_config_handler.py |

## Verification Results

- 15/15 config unit tests pass
- 16/16 config handler unit tests pass (9 existing + 7 new Radarr)
- 7/7 seedsync tests pass (including test_default_config)
- 38/38 total plan-relevant tests pass
- Pre-existing failures in lftp/ssh/scanner tests (require external binaries) unrelated to changes

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] src/python/common/config.py modified with Config.Radarr class
- [x] src/python/seedsync.py modified with Radarr defaults
- [x] src/python/web/handler/config.py modified with test-connection endpoint
- [x] src/python/tests/unittests/test_common/test_config.py modified with Radarr assertions
- [x] src/python/tests/unittests/test_web/test_handler/test_config_handler.py modified with 7 Radarr tests
- [x] Commit d12305e exists
- [x] Commit 815a19d exists
