# Phase 32: Cosmetic Fixes - Research

**Researched:** 2026-02-12
**Domain:** Angular 19 frontend text/enum updates, Python backend enum extension
**Confidence:** HIGH

## Summary

Phase 32 addresses three cosmetic fixes identified during the v1.8 milestone audit. All fixes are straightforward text replacements and enum additions with no architectural complexity. The codebase already has well-established patterns for toast notifications, settings descriptions, and enum handling that make these changes low-risk.

**Primary recommendation:** Execute all three fixes as simple text/enum updates with minimal testing overhead. No new architecture or patterns needed—just find-and-replace text strings and add one enum value following existing patterns.

## Standard Stack

All work uses existing stack components already in the codebase:

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Angular | 19.x | Frontend framework | Project standard, standalone components |
| TypeScript | 5.7 | Type safety | Angular requirement, strong typing for enums |
| Python | 3.11+ | Backend language | Project standard |
| Jasmine/Karma | Angular bundled | Unit testing | Angular default test framework |

**No new dependencies required.** All fixes use existing files and patterns.

## Architecture Patterns

### Pattern 1: Toast Notification Messages
**What:** ToastService provides centralized toast display with typed methods (success, info, warning, danger).

**Current location:** `src/angular/src/app/pages/files/file-list.component.ts:139`

**Example:**
```typescript
// Source: src/angular/src/app/pages/files/file-list.component.ts
this._toastService.success("Sonarr imported: " + file.name);
```

**Fix required:** Replace hardcoded "Sonarr" with "Sonarr/Radarr" to reflect dual integration.

**Context:**
- Import detection is source-agnostic (WebhookManager receives from both Sonarr and Radarr)
- Toast fires when `ViewFile.importStatus` transitions to `IMPORTED` (regardless of source)
- Badge text already says "Imported" (correct, source-agnostic)
- Only the toast message text hardcodes "Sonarr"

### Pattern 2: Settings Descriptions
**What:** OPTIONS_CONTEXT objects define settings UI structure with descriptions shown in the settings panel.

**Current location:** `src/angular/src/app/pages/settings/options-list.ts:187-210`

**Example:**
```typescript
// Source: src/angular/src/app/pages/settings/options-list.ts
export const OPTIONS_CONTEXT_AUTODELETE: IOptionsContext = {
    header: "Auto-Delete After Import",
    id: "autodelete",
    options: [
        {
            type: OptionType.Checkbox,
            label: "Enable auto-delete",
            valuePath: ["autodelete", "enabled"],
            description: "Automatically delete local files after Sonarr import"
        },
        // ... more options
    ]
};
```

**Fix required:** Update description text to reference both Sonarr and Radarr:
- Line 195: "Automatically delete local files after Sonarr import" → "Automatically delete local files after Sonarr/Radarr import"

**Context:**
- Auto-delete feature works for both Sonarr and Radarr imports (webhook-driven, source-agnostic)
- Settings UI description should accurately reflect this dual support

### Pattern 3: Enum Value Addition
**What:** ModelFile.ImportStatus enum defines import states. Backend serializes enum to string, frontend maps string to ViewFile.ImportStatus enum.

**Current state:**
```python
# Backend: src/python/model/file.py:33-35
class ImportStatus(Enum):
    NONE = 0                    # Not tracked by Sonarr / no import detected
    IMPORTED = 1                # Imported by Sonarr
```

```typescript
// Frontend: src/angular/src/app/services/files/view-file.ts:103-106
export enum ImportStatus {
    NONE                = "none",
    IMPORTED            = "imported"
}
```

**Fix required:** Add `WAITING_FOR_IMPORT` enum value to both backend and frontend.

**Context:**
- Phase 24 research recommended deferring WAITING_FOR_IMPORT (simpler to start with NONE/IMPORTED only)
- v2.0 roadmap includes this as a planned addition
- **Important:** This is purely structural addition—no business logic changes
- The value exists for future use but is not yet set by any code path
- Serialization pipeline already handles enum mapping via `SerializeModel.__VALUES_FILE_IMPORT_STATUS`

**Serialization flow:**
1. Backend: `ModelFile.ImportStatus` enum value
2. Serialization: `serialize_model.py` maps enum to string via `__VALUES_FILE_IMPORT_STATUS` dict
3. Frontend: `model-file.service.ts` parses JSON string to `ModelFile.import_status` string field
4. Mapping: `view-file.service.ts` maps `ModelFile.import_status` to `ViewFile.ImportStatus` enum via `mapImportStatus` helper

### Anti-Patterns to Avoid
- **Don't scatter import source references:** Keep toast messages generic ("Sonarr/Radarr") not conditional ("Sonarr" if source=sonarr, "Radarr" if source=radarr). The system is source-agnostic by design.
- **Don't implement WAITING_FOR_IMPORT logic:** Only add the enum value, don't add code that sets it. That's a future enhancement.
- **Don't modify serialization structure:** The `__VALUES_FILE_IMPORT_STATUS` dict pattern is already correct—just add one entry.

## Don't Hand-Roll

