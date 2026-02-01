# Unify UI Styling

## Quick Reference

| Item | Value |
|------|-------|
| **Latest Branch** | `claude/unify-ui-styling-ndGuV` |
| **Status** | Not Started |
| **Current Session** | Session 1 |
| **Total Sessions** | 7 |

> **Claude Code Branch Management:**
> Each Claude Code session can only push to branches matching its session ID.
>
> **IMPORTANT:** The master branch may have an outdated version of this doc. To continue this feature:
>
> **Prompt for new session:**
> ```
> Run: git fetch origin && git log --oneline $(git branch -r | grep 'claude/unify-ui-styling' | head -1) -1
> Then merge that branch and read planning docs/UNIFY_UI_STYLING.md to see current progress.
> Continue with the next incomplete session.
> ```
>
> **Manual steps (what Claude should do):**
> 1. `git fetch origin claude/unify-ui-styling-*`
> 2. Find latest: `git branch -r | grep 'claude/unify-ui-styling' | head -1`
> 3. Merge into your session branch: `git merge origin/<latest-branch>`
> 4. Read THIS file from the merged branch to see actual progress
> 5. Continue development and push to your session's branch
>
> **Branch History:**
> - `claude/unify-ui-styling-ndGuV` - Initial planning

---

## Design Summary

**What:** Unify visual styling across all Angular components to create a consistent look and feel.

**Problem Statement:**
The frontend was upgraded from Angular 4 to Angular 19 and Bootstrap 4 to Bootstrap 5. During this migration and subsequent feature development, styling inconsistencies emerged:
- Custom `%button` placeholder pattern vs Bootstrap `btn` classes
- Hardcoded colors instead of CSS variables
- Inconsistent selection/highlight colors (blue vs teal)
- Custom dropdown implementations vs Bootstrap dropdowns
- Varying button heights (34px, 35px, 40px, 60px)
- Mixed form input styling approaches

**Goals:**
1. Consistent visual appearance across all pages
2. Single source of truth for colors and spacing
3. Leverage Bootstrap 5 components where possible
4. Maintain all existing functionality (no functional changes)

**Non-Goals:**
- Adding new features
- Changing component behavior
- Major layout restructuring
- Adding new dependencies

---

## Styling Inventory

### Current Color Variables (_common.scss)
```scss
$primary-color: #337BB7;              // Main blue
$primary-dark-color: #2e6da4;         // Darker blue
$primary-light-color: #D7E7F4;        // Light blue (backgrounds)
$primary-lighter-color: #F6F6F6;      // Very light gray
$secondary-color: #79DFB6;            // Teal/green (selections)
$secondary-light-color: #C5F0DE;      // Light teal
$secondary-dark-color: #32AD7B;       // Dark teal
$secondary-darker-color: #077F4F;     // Very dark teal
$header-color: #DDDDDD;               // Light gray header
$header-dark-color: #D3D3D3;          // Slightly darker header
```

### Components Requiring Updates

| Component | Issues | Priority |
|-----------|--------|----------|
| `file.component.scss` | Custom `%button`, 60px height | High |
| `file-list.component.scss` | Hardcoded black/white header | High |
| `file-options.component.scss` | Custom `%dropdown`, `%toggle` | High |
| `bulk-actions-bar.component.scss` | Uses teal selection color | Medium |
| `selection-banner.component.scss` | Uses blue selection color | Medium |
| `settings-page.component.scss` | Custom `%button`, 40px height | Medium |
| `autoqueue-page.component.scss` | Hardcoded red/green colors | Medium |
| `logs-page.component.scss` | Mixed button patterns | Low |
| `option.component.scss` | Custom form styling | Low |

---

## Sessions

### Session 1: Color Variable Consolidation
**Scope:** Remove all hardcoded colors, add missing variables to `_common.scss`
**Estimated effort:** Small
**Dependencies:** None

