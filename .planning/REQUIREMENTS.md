# Requirements: SeedSync v1.8 Radarr Integration + Webhooks

**Defined:** 2026-02-11
**Core Value:** Reliable file sync from seedbox to local with automated media library integration

## v1.8 Requirements

Requirements for Radarr integration, webhook-based import detection, and test fixes.

### Radarr Connection

- [ ] **RAD-01**: User can configure Radarr connection (URL, API key) in Settings
- [ ] **RAD-02**: User can enable/disable Radarr integration via toggle
- [ ] **RAD-03**: User can test Radarr connection and see success/failure result

### Shared *arr UI

- [ ] **ARR-01**: Sonarr and Radarr settings share a unified *arr Integration section with subsections
- [ ] **ARR-02**: Each *arr subsection has independent enable/disable toggle, URL, API key, and test connection

### Webhook Import Detection

- [ ] **HOOK-01**: POST webhook endpoint for Sonarr import events (`/server/webhook/sonarr`)
- [ ] **HOOK-02**: POST webhook endpoint for Radarr import events (`/server/webhook/radarr`)
- [ ] **HOOK-03**: Webhook events trigger import detection (same flow as current polling)
- [ ] **HOOK-04**: Polling-based import detection removed (webhook-only)
- [ ] **HOOK-05**: Settings UI displays webhook URLs for user to configure in Sonarr/Radarr

### Test Fixes

- [ ] **TEST-01**: Fix 3 pre-existing failures in model-file.service.spec.ts
- [ ] **TEST-02**: All Angular unit tests pass (0 failures)

## Future Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Enhanced Safety

- **SAFE-02**: Manual import check button to force status refresh for selected file
- **SAFE-03**: Import path verification warning if *arr paths don't overlap with SeedSync local path

### UI Polish

- **DARK-01**: Dark mode toggle feature

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Manage Sonarr/Radarr queues from SeedSync | Scope creep — *arr apps have their own UIs |
| Lidarr/Readarr support | Same pattern, but wait until Radarr proves the abstraction works |
| Webhook authentication (API key/secret) | SeedSync typically runs on same LAN as *arr apps |
| Polling fallback alongside webhooks | User chose webhook-only; simpler architecture |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| RAD-01 | Phase 26 | Pending |
| RAD-02 | Phase 26 | Pending |
| RAD-03 | Phase 26 | Pending |
| ARR-01 | Phase 26 | Pending |
| ARR-02 | Phase 26 | Pending |
| HOOK-01 | Phase 27 | Pending |
| HOOK-02 | Phase 27 | Pending |
| HOOK-03 | Phase 27 | Pending |
| HOOK-04 | Phase 27 | Pending |
| HOOK-05 | Phase 27 | Pending |
| TEST-01 | Phase 28 | Pending |
| TEST-02 | Phase 28 | Pending |

**Coverage:**
- v1.8 requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0
- Coverage: 100%

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after roadmap creation*
