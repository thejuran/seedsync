# M007: Settings Redesign, Documentation & v3.3.0 Release

**Vision:** Redesign the Settings page to match Triggarr's layout (card sections, compact fields, no accordion), update all documentation and screenshots to reflect the Deep Moss redesign, then cut the v3.3.0 release.

## Success Criteria

- Settings page uses Triggarr-style card sections with labels-above-inputs, compact spacing, no accordion collapse
- Dashboard multi-select shows a single unified bar (not two stacked bars) with consistent styling
- All screenshots in README, docs site, and GitHub Pages show the current Deep Moss UI
- Changelog has a complete v3.3.0 entry covering all changes since v3.2.0
- README header no longer references the original repo's logo image
- docs/index.md references "Angular 21" (not 19)
- v3.3.0 tag is pushed, CI publishes Docker `:latest` image and Deb packages

## Key Risks / Unknowns

- Settings page has many form sections and *arr integration — need to verify all inputs still save correctly after layout change
- Screenshot capture requires a running instance with realistic data — E2E fixture data or the dev server may suffice

## Verification Classes

- Contract verification: Angular unit tests (400/400), `ng build` clean
- Integration verification: full CI pipeline (unit + E2E + builds)
- Operational verification: v3.3.0 tag triggers publish jobs, `:latest` Docker image runs with new UI
- UAT / human verification: visual inspection of Settings page, README, docs site, GitHub Releases

## Milestone Definition of Done

This milestone is complete only when all are true:

- Settings page redesign is complete and visually verified
- All screenshots in the repo reflect the current Deep Moss UI
- Changelog v3.3.0 entry is complete and accurate
- README and docs site text is up to date
- v3.3.0 tag pushed, CI green, Docker and Deb artifacts published
- GitHub Pages deploys with updated screenshots and content

## Slices

- [x] **S01: Settings page Triggarr-style redesign** `risk:medium` `depends:[]`
  > After this: Settings page uses card sections with labels-above-inputs, no accordion, compact grid layout matching Triggarr's settings pattern; all existing settings save correctly
- [x] **S02: Dashboard multi-select bar consolidation** `risk:low` `depends:[S01]`
  > After this: Selection banner and bulk actions bar are merged into a single unified bar showing selected count, Clear button, and action buttons in one row; consistent background tint
- [ ] **S03: Screenshots & documentation update** `risk:low` `depends:[S02]`
  > After this: README, docs/index.md, and changelog show current UI screenshots (dashboard + settings) and accurate text; all image references resolve
- [ ] **S04: Tag v3.3.0 release** `risk:low` `depends:[S03]`
  > After this: v3.3.0 is tagged, CI publishes Docker :latest + Deb packages to ghcr.io and GitHub Releases, GitHub Pages redeploys with updated docs

## Boundary Map

### S01 → S02

Produces:
- Redesigned Settings page SCSS and HTML on master, CI green
- All setting sections visible without accordion (Server, Connections, AutoQueue, Archive Extraction, *arr Integration, File Discovery, Other Settings, Security, Auto-Delete)

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- Single unified multi-select bar replacing separate selection-banner and bulk-actions-bar components
- Consistent selection UI styling on dashboard

Consumes:
- nothing (independent of S01, just ordered after for clean screenshots)

### S03 → S04

Produces:
- Updated screenshots in `src/python/docs/images/` (dashboard.png, settings.png)
- Updated `README.md`, `src/python/docs/index.md`, `src/python/docs/changelog.md`
- All changes committed to master, CI green

Consumes:
- Settings redesign from S01, multi-select fix from S02 (for accurate screenshot capture)