**Tasks:**
- [ ] Audit all SCSS files for hardcoded color values
- [ ] Add missing color variables to `_common.scss` (e.g., danger, success states)
- [ ] Replace hardcoded `#000`/`#fff` in `file-list.component.scss` header
- [ ] Replace hardcoded `red`/`green`/`darkred`/`darkgreen` in `autoqueue-page.component.scss`
- [ ] Replace any other hardcoded hex values found during audit
- [ ] Run Angular unit tests to verify no breakage

**Context to read:**
- `src/angular/src/app/common/_common.scss` (existing variables)
- `src/angular/src/app/pages/files/file-list.component.scss` (hardcoded header colors)
- `src/angular/src/app/pages/autoqueue/autoqueue-page.component.scss` (hardcoded button colors)

**Acceptance criteria:**
- No hardcoded color values in any SCSS file (except within `_common.scss`)
- All existing colors preserved visually
- Unit tests pass

---

### Session 2: Selection Color Unification
**Scope:** Standardize selection/highlight colors across components
**Estimated effort:** Small
**Dependencies:** Session 1

**Tasks:**
- [ ] Decide on single selection color scheme (recommend: keep teal/secondary for selections)
- [ ] Update `selection-banner.component.scss` to use secondary colors (currently uses primary blue)
- [ ] Ensure `bulk-actions-bar.component.scss` uses same selection color scheme
- [ ] Verify `file.component.scss` `.selected` and `.bulk-selected` classes align
- [ ] Add selection-specific variables if needed (e.g., `$selection-bg`, `$selection-border`)
- [ ] Visual verification of all selection states

**Context to read:**
- `src/angular/src/app/pages/files/selection-banner.component.scss`
- `src/angular/src/app/pages/files/bulk-actions-bar.component.scss`
- `src/angular/src/app/pages/files/file.component.scss`
- `src/angular/src/app/common/_common.scss`

**Acceptance criteria:**
- All selection UI uses consistent color scheme
- Selection banner and bulk actions bar visually match
- File row selection highlighting consistent

---

### Session 3: Button Standardization - File Actions
**Scope:** Migrate file action buttons from custom `%button` to Bootstrap buttons
**Estimated effort:** Medium
**Dependencies:** Session 1

**Tasks:**
- [ ] Create Bootstrap button override styles in `_common.scss` for consistent sizing
- [ ] Update `file.component.html` to use Bootstrap button classes
- [ ] Update `file.component.scss` to remove `%button` usage, use Bootstrap overrides
- [ ] Ensure icon buttons maintain proper sizing and alignment
- [ ] Verify hover, active, and disabled states work correctly
- [ ] Test on dashboard page - file selection and action buttons

**Context to read:**
- `src/angular/src/app/pages/files/file.component.ts` and `.html` and `.scss`
- `src/angular/src/app/common/_common.scss` (`%button` placeholder definition)
- Bootstrap 5 button documentation

**Acceptance criteria:**
- File action buttons use Bootstrap `btn` classes
- Buttons maintain similar size and spacing to current design
- All button states (hover, active, disabled) work
- No functional changes to button behavior

---

### Session 4: Button Standardization - Other Pages
**Scope:** Migrate remaining custom buttons to Bootstrap
**Estimated effort:** Medium
**Dependencies:** Session 3

**Tasks:**
- [ ] Update `settings-page.component.scss` to use Bootstrap buttons
- [ ] Update `settings-page.component.html` with Bootstrap classes
- [ ] Update `autoqueue-page.component.scss` to use Bootstrap buttons
- [ ] Update `autoqueue-page.component.html` with Bootstrap classes
- [ ] Update `logs-page.component.scss` if needed
- [ ] Remove `%button` placeholder from `_common.scss` if no longer used
- [ ] Verify button heights are consistent across all pages

