# Plan 23-01 Summary: SonarrManager + ControllerPersist + Controller Integration

**Status:** Complete
**Committed:** 2026-02-10

## What was done

1. **Created `src/python/controller/sonarr_manager.py`** (130 lines)
   - SonarrManager class following Manager pattern (ScanManager/LftpManager)
   - `process()` method: checks enabled, checks 60s poll interval, delegates to `_poll_and_detect()`
   - `_fetch_queue()`: calls Sonarr `/api/v3/queue` with pageSize=200, returns None on error (not empty list)
   - `_poll_and_detect()`: first-poll bootstrap (None vs empty set), detects imports via queue disappearance AND state change to "imported", case-insensitive name matching against model files

2. **Updated `src/python/controller/controller_persist.py`**
   - Added `imported_file_names` BoundedOrderedSet with key "imported"
   - Backward-compatible `from_str()` using `dct.get()` (old persist files load without error)
   - Added to `to_str()`, `get_eviction_stats()`

3. **Updated `src/python/controller/controller.py`**
   - SonarrManager instantiated in `__init__` with context
   - `process()` calls `__check_sonarr_imports()` after model update and memory monitor
   - `__check_sonarr_imports()` passes model file names to SonarrManager, records imports in persist
   - Memory monitor tracks imported_files count and imported_evictions

4. **Updated `src/python/controller/__init__.py`**
   - Added SonarrManager export

## Key decisions

- SonarrManager re-reads config each process() call (hot-toggle without restart)
- Returns None from _fetch_queue() on error to prevent false positive import detection
- First poll uses None sentinel (not empty set) for bootstrap detection
- Case-insensitive matching returns ORIGINAL model file name (not Sonarr name)

## Commit

`feat(23-01): add SonarrManager, imported_file_names persist, Controller integration`
