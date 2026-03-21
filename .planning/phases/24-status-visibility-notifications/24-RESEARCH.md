# Phase 24: Status Visibility & Notifications - Research

**Researched:** 2026-02-10
**Domain:** Import status badges in file list UI, log viewer integration, toast notifications, SSE events
**Confidence:** HIGH

## Summary

This phase makes Sonarr import events visible to the user via three mechanisms: (1) import status badges in the file list showing "Waiting for Import" and "Imported", (2) import events appearing in the existing log viewer with filename and timestamp, and (3) in-app toast notifications when files are imported. All three features leverage existing infrastructure - the SSE stream system for real-time updates, the log viewer's template-based display, and Bootstrap 5.3 alerts for notifications.

The codebase has well-established patterns for all of this: ViewFile already displays status badges with icons and text, LogService receives log records via SSE and displays them with template bindings, and NotificationService manages Bootstrap alerts in the header. The new requirements are small extensions to these existing systems.

**Primary recommendation:** Add `importStatus` field to ModelFile (enum: NONE, WAITING_FOR_IMPORT, IMPORTED), serialize it in the model stream, display badge in file.component.html using existing status display pattern. For notifications: create a toast variant of NotificationService using Bootstrap toast component instead of static alerts, register for model updates to detect imports, show auto-dismissing toast. For log events: the controller already logs imports at line 653 - these automatically flow to the log viewer via SSE.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bootstrap 5.3 | ^5.3.3 | Toast notifications, badges | Already used for all UI components |
| Angular Animations | ^19.2.18 | Toast slide-in/fade-out effects (optional) | Built-in Angular module |
| RxJS | ^7.5.0 | Observable streams for SSE events | Already used throughout frontend |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Immutable.js | ^4.3.0 | ViewFile immutable records | Extending ViewFile interface |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bootstrap toast | ngx-toastr (external lib) | More features but Phase 24 spec says "in-app toast" and Bootstrap toast is simpler, already available |
| Bootstrap toast | Custom Angular component | More work, Bootstrap toast is designed for this exact use case |
| New SSE event | Polling API | SSE already provides real-time model updates, polling is unnecessary |

**Installation:**
No new dependencies needed. Bootstrap 5.3, Angular Animations, and RxJS are already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── python/
│   ├── model/file.py              # Modified: add import_status enum
│   ├── controller/controller.py   # Modified: set import_status on files
│   ├── web/serialize/serialize_model.py  # Modified: serialize import_status
├── angular/src/app/
│   ├── services/files/view-file.ts       # Modified: add importStatus property
│   ├── pages/files/file.component.html   # Modified: add import status badge
│   ├── services/utils/toast.service.ts   # New: toast notification service
│   └── pages/main/app.component.ts       # Modified: integrate toast service
```

### Pattern 1: Import Status as ModelFile Property

**What:** Add an `import_status` property to ModelFile that tracks where the file is in the Sonarr import lifecycle.

**When to use:** For showing badges like "Waiting for Import" and "Imported" in the file list.

**Example:**
```python
# Source: Derived from src/python/model/file.py State enum pattern
class ModelFile:
    class ImportStatus(Enum):
        NONE = 0                    # Not tracked by Sonarr
        WAITING_FOR_IMPORT = 1      # Downloaded, in Sonarr queue
        IMPORTED = 2                # Imported by Sonarr

    def __init__(self, name: str, is_dir: bool):
        # ... existing properties ...
        self.__import_status = ModelFile.ImportStatus.NONE

    @property
    def import_status(self) -> ImportStatus:
        return self.__import_status

    @import_status.setter
    def import_status(self, import_status: ImportStatus):
        self._check_frozen()
        if type(import_status) != ModelFile.ImportStatus:
            raise TypeError
        self.__import_status = import_status
```

**Setting import status in controller:**
```python
# In controller.py __check_sonarr_imports() or __update_model()
# 1. When file is detected in Sonarr queue:
file = self.__model.get_file(file_name)
new_file = copy.copy(file)
new_file.import_status = ModelFile.ImportStatus.WAITING_FOR_IMPORT
self.__model.update_file(new_file)