**Context to read:**
- `src/angular/src/app/pages/settings/settings-page.component.ts` and `.html` and `.scss`
- `src/angular/src/app/pages/autoqueue/autoqueue-page.component.ts` and `.html` and `.scss`
- `src/angular/src/app/pages/logs/logs-page.component.ts` and `.html` and `.scss`
- Session 3 button override patterns

**Acceptance criteria:**
- All pages use Bootstrap button classes
- Consistent button sizing across the app
- Custom `%button` placeholder removed or deprecated
- Settings, Autoqueue, and Logs pages visually consistent

---

### Session 5: Dropdown Migration
**Scope:** Migrate custom dropdowns in file-options to Bootstrap dropdowns
**Estimated effort:** Medium
**Dependencies:** Session 1

**Tasks:**
- [ ] Analyze current `%dropdown` and `%toggle` implementations
- [ ] Update `file-options.component.html` to use Bootstrap dropdown markup
- [ ] Update `file-options.component.scss` to style Bootstrap dropdowns consistently
- [ ] Remove custom dropdown JavaScript logic if replaced by Bootstrap
- [ ] Ensure dropdown positioning works correctly (z-index, overflow)
- [ ] Test filter dropdown, sort dropdown, and search functionality
- [ ] Test on mobile/responsive views

**Context to read:**
- `src/angular/src/app/pages/files/file-options.component.ts` and `.html` and `.scss`
- Bootstrap 5 dropdown documentation
- `src/angular/src/app/common/_common.scss` (`%dropdown`, `%toggle` placeholders)

**Acceptance criteria:**
- Dropdowns use Bootstrap dropdown component
- Filter and sort dropdowns function correctly
- Dropdown styling matches app color scheme
- Mobile/responsive behavior preserved
- No functional changes to filtering/sorting

---

### Session 6: Form Input Standardization
**Scope:** Unify form input styling across all components
**Estimated effort:** Small
**Dependencies:** Session 1

**Tasks:**
- [ ] Audit form inputs across `option.component.scss`, `file-options.component.scss`, `bulk-actions-bar.component.scss`
- [ ] Create consistent form input override styles in `_common.scss` or `styles.scss`
- [ ] Update `option.component.scss` to use Bootstrap form classes with overrides
- [ ] Ensure search input in file-options uses consistent styling
- [ ] Verify checkbox and toggle inputs are styled consistently
- [ ] Test form validation states (if any)

**Context to read:**
- `src/angular/src/app/pages/settings/option.component.ts` and `.html` and `.scss`
- `src/angular/src/app/pages/files/file-options.component.scss` (search input)
- Bootstrap 5 form documentation

**Acceptance criteria:**
- All text inputs have consistent styling
- All checkboxes/toggles have consistent styling
- Form focus states use app color scheme
- Settings page forms look consistent with rest of app

---

### Session 7: Final Polish and E2E Verification
**Scope:** Visual QA, responsive testing, cleanup
**Estimated effort:** Small
**Dependencies:** Sessions 1-6

**Tasks:**
- [ ] Run full E2E test suite (`make run-tests-e2e`)
- [ ] Run Angular unit tests (`make run-tests-angular`)
- [ ] Visual walkthrough of all pages (Dashboard, Settings, Autoqueue, Logs, About)
- [ ] Test responsive breakpoints (mobile, tablet, desktop)
- [ ] Remove any unused CSS/SCSS (dead code cleanup)
- [ ] Remove unused placeholder definitions from `_common.scss`
- [ ] Update any component-level comments referencing old patterns
- [ ] Document any design decisions in Learnings section

**Context to read:**
- All modified SCSS files from previous sessions
- `src/angular/src/app/common/_common.scss` (for cleanup)
- E2E test files for understanding coverage

**Acceptance criteria:**
- All E2E tests pass
- All Angular unit tests pass
- No visual regressions on any page
- Responsive layouts work correctly
- No unused CSS/SCSS remains
- Codebase uses consistent styling patterns

---

## Session Log

_Record completed sessions here with date, outcome, and learnings._

