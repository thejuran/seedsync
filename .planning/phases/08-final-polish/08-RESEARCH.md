# Phase 8: Final Polish - Research

**Researched:** 2026-02-04
**Domain:** Validation, Visual QA, Responsive Testing, CSS Cleanup
**Confidence:** HIGH

## Summary

Phase 8 is a verification and cleanup phase following the dropdown migration (Phase 6) and form input standardization (Phase 7). Research confirms that this phase requires no new libraries or patterns - it uses existing project infrastructure.

The phase involves four requirements:
1. **POLISH-01**: E2E test suite passes - Uses existing Playwright infrastructure
2. **POLISH-02**: Visual QA walkthrough - Manual browser testing with devtools
3. **POLISH-03**: Responsive breakpoints tested - Browser devtools responsive mode
4. **POLISH-04**: Unused CSS/SCSS removed - Manual code review and grep-based detection

**Primary recommendation:** Structure the phase as a checklist-driven verification workflow with specific pages and states to validate, using browser devtools for visual QA and responsive testing.

## Standard Stack

The established tools for this domain are already in the project:

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Playwright | ^1.48.0 | E2E test framework | Already configured in src/e2e/ |
| Browser DevTools | N/A | Visual QA, responsive testing | Industry standard, zero setup |
| grep/ripgrep | N/A | Unused code detection | Fast, built-in |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| Angular CLI | Build verification | After cleanup to verify compilation |
| Karma/Jasmine | Unit tests | Verify no component breakage |
| ESLint | Code quality | After cleanup to check for issues |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual visual QA | Percy/Chromatic visual testing | Overkill for one-time verification; project doesn't have baseline screenshots |
| grep for unused CSS | PurgeCSS, ngx-unused-css | Complex setup for small codebase; false positives with dynamic classes |
| Manual responsive | Playwright viewport testing | Good for regression; manual better for subjective "does it look right" |

**Installation:**
No new installations needed. All tools already configured.

## Architecture Patterns

### Verification Phase Structure

A validation phase differs from feature phases:
- No new code produced (except removing unused code)
- Success measured by passing checks, not new functionality
- Primarily checklist-driven

### Recommended Task Structure
```
tasks/
  task-1-e2e-tests/       # Run full test suite, fix failures
  task-2-visual-qa/       # Manual walkthrough with checklist
  task-3-responsive/      # Viewport testing with devtools
  task-4-cleanup/         # Remove unused SCSS
  task-5-final-verify/    # Re-run all tests after cleanup
```

### Visual QA Pattern

**Desktop Testing Workflow:**
1. Start Angular dev server (`ng serve`)
2. Open browser devtools
3. Work through page checklist systematically
4. Test interactive states: hover, focus, click, open/close
5. Document any issues found

**Responsive Testing Workflow:**
1. Open browser devtools responsive mode
2. Set viewport to tablet width (768px typical)
3. Check each page for:
   - Content fits without horizontal scroll
   - Buttons/links tappable (44x44px minimum)
   - Text readable
   - No overlapping elements

### SCSS Cleanup Pattern

**Detection Approach (Conservative):**
1. Search for SCSS patterns that were replaced by Bootstrap
2. Verify patterns are not referenced anywhere
3. Remove dead code
4. Build to verify compilation

**What to Look For:**
- Placeholder patterns (`%placeholder`) not extended anywhere
- CSS variables defined but never used
- Entire SCSS files with no imports
- Styles for elements that no longer exist in templates

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Unused CSS detection | Custom script | grep + manual review | False positives from dynamic classes; Angular's ViewEncapsulation makes automated tools unreliable |
| Visual regression | Screenshot comparison | Manual walkthrough | No baseline exists; setting up Percy for one-time validation is overkill |
| Responsive simulation | Custom viewport code | Browser devtools | Built-in, accurate, zero setup |

**Key insight:** For a one-time validation phase, manual processes with clear checklists are more efficient than building automated infrastructure that won't be reused.

