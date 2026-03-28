---
id: S02
parent: M007
milestone: M007
provides:
  - Single unified multi-select bar on dashboard replacing two separate bars
requires: []
affects:
  - S03
key_files:
  - src/angular/src/app/pages/files/bulk-actions-bar.component.html
  - src/angular/src/app/pages/files/bulk-actions-bar.component.scss
  - src/angular/src/app/pages/files/bulk-actions-bar.component.ts
  - src/angular/src/app/pages/files/file-list.component.html
  - src/angular/src/app/pages/files/file-list.component.ts
key_decisions:
  - Merged selection-banner functionality into bulk-actions-bar rather than vice versa (bulk-actions-bar has more logic)
  - Action buttons use subtle pill-style with translucent backgrounds matching status badge pattern
patterns_established:
  - .action-primary / .action-secondary / .action-danger as translucent pill button classes
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M007/slices/S02/S02-PLAN.md
duration: 15m
verification_result: passed
completed_at: 2026-03-27
---

# S02: Dashboard Multi-Select Bar Consolidation

**Merged two redundant selection bars into one unified bar with consistent styling and pill-style action buttons.**

## What Happened

The dashboard previously showed two separate bars when files were selected: a selection-banner (count + Clear) and a bulk-actions-bar (count + action buttons). These had different background tints (25% vs 8% amber) and duplicated the "X files selected" text.

Merged all functionality into the bulk-actions-bar: count label and Clear button on the left, action buttons on the right, single consistent `--app-selection-bg` background. Action buttons changed from heavy Bootstrap colored buttons to subtle pill-style with translucent backgrounds (`.action-primary`, `.action-secondary`, `.action-danger`).

Removed selection-banner from file-list imports. The selection-banner component files are now orphaned (not imported anywhere) but left on disk for clean deletion if desired.

## Verification

- `npx ng build` — clean
- `npx ng test --watch=false` — 400/400 pass
- No runtime visual verification possible without backend (deferred to :dev UAT)

## Requirements Advanced

- none (this is a polish fix, not tied to a tracked requirement)

## Requirements Validated

- none

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None.

## Known Limitations

- selection-banner component files still on disk (orphaned) — can be deleted in a cleanup pass
- Visual verification deferred to :dev UAT since local dev has no backend/files

## Follow-ups

- Delete orphaned selection-banner.component.{ts,html,scss} files

## Files Created/Modified

- `src/angular/src/app/pages/files/bulk-actions-bar.component.html` — Added count label + Clear button, pill-style action buttons
- `src/angular/src/app/pages/files/bulk-actions-bar.component.scss` — Unified background, pill button styles
- `src/angular/src/app/pages/files/bulk-actions-bar.component.ts` — Added clearSelection output + onClearClick handler
- `src/angular/src/app/pages/files/file-list.component.html` — Removed selection-banner, wired clearSelection to bulk-actions-bar
- `src/angular/src/app/pages/files/file-list.component.ts` — Removed SelectionBannerComponent import

## Forward Intelligence

### What the next slice should know
- The selection-banner component files are orphaned and can be safely deleted

### What's fragile
- nothing

### Authoritative diagnostics
- `npx ng build` and `npx ng test --watch=false` from `src/angular/`

### What assumptions changed
- none
