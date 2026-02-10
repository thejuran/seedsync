# Requirements: SeedSync v1.7 Sonarr Integration

**Defined:** 2026-02-10
**Core Value:** Reliable file sync from seedbox to local with automated media library integration

## v1.7 Requirements

Requirements for Sonarr integration milestone. Each maps to roadmap phases.

### Connection

- [ ] **CONN-01**: User can configure Sonarr connection (URL, API key) in Settings
- [ ] **CONN-02**: User can enable/disable Sonarr integration via toggle
- [ ] **CONN-03**: User can test Sonarr connection and see success/failure result

### Import Detection

- [ ] **IMPRT-01**: SeedSync polls Sonarr queue to detect when files are imported
- [ ] **IMPRT-02**: Files show import status badge (Waiting for Import, Imported) in file list
- [ ] **IMPRT-03**: Imported files tracked persistently to prevent re-processing

### Auto-Delete

- [ ] **DEL-01**: User can enable/disable auto-delete of local files after Sonarr import (global toggle)
- [ ] **DEL-02**: Auto-delete only removes local copy, never remote seedbox files
- [ ] **DEL-03**: Configurable safety delay before deletion (default 60s) prevents race conditions

### Notifications

- [ ] **NOTIF-01**: Import events appear in existing log viewer with filename and timestamp
- [ ] **NOTIF-02**: In-app toast notification shown when Sonarr imports a file (via SSE)

### Safety

- [ ] **SAFE-01**: Dry-run mode detects imports and logs what would be deleted without actually deleting

## Future Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Radarr Support

- **RAD-01**: User can configure Radarr connection (identical API pattern to Sonarr)
- **RAD-02**: Movie import detection and auto-delete (same workflow as Sonarr)

### Enhanced Safety

- **SAFE-02**: Manual import check button to force status refresh for selected file
- **SAFE-03**: Import path verification warning if Sonarr paths don't overlap with SeedSync local path

### Webhooks

- **HOOK-01**: Sonarr webhook endpoint for real-time import detection (replaces polling)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Manage Sonarr queue from SeedSync | Scope creep — Sonarr already has excellent queue UI |
| Delete remote seedbox files | Breaks seeding — user keeps remote for seeding, Sonarr handles torrent client |
| Bi-directional Sonarr sync | SeedSync is read-only consumer of Sonarr state, not a controller |
| Track all Sonarr activity | Only track imports for files SeedSync synced — avoid noise |
| New ModelFile states | Architecture research: use separate tracking (BoundedOrderedSet), not new State enum values |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONN-01 | — | Pending |
| CONN-02 | — | Pending |
| CONN-03 | — | Pending |
| IMPRT-01 | — | Pending |
| IMPRT-02 | — | Pending |
| IMPRT-03 | — | Pending |
| DEL-01 | — | Pending |
| DEL-02 | — | Pending |
| DEL-03 | — | Pending |
| NOTIF-01 | — | Pending |
| NOTIF-02 | — | Pending |
| SAFE-01 | — | Pending |

**Coverage:**
- v1.7 requirements: 12 total
- Mapped to phases: 0
- Unmapped: 12

---
*Requirements defined: 2026-02-10*
*Last updated: 2026-02-10 after initial definition*
