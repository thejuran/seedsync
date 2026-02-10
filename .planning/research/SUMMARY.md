# Project Research Summary

**Project:** SeedSync v1.7 - Sonarr Integration
**Domain:** Media Management Integration (Sonarr API)
**Researched:** 2026-02-10
**Confidence:** MEDIUM

## Executive Summary

SeedSync v1.7 adds Sonarr integration to automatically delete local files after they've been imported to the Sonarr media library. This closes the automation loop: files sync from seedbox → Sonarr imports to library → local copies auto-delete to save space. The integration requires minimal stack additions (pyarr Python client, ngx-toastr Angular notifications) and follows SeedSync's existing Manager pattern with polling-based import detection.

The critical risk is premature deletion - deleting files before Sonarr completes import, causing data loss. Research shows this is the most common integration mistake. The solution: poll Sonarr's queue API for disappearance (definitive import signal), add a configurable safety delay (default 60 seconds), and track imported files to prevent duplicate deletions. For season packs, per-episode tracking prevents partial import deletion.

The recommended approach is polling-based detection (simpler than webhooks), queue disappearance as completion signal (more reliable than history API), and Command pattern for deletes (consistent with existing architecture). Start with MVP features (API connection, import detection, auto-delete, status badges) and defer enhancements (webhooks, dry-run mode, Radarr support) to v1.8+.

## Key Findings

### Recommended Stack

The existing Python/Angular stack needs only two additions: a Sonarr API client for the backend and toast notifications for the frontend. The Python backend already has `requests ^2.32.5` for HTTP operations, and the Bottle framework natively handles webhook endpoints via `request.json`. Adding `pyarr ^5.2.0` provides a production-ready Sonarr API wrapper with pagination, error handling, and battle-tested reliability. For the Angular frontend, `ngx-toastr ^19.1.0` provides Bootstrap 5-compatible toast notifications for import events.

**Core technologies:**
- **pyarr 5.2.0** (Python): Sonarr/Radarr API wrapper - mature library (200+ GitHub stars) with built-in pagination and error handling
- **ngx-toastr 19.1.0** (Angular): Toast notifications - Angular 19 compatible with Bootstrap 5 theme support, 200K+ weekly downloads
- **requests 2.32.5** (existing): HTTP client - sufficient for polling, already in pyproject.toml (alternative to pyarr if keeping dependencies minimal)

**What NOT to add:**
- Async HTTP clients (httpx, aiohttp) - SeedSync's synchronous Manager pattern doesn't need async complexity
- Webhook-specific libraries - Bottle's `request.json` handles webhook POST payloads natively
- Custom notification services - reinventing the wheel when ngx-toastr exists

### Expected Features

Research identified a clear MVP scope for v1.7 and enhancements for v1.8+. The core value proposition is automatic deletion after confirmed import, with visual feedback in the UI.

**Must have (table stakes):**
- API connection configuration (URL, API key, enable/disable toggle) - standard for third-party integrations
- Import status detection via polling `/api/v3/history` or queue - core value proposition
- Auto-delete after import with global toggle - primary automation goal
- Per-file import status badge - extends existing file status display with "Waiting for import", "Imported" states
- Import history log - debugging and trust-building, integrates with existing log viewer
- Connection validation test button - verify setup before enabling integration

**Should have (competitive advantage - defer to v1.8+):**
- In-app import notifications - real-time SSE notifications when import detected (leverage existing SSE infrastructure)
- Dry-run mode - "detect imports but don't auto-delete" for safe testing
- Manual import check button - force status refresh for troubleshooting
- Import path verification - warn if Sonarr import paths don't overlap with SeedSync local paths

**Defer (v2+):**
- Radarr support - same pattern as Sonarr, different media type
- Webhook support - more efficient than polling but requires Sonarr configuration and endpoint hardening
- Import statistics dashboard - analytics once product-market fit established

