# Phase 27: Webhook Import Detection - Research

**Researched:** 2026-02-11
**Domain:** Webhook endpoint architecture, Sonarr/Radarr webhook payloads, thread-safe communication, Bottle POST handlers
**Confidence:** HIGH

## Summary

Phase 27 replaces the polling-based SonarrManager with a webhook-driven WebhookManager. Instead of SeedSync polling Sonarr/Radarr queues every 60 seconds to detect imports, Sonarr and Radarr will POST webhook events directly to SeedSync when imports complete. This eliminates latency (detects imports instantly instead of up to 60s delay), removes outbound API calls from SeedSync, and simplifies the architecture.

The core design challenge is thread safety: webhook POST requests arrive on the web server thread (Bottle/Paste multi-threaded), but the import processing pipeline runs on the Controller thread. The solution is a thread-safe queue (Python's `queue.Queue`, already used by the Controller for commands) where the webhook handler enqueues import events and the Controller dequeues them during its process() cycle.

The Sonarr/Radarr webhook payloads use `eventType: "Download"` for import completion events. The key matching field is the series/movie title, which needs to be matched against SeedSync model file names using the same case-insensitive logic currently in SonarrManager.

**Primary recommendation:** Create a WebhookManager with a thread-safe Queue for cross-thread communication. Add POST handlers to a new WebhookHandler that enqueue events. Replace `__check_sonarr_imports()` in Controller to dequeue from WebhookManager instead of polling SonarrManager. Delete SonarrManager entirely.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python queue.Queue | stdlib | Thread-safe event queue between web and controller threads | Already used by Controller for Command queue; proven thread-safe |
| Bottle request.json | existing | Parse webhook POST JSON body | Already used in bulk command handler (controller.py line 247) |
| Python json | stdlib | JSON serialization for webhook responses | Already used throughout web handlers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| unittest.mock | stdlib | Mocking for tests | WebhookManager and WebhookHandler unit tests |
| threading.Lock | stdlib | Protect shared state in WebhookManager | Only if WebhookManager needs mutable state beyond Queue |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| queue.Queue | threading.Event + list | Queue is simpler, already proven in Controller command pattern |
| Inline handler in Controller | Separate WebhookManager class | Manager pattern matches existing codebase (ScanManager, LftpManager, etc.) |
| Complex payload parsing | Simple eventType + title extraction | We only need the title to match against model files; ignore everything else |

**Installation:**
No new dependencies required. All libraries already present.

## Architecture Patterns

### Recommended Project Structure
```
src/python/
  controller/
    webhook_manager.py     # NEW: WebhookManager (replaces sonarr_manager.py)
    sonarr_manager.py      # DELETED
  web/
    handler/
      webhook.py           # NEW: WebhookHandler with POST routes
```

### Pattern 1: Thread-Safe Queue Communication (WebhookManager)
**What:** WebhookManager owns a `queue.Queue` for receiving import events from the web thread, and a `process()` method called by the Controller thread to drain the queue and return newly imported file names.
**When to use:** Always -- this is the core architecture.
**Example:**
```python
# Source: Pattern mirrors Controller.__command_queue (controller.py line 90)
from queue import Queue
from typing import List, Set

class WebhookManager:
    """
    Receives webhook import events from web thread, provides them to
    controller thread via process().

    Thread-safety: Queue is thread-safe. enqueue_import() is called from
    web server thread. process() is called from controller thread.
    """
    def __init__(self, context):
        self.__context = context
        self.logger = context.logger.getChild("WebhookManager")
        self.__import_queue = Queue()  # (source: str, file_name: str) tuples

    def enqueue_import(self, source: str, file_name: str):
        """Called from web thread when webhook received."""
        self.__import_queue.put((source, file_name))
        self.logger.info("{} webhook import enqueued: '{}'".format(source, file_name))

    def process(self, model_file_names: Set[str]) -> List[str]:
        """
        Called from controller thread each cycle.
        Drains queue and returns list of matched model file names.
        """
        newly_imported = []
        model_file_names_lower = {name.lower(): name for name in model_file_names}

        while not self.__import_queue.empty():
            source, file_name = self.__import_queue.get_nowait()
            original_name = model_file_names_lower.get(file_name.lower())
            if original_name is not None:
                newly_imported.append(original_name)
                self.logger.info(
                    "{} import detected: '{}' (matched SeedSync file '{}')".format(
                        source, file_name, original_name
                    )
                )
            else:
                self.logger.debug(
                    "{} webhook file '{}' not in SeedSync model".format(
                        source, file_name
                    )
                )

        return newly_imported
```

### Pattern 2: Webhook POST Handler (WebhookHandler)
**What:** A Bottle IHandler that registers POST routes for `/server/webhook/sonarr` and `/server/webhook/radarr`. Validates the webhook payload, extracts the file name, and enqueues it via WebhookManager.
**When to use:** Always -- this is the web entry point.
**Example:**
```python
# Source: Pattern mirrors ControllerHandler (web/handler/controller.py)
import json
from bottle import HTTPResponse, request
from common import overrides
from controller.webhook_manager import WebhookManager
from ..web_app import IHandler, WebApp

class WebhookHandler(IHandler):
    def __init__(self, webhook_manager: WebhookManager):
        self.__webhook_manager = webhook_manager

    @overrides(IHandler)
    def add_routes(self, web_app: WebApp):
        web_app.add_post_handler("/server/webhook/sonarr", self.__handle_sonarr_webhook)
        web_app.add_post_handler("/server/webhook/radarr", self.__handle_radarr_webhook)

    def __handle_sonarr_webhook(self) -> HTTPResponse:
        return self._handle_webhook("Sonarr", self._extract_sonarr_title)

    def __handle_radarr_webhook(self) -> HTTPResponse:
        return self._handle_webhook("Radarr", self._extract_radarr_title)

    def _handle_webhook(self, source, extract_title_fn) -> HTTPResponse:
        try:
            body = request.json
        except Exception:
            return HTTPResponse(body="Invalid JSON", status=400)

        if not body:
            return HTTPResponse(body="Empty body", status=400)

        event_type = body.get("eventType", "")

        # Only process Download (import) events
        if event_type == "Test":
            return HTTPResponse(body="Test OK", status=200)
        if event_type != "Download":
            return HTTPResponse(body="OK", status=200)

        title = extract_title_fn(body)
        if not title:
            return HTTPResponse(body="OK", status=200)

        self.__webhook_manager.enqueue_import(source, title)
        return HTTPResponse(body="OK", status=200)

    @staticmethod
    def _extract_sonarr_title(body: dict) -> str:
        """Extract series title from Sonarr webhook payload."""
        series = body.get("series", {})
        return series.get("title", "")

    @staticmethod
    def _extract_radarr_title(body: dict) -> str:
        """Extract movie title from Radarr webhook payload."""
        movie = body.get("movie", {})
        return movie.get("title", "")
```

### Pattern 3: Controller Integration (Replace __check_sonarr_imports)
**What:** Replace `__check_sonarr_imports()` with `__check_webhook_imports()` that calls `WebhookManager.process()` instead of `SonarrManager.process()`. Same downstream flow: persist, badge, toast, auto-delete.
**When to use:** Always.
**Example:**
```python
# Source: Replaces __check_sonarr_imports (controller.py lines 669-696)
def __check_webhook_imports(self):
    """
    Check for newly imported files from webhook events.
    Replaces __check_sonarr_imports (polling) with webhook-driven detection.
    """
    model_file_names = set(self.__model.get_file_names())
    newly_imported = self.__webhook_manager.process(model_file_names)

    for file_name in newly_imported:
        self.__persist.imported_file_names.add(file_name)
        self.logger.info("Recorded webhook import: '{}'".format(file_name))
        # Update model file import status for UI badge
        try:
            old_file = self.__model.get_file(file_name)
            if old_file.import_status != ModelFile.ImportStatus.IMPORTED:
                new_file = copy.copy(old_file)
                new_file._ModelFile__frozen = False
                new_file.import_status = ModelFile.ImportStatus.IMPORTED
                self.__model.update_file(new_file)
        except ModelError:
            pass

        # Schedule auto-delete if enabled
        if self.__context.config.autodelete.enabled:
            self.__schedule_auto_delete(file_name)
```

### Pattern 4: WebAppBuilder Integration
**What:** Create WebhookHandler in WebAppBuilder, pass WebhookManager (shared with Controller).
**Example:**
```python
# Source: Extends WebAppBuilder (web/web_app_builder.py)
from .handler.webhook import WebhookHandler

class WebAppBuilder:
    def __init__(self, context, controller, auto_queue_persist, webhook_manager):
        # ... existing ...
        self.webhook_handler = WebhookHandler(webhook_manager)

    def build(self) -> WebApp:
        web_app = WebApp(...)
        # ... existing handlers ...
        self.webhook_handler.add_routes(web_app)
        web_app.add_default_routes()
        return web_app
```

### Anti-Patterns to Avoid
- **Processing webhook inline on web thread:** Never call Controller methods directly from the webhook handler. The Controller is not thread-safe for direct calls from the web thread. Always use the Queue.
- **Validating webhook signatures:** Sonarr/Radarr webhooks don't use HMAC signatures. Don't waste time implementing signature verification. The webhooks are trusted (LAN traffic).
- **Parsing complex webhook payloads:** We only need `eventType` and `series.title`/`movie.title`. Don't parse quality, episodes, release info, etc.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Thread-safe queue | Custom lock + list | queue.Queue | Thread-safe by design, proven in Controller command pattern |
| JSON POST parsing | Manual body reading | bottle request.json | Handles Content-Type, parsing, error cases |
| Import pipeline | Duplicate persist/badge/auto-delete logic | Reuse existing __check_sonarr_imports body | Same flow, just different input source |
| Webhook URL construction | Build URL from server IP/port | Static display text with placeholder | User copies the URL pattern and fills in their SeedSync address |

**Key insight:** The import processing pipeline (persist, badge, toast, auto-delete) stays identical. Only the _source_ of import events changes from polling to webhook.

## Common Pitfalls

### Pitfall 1: Title Matching Semantics Differ Between Polling and Webhooks
**What goes wrong:** SonarrManager matches Sonarr queue `title` field against SeedSync model file names. Webhook payloads use `series.title` (e.g., "Game of Thrones") which is the SERIES title, not the download/torrent title. The Sonarr queue `title` field is the torrent/release title (e.g., "Game.of.Thrones.S01E01.720p"), which matches SeedSync file names.
**Why it happens:** Sonarr queue API `title` = torrent title. Webhook `series.title` = human-readable series name. These are completely different strings.
**How to avoid:** Use `episodeFile.relativePath` or `episodeFile.sceneName` or `release.releaseTitle` from the webhook payload instead of `series.title`. The `release.releaseTitle` is the closest match to what the Sonarr queue `title` field contained. Alternatively, use `episodeFile.sourcePath` and extract the filename.
**Warning signs:** Webhooks fire but no imports are detected because title doesn't match any model file.

### Pitfall 2: Forgetting the "Test" Event Type
**What goes wrong:** User configures webhook in Sonarr/Radarr and clicks "Test". SeedSync returns an error or tries to process it as an import, causing confusing behavior.
**Why it happens:** Sonarr/Radarr send a webhook with `eventType: "Test"` when the user clicks the test button in their settings.
**How to avoid:** Always handle `eventType: "Test"` explicitly, return 200 with a friendly message.
**Warning signs:** User reports "webhook test fails" in Sonarr/Radarr settings.

### Pitfall 3: Returning Non-200 Status Codes for Unknown Events
**What goes wrong:** SeedSync returns 400 for unrecognized event types (Grab, Rename, SeriesAdd, etc.). Sonarr/Radarr interpret non-200 as failure and may retry or show errors.
**Why it happens:** Only `Download` events are relevant, but Sonarr/Radarr send ALL event types the user has enabled.
**How to avoid:** Return 200 for ALL event types. Only _process_ the `Download` event type. Log and ignore others.
**Warning signs:** Sonarr/Radarr show webhook health check failures.

### Pitfall 4: Not Passing WebhookManager Through to Both Controller and WebAppBuilder
**What goes wrong:** WebhookManager is created but not shared between the web handler (which enqueues) and the Controller (which dequeues). Two separate instances mean events go nowhere.
**Why it happens:** Each creates its own WebhookManager instance instead of sharing one.
**How to avoid:** Create WebhookManager in `seedsync.py` and pass it to both Controller and WebAppBuilder. This is the same pattern used for `controller_persist` and `auto_queue_persist`.
**Warning signs:** Webhook POSTs succeed (200 response) but no imports are detected.

### Pitfall 5: Breaking Existing Controller Unit Tests
**What goes wrong:** All existing controller tests mock `SonarrManager`. Replacing it with `WebhookManager` means 7+ test files need their mock setup updated.
**Why it happens:** `BaseControllerTestCase` and `BaseAutoDeleteTestCase` both patch `controller.controller.SonarrManager`. This needs to change to `controller.controller.WebhookManager`.
**How to avoid:** Update ALL test base classes to mock `WebhookManager` instead of `SonarrManager`. Search for all references to `SonarrManager` in tests.
**Warning signs:** Many test failures after the refactor.

### Pitfall 6: Webhook URL Display - Don't Try to Auto-Detect Server Address
**What goes wrong:** Trying to programmatically determine the SeedSync server's externally reachable address to construct the webhook URL. This is unreliable (Docker networking, reverse proxies, NAT, etc.).
**Why it happens:** Want to show a "ready-to-copy" URL in the Settings UI.
**How to avoid:** Display a template URL like `http://<your-seedsync-address>:<port>/server/webhook/sonarr` and let the user fill in their address. The port can be read from config.
**Warning signs:** URL shows `0.0.0.0` or `127.0.0.1` or a Docker internal IP that doesn't work.

### Pitfall 7: Race Condition When Queue Drains During Model Rebuild
**What goes wrong:** Controller calls `WebhookManager.process()` which matches file names against current model. If the model is being rebuilt in the same cycle, the model file names might be stale.
**Why it happens:** `__check_webhook_imports()` is called after `__update_model()` in `process()`. This is actually correct (same as current `__check_sonarr_imports`), but if moved before `__update_model()`, matches could fail for newly appeared files.
**How to avoid:** Keep `__check_webhook_imports()` call position the same as `__check_sonarr_imports()` -- after `__update_model()` in `Controller.process()`.
**Warning signs:** Intermittent missed imports for files that just appeared in the model.

## Code Examples

### Sonarr Webhook Payload for Download (Import) Event
```json
// Source: Sonarr source code (WebhookImportPayload.cs, WebhookBase.cs)
// Verified from: https://github.com/Sonarr/Sonarr
{
    "eventType": "Download",
    "instanceName": "Sonarr",
    "applicationUrl": "http://localhost:8989",
    "series": {
        "id": 1,
        "title": "Game of Thrones",
        "path": "/tv/Game of Thrones",
        "tvdbId": 121361,
        "tvMazeId": 82,
        "imdbId": "tt0944947",
        "type": "standard",
        "year": 2011
    },
    "episodes": [
        {
            "id": 1,
            "episodeNumber": 1,
            "seasonNumber": 1,
            "title": "Winter Is Coming"
        }
    ],
    "episodeFile": {
        "id": 1,
        "relativePath": "Season 01/Game.of.Thrones.S01E01.720p.mkv",
        "path": "/tv/Game of Thrones/Season 01/Game.of.Thrones.S01E01.720p.mkv",
        "quality": "HDTV-720p",
        "qualityVersion": 1,
        "releaseGroup": "GROUP",
        "sceneName": "Game.of.Thrones.S01E01.720p",
        "size": 1234567890,
        "sourcePath": "/downloads/Game.of.Thrones.S01E01.720p-GROUP"
    },
    "release": {
        "releaseTitle": "Game.of.Thrones.S01E01.720p-GROUP",
        "quality": "HDTV-720p",
        "size": 1234567890
    },
    "isUpgrade": false,
    "downloadClient": "qBittorrent",
    "downloadId": "ABCDEF1234567890"
}
```

**CRITICAL NOTE on title matching:** The `series.title` is "Game of Thrones" (human name). The `episodeFile.sourcePath` basename is "Game.of.Thrones.S01E01.720p-GROUP" (torrent/download name). SeedSync model file names are torrent names. Use `episodeFile.sourcePath` (extract basename) for matching.

### Radarr Webhook Payload for Download (Import) Event
```json
// Source: Radarr source code (WebhookImportPayload.cs, WebhookBase.cs)
// Verified from: https://github.com/Radarr/Radarr
{
    "eventType": "Download",
    "instanceName": "Radarr",
    "applicationUrl": "http://localhost:7878",
    "movie": {
        "id": 1,
        "title": "Inception",
        "year": 2010,
        "filePath": "/movies/Inception (2010)/Inception.2010.1080p.BluRay.mkv",
        "folderPath": "/movies/Inception (2010)",
        "tmdbId": 27205,
        "imdbId": "tt1375666"
    },
    "movieFile": {
        "id": 1,
        "relativePath": "Inception.2010.1080p.BluRay.mkv",
        "path": "/movies/Inception (2010)/Inception.2010.1080p.BluRay.mkv",
        "quality": "Bluray-1080p",
        "qualityVersion": 1,
        "releaseGroup": "GROUP",
        "sceneName": "Inception.2010.1080p.BluRay-GROUP",
        "size": 9876543210,
        "sourcePath": "/downloads/Inception.2010.1080p.BluRay-GROUP"
    },
    "release": {
        "releaseTitle": "Inception.2010.1080p.BluRay-GROUP",
        "quality": "Bluray-1080p",
        "size": 9876543210
    },
    "isUpgrade": false,
    "downloadClient": "qBittorrent",
    "downloadId": "0123456789ABCDEF"
}
```

### Title Extraction Strategy
```python
# Best match for SeedSync model file names:
# 1. episodeFile.sourcePath / movieFile.sourcePath (basename = torrent folder name)
# 2. release.releaseTitle (torrent/release name)
# 3. series.title / movie.title (human name -- WORST match, avoid)

import os

def _extract_sonarr_title(body: dict) -> str:
    """Extract download name from Sonarr webhook for matching against model files."""
    # Priority 1: sourcePath basename (most reliable, matches torrent folder name)
    episode_file = body.get("episodeFile", {})
    source_path = episode_file.get("sourcePath", "")
    if source_path:
        return os.path.basename(source_path)

    # Priority 2: release title (torrent name)
    release = body.get("release", {})
    release_title = release.get("releaseTitle", "")
    if release_title:
        return release_title

    # Priority 3: series title (least reliable for file name matching)
    series = body.get("series", {})
    return series.get("title", "")

def _extract_radarr_title(body: dict) -> str:
    """Extract download name from Radarr webhook for matching against model files."""
    # Priority 1: sourcePath basename
    movie_file = body.get("movieFile", {})
    source_path = movie_file.get("sourcePath", "")
    if source_path:
        return os.path.basename(source_path)

    # Priority 2: release title
    release = body.get("release", {})
    release_title = release.get("releaseTitle", "")
    if release_title:
        return release_title

    # Priority 3: movie title
    movie = body.get("movie", {})
    return movie.get("title", "")
```

### WebhookHandler with POST Routes (Full Implementation)
```python
# Source: Pattern follows ControllerHandler (web/handler/controller.py)
# and bulk command handler (same file, __handle_bulk_command)

import json
import os
import logging
from bottle import HTTPResponse, request
from common import overrides
from controller.webhook_manager import WebhookManager
from ..web_app import IHandler, WebApp

logger = logging.getLogger(__name__)

class WebhookHandler(IHandler):
    def __init__(self, webhook_manager: WebhookManager):
        self.__webhook_manager = webhook_manager

    @overrides(IHandler)
    def add_routes(self, web_app: WebApp):
        web_app.add_post_handler("/server/webhook/sonarr", self.__handle_sonarr_webhook)
        web_app.add_post_handler("/server/webhook/radarr", self.__handle_radarr_webhook)

    def __handle_sonarr_webhook(self) -> HTTPResponse:
        return self._handle_webhook("Sonarr", self._extract_sonarr_title)

    def __handle_radarr_webhook(self) -> HTTPResponse:
        return self._handle_webhook("Radarr", self._extract_radarr_title)

    def _handle_webhook(self, source: str, extract_title_fn) -> HTTPResponse:
        """
        Generic webhook handler for *arr services.
        Always returns 200 to prevent Sonarr/Radarr retry behavior.
        """
        try:
            body = request.json
        except Exception:
            logger.warning("{} webhook: invalid JSON body".format(source))
            return HTTPResponse(body="Invalid JSON", status=400)

        if not body:
            logger.warning("{} webhook: empty body".format(source))
            return HTTPResponse(body="Empty body", status=400)

        event_type = body.get("eventType", "")
        logger.debug("{} webhook received: eventType={}".format(source, event_type))

        # Handle test event from Sonarr/Radarr settings
        if event_type == "Test":
            logger.info("{} webhook test received".format(source))
            return HTTPResponse(body="Test OK", status=200)

        # Only process Download (import) events
        if event_type != "Download":
            return HTTPResponse(body="OK", status=200)

        title = extract_title_fn(body)
        if not title:
            logger.warning("{} webhook Download event with no extractable title".format(source))
            return HTTPResponse(body="OK", status=200)

        self.__webhook_manager.enqueue_import(source, title)
        return HTTPResponse(body="OK", status=200)

    @staticmethod
    def _extract_sonarr_title(body: dict) -> str:
        """Extract download name from Sonarr webhook payload."""
        episode_file = body.get("episodeFile", {})
        source_path = episode_file.get("sourcePath", "")
        if source_path:
            return os.path.basename(source_path)
        release = body.get("release", {})
        release_title = release.get("releaseTitle", "")
        if release_title:
            return release_title
        series = body.get("series", {})
        return series.get("title", "")

    @staticmethod
    def _extract_radarr_title(body: dict) -> str:
        """Extract download name from Radarr webhook payload."""
        movie_file = body.get("movieFile", {})
        source_path = movie_file.get("sourcePath", "")
        if source_path:
            return os.path.basename(source_path)
        release = body.get("release", {})
        release_title = release.get("releaseTitle", "")
        if release_title:
            return release_title
        movie = body.get("movie", {})
        return movie.get("title", "")
```

### Seedsync.py Integration (Wiring WebhookManager)
```python
# Source: Extends seedsync.py (lines 114-122)
from controller.webhook_manager import WebhookManager

# In Seedsync.run():
webhook_manager = WebhookManager(self.context)
controller = Controller(self.context, self.controller_persist, webhook_manager)
# ...
web_app_builder = WebAppBuilder(self.context, controller, self.auto_queue_persist, webhook_manager)
```

### Frontend: Webhook URL Display in Settings
```html
<!-- Add inside the *arr Integration accordion card-body, after existing Sonarr/Radarr sections -->
<h4 class="subsection-header">Webhook URLs</h4>
<div class="webhook-urls">
    <div class="webhook-url-item">
        <label>Sonarr Webhook URL</label>
        <div class="webhook-url-display">
            <code>http://&lt;seedsync-address&gt;:{{(config | async)?.get('web')?.get('port')}}/server/webhook/sonarr</code>
        </div>
        <small class="text-muted">
            In Sonarr: Settings &rarr; Connect &rarr; Add &rarr; Webhook &rarr; URL
        </small>
    </div>
    <div class="webhook-url-item">
        <label>Radarr Webhook URL</label>
        <div class="webhook-url-display">
            <code>http://&lt;seedsync-address&gt;:{{(config | async)?.get('web')?.get('port')}}/server/webhook/radarr</code>
        </div>
        <small class="text-muted">
            In Radarr: Settings &rarr; Connect &rarr; Add &rarr; Webhook &rarr; URL
        </small>
    </div>
</div>
```

## Full List of SonarrManager References to Remove

### Files to DELETE
| File | Why |
|------|-----|
| `src/python/controller/sonarr_manager.py` | Replaced by webhook_manager.py |
| `src/python/tests/unittests/test_controller/test_sonarr_manager.py` | Tests for deleted class |

### Files to MODIFY
| File | Line(s) | Change |
|------|---------|--------|
| `src/python/controller/__init__.py` | Line 11 | Remove `from .sonarr_manager import SonarrManager`, add `from .webhook_manager import WebhookManager` |
| `src/python/controller/controller.py` | Line 15 | Remove `from .sonarr_manager import SonarrManager` |
| `src/python/controller/controller.py` | Line 129 | Replace `self.__sonarr_manager = SonarrManager(context=self.__context)` with `self.__webhook_manager = webhook_manager` (passed as param) |
| `src/python/controller/controller.py` | Line 207 | Replace `self.__check_sonarr_imports()` with `self.__check_webhook_imports()` |
| `src/python/controller/controller.py` | Lines 669-696 | Rename `__check_sonarr_imports` to `__check_webhook_imports`, replace `self.__sonarr_manager.process()` with `self.__webhook_manager.process()` |
| `src/python/controller/controller.py` | Constructor | Add `webhook_manager` parameter |
| `src/python/seedsync.py` | Lines 115-122 | Create WebhookManager, pass to Controller and WebAppBuilder |
| `src/python/web/web_app_builder.py` | Lines 21-24, 34 | Add webhook_manager param, create WebhookHandler, register routes |
| `src/python/tests/unittests/test_controller/test_controller_unit.py` | Lines 29, 37, 46-48 | Change mock from SonarrManager to WebhookManager |
| `src/python/tests/unittests/test_controller/test_controller_unit.py` | Lines 1037-1050 | Update sonarr-specific test names and assertions |
| `src/python/tests/unittests/test_controller/test_auto_delete.py` | Lines 31, 39, 48-49 | Change mock from SonarrManager to WebhookManager |
| `src/python/tests/unittests/test_controller/test_auto_delete.py` | Lines 218-240 | Update sonarr-specific test names and assertions |

### Config Changes: NONE
No config changes needed. WebhookManager does not need its own config section. The existing `config.sonarr.enabled` and `config.radarr.enabled` flags are NOT used by WebhookManager -- webhooks are always accepted regardless of enabled state (if user configured a webhook in Sonarr, they want it to work). The enabled flags continue to exist for backward compatibility but are no longer checked for import detection.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Polling Sonarr queue API every 60s | Webhook POST from Sonarr/Radarr on import | Phase 27 | Instant detection, no outbound API calls |
| SonarrManager with queue tracking + bootstrap | WebhookManager with simple Queue | Phase 27 | Simpler code, no bootstrap needed, no false-positive edge cases |
| Sonarr-only import detection | Sonarr + Radarr import detection | Phase 27 | Movie imports now detected too |
| Config-gated import detection (sonarr.enabled) | Always-on webhook endpoints | Phase 27 | Simpler; if webhook is configured in *arr, it works |

**Deprecated/outdated:**
- `SonarrManager`: Entire class deleted. Polling approach replaced by webhooks.
- `Config.Sonarr.enabled` for import detection: No longer controls import detection flow. Config section still exists for Test Connection UI.

## Open Questions

1. **Sonarr/Radarr webhook `sourcePath` field reliability**
   - What we know: The Sonarr source code shows `episodeFile.sourcePath` is populated from `EpisodeFile.Path` + message context. It should contain the original download path.
   - What's unclear: Whether `sourcePath` is always present in the webhook payload, or only when the download client provides it. Some download clients might not provide this field.
   - Recommendation: Use fallback chain: `sourcePath` -> `release.releaseTitle` -> `series.title`/`movie.title`. This handles all cases.

2. **Sonarr/Radarr webhook Content-Type header**
   - What we know: Sonarr/Radarr send webhooks as `application/json` POST requests.
   - What's unclear: Whether they always set the Content-Type header correctly. Bottle's `request.json` requires `application/json` Content-Type.
   - Recommendation: If `request.json` returns None despite body being present, fall back to `json.loads(request.body.read())`. Test with actual Sonarr/Radarr instances during UAT.

3. **Multiple webhook events for same file**
   - What we know: Sonarr/Radarr may send multiple webhook events (e.g., on upgrade). The existing import pipeline handles duplicates (imported_file_names is a set, import_status is idempotent).
   - What's unclear: Whether upgrades trigger `eventType: "Download"` with `isUpgrade: true`, and whether we should handle that differently.
   - Recommendation: Treat upgrades the same as initial imports. The pipeline is already idempotent.

## Sources

### Primary (HIGH confidence)
- Sonarr source code - WebhookEventType.cs: `Test, Grab, Download, Rename, SeriesAdd, SeriesDelete, EpisodeFileDelete, Health, ApplicationUpdate, HealthRestored, ManualInteractionRequired`
  - Source: https://github.com/Sonarr/Sonarr/blob/develop/src/NzbDrone.Core/Notifications/Webhook/WebhookEventType.cs
- Radarr source code - WebhookEventType.cs: `Test, Grab, Download, Rename, MovieDelete, MovieFileDelete, Health, ApplicationUpdate, MovieAdded, HealthRestored, ManualInteractionRequired`
  - Source: https://github.com/Radarr/Radarr/blob/develop/src/NzbDrone.Core/Notifications/Webhook/WebhookEventType.cs
- Sonarr source code - WebhookImportPayload.cs: Fields include Series, Episodes, EpisodeFile (with SourcePath), Release, IsUpgrade, DownloadClient, etc.
  - Source: https://github.com/Sonarr/Sonarr/blob/develop/src/NzbDrone.Core/Notifications/Webhook/WebhookImportPayload.cs
- Sonarr source code - WebhookBase.cs: BuildOnDownloadPayload sets EventType = Download
  - Source: https://github.com/Sonarr/Sonarr/blob/develop/src/NzbDrone.Core/Notifications/Webhook/WebhookBase.cs
- Radarr source code - WebhookBase.cs: Same pattern, EventType = Download for imports
  - Source: https://github.com/Radarr/Radarr/blob/develop/src/NzbDrone.Core/Notifications/Webhook/WebhookBase.cs
- Existing SeedSync codebase:
  - `src/python/controller/sonarr_manager.py` - Current polling implementation (to be replaced)
  - `src/python/controller/controller.py` - Controller integration, __check_sonarr_imports, command queue pattern
  - `src/python/web/handler/controller.py` - IHandler pattern, POST handler pattern, request.json usage
  - `src/python/web/web_app.py` - add_post_handler method
  - `src/python/web/web_app_builder.py` - Handler registration pattern
  - `src/python/common/job.py` - Thread/Job model showing web thread vs controller thread separation

### Secondary (MEDIUM confidence)
- [Sonarr Wiki - Webhook documentation](https://github.com/DeadNumbers/Sonarr-wiki/blob/master/Webhook.md) - Event types: Download, Grab, Rename
- [eventt Go package](https://pkg.go.dev/github.com/k-x7/eventt) - DownloadEvent struct with Series, Episodes, EpisodeFile, IsUpgrade, EventType fields
- [Home Assistant Sonarr webhook discussion](https://community.home-assistant.io/t/extracting-json-array-value-from-sonarr-webhook/274316) - Real-world payload examples

### Tertiary (LOW confidence)
- Radarr webhook payload structure for `movieFile` field (inferred from Radarr source code by analogy with Sonarr's `episodeFile`; `movieFile` naming confirmed via WebhookBase.cs)
- `sourcePath` field presence - confirmed in Sonarr source code but runtime behavior may vary by download client

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, Queue pattern proven in Controller
- Architecture: HIGH - WebhookManager pattern mirrors existing Manager classes, POST handler mirrors existing handler pattern
- Webhook payloads: HIGH - Verified from Sonarr/Radarr source code (GitHub)
- Title matching strategy: MEDIUM - sourcePath field confirmed in source but runtime behavior needs UAT verification
- Pitfalls: HIGH - Derived from actual codebase analysis and Sonarr/Radarr source code

**Research date:** 2026-02-11
**Valid until:** 60 days (Sonarr/Radarr webhook API is stable, SeedSync codebase patterns are established)
