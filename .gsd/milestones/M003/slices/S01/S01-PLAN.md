# S01: Design Tokens & Global Cleanup

**Goal:** Replace the entire terminal/hacker color palette and font stack with the earthy palette and system fonts, and remove all terminal effects from global styles.
**Demo:** App loads with earthy palette (jet black bg, olive accents, lavender text), system fonts, no CRT/terminal effects — all pages recolored at the global level.

## Must-Haves
- All Bootstrap SCSS color variables use earthy palette values
- All CSS custom properties (--app-*) use earthy palette values
- System font stack replaces Fira Code and IBM Plex Sans
- Google Fonts link tags removed from index.html
- CRT scan-line overlay removed from styles.scss
- Terminal animations (cursor-blink, green-pulse) removed
- Terminal utility classes (.glow-green, .text-terminal, .cursor-blink) removed
- Functional status colors (green/amber/red/blue) preserved unchanged
- Angular app builds without SCSS errors

## Tasks

- [x] **T01: Replace color palette and font stack in SCSS variables and global styles**
  Replace all color values in _bootstrap-variables.scss, _bootstrap-overrides.scss, _common.scss, and styles.scss with earthy palette. Replace font families with system stack. Remove CRT effects and terminal animations/utilities from styles.scss. Remove Google Fonts from index.html.

## Files Likely Touched
- src/angular/src/index.html
- src/angular/src/styles.scss
- src/angular/src/app/common/_bootstrap-variables.scss
- src/angular/src/app/common/_bootstrap-overrides.scss
- src/angular/src/app/common/_common.scss
