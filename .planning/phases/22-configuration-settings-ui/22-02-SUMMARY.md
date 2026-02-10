---
phase: 22-configuration-settings-ui
plan: 02
subsystem: frontend-settings-ui
tags: [sonarr, config, settings-page, angular, frontend]
dependency-graph:
  requires: [22-01]
  provides: [ISonarr-model, ConfigService.testSonarrConnection, arr-integration-settings-section]
  affects: [config.ts, config.service.ts, settings-page.component]
tech-stack:
  added: []
  patterns: [custom accordion card with fieldset disable, ChangeDetectorRef for OnPush, inline test result state]
key-files:
  created: []
  modified:
    - src/angular/src/app/services/settings/config.ts
    - src/angular/src/app/services/settings/config.service.ts
    - src/angular/src/app/pages/settings/settings-page.component.html
    - src/angular/src/app/pages/settings/settings-page.component.ts
    - src/angular/src/app/pages/settings/settings-page.component.scss
decisions:
  - "Custom card instead of #optionsList template - Test Connection button does not fit standard options-only pattern"
  - "HTML5 fieldset disabled pattern to grey out URL, API Key, Test Connection when toggle is OFF"
  - "ChangeDetectorRef.markForCheck() for OnPush compatibility with direct property bindings"
  - "NgIf added to standalone imports for *ngIf directives in custom card template"
  - "Backward-compatible Config constructor: falls back to DefaultSonarr if props.sonarr missing"
metrics:
  duration: ~3 minutes
  completed: 2026-02-10
---

# Phase 22 Plan 02: Frontend Settings UI Summary

ISonarr model with enabled/sonarr_url/sonarr_api_key, ConfigService.testSonarrConnection() method, and *arr Integration accordion section in Settings page with enable toggle, URL/API Key fields, and Test Connection button with inline result feedback.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Add ISonarr interface and SonarrRecord to config model | 587e8de | config.ts |
| 2 | Add testSonarrConnection method to ConfigService | 0b53f93 | config.service.ts |
| 3 | Add *arr Integration section to settings template | 2b89bbc | settings-page.component.html |
| 4 | Add test connection logic and state to settings component | b5c9246 | settings-page.component.ts |
| 5 | Add test connection styles | 5f85795 | settings-page.component.scss |

## What Was Built

### ISonarr Config Model (Task 1)
- `ISonarr` interface with 3 fields: `enabled` (boolean), `sonarr_url` (string), `sonarr_api_key` (string)
- `DefaultSonarr` with all null defaults, `SonarrRecord` immutable record
- `IConfig` updated to include `sonarr: ISonarr` property
- `Config` constructor creates `SonarrRecord` with backward-compatible fallback to `DefaultSonarr`

### ConfigService Test Method (Task 2)
- `SONARR_TEST_URL` constant: `/server/config/sonarr/test-connection`
- `testSonarrConnection()` returns `Observable<WebReaction>` via existing `RestService.sendRequest`
- No parameters needed -- backend reads URL/API key from persisted config

### *arr Integration Template (Task 3)
- Custom accordion card in left column, after Archive Extraction section
- "Enable Sonarr Integration" checkbox toggle always interactive (outside fieldset)
- Sonarr URL text field with description "e.g. http://localhost:8989"
- Sonarr API Key password field with description about finding key in Sonarr settings
- HTML5 `<fieldset [attr.disabled]>` disables URL, API Key, and Test Connection when toggle OFF
- Test Connection button with "Testing..." loading state
- Inline result div with `text-success`/`text-danger` Bootstrap classes

### Component Logic (Task 4)
- `OptionType` imported and exposed as public property for template binding
- `NgIf` added to standalone imports for `*ngIf` directives
- `testConnectionLoading` (boolean) and `testConnectionResult` ({success, message} or null) state properties
- `onTestSonarrConnection()` handler with two-level error handling: HTTP errors and Sonarr API errors
- `ChangeDetectorRef.markForCheck()` called before and after async operation for OnPush compatibility
- JSON parsing with try/catch for defensive error handling

### Styles (Task 5)
- `.test-connection` block with `margin: 10px 20px 0` matching option component spacing
- Button: `height: 36px`, `font-size: 90%` for visual subordination to Restart button
- Result message: `margin-top: 6px`, `font-size: 85%` for compact inline feedback
- Colors handled by Bootstrap `text-success`/`text-danger` utility classes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added NgIf to standalone imports**
- **Found during:** Task 4
- **Issue:** Template uses `*ngIf` for test connection loading/result display, but `NgIf` was not in the component's standalone imports array.
- **Fix:** Added `NgIf` import from `@angular/common` and included in `imports` array.
- **Files modified:** settings-page.component.ts
- **Commit:** b5c9246

**2. [Rule 2 - Critical] Added ChangeDetectorRef for OnPush change detection**
- **Found during:** Task 4
- **Issue:** Component uses `ChangeDetectionStrategy.OnPush` but `testConnectionLoading` and `testConnectionResult` are direct property bindings (not async pipe). Without manual change detection, UI updates from the test connection Observable callback may not render.
- **Fix:** Injected `ChangeDetectorRef` and call `markForCheck()` when setting loading state and after receiving response.
- **Files modified:** settings-page.component.ts
- **Commit:** b5c9246

**3. [Rule 1 - Bug] Removed inferrable type annotation**
- **Found during:** Lint verification
- **Issue:** ESLint `@typescript-eslint/no-inferrable-types` flagged `testConnectionLoading: boolean = false` as having a trivially inferrable type.
- **Fix:** Changed to `testConnectionLoading = false` (type inferred from initializer).
- **Files modified:** settings-page.component.ts
- **Commit:** 6c91ec3

## Verification Results

- Angular production build: SUCCESS (only pre-existing warnings)
- Angular lint: CLEAN (0 errors, 0 warnings)
- Angular unit tests: 381/381 SUCCESS
- *arr Integration card present in left column after Archive Extraction
- Enable toggle outside fieldset (always interactive)
- Sonarr URL, API Key, Test Connection inside fieldset (disabled when toggle OFF)
- ISonarr interface has 3 fields (enabled, sonarr_url, sonarr_api_key)
- ConfigService.testSonarrConnection() calls /server/config/sonarr/test-connection
- SCSS .test-connection styles inside #left, #right block

## Self-Check: PASSED