**Anti-features (don't build):**
- Manage Sonarr queue from SeedSync - scope creep, duplicates Sonarr UI
- Delete remote files after import - breaks seeding, dangerous if misconfigured
- Bi-directional sync with Sonarr - conflict resolution complexity, violates single source of truth
- Track ALL Sonarr activity - adds noise, SeedSync only cares about files it synced

### Architecture Approach

The Sonarr integration follows SeedSync's existing Manager pattern with polling-based external API interaction. A new SonarrManager polls the Sonarr queue API to detect import completion (queue disappearance), maps queue records to ModelFiles by filename, and queues DELETE_LOCAL commands via Controller's command pattern. Persistence uses BoundedOrderedSet to track imported filenames and prevent duplicate deletions.

**Major components:**
1. **SonarrManager** (new) - Polls Sonarr API every 60 seconds, detects import completion via queue disappearance, maps to ModelFiles, triggers auto-delete commands
2. **SonarrPersist** (new) - BoundedOrderedSet tracking imported_file_names (max 10,000) to prevent re-deletion, serialized to JSON
3. **SonarrService** (new) - Thin wrapper around pyarr for API calls (get_queue, get_history), handles connection errors
4. **SonarrConfig** (new) - Config section with host, port, api_key, enabled, poll_interval_sec, auto_delete_enabled
5. **Controller integration** - Instantiate SonarrManager, call process() in main loop, handle DELETE_LOCAL commands

**Key patterns:**
- **Manager with External API Client** - SonarrManager owns SonarrService, encapsulates API details
- **BoundedOrderedSet for Tracking** - LRU eviction prevents memory bloat, consistent with existing downloaded_file_names pattern
- **Polling with State Diffing** - Track prev_queue_ids vs current_queue_ids, detect disappearances for import completion
- **Command Pattern for Delete** - Use Controller.queue_command() for DELETE_LOCAL, not direct FileOperationManager calls

**Integration points:**
- Fits existing Manager pattern (ScanManager, LftpManager, FileOperationManager all use synchronous blocking calls)
- No new ModelFile states needed - use optional timestamp field or persist-only tracking
- Webhook handling works with existing Bottle framework (future enhancement, not MVP)
- Settings UI follows existing INI-style form controls in settings component

### Critical Pitfalls

Research from GitHub issues and Sonarr forums identified 8 critical pitfalls. The top 3 pose the highest risk of data loss.

1. **Delete-Before-Import Race Condition** - Files deleted before Sonarr completes import, causing import failures and lost media. PREVENTION: Never rely on queue status alone; use queue disappearance as signal; add 60-second safety delay; track imported_file_names to prevent re-deletion.

2. **Season Pack Partial Import Deletion** - Deleting entire season pack folder while Sonarr is still processing episodes sequentially, losing unprocessed episodes. PREVENTION: Track import per-file, not per-torrent; detect season packs by release name; wait for ALL episodes to import before cleanup; require user confirmation for season packs.

3. **File Name Mismatch (Download Name vs Sonarr Queue)** - Cannot correlate local files with Sonarr queue because torrent client renamed files or scene numbering differs. PREVENTION: Use history API with droppedPath/importedPath fields instead of exact filename matching; store mapping between local paths and download IDs.

4. **Sonarr Import While File is Transferring** - Sonarr detects growing file during LFTP transfer, attempts import before complete. PREVENTION: LFTP should use staging directory with atomic move; temp file extension (.part) during transfer.

5. **Ignoring Import Failures (Silent Data Loss)** - Sonarr fails import but queue removal triggers deletion anyway. PREVENTION: Check history API for downloadFolderImported events, not just queue removal; never auto-delete if queue status shows "Warning".

6. **Webhook Endpoint Not Hardened** - Webhook handler crashes, misses events, or processes duplicates. PREVENTION: Idempotent handler with event deduplication; return 200 OK immediately, queue work async; timeout protection.

7. **No Retry Logic for Sonarr API Failures** - Temporary Sonarr downtime causes API failure, app assumes import failed and deletes. PREVENTION: Exponential backoff retry (3-5 attempts); distinguish 4xx (don't retry) vs 5xx (retry); fail safe - don't delete if API unreachable.

8. **Assuming Queue Depth is Unlimited** - Sonarr queue API limited to 60 items; import detection misses older downloads. PREVENTION: Use history API as fallback; check queue depth and warn if at limit; age-based cleanup fallback.

## Implications for Roadmap

Based on architecture dependencies and pitfall prevention requirements, suggest 4 phases with clear build order.

### Phase 1: Configuration & Persistence Foundation
**Rationale:** No external dependencies, pure data structures enable parallel work on later phases
**Delivers:** Config file parsing, persistence layer, settings UI
**Addresses:**
- SonarrConfig section in config.py with validation
- SonarrPersist using BoundedOrderedSet pattern
- Settings UI form (API connection fields, enable toggle)
**Avoids:** No data loss risk - no delete logic yet
**Research flag:** Standard patterns (config INI, BoundedOrderedSet) - skip `/gsd:research-phase`

### Phase 2: API Client with Retry & Safety
**Rationale:** External API interaction must be robust before triggering deletes
**Delivers:** Sonarr API client with connection validation, retry logic, error handling
**Addresses:**
- Add pyarr dependency to pyproject.toml
- SonarrService wrapper with get_queue(), get_history()
- Connection test endpoint for settings UI
- Exponential backoff retry (3 attempts)
**Avoids:**
- Pitfall 7 (No Retry Logic) - implements backoff
- Pitfall 6 (Webhook Not Hardened) - if webhooks added, async queuing
**Research flag:** Needs research - API error scenarios, retry strategies, rate limiting

### Phase 3: Import Detection with Safeguards
**Rationale:** Core value proposition, must implement ALL safety checks before enabling auto-delete
**Delivers:** Polling loop, queue disappearance detection, file matching, safety delay
**Addresses:**
- SonarrManager.process() polling loop
- Queue state diffing (prev_queue_ids vs current_queue_ids)
- File matching via history API (not just filename)
- Configurable safety delay (default 60 seconds)
- Import failure detection (check history eventType)
**Avoids:**
- Pitfall 1 (Delete-Before-Import) - safety delay + queue disappearance signal
- Pitfall 3 (File Name Mismatch) - history API correlation
- Pitfall 5 (Ignoring Failures) - check for downloadFolderImported event
- Pitfall 8 (Queue Depth) - history API fallback
**Research flag:** Needs research - queue vs history API tradeoffs, edge cases in import detection

### Phase 4: Auto-Delete Integration & Testing
**Rationale:** Delete logic must be thoroughly tested with mocks before production use
**Delivers:** Command queueing, Controller integration, comprehensive test suite
**Addresses:**
- queue_command(DELETE_LOCAL) from SonarrManager
- Controller.process() calls sonarr_manager.process()
- Per-file import tracking in SonarrPersist
- Unit tests with mock SonarrService
- Integration tests with mock Sonarr API server
**Avoids:**
- Pitfall 2 (Season Pack Partial) - track per-file imports (defer season pack detection to v1.8)
- Pitfall 4 (Import While Transferring) - assumes Phase 1 LFTP atomic moves
**Research flag:** Standard patterns (Command pattern, Manager testing) - skip `/gsd:research-phase`

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** Config/persistence are prerequisites for API client initialization
- **Phase 2 before Phase 3:** Cannot detect imports without working API client
- **Phase 3 before Phase 4:** Import detection logic must be validated before connecting to delete operations
- **Parallel work opportunity:** Frontend settings UI (Phase 1) can be built against mocked API while backend progresses
- **Risk mitigation:** Delete logic comes LAST after all safety mechanisms validated
- **Pitfall coverage:** Each phase explicitly addresses specific pitfalls from research

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (API Client):** Sonarr API rate limiting behavior, error response formats, retry-after headers
- **Phase 3 (Import Detection):** Queue vs history API reliability tradeoffs, season pack detection heuristics, file matching edge cases

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Config/Persistence):** Well-documented INI config, BoundedOrderedSet already used in codebase
- **Phase 4 (Testing):** Standard pytest mocking patterns, existing FileOperationManager test examples

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | pyarr and ngx-toastr verified on PyPI/npm, version compatibility confirmed, existing requests library sufficient |
| Features | MEDIUM | MVP scope clear from Sonarr documentation and competitor analysis, but user validation needed for UI/UX decisions |
| Architecture | MEDIUM | Manager pattern fits existing codebase, but queue vs history API tradeoffs need validation during implementation |
| Pitfalls | MEDIUM | GitHub issues and forums provide clear warning signs, but actual API behavior needs testing with real Sonarr instance |

**Overall confidence:** MEDIUM

### Gaps to Address

- **Queue disappearance reliability:** Research assumes queue item removal indicates import complete, but need to validate with real Sonarr instance (v3, v4, v5) to confirm behavior is consistent
- **Season pack detection:** Research identifies the problem but defers heuristics to implementation phase - need to test with real season pack releases
- **Webhook vs polling tradeoffs:** Research recommends polling for MVP, but actual API load and detection latency need measurement to validate this choice
- **File matching edge cases:** History API correlation is recommended, but need to test with renamed files, scene numbering, absolute numbering (anime) to validate matching logic
- **Safety delay tuning:** Default 60 seconds based on forum discussions, but users with slow NAS or large files may need longer - make configurable and document
- **Import failure detection:** Need to catalog all possible failure scenarios (wrong quality, disk full, naming issue) and verify history API provides distinguishable events

**How to handle during planning:**
- Phase 2: Manual testing with real Sonarr instance to validate queue behavior
- Phase 3: Create test matrix of file naming scenarios (scene, TVDB, absolute numbering)
- Phase 3: Implement configurable safety delay with sane default
- Phase 4: Integration test with mock Sonarr returning various failure responses

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Sonarr API Docs](https://sonarr.tv/docs/api/) - API endpoints (landing page only, limited detail)
- [Sonarr Activity | Servarr Wiki](https://wiki.servarr.com/sonarr/activity) - Queue and history behavior
- [Sonarr Troubleshooting | Servarr Wiki](https://wiki.servarr.com/sonarr/troubleshooting) - Queue status explanations
- [Hardlinks and Instant Moves - TRaSH Guides](https://trash-guides.info/File-and-Folder-Structure/Hardlinks-and-Instant-Moves/) - Import behavior

**API Libraries:**
- [pyarr on PyPI](https://pypi.org/project/pyarr/) - Version 5.2.0, Python requirements
- [pyarr documentation](https://docs.totaldebug.uk/pyarr/modules/sonarr.html) - SonarrAPI methods
- [ngx-toastr on npm](https://www.npmjs.com/package/ngx-toastr) - Version 19.1.0, Angular compatibility
- [sonarr package - golift.io/starr/sonarr](https://pkg.go.dev/golift.io/starr/sonarr) - Go API wrapper (response schemas)

### Secondary (MEDIUM confidence)

**GitHub Issues (Race Conditions & Import Problems):**
- [Race condition during episode import - Issue #5475](https://github.com/Sonarr/Sonarr/issues/5475)
- [Import Season Deletes Episodes before Importing - Issue #5949](https://github.com/Sonarr/Sonarr/issues/5949)
- [Partial import of season pack - Issue #5625](https://github.com/Sonarr/Sonarr/issues/5625)
- [Failed import does not properly fail - Issue #6873](https://github.com/Sonarr/Sonarr/issues/6873)
- [Sonarr deletes files before importing - Issue #3131](https://github.com/Sonarr/Sonarr/issues/3131)

**GitHub Issues (Queue & API):**
- [GET Queue API 'status' filter does not work - Issue #7389](https://github.com/Sonarr/Sonarr/issues/7389)
- [Filter eventType option in history API - Issue #3587](https://github.com/Sonarr/Sonarr/issues/3587)
- [Question about latest changes in queue api - Issue #7663](https://github.com/Sonarr/Sonarr/issues/7663)

**Community Forums:**
- [Import race condition? - sonarr forums](https://forums.sonarr.tv/t/import-race-condition/39676)
- [Can Sonarr Delete Files after Import? - sonarr forums](https://forums.sonarr.tv/t/can-sonarr-delete-files-after-import/32432)
- [Downloads get stuck in queue - sonarr forums](https://forums.sonarr.tv/t/downloads-get-stuck-in-queue-at-100-progress/30458)

### Tertiary (LOW confidence, patterns only)

**Integration Patterns:**
- [Sonarr Guide: Setup, Configuration & How It Works](https://www.rapidseedbox.com/blog/ultimate-guide-to-sonarr) - General workflow
- [GitHub - GregTroar/DeleteArr](https://github.com/GregTroar/DeleteArr) - Community tool for post-import cleanup (inspiration)
- [Webhooks vs. Polling](https://medium.com/@nile.bits/webhooks-vs-polling-431294f5af8a) - Decision framework

---
*Research completed: 2026-02-10*
*Ready for roadmap: yes*