# 2. When file is imported (already detected in Phase 23):
for file_name in newly_imported:
    file = self.__model.get_file(file_name)
    new_file = copy.copy(file)
    new_file.import_status = ModelFile.ImportStatus.IMPORTED
    self.__model.update_file(new_file)
    self.__persist.imported_file_names.add(file_name)
    # Log line already exists at line 653 - flows to log viewer automatically
```

### Pattern 2: Status Badge Display in File List

**What:** Add a badge/label to the file row showing import status, following the existing pattern for download status icons.

**When to use:** Always display when file has a non-NONE import status.

**Example:**
```html
<!-- Source: Derived from src/angular/src/app/pages/files/file.component.html status display -->
<div class="status">
    <!-- Existing download status icons -->
    <img src="assets/icons/downloaded.svg" id="downloaded"
         *ngIf="file.status === ViewFile.Status.DOWNLOADED" />
    <!-- ... other status icons ... -->

    <!-- New: Import status badge -->
    <span class="badge bg-info text-dark"
          *ngIf="file.importStatus === ViewFile.ImportStatus.WAITING_FOR_IMPORT">
        Waiting for Import
    </span>
    <span class="badge bg-success"
          *ngIf="file.importStatus === ViewFile.ImportStatus.IMPORTED">
        Imported
    </span>
</div>
```

**ViewFile interface update:**
```typescript
// Source: src/angular/src/app/services/files/view-file.ts
interface IViewFile {
    name: string;
    // ... existing properties ...
    importStatus: ViewFile.ImportStatus;  // New property
}

export class ViewFile extends ViewFileRecord implements IViewFile {
    // ... existing properties ...
    importStatus: ViewFile.ImportStatus;
}

export namespace ViewFile {
    export enum ImportStatus {
        NONE                = "none",
        WAITING_FOR_IMPORT  = "waiting_for_import",
        IMPORTED            = "imported"
    }
}
```

### Pattern 3: Toast Notifications Using Bootstrap 5.3

**What:** Use Bootstrap 5.3's built-in toast component for auto-dismissing notifications. Bootstrap toasts are designed exactly for this - they're non-blocking, stack vertically, and auto-dismiss.

**When to use:** For showing "File imported" messages when Sonarr imports a file.

**Example:**
```typescript
// Source: New file based on NotificationService pattern
// src/angular/src/app/services/utils/toast.service.ts
import {Injectable} from "@angular/core";
import {Subject} from "rxjs";

export interface Toast {
    message: string;
    type: 'success' | 'info' | 'warning' | 'danger';
    autohide?: boolean;
    delay?: number;  // milliseconds
}

@Injectable({providedIn: 'root'})
export class ToastService {
    public toasts$ = new Subject<Toast>();

    show(toast: Toast): void {
        this.toasts$.next({
            autohide: toast.autohide ?? true,
            delay: toast.delay ?? 5000,
            ...toast
        });
    }

    success(message: string): void {
        this.show({message, type: 'success'});
    }
}
```

**Toast container in app component:**
```html
<!-- Source: Bootstrap 5.3 toast documentation pattern -->
<!-- src/angular/src/app/pages/main/app.component.html -->
<div class="toast-container position-fixed top-0 end-0 p-3">
    <div *ngFor="let toast of toasts$ | async"
         class="toast show"
         [class.bg-success]="toast.type === 'success'"
         [class.bg-info]="toast.type === 'info'"
         [class.bg-warning]="toast.type === 'warning'"
         [class.bg-danger]="toast.type === 'danger'"
         [attr.data-bs-autohide]="toast.autohide"
         [attr.data-bs-delay]="toast.delay"
         role="alert"
         aria-live="assertive"
         aria-atomic="true">
        <div class="toast-body text-white">
            {{toast.message}}
        </div>
    </div>
