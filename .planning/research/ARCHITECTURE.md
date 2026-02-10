# Architecture Research: Sonarr Integration

**Domain:** Media automation integration (Sonarr API)
**Researched:** 2026-02-10
**Confidence:** MEDIUM

## Integration Overview

SeedSync v1.7 adds Sonarr integration to auto-delete local files after confirmed import. The integration follows existing Manager pattern and Model listener architecture.

```
┌─────────────────────────────────────────────────────────────┐
│                  Controller (Main Loop)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ ScanManager  │  │LftpManager   │  │FileOpManager │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────────────────────────────────────────┐       │
│  │         SonarrManager (NEW)                      │       │
│  │  - Polls Sonarr API for import status           │       │
│  │  - Detects when files are imported               │       │
│  │  - Triggers auto-delete commands                 │       │
│  └──────────────────────────────────────────────────┘       │
├─────────────────────────────────────────────────────────────┤
│                        Model Layer                           │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  ModelFile (State Machine)                          │    │
│  │  States: DEFAULT → DOWNLOADING → DOWNLOADED         │    │
│  │          EXTRACTED → DELETED                        │    │
│  │  NEW: sonarr_imported timestamp (optional)          │    │
│  └─────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│                    Persistence Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ Downloaded   │  │ Extracted    │  │ Sonarr       │       │
│  │ Files (BOS)  │  │ Files (BOS)  │  │ Imports (NEW)│       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ External API
                           ↓
                   ┌──────────────┐
                   │ Sonarr v3/v5 │
                   │   REST API   │
                   └──────────────┘
```

## New Components

### 1. SonarrManager (Controller Layer)

**Responsibility:** Poll Sonarr API to detect imports and trigger auto-delete

| Method | Purpose | When Called |
|--------|---------|-------------|
| `process()` | Main polling loop iteration | From Controller.process() |
| `poll_sonarr()` | Query Sonarr API for import status | Each process() cycle |
| `check_for_imports()` | Map Sonarr queue/history to ModelFiles | After poll |
| `trigger_auto_delete()` | Send DELETE_LOCAL command to Controller | When import detected |

**Lifecycle:**
- `__init__()`: Create SonarrAPI client, load config
- `start()`: Begin polling (if enabled)
- `stop()`: Clean shutdown
- `propagate_exception()`: Re-raise API errors

**Integration Points:**
- **Controller**: Receives DELETE_LOCAL commands via queue_command()
- **Model**: Read-only access to check file states
- **Config**: SonarrConfig section (host, port, API key, poll interval, auto-delete enabled)
- **ControllerPersist**: Track imported files to avoid re-deleting

### 2. SonarrPersist (Persistence Layer)

**Responsibility:** Track which files were confirmed imported to prevent duplicate deletions

```python
class SonarrPersist(Persist):
    def __init__(self, max_tracked_files: Optional[int] = None):
        self.imported_file_names: BoundedOrderedSet[str] = BoundedOrderedSet(
            maxlen=max_tracked_files or 10000
        )

    # Serialize to JSON alongside ControllerPersist
```

**Why separate from downloaded_file_names:**
- Downloaded = "file finished syncing from seedbox"
- Imported = "Sonarr confirmed import, safe to delete"
- Different lifecycles: download persists across restarts, import is one-time check

### 3. SonarrConfig (Config Layer)

**Location:** `common/config.py` - new `[Sonarr]` section

| Property | Type | Default | Purpose |
|----------|------|---------|---------|
| `enabled` | bool | False | Enable Sonarr integration |
| `host` | str | "localhost" | Sonarr hostname/IP |
| `port` | int | 8989 | Sonarr port |
| `api_key` | str | "" | API authentication key |
| `use_ssl` | bool | False | HTTPS vs HTTP |
| `poll_interval_sec` | int | 60 | Seconds between API polls |
| `auto_delete_enabled` | bool | True | Auto-delete after import |
| `verify_ssl` | bool | True | Verify SSL certificates |

### 4. SonarrService (API Client Layer)

**Responsibility:** Thin wrapper around pyarr for API communication

