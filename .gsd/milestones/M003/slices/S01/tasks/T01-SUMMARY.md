---
id: T01
parent: S01
milestone: M003
provides:
  - Earthy color palette in all Bootstrap SCSS variables
  - Earthy CSS custom properties (--app-*) in styles.scss
  - System font stack (no Google Fonts dependency)
  - Terminal effects removed (CRT overlay, animations, utility classes)
  - Clean index.html with earthy theme-color meta
affects: [S02, S03, S04, S05, S06]
key_files:
  - src/angular/src/app/common/_bootstrap-variables.scss
  - src/angular/src/app/common/_bootstrap-overrides.scss
  - src/angular/src/app/common/_common.scss
  - src/angular/src/styles.scss
  - src/angular/src/index.html
key_decisions:
  - "Border color #3d4a52 — derived earthy teal-gray, lighter than bg for visibility"
  - "Even-row background rgba(88,62,35,0.3) — translucent walnut for subtle striping"
patterns_established:
  - "Earthy palette tokens: #13262f bg, #583e23 surface, #73683b accent, #b0a084 muted, #e9e6ff text"
duration: 15min
verification_result: pass
completed_at: 2026-03-25T20:45:00Z
---

# T01: Replace color palette and font stack

**Replaced entire terminal/hacker color system with earthy 5-color palette and system fonts across all global SCSS files**

## What Happened

Mapped all terminal colors to earthy equivalents across 4 global SCSS files. Introduced #3d4a52 as border color. Replaced Fira Code and IBM Plex Sans with system font stacks. Removed CRT scan-line overlay, cursor-blink/green-pulse animations, and terminal utility classes. Removed Google Fonts from index.html. Functional status colors preserved.

## Deviations
None.

## Files Modified
- `_bootstrap-variables.scss` — All colors and fonts replaced
- `_bootstrap-overrides.scss` — Dropdown, form, scrollbar colors replaced
- `_common.scss` — Gray scale replaced
- `styles.scss` — CSS custom properties replaced, terminal effects removed
- `index.html` — Google Fonts removed, theme-color updated
