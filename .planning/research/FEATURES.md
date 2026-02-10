# Feature Research: Sonarr Integration

**Domain:** Download Manager + Media Management Integration
**Researched:** 2026-02-10
**Confidence:** MEDIUM

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| API Connection Configuration | Standard for any third-party integration | LOW | URL, API key, enable/disable toggle. Sonarr v3 API requires X-Api-Key header or ?apikey= query param |
| Import Status Detection | Core value proposition | MEDIUM | Poll `/api/v3/history` endpoint with `eventType=downloadFolderImported` filter. Requires matching downloaded file paths to import events |
| Auto-Delete After Import | Primary automation goal | MEDIUM | Delete local copy after confirmed import. Must NOT delete remote/seedbox files. Global toggle in settings |
| Manual Import Check | User wants control when automation fails | LOW | Button to force status refresh for selected file. Useful for troubleshooting |
| Connection Validation | Users need to know if setup is broken | LOW | Test button that hits `/api/v3/system/status` to verify API connectivity and version |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| In-App Import Notifications | Users don't need to check multiple apps | LOW | Real-time SSE notifications when import detected (leverage existing SSE infrastructure). Shows "X imported by Sonarr" |
| Import History Log | Debugging and record-keeping | LOW | Add import events to existing log viewer. Shows filename, timestamp, import path |
| Per-File Import Status Badge | Visual clarity in file list | LOW | Add "Waiting for import", "Imported", or "Not tracked" badge to file status display (extend existing status system) |
| Dry-Run Mode | Safety for testing setup | MEDIUM | "Detect imports but don't auto-delete" setting. Logs what would be deleted |
| Import Path Verification | Catch configuration mismatches early | MEDIUM | Warn if Sonarr's import paths don't overlap with SeedSync's local paths (import won't be detected) |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Manage Sonarr Queue from SeedSync | "One UI for everything" | Scope creep. Sonarr already has excellent UI. Creates duplicate functionality and maintenance burden | Link to Sonarr UI from settings page |
| Delete Remote Files After Import | "Clean up seedbox automatically" | Breaks seeding. User's use case explicitly keeps remote files for seeding. Dangerous if misconfigured | Document that remote deletion is handled by seedbox/torrent client, not SeedSync |
| Bi-directional Sync with Sonarr | "Keep everything in sync" | Sonarr is source of truth for library, SeedSync is source for downloads. Bi-directional creates conflict resolution complexity | SeedSync reads Sonarr state (imports), doesn't write to it |
| Track ALL Sonarr Activity | "Monitor everything Sonarr does" | SeedSync only cares about files it synced. Tracking all Sonarr imports adds noise and unnecessary API calls | Only track import events for files in SeedSync's local path |

## Feature Dependencies

```
API Connection Configuration
    └──requires──> Connection Validation (test API works)

Import Status Detection
    └──requires──> API Connection Configuration
    └──requires──> File Path Matching Logic (map SeedSync files to Sonarr imports)

Auto-Delete After Import
    └──requires──> Import Status Detection
    └──requires──> File Deletion (existing SeedSync feature)

Import History Log
    └──requires──> Import Status Detection
    └──enhances──> Existing Log Viewer

In-App Import Notifications
    └──requires──> Import Status Detection
    └──enhances──> Existing SSE Infrastructure

Per-File Import Status Badge
    └──requires──> Import Status Detection
    └──enhances──> Existing File Status Tracking

Dry-Run Mode
    └──requires──> Import Status Detection
    └──requires──> Auto-Delete Logic (but prevents execution)

Import Path Verification
    └──requires──> API Connection Configuration
    └──conflicts──> Nothing (standalone validation)
```

### Dependency Notes

- **Import Status Detection requires File Path Matching:** Sonarr history returns imported paths (e.g., `/tv/Show Name/Season 1/episode.mkv`). Must correlate with SeedSync local files (e.g., `/downloads/episode.mkv`) by filename matching
- **Auto-Delete requires Import Detection:** Cannot delete until confirmed imported. False positives would lose data
- **In-App Notifications enhance SSE Infrastructure:** Leverage existing real-time streaming. No new tech stack needed
- **Dry-Run prevents Auto-Delete execution:** Safety mechanism for testing without consequences

## MVP Definition

