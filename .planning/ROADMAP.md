# Roadmap: Unify UI Styling

## Milestones

- **v1.0 Unify UI Styling** - Phases 1-5 (shipped 2026-02-03)
- **v1.1 Dropdown & Form Migration** - Phases 6-8 (in progress)

## Phases

<details>
<summary>v1.0 Unify UI Styling (Phases 1-5) - SHIPPED 2026-02-03</summary>

- [x] Phase 1: Bootstrap SCSS Setup (1/1 plans) - completed 2026-02-03
- [x] Phase 2: Color Variable Consolidation (2/2 plans) - completed 2026-02-03
- [x] Phase 3: Selection Color Unification (1/1 plans) - completed 2026-02-03
- [x] Phase 4: Button Standardization - File Actions (2/2 plans) - completed 2026-02-03
- [x] Phase 5: Button Standardization - Other Pages (2/2 plans) - completed 2026-02-03

See `.planning/milestones/v1.0-ROADMAP.md` for full details.

</details>

### v1.1 Dropdown & Form Migration

#### Phase 6: Dropdown Migration

**Goal:** File options dropdowns use Bootstrap's native dropdown component with correct positioning behavior

**Dependencies:** None (builds on v1.0 Bootstrap SCSS infrastructure)

**Requirements:**
- DROP-01: File options dropdowns use Bootstrap dropdown component
- DROP-02: Custom `%dropdown` and `%toggle` placeholders removed
- DROP-03: Dropdown positioning works correctly (z-index, overflow, flip behavior)

**Plans:** 1 plan

Plans:
- [x] 06-01-PLAN.md — Migrate dropdowns to Bootstrap native component with dark theme and close-on-scroll

**Success Criteria:**
1. User clicks file options button and dropdown appears below/above button (flip behavior when near viewport edge)
2. User can see dropdown content without horizontal scrollbars or clipping
3. Dropdown closes when user clicks outside or selects an option
4. No `%dropdown` or `%toggle` SCSS placeholders exist in codebase

---

#### Phase 7: Form Input Standardization

**Goal:** All form inputs have consistent Bootstrap styling with app-appropriate focus states

**Dependencies:** None (parallel to Phase 6)

**Requirements:**
- FORM-01: All text inputs use consistent Bootstrap form styling
- FORM-02: Checkboxes and toggles styled consistently
- FORM-03: Form focus states use app color scheme

**Plans:** 1 plan

Plans:
- [ ] 07-01-PLAN.md — Add Bootstrap form variable overrides and dark theme styling

**Success Criteria:**
1. User sees consistent input styling across Settings, AutoQueue, and any modal forms
2. User sees consistent checkbox/toggle appearance on all pages
3. User sees teal/secondary focus ring when clicking into any input field
4. Tab navigation shows visible focus indicators on all form controls

---

#### Phase 8: Final Polish

**Goal:** Application passes full validation with no visual regressions or unused code

**Dependencies:** Phase 6, Phase 7 (cleanup happens after feature work)

**Requirements:**
- POLISH-01: Full E2E test suite passes
- POLISH-02: Visual QA walkthrough complete
- POLISH-03: Responsive breakpoints tested
- POLISH-04: Unused CSS/SCSS removed

**Success Criteria:**
1. All E2E tests pass in CI environment
2. Visual walkthrough confirms no regressions on Files, Settings, AutoQueue, Logs, About pages
3. UI renders correctly at mobile (< 600px), tablet (600-1024px), and desktop (> 1024px) widths
4. No unused SCSS files, variables, or placeholder patterns remain in codebase
5. Bundle size does not increase from v1.0 baseline

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Bootstrap SCSS Setup | v1.0 | 1/1 | Complete | 2026-02-03 |
| 2. Color Variable Consolidation | v1.0 | 2/2 | Complete | 2026-02-03 |
| 3. Selection Color Unification | v1.0 | 1/1 | Complete | 2026-02-03 |
| 4. Button Standardization - File Actions | v1.0 | 2/2 | Complete | 2026-02-03 |
| 5. Button Standardization - Other Pages | v1.0 | 2/2 | Complete | 2026-02-03 |
| 6. Dropdown Migration | v1.1 | 1/1 | Complete | 2026-02-04 |
| 7. Form Input Standardization | v1.1 | 0/1 | Planned | — |
| 8. Final Polish | v1.1 | 0/? | Not Started | — |

---

*v1.1 roadmap created: 2026-02-04*
