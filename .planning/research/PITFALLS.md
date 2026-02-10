# Pitfalls Research

**Domain:** Sonarr API Integration for Download Managers
**Researched:** 2026-02-10
**Confidence:** MEDIUM

## Critical Pitfalls

### Pitfall 1: Delete-Before-Import Race Condition

**What goes wrong:**
Files are deleted from local storage before Sonarr completes the import process, resulting in import failures and lost media. This is the most common and severe integration mistake.

**Why it happens:**
Developers poll the queue API and see status changes (like `importPending` or completion) and assume the import is done. However, Sonarr's import is asynchronous - the queue status may update before file operations complete, especially for large files or season packs.

**How to avoid:**
1. Never rely solely on queue status for deletion decisions
2. Use webhook notifications (OnImport event) as the definitive signal
3. If polling only: Check BOTH queue removal AND history API for import confirmation
4. Add a configurable safety delay (default 30-60 seconds) after import signal before deletion
5. Verify file still exists in Sonarr's library via /api/v3/episodefile before deletion

**Warning signs:**
- User reports of "Import Failed: File not found" in Sonarr logs
- Files disappearing from download folder while queue shows "Importing"
- Sonarr repeatedly re-grabbing already downloaded episodes
- Import success notifications but episodes still marked as missing

**Phase to address:**
Phase 2 (Core API Integration) - implement webhook-based import detection with safety delay

---

### Pitfall 2: Season Pack Partial Import Deletion

**What goes wrong:**
When importing season packs, Sonarr may import only some episodes while the download manager deletes the entire folder, losing episodes that haven't been processed yet. This leads to incomplete seasons and user frustration.

**Why it happens:**
Sonarr's season pack import is multi-step: it processes episodes sequentially, and timing issues can cause some episodes to remain unprocessed. The download manager sees the first import event and assumes the entire pack is complete. Additionally, Sonarr has a documented bug where async methods are called without await, causing unpredictable deletion timing.

**How to avoid:**
1. Track import completion per-file, not per-torrent/download
2. For multi-file downloads, wait for ALL expected episodes to appear in history API
3. Parse release name to detect season packs (S01, Season.01, Complete.Series patterns)
4. For season packs: require explicit user confirmation before auto-delete OR wait 24 hours
5. Check queue for "remaining episodes" - don't delete if importPending items remain for same series

**Warning signs:**
- Season pack shows in queue with some episodes imported, some missing
- User reports "Only got 8 of 12 episodes, rest disappeared"
- Sonarr Activity shows import failures for episodes after successful ones
- Multi-episode files (S01E01-E02) only import first episode

**Phase to address:**
Phase 3 (Import Detection Logic) - implement multi-file tracking with season pack detection

---

### Pitfall 3: File Name Mismatch (Download Name vs Sonarr Queue)

**What goes wrong:**
Unable to correlate files in download folder with Sonarr queue items because release names don't match. Download manager can't determine which files Sonarr has imported, leading to orphaned files or premature deletion.

**Why it happens:**
Torrent clients may rename files, LFTP might preserve original seedbox names that differ from Sonarr's grabbed release name, or scene numbering doesn't match TVDB numbering. Sonarr's parser uses TheXEM for mapping, but external tools don't have access to this.

**How to avoid:**
1. Don't rely on exact filename matching between local files and Sonarr queue
2. Use Sonarr's history API with `eventType=downloadFolderImported` to get actual imported paths
3. Store mapping between local paths and download IDs when files arrive
4. Query /api/v3/parse with your filename to see if Sonarr recognizes it
5. For absolute numbering (anime): expect mismatches, require manual user mapping

**Warning signs:**
- Files remain in download folder despite Sonarr showing "imported"
- Auto-delete never triggers even though episodes are in library
- User has to manually delete files that Sonarr already imported
- Logs show "Could not match file [X] to any queue item"

**Phase to address:**
Phase 3 (Import Detection Logic) - implement history API correlation instead of name matching

---

### Pitfall 4: Sonarr Import While File is Transferring

**What goes wrong:**
Sonarr detects and starts importing a file while LFTP is still transferring it, resulting in corrupted imports, incomplete files in library, or Sonarr errors about files changing during import.