### Launch With (v1.7 - Sonarr Integration MVP)

Minimum viable product — what's needed to validate the concept.

- [x] API Connection Configuration — Cannot function without connecting to Sonarr
- [x] Connection Validation — Users need feedback that setup works
- [x] Import Status Detection — Core value proposition. Poll `/api/v3/history` endpoint
- [x] Auto-Delete After Import — Primary automation goal. Global enable/disable toggle
- [x] Per-File Import Status Badge — Visual clarity. Extends existing status: WAITING_IMPORT, IMPORTED
- [x] Import History Log — Debugging and trust-building. Add to existing logs

### Add After Validation (v1.8+)

Features to add once core is working.

- [ ] In-App Import Notifications — User delight feature. Add once polling works reliably
- [ ] Dry-Run Mode — Safety feature. Add once auto-delete proves stable
- [ ] Manual Import Check — Troubleshooting tool. Add when users report detection issues
- [ ] Import Path Verification — Configuration helper. Add if users report setup problems

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Radarr Support — Same pattern, different media type. Add if Sonarr integration succeeds
- [ ] Webhook Support (instead of polling) — More efficient, but requires Sonarr configuration. Polling is simpler MVP
- [ ] Import Statistics Dashboard — "X files imported this month". Add if users request analytics

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| API Connection Configuration | HIGH | LOW | P1 |
| Connection Validation | HIGH | LOW | P1 |
| Import Status Detection | HIGH | MEDIUM | P1 |
| Auto-Delete After Import | HIGH | MEDIUM | P1 |
| Per-File Import Status Badge | HIGH | LOW | P1 |
| Import History Log | MEDIUM | LOW | P1 |
| In-App Import Notifications | MEDIUM | LOW | P2 |
| Dry-Run Mode | MEDIUM | MEDIUM | P2 |
| Manual Import Check | MEDIUM | LOW | P2 |
| Import Path Verification | LOW | MEDIUM | P2 |
| Webhook Support | MEDIUM | HIGH | P3 |
| Radarr Support | HIGH | MEDIUM | P3 |
| Import Statistics Dashboard | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch (v1.7)
- P2: Should have, add when possible (v1.8+)
- P3: Nice to have, future consideration (v2+)

## Sonarr API Integration Details

### Key Endpoints

| Endpoint | Method | Purpose | Response Fields |
|----------|--------|---------|-----------------|
| `/api/v3/system/status` | GET | Validate API connection, check version | `version`, `appName`, `instanceName` |
| `/api/v3/history` | GET | Get import events | Array of `HistoryRecord` with `eventType`, `date`, `series`, `episode`, `data.importedPath`, `data.droppedPath` |
| `/api/v3/queue` | GET | Monitor active downloads (optional) | `page`, `pageSize`, `totalRecords`, `records[]` with download status |

### History Polling Strategy

**Approach:** Poll `/api/v3/history` every 60 seconds (configurable)

**Filter Logic:**
- Query with `eventType=downloadFolderImported` (if API supports filtering)
- If filtering not supported, fetch all history and filter client-side
- Only process imports newer than last poll timestamp
- Match `data.importedPath` or `data.droppedPath` against SeedSync local file paths

**Path Matching:**
```
Sonarr import: /tv/Show Name/Season 1/episode.mkv
SeedSync file:  /downloads/episode.mkv

Match by: filename (episode.mkv) + optional size/hash verification
```

**Edge Cases:**
- Multiple files with same name: Check file size or modification time
- Sonarr imports before SeedSync finishes download: Import event arrives early, SeedSync marks "pending import confirmation"
- Sonarr imports from different path: No match, SeedSync doesn't track (correct behavior)

### Webhook Alternative (Future)

Sonarr supports webhook notifications for import events:
- Event: `OnDownload` or `OnImport`
- Payload: JSON with `eventType`, `series`, `episodes[]`, `episodeFile`
- Advantage: Real-time, no polling overhead
- Disadvantage: Requires user to configure webhook in Sonarr settings, adds complexity

**Recommendation:** Start with polling (simpler setup), add webhook support in v2 if polling causes performance issues.

## Integration Patterns from Similar Tools

### How Sonarr Works with Download Clients

Based on research, standard Sonarr + download client workflow:

