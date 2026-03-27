# S02: API Token in Settings

**Goal:** Display the API token in a read-only copyable field on the Settings page for authenticated sessions.
**Demo:** Settings page shows a "Security" card with the API token in a code block that can be copied with a button click.

## Must-Haves

- API token displayed in Settings page in a read-only field
- Copy-to-clipboard button
- Token only shown when one is configured (hide section if empty)
- No backend changes needed (token already in `<meta>` tag)

## Proof Level

- This slice proves: contract + integration
- Real runtime required: yes (browser verification ideal, but build + unit test sufficient for contract)
- Human/UAT required: yes (visual check)

## Verification

- `cd src/angular && npx ng build` exits 0
- `cd src/angular && npx ng test --watch=false --browsers=ChromeHeadless` exits 0

## Observability / Diagnostics

- Runtime signals: none
- Inspection surfaces: Settings page in browser
- Failure visibility: none
- Redaction constraints: Token is already client-side in meta tag; no new exposure

## Integration Closure

- Upstream surfaces consumed: `<meta name="api-token">` injected by Bottle server
- New wiring introduced in this slice: Settings page reads token from DOM meta tag
- What remains before the milestone is truly usable end-to-end: S03 (toasts), S04 (code review)

## Tasks

- [ ] **T01: Add token display to Settings page** `est:30m`
  - Why: R017 requires token to be visible and copyable in Settings UI
  - Files: `settings-page.component.ts`, `settings-page.component.html`, `settings-page.component.scss`
  - Do: Add a getApiToken() method that reads from meta tag. Add a "Security" card section with read-only code display and copy button. Hide section when no token configured. Add copyToken() method using navigator.clipboard.
  - Verify: `ng build` succeeds, `ng test --watch=false` passes
  - Done when: Build passes and Settings page has token display section

## Files Likely Touched

- `src/angular/src/app/pages/settings/settings-page.component.ts`
- `src/angular/src/app/pages/settings/settings-page.component.html`
- `src/angular/src/app/pages/settings/settings-page.component.scss`