**Why it happens:**
Sonarr monitors download folders for new files. If it sees a growing file, it may attempt import before transfer completes. This is common when Sonarr's download client category points to the same folder where LFTP is writing files.

**How to avoid:**
1. LFTP should transfer to a staging directory, THEN move to Sonarr's watched folder atomically
2. Use temp file extension (.part, .!sync) during transfer, rename on completion
3. Configure Sonarr's "Completed Download Handling" with appropriate delay
4. Verify file size stability before allowing Sonarr to see it (check size twice with delay)
5. Use file locks if filesystem supports them

**Warning signs:**
- Import errors: "File changed while importing"
- Imported episodes have wrong duration or are corrupted
- Sonarr queue shows "Import failed: file in use"
- Random import failures that succeed on retry

**Phase to address:**
Phase 1 (Foundation) - LFTP integration must use atomic moves to watched directory

---

### Pitfall 5: Ignoring Import Failures (Silent Data Loss)

**What goes wrong:**
Sonarr fails to import a file (wrong quality, naming issue, disk full), but the download manager sees queue removal and deletes the file anyway. User loses the download with no recovery path.

**Why it happens:**
Queue item removal doesn't distinguish between successful import and failed import - both remove from queue. Developers check queue.length === 0 and assume success.

**How to avoid:**
1. Check history API for import events, not just queue removal
2. Look for `eventType: 'downloadFailed'` or `eventType: 'downloadFolderImported'`
3. Parse queue item status messages for failure indicators ("rejected", "failed", "ignored")
4. Never auto-delete if Sonarr's queue status is "Warning" (orange icon in UI)
5. Require positive confirmation of import, not just absence from queue

**Warning signs:**
- Files deleted but episodes still show as missing in Sonarr
- Sonarr Activity shows import failure but file is gone
- User reports: "Downloaded but Sonarr says not imported, file disappeared"
- Logs show queue item removed but no corresponding history import event

**Phase to address:**
Phase 3 (Import Detection Logic) - implement import failure detection and retry handling

---

### Pitfall 6: Webhook Endpoint Not Hardened

**What goes wrong:**
Sonarr webhook endpoint crashes the application, misses events, or creates race conditions because it's not designed for unreliable network delivery, duplicate events, or concurrent requests.

**Why it happens:**
Webhooks are fire-and-forget from Sonarr's perspective. No guarantee of delivery, ordering, or uniqueness. Network issues can cause retries, duplicate events, or out-of-order delivery.

**How to avoid:**
1. Webhook handler must be idempotent - processing same event twice is safe
2. Use event IDs to deduplicate (episode ID + timestamp + event type)
3. Handler should return 200 OK immediately, queue work asynchronously
4. Implement timeout on webhook handler (max 5 seconds)
5. Log all webhook payloads for debugging
6. Handle missing fields gracefully - Sonarr's webhook schema can change

**Warning signs:**
- Application hangs when Sonarr sends webhook
- Same episode marked for deletion multiple times
- Events processed out of order (delete before import)
- Webhook endpoint returns 500, Sonarr stops sending events

**Phase to address:**
Phase 2 (Core API Integration) - webhook endpoint implementation with queuing

---

### Pitfall 7: No Retry Logic for Sonarr API Failures

**What goes wrong:**
Temporary Sonarr downtime or network blip causes API request to fail, application assumes import failed or file doesn't exist, deletes the file prematurely.

**Why it happens:**
Sonarr restarts during updates, can be unresponsive during heavy imports, or network issues cause temporary failures. Single-attempt API calls treat temporary failures as permanent.

