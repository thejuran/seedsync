# Requirements: SeedSync UI Polish

**Defined:** 2026-02-04
**Core Value:** Clean, maintainable codebase with intuitive user interface

## v1.3 Requirements

Code quality improvements and UX clarity enhancements.

### Lint Cleanup

- [ ] **LINT-01**: Fix missing return type warnings (~152 functions)
- [ ] **LINT-02**: Replace `any` types with proper types (~49 usages)
- [ ] **LINT-03**: Remove non-null assertions or add proper guards (~47 usages)
- [ ] **LINT-04**: Fix empty function warnings (~19 functions)
- [ ] **LINT-05**: Fix remaining lint issues (quotes, var, unused ~10)
- [ ] **LINT-06**: All lint checks pass with zero warnings/errors

### Status Dropdown Clarity

- [ ] **UX-01**: Status dropdown shows file count per status (e.g., "Downloaded (5)")
- [ ] **UX-02**: "All" option shows total file count
- [ ] **UX-03**: Counts update in real-time as files change status

## Out of Scope

| Feature | Reason |
|---------|--------|
| Hiding empty status options | User chose counts over hiding |
| Dimming empty options differently | Current disabled styling sufficient with counts |
| Other dropdown improvements | Scope limited to counts only |
| Refactoring beyond lint fixes | Fix issues in place, no major restructuring |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| LINT-01 | TBD | Pending |
| LINT-02 | TBD | Pending |
| LINT-03 | TBD | Pending |
| LINT-04 | TBD | Pending |
| LINT-05 | TBD | Pending |
| LINT-06 | TBD | Pending |
| UX-01 | TBD | Pending |
| UX-02 | TBD | Pending |
| UX-03 | TBD | Pending |

**Coverage:**
- v1.3 requirements: 9 total
- Mapped to phases: 0
- Unmapped: 9

---
*Requirements defined: 2026-02-04*
*Last updated: 2026-02-04 after initial definition*