| Session | Date | Outcome | Notes |
|---------|------|---------|-------|
| Planning | 2026-02-01 | Complete | Initial plan created |
| Session 1 | | | |
| Session 2 | | | |
| Session 3 | | | |
| Session 4 | | | |
| Session 5 | | | |
| Session 6 | | | |
| Session 7 | | | |

---

## Learnings

_Document technical discoveries, gotchas, and decisions made during implementation._

### Technical Notes
_(To be filled during implementation)_

### Design Decisions
_(To be filled during implementation)_

### Gotchas
_(To be filled during implementation)_

---

## Blockers

_Track any blockers encountered._

| Blocker | Session | Status | Resolution |
|---------|---------|--------|------------|
| (none) | | | |

---

## Files Reference

### Files to Modify
```
src/angular/src/app/common/_common.scss                              # Sessions 1-6
src/angular/src/styles.scss                                          # Sessions 1, 6
src/angular/src/app/pages/files/file.component.html                  # Session 3
src/angular/src/app/pages/files/file.component.scss                  # Sessions 1, 3
src/angular/src/app/pages/files/file-list.component.scss             # Session 1
src/angular/src/app/pages/files/file-options.component.html          # Session 5
src/angular/src/app/pages/files/file-options.component.scss          # Sessions 1, 5, 6
src/angular/src/app/pages/files/bulk-actions-bar.component.scss      # Session 2
src/angular/src/app/pages/files/selection-banner.component.scss      # Session 2
src/angular/src/app/pages/settings/settings-page.component.html      # Session 4
src/angular/src/app/pages/settings/settings-page.component.scss      # Session 4
src/angular/src/app/pages/settings/option.component.scss             # Session 6
src/angular/src/app/pages/autoqueue/autoqueue-page.component.html    # Session 4
src/angular/src/app/pages/autoqueue/autoqueue-page.component.scss    # Sessions 1, 4
src/angular/src/app/pages/logs/logs-page.component.scss              # Session 4
```

### No New Files Expected
This is a refactoring task - no new components or services should be created.

---

## Visual QA Checklist

Use this checklist during Session 7 for visual verification.

### Dashboard Page
- [ ] File list header styling consistent
- [ ] File row hover states
- [ ] File row selection highlighting
- [ ] Action buttons (Queue, Stop, Extract, Delete Local, Delete Remote)
- [ ] Bulk selection checkboxes
- [ ] Selection banner appearance
- [ ] Bulk actions bar appearance
- [ ] Filter/sort dropdowns
- [ ] Search input

### Settings Page
- [ ] Section headers/cards
- [ ] Form inputs (text, number, checkbox)
- [ ] Save/Cancel buttons
- [ ] Accordion expand/collapse styling

### Autoqueue Page
- [ ] Enable/Disable buttons
- [ ] Pattern list styling
- [ ] Add pattern form inputs

### Logs Page
- [ ] Log level filter buttons
- [ ] Clear logs button
- [ ] Log entry styling

### About Page
- [ ] Version display
- [ ] Links styling

### Responsive Views
- [ ] Mobile (375px) - all pages
- [ ] Tablet (768px) - all pages
- [ ] Desktop (1200px+) - all pages

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Dropdown behavior changes | Medium | Medium | Test thoroughly in Session 5, keep old code as fallback |
| Button click handlers break | Low | High | E2E tests cover this, no functional changes to JS |
| CSS specificity issues | Medium | Low | Test each change, use browser DevTools |
| Mobile layout breaks | Low | Medium | Test responsive views in Session 7 |

---

## Testing Strategy

**Automated Tests:**
- Run `make run-tests-angular` after each session (catches import/compile errors)
- Run `make run-tests-e2e` in Session 7 (catches functional regressions)

**Manual Testing:**
- Quick visual spot-check after each session
- Full visual QA walkthrough in Session 7
- Responsive testing in Session 7

**No comprehensive UAT required** - these are CSS-only changes with E2E coverage for functionality.
