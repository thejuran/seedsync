# Bulk File Actions Feature

## Quick Reference

| Item | Value |
|------|-------|
| **Latest Branch** | `claude/review-bulk-file-actions-Fmk5U` |
| **Status** | 🟢 In Progress |
| **Current Session** | Session 7 Complete |
| **Total Sessions** | 10 estimated |

> **Claude Code Branch Management:**
> Each Claude Code session can only push to branches matching its session ID.
>
> **IMPORTANT:** The master branch has an outdated version of this doc. To continue this feature:
>
> **Prompt for new session:**
> ```
> Run: git fetch origin && git log --oneline $(git branch -r | grep 'claude/review-bulk-file-actions' | head -1) -1
> Then merge that branch and read planning docs/BULK_FILE_ACTIONS.md to see current progress.
> Continue with the next incomplete session.
> ```
>
> **Manual steps (what Claude should do):**
> 1. `git fetch origin claude/review-bulk-file-actions-*`
> 2. Find latest: `git branch -r | grep 'claude/review-bulk-file-actions' | head -1`
> 3. Merge into your session branch: `git merge origin/<latest-branch>`
> 4. Read THIS file from the merged branch to see actual progress
> 5. Continue development and push to your session's branch
>
> **Branch History:**
> - `claude/review-bulk-file-actions-2KjKN` - Sessions 1-2 (original)
> - `claude/review-bulk-file-actions-UM3bn` - Sessions 1-3 (merged from above)
> - `claude/review-bulk-file-actions-1jrQG` - Sessions 1-4 (merged from above)
> - `claude/review-bulk-file-actions-olN0F` - Sessions 1-5 (merged from above)
> - `claude/review-bulk-file-actions-yVpO3` - Sessions 1-6 (merged from above)
> - `claude/review-bulk-file-actions-Fmk5U` - Sessions 1-7 (current, merged from above)

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
- [x] Add route in `src/python/web/handler/controller.py`
- [x] Add `handle_bulk_command()` in `src/python/web/handler/controller.py`
- [x] Validate action enum and files array
- [x] Loop through files, call existing handlers, collect results
- [x] Return itemized results + summary
- [x] Add unit tests in `src/python/tests/unittests/test_web/test_handler/`

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
- [x] Create `src/angular/src/app/services/files/file-selection.service.ts`
- [x] Implement: `select()`, `deselect()`, `toggle()`, `selectMultiple()`
- [x] Implement: `selectAllVisible()`, `selectAllMatchingFilter()`, `clearSelection()`
- [x] Implement: `isSelected()`, `getSelectedCount()`, `getSelectedFiles()`
- [x] Use `BehaviorSubject<Set<string>>` for reactive state
- [x] Add `selectAllMatching` flag for "all matching filter" mode
- [x] Add unit tests

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
- [x] Inject `FileSelectionService` into `ViewFileService`
- [x] Identify where filter/sort changes occur
- [x] Call `clearSelection()` on filter/sort changes
- [x] Add unit tests

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
- [x] Add checkbox column to file list header in `file-list.component.html`
- [x] Implement header checkbox logic (checked/indeterminate states)
- [x] Add checkbox to each file row in `file.component.html`
- [x] Wire checkboxes to `FileSelectionService`
- [x] Add `.bulk-selected` class to selected rows
- [x] Add basic checkbox column styling

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
- [x] Create `src/angular/src/app/pages/files/selection-banner.component.ts`
- [x] Show "X files selected" when selection exists
- [x] Show "Select all Y matching filter" link when all visible selected
- [x] Add "Clear selection" button
- [x] Integrate into file list page
- [x] Style the banner

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
- [x] Add `@HostListener` for keyboard events in file list
- [x] Implement `Ctrl/Cmd+A` to select all visible
- [x] Implement `Escape` to clear selection
- [x] Track last clicked row index
- [x] Implement `Shift+click` for range selection
- [x] Add unit tests

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
- [x] Create `src/angular/src/app/pages/files/bulk-actions-bar.component.ts`
- [x] Calculate counts: queueable, stoppable, extractable, deletable
- [x] Display buttons with counts: `[Queue (3)]`
- [x] Disable buttons when count is 0
- [x] Wire up click handlers (no API calls yet)
- [x] Integrate into file list page
- [x] Style the action bar
- [x] Add unit tests

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
| Session 1 | 2026-01-31 | ✅ Complete | Backend bulk endpoint implemented with 21 unit tests |
| Session 2 | 2026-01-31 | ✅ Complete | FileSelectionService with 26 unit tests |
| Session 3 | 2026-01-31 | ✅ Complete | Wired selection clear to filter/sort changes, 4 unit tests |
| Session 4 | 2026-01-31 | ✅ Complete | Checkbox UI for header and rows, wired to FileSelectionService |
| Session 5 | 2026-02-01 | ✅ Complete | Selection banner with count, "select all matching", and clear button |
| Session 6 | 2026-02-01 | ✅ Complete | Keyboard shortcuts (Ctrl+A, Escape) and Shift+click range selection |
| Session 7 | 2026-02-01 | ✅ Complete | Bulk actions bar with Queue, Stop, Extract, Delete Local, Delete Remote buttons showing eligible counts |

