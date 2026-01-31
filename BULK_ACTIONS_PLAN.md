# Bulk File Actions - Implementation Plan

## Overview

Add the ability to select multiple files in the dashboard and apply actions to all selected files at once.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Selection UI | Checkbox per row, header checkbox |
| Select All scope | Visible only, with "select all matching filter" option |
| Selection persistence | Clear on filter change |
| Confirmation dialogs | Destructive actions only (delete local/remote) |
| Progress feedback | Optimistic UI + toast summary |
| Large operations (50+) | Non-blocking progress indicator |
| Undo support | Out of scope for v1 |
| Keyboard shortcuts | Ctrl+A, Escape, Shift+click |
| API | Single bulk endpoint with itemized results |

---

## Phase 1: Backend - Bulk API Endpoint

### 1.1 Add Bulk Command Endpoint

**File:** `src/python/web/handler/controller.py`

Add new endpoint:
```
POST /server/command/bulk
```

**Request Body:**
```json
{
  "action": "queue|stop|extract|delete_local|delete_remote",
  "files": ["file1", "file2", "file3"]
}
```

**Response (200 OK):**
```json
{
  "results": [
    {"file": "file1", "success": true},
    {"file": "file2", "success": true},
    {"file": "file3", "success": false, "error": "File does not exist remotely", "code": 404}
  ],
  "summary": {
    "total": 3,
    "succeeded": 2,
    "failed": 1
  }
}
```

### 1.2 Add Bulk Command Handler

**File:** `src/python/controller/controller.py`

Add method:
```python
def handle_bulk_command(self, action: str, file_names: List[str]) -> Dict
```

