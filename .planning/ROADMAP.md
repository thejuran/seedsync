# Roadmap: SeedSync UI Polish & Sonarr Integration

## Milestones

- ✅ **v1.0 Unify UI Styling** - Phases 1-5 (shipped 2026-02-03)
- ✅ **v1.1 Dropdown & Form Migration** - Phases 6-8 (shipped 2026-02-04)
- ✅ **v1.2 UI Cleanup** - Phase 9 (shipped 2026-02-04)
- ✅ **v1.3 Polish & Clarity** - Phases 10-11 (shipped 2026-02-04)
- ✅ **v1.4 Sass @use Migration** - Phases 12-14 (shipped 2026-02-08)
- ✅ **v1.5 Backend Testing** - Phases 15-19 (shipped 2026-02-08)
- ✅ **v1.6 CI Cleanup** - Phases 20-21 (shipped 2026-02-10)
- 🚧 **v1.7 Sonarr Integration** - Phases 22-25 (in progress)

## Phases

<details>
<summary>✅ v1.0 Unify UI Styling (Phases 1-5) - SHIPPED 2026-02-03</summary>

- [x] Phase 1: Bootstrap SCSS Setup (1/1 plans) - completed 2026-02-03
- [x] Phase 2: Color Variable Consolidation (2/2 plans) - completed 2026-02-03
- [x] Phase 3: Selection Color Unification (1/1 plans) - completed 2026-02-03
- [x] Phase 4: Button Standardization - File Actions (2/2 plans) - completed 2026-02-03
- [x] Phase 5: Button Standardization - Other Pages (2/2 plans) - completed 2026-02-03

See `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.1 Dropdown & Form Migration (Phases 6-8) - SHIPPED 2026-02-04</summary>

- [x] Phase 6: Dropdown Migration (1/1 plans) - completed 2026-02-04
- [x] Phase 7: Form Input Standardization (1/1 plans) - completed 2026-02-04
- [x] Phase 8: Final Polish (2/2 plans) - completed 2026-02-04

See `.planning/milestones/v1.1-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.2 UI Cleanup (Phase 9) - SHIPPED 2026-02-04</summary>

- [x] Phase 9: Remove Obsolete Buttons (1/1 plans) - completed 2026-02-04

See `.planning/milestones/v1.2-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.3 Polish & Clarity (Phases 10-11) - SHIPPED 2026-02-04</summary>

- [x] Phase 10: Lint Cleanup (4/4 plans) - completed 2026-02-04
- [x] Phase 11: Status Dropdown Counts (1/1 plans) - completed 2026-02-04

See `.planning/milestones/v1.3-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.4 Sass @use Migration (Phases 12-14) - SHIPPED 2026-02-08</summary>

- [x] Phase 12: Shared Module Migration (1/1 plans) - completed 2026-02-08
- [x] Phase 13: Styles Entry Point (1/1 plans) - completed 2026-02-08
- [x] Phase 14: Validation (1/1 plans) - completed 2026-02-08

See `.planning/milestones/v1.4-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.5 Backend Testing (Phases 15-19) - SHIPPED 2026-02-08</summary>

- [x] Phase 15: Coverage Tooling & Shared Fixtures (1/1 plans) - completed 2026-02-08
- [x] Phase 16: Common Module Tests (1/1 plans) - completed 2026-02-08
- [x] Phase 17: Web Handler Unit Tests (2/2 plans) - completed 2026-02-08
- [x] Phase 18: Controller Unit Tests (2/2 plans) - completed 2026-02-08
- [x] Phase 19: Coverage Baseline & Validation (1/1 plans) - completed 2026-02-08

See `.planning/milestones/v1.5-ROADMAP.md` for full details.

</details>

<details>
<summary>✅ v1.6 CI Cleanup (Phases 20-21) - SHIPPED 2026-02-10</summary>

- [x] Phase 20: CI Workflow Consolidation (1/1 plans) - completed 2026-02-09
- [x] Phase 21: Test Runner Cleanup (1/1 plans) - completed 2026-02-10

See `.planning/milestones/v1.6-ROADMAP.md` for full details.

</details>

### 🚧 v1.7 Sonarr Integration (In Progress)

**Milestone Goal:** Integrate with Sonarr to detect imported files and auto-delete local copies, with status visibility and in-app notifications.

#### Phase 22: Configuration & Settings UI
**Goal**: User can configure and test Sonarr connection in Settings
**Depends on**: Phase 21 (v1.6 complete)
**Requirements**: CONN-01, CONN-02, CONN-03
**Success Criteria** (what must be TRUE):
  1. User can enter Sonarr URL and API key in Settings page
  2. User can enable/disable Sonarr integration via toggle in Settings
  3. User can click "Test Connection" button and see success or failure message
  4. Sonarr configuration persists across app restarts
**Plans**: 2

Plans:
- [x] 22-01: Backend Sonarr Config Section + Test Connection Endpoint
- [x] 22-02: Frontend *arr Integration Settings UI

#### Phase 23: API Client Integration
**Goal**: Backend polls Sonarr queue and tracks imported files
**Depends on**: Phase 22
**Requirements**: IMPRT-01, IMPRT-03
**Success Criteria** (what must be TRUE):
  1. Backend polls Sonarr queue API every 60 seconds when integration enabled
  2. Backend detects when files disappear from Sonarr queue (import completion signal)
  3. Imported filenames persist across app restarts to prevent duplicate detection
  4. Import detection works for files synced by SeedSync (not all Sonarr activity)
  5. Backend logs include Sonarr API polling activity and detected imports
**Plans**: TBD

Plans:
- [ ] 23-01: TBD

#### Phase 24: Status Visibility & Notifications
**Goal**: User sees import status in UI and receives notifications
**Depends on**: Phase 23
**Requirements**: IMPRT-02, NOTIF-01, NOTIF-02
**Success Criteria** (what must be TRUE):
  1. Files show import status badge in file list (Waiting for Import, Imported)
  2. Import events appear in log viewer with filename and timestamp
  3. In-app toast notification appears when Sonarr imports a file
  4. Toast notifications are non-blocking and auto-dismiss after 5 seconds
**Plans**: TBD

Plans:
- [ ] 24-01: TBD

#### Phase 25: Auto-Delete with Safety
**Goal**: Local files auto-delete after Sonarr import with safety mechanisms
**Depends on**: Phase 24
**Requirements**: DEL-01, DEL-02, DEL-03, SAFE-01
**Success Criteria** (what must be TRUE):
  1. User can enable/disable auto-delete via toggle in Settings
  2. Local files are automatically deleted 60 seconds after import detection (configurable delay)
  3. Auto-delete only removes local copy, never touches remote seedbox files
  4. Dry-run mode logs what would be deleted without actually deleting
  5. Auto-delete only triggers for files that were actually imported (not import failures)
**Plans**: TBD

Plans:
- [ ] 25-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 22 → 23 → 24 → 25

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-21. Quality Project | v1.0-v1.6 | All | Complete | 2026-02-10 |
| 22. Configuration & Settings UI | v1.7 | 2/2 | Complete | 2026-02-10 |
| 23. API Client Integration | v1.7 | 0/TBD | Not started | - |
| 24. Status Visibility & Notifications | v1.7 | 0/TBD | Not started | - |
| 25. Auto-Delete with Safety | v1.7 | 0/TBD | Not started | - |

---

*Last updated: 2026-02-10*
*v1.7 roadmap created: 2026-02-10*
*4 phases (22-25), 12 requirements mapped*