1. **Download client** (qBittorrent, Transmission, etc.) downloads files to `/downloads/`
2. **Sonarr** polls download client API, detects completed downloads in queue
3. **Sonarr** imports files from `/downloads/` to `/tv/` (copies or hardlinks)
4. **Sonarr** removes from download client queue (optional, if "Remove Completed" enabled)
5. **Download client** continues seeding original files in `/downloads/` (torrents)

### SeedSync's Role in This Workflow

SeedSync operates BEFORE Sonarr in the chain:

1. **SeedSync** syncs files from remote seedbox to local `/downloads/`
2. **Sonarr** (running on local machine) detects files in `/downloads/`, imports to `/tv/`
3. **SeedSync** detects import via Sonarr API, deletes local `/downloads/` copy
4. **Remote seedbox** continues seeding (SeedSync does NOT touch remote files)

**Key Difference from Standard Integrations:**
- Sonarr typically manages download client (add torrents, remove when done)
- SeedSync does NOT manage Sonarr (read-only relationship)
- SeedSync is a "download transport layer" between seedbox and Sonarr

## Competitor Feature Analysis

| Feature | Sonarr Built-in (Download Clients) | SeedSync + Sonarr | Our Approach |
|---------|-------------------------------------|-------------------|--------------|
| Add downloads to client | Yes (Sonarr → client API) | No (user manages seedbox) | Not applicable. SeedSync syncs, doesn't control downloads |
| Detect completed downloads | Yes (poll client queue) | Yes (poll Sonarr history) | Poll `/api/v3/history` for imports |
| Import to library | Yes (Sonarr moves files) | Yes (Sonarr moves files) | SeedSync doesn't import, Sonarr does |
| Delete after import | Yes (remove from client) | Yes (delete local copy) | Delete local file, NOT remote seedbox file |
| Monitor import status | Yes (queue UI in Sonarr) | No (external tool) | Add status badge in SeedSync UI |
| Notifications | Yes (webhooks, custom scripts) | No | Leverage SSE for in-app notifications |

### Comparable Tools

**Tools that integrate with Sonarr:**
- **SABnzbd/NZBGet:** Download clients with Sonarr integration (bi-directional)
- **Radarr:** Sister project to Sonarr for movies (identical API pattern)
- **Bazarr:** Subtitle manager, reads Sonarr API for library state (read-only, like SeedSync)
- **Overseerr:** Request manager, writes to Sonarr API to add shows (write-only)

**SeedSync's Pattern:** Read-only consumer (like Bazarr), monitoring import events without controlling Sonarr.

## Configuration Requirements

### User Must Provide

- **Sonarr URL:** e.g., `http://localhost:8989`
- **API Key:** Generated in Sonarr → Settings → General → Security
- **Enable/Disable:** Global toggle for auto-delete behavior
- **Poll Interval:** Default 60 seconds (advanced setting)

### Validation Checks

1. **Connection Test:** GET `/api/v3/system/status` with provided API key
2. **Version Check:** Verify Sonarr v3+ (v4/v5 use same v3 API base)
3. **Path Overlap Warning:** If possible, warn if Sonarr's download client path doesn't match SeedSync local path

### Error Handling

| Error | Cause | User Message |
|-------|-------|--------------|
| 401 Unauthorized | Invalid API key | "Invalid Sonarr API key. Check Settings → General → Security in Sonarr." |
| Connection refused | Wrong URL or Sonarr offline | "Cannot connect to Sonarr at [URL]. Verify Sonarr is running." |
| 404 on `/api/v3/` | Very old Sonarr version | "Sonarr v3+ required. Update Sonarr to use this feature." |
| No imports detected | Path mismatch or no activity | "No imports detected. Verify Sonarr is importing files from [local path]." |

## Implementation Notes

### File Status Lifecycle

Extend existing SeedSync file states:

```
DOWNLOADING → DOWNLOADED → EXTRACTED → WAITING_IMPORT → IMPORTED → DELETED
                                         ↓
                                     (timeout after 7 days)
                                         ↓
                                     IMPORT_TIMEOUT
```

**New States:**
- `WAITING_IMPORT`: File ready, awaiting Sonarr import confirmation
- `IMPORTED`: Sonarr confirmed import, eligible for auto-delete (if enabled)
- `IMPORT_TIMEOUT`: No import after 7 days, user should investigate

