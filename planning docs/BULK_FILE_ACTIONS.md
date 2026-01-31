# Bulk File Actions Feature

## Quick Reference

| Item | Value |
|------|-------|
| **Feature Branch** | `claude/bulk-file-actions-dxsgE` |
| **Status** | 🟡 Planning Complete |
| **Current Session** | Not started |
| **Total Sessions** | 10 estimated |

---

## Design Summary

**What:** Select multiple files in dashboard, apply actions to all selected.

**Selection UI:**
- Checkbox per row, header checkbox for "select all visible"
- Banner: "Select all X matching filter" for unseen files
- Selection clears on filter change
- Keyboard: `Ctrl+A` (select all), `Escape` (clear), `Shift+click` (range)

**Actions Bar (when files selected):**
```
[5 files selected] [Queue (3)] [Stop (0)] [Extract (2)] [Delete Local (4)] [Delete Remote (3)] [Clear]
```
- Counts show applicable files; disabled when 0
- Confirmation dialog for delete actions only

**API:**
```
POST /server/command/bulk
Body: { "action": "queue", "files": ["file1", "file2"] }
Response: { "results": [...], "summary": { "total": 3, "succeeded": 2, "failed": 1 } }
```

---

## Sessions

### Session 1: Backend Bulk Endpoint
**Scope:** Add `/server/command/bulk` endpoint and handler
**Estimated effort:** Small
**Dependencies:** None

**Tasks:**
- [ ] Add route in `src/python/web/handler/controller.py`
- [ ] Add `handle_bulk_command()` in `src/python/controller/controller.py`
- [ ] Validate action enum and files array
- [ ] Loop through files, call existing handlers, collect results
- [ ] Return itemized results + summary
- [ ] Add unit tests in `src/python/tests/unittests/test_controller/`

**Context to read:**
- `src/python/web/handler/controller.py` (existing command routes)
- `src/python/controller/controller.py` (existing `__handle_*_command` methods)

**Acceptance criteria:**
- Bulk endpoint accepts valid actions and file lists
- Returns 400 for invalid input
- Partial failures don't stop other files
- Response includes per-file results and summary

---

### Session 2: Selection Service
**Scope:** Create Angular service for selection state management
**Estimated effort:** Small
**Dependencies:** None

**Tasks:**
- [ ] Create `src/angular/src/app/services/files/file-selection.service.ts`
- [ ] Implement: `select()`, `deselect()`, `toggle()`, `selectMultiple()`
- [ ] Implement: `selectAllVisible()`, `selectAllMatchingFilter()`, `clearSelection()`
- [ ] Implement: `isSelected()`, `getSelectedCount()`, `getSelectedFiles()`
- [ ] Use `BehaviorSubject<Set<string>>` for reactive state
- [ ] Add `selectAllMatching` flag for "all matching filter" mode
- [ ] Add unit tests

**Context to read:**
- `src/angular/src/app/services/files/view-file.service.ts` (pattern reference)

**Acceptance criteria:**
- Service tracks selected files by name
- Observables emit on selection changes
- "Select all matching" mode tracked separately

---

### Session 3: Clear Selection on Filter Change
**Scope:** Wire selection service to clear when filters change
**Estimated effort:** Small
**Dependencies:** Session 2

**Tasks:**
- [ ] Inject `FileSelectionService` into `ViewFileService`
- [ ] Identify where filter/sort changes occur
- [ ] Call `clearSelection()` on filter/sort changes
- [ ] Add unit tests

**Context to read:**
- `src/angular/src/app/services/files/view-file.service.ts`
- `src/angular/src/app/services/files/file-selection.service.ts` (from Session 2)

**Acceptance criteria:**
- Selection clears when filter changes
- Selection clears when sort changes

---

### Session 4: Checkbox UI - Header and Rows
**Scope:** Add checkboxes to file list header and rows
**Estimated effort:** Medium
**Dependencies:** Session 2

**Tasks:**
- [ ] Add checkbox column to file list header in `file-list.component.html`
- [ ] Implement header checkbox logic (checked/indeterminate states)
- [ ] Add checkbox to each file row in `file.component.html`
- [ ] Wire checkboxes to `FileSelectionService`
- [ ] Add `.selected` class to selected rows
- [ ] Add basic checkbox column styling

**Context to read:**
- `src/angular/src/app/pages/files/file-list.component.ts` and `.html`
- `src/angular/src/app/pages/files/file.component.ts` and `.html`
- `src/angular/src/app/services/files/file-selection.service.ts`

**Acceptance criteria:**
- Checkboxes appear on each row
- Header checkbox selects/deselects all visible
- Header shows indeterminate when some selected
- Selected rows visually highlighted

---

### Session 5: Selection Banner
**Scope:** Create banner showing selection count and "select all matching"
**Estimated effort:** Small
**Dependencies:** Session 4

**Tasks:**
- [ ] Create `src/angular/src/app/pages/files/selection-banner.component.ts`
- [ ] Show "X files selected" when selection exists
- [ ] Show "Select all Y matching filter" link when all visible selected
- [ ] Add "Clear selection" button
- [ ] Integrate into file list page
- [ ] Style the banner

**Context to read:**
- `src/angular/src/app/pages/files/file-list.component.ts`
- `src/angular/src/app/services/files/file-selection.service.ts`

**Acceptance criteria:**
- Banner appears when ≥1 file selected
- Shows accurate count
- "Select all matching" appears after selecting all visible
- Clear button works

---

### Session 6: Keyboard Shortcuts and Range Selection
**Scope:** Add Ctrl+A, Escape, Shift+click
**Estimated effort:** Small
**Dependencies:** Session 4

