# Phase 30: SCSS Audit & Color Fixes - Research

**Researched:** 2026-02-11
**Domain:** Bootstrap 5.3 dark mode theming, SCSS color migration to CSS custom properties
**Confidence:** HIGH

## Summary

Phase 30 addresses hardcoded colors in SCSS files that don't adapt to light/dark themes established in Phase 29. The codebase uses Bootstrap 5.3's native dark mode system (`data-bs-theme` attribute on `documentElement`) with a ThemeService managing theme state. However, many component SCSS files contain hardcoded hex colors and named colors (black, white, red, darkgray) that remain static regardless of theme.

Bootstrap 5.3 provides extensive CSS custom properties (80+ variables prefixed with `--bs-`) that automatically update when `data-bs-theme` changes. The migration strategy is straightforward: replace hardcoded values with appropriate Bootstrap CSS variables, or create custom CSS variables when Bootstrap doesn't provide suitable options.

**Primary recommendation:** Audit all SCSS files for hardcoded colors, replace with Bootstrap CSS variables where available (--bs-body-color, --bs-body-bg, --bs-border-color), create custom theme-aware CSS variables for app-specific colors (teal accents, logo colors), verify WCAG AA contrast ratios (4.5:1 text, 3:1 UI), and remove hardcoded `data-bs-theme="dark"` attributes from dropdowns.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bootstrap | 5.3.3 | CSS framework with native dark mode | Industry standard, data-bs-theme attribute system, 80+ CSS variables |
| Sass | 1.32.0 | SCSS compilation | Already in use, supports @use modules |
| Angular | 19.2.18 | Frontend framework | Current project stack |

### Supporting Tools
| Tool | Purpose | When to Use |
|------|---------|-------------|
| WebAIM Contrast Checker | Manual WCAG verification | Verify teal accent colors meet 4.5:1 for text, 3:1 for UI |
| color-contrast-checker (npm) | Programmatic contrast testing | Optional automated testing in unit tests |
| Browser DevTools | Inspect computed CSS variables | Debug theme-aware color resolution |

**Installation:**
No new dependencies required - all tools already in package.json or available as free web services.

## Architecture Patterns

### Bootstrap 5.3 CSS Variables System

Bootstrap provides three tiers of CSS variables:

**Tier 1: Root-level theme colors** (defined in `:root` and `[data-bs-theme="dark"]`)
```scss
// Light mode (default)
:root, [data-bs-theme="light"] {
  --bs-primary: #0d6efd;
  --bs-secondary: #6c757d;
  --bs-body-color: #212529;
  --bs-body-bg: #fff;
  --bs-border-color: #dee2e6;
}

// Dark mode
[data-bs-theme="dark"] {
  --bs-body-color: #dee2e6;
  --bs-body-bg: #212529;
  --bs-border-color: #495057;
}
```

**Tier 2: Semantic color variants** (automatically generated from theme colors)
```scss
// Each theme color gets 3 variants for both light and dark modes
--bs-primary-text-emphasis
--bs-primary-bg-subtle
--bs-primary-border-subtle
```

**Tier 3: Component-local variables** (scoped to specific Bootstrap components)
```scss
.dropdown-menu {
  --bs-dropdown-bg: ...;
  --bs-dropdown-link-color: ...;
  --bs-dropdown-link-hover-bg: ...;
}
```

### Recommended Migration Pattern

**Pattern 1: Direct Bootstrap Variable Usage**
```scss
// ❌ BEFORE (hardcoded, doesn't adapt)
.element {
  color: black;
  background-color: #f5f5f5;
  border-color: #ddd;
}

// ✅ AFTER (theme-aware)
.element {
  color: var(--bs-body-color);
  background-color: var(--bs-body-bg);
  border-color: var(--bs-border-color);
}
```

