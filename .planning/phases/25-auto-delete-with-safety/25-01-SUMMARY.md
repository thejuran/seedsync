---
phase: 25-auto-delete-with-safety
plan: 01
subsystem: config
tags: [config, auto-delete, settings-ui, backend, frontend]
dependency_graph:
  requires: []
  provides: [Config.AutoDelete, IAutoDelete, OPTIONS_CONTEXT_AUTODELETE]
  affects: [settings-page, config-service]
tech_stack:
  added: []
  patterns: [InnerConfig section, backward-compatible optional section, Immutable.js Record]
key_files:
  created: []
  modified:
    - src/python/common/config.py
    - src/python/seedsync.py
    - src/angular/src/app/services/settings/config.ts
    - src/angular/src/app/pages/settings/options-list.ts
    - src/angular/src/app/pages/settings/settings-page.component.html
    - src/angular/src/app/pages/settings/settings-page.component.ts
decisions:
  - Config.AutoDelete uses Checkers.null for enabled/dry_run (same pattern as Sonarr.enabled)
  - delay_seconds uses Checkers.int_positive (must be > 0)
  - AutoDelete section optional in from_dict for backward compatibility with older config files
  - Frontend uses standard #optionsList template (no custom card needed like *arr Integration)
  - AutoDelete section placed after *arr Integration card in left column
metrics:
  duration: 3m
  completed: 2026-02-10
  tasks: 2
  files: 6
---

# Phase 25 Plan 01: Config.AutoDelete Section Summary

Config.AutoDelete InnerConfig with enabled/dry_run/delay_seconds, frontend IAutoDelete Record, and settings UI accordion section with 3 controls.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 24a9698 | Add Config.AutoDelete InnerConfig section and default values |
| 2 | 9929c51 | Add frontend AutoDelete config model and settings UI section |

## What Was Built

### Backend (Task 1)

- **Config.AutoDelete class** in `config.py` with 3 typed properties:
  - `enabled` (bool, Checkers.null) - opt-in toggle
  - `dry_run` (bool, Checkers.null) - safety toggle
  - `delay_seconds` (int, Checkers.int_positive) - safety delay
- **Backward-compatible parsing** in `Config.from_dict` - optional `AutoDelete` section
- **Serialization** in `Config.as_dict` and roundtrip via `to_str`/`from_str`
- **Default values** in `seedsync.py._create_default_config`: enabled=False, dry_run=False, delay_seconds=60

### Frontend (Task 2)

- **IAutoDelete interface** in `config.ts` with enabled, dry_run, delay_seconds fields
- **AutoDeleteRecord** with backward-compatible constructor fallback (DefaultAutoDelete if missing)
- **OPTIONS_CONTEXT_AUTODELETE** in `options-list.ts` with 3 controls:
  - Checkbox: Enable auto-delete
  - Checkbox: Dry-run mode
  - Text: Safety delay (seconds)
- **Settings page** accordion section "Auto-Delete After Import" in left column after *arr Integration

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. Python config roundtrip: AutoDelete values serialize and deserialize correctly
2. Backward compatibility: Old config dict without AutoDelete section parses without error (autodelete properties are None)
3. Angular production build: Succeeds with only pre-existing warnings
4. TypeScript compilation: Zero errors

## Self-Check: PASSED

All 6 files found, both commits verified, all content markers present.
