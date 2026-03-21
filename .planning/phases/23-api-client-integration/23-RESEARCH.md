# Phase 23: API Client Integration - Research

**Researched:** 2026-02-10
**Domain:** Sonarr Queue API polling, Python backend manager integration, persistent state tracking
**Confidence:** HIGH

## Summary

This phase adds Sonarr queue polling to the SeedSync backend to detect when Sonarr has imported files that SeedSync previously synced. The core mechanism is: poll Sonarr's `/api/v3/queue` endpoint every 60 seconds, track which queue items correspond to files SeedSync is managing, and when those items disappear from the queue (or transition to `imported` state), record them as "imported" in a persistent set.

The codebase has well-established patterns for this: the Manager pattern (LftpManager, ScanManager, FileOperationManager) provides a clear template for a new SonarrManager. The ControllerPersist class with BoundedOrderedSet provides a proven persistence mechanism. The `requests` library is already a project dependency and is used in the existing Sonarr test-connection handler.

**Primary recommendation:** Create a SonarrManager that polls Sonarr queue API on a timer within the ControllerJob execute loop, matching queue items to SeedSync ModelFiles by name. Track imported files in a new BoundedOrderedSet in ControllerPersist. The manager should be lightweight -- no separate thread or process needed since the HTTP call is short-lived and the ControllerJob already runs on a 0.5s loop.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| requests | ^2.32.5 | HTTP calls to Sonarr API | Already in pyproject.toml, used by config handler |
| threading | stdlib | Timer/lock for poll interval | Consistent with existing codebase patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| json | stdlib | Parse Sonarr API responses | Every poll cycle |
| logging | stdlib | Log polling activity and detections | Every poll cycle |
| time | stdlib | Track poll intervals | Poll timing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| requests | aiohttp | async but entire codebase is sync/threaded |
| requests | urllib3 | lower-level, no benefit over requests |
| polling in controller loop | dedicated thread | unnecessary complexity for a 60s poll |

**Installation:**
No new dependencies needed. `requests ^2.32.5` is already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/python/
  controller/
    sonarr_manager.py     # New: SonarrManager class
  controller/
    controller.py         # Modified: integrate SonarrManager
    controller_persist.py # Modified: add imported_file_names set
    controller_job.py     # No change needed (manager called from controller.process())
```

### Pattern 1: Manager Pattern (follow LftpManager/ScanManager)

**What:** A manager class that encapsulates all Sonarr API interaction, instantiated by Controller.

**When to use:** This is the only pattern to follow -- all external integrations in this codebase use it.

**Example:**
```python
# Source: Derived from src/python/controller/lftp_manager.py pattern
class SonarrManager:
    """
    Manages Sonarr queue polling and import detection.

    Responsible for:
    - Polling Sonarr queue API at configured intervals
    - Tracking which queue items correspond to SeedSync files
    - Detecting when files disappear from queue (import completion)
    - Reporting newly imported files

    Thread-safety: Called only from the controller thread (via process()),
    so no synchronization needed for internal state. The requests library
    is thread-safe for independent sessions.
    """

    POLL_INTERVAL_SECS = 60

    def __init__(self, context: Context):
        self.__context = context
        self.logger = context.logger.getChild("SonarrManager")
        self.__enabled = context.config.sonarr.enabled
        self.__sonarr_url = context.config.sonarr.sonarr_url
        self.__api_key = context.config.sonarr.sonarr_api_key
        self.__last_poll_time = None
        self.__previous_queue_names = set()  # names from last poll
        self.__newly_imported = []  # files detected as imported since last check

    def process(self, model_file_names: set) -> list:
        """
        Called each controller cycle. Polls if interval elapsed.
        Returns list of newly imported file names (empty most cycles).
        """
        if not self.__enabled:
            return []

        now = time.time()
        if self.__last_poll_time and (now - self.__last_poll_time) < self.POLL_INTERVAL_SECS:
            return []

        self.__last_poll_time = now
        return self._poll_and_detect(model_file_names)
```

### Pattern 2: Persistence via ControllerPersist + BoundedOrderedSet

**What:** Add a new `imported_file_names` BoundedOrderedSet to ControllerPersist, following the exact same pattern as `downloaded_file_names` and `extracted_file_names`.

**When to use:** For tracking which files Sonarr has imported, persisted across restarts.

**Example:**
```python
# Source: Derived from src/python/controller/controller_persist.py
class ControllerPersist(Persist):
    __KEY_IMPORTED_FILE_NAMES = "imported"

    def __init__(self, max_tracked_files=None):
        # ... existing code ...
        self.imported_file_names: BoundedOrderedSet[str] = BoundedOrderedSet(
            maxlen=self._max_tracked_files
        )
