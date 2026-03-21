# Phase 25: Auto-Delete with Safety - Research

**Researched:** 2026-02-10
**Domain:** Automatic local file deletion with safety mechanisms (delayed deletion, dry-run mode, config toggles)
**Confidence:** HIGH

## Summary

This phase implements automatic deletion of local files after Sonarr import detection, with multiple safety mechanisms to prevent data loss. The core mechanism builds on Phase 24's import detection: when a file is detected as imported, schedule its local deletion after a configurable safety delay (default 60 seconds). The delay prevents race conditions where Sonarr might still be processing the file. Dry-run mode allows users to test the feature without actually deleting files.

The codebase already has all the building blocks: FileOperationManager.delete_local() handles deletion, SonarrManager.process() detects imports, and ControllerPersist.imported_file_names tracks what's been imported. The key additions are: (1) timer-based delayed deletion using threading.Timer, (2) config options for enable/disable toggle and safety delay, (3) dry-run mode logging, and (4) careful NEVER-delete-remote safeguards.

**Primary recommendation:** Add Config.AutoDelete section with enabled, dry_run, and delay_seconds properties. Track pending deletions in a dict mapping file_name to Timer instance. When import detected, cancel any existing timer for that file and schedule a new deletion timer. On timer expiry, check dry_run flag and either log or call FileOperationManager.delete_local(). CRITICAL: Auto-delete ONLY calls delete_local(), never delete_remote().

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| threading.Timer | stdlib | Delayed callback execution | Standard Python mechanism for delayed actions |
| time | stdlib | Timestamp tracking for delays | Already used in SonarrManager for intervals |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| logging | stdlib | Log dry-run actions and deletions | Every auto-delete operation |
| copy | stdlib | Copy ModelFile for deletion | Already used for import_status updates |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| threading.Timer | asyncio.sleep | Entire codebase is sync/threaded, would require major refactor |
| threading.Timer | APScheduler | Heavy dependency for simple delayed callback |
| Dict[str, Timer] | Custom timer manager | Over-engineering for this use case |

**Installation:**
No new dependencies needed. All required libraries are Python stdlib.

## Architecture Patterns

### Recommended Project Structure
```
src/python/
  common/
    config.py                 # Modified: add Config.AutoDelete section
  controller/
    controller.py             # Modified: integrate auto-delete logic
    controller_persist.py     # No change needed (imported_file_names already exists)
    file_operation_manager.py # No change needed (delete_local already exists)
src/angular/
  src/app/
    pages/settings/
      options-list.ts         # Modified: add AutoDelete options context
      settings-page.component.html  # Modified: add AutoDelete section
```

### Pattern 1: Delayed Deletion with Timer

**What:** When import detected, schedule deletion using threading.Timer. Store timer reference to allow cancellation if import detection fires multiple times for same file.

**When to use:** This is the only pattern needed for configurable-delay deletion.

**Example:**
```python
# Source: threading.Timer documentation + codebase patterns
class Controller:
    def __init__(self, ...):
        # Dict mapping file_name to active Timer instance
        self.__pending_auto_deletes: Dict[str, threading.Timer] = {}

    def __schedule_auto_delete(self, file_name: str):
        """Schedule auto-delete of local file after safety delay."""
        # Cancel existing timer if file was re-detected
        if file_name in self.__pending_auto_deletes:
            self.__pending_auto_deletes[file_name].cancel()
            del self.__pending_auto_deletes[file_name]

        delay = self.__context.config.autodelete.delay_seconds
        timer = threading.Timer(delay, self.__execute_auto_delete, args=[file_name])
        self.__pending_auto_deletes[file_name] = timer
        timer.start()
        self.logger.info(
            "Scheduled auto-delete of '{}' in {} seconds".format(file_name, delay)
        )

    def __execute_auto_delete(self, file_name: str):
        """Execute auto-delete (called by Timer after delay)."""
        # Remove from tracking dict
        if file_name in self.__pending_auto_deletes:
            del self.__pending_auto_deletes[file_name]

        # Check dry-run mode
        if self.__context.config.autodelete.dry_run:
            self.logger.info("DRY-RUN: Would delete local file '{}'".format(file_name))
            return

        # Get file and delete local copy
        try:
            file = self.__model.get_file(file_name)
            self.__file_op_manager.delete_local(file)
            self.logger.info("Auto-deleted local file '{}'".format(file_name))
        except ModelError:
            self.logger.debug("File '{}' no longer in model, skipping auto-delete".format(file_name))
```

### Pattern 2: Config Section for Auto-Delete Settings

**What:** Add Config.AutoDelete InnerConfig section with typed properties.

**When to use:** Follow existing Config.Sonarr pattern for optional backward-compatible sections.

