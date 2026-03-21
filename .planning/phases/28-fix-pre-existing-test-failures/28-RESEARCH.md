# Phase 28: Fix Pre-existing Test Failures - Research

**Researched:** 2026-02-11
**Domain:** Angular unit test maintenance, ModelFile test expectations, import_status field compatibility
**Confidence:** COMPLETE (Tests already fixed)

## Summary

Phase 28 was planned to fix 3 pre-existing test failures in `model-file.service.spec.ts` that were documented during v1.7 milestone work. However, these failures were already fixed during Phase 24 execution on 2026-02-10 in commit 428bd18.

The root cause was that Phase 24 added a new `import_status` property to the ModelFile class (with a default value of `ImportStatus.NONE`). The `fromJson()` parser automatically defaults this field to NONE when missing from JSON, but manually constructed expected ModelFile objects in the tests had null values. This caused Immutable.is() equality checks to fail.

The fix was simple: add `import_status: ModelFile.ImportStatus.NONE` to all manually constructed expected ModelFile objects in the test file to match the parser's output.

**Current status:** All 381 Angular unit tests passing. Zero failures. Phase 28 requirements already fulfilled.

## What Was Already Fixed

### The Issue (Pre-Phase 24)

Before Phase 24, ModelFile had no `import_status` field. The test file created expected ModelFile objects manually like this:

```typescript
const expectedModelFiles = [
    new ModelFile({
        name: "File.One",
        is_dir: false,
        local_size: 1234,
        remote_size: 4567,
        state: ModelFile.State.DEFAULT,
        downloading_speed: 99,
        eta: 54,
        full_path: "/full/path/to/file.one",
        // import_status missing (implicitly null)
        children: Immutable.Set<ModelFile>()
    })
];
```

### The Breaking Change (Phase 24-01)

Phase 24-01 added the `import_status` field to ModelFile with these key behaviors:

1. **ModelFile interface:** Added `import_status: ModelFile.ImportStatus` property
2. **fromJson parser:** Defaults to `ImportStatus.NONE` when field missing (line 123-125 in model-file.ts)
3. **Default value:** `import_status: null` in DefaultModelFile record (line 59)

This created a mismatch in the tests:
- **JSON-parsed objects:** Had `import_status: ImportStatus.NONE` (from parser fallback)
- **Manually constructed objects:** Had `import_status: null` (from default record)
- **Equality check:** `Immutable.is(actual, expected)` failed because `NONE !== null`

### The Fix (Commit 428bd18, 2026-02-10)

Added `import_status: ModelFile.ImportStatus.NONE` to 4 manually constructed expected ModelFile objects:

**File:** `src/angular/src/app/tests/unittests/services/files/model-file.service.spec.ts`

**Lines modified:**
- Line 85: "should send correct model on an init event" test
- Line 149: "should send correct model on an added event" test (File.One)
- Line 161: "should send correct model on an added event" test (File.Two)
- Line 285: "should send correct model on an updated event" test

**Pattern:**
```typescript
const expectedModelFiles = [
    new ModelFile({
        name: "File.One",
        is_dir: false,
        local_size: 1234,
        remote_size: 4567,
        state: ModelFile.State.DEFAULT,
        downloading_speed: 99,
        eta: 54,
        full_path: "/full/path/to/file.one",
        import_status: ModelFile.ImportStatus.NONE,  // ADDED
        children: Immutable.Set<ModelFile>()
    })
];
```

## Verification Results (2026-02-11)

Ran full Angular test suite to confirm fix:

```bash
cd src/angular && npm test -- --watch=false --browsers=ChromeHeadless
```

**Results:**
- ✅ Total: 381 tests
- ✅ Passed: 381 tests (100%)
- ✅ Failed: 0 tests
- ✅ Execution time: 0.278 seconds
- ✅ Specific file: model-file.service.spec.ts - 17/17 tests passing

**Tests in model-file.service.spec.ts:**
1. ✅ should create an instance
2. ✅ should register all events with the event source
3. ✅ should send correct model on an init event
4. ✅ should send correct model on an added event
5. ✅ should send correct model on a removed event
6. ✅ should send correct model on an updated event
7. ✅ should send empty model on disconnect
8. ✅ should send a GET on queue command
9. ✅ should send correct GET requests on queue command
10. ✅ should send a GET on stop command
11. ✅ should send correct GET requests on stop command
12. ✅ should send a GET on extract command
13. ✅ should send correct GET requests on extract command
14. ✅ should send a GET on delete local command
15. ✅ should send correct GET requests on delete local command
16. ✅ should send a GET on delete remote command
17. ✅ should send correct GET requests on delete remote command

## Why This Pattern Is Standard

### Pattern: Test Expectation Alignment with Parser Defaults

**What:** When a model class has a parser with default values, test expectations must match those defaults exactly.

**Why it matters:**
- Immutable.js equality checks compare every field, including defaults
- Null !== enum value (NONE), even if semantically equivalent
- Parser fallbacks create implicit contract for missing fields

**When to use:**
- Always when testing models with fromJson() parsers
- Any time a new field is added to an existing model
- When comparing manually constructed objects to parsed objects

**Example from SeedSync:**
```typescript
// WRONG: Will fail equality check
new ModelFile({
    name: "test",
    state: ModelFile.State.DEFAULT,
    // import_status implicitly null
    children: Immutable.Set<ModelFile>()
})

// CORRECT: Matches parser default
new ModelFile({
    name: "test",
    state: ModelFile.State.DEFAULT,
    import_status: ModelFile.ImportStatus.NONE,  // Explicit default
    children: Immutable.Set<ModelFile>()
})
```