```

The `to_str()` and `from_str()` methods need updating to include the new key. The `imported` key should be optional in `from_str()` for backward compatibility (same as `stopped` was handled).

### Pattern 3: Controller Integration via process() Hook

**What:** The Controller.process() method is the central orchestration point. SonarrManager.process() should be called from here, just like scan_manager and lftp_manager are already queried.

**When to use:** Always -- this is how the controller advances state.

**Example:**
```python
# In controller.py __update_model() or process()
def process(self):
    # ... existing code ...
    self.__propagate_exceptions()
    self.__file_op_manager.cleanup_completed_processes()
    self.__process_commands()
    self.__update_model()
    self.__memory_monitor.log_stats_if_due()
    # New: poll Sonarr for imports
    self.__check_sonarr_imports()
```

### Anti-Patterns to Avoid
- **Separate thread/process for polling:** Unnecessary. The controller loop runs every 0.5s. The SonarrManager just needs to check "has 60s elapsed?" and make one HTTP call. A 10s timeout on the request is fine.
- **Storing full Sonarr queue response:** Only store what's needed (file name matching). Don't persist Sonarr-specific data.
- **Matching by path instead of name:** Sonarr queue `title` and `outputPath` won't match SeedSync paths exactly. Match by file/folder name (the root name used as ModelFile.name).
- **Polling with threading.Timer:** Avoid creating Timer objects. The existing pattern is to check elapsed time in the main loop.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP client | Custom urllib wrapper | `requests` library | Already a dependency, proven, handles timeouts |
| Persistent set with eviction | Custom file-based tracker | `BoundedOrderedSet` + `ControllerPersist` | Battle-tested in codebase, handles serialization |
| Periodic execution | threading.Timer or custom scheduler | Time-check in process() loop | Matches existing ScannerProcess interval pattern |
| API key auth | Custom header management | requests headers dict | `{"X-Api-Key": api_key}` is standard Sonarr auth |

**Key insight:** This codebase already has all the infrastructure for what Phase 23 needs. The task is integration, not invention.

## Common Pitfalls

### Pitfall 1: Sonarr Queue Pagination
**What goes wrong:** The Sonarr queue API is paginated (default pageSize=10). If there are more than 10 items in queue, you miss some.
**Why it happens:** Default API call only returns first page.
**How to avoid:** Always pass `pageSize=200` (or a large number) to get all items. The API supports up to ~200 items per page safely. Alternatively, check `totalRecords` and paginate if needed.
**Warning signs:** Import detection works for some files but not others; works when queue is small but fails when busy.

### Pitfall 2: Queue Item Name Matching
**What goes wrong:** Sonarr queue `title` field contains the release/torrent name, which may differ from the file/folder name SeedSync tracks.
**Why it happens:** Sonarr's `title` is the release name from the indexer, while SeedSync tracks the actual file/folder name on disk.
**How to avoid:** Use the `title` field for matching since it typically matches the torrent/folder name. Also consider using `outputPath` as a secondary match if available (it contains the full download path). The match should be case-insensitive substring or exact match on the filename portion.
**Warning signs:** Files never detected as imported even though Sonarr processes them.

### Pitfall 3: Disappearance vs State Change Detection
**What goes wrong:** Relying solely on items "disappearing" from queue misses cases where items stay in queue with `trackedDownloadState: "imported"` or `"failed"`.
**Why it happens:** Sonarr's "Remove Completed" setting controls whether imported items are auto-removed from queue. If disabled, items persist with `imported` state.
**How to avoid:** Detect BOTH: (a) items that disappear from queue between polls, AND (b) items whose `trackedDownloadState` becomes `"imported"`. Use the `trackedDownloadState` field as the primary signal.
**Warning signs:** Works on some Sonarr setups but not others depending on their "Remove Completed" configuration.

### Pitfall 4: Network Errors Disrupting State
**What goes wrong:** A failed API call (timeout, connection refused) could be misinterpreted as "queue is empty" leading to false import detections.
**Why it happens:** If error handling returns an empty list instead of None/error, the diff logic thinks everything was imported.
**How to avoid:** On API error, return None (not empty list). Only update the previous queue state when the API call succeeds. Log the error and retry next cycle.
**Warning signs:** Files suddenly detected as "imported" when Sonarr is restarting or network is flaky.

### Pitfall 5: Backward Compatibility of Persist File
**What goes wrong:** Adding a new key to ControllerPersist breaks loading of old persist files.
**Why it happens:** `from_str()` expects the new key.
**How to avoid:** Make the new `imported` key optional in `from_str()` with a default of `[]`, exactly like `stopped` was handled (line 90 of controller_persist.py: `dct.get(..., [])`).
**Warning signs:** App crashes on startup with existing persist file from before the upgrade.

### Pitfall 6: First Poll After Startup
**What goes wrong:** On first startup, there's no "previous queue state" so you can't detect disappearances.
**Why it happens:** The previous_queue_names set is empty.
**How to avoid:** On the very first poll, just populate the previous state without detecting any imports. Only start detecting on the second poll onwards.
**Warning signs:** Every file currently in Sonarr queue is incorrectly marked as "imported" on first startup.

## Code Examples

Verified patterns from the existing codebase:

### Sonarr API Call Pattern (from config handler)
```python
# Source: src/python/web/handler/config.py lines 62-67
response = requests.get(
    "{}/api/v3/system/status".format(url),
    headers={"X-Api-Key": sonarr_api_key},
    timeout=10
)
if response.status_code == 200:
    data = response.json()
