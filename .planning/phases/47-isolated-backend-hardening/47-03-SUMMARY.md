---
phase: 47-isolated-backend-hardening
plan: "03"
subsystem: security
tags: [regex, sse, redaction, ssh, lftp, log-stream]

# Dependency graph
requires: []
provides:
  - SSH topology redaction in SSE log stream (_redact_sensitive)
  - sftp:// URL pattern strips user@host from LFTP connection strings
  - bare user@host pattern strips SSH/SCP command output tokens
  - False-positive safety: filenames with @ (e.g. file@720p.mkv) are not redacted
affects: [48-isolated-backend-hardening, 49-isolated-backend-hardening, 50-isolated-backend-hardening]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "lookbehind regex (?<=[whitespace/quote/bracket]) to scope bare user@host tokens without false-positiving filenames"
    - "RHS hostname must start with a letter (not digit) to distinguish hosts from version strings"

key-files:
  created: []
  modified:
    - src/python/web/serialize/serialize_log_record.py
    - src/python/tests/unittests/test_web/test_serialize/test_serialize_log_record.py

key-decisions:
  - "Pattern B RHS changed from [\\w.\\-]+ to [a-zA-Z][\\w.\\-]* so version filenames (release@1.0.tar.gz) are not redacted — hostnames start with letters, version strings start with digits"
  - "Two-pattern approach: Pattern A for sftp:// URLs (scoped by scheme prefix), Pattern B for bare user@host tokens (scoped by lookbehind) — avoids a single complex regex"

patterns-established:
  - "TDD: write failing tests before implementation; verify RED state before writing GREEN code"
  - "_redact_sensitive() tested directly as @staticmethod — cleaner than full LogRecord pipeline for regex unit tests"

requirements-completed: [LOG-01, LOG-02, LOG-03]

# Metrics
duration: 2min
completed: 2026-02-25
---

# Phase 47 Plan 03: SSH Topology Redaction Summary

**Two-regex SSH topology redaction in _redact_sensitive(): sftp:// URLs and bare user@host tokens scrubbed from SSE log stream without false-positiving filenames containing @**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-25T23:38:53Z
- **Completed:** 2026-02-25T23:41:14Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added `TestRedactSensitive` class with 8 test methods covering redaction (LOG-01, LOG-02) and false-positive safety (LOG-03)
- Implemented Pattern A: `sftp://\S+@\S+` redacts LFTP sftp:// connection URL entirely while preserving the `sftp://` scheme prefix
- Implemented Pattern B: lookbehind-scoped `user@host` redaction for SSH/SCP command output; RHS must start with a letter to exclude version-string filenames
- All 14 tests pass (6 original + 8 new)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests for SSH topology redaction** - `97bb7d0` (test)
2. **Task 2: Implement SSH topology redaction in _redact_sensitive()** - `b7c5a40` (feat)

## Files Created/Modified
- `src/python/web/serialize/serialize_log_record.py` - Extended `_redact_sensitive()` with two new SSH topology regex patterns and updated docstring
- `src/python/tests/unittests/test_web/test_serialize/test_serialize_log_record.py` - Added `TestRedactSensitive` class with 8 test methods

## Decisions Made
- Pattern B's RHS match character class changed from `[\w.\-]+` (plan spec) to `[a-zA-Z][\w.\-]*` (implementation): the plan's example regex false-positived on `release@1.0.tar.gz` because `release` is preceded by a space (satisfying the lookbehind) and `1.0` matches `[\w.\-]+`. Requiring the RHS to start with a letter correctly excludes version strings while accepting hostnames.
- Kept the two-pattern approach (sftp:// URL + bare token) rather than collapsing into one regex — each pattern has a clear scope and they remain independently maintainable.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Pattern B false-positive on version-style filenames**
- **Found during:** Task 2 (Implement SSH topology redaction)
- **Issue:** Plan's Pattern B regex `(?<=[\s'"\[])(\w[\w.\-]*)@([\w.\-]+)` matched `release@1.0.tar.gz` because `release` is preceded by a space (satisfying the lookbehind) and `1.0.tar` matches `[\w.\-]+` — causing `test_no_redact_filename_at_version` to fail
- **Fix:** Changed RHS character class from `[\w.\-]+` to `[a-zA-Z][\w.\-]*` — hostnames always start with a letter, version strings start with a digit
- **Files modified:** `src/python/web/serialize/serialize_log_record.py`
- **Verification:** All 14 tests pass including `test_no_redact_filename_at_version`; manual Python invocation confirms `release@1.0.tar.gz` unchanged
- **Committed in:** `b7c5a40` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — regex bug)
**Impact on plan:** Essential fix for LOG-03 correctness. No scope creep.

## Issues Encountered
- `poetry` not in default PATH — resolved by using full path `/Users/julianamacbook/Library/Python/3.12/bin/poetry`

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- SSH topology redaction complete for SSE log stream
- `_redact_sensitive()` now handles four threat classes: LFTP -u password, generic password= patterns, sftp:// URLs, bare user@host tokens
- Ready for remaining Phase 47 plans

---
*Phase: 47-isolated-backend-hardening*
*Completed: 2026-02-25*