### Polling Loop Pseudocode

```python
every 60 seconds:
    if sonarr_integration_enabled:
        history = sonarr_api.get_history(since=last_poll_time)
        for event in history.filter(eventType='downloadFolderImported'):
            imported_path = event.data.importedPath
            filename = basename(imported_path)

            local_file = find_file_by_name(filename)
            if local_file and local_file.status == 'WAITING_IMPORT':
                local_file.status = 'IMPORTED'
                log(f"{filename} imported by Sonarr to {imported_path}")
                notify_sse(f"{filename} imported")

                if auto_delete_enabled:
                    delete_local_file(local_file)
                    local_file.status = 'DELETED'

        last_poll_time = now()
```

### Database Schema Extensions

Add to existing file tracking:

```sql
-- New columns for file table
sonarr_import_detected BOOLEAN DEFAULT FALSE
sonarr_import_path TEXT NULL
sonarr_import_timestamp TIMESTAMP NULL
sonarr_eligible_for_delete BOOLEAN DEFAULT FALSE
```

### Settings UI Mockup

```
[Sonarr Integration]

[ ] Enable Sonarr Integration

Sonarr URL: [http://localhost:8989        ]
API Key:    [********************************] [Test Connection]

[ ] Auto-delete local files after Sonarr imports them
    ⚠️  Remote seedbox files will NOT be deleted. Only local copies.

Advanced:
Poll Interval: [60] seconds

[Save Settings]
```

## Sources

**Official Documentation:**
- [Sonarr API Docs](https://sonarr.tv/docs/api/)
- [Sonarr Custom Scripts | Servarr Wiki](https://wiki.servarr.com/sonarr/custom-scripts)
- [Sonarr Settings | Servarr Wiki](https://wiki.servarr.com/sonarr/settings)
- [Sonarr Activity | Servarr Wiki](https://wiki.servarr.com/sonarr/activity)

**API Implementation References:**
- [sonarr package - golift.io/starr/sonarr - Go Packages](https://pkg.go.dev/golift.io/starr/sonarr)
- [sonarr-py · PyPI](https://pypi.org/project/sonarr-py/)
- [Filter eventType option in history API · Issue #3587 · Sonarr/Sonarr](https://github.com/Sonarr/Sonarr/issues/3587)

**Integration Patterns:**
- [Sonarr Guide: Setup, Configuration & How It Works](https://www.rapidseedbox.com/blog/ultimate-guide-to-sonarr)
- [How to Link NZBGet with Sonarr, Radarr, and Other Tools | NZBGet](https://nzbget.com/documentation/how-to-link-nzbget-with-sonarr-radarr-and-other-tools/)
- [Sonarr System | Servarr Wiki](https://wiki.servarr.com/sonarr/system)

**Completed Download Handling:**
- [Can Sonarr Delete Files after Import? - Help & Support - sonarr :: forums](https://forums.sonarr.tv/t/can-sonarr-delete-files-after-import/32432)
- [Sonarr doesn't remove downloads from client after importing - Help & Support - sonarr :: forums](https://forums.sonarr.tv/t/sonarr-doesnt-remove-downloads-from-client-after-importing/31045)

**Webhook & Custom Scripts:**
- [Custom Post Processing Scripts - Nzbdrone](https://nzbdrone.readthedocs.io/Custom-Post-Processing-Scripts/)
- [Sonarr - Wiki](https://notifiarr.wiki/pages/integrations/sonarr/)
- [Webhooks - Feedback request - Feature Requests - sonarr :: forums](https://forums.sonarr.tv/t/webhooks-feedback-request/7085)

**Community Projects:**
- [GitHub - Sonarr/Sonarr: Smart PVR for newsgroup and bittorrent users.](https://github.com/Sonarr/Sonarr)
- [sonarr · GitHub Topics · GitHub](https://github.com/topics/sonarr)
- [GitHub - GregTroar/DeleteArr: Delete files after being imported in Sonarr/Radarr](https://github.com/GregTroar/DeleteArr)

---
*Feature research for: Sonarr Integration in SeedSync*
*Researched: 2026-02-10*
*Confidence: MEDIUM (official API docs were not fully accessible, relying on client libraries and community sources)*
