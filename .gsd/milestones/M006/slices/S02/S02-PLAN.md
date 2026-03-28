# S02: Deep Code Review + Fixes

**Goal:** Fix all issues found in the S01 code review
**Demo:** All unit tests and E2E tests pass, no dead code, consistent variable naming

## Must-Haves

- E2E page object selectors updated for new flat-row HTML structure
- Dead code removed from file.component.ts
- Stale variable/class names renamed
- Hardcoded colors replaced with CSS variables
- Dead CSS custom properties removed

## Proof Level

- This slice proves: integration
- Real runtime required: yes (E2E tests)
- Human/UAT required: no

## Verification

- `cd src/angular && npx ng test --no-watch --browsers=ChromeHeadless` — 400/400 pass
- `cd src/angular && npx ng build` succeeds
- No dead code references in file.component.ts

## Findings

1. **CRITICAL: E2E selectors broken** — `dashboard.page.ts` uses `.name .text .title`, `.content .status span.text`, `.size .size_info` which don't exist in new HTML
2. **Dead code: `statusDotClass` getter** — no longer referenced in template
3. **Dead code: `getAsciiBar()` and `BAR_WIDTH`** — not referenced in template
4. **Stale naming: `$earthy-border` / `.earthy-toast`** — should be `$moss-border` / `.moss-toast`
5. **Hardcoded colors** — `#e0e8d6`, `#222a20` in component SCSS should use CSS vars
6. **Dead CSS vars** — `--app-file-header-bg`, `--app-file-header-color` no longer referenced
7. **Data display: `localCreatedTimestamp`** — dropped from display, verify intentional
8. **E2E status golden data** — status text changed from empty string to "Default" for default state files

## Tasks

- [ ] **T01: Fix E2E page object selectors** `est:20m`
  - Why: E2E tests will fail with the new HTML structure
  - Files: `src/e2e/tests/dashboard.page.ts`
  - Do: Update `.name .text .title` → `.name`, `.content .status span.text` → `.status-badge`, `.size .size_info` → `.size`. Update status extraction logic for badge text. Update golden data if "Default" badge changes status text.
  - Verify: E2E tests pass
  - Done when: All E2E selectors match new HTML structure

- [ ] **T02: Remove dead code from file.component.ts** `est:10m`
  - Why: Clean up unused methods left from old layout
  - Files: `src/angular/src/app/pages/files/file.component.ts`
  - Do: Remove `statusDotClass` getter, `getAsciiBar()` method, `BAR_WIDTH` constant
  - Verify: `ng build` succeeds, unit tests pass
  - Done when: No unused methods in file.component.ts

- [ ] **T03: Rename stale variables and fix hardcoded colors** `est:15m`
  - Why: Maintainability — names should match the palette, colors should use vars
  - Files: `_bootstrap-variables.scss`, `_bootstrap-overrides.scss`, `_common.scss`, `styles.scss`, `app.component.scss`, `file-options.component.scss`, `logs-page.component.scss`
  - Do: Rename `$earthy-border` → `$moss-border`, `.earthy-toast` → `.moss-toast`. Replace hardcoded `#e0e8d6` with `var(--bs-body-color)` or `var(--app-selection-text-emphasis)`. Replace `#222a20` with `var(--app-header-bg)`. Remove dead CSS vars `--app-file-header-bg` and `--app-file-header-color`.
  - Verify: `ng build` succeeds
  - Done when: No stale earthy naming, no hardcoded palette colors in component SCSS

## Files Likely Touched

- `src/e2e/tests/dashboard.page.ts`
- `src/angular/src/app/pages/files/file.component.ts`
- `src/angular/src/app/common/_bootstrap-variables.scss`
- `src/angular/src/app/common/_bootstrap-overrides.scss`
- `src/angular/src/app/common/_common.scss`
- `src/angular/src/styles.scss`
- `src/angular/src/app/pages/main/app.component.scss`
- `src/angular/src/app/pages/files/file-options.component.scss`
- `src/angular/src/app/pages/logs/logs-page.component.scss`
