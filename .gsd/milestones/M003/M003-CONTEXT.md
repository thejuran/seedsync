# M003: UI Redesign — Earthy Palette — Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

## Project Description

Retheme SeedSync's Angular 21 / Bootstrap 5 web UI from the current terminal/hacker dark theme to a clean, modern dark UI that visually matches the Triggarr project's design language, using an earthy color palette.

## Why This Milestone

The current UI uses a "Terminal/Hacker" aesthetic: CRT scan lines, ASCII art, monospace fonts, green-on-black color scheme, blinking cursors, `>` prompts. The user dislikes this and wants SeedSync to look like a visual sibling of Triggarr — a clean dark UI with cards, simple typography, and horizontal nav. The earthy palette provides differentiation while the shared layout patterns create family cohesion.

## User-Visible Outcome

### When this milestone is complete, the user can:

- See SeedSync's web UI with earthy tones (jet black bg, olive/walnut accents, lavender text) and no terminal theming
- Navigate via a top nav bar with text links (like Triggarr) instead of a sidebar
- View files, settings, logs, autoqueue, and about pages with clean card-based layouts
- Use the app on mobile with a responsive top nav and stacked card layout

### Entry point / environment

- Entry point: http://localhost:8080 (Angular dev server at :4200 for development)
- Environment: browser (desktop + mobile)
- Live dependencies involved: none (pure frontend restyling)

## Completion Class

- Contract complete means: All pages render with earthy palette, no terminal effects visible, no Google Fonts loaded, no unused SVG assets in repo
- Integration complete means: Angular app builds successfully with esbuild, no console errors, all pages load and function
- Operational complete means: none (no backend changes)

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- All 5 pages (Dashboard, Settings, AutoQueue, Logs, About) render with earthy palette and clean styling
- Top nav bar works on both desktop and mobile viewports
- No Google Fonts requests in network tab
- No terminal effects visible (no CRT lines, no ASCII art, no `>` prompts, no `--- headers ---`)
- File list actions (queue, stop, extract, delete) still function with text-only buttons
- Status filter dropdown shows colored dots + text labels

## Risks and Unknowns

- **Parallel M002 work** — Another GSD instance is working on M002 security fixes on branch `gsd/M002/S01`. M003 branches from master and touches only frontend SCSS/HTML/TS. Conflict risk is low but possible in `index.html` (M002 adds meta tag injection, M003 removes Google Fonts links) and `styles.scss`.
- **Bootstrap variable cascade** — Changing the entire color palette via SCSS variables may have unexpected cascade effects in Bootstrap component rendering. Need to verify all Bootstrap components (dropdowns, modals, forms, buttons) render correctly with the new palette.
- **Sidebar removal scope** — Removing the sidebar is a structural layout change that touches the root `app.component`. Need to ensure route transitions, sticky headers, and scroll behavior still work.

## Existing Codebase / Prior Art

### Reference: Triggarr (design target)
- `~/triggarr/triggarr/static/css/input.css` — Tailwind theme tokens (triggarr-green, triggarr-bg, triggarr-card, etc.)
- `~/triggarr/triggarr/templates/base.html` — Top nav bar pattern (logo left, links right)
- `~/triggarr/triggarr/templates/settings.html` — Card-based settings with clean forms
- `~/triggarr/triggarr/templates/partials/app_card.html` — Card component pattern

### SeedSync (files to modify)
- `src/angular/src/index.html` — Google Fonts links, theme-color meta
- `src/angular/src/styles.scss` — Global styles, CRT effects, terminal animations, CSS custom properties
- `src/angular/src/app/common/_bootstrap-variables.scss` — Bootstrap color overrides, font families
- `src/angular/src/app/common/_bootstrap-overrides.scss` — Form, dropdown, scrollbar overrides
- `src/angular/src/app/common/_common.scss` — Shared SCSS variables, breakpoints, z-indexes
- `src/angular/src/app/pages/main/app.component.*` — Root layout (sidebar + content area)
- `src/angular/src/app/pages/main/sidebar.component.*` — Sidebar (will be removed/replaced)
- `src/angular/src/app/pages/main/header.component.*` — Notification header
- `src/angular/src/app/routes.ts` — Route definitions with icon references
- `src/angular/src/app/pages/files/` — File list, options bar, action bars
- `src/angular/src/app/pages/settings/` — Settings accordion, option component
- `src/angular/src/app/pages/logs/` — Log viewer
- `src/angular/src/app/pages/autoqueue/` — AutoQueue pattern list
- `src/angular/src/app/pages/about/` — About page with ASCII art
- `src/angular/src/assets/` — SVG icons and logo.png