```

### Queue API Call
```python
# Source: Sonarr API documentation + pyarr library patterns
def _fetch_queue(self) -> Optional[list]:
    """Fetch current Sonarr queue. Returns list of records or None on error."""
    url = self.__sonarr_url.rstrip("/")
    try:
        response = requests.get(
            "{}/api/v3/queue".format(url),
            headers={"X-Api-Key": self.__api_key},
            params={
                "pageSize": 200,
                "includeUnknownSeriesItems": True,
            },
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("records", [])
        else:
            self.logger.warning("Sonarr queue API returned status {}".format(
                response.status_code))
            return None
    except requests.RequestException as e:
        self.logger.warning("Sonarr queue API error: {}".format(str(e)))
        return None
```

### Manager Construction Pattern (from Controller.__init__)
```python
# Source: src/python/controller/controller.py lines 109-123
# Setup the LFTP manager
self.__lftp_manager = LftpManager(context=self.__context)

# Setup the scan manager
self.__scan_manager = ScanManager(
    context=self.__context,
    mp_logger=self.__mp_logger
)

# New: Setup the Sonarr manager
self.__sonarr_manager = SonarrManager(context=self.__context)
```

### Persistence Serialization Pattern
```python
# Source: src/python/controller/controller_persist.py lines 87-90
# Optional key with default for backward compatibility
stopped_list = dct.get(ControllerPersist.__KEY_STOPPED_FILE_NAMES, [])

# Same pattern for imported:
imported_list = dct.get(ControllerPersist.__KEY_IMPORTED_FILE_NAMES, [])
```

### ControllerJob Loop (where process is called)
```python
# Source: src/python/controller/controller_job.py lines 28-30
@overrides(Job)
def execute(self):
    self.__controller.process()
    self.__auto_queue.process()
```

### BoundedOrderedSet Usage
```python
# Source: src/python/controller/controller.py lines 456-458
if downloaded:
    self.__persist.downloaded_file_names.add(diff.new_file.name)
    self.__model_builder.set_downloaded_files(self.__persist.downloaded_file_names)
```

## Sonarr Queue API Reference

### Endpoint
`GET /api/v3/queue`

### Authentication
Header: `X-Api-Key: <api_key>`

### Query Parameters
| Parameter | Type | Default | Purpose |
|-----------|------|---------|---------|
| page | int | 1 | Page number |
| pageSize | int | 10 | Records per page (use 200) |
| sortKey | string | "estimatedCompletionTime" | Sort field |
| sortDirection | string | "ascending" | Sort direction |
| includeUnknownSeriesItems | bool | false | Include unmatched items |
| includeSeries | bool | false | Include series details |
| includeEpisode | bool | false | Include episode details |

### Response Structure
```json
{
    "page": 1,
    "pageSize": 200,
    "sortKey": "estimatedCompletionTime",
    "sortDirection": "ascending",
    "totalRecords": 2,
    "records": [
        {
            "id": 123,
            "seriesId": 45,
            "episodeId": 678,
            "title": "Show.Name.S01E05.720p.WEB.H264-GROUP",
            "size": 1234567890,
            "sizeleft": 0,
            "status": "completed",
            "trackedDownloadStatus": "ok",
            "trackedDownloadState": "importPending",
            "downloadId": "abc123...",
            "protocol": "torrent",
            "downloadClient": "qBittorrent",
            "outputPath": "/downloads/Show.Name.S01E05.720p.WEB.H264-GROUP",
            "indexer": "Prowlarr",
            "errorMessage": "",
            "statusMessages": []
        }
    ]
}
```

### TrackedDownloadState Values (Confidence: HIGH)
| Value | Meaning |
|-------|---------|
| `downloading` | Currently downloading |
| `importPending` | Download complete, waiting for import |
| `importing` | Currently being imported |
| `imported` | Successfully imported into Sonarr library |
| `failedPending` | Failed, awaiting action |
| `failed` | Failed |
| `ignored` | Ignored by user |

### TrackedDownloadStatus Values
| Value | Meaning |
|-------|---------|
| `ok` | No issues |
| `warning` | Has warnings (check statusMessages) |

### Import Detection Strategy

A file is considered "imported by Sonarr" when:
1. **State transition:** `trackedDownloadState` changes to `"imported"`, OR
2. **Queue disappearance:** Item was in queue on previous poll and is gone on current poll (AND the API call succeeded -- not an error)

The recommended approach:
1. Each poll, build a dict of `{title: trackedDownloadState}` for items currently in queue
2. For items that were in the previous poll but not current: mark as imported (disappeared)
3. For items whose state changed to `"imported"`: mark as imported
4. Store the current set as "previous" for next poll
5. Cross-reference detected imports against SeedSync model file names

### Name Matching Strategy

The Sonarr queue `title` field typically contains the torrent/release name, which in most cases matches the folder/file name on the remote server (which is what SeedSync uses as `ModelFile.name`). The `outputPath` field contains the full local path where the download client placed the file.

**Matching approach:**
- Primary: case-insensitive exact match of Sonarr `title` against `ModelFile.name`
- The match should be bidirectional: check SeedSync names against Sonarr names
- Only consider files that SeedSync has in DOWNLOADED, EXTRACTED, or DELETED state (files SeedSync actually synced)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Sonarr v2 API (/api/queue) | Sonarr v3 API (/api/v3/queue) | Sonarr v3 release | New field names, pagination support |
| TrackedDownloadStatus only | TrackedDownloadState added | Sonarr v3 | More granular state tracking |
| No pagination | Paginated queue API | Sonarr v3 | Must handle pageSize parameter |

**Note:** The v3 API applies to both Sonarr v3 and v4 (confirmed in official docs).

## Open Questions

1. **Exact name matching reliability**
   - What we know: Sonarr `title` is the release name, SeedSync ModelFile.name is the folder/file name. In most cases these match.
   - What's unclear: Are there common scenarios where they diverge? (e.g., Sonarr renames on import, download client renames)
   - Recommendation: Implement case-insensitive exact match first. Add logging for unmatched items. If users report mismatches, add fuzzy matching later.

2. **Should imported status affect ModelFile state?**
   - What we know: The phase requirements say "track imported files persistently to prevent re-processing." The persist set alone achieves this.
   - What's unclear: Should there be a new ModelFile.State.IMPORTED? The requirements don't mention UI changes.
   - Recommendation: No new ModelFile state for now. Just track in persist. The imported_file_names set serves the same purpose as downloaded_file_names -- prevent re-processing.

3. **What "prevent re-processing" means concretely**
   - What we know: Once a file is marked imported, something should change about how SeedSync handles it.
   - What's unclear: Should imported files be excluded from AutoQueue? Should they affect the DELETED state logic?
   - Recommendation: For Phase 23, just track the data. The concrete "prevent re-processing" behavior can be wired in based on specific use cases (e.g., don't auto-queue files Sonarr already imported).

## Sources

### Primary (HIGH confidence)
- Sonarr queue API fields verified via [golift/starr Go library](https://github.com/golift/starr/blob/v1.3.0/sonarr/queue.go) - complete QueueRecord struct
- [Sonarr API docs](https://sonarr.tv/docs/api/) - official endpoint reference
- TrackedDownloadState enum values confirmed via [radarr-exporter issue #8](https://github.com/onedr0p/radarr-exporter/issues/8) and multiple source code references
- Existing codebase files (read directly): controller.py, scan_manager.py, lftp_manager.py, persist.py, controller_persist.py, config.py, bounded_ordered_set.py, seedsync.py, controller_job.py, job.py, file_operation_manager.py, auto_queue.py, model_builder.py, model/file.py, context.py, status.py, web/handler/config.py, constants.py

### Secondary (MEDIUM confidence)
- [pyarr documentation](https://docs.totaldebug.uk/pyarr/_modules/pyarr/sonarr.html) - queue API parameters (includeUnknownSeriesItems, includeSeries, includeEpisode)
- [Sonarr GitHub issue #7389](https://github.com/Sonarr/Sonarr/issues/7389) - queue API response structure with actual JSON examples
- [Sonarr queue cleaner](https://github.com/MattDGTL/sonarr-radarr-queue-cleaner) - real-world queue API usage patterns

### Tertiary (LOW confidence)
- None -- all findings verified with at least two sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - `requests` already in use, no new dependencies
- Architecture: HIGH - directly derived from reading existing codebase patterns
- Sonarr API: HIGH - verified from Go struct definition + multiple community sources
- Name matching strategy: MEDIUM - logical inference, may need iteration based on real-world testing
- Pitfalls: HIGH - derived from API behavior + codebase patterns

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days - stable domain, Sonarr v3 API is mature)
