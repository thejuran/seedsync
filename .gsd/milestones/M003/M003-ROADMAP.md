# M003: UI Redesign — Earthy Palette

**Vision:** Retheme SeedSync's web UI from terminal/hacker dark theme to a clean, modern dark UI matching Triggarr's design language, using an earthy color palette (Jet Black, Deep Walnut, Olive Bark, Khaki Beige, Lavender).

## Success Criteria

- All pages render with earthy color palette — no green-on-black terminal colors remain
- Top nav bar with text links replaces sidebar on both desktop and mobile
- No Google Fonts loaded — system font stack only
- No terminal effects visible: no CRT scan lines, no ASCII art, no blinking cursors, no `>` prompts, no `--- headers ---`
- File list uses text-only action buttons, percentage progress text, and status dots in dropdowns
- Settings page uses clean card sections instead of accordion
- All unused SVG icon assets and logo.png removed from repo
- Functional status colors (green/amber/red/blue) still work correctly
- Visual kinship with Triggarr is apparent through shared layout patterns

## Key Risks / Unknowns

- **Bootstrap color cascade** — Changing all SCSS color variables may cause unexpected rendering in Bootstrap components (modals, tooltips, dropdowns). Low risk but needs verification across all component types.
- **Sidebar removal structural impact** — Removing the sidebar changes the root layout. Content margin, scroll behavior, sticky header positioning, and route transitions all depend on sidebar width. Medium risk.
- **M002 merge conflict** — Another GSD instance is working on M002 security on `gsd/M002/S01`. Overlap is minimal (both touch `index.html` and potentially `styles.scss`) but merge order matters.

## Proof Strategy

- Bootstrap cascade → retire in S01 by proving all pages load without visual breakage after palette swap
- Sidebar removal → retire in S02 by proving all routes work with top nav, mobile responsive layout functions, sticky header/scroll behavior intact
- M002 conflict → manage by branching from master, not from M002 branch. Resolve conflicts at merge time.

## Verification Classes

- Contract verification: Angular build succeeds (`ng build`), no SCSS compilation errors, no console errors in browser
- Integration verification: All 5 pages load and function — file list scrolling, settings save, log streaming, autoqueue add/remove, about page links
- Operational verification: none (no backend changes)
- UAT / human verification: Visual inspection of all pages against earthy palette, Triggarr comparison for kinship

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 19 active requirements (R021–R039) pass verification
- Angular build succeeds with no SCSS errors
- All 5 pages (Dashboard, Settings, AutoQueue, Logs, About) render with earthy palette
- Top nav bar works on desktop and mobile
- No Google Fonts requests in browser network tab
- No terminal effects visible on any page
- No unused SVG icon assets remain in src/assets/icons/
- File list actions still function correctly
- Status filter dropdowns show colored dots + text

## Requirement Coverage

- Covers: R021, R022, R023, R024, R025, R026, R027, R028, R029, R030, R031, R032, R033, R034, R035, R036, R037, R038, R039
- Partially covers: none
- Leaves for later: R040 (toast redesign)
- Orphan risks: none

## Slices

- [x] **S01: Design tokens & global cleanup** `risk:low` `depends:[]`
  > After this: App loads with earthy palette, system fonts, no CRT/terminal effects — all pages recolored at the global level.

- [x] **S02: Top nav bar & layout** `risk:medium` `depends:[S01]`
  > After this: Sidebar replaced with Triggarr-style top nav bar with text links, responsive mobile layout working.

- [x] **S03: File list & dashboard restyle** `risk:medium` `depends:[S02]`
  > After this: File list has no file type icons, text-only action buttons, percentage progress text, status dots in filter dropdowns.

- [x] **S04: Settings page restyle** `risk:low` `depends:[S01]`
  > After this: Settings uses clean card sections with simple headings instead of accordion with monospace terminal headers.

- [x] **S05: Remaining pages restyle** `risk:low` `depends:[S01]`
  > After this: About, Logs, and AutoQueue pages are clean and terminal-free with card-based layouts.

- [x] **S06: Asset cleanup & polish** `risk:low` `depends:[S02,S03,S04,S05]`
  > After this: All unused SVG icons and logo.png removed, final visual consistency verified across all pages.

## Boundary Map

### S01 → S02
Produces:
- `_bootstrap-variables.scss` → earthy palette SCSS variables ($primary, $body-bg-dark, $body-color-dark, font families)
- `_bootstrap-overrides.scss` → form, dropdown, scrollbar styles using earthy palette colors
- `_common.scss` → re-exported SCSS variables for component use
- `styles.scss` → CSS custom properties (--app-*) with earthy palette values, no CRT/terminal effects
- `index.html` → no Google Fonts links, updated theme-color meta

Consumes: nothing (first slice)

### S01 → S03
Produces:
- Same as S01 → S02 (global tokens available to all components)
- Functional status colors preserved in `_bootstrap-variables.scss` and `styles.scss`

Consumes: nothing (first slice)

### S01 → S04
Produces:
- Same as S01 → S02 (global tokens)

Consumes: nothing (first slice)

### S01 → S05
Produces:
- Same as S01 → S02 (global tokens)

Consumes: nothing (first slice)

### S02 → S03
Produces:
- `app.component.*` → new root layout with top nav bar, full-width content area (no sidebar margin)
- `routes.ts` → route definitions without icon references
- Top nav component (new or refactored from sidebar)

Consumes from S01:
- `styles.scss` → --app-header-bg, --app-logo-color, --app-muted-text custom properties
- `_bootstrap-variables.scss` → font families, color variables

### S02 → S06
Produces:
- List of SVG icons no longer referenced by nav components

Consumes from S01:
- Global palette tokens

### S03 → S06
Produces:
- List of SVG icons no longer referenced by file components (file type icons, action icons, status icons)

Consumes from S01:
- Global palette tokens, status colors
Consumes from S02:
- New layout structure (full-width content area)

### S04 → S06
Produces:
- List of SVG icons no longer referenced by settings components (refresh.svg)

Consumes from S01:
- Global palette tokens

### S05 → S06
Produces:
- Confirmation that about, logs, autoqueue have no remaining SVG references

Consumes from S01:
- Global palette tokens

### S06 (terminal)
Produces:
- Clean `src/assets/` directory — only favicon.png and .gitkeep remain
- Final verification that no component has broken references

Consumes from S02, S03, S04, S05:
- Complete list of unreferenced SVG assets to delete