**Source:**
- [Immutable.js equality semantics](https://immutable-js.com/docs/v4.3.7/is/) - Structural equality checks all fields
- Commit 428bd18 - Real-world fix in SeedSync codebase
- model-file.ts lines 123-125 - Parser fallback logic

## Documentation Trail

The "3 pre-existing failures" were documented in multiple planning files during v1.7 milestone:

| File | Reference | Date |
|------|-----------|------|
| .planning/v1.7-MILESTONE-AUDIT.md | Line 17, 103 | Phase 24 summary |
| .planning/REQUIREMENTS.md | Line 31 | TEST-01 requirement |
| .planning/STATE.md | Line 77 | Known tech debt |
| .planning/ROADMAP.md | Line 149, 155 | Phase 28 definition |
| .planning/phases/24-status-visibility-notifications/24-02-SUMMARY.md | Line 78 | Noted during verification |
| .planning/phases/26-radarr-config-shared-arr-settings-ui/26-02-PLAN.md | Line 233 | Verification notes |

All documentation correctly identified these as "pre-existing" (unrelated to the current phase work) and tracked them for Phase 28.

## Why The Failures Occurred During Phase 24

### Timeline

1. **Phase 24-01 (2026-02-10):** Added `import_status` field to ModelFile
   - Commit a613da8: Added ImportStatus enum to backend ModelFile
   - Commit 9a3301a: Added import_status to frontend ModelFile
   - Parser defaulted missing field to NONE (backward compatibility)

2. **Phase 24-02 verification:** Ran Angular unit tests
   - 378 tests passed
   - 3 tests failed in model-file.service.spec.ts
   - Failures noted as "pre-existing, unrelated to v1.7 work"
   - Actually: failures were CAUSED by 24-01, not pre-existing

3. **Phase 24 completion (2026-02-10):** Fixed before closing phase
   - Commit 428bd18: Added import_status to test expectations
   - All 381 tests passing
   - Phase 24-02 summary updated with test count

### Why "Pre-existing" Was a Misnomer

The failures were labeled "pre-existing" in Phase 24 documentation because:
- They appeared during Phase 24 verification but seemed unrelated to Phase 24 work
- The test file `model-file.service.spec.ts` was not modified by Phase 24-02 (only 24-01)
- The actual cause (missing import_status in test expectations) was not immediately obvious

**Reality:** The failures were NOT pre-existing. They were directly caused by Phase 24-01 adding the new field. The fix was correctly identified and applied before closing Phase 24.

**Lesson:** When a new optional field is added to a model with default values, all test expectations for that model must be updated in the same phase, even if those tests are in a different file.

## Requirements Fulfilled

Both Phase 28 requirements are already complete:

- ✅ **TEST-01**: Fix 3 pre-existing failures in model-file.service.spec.ts
  - **Status:** Fixed in commit 428bd18 (2026-02-10)
  - **Verification:** All 17 tests in file passing

- ✅ **TEST-02**: All Angular unit tests pass (0 failures)
  - **Status:** All 381 tests passing
  - **Verification:** Full test suite run on 2026-02-11

## Estimated Scope for Documentation

Since the work is already complete, Phase 28 execution consists only of:

**Plans needed:** 1 plan
- 28-01: Document the fix that was already applied

**Files to document:** 1 file
- src/angular/src/app/tests/unittests/services/files/model-file.service.spec.ts (already modified)

**Commits to reference:** 1 commit
- 428bd18: fix(24): add import_status to expected ModelFile objects in model-file.service.spec.ts

**Testing needed:** None (tests already passing)

**Estimated duration:** < 5 minutes (documentation only)

## Success Criteria

All success criteria already met:

1. ✅ All 3 pre-existing failures in model-file.service.spec.ts fixed
2. ✅ All Angular unit tests pass (381 tests, 0 failures)
3. ✅ No regressions in other test files
4. ✅ Test expectations match ModelFile parser defaults
5. ✅ Fix is minimal and surgical (4 lines added)
6. ✅ Pattern is documented for future field additions

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Fix correctness | COMPLETE | All tests passing, verified on 2026-02-11 |
| Root cause analysis | HIGH | Clear mismatch between parser default and test expectation |
| Pattern documentation | HIGH | Standard practice for Immutable.js equality testing |
| No regressions | COMPLETE | Full test suite passing (381/381) |

**Overall confidence:** COMPLETE

**Primary insight:** Phase 28 is already done. The "pre-existing" failures were actually caused and fixed during Phase 24. Phase 28 execution should simply document the existing fix for completeness.

## Sources

### Primary (COMPLETE confidence)

- Commit 428bd18 (2026-02-10) - The actual fix
- Git log showing test file history
- Live test run output (2026-02-11) - All 381 tests passing
- model-file.ts source code - Parser default logic (lines 123-125)

### Secondary (HIGH confidence)

- .planning/phases/24-status-visibility-notifications/24-01-SUMMARY.md - Phase 24-01 adding import_status field
- .planning/phases/24-status-visibility-notifications/24-02-SUMMARY.md - Documentation of "pre-existing" failures
- Immutable.js documentation - Equality semantics

---

*Research completed: 2026-02-11*
*Ready for planning: YES*
*Status: Tests already fixed during Phase 24*

**Next step:** Create execution plan 28-01 documenting the fix that was already applied in commit 428bd18.
