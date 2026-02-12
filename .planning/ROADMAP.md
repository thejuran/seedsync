# Roadmap: SeedSync UI Polish & *arr Integration

## Milestones

- ✅ **v1.0 Unify UI Styling** - Phases 1-5 (shipped 2026-02-03)
- ✅ **v1.1 Dropdown & Form Migration** - Phases 6-8 (shipped 2026-02-04)
- ✅ **v1.2 UI Cleanup** - Phase 9 (shipped 2026-02-04)
- ✅ **v1.3 Polish & Clarity** - Phases 10-11 (shipped 2026-02-04)
- ✅ **v1.4 Sass @use Migration** - Phases 12-14 (shipped 2026-02-08)
- ✅ **v1.5 Backend Testing** - Phases 15-19 (shipped 2026-02-08)
- ✅ **v1.6 CI Cleanup** - Phases 20-21 (shipped 2026-02-10)
- ✅ **v1.7 Sonarr Integration** - Phases 22-25 (shipped 2026-02-10)
- **v1.8 Radarr + Webhooks** - Phases 26-28 (in progress)

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

<details>
<summary>✅ v1.7 Sonarr Integration (Phases 22-25) - SHIPPED 2026-02-10</summary>

- [x] Phase 22: Configuration & Settings UI (2/2 plans) - completed 2026-02-10
- [x] Phase 23: API Client Integration (2/2 plans) - completed 2026-02-10
- [x] Phase 24: Status Visibility & Notifications (2/2 plans) - completed 2026-02-10
- [x] Phase 25: Auto-Delete with Safety (2/2 plans) - completed 2026-02-10

See `.planning/milestones/v1.7-ROADMAP.md` for full details.

</details>

### v1.8 Radarr + Webhooks (In Progress)

**Milestone Goal:** Add Radarr support, replace polling with webhook-based import detection, and fix pre-existing test failures.

#### Phase 26: Radarr Config & Shared *arr Settings UI
**Goal**: User can configure both Sonarr and Radarr in a unified *arr Integration section
**Depends on**: Phase 25 (v1.7 complete)
**Requirements**: RAD-01, RAD-02, RAD-03, ARR-01, ARR-02
**Success Criteria** (what must be TRUE):
  1. User can enter Radarr URL and API key in Settings page
  2. User can enable/disable Radarr integration via toggle
  3. User can click "Test Connection" for Radarr and see success/failure
  4. Sonarr and Radarr share a unified *arr Integration section with subsections
  5. Radarr configuration persists across app restarts
  6. Existing Sonarr settings continue working unchanged
**Plans**: 2

Plans:
- [x] 26-01: Backend Config.Radarr InnerConfig + test connection endpoint
- [x] 26-02: Frontend shared *arr Integration UI with Sonarr + Radarr subsections

#### Phase 27: Webhook Import Detection
**Goal**: Webhook endpoints replace polling for both Sonarr and Radarr import detection
**Depends on**: Phase 26
**Requirements**: HOOK-01, HOOK-02, HOOK-03, HOOK-04, HOOK-05
**Success Criteria** (what must be TRUE):
  1. POST /server/webhook/sonarr receives Sonarr import events and triggers detection
  2. POST /server/webhook/radarr receives Radarr import events and triggers detection
  3. Webhook events flow through same import pipeline (persist, badge, toast, auto-delete)
  4. SonarrManager polling code removed (webhook-only architecture)
  5. Settings UI displays webhook URLs for user to configure in Sonarr/Radarr
  6. Webhook endpoint returns 200 for valid events (Sonarr/Radarr retry on failure)
**Plans**: 2

Plans:
- [x] 27-01: WebhookManager + POST handlers + Controller integration (replace SonarrManager)
- [x] 27-02: Webhook URL display in Settings UI + unit tests

#### Phase 28: Fix Pre-existing Test Failures
**Goal**: All Angular unit tests passing with zero failures
**Depends on**: Phase 26 (independent of 27, but ordered last)
**Requirements**: TEST-01, TEST-02
**Success Criteria** (what must be TRUE):
  1. All 3 pre-existing failures in model-file.service.spec.ts fixed
  2. All Angular unit tests pass (381+ tests, 0 failures)
  3. No regressions in other test files
**Plans**: 1

Plans:
- [ ] 28-01: Investigate and fix model-file.service.spec.ts failures

## Progress

**Execution Order:**
Phases execute in numeric order: 26 → 27 → 28

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1-25. Previous | v1.0-v1.7 | All | Complete | 2026-02-10 |
| 26. Radarr Config & Shared Settings UI | v1.8 | 2/2 | Complete | 2026-02-11 |
| 27. Webhook Import Detection | v1.8 | 2/2 | Complete | 2026-02-11 |
| 28. Fix Pre-existing Test Failures | v1.8 | 0/1 | Pending | - |

---

*Last updated: 2026-02-11 (Phase 27 complete)*
*v1.8 roadmap created: 2026-02-11*
*3 phases (26-28), 12 requirements mapped*