## Common Pitfalls

### Pitfall 1: Removing CSS Used by Dynamic Classes
**What goes wrong:** Delete SCSS for `.active` class, but Angular adds it dynamically via `[class.active]="condition"`
**Why it happens:** grep doesn't find class when it's part of Angular binding syntax
**How to avoid:** Search for partial class names, check template bindings like `[class.name]` and `[ngClass]`
**Warning signs:** Build succeeds but runtime styling breaks

### Pitfall 2: Skipping Interactive State Testing
**What goes wrong:** Button looks fine at rest but hover/focus states are wrong or missing
**Why it happens:** Visual QA focused on static appearance, not interactions
**How to avoid:** Explicitly test hover, focus, active, disabled states for each interactive element
**Warning signs:** User reports "something feels off" about buttons/inputs

### Pitfall 3: Testing Only at Default Viewport
**What goes wrong:** UI breaks at tablet widths, unreported
**Why it happens:** Visual QA done at developer's monitor size
**How to avoid:** Explicitly test at defined breakpoints (desktop 1200px+, tablet 768-1199px)
**Warning signs:** Layout issues on different screen sizes

### Pitfall 4: Cleanup Breaks SCSS Compilation
**What goes wrong:** Remove variable/mixin, breaks import chain in another file
**Why it happens:** SCSS imports create dependency chains not visible via simple grep
**How to avoid:** Build after each removal, keep deletions atomic
**Warning signs:** SCSS compilation errors after deletion

### Pitfall 5: E2E Tests Fail Due to Environment, Not Code
**What goes wrong:** Tests fail in one environment but pass in another
**Why it happens:** E2E tests depend on running application with specific data
**How to avoid:** Run tests in same Docker environment as CI (`make run-tests-e2e`)
**Warning signs:** Tests pass locally but fail in CI, or vice versa

## Code Examples

Verified patterns for this phase:

### Running E2E Tests (Docker)
```bash
# From project root - uses same environment as CI
make run-tests-e2e STAGING_VERSION=latest SEEDSYNC_ARCH=amd64
```
Source: Project Makefile

### Running E2E Tests (Local)
```bash
# Requires running application at baseURL
cd src/e2e
npm test
```
Source: src/e2e/package.json

### Running Angular Unit Tests
```bash
cd src/angular
npm test -- --watch=false
```
Source: src/angular/package.json

### Searching for Unused SCSS Patterns
```bash
# Find all %placeholder definitions
grep -rn "^%" src/angular/src/app --include="*.scss"

# Find all @extend usages
grep -rn "@extend" src/angular/src/app --include="*.scss"

# Find CSS variable definitions
grep -rn "\-\-.*:" src/angular/src/app --include="*.scss"

# Find CSS variable usages
grep -rn "var(--" src/angular/src/app --include="*.scss"
```