**Pattern 2: Custom CSS Variables for App-Specific Colors**
```scss
// Define in styles.scss or bootstrap-overrides.scss
:root, [data-bs-theme="light"] {
  --app-logo-color: #118247;
  --app-separator-color: #999;
  --app-muted-text: #666;
}

[data-bs-theme="dark"] {
  --app-logo-color: #4ac98f; // Lighter for dark backgrounds
  --app-separator-color: #666;
  --app-muted-text: #aaa;
}

// Use in component SCSS
.logo {
  color: var(--app-logo-color);
}
```

**Pattern 3: Scoped Dark Mode Overrides** (when global variables insufficient)
```scss
// Component SCSS file
.header {
  background-color: var(--bs-gray-300);
}

[data-bs-theme="dark"] .header {
  background-color: var(--bs-gray-700);
}
```

**Pattern 4: Remove Hardcoded data-bs-theme Attributes**
```html
<!-- ❌ BEFORE (always dark, ignores global theme) -->
<div class="dropdown" data-bs-theme="dark">

<!-- ✅ AFTER (respects global theme from documentElement) -->
<div class="dropdown">
```

### Anti-Patterns to Avoid

- **Hardcoded colors in SCSS:** `color: black` doesn't adapt to theme changes
- **Component-level data-bs-theme attributes:** Overrides global theme, causes inconsistency
- **SCSS variables for runtime theme switching:** SCSS compiles to static CSS, can't react to theme changes
- **Assuming CSS variables work in SCSS functions:** `darken(var(--bs-primary), 10%)` fails at compile time - use CSS `calc()` instead
- **Using --bs-primary for everything:** Bootstrap provides semantic variables like --bs-body-color for common use cases

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dark mode color system | Custom theme variables and manual updates | Bootstrap 5.3 CSS variables | 80+ pre-defined variables, automatic light/dark variants, tested across browsers |
| Contrast ratio validation | Manual hex color comparison | WebAIM Contrast Checker + color-contrast-checker npm | WCAG standards are complex, automated tools prevent errors |
| Theme state management | Custom localStorage + DOM manipulation | ThemeService (already exists) | Phase 29 established signal-based service with FOUC prevention |
| Color naming/organization | Flat list of color variables | Three-tier system (palette, theme, component) | Maintainable, scalable, follows Bootstrap architecture |

**Key insight:** Bootstrap 5.3's CSS variable system is comprehensive and battle-tested. Extending it is safer than replacing it.

## Common Pitfalls

### Pitfall 1: SCSS Functions with CSS Variables
**What goes wrong:** `darken(var(--bs-primary), 10%)` throws SCSS compilation error
**Why it happens:** SCSS functions execute at compile time, CSS variables resolve at runtime
**How to avoid:** Use CSS `calc()` or `color-mix()`, or define dark mode values explicitly in `[data-bs-theme="dark"]` selector
**Warning signs:** Compilation errors mentioning "Expected a color" or "var() is not a color"

### Pitfall 2: Hardcoded data-bs-theme on Dropdowns
**What goes wrong:** Dropdowns stay dark in light mode (lines 12, 116 of file-options.component.html)
**Why it happens:** Component-level `data-bs-theme="dark"` overrides global theme from `documentElement`
**How to avoid:** Remove attribute, use Bootstrap CSS variables or component-scoped styles instead
**Warning signs:** UI elements that don't match global theme setting

### Pitfall 3: Black/White for Contrast Instead of Theme Variables
**What goes wrong:** Text reads well in light mode but disappears in dark mode (e.g., "color: black" on dark background)
**Why it happens:** Hardcoded `black`/`white` don't invert with themes
**How to avoid:** Use `--bs-body-color`, `--bs-body-bg`, or create custom variables that flip values
**Warning signs:** Text/borders invisible in one theme mode