**Example:**
```python
# Source: src/python/common/config.py Config.Sonarr pattern
class Config(Persist):
    class AutoDelete(IC):
        enabled = PROP("enabled", Checkers.null, Converters.bool)
        dry_run = PROP("dry_run", Checkers.null, Converters.bool)
        delay_seconds = PROP("delay_seconds", Checkers.int_positive, Converters.int)

        def __init__(self):
            super().__init__()
            self.enabled = None
            self.dry_run = None
            self.delay_seconds = None

    def __init__(self):
        # ... existing sections ...
        self.autodelete = Config.AutoDelete()

    @staticmethod
    def from_dict(config_dict: OuterConfigType) -> "Config":
        # ... existing sections ...

        # AutoDelete section is optional for backward compatibility
        if "AutoDelete" in config_dict:
            config.autodelete = Config.AutoDelete.from_dict(
                Config._check_section(config_dict, "AutoDelete")
            )

        return config
```

### Pattern 3: Angular Settings Section

**What:** Add AutoDelete section to settings page following *arr Integration pattern.

**When to use:** New config sections need UI controls in settings.

**Example:**
```typescript
// Source: src/angular/src/app/pages/settings/options-list.ts
export const OPTIONS_CONTEXT_AUTODELETE: IOptionsContext = {
    header: "Auto-Delete After Import",
    id: "auto-delete",
    options: [
        {
            type: OptionType.Checkbox,
            label: "Enable auto-delete",
            valuePath: ["autodelete", "enabled"],
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

### Anti-Patterns to Avoid

- **Timer without cancellation tracking:** Always store Timer reference in dict so duplicate detections can cancel old timers.
- **delete_remote() from auto-delete:** NEVER call delete_remote() — auto-delete is LOCAL-ONLY safety feature.
- **Deleting before checking ModelError:** File might be removed from model by the time timer fires — catch ModelError gracefully.
- **Ignoring dry-run flag:** Always check dry_run before actual deletion — this is critical safety mechanism.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Delayed execution | Custom sleep loop | threading.Timer | Standard, clean, cancellable |
| Config validation | Manual type checking | InnerConfig PROP pattern | Already implemented, typed, validated |
| File deletion | Custom os.remove logic | FileOperationManager.delete_local() | Handles files + directories, process cleanup |
| State persistence | Custom JSON serialization | Existing ControllerPersist | BoundedOrderedSet already tracking imports |

**Key insight:** The codebase already has robust deletion, config, and import tracking. Auto-delete is orchestration of existing components, not new primitives.

## Common Pitfalls

### Pitfall 1: Timer Leaks on Shutdown
**What goes wrong:** Timers still pending when Controller stops cause threads to outlive process.
**Why it happens:** Timer.start() creates daemon=False thread by default.
**How to avoid:** Cancel all pending timers in Controller.stop().
**Warning signs:** Process doesn't exit cleanly, threads remain after shutdown.

### Pitfall 2: Delete Remote Instead of Local
**What goes wrong:** Accidentally calling delete_remote() destroys seedbox files user still needs.
**Why it happens:** Copy-paste from delete command handler which has both options.
**How to avoid:** Code review checkpoint — auto-delete ONLY calls delete_local(), never delete_remote().
**Warning signs:** Remote files disappearing after Sonarr import.

### Pitfall 3: Race Condition with Manual Deletion
**What goes wrong:** User manually deletes file while timer is pending, timer fires and logs error.
**Why it happens:** Timer doesn't know file was already deleted.
**How to avoid:** Catch ModelError in __execute_auto_delete and log as debug, not error.
**Warning signs:** Error logs when file legitimately doesn't exist.

### Pitfall 4: Import Detection False Positives
**What goes wrong:** File deleted even though Sonarr import actually failed.
**Why it happens:** Queue disappearance doesn't guarantee successful import (Sonarr might fail after removing from queue).
**How to avoid:** Phase 23 already mitigates with trackedDownloadState=="imported" signal. Safety delay gives user time to notice toast notification before deletion.
**Warning signs:** Files deleted but not actually imported to library.

### Pitfall 5: Timer Not Canceled on Config Disable
**What goes wrong:** User disables auto-delete toggle but pending timers still fire.
**Why it happens:** Timers scheduled before config change aren't canceled.
**How to avoid:** Check config.autodelete.enabled in __execute_auto_delete before deletion.
**Warning signs:** Files deleted after feature was disabled.

## Code Examples

Verified patterns from codebase and documentation:

### Integration Point: Controller.__check_sonarr_imports()
```python
# Source: src/python/controller/controller.py line 656
def __check_sonarr_imports(self):
    """
    Poll Sonarr for newly imported files and update persist state.
    Also sets import_status on model files for UI badge display.
    """
    # Get current model file names for matching
    model_file_names = set(self.__model.get_file_names())

    newly_imported = self.__sonarr_manager.process(model_file_names)

    for file_name in newly_imported:
        self.__persist.imported_file_names.add(file_name)
        self.logger.info("Recorded Sonarr import: '{}'".format(file_name))
        # Update model file import status for UI badge
        try:
            old_file = self.__model.get_file(file_name)
            if old_file.import_status != ModelFile.ImportStatus.IMPORTED:
                new_file = copy.copy(old_file)
                new_file._ModelFile__frozen = False
                new_file.import_status = ModelFile.ImportStatus.IMPORTED
                self.__model.update_file(new_file)
        except ModelError:
            pass  # File no longer in model

        # NEW: Schedule auto-delete if enabled
        if self.__context.config.autodelete.enabled:
            self.__schedule_auto_delete(file_name)
