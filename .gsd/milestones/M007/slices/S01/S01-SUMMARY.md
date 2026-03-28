---
id: S01
parent: M007
milestone: M007
provides:
  - Settings page with flat card sections, no accordion, labels-above-inputs layout
requires: []
affects:
  - S02
key_files:
  - src/angular/src/app/pages/settings/settings-page.component.html
  - src/angular/src/app/pages/settings/settings-page.component.scss
  - src/angular/src/app/pages/settings/option.component.html
  - src/angular/src/app/pages/settings/option.component.scss
key_decisions:
  - Replaced Bootstrap accordion with custom .settings-card flat cards (no JS dependency)
  - Labels moved above inputs for text/password; checkboxes remain inline
patterns_established:
  - .settings-card / .settings-card-header / .settings-card-body as the card pattern for settings sections
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M007/slices/S01/S01-PLAN.md
duration: 30m
verification_result: passed
completed_at: 2026-03-27
---

# S01: Settings Page Triggarr-Style Redesign

**Flat card sections with labels-above-inputs replacing Bootstrap accordion on the Settings page.**

## What Happened

Removed all Bootstrap accordion behavior from the Settings page. The `#accordion` wrapper, `data-bs-toggle="collapse"`, `data-bs-target`, and `data-bs-parent` attributes were stripped. Collapse wrapper divs were removed so all card bodies are always visible. Clickable `<button>` headers were replaced with plain `<h3>` text headings.

The page now uses `.settings-card` containers with `.settings-card-header` and `.settings-card-body` — pure CSS, no Bootstrap JS dependency. Two-column desktop layout (`flex-direction: row` at 601px+) and single-column mobile stack are preserved via the same media query breakpoint.

The `option.component` was updated to use column layout (label above input) for text and password fields. Description text now sits between the label and input. Checkboxes remain inline with their label. Padding was tightened from 20px margin to 16px padding for compact Triggarr-style density.

All special sections preserved: *arr Integration with Sonarr/Radarr subsections, enable/disable fieldsets, test connection buttons, webhook URL display, Security card with API token copy, and the Restart button at bottom.

## Verification

- `npx ng build` — clean (only Sass @import deprecation warnings, no errors)
- `npx ng test --watch=false` — 400/400 unit tests pass
- Visual verification at localhost:4200: all sections render as flat cards, two-column desktop, single-column mobile
- No E2E selectors depend on accordion structure (grep confirmed)

## Requirements Advanced

- R031 — Settings page now uses Triggarr-style card sections with labels-above-inputs, no accordion

## Requirements Validated

- none (deferred to milestone UAT)

## New Requirements Surfaced

- none

## Requirements Invalidated or Re-scoped

- none

## Deviations

None — all three tasks (T01 remove accordion, T02 labels-above-inputs, T03 cleanup/verify) were executed as a single commit since they were tightly coupled and low-risk.

## Known Limitations

- Settings page has no backend to connect to in dev mode (shows empty inputs) — this is expected and unchanged from before
- The `@import` Sass deprecation warnings remain (pre-existing, not introduced by this slice)

## Follow-ups

- none

## Files Created/Modified

- `src/angular/src/app/pages/settings/settings-page.component.html` — Removed accordion, flat card layout
- `src/angular/src/app/pages/settings/settings-page.component.scss` — New .settings-card styles, removed accordion CSS
- `src/angular/src/app/pages/settings/option.component.html` — Labels above inputs, description between label and input
- `src/angular/src/app/pages/settings/option.component.scss` — Column layout for labels, tighter padding

## Forward Intelligence

### What the next slice should know
- The Settings page HTML no longer uses any Bootstrap accordion JS — it's pure CSS cards now
- The `.settings-card` pattern could be reused if other pages need card sections

### What's fragile
- nothing — this was a straightforward CSS/HTML restructure with no logic changes

### Authoritative diagnostics
- `npx ng build` and `npx ng test --watch=false` from `src/angular/` — both must stay green

### What assumptions changed
- none
