# S03: Toast Notification Restyle

**Goal:** Restyle toast notifications to use earthy palette colors matching the rest of the UI instead of default Bootstrap solid backgrounds.
**Demo:** Toast notifications appear with dark earthy backgrounds, muted borders, and text colors matching the palette.

## Must-Haves

- Toasts use dark background with earthy-colored left accent border per type
- Text is readable (light colors on dark background)
- Dismiss button styled consistently
- All four types (success, info, warning, danger) visually distinct

## Proof Level

- This slice proves: contract
- Real runtime required: no
- Human/UAT required: yes (visual check ideal)

## Verification

- `cd src/angular && npx ng build` exits 0
- `cd src/angular && npx ng test --watch=false --browsers=ChromeHeadless` exits 0

## Tasks

- [ ] **T01: Restyle toast notifications** `est:20m`
  - Why: R040 — toasts should match earthy palette
  - Files: `app.component.html`, `app.component.scss`
  - Do: Replace Bootstrap bg-* classes with custom earthy toast styles. Use dark background with colored left border accent per type. Style close button for dark bg.
  - Verify: `ng build` succeeds, tests pass
  - Done when: Build passes, toast HTML uses earthy styles

## Files Likely Touched

- `src/angular/src/app/pages/main/app.component.html`
- `src/angular/src/app/pages/main/app.component.scss`
