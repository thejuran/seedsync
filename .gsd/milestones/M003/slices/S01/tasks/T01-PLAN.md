# T01: Replace color palette and font stack in SCSS variables and global styles

**Slice:** S01
**Milestone:** M003

## Goal
Replace the entire terminal/hacker color system and font stack with the earthy palette and system fonts, and strip all terminal visual effects from global styles.

## Must-Haves

### Truths
- App background is Jet Black (#13262f), not terminal black (#0d1117)
- Primary text is Lavender (#e9e6ff), not terminal gray (#e6edf3)
- Accent/primary color is Olive Bark (#73683b), not terminal green (#3fb950)
- No Google Fonts network requests when app loads
- No CRT scan-line overlay visible
- No blinking cursor or green-pulse animations
- Status colors (green=#3fb950, amber=#f0883e, red=#f85149, blue=#58a6ff) unchanged
- Angular build succeeds

### Artifacts
- _bootstrap-variables.scss — earthy palette variables
- _bootstrap-overrides.scss — earthy form/dropdown/scrollbar styles
- _common.scss — earthy gray scale values
- styles.scss — earthy CSS custom properties, no CRT/terminal effects
- index.html — no Google Fonts links, earthy theme-color meta

## Steps
1. Replace all color values in _bootstrap-variables.scss
2. Replace font family variables with system font stack
3. Update _bootstrap-overrides.scss colors
4. Update _common.scss gray scale
5. Update styles.scss CSS custom properties, remove CRT/terminal effects
6. Update index.html — remove Google Fonts, update theme-color
7. Build and verify