- Iterate through files, call existing single-file handlers
- Collect results (success/failure per file)
- Return aggregated response
- Handle exceptions per-file (don't let one failure stop others)

### 1.3 Validation

- Validate action is one of: queue, stop, extract, delete_local, delete_remote
- Validate files is a non-empty list
- Validate each file name is a string
- Return 400 Bad Request for invalid input

---

## Phase 2: Frontend - Selection State Management

### 2.1 Create Selection Service

**File:** `src/angular/src/app/services/files/file-selection.service.ts`

```typescript
@Injectable({providedIn: 'root'})
export class FileSelectionService {
  // Selected file names (using Set for O(1) lookup)
  private selectedFiles = new BehaviorSubject<Set<string>>(new Set());
  selectedFiles$ = this.selectedFiles.asObservable();

  // Whether "select all matching filter" is active
  private selectAllMatching = new BehaviorSubject<boolean>(false);
  selectAllMatching$ = this.selectAllMatching.asObservable();

  // Methods
  select(fileName: string): void
  deselect(fileName: string): void
  toggle(fileName: string): void
  selectMultiple(fileNames: string[]): void
  selectAllVisible(fileNames: string[]): void
  selectAllMatchingFilter(): void
  clearSelection(): void
  isSelected(fileName: string): boolean
  getSelectedCount(): number
  getSelectedFiles(): string[]
}
```

### 2.2 Clear Selection on Filter Change

**File:** `src/angular/src/app/services/files/view-file.service.ts`

- Inject FileSelectionService
- Call `clearSelection()` when filter/sort changes
- Emit event so UI can react

---

## Phase 3: Frontend - Selection UI Components

### 3.1 Add Checkbox Column to File List

**File:** `src/angular/src/app/pages/files/file-list.component.html`

Add header checkbox:
```html
<th class="select-column">
  <input type="checkbox"
         [checked]="allVisibleSelected"
         [indeterminate]="someVisibleSelected"
         (change)="onHeaderCheckboxChange($event)">
</th>
```

### 3.2 Add Checkbox to File Row

**File:** `src/angular/src/app/pages/files/file.component.html`

Add row checkbox:
```html
<td class="select-column">
  <input type="checkbox"
         [checked]="isSelected"
         (change)="onSelectionChange($event)"
         (click)="$event.stopPropagation()">
</td>
```

### 3.3 Selection Banner Component

**File:** `src/angular/src/app/pages/files/selection-banner.component.ts`

Create new component for the selection banner:
```html
<div class="selection-banner" *ngIf="selectedCount > 0">
  <span>{{ selectedCount }} files selected.</span>

  <button *ngIf="canSelectAllMatching"
          (click)="onSelectAllMatching()">
    Select all {{ totalMatchingCount }} matching filter
  </button>

  <button (click)="onClearSelection()">Clear selection</button>
</div>
```

### 3.4 Shift+Click Range Selection

**File:** `src/angular/src/app/pages/files/file-list.component.ts`

- Track last clicked index
- On shift+click, select range from last clicked to current
- Update FileSelectionService with range

### 3.5 Keyboard Shortcuts

**File:** `src/angular/src/app/pages/files/file-list.component.ts`

```typescript
@HostListener('document:keydown', ['$event'])
handleKeyboardEvent(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    this.fileSelectionService.clearSelection();
  }
  if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
    event.preventDefault();
    this.selectAllVisible();
  }
}
```

---

## Phase 4: Frontend - Bulk Actions Bar

### 4.1 Bulk Actions Bar Component

**File:** `src/angular/src/app/pages/files/bulk-actions-bar.component.ts`

Create component that appears when files are selected:

```html
<div class="bulk-actions-bar" *ngIf="selectedCount > 0">
  <span class="selection-count">{{ selectedCount }} files selected</span>

  <div class="actions">
    <button [disabled]="queueableCount === 0"
            (click)="onBulkQueue()">
      Queue ({{ queueableCount }})
    </button>

    <button [disabled]="stoppableCount === 0"
            (click)="onBulkStop()">
      Stop ({{ stoppableCount }})
    </button>

    <button [disabled]="extractableCount === 0"
            (click)="onBulkExtract()">
      Extract ({{ extractableCount }})
    </button>

    <button [disabled]="locallyDeletableCount === 0"
            class="btn-danger"
            (click)="onBulkDeleteLocal()">
      Delete Local ({{ locallyDeletableCount }})
    </button>

    <button [disabled]="remotelyDeletableCount === 0"
            class="btn-danger"
            (click)="onBulkDeleteRemote()">
      Delete Remote ({{ remotelyDeletableCount }})
    </button>
  </div>

  <button class="clear-btn" (click)="onClearSelection()">
    Clear Selection
  </button>
</div>
```

### 4.2 Calculate Action Counts

In the component, calculate counts based on selected files:

```typescript
private updateActionCounts(): void {
  const selectedFiles = this.getSelectedViewFiles();

  this.queueableCount = selectedFiles.filter(f => f.isQueueable).length;
  this.stoppableCount = selectedFiles.filter(f => f.isStoppable).length;
  this.extractableCount = selectedFiles.filter(f => f.isExtractable && f.isArchive).length;
  this.locallyDeletableCount = selectedFiles.filter(f => f.isLocallyDeletable).length;
  this.remotelyDeletableCount = selectedFiles.filter(f => f.isRemotelyDeletable).length;
}
```

---

## Phase 5: Frontend - Confirmation Dialogs

### 5.1 Confirmation Dialog Component

**File:** `src/angular/src/app/common/confirmation-dialog.component.ts`

Create reusable confirmation dialog:

```typescript
export interface ConfirmationDialogData {
  title: string;
  message: string;
  skipCount?: number;
  skipReason?: string;
  confirmText: string;
  confirmCount: number;
  isDangerous: boolean;
}
```

```html
<div class="modal">
  <div class="modal-header">
    <h5>{{ data.title }}</h5>
  </div>
  <div class="modal-body">
    <p>{{ data.message }}</p>
    <p *ngIf="data.skipCount" class="text-muted">
      {{ data.skipCount }} files will be skipped ({{ data.skipReason }})
    </p>
  </div>
  <div class="modal-footer">
    <button class="btn btn-secondary" (click)="onCancel()">Cancel</button>
    <button [class]="data.isDangerous ? 'btn btn-danger' : 'btn btn-primary'"
            (click)="onConfirm()">
      {{ data.confirmText }} ({{ data.confirmCount }})
    </button>
  </div>
</div>
```

### 5.2 Show Confirmation for Delete Actions

```typescript
onBulkDeleteLocal(): void {
  const applicable = this.selectedFiles.filter(f => f.isLocallyDeletable);
  const skipped = this.selectedFiles.length - applicable.length;

  this.dialogService.confirm({
    title: `Delete ${applicable.length} files locally?`,
    message: 'This will permanently delete these files from your local machine. Remote copies will remain.',
    skipCount: skipped,
    skipReason: 'no local copy',
    confirmText: 'Delete',
    confirmCount: applicable.length,
    isDangerous: true
  }).then(confirmed => {
    if (confirmed) {
      this.executeBulkAction('delete_local', applicable);
    }
  });
}
```

---

## Phase 6: Frontend - Bulk Action Execution

### 6.1 Bulk Command Service

**File:** `src/angular/src/app/services/server/bulk-command.service.ts`

```typescript
@Injectable({providedIn: 'root'})
export class BulkCommandService {

  executeBulkAction(action: string, files: string[]): Observable<BulkResponse> {
    return this.http.post<BulkResponse>('/server/command/bulk', {
      action,
      files
    });
  }
}

interface BulkResponse {
  results: BulkResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

interface BulkResult {
  file: string;
  success: boolean;
  error?: string;
  code?: number;
}
```

### 6.2 Toast Notifications

**File:** `src/angular/src/app/services/notification.service.ts`

Add or update notification service for toast messages:

```typescript
showBulkActionResult(action: string, summary: BulkSummary): void {
  if (summary.failed === 0) {
    this.showSuccess(`${this.actionVerb(action)} ${summary.succeeded} files`);
  } else {
    this.showWarning(
      `${this.actionVerb(action)} ${summary.succeeded} files. ` +
      `${summary.failed} skipped.`
    );
  }
}
```

### 6.3 Progress Indicator for Large Operations

For 50+ files, show non-blocking progress:

```typescript
executeLargeBulkAction(action: string, files: string[]): void {
  this.isProcessing = true;
  this.processedCount = 0;
  this.totalCount = files.length;

  // Process in batches of 10
  const batches = this.chunk(files, 10);

  from(batches).pipe(
    concatMap(batch => this.bulkCommandService.executeBulkAction(action, batch)),
    tap(result => this.processedCount += result.summary.total)
  ).subscribe({
    complete: () => {
      this.isProcessing = false;
      this.showSummary();
    }
  });
}
```

---

## Phase 7: Styling

### 7.1 Selection Styles

**File:** `src/angular/src/app/pages/files/file-list.component.scss`

```scss
.select-column {
  width: 40px;
  text-align: center;
}

tr.selected {
  background-color: var(--bs-primary-bg-subtle);
}

.selection-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 1rem;
  background-color: var(--bs-info-bg-subtle);
  border-bottom: 1px solid var(--bs-border-color);
}

.bulk-actions-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--bs-light);
  border-bottom: 1px solid var(--bs-border-color);
  position: sticky;
  top: 0;
  z-index: 10;
}
```

---

## Phase 8: Testing

### 8.1 Python Unit Tests

**File:** `src/python/tests/unittests/test_controller/test_controller_bulk.py`

- Test bulk endpoint validation (invalid action, empty files)
- Test bulk queue with mixed valid/invalid files
- Test bulk stop with mixed states
- Test bulk extract with mixed file types
- Test bulk delete local with mixed local existence
- Test bulk delete remote with mixed remote existence
- Test response format (results array, summary)

### 8.2 Angular Unit Tests

**File:** `src/angular/src/app/services/files/file-selection.service.spec.ts`

- Test select/deselect/toggle operations
- Test selectAllVisible
- Test clearSelection
- Test isSelected

**File:** `src/angular/src/app/pages/files/bulk-actions-bar.component.spec.ts`

- Test action count calculations
- Test button disabled states
- Test confirmation dialog trigger for delete actions

### 8.3 E2E Tests

**File:** `src/e2e/tests/bulk-actions.spec.ts`

- Test checkbox selection
- Test header checkbox (select all visible)
- Test "select all matching filter" banner
- Test keyboard shortcuts (Ctrl+A, Escape)
- Test shift+click range selection
- Test bulk queue action
- Test bulk delete with confirmation
- Test toast notification on completion
- Test selection clears on filter change

---

## Implementation Order

1. **Backend bulk endpoint** (Phase 1) - Foundation for everything else
2. **Selection service** (Phase 2) - State management
3. **Selection UI** (Phase 3) - Checkboxes, banner
4. **Bulk actions bar** (Phase 4) - Action buttons with counts
5. **Confirmation dialogs** (Phase 5) - Delete protection
6. **Action execution** (Phase 6) - API calls, toasts
7. **Styling** (Phase 7) - Polish
8. **Testing** (Phase 8) - Comprehensive coverage

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/angular/src/app/services/files/file-selection.service.ts` | Selection state management |
| `src/angular/src/app/pages/files/selection-banner.component.ts` | "X files selected" banner |
| `src/angular/src/app/pages/files/bulk-actions-bar.component.ts` | Action buttons bar |
| `src/angular/src/app/common/confirmation-dialog.component.ts` | Reusable confirmation modal |
| `src/angular/src/app/services/server/bulk-command.service.ts` | Bulk API client |
| `src/python/tests/unittests/test_controller/test_controller_bulk.py` | Backend tests |
| `src/e2e/tests/bulk-actions.spec.ts` | E2E tests |

## Files to Modify

| File | Changes |
|------|---------|
| `src/python/web/handler/controller.py` | Add bulk endpoint |
| `src/python/controller/controller.py` | Add bulk command handler |
| `src/angular/src/app/pages/files/file-list.component.html` | Add header checkbox |
| `src/angular/src/app/pages/files/file-list.component.ts` | Selection logic, keyboard shortcuts |
| `src/angular/src/app/pages/files/file.component.html` | Add row checkbox |
| `src/angular/src/app/pages/files/file.component.ts` | Selection toggle |
| `src/angular/src/app/services/files/view-file.service.ts` | Clear selection on filter change |

---

## Future Enhancements (Out of Scope for v1)

- Undo support for delete operations (trash system)
- Drag-and-drop multi-select
- Saved selections
- Bulk action history/audit log
- Custom bulk action macros