This phase has no "don't hand-roll" items—all fixes are simple text updates and enum additions using existing patterns.

## Common Pitfalls

### Pitfall 1: Forgetting Enum Comments Update
**What goes wrong:** Backend enum comments still say "Imported by Sonarr" when Radarr also imports files.

**Why it happens:** Comments are easy to overlook when changing code.

**How to avoid:** Update enum value comments to reflect dual integration:
- Backend `ModelFile.ImportStatus.IMPORTED` comment: "Imported by Sonarr" → "Imported by Sonarr/Radarr" or "Imported by *arr service"
- Backend `ModelFile.ImportStatus.NONE` comment: "Not tracked by Sonarr / no import detected" → "Not tracked by *arr / no import detected"

**Warning signs:** Grep for "Sonarr" in comments returns outdated references.

### Pitfall 2: Incomplete WAITING_FOR_IMPORT Addition
**What goes wrong:** Adding enum value to backend but forgetting frontend, or vice versa. Or adding to enum but not to serialization mapping dict.

**Why it happens:** Enum addition requires changes in multiple files (backend enum, serialization mapping, frontend enum, frontend mapping helper).

**How to avoid:** Follow the checklist:
1. Backend enum: Add `WAITING_FOR_IMPORT = 2` to `ModelFile.ImportStatus` (line 33-35)
2. Backend serialization: Add `ModelFile.ImportStatus.WAITING_FOR_IMPORT: "waiting_for_import"` to `__VALUES_FILE_IMPORT_STATUS` dict (line 63-66)
3. Frontend enum: Add `WAITING_FOR_IMPORT = "waiting_for_import"` to `ViewFile.ImportStatus` (line 103-106)
4. Frontend mapping: Add `"waiting_for_import": ViewFile.ImportStatus.WAITING_FOR_IMPORT` to `mapImportStatus` helper in `view-file.service.ts`

**Warning signs:** Backend enum has 3 values but serialization dict has 2 entries. Frontend shows "undefined" import status in dev tools.

### Pitfall 3: Breaking Existing Tests
**What goes wrong:** Unit tests that mock ViewFile objects or assert on import status strings fail after enum addition.

**Why it happens:** Tests may create ViewFile instances without import_status field (relying on defaults), or assert exact enum counts.

**How to avoid:**
- Search for test files that reference `ImportStatus` or create `ViewFile` instances
- Check if any tests assert enum value counts (e.g., `expect(ImportStatus).toHaveLength(2)`)
- Run `npm test` in `src/angular` to catch breakages early

**Warning signs:** Test failures with "undefined" or "unknown enum value" errors.

### Pitfall 4: Missing Backward Compatibility
**What goes wrong:** Frontend breaks when backend sends new enum value before frontend is updated (during deployment).

**Why it happens:** Rolling updates may temporarily have mismatched frontend/backend versions.

**How to avoid:** This is already handled by the existing mapping pattern—`mapImportStatus` has a fallback to `NONE` for unknown values. Verify this fallback exists when adding new enum value.

**Current fallback (from Phase 24):**
```typescript
// view-file.service.ts
function mapImportStatus(status: string): ViewFile.ImportStatus {
    switch (status) {
        case "none": return ViewFile.ImportStatus.NONE;
        case "imported": return ViewFile.ImportStatus.IMPORTED;
        default: return ViewFile.ImportStatus.NONE;  // Fallback for unknown values
    }
}
```

**Warning signs:** Console errors "Unknown import status value" during SSE stream processing.

## Code Examples

Verified patterns from existing codebase:

### Toast Notification Pattern
```typescript
// Source: src/angular/src/app/pages/files/file-list.component.ts:119-154
this.viewFileService.files
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe(files => {
        if (this._firstEmission) {
            // First emission is initial load - record statuses without toasting
            this._firstEmission = false;
            files.forEach(file => {
                if (file.importStatus) {
                    this._prevImportStatuses.set(file.name, file.importStatus);
                }
            });
            return;
        }

        // Check for new imports
        files.forEach(file => {
            const prevStatus = this._prevImportStatuses.get(file.name);
            if (file.importStatus === ViewFile.ImportStatus.IMPORTED &&
                prevStatus !== ViewFile.ImportStatus.IMPORTED) {
                // FIX NEEDED HERE:
                this._toastService.success("Sonarr imported: " + file.name);
            }
            // Update tracked status
            if (file.importStatus) {
                this._prevImportStatuses.set(file.name, file.importStatus);
            }
        });
        // ... cleanup removed files
    });
```

### Settings Description Pattern
```typescript
// Source: src/angular/src/app/pages/settings/options-list.ts:187-210
export const OPTIONS_CONTEXT_AUTODELETE: IOptionsContext = {
    header: "Auto-Delete After Import",
    id: "autodelete",
    options: [
        {
            type: OptionType.Checkbox,
            label: "Enable auto-delete",
            valuePath: ["autodelete", "enabled"],
            // FIX NEEDED HERE:
            description: "Automatically delete local files after Sonarr import"
        },
        {
            type: OptionType.Checkbox,
            label: "Dry-run mode",
            valuePath: ["autodelete", "dry_run"],
            description: "Log what would be deleted without actually deleting"
        },
        {
            type: OptionType.Text,
            label: "Safety delay (seconds)",
            valuePath: ["autodelete", "delay_seconds"],
            description: "Wait this long after import detection before deleting (default: 60)"
        }
    ]
};
```