---

## Learnings

_Document technical discoveries, gotchas, and decisions made during implementation._

### Technical Notes
- WebApp used only GET handlers; added `add_post_handler()` method to support POST routes
- Bulk endpoint uses JSON request/response with `application/json` content type
- Handler reuses existing `WebResponseActionCallback` pattern from single-file endpoints
- Tests placed in `test_web/test_handler/` to match existing handler test structure
- FileSelectionService is separate from ViewFile's `isSelected` (used for details panel single-selection)
- Used `providedIn: 'root'` for tree-shakable singleton service
- Prune method helps clean up stale selections when files disappear from model
- Used `ng-container` with `*ngIf` to avoid async pipes in event handlers (Angular restriction)
- Used `.bulk-selected` class (not `.selected`) to differentiate from detail panel selection
- Header checkbox uses `indeterminate` property for partial selection state
- `@HostListener('document:keydown')` captures keyboard events at document level
- Keyboard shortcuts skip when target is input/textarea/select elements to avoid conflicts
- Shift+click range selection replaces current selection (per UAT spec TS-4.5)
- Last clicked index tracked separately and reset on clear/escape to prevent stale anchors
- Files observable subscribed to keep `_currentFiles` cache for range selection logic
- BulkActionsBarComponent uses getter properties (`actionCounts`, `queueableFiles`, etc.) for computed values
- Click handlers check count before emitting to prevent events when no eligible files
- Bootstrap btn classes used with appropriate variants: primary (Queue), warning (Stop), info (Extract), outline-danger (Delete Local), danger (Delete Remote)

### Gotchas
- Standalone components require explicit imports for all directives used in templates (e.g., `NgIf`, `NgFor`). Missing imports cause silent template failures rather than compile errors.

### Design Decisions Made During Implementation
- Bulk endpoint always returns 200 status (even on partial/full failure) - success/failure is in the response body
- File results preserve input order to make frontend correlation easier

---

## Blockers

_Track any blockers encountered._

| Blocker | Session | Status | Resolution |
|---------|---------|--------|------------|
| (none) | | | |

---

## Files Reference

### New Files Created
```
src/angular/src/app/services/files/file-selection.service.ts  # Session 2
src/angular/src/app/pages/files/selection-banner.component.ts  # Session 5
src/angular/src/app/tests/unittests/pages/files/file-list.component.spec.ts  # Session 6
src/angular/src/app/pages/files/bulk-actions-bar.component.ts  # Session 7
src/angular/src/app/pages/files/bulk-actions-bar.component.html  # Session 7
src/angular/src/app/pages/files/bulk-actions-bar.component.scss  # Session 7
src/angular/src/app/tests/unittests/pages/files/bulk-actions-bar.component.spec.ts  # Session 7
```