> See `.gsd/DECISIONS.md` for all architectural and pattern decisions — it is an append-only register; read it during planning, append to it during execution.

## Relevant Requirements

- R021–R039 — All M003 UI redesign requirements
- R022 supersedes D006 (Google Fonts CSP allowlist) — fonts being removed entirely
- R016 (M002) — Zero CSP violations — M003 font removal affects CSP font-src directive

## Scope

### In Scope

- Color palette replacement (SCSS variables + CSS custom properties)
- Font stack change to system fonts
- Sidebar → top nav bar structural change
- Remove all terminal/hacker visual effects
- Remove all SVG icon references from components
- Restyle all 5 pages to clean card-based layout
- Remove unused asset files
- Responsive layout adjustments

### Out of Scope / Non-Goals

- No Angular framework changes (stay on Angular 21 + Bootstrap 5)
- No backend changes
- No new favicon or branding design
- No htmx/Tailwind rewrite
- No toast notification redesign (R040 deferred)

## Technical Constraints

- Must use Bootstrap 5 SCSS variable system — no inline Tailwind classes
- Must not break existing Angular unit tests (component rendering)
- Must not conflict with M002 security work (different branch, minimal file overlap)
- Status colors (green/amber/red/blue) must remain as semantic functional colors

## Integration Points

- **M002 index.html changes** — M002/S01 adds meta tag injection to index.html. M003/S01 removes Google Fonts links from index.html. Merge order matters.
- **CSP font-src** — M002/S03 sets font-src to include Google Fonts CDN. M003 removes Google Fonts. After M003, font-src can be tightened (but this is M002's concern, not M003's).

## Open Questions

- None — all design decisions locked during discussion phase.

## Color Palette Reference

| Name | Hex | Role |
|---|---|---|
| Jet Black | #13262f | Deep background (body, inputs) |
| Deep Walnut | #583e23 | Card/surface background, elevated surfaces |
| Olive Bark | #73683b | Accent color, active states, branding |
| Khaki Beige | #b0a084 | Muted/secondary text, labels |
| Lavender | #e9e6ff | Primary text, headings |

## Per-Slice Implementation Guidance

### S01: Design Tokens & Global Cleanup
Read and modify: `_bootstrap-variables.scss`, `_bootstrap-overrides.scss`, `_common.scss`, `styles.scss`, `index.html`
Key: Replace all color values, font families, remove CRT/terminal effects from global styles.

### S02: Top Nav Bar & Layout
Read: Triggarr's `base.html` for nav pattern. Modify: `app.component.*`, `sidebar.component.*` (remove), `routes.ts`, `header.component.*`
Key: Structural layout change — sidebar width margin removed, content goes full width under nav bar.

### S03: File List & Dashboard Restyle
Read: Triggarr's card patterns. Modify: `file.component.*`, `file-list.component.*`, `file-options.component.*`, `file-actions-bar.component.*`, `bulk-actions-bar.component.*`, `selection-banner.component.*`
Key: Remove all SVG icon references, replace ASCII bar with percentage text, add status dots to dropdowns.

### S04: Settings Page Restyle
Read: Triggarr's `settings.html`. Modify: `settings-page.component.*`, `option.component.*`
Key: Replace accordion with always-visible card sections, clean form styling.

### S05: Remaining Pages Restyle
Modify: `about-page.component.*`, `logs-page.component.*`, `autoqueue-page.component.*`
Key: Remove ASCII art, terminal prompts, monospace styling. Replace with clean card layouts.

### S06: Asset Cleanup & Polish
Modify: `src/assets/icons/` (delete unused SVGs), `src/assets/logo.png` (delete)
Key: Verify no component references remaining before deleting. Final visual consistency check.