</div>
```

**Listening for import events:**
```typescript
// Source: Derived from HeaderComponent notification subscription pattern
// In app.component.ts or a dedicated import-notification.service.ts
constructor(
    private modelFileService: ModelFileService,
    private toastService: ToastService
) {
    // Subscribe to model updates
    this.modelFileService.updates.subscribe(update => {
        if (update.change === 'updated') {
            const oldFile = update.oldFile;
            const newFile = update.newFile;
            // Detect transition to IMPORTED status
            if (oldFile.importStatus !== ViewFile.ImportStatus.IMPORTED &&
                newFile.importStatus === ViewFile.ImportStatus.IMPORTED) {
                this.toastService.success(`Sonarr imported: ${newFile.name}`);
            }
        }
    });
}
```

### Pattern 4: Log Events (Already Working)

**What:** Import events already appear in the log viewer automatically because the controller logs them at line 653, and LogService receives all log records via SSE.

**When to use:** No code changes needed - this already works.

**How it works:**
1. Controller logs import: `self.logger.info("Recorded Sonarr import: '{}'".format(file_name))` (line 653)
2. LogStreamHandler captures the log record and sends it via SSE with event name "log-record"
3. LogService receives the event and emits it to the logs observable
4. LogsPageComponent subscribes to logs and displays them using the template

**Verification:**
```bash
# Check that import logs flow to the viewer
# 1. Trigger an import in Sonarr
# 2. Navigate to Logs page in SeedSync UI
# 3. Should see: "2026/02/10 14:23:45 - INFO - Controller - Recorded Sonarr import: 'Show.Name.S01E05'"
```

### Pattern 5: SSE Model Updates for Import Status

**What:** Serialize the new `import_status` field in the model stream so the frontend receives updates in real-time.

**When to use:** Always serialize all ModelFile properties.

**Example:**
```python
# Source: src/python/web/serialize/serialize_model.py
class SerializeModel(Serialize):
    __KEY_FILE_IMPORT_STATUS = "import_status"
    __VALUES_FILE_IMPORT_STATUS = {
        ModelFile.ImportStatus.NONE: "none",
        ModelFile.ImportStatus.WAITING_FOR_IMPORT: "waiting_for_import",
        ModelFile.ImportStatus.IMPORTED: "imported"
    }

    @staticmethod
    def __model_file_to_json_dict(model_file: ModelFile) -> dict:
        json_dict = dict()
        # ... existing fields ...
        json_dict[SerializeModel.__KEY_FILE_IMPORT_STATUS] = \
            SerializeModel.__VALUES_FILE_IMPORT_STATUS[model_file.import_status]
        return json_dict
