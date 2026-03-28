# M005: Dashboard Polish & v3.3.0 Release — Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

## Project Description

SeedSync web UI dashboard has visual quality issues — column headers don't align with file row data, font sizes are inconsistent across elements, and the overall typographic scale feels off. After fixing these, cut the v3.3.0 release.

## Why This Milestone

The M003 UI redesign established the earthy palette and layout, but the dashboard file list has alignment/proportion issues that make it look unpolished. This is the last step before a proper tagged release.

## User-Visible Outcome

### When this milestone is complete, the user can:

- See a dashboard with properly aligned column headers and consistent font sizing
- Install v3.3.0 from Docker Hub or Deb packages

### Entry point / environment

- Entry point: http://localhost:8800/dashboard
- Environment: browser (all pages, responsive)
- Live dependencies involved: none (CSS/layout only for S01, release tooling for S02)

## Completion Class

- Contract complete means: Angular unit tests pass, lint clean, visual inspection confirms alignment
- Integration complete means: full CI pipeline green (unit, E2E, builds, publish)
- Operational complete means: v3.3.0 tag pushed, Docker image and Deb packages published

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- Dashboard file list headers align with row data at all responsive breakpoints
- v3.3.0 tagged, CI green, artifacts published to ghcr.io and GitHub Releases

## Risks and Unknowns

- Column widths are split across file-list.component.scss (headers) and file.component.scss (rows) — changes must stay in sync
- E2E tests check file list structure — layout changes could break assertions

## Existing Codebase / Prior Art

- `src/angular/src/app/pages/files/file-list.component.scss` — header column widths and styles
- `src/angular/src/app/pages/files/file.component.scss` — row content column widths, font sizes
- `src/angular/src/styles.scss` — global font-size (15px), CSS custom properties
- `src/angular/src/app/common/_bootstrap-variables.scss` — font family, theme colors

## Scope

### In Scope

- Fix column header/row alignment on dashboard
- Normalize font scale across dashboard elements
- Tag v3.3.0, push, verify CI publishes artifacts

### Out of Scope / Non-Goals

- New features
- Redesigning other pages (Settings, Logs, About)
- Migrating from Karma to Vitest
- Removing jQuery

## Technical Constraints

- Must keep header widths in sync with row widths (documented in scss comments)
- Must not break E2E bulk-actions or dashboard tests
