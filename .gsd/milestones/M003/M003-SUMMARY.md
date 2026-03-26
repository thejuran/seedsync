---
id: M003
title: "UI Redesign — Earthy Palette"
provides:
  - Earthy color palette (Jet Black, Deep Walnut, Olive Bark, Khaki Beige, Lavender)
  - System font stack (no Google Fonts dependency)
  - Triggarr-style top nav bar replacing sidebar
  - All terminal/hacker effects removed
  - File list with no SVG icons, percentage progress, status dots
  - Clean settings with simple card headers
  - Clean about, logs, autoqueue pages
  - All unused SVG icon assets and logo.png removed
key_files:
  - src/angular/src/app/common/_bootstrap-variables.scss
  - src/angular/src/app/common/_bootstrap-overrides.scss
  - src/angular/src/app/common/_common.scss
  - src/angular/src/styles.scss
  - src/angular/src/index.html
  - src/angular/src/app/pages/main/app.component.*
  - src/angular/src/app/routes.ts
completed_at: 2026-03-25T21:30:00Z
---

# M003: UI Redesign — Earthy Palette

**Rethemed SeedSync from terminal/hacker to clean modern dark UI with earthy palette matching Triggarr's design language**

## Slices Completed

- S01: Design tokens & global cleanup — earthy palette, system fonts, terminal effects removed
- S02: Top nav bar & layout — sidebar replaced, full-width content
- S03: File list restyle — no icons, percentage progress, status dots
- S04: Settings restyle — clean card headers
- S05: Remaining pages — about, logs, autoqueue cleaned up
- S06: Asset cleanup — all SVGs and logo.png removed