```

### Timer Cancellation Pattern
```python
# Source: threading.Timer documentation
# https://docs.python.org/3/library/threading.html
timer = threading.Timer(interval, function, args=[], kwargs={})
timer.start()  # Start the timer
timer.cancel()  # Stop the timer (before it executes)
```

### Dry-Run Logging Pattern
```python
# Source: Standard Python logging best practices
if self.__context.config.autodelete.dry_run:
    self.logger.info(
        "DRY-RUN: Would delete local file '{}' (imported {} ago)".format(
            file_name,
            time.time() - import_timestamp
        )
    )
    return  # Don't actually delete
```

### FileOperationManager Delete Local Pattern
```python
# Source: src/python/controller/file_operation_manager.py line 156
def delete_local(self, file: ModelFile) -> bool:
    """
    Start a local file deletion process.

    Args:
        file: The model file to delete locally

    Returns:
        True if delete process was started successfully
    """
    process = DeleteLocalProcess(
        local_path=self.__context.config.lftp.local_path,
        file_name=file.name
    )
    process.set_multiprocessing_logger(self.__mp_logger)
    wrapper = CommandProcessWrapper(
        process=process,
        post_callback=self.__force_local_scan
    )
    self.__active_command_processes.append(wrapper)
    wrapper.process.start()
    return True
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual deletion after import | Auto-delete with safety delay | 2026 (this phase) | Hands-free workflow |
| No dry-run testing | Dry-run mode for validation | 2026 (this phase) | Safer feature adoption |
| Immediate deletion risk | Configurable safety delay | 2026 (this phase) | Prevents race conditions |

**Deprecated/outdated:**
- N/A — This is a new feature, no prior implementation to deprecate.

## Open Questions

1. **Should auto-delete be opt-in or opt-out by default?**
   - What we know: Feature has safety mechanisms (dry-run, delay) but deletion is irreversible.
   - What's unclear: User expectations — do they want automation by default or explicit opt-in?
   - Recommendation: Default to disabled (enabled=false, dry_run=false, delay_seconds=60). User must explicitly enable. This is safer for first release.

2. **Should dry-run mode be separate from enable toggle?**
   - What we know: Dry-run allows testing without risk. Enable toggle controls active deletion.
   - What's unclear: Would users prefer a single "test mode" or separate toggles?
   - Recommendation: Keep separate. Power users want dry-run + enabled simultaneously to audit behavior. Separate toggles provide flexibility.

3. **Should delay be per-file or global minimum?**
   - What we know: Current design is global config (delay_seconds applies to all files).
   - What's unclear: Do some file types need longer delays (e.g., season packs)?
   - Recommendation: Start with global delay. Can add per-file overrides later if users request it. YAGNI principle.

4. **Should auto-delete honor user's manual delete vs keep decision?**
   - What we know: User can manually delete or keep files. Auto-delete runs independently.
   - What's unclear: If user manually deleted a file before auto-delete timer fires, is that a conflict?
   - Recommendation: No conflict — both achieve same outcome (local file removed). Catch ModelError gracefully if file already gone.

## Sources

### Primary (HIGH confidence)
- Python threading.Timer documentation: https://docs.python.org/3/library/threading.html
- Existing codebase patterns: src/python/controller/controller.py, file_operation_manager.py, config.py
- Phase 23 RESEARCH.md: Manager pattern, import detection mechanism

### Secondary (MEDIUM confidence)
- [Super Fast Python: Threading Timer Thread in Python](https://superfastpython.com/timer-thread-in-python/)
- [Python safe file deletion best practices](https://skills-datanalytics.com/blogs/deleting-files-in-python-step-by-step-instructions-and-best-practices)
- [Python Timer cancel() examples](https://www.programcreek.com/python/example/2317/threading.Timer)

### Tertiary (LOW confidence)
- [Python Job Scheduling: Methods and Overview in 2026](https://research.aimultiple.com/python-job-scheduling/) — General scheduling overview, not directly applicable
- [Task Scheduling with Python](https://www.topcoder.com/thrive/articles/task-scheduling-with-python) — Academic perspective, not production patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All stdlib, no new dependencies, threading.Timer is well-documented
- Architecture: HIGH — Existing patterns (Manager, Config.InnerConfig, FileOperationManager) provide clear template
- Pitfalls: HIGH — Timer leaks, delete-remote risk, race conditions are well-understood problems with known solutions

**Research date:** 2026-02-10
**Valid until:** 30 days (stable domain, Python stdlib changes rarely, codebase patterns established)