```python
class SonarrService:
    def __init__(self, host, port, api_key, use_ssl, verify_ssl):
        from pyarr import SonarrAPI
        protocol = "https" if use_ssl else "http"
        self.client = SonarrAPI(
            f"{protocol}://{host}:{port}",
            api_key=api_key,
            verify_ssl=verify_ssl
        )

    def get_queue(self) -> List[Dict]:
        """Returns Sonarr queue records"""
        return self.client.get_queue()

    def get_history(self, event_type="downloadFolderImported") -> List[Dict]:
        """Returns recent import history"""
        return self.client.get_history(event_type=event_type)
```

**Why pyarr:**
- Mature Python wrapper (5.2.0, production/stable)
- Handles authentication, retries, error mapping
- Returns JSON dicts (easy to work with, version-resilient)
- MIT licensed, well-maintained

## Integration with Existing Architecture

### Manager Pattern

**Existing Pattern:**
```python
# Controller owns managers
self.__scan_manager = ScanManager(context, mp_logger)
self.__lftp_manager = LftpManager(context)
self.__file_op_manager = FileOperationManager(context, mp_logger, callbacks)

# Controller.process() calls each manager
self.__scan_manager.pop_latest_results()
self.__lftp_manager.status()
self.__file_op_manager.cleanup_completed_processes()
```

**Sonarr Integration:**
```python
# Add to Controller.__init__()
self.__sonarr_manager = SonarrManager(
    context=self.__context,
    controller=self,  # For queue_command() and model access
    persist=self.__sonarr_persist
)

# Add to Controller.process() main loop
if self.__context.config.sonarr.enabled:
    self.__sonarr_manager.process()
```

### Model Listener Pattern

**DON'T use Model listeners for Sonarr.**

**Rationale:**
- Listeners notify on file state changes (DOWNLOADING → DOWNLOADED)
- Sonarr import happens EXTERNALLY (Sonarr moves/renames file)
- No SeedSync state change triggers import detection
- Import detection must be POLL-BASED from Sonarr API

**AutoQueue uses listeners because:**
- Files are added/updated by SeedSync's own scanners
- State changes are internal (remote scan finds new file → queue it)

**Sonarr is different:**
- State change happens in external system
- Must actively query to discover

### Command Pattern for Delete

**Existing Pattern:**
```python
# Web handler creates command
command = Controller.Command(Controller.Command.Action.DELETE_LOCAL, filename)
controller.queue_command(command)

# Controller processes commands in main loop
command = self.__command_queue.get_nowait()
if command.action == Controller.Command.Action.DELETE_LOCAL:
    self.__file_op_manager.delete_local(file)
```

**Sonarr Auto-Delete:**
```python
# SonarrManager detects import
if file_imported and auto_delete_enabled:
    command = Controller.Command(
        Controller.Command.Action.DELETE_LOCAL,
        filename
    )
    self.__controller.queue_command(command)
```

**Why NOT direct call to FileOperationManager:**
- Violates Manager encapsulation (Controller owns FileOpManager)
- Command pattern provides unified queueing, callbacks, error handling
- Consistent with existing architecture

## Data Flow: Import Detection → Auto-Delete

### Polling-Based Detection (RECOMMENDED)

**Flow:**
```
1. Controller.process() calls SonarrManager.process()
   ↓
2. SonarrManager.poll_sonarr() → SonarrService.get_queue()
   ↓
3. Check queue records for trackedDownloadStatus changes
   - IF record.status == "completed" AND record.trackedDownloadState == "importPending"
     → Import in progress, wait
   - IF record disappears from queue (was present, now missing)
     → Import complete
   ↓
4. Cross-reference with Model.get_file(filename)
   - Check: file.state == DOWNLOADED or EXTRACTED
   - Check: file.local_size > 0
   ↓
5. IF all checks pass AND filename not in sonarr_persist.imported_file_names:
   - Add to imported_file_names (prevent re-delete)
   - Queue DELETE_LOCAL command
   - Log: "Sonarr imported [filename], queueing auto-delete"
   ↓
6. Controller processes DELETE_LOCAL command normally
   - FileOperationManager.delete_local(file)
   - Force local scan to update model
```

**Poll Strategy:**
- Default interval: 60 seconds (configurable)
- On each poll: GET /api/v3/queue
- Track queue record IDs in memory: `prev_queue_ids` → `current_queue_ids`
- Detect completion: ID was in prev, not in current, filename matches ModelFile

**Why queue, not history:**
- Queue shows active downloads + imports in progress
- History requires filtering, pagination, timestamp comparisons
- Queue disappearance = definitive "import complete" signal
- Simpler logic, fewer edge cases