### Enum Addition Pattern
```python
# Backend: src/python/model/file.py:33-35
class ImportStatus(Enum):
    NONE = 0                    # Not tracked by Sonarr / no import detected
    IMPORTED = 1                # Imported by Sonarr
    # ADD: WAITING_FOR_IMPORT = 2
```

```python
# Backend serialization: src/python/web/serialize/serialize_model.py:63-66
__VALUES_FILE_IMPORT_STATUS = {
    ModelFile.ImportStatus.NONE: "none",
    ModelFile.ImportStatus.IMPORTED: "imported"
    # ADD: ModelFile.ImportStatus.WAITING_FOR_IMPORT: "waiting_for_import"
}
```

```typescript
// Frontend enum: src/angular/src/app/services/files/view-file.ts:103-106
export enum ImportStatus {
    NONE                = "none",
    IMPORTED            = "imported"
    // ADD: WAITING_FOR_IMPORT  = "waiting_for_import"
}
```

```typescript
// Frontend mapping: src/angular/src/app/services/files/view-file.service.ts
// (Location verified in Phase 24 implementation)
function mapImportStatus(status: string): ViewFile.ImportStatus {
    switch (status) {
        case "none": return ViewFile.ImportStatus.NONE;
        case "imported": return ViewFile.ImportStatus.IMPORTED;
        // ADD: case "waiting_for_import": return ViewFile.ImportStatus.WAITING_FOR_IMPORT;
        default: return ViewFile.ImportStatus.NONE;
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sonarr-only integration | Sonarr + Radarr dual integration | v1.8 (Phase 26-27) | UI text still references only Sonarr in places |
| Polling-based import detection | Webhook-based import detection | v1.8 (Phase 27) | Faster detection, source-agnostic design |
| WAITING_FOR_IMPORT enum deferred | Added in v2.0 (Phase 32) | v2.0 | Structural addition for future logic |

**Deprecated/outdated:**
- References to "Sonarr import" should say "Sonarr/Radarr import" or "*arr import"
- Phase 24 research recommended deferring WAITING_FOR_IMPORT—v2.0 adds it as planned enhancement

## Open Questions

1. **Should WAITING_FOR_IMPORT use value 1 or 2?**
   - What we know: NONE=0, IMPORTED=1 currently
   - What's unclear: Whether to insert WAITING_FOR_IMPORT as value 1 (before IMPORTED) or value 2 (after IMPORTED)
   - Recommendation: Use value 2 (after IMPORTED) to avoid breaking existing serialized data. Ordering should be: NONE (0), IMPORTED (1), WAITING_FOR_IMPORT (2). This matches semantic progression: not detected → detected and imported → detected but waiting.

2. **Should toast message be "Sonarr/Radarr" or "*arr"?**
   - What we know: Settings descriptions use "*arr" pattern elsewhere, toast currently says "Sonarr"
   - What's unclear: User preference for readability ("Sonarr/Radarr" is explicit, "*arr" is concise)
   - Recommendation: Use "Sonarr/Radarr" for clarity. Most users unfamiliar with "*arr" notation. Explicit is better than terse for user-facing messages.

3. **Do any E2E tests check toast text?**
   - What we know: Playwright E2E tests exist in `src/angular/e2e/` and `src/e2e/`
   - What's unclear: Whether any tests assert on exact toast message text
   - Recommendation: Search for "Sonarr imported" in E2E test files. Update assertions if found. Low probability—E2E tests typically check presence, not exact text.

## Sources

### Primary (HIGH confidence)
- `src/angular/src/app/pages/files/file-list.component.ts` - Toast notification implementation
- `src/angular/src/app/pages/settings/options-list.ts` - Settings descriptions
- `src/python/model/file.py` - Backend ModelFile enum definition
- `src/python/web/serialize/serialize_model.py` - Enum serialization mapping
- `src/angular/src/app/services/files/view-file.ts` - Frontend ViewFile enum
- `.planning/v1.8-MILESTONE-AUDIT.md` - Documented cosmetic issues requiring fix
- `.planning/phases/24-status-visibility-notifications/24-RESEARCH.md` - WAITING_FOR_IMPORT deferral rationale

### Secondary (MEDIUM confidence)
- `.planning/phases/27-webhook-import-detection/27-RESEARCH.md` - Webhook implementation context (source-agnostic design)
- `.planning/milestones/v2.0-ROADMAP.md` - Phase 32 requirements specification

### Tertiary (LOW confidence)
- None—all findings verified with codebase inspection

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All existing dependencies, no new libraries
- Architecture: HIGH - Straightforward text replacement and enum addition patterns
- Pitfalls: HIGH - Identified from codebase structure and Phase 24 implementation history

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days - stable codebase area, low churn expected)
