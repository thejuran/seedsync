# S01: Color Palette Swap + Flat File List

**Goal:** Redesign SeedSync to match Triggarr's dark slate aesthetic with flat list rows
**Demo:** Dashboard shows flat single-line file rows on a dark navy/slate background matching Triggarr

## Must-Haves

- Triggarr color palette: bg #0f172a, card #1e293b, border #334155, text #e2e8f0, muted #94a3b8
- File list as flat rows: [status badge] [filename] ... [speed/size] [timestamp]
- No table column headers — inline flat list like Triggarr's search history
- Compact row height (~40px instead of 82px)
- Filter bar and nav colors updated to slate palette
- All existing functionality preserved

## Proof Level

- This slice proves: integration
- Real runtime required: yes (visual verification)
- Human/UAT required: yes

## Verification

- `cd src/angular && npx ng test --no-watch --browsers=ChromeHeadless` passes
- `cd src/angular && npx ng build` succeeds
- Visual inspection confirms Triggarr-like appearance

## Tasks

- [x] **T01: Swap color palette + redesign file list + update all pages** `est:1h`
  - Why: All three changes were tightly coupled — palette, layout, and page consistency done together
  - Files: `styles.scss`, `_bootstrap-variables.scss`, `_bootstrap-overrides.scss`, `_common.scss`, `file-list.component.html/scss`, `file.component.html/scss`, `file-options.component.scss`, `app.component.scss`, `logs-page.component.scss`, `index.html`
  - Do: Deep Moss palette (#151a14 bg, #222a20 card, #c49a4a amber, #9aaa8a sage, #e0e8d6 cream). Flat row layout with status badge pills. Card containers for filter bar and file list. All pages updated.
  - Verify: 400/400 unit tests pass, `ng build` succeeds, visual inspection on dashboard/settings/about
  - Done when: All pages use Deep Moss palette with proper contrast, file list matches Triggarr layout

## Files Likely Touched

- `src/angular/src/styles.scss`
- `src/angular/src/app/common/_bootstrap-variables.scss`
- `src/angular/src/app/common/_bootstrap-overrides.scss`
- `src/angular/src/app/common/_common.scss`
- `src/angular/src/app/pages/files/file-list.component.html`
- `src/angular/src/app/pages/files/file-list.component.scss`
- `src/angular/src/app/pages/files/file.component.html`
- `src/angular/src/app/pages/files/file.component.scss`
- `src/angular/src/app/pages/files/file-options.component.scss`
- `src/angular/src/app/pages/main/app.component.scss`
- `src/angular/src/app/pages/settings/settings-page.component.scss`
- `src/angular/src/app/pages/logs/logs-page.component.scss`
- `src/angular/src/app/pages/about/about-page.component.scss`
- `src/angular/src/app/pages/autoqueue/autoqueue-page.component.scss`