```

### Anti-Patterns to Avoid
- **Using static alerts for import notifications:** Bootstrap alerts in the header are for persistent status (server down, waiting for scan). Use toasts for transient events like imports.
- **Creating a separate SSE event for imports:** The model-updated event already fires when import_status changes. Don't add "sonarr-import" event.
- **Polling for import status:** SSE already provides real-time updates via model-updated events.
- **Storing toast state in a service:** Toasts are ephemeral - emit them via Subject and let the component display them.
- **Manually logging import events:** The controller already logs at line 653. Don't add duplicate logging.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom Angular toast component | Bootstrap 5.3 toast | Already available, designed for this, tested |
| Toast animations | Custom CSS transitions | Angular Animations (optional) | Built-in, accessible, consistent |
| Import event detection | Custom polling | SSE model-updated events | Real-time, already working |
| Badge styling | Custom CSS classes | Bootstrap badge component | Consistent with existing UI, responsive |

**Key insight:** Bootstrap 5.3 toast component is purpose-built for exactly this use case. The documentation example is nearly identical to our requirements (non-blocking, auto-dismiss, stack in corner).

## Common Pitfalls

### Pitfall 1: Toast Lifecycle Management
**What goes wrong:** Toasts don't auto-dismiss or multiple toasts for the same file pile up.
**Why it happens:** Bootstrap toast requires JavaScript initialization with options for autohide/delay. Simply adding the HTML isn't enough.
**How to avoid:** Either (a) use Bootstrap's toast JavaScript API directly via `@ViewChild` and `bootstrap.Toast.getOrCreateInstance()`, OR (b) use a lightweight wrapper that manages the toast lifecycle. Option (a) is simpler.
**Warning signs:** Toasts appear but never disappear, or toasts show but ignore autohide/delay settings.

### Pitfall 2: Badge Placement Conflicts with Status Icons
**What goes wrong:** Import status badge overlaps or crowds out the download status icon.
**Why it happens:** The status div shows both download status (icon + text) and import status (badge). Limited space.
**How to avoid:** Review the file.component.html layout. The status div has room for multiple elements. Place the import badge below the status text, or use a smaller badge variant. Test on mobile viewport.
**Warning signs:** Status section overflows, text wraps awkwardly, badges truncated.

### Pitfall 3: Import Status Persisting After File Removed
**What goes wrong:** File is deleted from model but imported_file_names persist set retains the name. If file re-appears, it immediately shows "Imported" status.
**Why it happens:** BoundedOrderedSet only evicts on overflow. Names stay until the set is full.
**How to avoid:** This is actually desired behavior - if Sonarr imported the file once, it shouldn't re-process if the file reappears. But the import_status property should only be set if the file is currently in the persist set. Check `file_name in self.__persist.imported_file_names` before setting status.
**Warning signs:** Files that were never imported show "Imported" badge.

### Pitfall 4: Toast Spam During Bulk Imports
**What goes wrong:** Sonarr imports 50 files at once, frontend shows 50 toasts, UI is overwhelmed.
**Why it happens:** Each model-updated event triggers a toast.
**How to avoid:** Implement toast deduplication or batch summarization. If multiple imports happen within a short window (e.g., 2 seconds), show a single toast: "Sonarr imported 5 files". Alternatively, set a rate limit on toasts (max 1 per second).
**Warning signs:** User reports "too many notifications" or toasts stack off-screen.

### Pitfall 5: Log Viewer Performance with High Import Volume
**What goes wrong:** Log viewer becomes sluggish when hundreds of import logs arrive.
**Why it happens:** LogService buffers up to 5000 logs in a ReplaySubject. Inserting many logs rapidly triggers many DOM updates.
**How to avoid:** The existing log viewer already handles this with template virtualization and auto-scroll logic. The 5000-entry buffer prevents unbounded growth. No changes needed unless testing reveals issues.
**Warning signs:** Logs page freezes or lags when many imports happen.

### Pitfall 6: Import Status Not Serialized to Frontend
**What goes wrong:** Backend sets import_status, but frontend ViewFile doesn't have the property.
**Why it happens:** Forgot to add the field to SerializeModel or to the ViewFile interface.
**How to avoid:** Update all three places: (1) ModelFile property, (2) SerializeModel serialization, (3) ViewFile interface + mapper. Test that the field flows through the SSE stream by inspecting the browser DevTools Network tab SSE events.
**Warning signs:** Badge never shows up even though backend logs show imports.

### Pitfall 7: Confusing "Waiting for Import" Logic
**What goes wrong:** Badge shows "Waiting for Import" for files not in Sonarr queue.
**Why it happens:** Logic for setting WAITING_FOR_IMPORT is unclear. It should only apply to files that SonarrManager sees in the queue.
**How to avoid:** Set WAITING_FOR_IMPORT when SonarrManager detects the file in the queue (in `_poll_and_detect()`, track current queue names). Remove WAITING_FOR_IMPORT when file leaves queue (either imported or failed). Alternatively, simplify: only use NONE and IMPORTED. The "Waiting" state adds complexity and might not be necessary.
**Warning signs:** Badges are confusing or inaccurate.

## Code Examples

Verified patterns from the existing codebase:

### Status Badge Display Pattern
```html
<!-- Source: src/angular/src/app/pages/files/file.component.html lines 9-28 -->
<div class="status">
    <img src="assets/icons/downloaded.svg" id="downloaded"
         *ngIf="file.status === ViewFile.Status.DOWNLOADED" />
    <span *ngIf="file.status != ViewFile.Status.DEFAULT"
          class="text">{{file.status | capitalize}}</span>
</div>
```

### Bootstrap Badge Usage
```html
<!-- Bootstrap 5.3 badge component (from docs) -->
<span class="badge bg-success">Success</span>
<span class="badge bg-info text-dark">Info</span>
```

### Toast HTML Structure
```html
<!-- Source: Bootstrap 5.3 documentation -->
<div class="toast-container position-fixed top-0 end-0 p-3">
    <div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="toast-header">
            <strong class="me-auto">Notification</strong>
            <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
        </div>
        <div class="toast-body">
            File imported successfully
        </div>
    </div>
</div>
```

### Notification Service Pattern
```typescript
// Source: src/angular/src/app/services/utils/notification.service.ts
@Injectable()
export class NotificationService implements OnDestroy {
    private _notificationsSubject: BehaviorSubject<Immutable.List<Notification>> =
        new BehaviorSubject(this._notifications);