### Playwright Viewport Configuration
```typescript
// For responsive testing in Playwright config
test.use({
  viewport: { width: 768, height: 1024 },
});

// Or dynamically in test
await page.setViewportSize({ width: 768, height: 1024 });
```
Source: [Playwright Emulation Documentation](https://playwright.dev/docs/emulation)

### Browser DevTools Responsive Mode
1. Open DevTools (F12 or Cmd+Option+I)
2. Click device toolbar icon (or Cmd+Shift+M)
3. Select "Responsive" and set custom width
4. Common widths: 768px (tablet), 1024px (small desktop), 1440px (desktop)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual E2E with Selenium | Playwright | 2020+ | Faster, more reliable, better DX |
| CSS purge tools | Build-time tree shaking | Angular CLI default | Automatic dead code elimination for production |
| Pixel-perfect comparisons | "Better than before" standard | Per user decision | Faster validation, less brittle |

**Deprecated/outdated:**
- ngx-unused-css: Works but has limitations with Angular ViewEncapsulation and dynamic classes
- PurgeCSS direct on SCSS: Must transpile first; Angular's build already handles this for production

## Open Questions

Things that couldn't be fully resolved:

1. **Exact breakpoint widths to test**
   - What we know: Project uses $medium-min-width: 601px and $large-min-width: 993px
   - What's unclear: Whether 768px or 601px is the "tablet" breakpoint for testing
   - Recommendation: Test at 768px (common tablet) AND 601px (project's medium breakpoint)

2. **E2E test baseline count**
   - What we know: Unit tests should be 387 (from STATE.md)
   - What's unclear: Exact expected E2E test count
   - Recommendation: Document current passing count before cleanup as baseline

## Visual QA Checklist

Based on CONTEXT.md decisions and existing planning docs:

### Files Page (Deep Dive Priority)
**Desktop States:**
- [ ] File list header visible and styled
- [ ] File rows alternate background (striped)
- [ ] File hover shows light teal background
- [ ] File selection shows solid teal background
- [ ] Checkbox selection shows partial teal
- [ ] Filter dropdown opens below button
- [ ] Filter dropdown has dark theme (blue background)
- [ ] Sort dropdown opens and positions correctly
- [ ] Dropdown items highlight on hover (100ms transition)
- [ ] Dropdown menu fades in (150ms transition)
- [ ] Dropdown closes on outside click
- [ ] Dropdown closes on scroll
- [ ] Search input has visible border on dark background
- [ ] Search input shows teal focus ring
- [ ] File actions bar appears for selected file
- [ ] Bulk actions bar appears for checkbox selection
- [ ] Selection banner shows correct count

**Tablet Width (768px):**
- [ ] All content fits without horizontal scroll
- [ ] Dropdowns functional and positioned correctly
- [ ] File list readable
- [ ] Action buttons tappable size

### Settings Page (Quick Scan)
- [ ] Text inputs have visible borders
- [ ] Text inputs show teal focus ring
- [ ] Checkboxes show teal when checked
- [ ] Disabled inputs are visually distinct (65% opacity)
- [ ] Save/Cancel buttons styled consistently

### AutoQueue Page (Quick Scan)
- [ ] Pattern list readable
- [ ] Add pattern input styled consistently
- [ ] Enable/disable toggle works

### Logs Page (Quick Scan)
- [ ] Log entries styled correctly
- [ ] Warning/error levels have appropriate background colors

### About Page (Quick Scan)
- [ ] Version displays
- [ ] Links styled and functional

## Sources

### Primary (HIGH confidence)
- Project codebase analysis (SCSS files, test infrastructure)
- `.planning/ROADMAP.md` - Phase 8 requirements
- `.planning/REQUIREMENTS.md` - POLISH-01 through POLISH-04
- `planning docs/UNIFY_UI_STYLING.md` - Visual QA checklist template

### Secondary (MEDIUM confidence)
- [Playwright Emulation Documentation](https://playwright.dev/docs/emulation) - Viewport configuration
- [Playwright Best Practices](https://playwright.dev/docs/best-practices) - Testing patterns
- [BrowserStack UI Testing Checklist](https://www.browserstack.com/guide/ui-testing-checklist) - Interactive state testing
- [Katalon UI Testing Checklist](https://katalon.com/resources-center/blog/ui-testing-checklist) - Visual QA methodology

### Tertiary (LOW confidence)
- [ngx-unused-css](https://github.com/ivanblazevic/ngx-unused-css) - Angular CSS detection tool (not recommended for this project)
- [PurgeCSS Guide](https://blog.logrocket.com/removing-unused-css-code-with-purgecss/) - CSS purge methodology (Angular CLI handles this)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new tools needed, all existing
- Architecture: HIGH - Verification workflow is straightforward
- Pitfalls: HIGH - Based on project-specific context
- Visual QA checklist: HIGH - Based on user decisions in CONTEXT.md

**Research date:** 2026-02-04
**Valid until:** N/A (one-time verification phase)