### Alternative: Webhook-Based Detection (Future Enhancement)

**Not recommended for v1.7:**
- Requires inbound HTTP endpoint (complicates deployment)
- Network restrictions (Docker, NAT, firewall)
- Webhook reliability issues (delivery guarantees, retries)
- Polling is simpler, more reliable for single-user use case

**If implemented later:**
```
Sonarr OnDownload webhook → SeedSync /webhook/sonarr endpoint
    ↓
SonarrWebhookHandler validates payload
    ↓
SonarrManager.handle_import_event(filename, series, episode)
    ↓
Queue DELETE_LOCAL command (same as polling path)
```

## Mapping Sonarr Queue to ModelFile

### Queue Record Structure

Based on Go package documentation and issue discussions:

```json
{
  "id": 12345,
  "seriesId": 123,
  "episodeId": 456,
  "title": "Series.Name.S01E01.1080p.WEB.H264-GROUP",
  "size": 1234567890,
  "status": "completed",
  "trackedDownloadStatus": "ok",
  "trackedDownloadState": "importPending",
  "statusMessages": [
    {
      "title": "Import pending",
      "messages": ["Waiting for download client"]
    }
  ],
  "downloadId": "abc123",
  "protocol": "torrent",
  "downloadClient": "qBittorrent",
  "outputPath": "/downloads/Series.Name.S01E01.1080p.WEB.H264-GROUP"
}
```

### Key Fields for Import Detection

| Field | Purpose | Values |
|-------|---------|--------|
| `title` | Match to ModelFile.name | Exact string match (case-sensitive) |
| `trackedDownloadState` | Import lifecycle | "downloading", "importPending", "importing", "imported" |
| `status` | Download completion | "downloading", "completed", "failed" |
| `outputPath` | Verify path match | Must contain local_path from config |
| `statusMessages` | Error detection | Check for "No files eligible for import" |

### Matching Logic

```python
def find_matching_model_file(queue_record: Dict) -> Optional[ModelFile]:
    """
    Map Sonarr queue record to SeedSync ModelFile.

    Returns:
        ModelFile if match found, None otherwise
    """
    # Strategy 1: Direct name match
    # Sonarr title is usually the folder/file name
    title = queue_record.get("title", "")
    model_file = self.__controller.get_model().get_file(title)
    if model_file:
        return model_file

    # Strategy 2: Extract base name from outputPath
    # outputPath = "/downloads/Series.Name.S01E01.1080p.WEB.H264-GROUP"
    # base_name = "Series.Name.S01E01.1080p.WEB.H264-GROUP"
    output_path = queue_record.get("outputPath", "")
    if output_path:
        base_name = os.path.basename(output_path)
        model_file = self.__controller.get_model().get_file(base_name)
        if model_file:
            return model_file

    # No match found
    return None
```

**Edge Cases:**
- **Sonarr renames files:** outputPath changes after import, title stays same
- **Multiple episodes in one download:** Sonarr may have multiple queue records for same ModelFile
- **Partial imports:** Some files fail, others succeed (check statusMessages)

### Import Completion Detection

**Method 1: Queue Disappearance (RECOMMENDED)**
```python
prev_queue_ids = {record["id"] for record in prev_queue}
current_queue_ids = {record["id"] for record in current_queue}
completed_ids = prev_queue_ids - current_queue_ids

for record in prev_queue:
    if record["id"] in completed_ids:
        # This record disappeared → import complete
        model_file = find_matching_model_file(record)
        if model_file:
            trigger_auto_delete(model_file)
```

**Method 2: History API (Alternative)**
```python
# Query history for recent imports (last 5 minutes)
history = sonarr_service.get_history(event_type="downloadFolderImported")
for record in history:
    if record["eventType"] == "downloadFolderImported":
        source_path = record["data"]["droppedPath"]
        base_name = os.path.basename(source_path)
        model_file = find_matching_model_file({"title": base_name})
        if model_file:
            trigger_auto_delete(model_file)
```

**Recommendation:** Use Method 1 (queue disappearance) for v1.7. Simpler, fewer API calls, no timestamp math.

## State Tracking: Do We Need a New ModelFile State?

**Question:** Should we add `SONARR_IMPORTED` state?

**Answer:** NO. Use status field instead.

### Why NOT a new state:

**ModelFile.State is a LIFECYCLE state machine:**
```
DEFAULT → QUEUED → DOWNLOADING → DOWNLOADED → EXTRACTED → DELETED
```

Each state represents SeedSync's own operations. Sonarr import is an EXTERNAL event, not part of SeedSync's sync lifecycle.

**Adding SONARR_IMPORTED would:**
- Break existing state machine logic (what comes after EXTRACTED?)
- Confuse users (UI shows file as "imported" but it's still locally present)
- Complicate ModelBuilder (how to infer this state from scans?)

### Alternative: Add `sonarr_imported_timestamp` Field

**Proposal:**
```python
class ModelFile:
    def __init__(self, name: str, is_dir: bool):
        # ... existing fields ...
        self.__sonarr_imported_timestamp = None  # Optional[datetime]

    @property
    def sonarr_imported_timestamp(self) -> Optional[datetime]:
        return self.__sonarr_imported_timestamp

    @sonarr_imported_timestamp.setter
    def sonarr_imported_timestamp(self, timestamp: datetime):
        self._check_frozen()
        self.__sonarr_imported_timestamp = timestamp
```

**Benefits:**
- Non-invasive (doesn't affect state machine)
- Supports UI display ("Imported by Sonarr at [time]")
- Enables notifications ("File X was imported")
- Optional (None if Sonarr integration disabled)

**BUT:** May be overkill for v1.7. The imported_file_names BoundedOrderedSet in SonarrPersist is sufficient for auto-delete logic.

**Recommendation for v1.7:** Skip the ModelFile field. Use SonarrPersist tracking only. Add field later if UI needs it.

## Configuration Integration

### Config File Structure

```ini
[Sonarr]
# Enable Sonarr integration
enabled = False

# Sonarr server details
host = localhost
port = 8989
api_key =

# Connection settings
use_ssl = False
verify_ssl = True

# Polling interval (seconds)
poll_interval_sec = 60

# Auto-delete after import
auto_delete_enabled = True
```

### Config Class Implementation

**Location:** `src/python/common/config.py`

```python
class SonarrConfig(Config.Section):
    _SECTION_NAME = "Sonarr"

    enabled = Config.PROP(
        Config.Checkers.boolean(),
        Config.Converters.boolean(),
        default="False"
    )

    host = Config.PROP(
        Config.Checkers.string(),
        Config.Converters.string(),
        default="localhost"
    )

    port = Config.PROP(
        Config.Checkers.integer(min_value=1, max_value=65535),
        Config.Converters.integer(),
        default="8989"
    )

    api_key = Config.PROP(
        Config.Checkers.string(),
        Config.Converters.string(),
        default=""
    )

    use_ssl = Config.PROP(
        Config.Checkers.boolean(),
        Config.Converters.boolean(),
        default="False"
    )

    verify_ssl = Config.PROP(
        Config.Checkers.boolean(),
        Config.Converters.boolean(),
        default="True"
    )

    poll_interval_sec = Config.PROP(
        Config.Checkers.integer(min_value=10, max_value=3600),
        Config.Converters.integer(),
        default="60"
    )

    auto_delete_enabled = Config.PROP(
        Config.Checkers.boolean(),
        Config.Converters.boolean(),
        default="True"
    )

# Add to Config.InnerConfig
class InnerConfig(Config):
    def __init__(self):
        # ... existing sections ...
        self.sonarr = SonarrConfig(self)
```

## Architectural Patterns

### Pattern 1: Manager with External API Client

**What:** SonarrManager owns SonarrService, calls from process() loop

**When to use:** External API integration with polling

**Trade-offs:**
- **Pro:** Encapsulation (API details hidden from Controller)
- **Pro:** Testable (mock SonarrService in tests)
- **Pro:** Error isolation (API exceptions caught in manager)
- **Con:** Adds layer (could call pyarr directly, but less testable)

**Example:**
```python
class SonarrManager:
    def __init__(self, context, controller, persist):
        self.__sonarr_service = SonarrService(
            host=context.config.sonarr.host,
            port=context.config.sonarr.port,
            api_key=context.config.sonarr.api_key,
            use_ssl=context.config.sonarr.use_ssl,
            verify_ssl=context.config.sonarr.verify_ssl
        )
        self.__prev_queue_ids = set()

    def process(self):
        try:
            queue = self.__sonarr_service.get_queue()
            self.__check_for_imports(queue)
        except Exception as e:
            self.logger.warning(f"Sonarr API error: {e}")
```

### Pattern 2: BoundedOrderedSet for Tracking

**What:** Use existing BoundedOrderedSet for imported file tracking

**When to use:** Need to remember past events without unbounded growth

**Trade-offs:**
- **Pro:** Prevents memory leak (auto-evicts old entries)
- **Pro:** Consistent with downloaded_file_names, extracted_file_names
- **Pro:** LRU eviction prevents re-deleting very old files
- **Con:** If limit exceeded, oldest imports forgotten (could re-delete if file re-appears)

**Mitigation:** Set maxlen high (10000 default, configurable). Average user won't hit this in practice.

### Pattern 3: Polling with State Diffing

**What:** Track prev_queue_ids, compare to current_queue_ids, detect disappearances

**When to use:** Detecting external events via polling

**Trade-offs:**
- **Pro:** Reliable (no missed events if poll interval reasonable)
- **Pro:** Simple (no webhook infrastructure)
- **Con:** Latency (import → delete has poll_interval delay)
- **Con:** API load (polls even when idle)

**Optimization:** Exponential backoff if queue empty for N consecutive polls (future enhancement).

## Anti-Patterns

### Anti-Pattern 1: Adding SONARR_IMPORTED State

**What people might do:** Add new state to ModelFile.State enum

**Why it's wrong:**
- Breaks state machine semantics (EXTRACTED → SONARR_IMPORTED → DELETED is illogical)
- External event shouldn't be part of internal lifecycle
- Complicates ModelBuilder (can't infer from filesystem scans)

**Do this instead:** Use optional timestamp field OR persist-only tracking

### Anti-Pattern 2: Direct FileOperationManager Calls

**What people might do:**
```python
# In SonarrManager.process()
self.__file_op_manager.delete_local(file)  # WRONG
```

**Why it's wrong:**
- Violates encapsulation (Controller owns FileOpManager)
- Bypasses command queue (no callback support)
- Breaks testability (can't mock command execution)

**Do this instead:** Use Controller.queue_command()
```python
command = Controller.Command(Action.DELETE_LOCAL, filename)
self.__controller.queue_command(command)
```

### Anti-Pattern 3: Synchronous API Calls in Critical Path

**What people might do:** Poll Sonarr in Controller.get_model_files() (request path)

**Why it's wrong:**
- Blocks web responses (Sonarr API could take 1-5 seconds)
- DoS risk (slow API cascades to all clients)
- Violates separation (request handling should be fast)

**Do this instead:** Poll in Controller.process() background loop, not request path

## Build Order (Dependency-Driven)

Based on component dependencies, suggested implementation order:

### Phase 1: Configuration & Persistence (No Dependencies)
1. **SonarrConfig** (config.py)
   - Add [Sonarr] section with properties
   - No dependencies, pure data structure
   - Test: Config parsing from .ini file

2. **SonarrPersist** (controller_persist.py or new sonarr_persist.py)
   - BoundedOrderedSet for imported_file_names
   - JSON serialization/deserialization
   - Test: Save/load persistence

### Phase 2: API Client (External Dependency)
3. **Add pyarr dependency** (pyproject.toml)
   - `poetry add pyarr`
   - Pin version (5.2.0 or later)

4. **SonarrService** (new file: controller/sonarr_service.py)
   - Wrap pyarr.SonarrAPI
   - get_queue(), get_history() methods
   - Error handling for API failures
   - Test: Mock pyarr, verify error handling

### Phase 3: Manager Logic (Depends on Phase 1 & 2)
5. **SonarrManager** (new file: controller/sonarr_manager.py)
   - process() polling loop
   - find_matching_model_file() mapping logic
   - check_for_imports() with queue diffing
   - trigger_auto_delete() command queueing
   - Test: Mock SonarrService, verify command generation

### Phase 4: Controller Integration (Depends on Phase 3)
6. **Controller modifications** (controller.py)
   - Add sonarr_manager initialization
   - Call sonarr_manager.process() in main loop
   - Add sonarr_persist to ControllerPersist
   - Test: Integration test with mock Sonarr API

### Phase 5: Web API (Depends on Phase 3)
7. **REST endpoints** (web layer)
   - GET /api/sonarr/config → Current settings
   - POST /api/sonarr/config → Update settings
   - GET /api/sonarr/status → Connection test, last poll time
   - Test: API contract tests

### Phase 6: Frontend (Depends on Phase 5)
8. **Settings UI** (Angular)
   - Sonarr config form (host, port, API key)
   - Connection test button
   - Enable/disable toggle
   - Test: E2E settings page

9. **Status Display** (Angular)
   - File list shows import status (optional)
   - Notifications for imports (optional)
   - Test: E2E file operations

### Dependency Graph
```
Config ─┐
        ├─→ SonarrService ─→ SonarrManager ─→ Controller ─→ Web API ─→ Frontend
Persist ┘                                   ↗
                                      pyarr ┘
```

**Critical Path:** Config → pyarr → SonarrService → SonarrManager → Controller

**Parallel Work:** Frontend UI can be built against mocked API while backend is in progress.

## Testing Strategy

### Unit Tests

| Component | Mock Dependencies | Key Test Cases |
|-----------|-------------------|----------------|
| SonarrService | pyarr.SonarrAPI | API errors, response parsing |
| SonarrManager | SonarrService, Controller | Queue diffing, file matching, command generation |
| SonarrPersist | None | Serialization, eviction, bounds |
| SonarrConfig | None | Validation, defaults |

### Integration Tests

1. **Mock Sonarr API Server**
   - Flask server returning fake queue/history responses
   - Test full poll → detect → delete flow
   - Verify no duplicate deletes

2. **E2E with Real Sonarr (Optional)**
   - Docker Compose: SeedSync + Sonarr + qBittorrent
   - Download file → Sonarr imports → SeedSync deletes
   - Manual verification

## Scaling Considerations

| Scale | Considerations |
|-------|----------------|
| Single user (v1.7 target) | Polling every 60s is fine, minimal API load |
| Multiple instances | Each instance polls independently (no coordination needed) |
| High file volume (1000+ files/day) | BoundedOrderedSet eviction may need higher limit |
| Sonarr API rate limits | Add exponential backoff on errors, respect retry-after headers |

**Not a scaling concern:** Sonarr integration is single-user, local network use case. Not designed for multi-tenant or high-throughput scenarios.

## Sources

### Sonarr API Documentation
- [Sonarr API Docs](https://sonarr.tv/docs/api/) - Official API reference (MEDIUM confidence - landing page only)
- [GET /api/v3/queue · Issue #7422](https://github.com/Sonarr/Sonarr/issues/7422) - Queue endpoint discussion
- [sonarr package - golift.io/starr/sonarr](https://pkg.go.dev/golift.io/starr/sonarr) - Go API wrapper (shows response schemas)

### Webhook vs Polling
- [Webhooks vs. Polling](https://medium.com/@nile.bits/webhooks-vs-polling-431294f5af8a) - General comparison
- [Polling vs Webhooks: When to Use One Over the Other](https://unified.to/blog/polling_vs_webhooks_when_to_use_one_over_the_other) - Decision framework
- [Webhook vs. API Polling in System Design](https://www.geeksforgeeks.org/system-design/webhook-vs-api-polling-in-system-design/) - Tradeoffs

### Python Libraries
- [pyarr · PyPI](https://pypi.org/project/pyarr/) - Python Sonarr API wrapper
- [GitHub - totaldebug/pyarr](https://github.com/totaldebug/pyarr) - Source repository
- [pyarr documentation](https://docs.totaldebug.uk/pyarr/) - API reference

### Sonarr Queue/History Details
- [Sonarr Troubleshooting | Servarr Wiki](https://wiki.servarr.com/sonarr/troubleshooting) - Queue status explanations
- [Question about latest changes in queue api · Issue #7663](https://github.com/Sonarr/Sonarr/issues/7663) - statusMessages field
- [GET Queue API 'status' filter does not work · Issue #7389](https://github.com/Sonarr/Sonarr/issues/7389) - Queue filtering

### SeedSync Codebase
- Analyzed: controller.py, scan_manager.py, lftp_manager.py, file_operation_manager.py
- Analyzed: model/file.py (ModelFile.State)
- Analyzed: controller_persist.py (BoundedOrderedSet pattern)
- Analyzed: auto_queue.py (Listener pattern)
- Analyzed: CLAUDE.md (architecture overview)

---
*Architecture research for: Sonarr Integration in SeedSync*
*Researched: 2026-02-10*
