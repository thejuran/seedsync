---
status: complete
phase: hotfix-webhook-child-matching
source: debug session (webhook-import-no-action)
started: 2026-02-12T16:00:00Z
updated: 2026-02-14T17:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Child file webhook import triggers import flow
expected: When Sonarr/Radarr imports a child file (episode inside a show directory), the webhook matches it to the root directory and tags it as imported. Log shows: "Sonarr import detected: '<file>' (matched SeedSync file '<root dir>')"
result: pass

### 2. Imported file auto-deletes after safety delay
expected: After the import is detected and safety delay elapses, the local file is automatically deleted. The file should disappear from the local filesystem.
result: pass

### 3. No-match webhook logs WARNING
expected: If a webhook fires for a file not in the SeedSync model at all, you should see a WARNING-level log: "Sonarr webhook file '<name>' not found in SeedSync model (checked N names including children)" — visible at default INFO log level.
result: skipped
reason: Not practical to trigger in production right now

## Summary

total: 3
passed: 2
issues: 0
pending: 0
skipped: 1

## Gaps

[none]
