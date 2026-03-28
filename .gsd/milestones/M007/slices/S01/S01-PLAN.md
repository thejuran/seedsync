# S01: Settings Page Triggarr-Style Redesign

**Goal:** Replace the Bootstrap accordion layout on the Settings page with flat card sections (always-open, no collapse), labels-above-inputs, compact spacing — matching Triggarr's settings pattern.
**Demo:** Settings page shows all sections as visible cards with clean headings, labels above inputs, no accordion collapse behavior. All settings save correctly. CI green.

## Must-Haves

- All accordion collapse behavior removed — every section always visible
- Card sections with clean heading text (no clickable collapse buttons)
- Labels above inputs (not inline) for text/password fields
- *arr Integration section preserves enable/disable fieldset, test connection, webhook URLs
- Security section preserves API token display and copy
- Restart button remains at bottom
- Two-column layout on desktop preserved, single column on mobile
- All existing settings save correctly (no data binding changes)
- `ng build` clean, Angular unit tests pass, E2E settings test passes

## Proof Level

- This slice proves: contract (build + unit tests + E2E)
- Real runtime required: no (CI covers it)
- Human/UAT required: no (deferred to milestone completion)

## Verification

- `cd src/angular && node_modules/@angular/cli/bin/ng build` — clean build, no errors
- `cd src/angular && node_modules/@angular/cli/bin/ng test --watch=false` — all unit tests pass
- Visual: settings page renders all sections as flat cards without accordion

## Observability / Diagnostics

- Runtime signals: none (pure UI change)
- Inspection surfaces: browser dev tools, `ng serve` at localhost:4200
- Failure visibility: Angular build errors, test failures
- Redaction constraints: none

## Integration Closure

- Upstream surfaces consumed: `options-list.ts` (unchanged), `option.component` (minor label layout tweak), `ConfigService` (unchanged)
- New wiring introduced in this slice: none — same data flow, new layout
- What remains before the milestone is truly usable end-to-end: S02 (screenshots/docs), S03 (release tag)

## Tasks

- [x] **T01: Remove accordion, flatten to always-visible card sections** `est:45m`
  - Why: The accordion collapse is the core layout pattern being replaced. Every section needs to be always-visible.
  - Files: `settings-page.component.html`, `settings-page.component.scss`
  - Do:
    - Remove `data-bs-toggle="collapse"`, `data-bs-target`, `data-bs-parent="#accordion"` attributes
    - Remove `.collapse` wrapper divs — card-body content is always visible
    - Replace clickable `<button>` headers with plain `<h3>` text headings
    - Remove `#accordion` wrapper ID (no longer needed for Bootstrap JS)
    - Keep `#left` / `#right` column structure
    - Update SCSS: remove accordion-specific styles, add clean card heading styles
  - Verify: `ng build` clean, page renders all sections expanded
  - Done when: No accordion collapse behavior exists, all sections visible on load

- [x] **T02: Labels-above-inputs layout for option.component** `est:30m`
  - Why: Triggarr uses labels above inputs, not inline. The `option.component` currently uses flex-row for label+input.
  - Files: `option.component.html`, `option.component.scss`
  - Do:
    - Change text/password `<label>` from `flex-direction: row` to `column` layout
    - Label `.name` sits above the `<input>`, description below
    - Checkbox layout stays as-is (checkbox + label inline is correct)
    - Add compact vertical spacing between fields
  - Verify: `ng build` clean, text inputs show label above, checkboxes stay inline
  - Done when: All text/password fields show label above input, checkboxes unchanged

- [x] **T03: Clean up settings SCSS and verify full build** `est:20m`
  - Why: Final polish — tighten spacing, ensure responsive layout works, verify no dead CSS
  - Files: `settings-page.component.scss`, `option.component.scss`
  - Do:
    - Tighten card padding and margins for compact Triggarr-style density
    - Verify two-column desktop / single-column mobile responsive breakpoints
    - Remove any dead SCSS from accordion removal
    - Ensure *arr Integration subsection headers, test connection buttons, webhook URLs, and Security token section all render cleanly
  - Verify: `ng build` clean, `ng test --watch=false` passes, responsive layout works at both breakpoints
  - Done when: Build clean, all tests pass, settings page visually matches Triggarr card pattern

## Files Likely Touched

- `src/angular/src/app/pages/settings/settings-page.component.html`
- `src/angular/src/app/pages/settings/settings-page.component.scss`
- `src/angular/src/app/pages/settings/option.component.html`
- `src/angular/src/app/pages/settings/option.component.scss`