### New Files to Create
```
src/angular/src/app/common/confirmation-dialog/confirmation-dialog.component.ts
src/angular/src/app/services/server/bulk-command.service.ts
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

---

## UAT Plan

### Test Environment Setup

**Prerequisites:**
- SeedSync `:dev` Docker image pulled from GHCR
- Remote server running (can use `make run-remote-server` for localhost:1234)
- At least 10 test files on remote server with varying states:
  - 3+ files not yet downloaded (for Queue testing)
  - 2+ files currently downloading (for Stop testing)
  - 3+ files downloaded but not extracted (for Extract testing)
  - 3+ files downloaded (for Delete Local testing)
  - 3+ files on remote (for Delete Remote testing)

**Environment Variables:**
```bash
REMOTE_HOST=localhost
REMOTE_PORT=1234
REMOTE_USER=remoteuser
REMOTE_PASS=remotepass
REMOTE_PATH=/home/remoteuser/files
```

**Pre-UAT Checklist:**
- [ ] Fresh SeedSync instance running with `:dev` image
- [ ] Remote server populated with test files
- [ ] Browser DevTools open for network inspection
- [ ] Test file names documented for reference

---

### Test Scenarios

#### TS-1: Checkbox Selection Basics

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1.1 | Click checkbox on a single file row | Checkbox becomes checked, row is highlighted | |
| 1.2 | Click same checkbox again | Checkbox unchecked, row highlight removed | |
| 1.3 | Click checkboxes on 3 different files | All 3 checked, all 3 highlighted | |
| 1.4 | Click on file name (not checkbox) | File details shown, selection unchanged | |
| 1.5 | Verify selection count in banner | Banner shows "3 files selected" | |

---

#### TS-2: Header Checkbox Behavior

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 2.1 | With no files selected, click header checkbox | All visible files selected, header checked | |
| 2.2 | Click header checkbox again | All files deselected, header unchecked | |
| 2.3 | Select 2 files manually | Header shows indeterminate state (dash) | |
| 2.4 | Click header checkbox while indeterminate | All visible files selected | |
| 2.5 | Click header checkbox when all selected | All files deselected | |

---

#### TS-3: Selection Banner

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 3.1 | Select 1 file | Banner appears showing "1 file selected" | |
| 3.2 | Select 5 files | Banner shows "5 files selected" | |
| 3.3 | Click "Clear" button in banner | All selections cleared, banner disappears | |
| 3.4 | Select all visible files (header checkbox) | Banner shows "Select all X matching filter" link | |
| 3.5 | Click "Select all matching filter" link | Banner updates to show total matching count | |
| 3.6 | Clear selection after "select all matching" | Banner disappears, all deselected | |

---

#### TS-4: Keyboard Shortcuts

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 4.1 | Focus on file list, press Ctrl+A (Cmd+A on Mac) | All visible files selected | |
| 4.2 | With files selected, press Escape | Selection cleared | |
| 4.3 | Click checkbox on file #2 | File #2 selected | |
| 4.4 | Hold Shift, click checkbox on file #5 | Files #2, #3, #4, #5 all selected | |
| 4.5 | Click file #8, Shift+click file #10 | Only files #8, #9, #10 selected (previous cleared) | |
| 4.6 | Ctrl+click file #1 while #8-10 selected | Files #1, #8, #9, #10 all selected (additive) | |

---

#### TS-5: Filter Interaction

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 5.1 | Select 5 files | 5 files selected | |
| 5.2 | Change status filter dropdown | Selection cleared, banner disappears | |
| 5.3 | Select 3 files again | 3 files selected | |
| 5.4 | Change sort order | Selection cleared | |
| 5.5 | Select 2 files, use search box | Selection cleared when filter applied | |

---

#### TS-6: Bulk Actions Bar - Display

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 6.1 | With no selection | Actions bar not visible | |
| 6.2 | Select 1 file | Actions bar appears | |
| 6.3 | Select files with mixed states | Buttons show counts (e.g., "Queue (3)") | |
| 6.4 | Select only downloaded files | Queue button shows (0), is disabled | |
| 6.5 | Select only remote files | Delete Local shows (0), is disabled | |
| 6.6 | Verify button order | Order: Queue, Stop, Extract, Delete Local, Delete Remote | |

---

#### TS-7: Bulk Queue Action

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 7.1 | Select 3 queueable files + 1 already queued | Queue button shows "(3)" | |
| 7.2 | Click Queue button | No confirmation dialog (not destructive) | |
| 7.3 | Wait for action to complete | Toast: "Queued 3 files successfully" | |
| 7.4 | Verify files status | All 3 files now show as Queued | |
| 7.5 | Verify selection | Selection cleared after action | |
| 7.6 | Check network tab | Single POST to `/server/command/bulk` | |

---

#### TS-8: Bulk Stop Action

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 8.1 | Queue 2 files, let them start downloading | Files show Downloading status | |
| 8.2 | Select both downloading files | Stop button shows "(2)" | |
| 8.3 | Click Stop button | No confirmation dialog | |
| 8.4 | Wait for action | Toast: "Stopped 2 files successfully" | |
| 8.5 | Verify file status | Files no longer downloading | |

---

#### TS-9: Bulk Extract Action

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 9.1 | Ensure 2 downloaded archive files exist | Files show Downloaded, not Extracted | |
| 9.2 | Select both files | Extract button shows "(2)" | |
| 9.3 | Click Extract button | No confirmation dialog | |
| 9.4 | Wait for action | Toast: "Extracted 2 files successfully" | |
| 9.5 | Verify file status | Files show Extracted status | |

---

#### TS-10: Bulk Delete Local Action

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 10.1 | Select 3 files with local copies | Delete Local shows "(3)" | |
| 10.2 | Click Delete Local button | Confirmation dialog appears | |
| 10.3 | Verify dialog content | Shows "Delete 3 local files?" with warning | |
| 10.4 | Click Cancel | Dialog closes, no action taken, selection remains | |
| 10.5 | Click Delete Local again, then Confirm | Toast: "Deleted 3 local files successfully" | |
| 10.6 | Verify local files removed | Files no longer have local copies | |

---

#### TS-11: Bulk Delete Remote Action

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 11.1 | Select 2 files on remote server | Delete Remote shows "(2)" | |
| 11.2 | Click Delete Remote button | Confirmation dialog with danger styling | |
| 11.3 | Verify dialog content | Shows "Delete 2 remote files? This cannot be undone." | |
| 11.4 | Click Confirm | Toast: "Deleted 2 remote files successfully" | |
| 11.5 | Verify files removed from remote | Files no longer appear in file list | |

---

#### TS-12: Partial Failure Handling

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 12.1 | Select 3 files, delete 1 from remote via SSH | 1 file now invalid | |
| 12.2 | Click Queue on all 3 | Action executes | |
| 12.3 | Verify toast message | Warning toast: "Queued 2 files. 1 failed." | |
| 12.4 | Verify successful files | 2 files queued successfully | |
| 12.5 | Selection cleared | Yes, even on partial failure | |

---

#### TS-13: Large Selection (50+ files)

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 13.1 | Populate remote with 60 files | Files appear in list | |
| 13.2 | Use "Select all matching filter" | All 60 selected | |
| 13.3 | Click Queue button | Progress indicator appears | |
| 13.4 | Wait for completion | Progress updates, then shows success toast | |
| 13.5 | Verify all files queued | 60 files in queue | |
| 13.6 | Response time acceptable | Action completes in <10 seconds | |

---

#### TS-14: Edge Cases

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 14.1 | Select file, file disappears (scan update) | Selection gracefully updated, no error | |
| 14.2 | Select all, apply filter that shows 0 files | Selection cleared, banner hidden | |
| 14.3 | Double-click action button rapidly | Only one request sent (debounce) | |
| 14.4 | Select 5 files, all ineligible for Queue | Queue button disabled | |
| 14.5 | Network error during bulk action | Error toast with retry suggestion | |
| 14.6 | Empty selection, try keyboard shortcuts | No errors, graceful no-op | |

---

#### TS-15: Browser Compatibility

| Browser | Version | Checkbox | Keyboard | Actions | Pass/Fail |
|---------|---------|----------|----------|---------|-----------|
| Chrome | Latest | | | | |
| Safari | Latest | | | | |

---

#### TS-16: Mobile/Responsive

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 16.1 | View on tablet (768px width) | Checkboxes visible, bar stacks if needed | |
| 16.2 | View on mobile (375px width) | Checkboxes still functional | |
| 16.3 | Touch to select on mobile | Works like click | |
| 16.4 | Actions bar on mobile | Scrollable or wrapped, all buttons accessible | |

---

### Regression Tests

| Area | Test | Expected | Pass/Fail |
|------|------|----------|-----------|
| Single file actions | Right-click/action menu still works | Unchanged behavior | |
| File details | Clicking file name opens details | Still works | |
| Drag and drop | If existed, still works | Unchanged | |
| Filters | All filter options work | No regression | |
| Sort | All sort options work | No regression | |
| Pagination | If paginated, page changes work | Maintains selection per-page or clears | |

---

### UAT Sign-off

**Tester:** _________________
**Date:** _________________
**Environment:** SeedSync `:dev` version _________________

| Category | Scenarios | Passed | Failed | Blocked |
|----------|-----------|--------|--------|---------|
| Checkbox Selection | TS-1, TS-2 | | | |
| Selection Banner | TS-3 | | | |
| Keyboard Shortcuts | TS-4 | | | |
| Filter Interaction | TS-5 | | | |
| Actions Bar Display | TS-6 | | | |
| Bulk Queue | TS-7 | | | |
| Bulk Stop | TS-8 | | | |
| Bulk Extract | TS-9 | | | |
| Bulk Delete Local | TS-10 | | | |
| Bulk Delete Remote | TS-11 | | | |
| Partial Failure | TS-12 | | | |
| Large Selection | TS-13 | | | |
| Edge Cases | TS-14 | | | |
| Browser Compat | TS-15 | | | |
| Mobile/Responsive | TS-16 | | | |
| Regression | Regression | | | |

**Overall Result:** [ ] PASS  [ ] FAIL  [ ] BLOCKED

**Notes:**
```
(Record any issues, observations, or deferred items here)
```

**Blocker Issues (if any):**
```
(List critical issues that block release)
```
