# S02: Dashboard Multi-Select Bar Consolidation

**Goal:** Merge the selection-banner and bulk-actions-bar into a single unified bar with consistent styling.
**Demo:** When files are selected on the dashboard, one bar appears showing: selected count + Clear button + action buttons. No duplicate "X files selected" text.

## Must-Haves

- Selection banner and bulk actions bar merged into single component
- Single bar shows: count label, Clear button (left), action buttons (right)
- Consistent background tint (one color, not two different amber levels)
- Action buttons use subtle pill-style (not heavy Bootstrap colored buttons)
- All bulk actions still work: Queue, Stop, Extract, Delete Local, Delete Remote
- Clear button still clears selection
- Mobile responsive layout preserved
- `ng build` clean, all unit tests pass

## Proof Level

- This slice proves: contract (build + unit tests)
- Real runtime required: yes (visual verification on :dev after milestone merge)
- Human/UAT required: yes (deferred to milestone UAT)

## Verification

- `cd src/angular && npx ng build` — clean build
- `cd src/angular && npx ng test --watch=false` — 400/400 pass

## Tasks

- [x] **T01: Merge selection-banner into bulk-actions-bar** `est:30m`
  - Why: Two bars showing "X files selected" is redundant and visually inconsistent
  - Files: `bulk-actions-bar.component.html`, `bulk-actions-bar.component.scss`, `bulk-actions-bar.component.ts`, `file-list.component.html`, `file-list.component.ts`
  - Do: Add Clear button and count to bulk-actions-bar, remove selection-banner from file-list imports, add clearSelection output to bulk-actions-bar
  - Verify: `ng build` clean, `ng test --watch=false` passes
  - Done when: Single bar renders, no selection-banner references in file-list

## Files Likely Touched

- `src/angular/src/app/pages/files/bulk-actions-bar.component.html`
- `src/angular/src/app/pages/files/bulk-actions-bar.component.scss`
- `src/angular/src/app/pages/files/bulk-actions-bar.component.ts`
- `src/angular/src/app/pages/files/file-list.component.html`
- `src/angular/src/app/pages/files/file-list.component.ts`