### Pitfall 4: Insufficient Contrast in Teal Accent Colors
**What goes wrong:** Teal backgrounds (#79DFB6) may fail WCAG AA with certain text colors
**Why it happens:** Teal is mid-range luminance - needs darker text in light mode, lighter in dark mode
**How to avoid:** Test with WebAIM Contrast Checker, adjust teal shades per theme
**Warning signs:** Contrast ratio below 4.5:1 for normal text, 3:1 for large text or UI components

### Pitfall 5: Mixing SCSS Variables and CSS Variables
**What goes wrong:** Confusion about which variables update at runtime vs. compile time
**Why it happens:** Bootstrap 5.3 uses both systems (SCSS for compilation, CSS vars for theming)
**How to avoid:** Use SCSS variables (`$primary-color`) only for compile-time config, CSS variables (`var(--bs-primary)`) for theme-aware runtime values
**Warning signs:** Theme changes not applying, or needing to rebuild to see color changes

## Code Examples

Verified patterns from official Bootstrap 5.3 documentation:

### Example 1: Form Control Theme-Aware Styling
```scss
// Source: Bootstrap 5.3 docs + current codebase _bootstrap-overrides.scss (needs fixing)
// CURRENT (hardcoded dark mode only)
.form-control {
  background-color: #212529;
  color: #dee2e6;
  border-color: #495057;
}

// FIXED (theme-aware)
.form-control {
  // Bootstrap provides these variables automatically
  background-color: var(--bs-body-bg);
  color: var(--bs-body-color);
  border-color: var(--bs-border-color);

  &::placeholder {
    color: var(--bs-secondary-color); // Bootstrap semantic variable
  }
}
```

### Example 2: Custom Color with Light/Dark Variants
```scss
// Source: Bootstrap 5.3 color modes documentation
// Define in styles.scss or _bootstrap-overrides.scss

:root, [data-bs-theme="light"] {
  --app-header-bg: #DDDDDD;
  --app-logo-color: #118247;
  --app-muted-text: #666;
  --app-file-row-even: #F6F6F6;
  --app-file-header-bg: #f8f9fa; // Light gray
  --app-file-header-color: #212529; // Dark text
}

[data-bs-theme="dark"] {
  --app-header-bg: #343a40;
  --app-logo-color: #4ac98f; // Lighter for dark backgrounds
  --app-muted-text: #aaa;
  --app-file-row-even: #2b3035; // Slightly lighter than body bg
  --app-file-header-bg: #212529; // Dark background
  --app-file-header-color: #f8f9fa; // Light text
}
```

### Example 3: Dropdown Theming Without Hardcoded Attribute
```scss
// Source: Current codebase _bootstrap-overrides.scss (approach is correct, just needs expansion)
// Define dropdown styling that works with global theme

// For dark-style dropdowns regardless of theme (if intentional)
[data-bs-theme="dark"] .dropdown-menu {
  --bs-dropdown-bg: #337BB7; // Custom blue
  --bs-dropdown-link-hover-bg: #32AD7B; // Teal
}

// For theme-aware dropdowns (recommended)
.dropdown-menu {
  background-color: var(--bs-dropdown-bg);
  border-color: var(--bs-dropdown-border-color);

  .dropdown-item:hover {
    background-color: var(--bs-dropdown-link-hover-bg);
  }
}
```

### Example 4: Contrast-Safe Teal Implementation
```scss
// Source: WCAG AA requirements + WebAIM best practices
// Teal accent colors with guaranteed contrast

:root, [data-bs-theme="light"] {
  // Light mode: darker teal for text (on light backgrounds)
  --app-accent-teal: #32AD7B; // Darker teal
  --app-accent-teal-bg: #C5F0DE; // Light teal background
  --app-accent-teal-text: #077F4F; // Very dark teal for text
}

[data-bs-theme="dark"] {
  // Dark mode: lighter teal for visibility (on dark backgrounds)
  --app-accent-teal: #79DFB6; // Standard teal (passes 3:1 for UI)
  --app-accent-teal-bg: #1a4d3a; // Dark teal background
  --app-accent-teal-text: #C5F0DE; // Light teal for text (passes 4.5:1)
}

// Usage
.file.selected {
  background-color: var(--app-accent-teal);
  color: white; // Verify with contrast checker
}
```

### Example 5: Logs Page Color Levels
```scss
// Source: Current logs-page.component.scss (partially correct, needs completion)
// Theme-aware log level colors

.record {
  &.debug {
    color: var(--bs-secondary-color); // Semantic muted color
  }

  &.info {
    color: var(--bs-body-color); // Standard text color
  }

  &.warning {
    color: var(--bs-warning-text-emphasis);
    background-color: var(--bs-warning-bg-subtle);
    border-color: var(--bs-warning-border-subtle);
  }

  &.error {
    color: var(--bs-danger-text-emphasis);
    background-color: var(--bs-danger-bg-subtle);
    border-color: var(--bs-danger-border-subtle);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual dark mode with media queries | data-bs-theme attribute system | Bootstrap 5.3 (May 2023) | Per-component theming, easier testing, no FOUC |
| SCSS-only theming | CSS custom properties + SCSS | Bootstrap 5.0+ (2021) | Runtime theme switching without recompilation |
| Hardcoded component colors | Component-scoped CSS variables | Bootstrap 5.3 (2023) | Easier customization, maintainable overrides |
| prefers-color-scheme only | Explicit theme selection + OS preference | Modern pattern (2022+) | User control over theme independent of OS |

**Deprecated/outdated:**
- **Media query-only dark mode:** Bootstrap 5.3 uses `data-bs-theme` attribute instead of relying solely on `prefers-color-scheme`
- **$theme-colors Sass map only:** Still supported but insufficient for runtime theming - must pair with CSS variables
- **Hardcoded color values in components:** No longer necessary with Bootstrap's extensive CSS variable system
- **Custom localStorage + DOM manipulation for themes:** Angular signals + effects provide reactive, testable solution (Phase 29 established pattern)

## Open Questions

1. **Sidebar border color on selected item (sidebar.component.scss line 27)**
   - What we know: Hardcoded `#6ac19e` (lighter teal)
   - What's unclear: Intended semantic meaning (is this a distinct accent, or should match teal variables?)
   - Recommendation: Map to `--app-accent-teal-border` variable, test visibility in both themes

2. **File list header colors (file-list.component.scss lines 91-92)**
   - What we know: Hardcoded `white` text on `black` background
   - What's unclear: Is this intentional dark-only aesthetic, or should it adapt to theme?
   - Recommendation: User decision - either keep as dark accent regardless of theme, or make theme-aware with CSS variables

3. **About page link separators and muted text (about-page.component.scss lines 75, 90, 95)**
   - What we know: Multiple gray values (#999, #666) for decorative text
   - What's unclear: Semantic distinction between the shades
   - Recommendation: Consolidate to 1-2 muted text variables, verify contrast in dark mode

4. **Bulk progress overlay (file-list.component.scss line 17)**
   - What we know: `rgba(white, 0.8)` overlay
   - What's unclear: Should overlay be white in dark mode (creates bright flash)?
   - Recommendation: Use `rgba(var(--bs-body-bg-rgb), 0.8)` for theme-aware semi-transparent overlay

## Current Hardcoded Colors Inventory

Analysis of grep results identified these hardcoded colors requiring migration:

### High Priority (Visibility Issues)
| File | Line | Current Value | Issue | Recommendation |
|------|------|---------------|-------|----------------|
| file-list.component.scss | 91-92 | white/black header | Doesn't adapt to theme | `var(--app-file-header-color/bg)` |
| logs-page.component.scss | 49, 53 | darkgray, black text | Invisible in dark mode | `var(--bs-secondary-color)`, `var(--bs-body-color)` |
| about-page.component.scss | 75, 90, 95 | #999, #666 grays | Poor contrast in dark mode | `var(--bs-secondary-color)` or custom `--app-muted-text` |
| app.component.scss | 14, 25 | #f5f5f5, black | Static regardless of theme | `var(--bs-body-bg)`, `var(--bs-gray-900)` |

### Medium Priority (Functional Issues)
| File | Line | Current Value | Issue | Recommendation |
|------|------|---------------|-------|----------------|
| bootstrap-overrides.scss | 63-81 | #212529, #dee2e6, #495057 | Hardcoded dark mode only | Use Bootstrap variables or scope to `[data-bs-theme="dark"]` |
| file.component.scss | 11 | #ddd border | Doesn't adapt | `var(--bs-border-color)` |
| file-list.component.scss | 17 | rgba(white, 0.8) | Bright flash in dark mode | `rgba(var(--bs-body-bg-rgb), 0.8)` |
| sidebar.component.scss | 27 | #6ac19e border | Teal border doesn't adapt | Custom `--app-accent-teal-border` |

### Low Priority (Decorative/Semantic OK)
| File | Line | Current Value | Issue | Recommendation |
|------|------|---------------|-------|----------------|
| header.component.scss | 20, 24 | red, inherit | Semantic "delete/close" | Consider `var(--bs-danger)` for consistency |
| app.component.scss | 87 | red close button | Semantic warning color | Keep or use `var(--bs-danger)` |

### Already Using Variables (Verify Only)
- settings-page.component.scss: Uses `var(--bs-secondary)`, `var(--bs-dark)`, `var(--bs-light)` ✓
- logs-page.component.scss: Uses Bootstrap semantic variables for warning/error ✓

## Sources

### Primary (HIGH confidence)
- [Bootstrap 5.3 Color Modes Documentation](https://getbootstrap.com/docs/5.3/customize/color-modes/) - Official data-bs-theme system
- [Bootstrap 5.3 CSS Variables Documentation](https://getbootstrap.com/docs/5.3/customize/css-variables/) - Complete variable reference
- [Bootstrap 5.3.0 Release Blog](https://blog.getbootstrap.com/2023/05/30/bootstrap-5-3-0/) - Dark mode feature announcement
- Codebase files: styles.scss, _bootstrap-variables.scss, _bootstrap-overrides.scss, theme.service.ts

### Secondary (MEDIUM confidence)
- [WCAG 2.1 Contrast Requirements](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) - Official 4.5:1 text, 3:1 UI standards
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) - WCAG validation tool
- [CSS Custom Properties vs SCSS Variables - CodyHouse](https://codyhouse.co/blog/post/css-custom-properties-vs-sass-variables) - Migration best practices
- [Web Theming with SCSS & CSS Variables - Medium](https://medium.com/@lamcuongdat/web-theming-like-a-pro-scss-css-variables-for-flexible-ui-3c60b3edaa05) - Pattern guidance

### Tertiary (MEDIUM confidence - community/tutorial sources)
- [Building a Theme Switcher for Bootstrap 5.3+ - Alberto Roura](https://albertoroura.com/building-a-theme-switcher-for-bootstrap/) - Implementation patterns
- [color-contrast-checker npm package](https://www.npmjs.com/package/color-contrast-checker) - Automated testing option
- [Variable Layers: Sass vars, CSS vars, semantic theme vars](https://daverupert.com/2020/10/variable-layers/) - Architecture patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Bootstrap 5.3.3 confirmed in package.json, official docs verified
- Architecture: HIGH - Patterns documented in official Bootstrap docs, existing codebase follows conventions
- Pitfalls: HIGH - Based on grep analysis of actual codebase hardcoded colors + Bootstrap docs warnings
- Color inventory: HIGH - Direct grep results from codebase, line numbers confirmed
- Contrast requirements: HIGH - WCAG official W3C documentation

**Research date:** 2026-02-11
**Valid until:** ~60 days (Bootstrap 5.3 stable, WCAG standards stable, no major breaking changes expected before Bootstrap 6)
