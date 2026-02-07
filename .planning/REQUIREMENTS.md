# Requirements: v1.4 Sass @use Migration

## Must Have

- **REQ-01**: Transform `_common.scss` from `@import` to `@forward` aggregation module
- **REQ-02**: Transform `_bootstrap-overrides.scss` from `@import` to `@use` with namespaces
- **REQ-03**: Update `styles.scss` to use `@use` for application modules (keep `@import` for Bootstrap)
- **REQ-04**: Zero deprecation warnings from application SCSS code
- **REQ-05**: All 381 Angular unit tests continue passing
- **REQ-06**: Zero visual regressions (identical compiled CSS output)
- **REQ-07**: All 16 component files continue working with modernized `_common.scss`

## Should Have

- **REQ-08**: Document hybrid approach decision (Bootstrap stays on @import)
- **REQ-09**: Validate sass-migrator compatibility (dry-run on component files)

## Out of Scope

- Migrating Bootstrap to @use (blocked until Bootstrap 6)
- Migrating Font Awesome to @use (legacy package, not modular)
- Explicit namespaces in component files (keep `as *` for minimal changes)
- Adding new SCSS features or refactoring beyond @import → @use

## Constraints

- Bootstrap 5.3 must remain on `@import` (uses @import internally)
- `@forward` must appear before all other rules in any file
- Never mix `@use` and `@import` for the same module in a single file
- Variable override timing must be preserved (overrides before Bootstrap variables)

## Success Criteria

1. `ng build` completes with zero application SCSS deprecation warnings
2. Bootstrap deprecation warnings accepted as external dependency noise
3. All unit tests pass (`ng test`)
4. Visual comparison shows identical rendering at desktop and tablet widths

---
*Created: 2026-02-07*
*Milestone: v1.4 Sass @use Migration*