    public show(notification: Notification): void {
        const notifications = this._notifications.push(notification);
        this._notifications = notifications.sort(this._comparator).toList();
        this._notificationsSubject.next(this._notifications);
    }
}
```

### Model Update Subscription
```typescript
// Source: Derived from HeaderComponent notification subscription
ngOnInit(): void {
    this._serverStatusService.status.subscribe({
        next: status => {
            if (status.server.up) {
                // React to status change
            }
        }
    });
}
```

### ModelFile Serialization Pattern
```python
# Source: src/python/web/serialize/serialize_model.py lines 64-86
@staticmethod
def __model_file_to_json_dict(model_file: ModelFile) -> dict:
    json_dict = dict()
    json_dict[SerializeModel.__KEY_FILE_NAME] = model_file.name
    json_dict[SerializeModel.__KEY_FILE_IS_DIR] = model_file.is_dir
    json_dict[SerializeModel.__KEY_FILE_STATE] = SerializeModel.__VALUES_FILE_STATE[model_file.state]
    # ... other fields ...
    return json_dict
```

### Enum Serialization Pattern
```python
# Source: src/python/web/serialize/serialize_model.py lines 42-50
__VALUES_FILE_STATE = {
    ModelFile.State.DEFAULT: "default",
    ModelFile.State.QUEUED: "queued",
    ModelFile.State.DOWNLOADING: "downloading",
    # ... other states ...
}
```

### Log Already Flowing to Viewer
```python
# Source: src/python/controller/controller.py line 653
self.logger.info("Recorded Sonarr import: '{}'".format(file_name))
```

This log automatically:
1. Captured by LogStreamHandler (src/python/web/handler/stream_log.py)
2. Serialized by SerializeLogRecord
3. Sent via SSE with event "log-record"
4. Received by LogService (src/angular/src/app/services/logs/log.service.ts)
5. Displayed by LogsPageComponent template

## Bootstrap 5.3 Toast Reference

### Toast Component Structure
```html
<div class="toast" role="alert" aria-live="assertive" aria-atomic="true">
    <div class="toast-header">
        <strong class="me-auto">Bootstrap</strong>
        <small class="text-muted">11 mins ago</small>
        <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
    </div>
    <div class="toast-body">
        Hello, world! This is a toast message.
    </div>
</div>
```

### Toast Options
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| animation | boolean | true | Apply CSS fade transition |
| autohide | boolean | true | Auto hide toast after delay |
| delay | number | 5000 | Delay in ms before hiding |

### Toast Methods (JavaScript API)
```javascript
const toastEl = document.getElementById('myToast');
const toast = new bootstrap.Toast(toastEl, {autohide: true, delay: 5000});
toast.show();  // Display the toast
```

### Color Variants
Use Bootstrap background utility classes:
- `bg-success` - Green (for successful imports)
- `bg-info` - Blue
- `bg-warning` - Yellow
- `bg-danger` - Red

Add `text-white` for white text on colored backgrounds.

### Positioning
Use Bootstrap positioning utilities on the container:
- `position-fixed` - Fixed positioning
- `top-0 end-0` - Top-right corner
- `p-3` - Padding for spacing from edge

### Stacking
Toasts automatically stack vertically when multiple are shown. The toast-container manages this.

## Import Status Logic

### When to set WAITING_FOR_IMPORT
Option 1 (Simple): Don't use WAITING_FOR_IMPORT at all. Only use NONE and IMPORTED. Simpler, fewer edge cases.

Option 2 (Full tracking): Set WAITING_FOR_IMPORT when file appears in Sonarr queue. Requires:
1. SonarrManager tracks current queue names
2. Controller sets status for files in queue
3. Controller clears status when file leaves queue (imported or failed)

**Recommendation:** Start with Option 1 (NONE and IMPORTED only). Add WAITING_FOR_IMPORT later if users request it.

### When to set IMPORTED
In controller.py `__check_sonarr_imports()`:
```python
for file_name in newly_imported:
    try:
        file = self.__model.get_file(file_name)
        new_file = copy.copy(file)
        new_file.import_status = ModelFile.ImportStatus.IMPORTED
        self.__model.update_file(new_file)
        self.__persist.imported_file_names.add(file_name)
        self.logger.info("Recorded Sonarr import: '{}'".format(file_name))
    except ModelError:
        # File no longer in model - skip
        pass
