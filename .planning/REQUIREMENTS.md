# Requirements: Unify UI Styling

**Defined:** 2026-02-03
**Core Value:** Consistent visual appearance across all pages while maintaining all existing functionality

## v1 Requirements

Requirements for styling unification. Phases map to original Sessions 1-4 plus foundation phase from research.

### Foundation (Bootstrap SCSS Setup)

- [ ] **FOUND-01**: Bootstrap imported via SCSS source files, not pre-compiled CSS
- [ ] **FOUND-02**: Proper SCSS import order established (functions → variables → Bootstrap → overrides)
- [ ] **FOUND-03**: Custom variables file created for Bootstrap overrides
- [ ] **FOUND-04**: Build compiles successfully with no visual changes

### Color Variables (Session 1)

- [ ] **COLOR-01**: All hardcoded hex colors in component SCSS replaced with variables
- [ ] **COLOR-02**: File list header (`file-list.component.scss`) uses color variables
- [ ] **COLOR-03**: AutoQueue page (`autoqueue-page.component.scss`) uses color variables for status buttons
- [ ] **COLOR-04**: Missing color variables added to `_common.scss` (danger, success states)
- [ ] **COLOR-05**: Angular unit tests pass after color migration

### Selection Colors (Session 2)

- [ ] **SELECT-01**: Selection banner uses secondary (teal) colors instead of primary (blue)
- [ ] **SELECT-02**: Bulk actions bar uses same selection color scheme as banner
- [ ] **SELECT-03**: File row `.selected` and `.bulk-selected` classes use consistent highlighting
- [ ] **SELECT-04**: Selection-specific variables defined if needed (`$selection-bg`, `$selection-border`)
- [ ] **SELECT-05**: All selection states visually verified

### Button Standardization - File Actions (Session 3)

- [ ] **BTN-01**: Bootstrap button override styles defined in `_common.scss` for consistent sizing
- [ ] **BTN-02**: File action buttons in `file.component.html` use Bootstrap `btn` classes
- [ ] **BTN-03**: Icon buttons maintain proper sizing and alignment
- [ ] **BTN-04**: Button hover, active, and disabled states work correctly
- [ ] **BTN-05**: Dashboard page file selection and action buttons tested

### Button Standardization - Other Pages (Session 4)

- [ ] **BTN-06**: Settings page buttons use Bootstrap classes
- [ ] **BTN-07**: AutoQueue page buttons use Bootstrap classes
- [ ] **BTN-08**: Logs page buttons use Bootstrap classes (if applicable)
- [ ] **BTN-09**: Custom `%button` placeholder removed from `_common.scss`
- [ ] **BTN-10**: Button heights consistent across all pages (target: 40px)
- [ ] **BTN-11**: Angular unit tests pass after button migration

## v2 Requirements

Deferred to future work (Sessions 5-7 from original plan).

### Dropdown Migration (Session 5)

- **DROP-01**: File options dropdowns use Bootstrap dropdown component
- **DROP-02**: Custom `%dropdown` and `%toggle` placeholders removed
- **DROP-03**: Dropdown positioning works correctly (z-index, overflow)

### Form Input Standardization (Session 6)

- **FORM-01**: All text inputs use consistent Bootstrap form styling
- **FORM-02**: Checkboxes and toggles styled consistently
- **FORM-03**: Form focus states use app color scheme

### Final Polish (Session 7)

- **POLISH-01**: Full E2E test suite passes
- **POLISH-02**: Visual QA walkthrough complete
- **POLISH-03**: Responsive breakpoints tested
- **POLISH-04**: Unused CSS/SCSS removed

## Out of Scope

| Feature | Reason |
|---------|--------|
| Adding new UI features | This is purely CSS refactoring |
| Changing component behavior | Styling only, no functional changes |
| Major layout restructuring | Preserve existing layouts |
| Adding new dependencies | Use existing Bootstrap 5 |
| Dark mode | Not part of current unification work |
| CSS custom properties migration | Bootstrap Sass variables sufficient for now |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Not started |
| FOUND-02 | Phase 1 | Not started |
| FOUND-03 | Phase 1 | Not started |
| FOUND-04 | Phase 1 | Not started |
| COLOR-01 | Phase 2 | Not started |
| COLOR-02 | Phase 2 | Not started |
| COLOR-03 | Phase 2 | Not started |
| COLOR-04 | Phase 2 | Not started |
| COLOR-05 | Phase 2 | Not started |
| SELECT-01 | Phase 3 | Not started |
| SELECT-02 | Phase 3 | Not started |
| SELECT-03 | Phase 3 | Not started |
| SELECT-04 | Phase 3 | Not started |
| SELECT-05 | Phase 3 | Not started |
| BTN-01 | Phase 4 | Not started |
| BTN-02 | Phase 4 | Not started |
| BTN-03 | Phase 4 | Not started |
| BTN-04 | Phase 4 | Not started |
| BTN-05 | Phase 4 | Not started |
| BTN-06 | Phase 5 | Not started |
| BTN-07 | Phase 5 | Not started |
| BTN-08 | Phase 5 | Not started |
| BTN-09 | Phase 5 | Not started |
| BTN-10 | Phase 5 | Not started |
| BTN-11 | Phase 5 | Not started |

**Coverage:**
- v1 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-03*
*Last updated: 2026-02-03 after roadmap creation*
