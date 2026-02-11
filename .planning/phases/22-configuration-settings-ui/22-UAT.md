---
status: complete
phase: 22-configuration-settings-ui
source: 22-01-SUMMARY.md, 22-02-SUMMARY.md
started: 2026-02-10T12:00:00Z
updated: 2026-02-10T12:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Sonarr Section Visible in Settings
expected: Open the Settings page. In the left column, after Archive Extraction, there is an "*arr Integration" accordion card.
result: pass

### 2. Enable Toggle Controls Field Access
expected: The "*arr Integration" card has an "Enable Sonarr Integration" checkbox. When OFF, the Sonarr URL, API Key, and Test Connection button are greyed out / disabled. When ON, they become interactive.
result: pass

### 3. Sonarr URL and API Key Fields
expected: With the toggle ON, you see a "Sonarr URL" text field (placeholder like "http://localhost:8989") and a "Sonarr API Key" password field. You can type values into both.
result: pass

### 4. Test Connection - Success
expected: Enter a valid Sonarr URL and API key, save (fields auto-save), then click "Test Connection". Button shows "Testing..." while loading, then an inline green success message appears with the Sonarr version.
result: pass

### 5. Test Connection - Failure
expected: Enter an invalid URL or API key, save, then click "Test Connection". An inline red error message appears (e.g., "Connection refused", "Invalid API key", or similar).
result: pass

### 6. Config Persists After Reload
expected: Enable Sonarr, enter a URL and API key, then reload the page. The toggle remains ON and the URL/API key values are preserved.
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

- truth: "User can see *arr Integration section and enable Sonarr integration toggle works"
  status: failed
  reason: "User reported: enable button for feature not working. Checkbox does not respond at all - nothing happens on click."
  severity: major
  test: 1
  root_cause: "Two compounding issues: (1) Existing installs have no [Sonarr] section in config .ini, so from_dict leaves sonarr.enabled=None. Frontend OptionComponent disables checkbox when value==null. (2) Even on new installs, debounceTime(1000) on checkbox changes causes visual revert before API round-trip."
  artifacts:
    - path: "src/python/common/config.py"
      issue: "from_dict leaves Sonarr properties as None for existing configs missing [Sonarr] section"
    - path: "src/angular/src/app/pages/settings/option.component.html"
      issue: "[disabled]='value == null' prevents clicking checkbox when backend sends null"
  missing:
    - "Default sonarr.enabled to False (not None) in Config.__init__ or from_dict fallback"
    - "Same fix needed for AutoDelete section defaults"
  debug_session: ".planning/phases/22-configuration-settings-ui/debug-enable-toggle.md"
