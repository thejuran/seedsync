# Roadmap: SeedSync UI Polish

## Milestones

- **v1.0 Unify UI Styling** - Phases 1-5 (shipped 2026-02-03)
- **v1.1 Dropdown & Form Migration** - Phases 6-8 (shipped 2026-02-04)
- **v1.2 UI Cleanup** - Phase 9 (shipped 2026-02-04)
- **v1.3 Polish & Clarity** - Phases 10-11 (in progress)

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

<details>
<summary>v1.1 Dropdown & Form Migration (Phases 6-8) - SHIPPED 2026-02-04</summary>

- [x] Phase 6: Dropdown Migration (1/1 plans) - completed 2026-02-04
- [x] Phase 7: Form Input Standardization (1/1 plans) - completed 2026-02-04
- [x] Phase 8: Final Polish (2/2 plans) - completed 2026-02-04

See `.planning/milestones/v1.1-ROADMAP.md` for full details.

</details>

<details>
<summary>v1.2 UI Cleanup (Phase 9) - SHIPPED 2026-02-04</summary>

- [x] Phase 9: Remove Obsolete Buttons (1/1 plans) - completed 2026-02-04

See `.planning/milestones/v1.2-ROADMAP.md` for full details.

</details>

### v1.3 Polish & Clarity (In Progress)

**Milestone Goal:** Fix TypeScript lint errors and improve status dropdown usability

- [ ] **Phase 10: Lint Cleanup** - Fix all TypeScript lint errors for clean codebase
- [ ] **Phase 11: Status Dropdown Counts** - Add file counts to status dropdown options

#### Phase 10: Lint Cleanup
**Goal**: Codebase passes all TypeScript lint checks with zero errors
**Depends on**: Nothing (first phase of v1.3)
**Requirements**: LINT-01, LINT-02, LINT-03, LINT-04, LINT-05, LINT-06
**Success Criteria** (what must be TRUE):
  1. `npm run lint` exits with zero errors and zero warnings
  2. All functions have explicit return types (no implicit any returns)
  3. No `any` types remain in application code (type-safe throughout)
  4. No non-null assertions (`!`) without proper guards or justification
  5. No empty functions without explicit `// intentionally empty` comments
**Plans**: 4 plans in 2 waves

Plans:
- [ ] 10-01-PLAN.md - Quick wins: auto-fix style issues + empty function comments
- [ ] 10-02-PLAN.md - Return types: services layer (~80 functions)
- [ ] 10-03-PLAN.md - Return types: pages/common/tests layer (~72 functions)
- [ ] 10-04-PLAN.md - Type safety: replace `any` types + non-null assertions

#### Phase 11: Status Dropdown Counts
**Goal**: Users can see at a glance how many files are in each status category
**Depends on**: Phase 10
**Requirements**: UX-01, UX-02, UX-03
**Success Criteria** (what must be TRUE):
  1. Each status option displays count in parentheses (e.g., "Downloaded (5)")
  2. "All" option shows total file count across all statuses
  3. Counts update automatically when files change status (no refresh needed)
  4. Empty statuses show "(0)" count (visible but clearly empty)
**Plans**: TBD

Plans:
- [ ] 11-01: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Bootstrap SCSS Setup | v1.0 | 1/1 | Complete | 2026-02-03 |
| 2. Color Variable Consolidation | v1.0 | 2/2 | Complete | 2026-02-03 |
| 3. Selection Color Unification | v1.0 | 1/1 | Complete | 2026-02-03 |
| 4. Button Standardization - File Actions | v1.0 | 2/2 | Complete | 2026-02-03 |
| 5. Button Standardization - Other Pages | v1.0 | 2/2 | Complete | 2026-02-03 |
| 6. Dropdown Migration | v1.1 | 1/1 | Complete | 2026-02-04 |
| 7. Form Input Standardization | v1.1 | 1/1 | Complete | 2026-02-04 |
| 8. Final Polish | v1.1 | 2/2 | Complete | 2026-02-04 |
| 9. Remove Obsolete Buttons | v1.2 | 1/1 | Complete | 2026-02-04 |
| 10. Lint Cleanup | v1.3 | 0/4 | Planned | - |
| 11. Status Dropdown Counts | v1.3 | 0/TBD | Not started | - |

---

*Last updated: 2026-02-04*
*v1.3 roadmap created: 2026-02-04*