**Tasks:**
- [ ] Add `@HostListener` for keyboard events in file list
- [ ] Implement `Ctrl/Cmd+A` to select all visible
- [ ] Implement `Escape` to clear selection
- [ ] Track last clicked row index
- [ ] Implement `Shift+click` for range selection
- [ ] Add unit tests

**Context to read:**
- `src/angular/src/app/pages/files/file-list.component.ts`
- `src/angular/src/app/services/files/file-selection.service.ts`

**Acceptance criteria:**
- Ctrl+A selects all visible files
- Escape clears selection
- Shift+click selects range from last clicked

---

### Session 7: Bulk Actions Bar
**Scope:** Create action bar with buttons showing applicable counts
**Estimated effort:** Medium
**Dependencies:** Session 5

**Tasks:**
- [ ] Create `src/angular/src/app/pages/files/bulk-actions-bar.component.ts`
- [ ] Calculate counts: queueable, stoppable, extractable, deletable
- [ ] Display buttons with counts: `[Queue (3)]`
- [ ] Disable buttons when count is 0
- [ ] Wire up click handlers (no API calls yet)
- [ ] Integrate into file list page
- [ ] Style the action bar

**Context to read:**
- `src/angular/src/app/services/files/view-file.service.ts` (action eligibility flags)
- `src/angular/src/app/services/files/file-selection.service.ts`
- `src/angular/src/app/pages/files/file-list.component.ts`

**Acceptance criteria:**
- Bar appears when files selected
- Counts accurately reflect eligible files
- Buttons disabled when count is 0

---

### Session 8: Confirmation Dialog
**Scope:** Create reusable confirmation dialog for delete actions
**Estimated effort:** Small
**Dependencies:** None (can run in parallel with others)

**Tasks:**
- [ ] Create `src/angular/src/app/common/confirmation-dialog/` component
- [ ] Accept: title, message, skipCount, confirmText, isDangerous
- [ ] Return Promise<boolean> for confirm/cancel
- [ ] Style with Bootstrap modal classes
- [ ] Use danger button style for destructive actions
- [ ] Add unit tests

**Context to read:**
- Existing modal usage in the app (if any)
- Bootstrap 5 modal documentation

**Acceptance criteria:**
- Dialog displays with provided content
- Shows skip count if provided
- Confirm/cancel returns appropriate value
- Danger styling for destructive actions

---

### Session 9: Bulk Action Execution
**Scope:** Wire actions to API, add toast notifications
**Estimated effort:** Medium
**Dependencies:** Sessions 1, 7, 8

**Tasks:**
- [ ] Create `src/angular/src/app/services/server/bulk-command.service.ts`
- [ ] Implement `executeBulkAction(action, files)` calling bulk endpoint
- [ ] Wire bulk actions bar buttons to service
- [ ] Show confirmation dialog for delete actions
- [ ] Add/update notification service for toast messages
- [ ] Show success toast with counts
- [ ] Show warning toast on partial failure
- [ ] Clear selection after successful action
- [ ] Add progress indicator for 50+ files

**Context to read:**
- `src/angular/src/app/services/server/server-command.service.ts` (pattern reference)
- `src/angular/src/app/pages/files/bulk-actions-bar.component.ts`
- `src/angular/src/app/common/confirmation-dialog/`

**Acceptance criteria:**
- Actions call bulk API
- Delete shows confirmation first
- Toast shows success/partial failure
- Selection clears after action
- Large operations show progress

---

### Session 10: E2E Tests and Polish
**Scope:** Add E2E tests, final styling, edge cases
**Estimated effort:** Medium
**Dependencies:** All previous sessions

**Tasks:**
- [ ] Create `src/e2e/tests/bulk-actions.spec.ts`
- [ ] Test checkbox selection
- [ ] Test header checkbox behavior
- [ ] Test "select all matching" banner
- [ ] Test keyboard shortcuts
- [ ] Test shift+click range selection
- [ ] Test each bulk action
- [ ] Test confirmation dialogs
- [ ] Test toast notifications
- [ ] Polish styling and transitions
- [ ] Test edge cases (empty selection, all fail, etc.)

**Context to read:**
- `src/e2e/tests/` (existing E2E test patterns)
- All components created in previous sessions

**Acceptance criteria:**
- All E2E tests pass
- No visual regressions
- Edge cases handled gracefully

---

## Session Log

_Record completed sessions here with date, outcome, and learnings._

| Session | Date | Outcome | Notes |
|---------|------|---------|-------|
| Planning | 2026-01-31 | ✅ Complete | Initial plan created |

---

## Learnings

_Document technical discoveries, gotchas, and decisions made during implementation._

### Technical Notes
- (none yet)

### Gotchas
- (none yet)

### Design Decisions Made During Implementation
- (none yet)

---

## Blockers

_Track any blockers encountered._

| Blocker | Session | Status | Resolution |
|---------|---------|--------|------------|
| (none) | | | |

---

## Files Reference

### New Files to Create
```
src/angular/src/app/services/files/file-selection.service.ts
src/angular/src/app/pages/files/selection-banner.component.ts
src/angular/src/app/pages/files/bulk-actions-bar.component.ts
src/angular/src/app/common/confirmation-dialog/confirmation-dialog.component.ts
src/angular/src/app/services/server/bulk-command.service.ts
src/python/tests/unittests/test_controller/test_controller_bulk.py
src/e2e/tests/bulk-actions.spec.ts
```

### Files to Modify
```
src/python/web/handler/controller.py
src/python/controller/controller.py
src/angular/src/app/pages/files/file-list.component.html
src/angular/src/app/pages/files/file-list.component.ts
src/angular/src/app/pages/files/file.component.html
src/angular/src/app/pages/files/file.component.ts
src/angular/src/app/services/files/view-file.service.ts
```
