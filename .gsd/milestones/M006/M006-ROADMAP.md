# M006: Triggarr-Style Layout + Deep Moss Palette Fix

**Vision:** Fix SeedSync's readability issues with a refined "Deep Moss + Amber" earthy palette that has proper contrast ratios, and redesign the file list to match Triggarr's flat-row layout structure. SeedSync keeps its own earthy identity while matching Triggarr's clean structural design.

## Success Criteria

- All text passes WCAG AA contrast (4.5:1 minimum for normal text)
- Brand text "SeedSync" is clearly readable on the nav bar
- File list uses flat single-line rows instead of table columns
- Color palette is cohesive Deep Moss + Amber: dark forest bg, warm cream text, amber accent
- All Angular unit tests pass, lint clean
- Code review findings addressed
- UAT passed on `:dev` Docker image

## Key Risks / Unknowns

- E2E test selectors may depend on table column structure

## Verification Classes

- Contract verification: Angular unit tests pass, lint clean
- Integration verification: `ng build` succeeds, E2E tests pass
- Operational verification: `:dev` Docker image builds and runs
- UAT / human verification: visual inspection on live `:dev` image

## Milestone Definition of Done

- Palette fully updated with proper contrast ratios
- File list renders as flat rows matching Triggarr's structure
- Deep code review completed and all findings fixed
- All tests pass (unit + E2E), build clean
- `:dev` image published, UAT passed against running container
- Visual verification confirms readability and design quality

## Slices

- [x] **S01: Deep Moss palette + flat file list** `risk:low` `depends:[]`
  > After this: SeedSync has readable earthy colors and Triggarr-style flat row layout
- [x] **S02: Deep code review + fixes** `risk:medium` `depends:[S01]`
  > After this: All code review findings resolved — clean, consistent, no regressions
- [ ] **S03: Dev release + UAT** `risk:low` `depends:[S02]`
  > After this: `:dev` image published, UAT passed on live container

## Boundary Map

### S01 → S02

Produces:
- Updated palette + layout CSS/HTML on feature branch, unit tests passing

Consumes:
- nothing (first slice)

### S02 → S03

Produces:
- Review-clean code merged to master, all tests passing (unit + E2E)

Consumes:
- S01 palette + layout changes

### S03

Produces:
- `:dev` Docker image on ghcr.io, UAT sign-off

Consumes:
- S02 review-clean master branch