```

### When to clear IMPORTED
Never auto-clear. Once imported, always imported (unless user explicitly re-downloads and Sonarr imports again). The imported_file_names persist set tracks this across app restarts.

If the file is deleted from the model and re-appears, check the persist set:
```python
if file_name in self.__persist.imported_file_names:
    file.import_status = ModelFile.ImportStatus.IMPORTED
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| ngx-toastr (Angular 4) | Bootstrap 5.3 toast | Bootstrap 5 migration (Jan 2026) | Native component, no extra dependency |
| Static notifications only | Static + toast notifications | Phase 24 | Transient events use toasts |
| No import visibility | Import status + notifications | Phase 24 | Users see Sonarr import progress |

## Open Questions

1. **Should WAITING_FOR_IMPORT status be implemented?**
   - What we know: Requirements say "Waiting for Import, Imported" badges. But "Waiting" adds complexity.
   - What's unclear: Is the "Waiting" state valuable to users, or is it just clutter? Does it help with troubleshooting?
   - Recommendation: Implement IMPORTED first. Add WAITING_FOR_IMPORT in a later iteration if users request it.

2. **Should toasts be persistent or always auto-dismiss?**
   - What we know: Requirements say "auto-dismiss after 5 seconds".
   - What's unclear: Should critical errors (import failed) stick around until dismissed?
   - Recommendation: All toasts auto-dismiss for Phase 24. Add persistent toasts for errors in a future phase if needed.

3. **How to handle bulk import toast spam?**
   - What we know: Sonarr can import many files at once.
   - What's unclear: Should we batch toasts ("5 files imported") or show individual toasts?
   - Recommendation: Start with individual toasts (simpler). Add batching if users complain.

4. **Should import status badges have tooltips?**
   - What we know: The badge text says "Imported" or "Waiting for Import".
   - What's unclear: Would a tooltip with timestamp or Sonarr details help?
   - Recommendation: No tooltips in Phase 24. Keep it simple.

5. **Icon or text-only badges?**
   - What we know: Download status uses icons + text. Import status could follow the same pattern.
   - What's unclear: Is there a good icon for "imported"? A checkmark? A checkmark-in-circle?
   - Recommendation: Text-only badge for Phase 24 (simpler, fewer assets). Add icon later if design calls for it.

## Sources

### Primary (HIGH confidence)
- Existing codebase files (read directly):
  - `/Users/julianamacbook/seedsync/src/angular/src/app/pages/files/file.component.html`
  - `/Users/julianamacbook/seedsync/src/angular/src/app/services/files/view-file.ts`
  - `/Users/julianamacbook/seedsync/src/angular/src/app/services/logs/log.service.ts`
  - `/Users/julianamacbook/seedsync/src/angular/src/app/services/utils/notification.service.ts`
  - `/Users/julianamacbook/seedsync/src/angular/src/app/pages/main/header.component.html`
  - `/Users/julianamacbook/seedsync/src/python/model/file.py`
  - `/Users/julianamacbook/seedsync/src/python/controller/controller.py` (line 653 import logging)
  - `/Users/julianamacbook/seedsync/src/python/web/serialize/serialize_model.py`
  - `/Users/julianamacbook/seedsync/src/python/web/handler/stream_log.py`
  - Phase 23 RESEARCH.md (Sonarr integration context)
- Bootstrap 5.3 documentation: [Toast component](https://getbootstrap.com/docs/5.3/components/toasts/)
- Angular documentation: [Animations module](https://angular.dev/guide/animations)

### Secondary (MEDIUM confidence)
- Bootstrap toast examples on StackOverflow for Angular integration patterns
- ngx-toastr comparison (considered but not used) - validates that Bootstrap toast is sufficient

### Tertiary (LOW confidence)
- None - all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Bootstrap 5.3 already in use, no new dependencies
- Architecture: HIGH - directly derived from reading existing patterns
- Toast implementation: HIGH - Bootstrap 5.3 toast is purpose-built for this exact use case
- Badge display: HIGH - follows existing status badge pattern
- Log viewer integration: HIGH - already working, just verified the flow
- Toast spam mitigation: MEDIUM - not tested under bulk import load

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days - stable domain, established patterns)