**How to avoid:**
1. Implement exponential backoff retry for all Sonarr API calls (3-5 attempts)
2. Distinguish between client errors (4xx - don't retry) and server errors (5xx - retry)
3. Use timeout per attempt (5-10 seconds), not just total timeout
4. Add jitter to backoff to avoid thundering herd
5. Respect Retry-After header if Sonarr returns 429
6. Fail safe: if API unreachable, don't delete anything

**Warning signs:**
- Logs show "Connection refused" or "Timeout" then file deleted
- Auto-delete triggers during Sonarr maintenance windows
- Sonarr updates break integration until manual intervention
- Error spikes at specific times (when Sonarr performs background tasks)

**Phase to address:**
Phase 2 (Core API Integration) - API client with retry/backoff

---

### Pitfall 8: Assuming Queue Depth is Unlimited

**What goes wrong:**
During bulk imports or large backlogs, Sonarr's queue API only returns the most recent 60 items. Import detection misses older downloads, files pile up in download folder.

**Why it happens:**
Sonarr explicitly limits queue depth to 60 items for performance reasons (documented in Servarr Wiki). Developers assume if queue doesn't contain their file, it hasn't been grabbed.

**How to avoid:**
1. Never rely solely on queue API for import detection
2. Use history API which has pagination and full records
3. If using queue: check queue depth, warn user if at/near 60 limit
4. Implement file age-based cleanup as fallback (delete files older than X days if queue full)
5. Monitor queue depth, alert user to "queue overflow" condition

**Warning signs:**
- Queue always shows exactly 60 items
- Older downloads never trigger import detection
- Files accumulate in download folder despite Sonarr importing them
- User has large backlog and integration stops working

**Phase to address:**
Phase 3 (Import Detection Logic) - implement history API fallback

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Poll queue every 10 seconds instead of webhooks | Easier to implement, no endpoint needed | Delays import detection, misses events if queue > 60 items, API rate limiting risk | MVP only - must migrate to webhooks by v1.0 |
| Delete immediately on import signal without delay | Faster cleanup, simpler logic | Race condition causes failed imports, user data loss | Never - always use safety delay |
| Match files by name instead of history API | Works for simple cases, less API calls | Breaks on scene releases, renamed files, anime | Never - history API is canonical source |
| Store Sonarr API key in plaintext config | Simple configuration | Security risk if config exposed | Acceptable if config file has proper permissions (600) |
| No retry on API failures | Simpler error handling | Temporary network issues cause permanent failures | Never - retry is essential |
| Assume all imports are single-episode | Simpler tracking logic | Season packs lose episodes | Never - must handle multi-file downloads |

## Integration Gotchas

Common mistakes when connecting to Sonarr API.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Queue API | Polling /api/v3/queue every few seconds | Use webhooks for events, poll queue only for UI display |
| Import detection | Check if queue item disappeared | Check history API for downloadFolderImported event with matching download ID |
| File correlation | Match filenames exactly | Use history API to get actual imported paths, match by parsed episode info |
| API authentication | Send API key in query string | Send API key in X-Api-Key header |
| Webhook events | Trust eventType alone | Check both eventType and importSuccess/failureReason fields |
| Season packs | Treat as single import event | Track per-episode import, wait for all episodes before cleanup |
| Connection errors | Fail fast on timeout | Retry with exponential backoff, respect Retry-After header |
| Rate limiting | Send requests as fast as possible | Batch requests, use 1-2 second delay between non-critical calls |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Polling queue every 1 second | High CPU on Sonarr, rate limiting | Use 30-60 second intervals or webhooks | >10 active downloads |
| Loading entire history on every check | API timeouts, slow responses | Use pageSize parameter, filter by eventType | >500 history items |
| No caching of episode metadata | Repeated API calls for same data | Cache episode info for 5-10 minutes | >50 episodes tracked |
| Synchronous file deletion | UI freezes during cleanup | Delete files in background thread/async | >100 files to delete |
| Storing all history in memory | Memory bloat, crashes | Use LRU cache with eviction (existing BoundedOrderedSet pattern) | >1000 tracked items |
| No pagination on history API | Timeouts, incomplete data | Use pageSize=50, fetch multiple pages | >100 imports |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| API key in URL query strings | Logs expose key, proxy caches leak key | Always use X-Api-Key header |
| No webhook signature validation | Anyone can trigger imports/deletes | Use webhook authentication if Sonarr supports it, validate source IP |
| Trusting webhook eventType without verification | Malicious requests could trigger deletion | Re-verify via API before destructive operations |
| API key visible in settings UI | Shoulder-surfing, screenshots leak key | Show masked value with reveal button |
| No rate limiting on webhook endpoint | DoS via webhook spam | Implement rate limiting (max 10/second) |
| Allowing Sonarr API calls from frontend | Key exposure in browser, XSS risks | All Sonarr API calls must be backend only |

## UX Pitfalls

Common user experience mistakes when adding Sonarr integration.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No visibility into import status | User doesn't know if auto-delete will work | Show import detection status per file in UI |
| Auto-delete enabled by default | User loses files unexpectedly | Require explicit opt-in with warning dialog |
| No notification when import fails | User assumes everything is working | In-app notification + log entry for failed imports |
| Deleting files immediately on import | No recovery if import was corrupted | Add configurable safety delay (default 60 seconds) |
| No way to disable auto-delete per file | User wants manual control for some downloads | Add per-file override toggle in UI |
| No indication of season pack detection | User confused why file not deleted | Badge/icon showing "Season pack - waiting for all episodes" |
| Error messages show API errors directly | "404 Not Found" confuses users | Translate to user-friendly: "Could not find episode in Sonarr" |
| No Sonarr connection test | User configures wrong API key, nothing works | "Test Connection" button in settings that validates API key and connectivity |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Import Detection:** Often missing handling for import failures - verify failure events logged and files preserved
- [ ] **Season Packs:** Often missing per-episode tracking - verify partial imports don't trigger deletion
- [ ] **Webhook Handler:** Often missing idempotency - verify duplicate events don't cause issues
- [ ] **API Client:** Often missing retry logic - verify temporary network failures don't cause data loss
- [ ] **File Matching:** Often missing scene numbering handling - verify anime imports correlate correctly
- [ ] **Connection Errors:** Often missing graceful degradation - verify Sonarr downtime doesn't delete files
- [ ] **Queue Overflow:** Often missing queue depth check - verify works when queue has >60 items
- [ ] **Safety Delays:** Often missing configurable timing - verify users can adjust delay for slow NAS
- [ ] **Hardlink Detection:** Often missing Sonarr import mode check - verify doesn't delete seeding torrents when Sonarr uses hardlinks
- [ ] **Multi-Episode Files:** Often missing detection of S01E01E02 patterns - verify single file with multiple episodes tracked correctly

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Deleted before import | HIGH | 1. Re-download from seedbox if still there 2. Search indexers again 3. User must manually locate file |
| Season pack partial deletion | MEDIUM | 1. Check if remaining files on seedbox 2. Re-sync missing episodes 3. Manual import in Sonarr |
| File name mismatch | LOW | 1. Implement manual mapping UI 2. User maps local files to Sonarr episodes 3. Resume auto-delete |
| Import during transfer | MEDIUM | 1. Re-transfer file 2. Sonarr re-import 3. Fix staging directory config |
| Webhook endpoint crash | LOW | 1. Restart application 2. Poll queue/history to catch up on missed events 3. Fix webhook handler bug |
| API retry exhausted | MEDIUM | 1. Queue for manual review 2. User confirms Sonarr status 3. Retry or delete manually |
| Queue overflow missed | LOW | 1. Periodic full history scan 2. Correlate untracked files 3. Offer manual import/delete |
| Deleted seeding torrent | HIGH | 1. Check seedbox for original 2. Re-download 3. Add hardlink detection to prevent recurrence |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Delete-Before-Import Race | Phase 2 - Webhook implementation with safety delay | Test: Start import, trigger delete immediately, verify file preserved |
| Season Pack Partial Import | Phase 3 - Multi-file tracking | Test: Import season pack, stop Sonarr mid-import, verify no deletion |
| File Name Mismatch | Phase 3 - History API correlation | Test: Rename file after download, verify import still detected |
| Import While Transferring | Phase 1 - LFTP atomic moves | Test: Monitor directory while transfer in progress, verify Sonarr doesn't see file until complete |
| Ignored Import Failures | Phase 3 - Failure detection | Test: Force import failure (wrong quality), verify file not deleted |
| Webhook Not Hardened | Phase 2 - Async webhook handler | Test: Send duplicate webhooks, verify idempotency; send 100 concurrent webhooks, verify no crash |
| No API Retry Logic | Phase 2 - API client with backoff | Test: Stop Sonarr, make API call, verify retries; restart Sonarr mid-retry, verify success |
| Queue Depth Assumption | Phase 3 - History API fallback | Test: Create 65 queue items, verify oldest imports still detected |

## Sources

### Official Documentation
- [Sonarr API Docs](https://sonarr.tv/docs/api/)
- [Sonarr Troubleshooting - Servarr Wiki](https://wiki.servarr.com/sonarr/troubleshooting)
- [Sonarr Activity - Servarr Wiki](https://wiki.servarr.com/sonarr/activity)
- [Hardlinks and Instant Moves - TRaSH Guides](https://trash-guides.info/File-and-Folder-Structure/Hardlinks-and-Instant-Moves/)
- [Remote Path Mappings - TRaSH Guides](https://trash-guides.info/Sonarr/Tips/Sonarr-remote-path-mapping/)

### GitHub Issues (Race Conditions & Import Problems)
- [Race condition during episode import - Issue #5475](https://github.com/Sonarr/Sonarr/issues/5475)
- [Import Season Deletes Episodes before Importing - Issue #5949](https://github.com/Sonarr/Sonarr/issues/5949)
- [Partial import of season pack for cross-seeded torrent - Issue #5625](https://github.com/Sonarr/Sonarr/issues/5625)
- [Failed import does not properly fail - Issue #6873](https://github.com/Sonarr/Sonarr/issues/6873)
- [Pending Import still in import queue after removed from download client - Issue #3557](https://github.com/Sonarr/Sonarr/issues/3557)
- [Files/Folders no longer being deleted after import - Issue #7043](https://github.com/Sonarr/Sonarr/issues/7043)
- [Sonarr deletes files before importing them - Issue #3131](https://github.com/Sonarr/Sonarr/issues/3131)

### GitHub Issues (File Matching & Parsing)
- [Matching issue with files names containing 'Part.1', 'Part.2' - Issue #7826](https://github.com/Sonarr/Sonarr/issues/7826)
- [Prefer Standard over Absolute Numbering - Issue #7246](https://github.com/Sonarr/Sonarr/issues/7246)
- [Sonarr retries download if it exists in qBitTorrent with different name - Issue #5336](https://github.com/Sonarr/Sonarr/issues/5336)

### GitHub Issues (Queue & Status)
- [GET Queue API 'status' filter does not work - Issue #7389](https://github.com/Sonarr/Sonarr/issues/7389)
- [Importer sometimes fails to remove folder, gets stuck in activity queue - Issue #5937](https://github.com/Sonarr/Sonarr/issues/5937)
- [If download completes but files aren't present immediately - Issue #4811](https://github.com/Sonarr/Sonarr/issues/4811)

### GitHub Issues (API & Integration)
- [Improved Indexer Backoff and Status handling logic - Issue #3132](https://github.com/Sonarr/Sonarr/issues/3132)
- [Filter eventType option in history API - Issue #3587](https://github.com/Sonarr/Sonarr/issues/3587)
- [On Download Webhook Fails - Issue #7149](https://github.com/Sonarr/Sonarr/issues/7149)
- [Download Client Settings - Category Bug - Issue #5510](https://github.com/Sonarr/Sonarr/issues/5510)

### Community Forums
- [Import race condition? - sonarr forums](https://forums.sonarr.tv/t/import-race-condition/39676)
- [Can Sonarr Delete Files after Import? - sonarr forums](https://forums.sonarr.tv/t/can-sonarr-delete-files-after-import/32432)
- [Downloads get stuck in queue at 100% progress - sonarr forums](https://forums.sonarr.tv/t/downloads-get-stuck-in-queue-at-100-progress-import-failed-but-import-does-not-fail-and-sonarr-has-already-moved-and-renamed-the-files/30458)
- [Download clients unavailable due to failures - sonarr forums](https://forums.sonarr.tv/t/download-clients-unavailable-due-to-failures-qbittorrent-and-sabnzbd/15374)
- [Too many API Hits on indexer - sonarr forums](https://forums.sonarr.tv/t/too-many-api-hits-on-indexer/17466)

### Source Code
- [Webhook.cs - Sonarr GitHub](https://github.com/Sonarr/Sonarr/blob/develop/src/NzbDrone.Core/Notifications/Webhook/Webhook.cs)

### API Documentation & Libraries
- [sonarr package - golift.io/starr/sonarr](https://pkg.go.dev/golift.io/starr/sonarr)
- [SonarrAPI - pyarr documentation](https://docs.totaldebug.uk/pyarr/modules/sonarr.html)

---
*Pitfalls research for: Sonarr Integration for Download Managers*
*Researched: 2026-02-10*
