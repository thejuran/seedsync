---
phase: 26-radarr-config-shared-arr-settings-ui
plan: 02
subsystem: frontend-config-ui
tags: [radarr, frontend, settings-ui, arr-integration, angular]
dependency_graph:
  requires: [Config.Radarr, /server/config/radarr/test-connection]
  provides: [IRadarr, testRadarrConnection, shared-arr-settings-ui]
  affects: [config.ts, config.service.ts, settings-page.component]
tech_stack:
  added: []
  patterns: [ImmutableJS Record mirroring, subsection headers in accordion cards]
key_files:
  created: []
  modified:
    - src/angular/src/app/services/settings/config.ts
    - src/angular/src/app/services/settings/config.service.ts
    - src/angular/src/app/pages/settings/settings-page.component.ts
    - src/angular/src/app/pages/settings/settings-page.component.html
    - src/angular/src/app/pages/settings/settings-page.component.scss
decisions:
  - "IRadarr mirrors ISonarr exactly with radarr_url/radarr_api_key property names"
  - "Subsection headers use Bootstrap secondary color variable for visual consistency"
  - "Sonarr and Radarr have fully independent test connection state (4 properties total)"
metrics:
  duration: 149s
  completed: 2026-02-11
---

# Phase 26 Plan 02: Radarr Frontend Config and Shared *arr Settings UI Summary

IRadarr frontend model with backward-compatible Config constructor, testRadarrConnection service method, and unified *arr Integration Settings UI with Sonarr and Radarr subsections each having independent enable toggle, URL, API key, and Test Connection.

## What Was Built

### IRadarr Model (config.ts)
- Added `IRadarr` interface with `enabled`, `radarr_url`, `radarr_api_key` properties
- Added `RadarrRecord` Immutable.js Record factory with null defaults
- Added `radarr: IRadarr` to `IConfig` interface and `Config` class
- Backward-compatible Config constructor: handles missing `radarr` in JSON by falling back to `DefaultRadarr`

### testRadarrConnection Service Method (config.service.ts)
- Added `RADARR_TEST_URL` constant pointing to `/server/config/radarr/test-connection`
- Added `testRadarrConnection()` method mirroring `testSonarrConnection()` pattern

### Shared *arr Integration Settings UI (settings-page.component.*)
- Refactored single *arr Integration accordion card into two subsections with headers
- Sonarr subsection: "Sonarr" header, enable toggle, URL (8989), API key, Test Connection
- Radarr subsection: "Radarr" header, enable toggle, URL (7878), API key, Test Connection
- Renamed `testConnectionLoading`/`testConnectionResult` to `testSonarrConnectionLoading`/`testSonarrConnectionResult`
- Added `testRadarrConnectionLoading`/`testRadarrConnectionResult` for independent Radarr state
- Added `onTestRadarrConnection()` handler mirroring Sonarr with "Connected to Radarr v" message
- Added `.subsection-header` SCSS styles: 600 weight, Bootstrap secondary color, responsive margin

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | IRadarr model and testRadarrConnection service | d68fcf7 | config.ts, config.service.ts |
| 2 | Shared *arr Integration UI with subsections | 7bebe91 | settings-page.component.ts/html/scss |

## Verification Results

- Angular production build: PASS (no errors)
- Angular lint: PASS (0 errors)
- Angular unit tests: 381/381 SUCCESS (0 failures)
- Template subsection headers: 2 (Sonarr, Radarr)
- Component test connection methods: 2 (onTestSonarrConnection, onTestRadarrConnection)
- ConfigService.testRadarrConnection: present
- IConfig.radarr: present

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] src/angular/src/app/services/settings/config.ts contains IRadarr interface
- [x] src/angular/src/app/services/settings/config.service.ts contains testRadarrConnection
- [x] src/angular/src/app/pages/settings/settings-page.component.ts contains onTestRadarrConnection
- [x] src/angular/src/app/pages/settings/settings-page.component.html contains 2 subsection-header elements
- [x] src/angular/src/app/pages/settings/settings-page.component.scss contains subsection-header styles
- [x] Commit d68fcf7 exists
- [x] Commit 7bebe91 exists
