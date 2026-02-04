# Phase 2: Color Variable Consolidation - Research

**Researched:** 2026-02-03
**Domain:** Bootstrap 5 SCSS theming, color variable migration
**Confidence:** HIGH

## Summary

This phase consolidates hardcoded hex colors across component SCSS files into a centralized Bootstrap-based variable system. The codebase currently has hardcoded colors in multiple locations (_common.scss, file-list.component.scss, autoqueue-page.component.scss, logs-page.component.scss, option.component.scss, and others), while Phase 1 established the Bootstrap SCSS infrastructure with a two-layer customization approach (pre-compilation variable overrides + post-compilation component overrides).

The standard approach is to leverage Bootstrap 5.3's semantic theme colors ($primary, $secondary, $success, $danger, $warning, $info) defined in _bootstrap-variables.scss, and extend the existing custom variables in _common.scss to reference Bootstrap variables. This maintains consistency with Bootstrap's design system while allowing project-specific color semantics. The migration requires systematically replacing hardcoded hex colors with either Bootstrap theme variables or custom variables that derive from Bootstrap's base colors.

Bootstrap 5.3 uses a sophisticated color system with the $theme-colors map that automatically generates utility classes, color variants (text-emphasis, bg-subtle, border-subtle), and dark mode adaptations. The critical insight is that semantic color names (danger, success) should be used for their intended purpose (errors, positive actions), while custom variables should be used for brand-specific or domain-specific colors that don't fit Bootstrap's semantic categories.

**Primary recommendation:** Migrate all hardcoded colors to Bootstrap theme variables for semantic uses (red buttons = danger, green buttons = success), and define custom variables in _bootstrap-variables.scss that reference Bootstrap's base colors for project-specific semantics.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bootstrap | 5.3.3 | CSS framework with semantic color system | Industry-standard theme color system with built-in variants |
| Sass/SCSS | Latest | CSS preprocessor | Enables variable system, functions (shade-color, tint-color), and compile-time customization |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Bootstrap Functions | 5.3.3 | Color manipulation (shade-color, tint-color) | Creating color variants from base theme colors |
| Bootstrap Variables | 5.3.3 | Default theme colors and maps | Overriding before compilation for global theme changes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bootstrap theme colors | Pure custom variables | Custom approach loses Bootstrap ecosystem integration (no automatic utility classes, dark mode, variants) |
| SCSS variables | CSS custom properties | Runtime theming flexibility vs. compile-time performance and simplicity |

**Installation:**
Already installed via Phase 1 (Bootstrap 5.3.3).

## Architecture Patterns

### Recommended Variable Organization

The codebase uses a two-layer Bootstrap customization approach established in Phase 1:

```
src/angular/src/app/common/
├── _bootstrap-variables.scss    # Pre-compilation: Override Bootstrap defaults
├── _bootstrap-overrides.scss     # Post-compilation: Component tweaks
└── _common.scss                   # Application-specific variables and utilities
```

### Pattern 1: Bootstrap Theme Color Override
**What:** Override Bootstrap's default theme colors in _bootstrap-variables.scss before compilation
**When to use:** When you want to change Bootstrap's semantic colors globally (e.g., make "primary" teal instead of blue)
**Example:**
```scss
// _bootstrap-variables.scss
// Source: https://getbootstrap.com/docs/5.3/customize/sass/

// Override Bootstrap theme colors
$primary: #337BB7;     // Custom blue
$secondary: #79DFB6;   // Teal for selections
$success: #198754;     // Keep Bootstrap default green
$danger: #dc3545;      // Keep Bootstrap default red
$warning: #ffc107;     // Keep Bootstrap default yellow

// These automatically generate:
// - CSS variables: --bs-primary, --bs-success, --bs-danger, etc.
// - Text emphasis: $success-text-emphasis, $danger-text-emphasis
// - Subtle backgrounds: $success-bg-subtle, $danger-bg-subtle
// - Subtle borders: $success-border-subtle, $danger-border-subtle
```

### Pattern 2: Custom Variable Referencing Bootstrap
**What:** Define application-specific semantic variables that reference Bootstrap theme colors
**When to use:** When you need domain-specific color names but want consistency with Bootstrap theme
**Example:**
```scss
// _common.scss or _bootstrap-variables.scss
// Map application semantics to Bootstrap theme colors

// Use Bootstrap variables as source
$primary-color: $primary;           // References Bootstrap $primary
$primary-dark-color: shade-color($primary, 20%);
$primary-light-color: tint-color($primary, 60%);

$secondary-color: $secondary;       // References Bootstrap $secondary
$secondary-dark-color: shade-color($secondary, 40%);

// Status colors reference Bootstrap semantic colors
$status-success-bg: $success-bg-subtle;
$status-success-border: $success-border-subtle;
$status-danger-bg: $danger-bg-subtle;
$status-danger-border: $danger-border-subtle;
```

### Pattern 3: Component Color Migration
**What:** Replace hardcoded hex values with variables in component SCSS
**When to use:** For all component SCSS files with hardcoded colors
**Example:**
```scss
// BEFORE (autoqueue-page.component.scss)
.button {
    background-color: red;
    border-color: darkred;
}

// AFTER
.button {
    background-color: $danger;
    border-color: $danger-border-subtle;
}

// BEFORE (file-list.component.scss)
#header div {
    color: #fff;
    background-color: #000;
}

// AFTER
#header div {
    color: white;           // Named colors OK for true black/white
    background-color: black;
}
```

### Pattern 4: Migration Strategy
**What:** Systematic approach to finding and replacing hardcoded colors
**When to use:** During the migration process
**Steps:**
1. Inventory hardcoded colors using regex: `#(?:[0-9a-fA-Fa-f]{3}){1,2}`
2. Categorize by semantic meaning (success, danger, neutral, brand)
3. Map to Bootstrap theme colors or define custom variables
4. Replace component-by-component with atomic commits
5. Verify no visual regressions with unit tests

### Anti-Patterns to Avoid

- **Mixing hardcoded and variables:** Don't leave some hardcoded colors while migrating others - complete files fully
- **Color name variables:** Don't use `$red` or `$green` - use semantic names like `$danger` or `$success` for maintainability
- **Bypassing Bootstrap theme:** Don't define custom variables for semantic colors that Bootstrap already provides (danger, success, warning)
- **Duplicating color definitions:** Don't redefine the same hex value in multiple places - single source of truth in _bootstrap-variables.scss
- **Breaking import order:** Variables must be defined after functions but before Bootstrap variables import

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color variants (lighter, darker) | Manual hex calculation | Bootstrap's `shade-color()` and `tint-color()` functions | Handles edge cases, consistent lightness/darkness percentages, maintains color relationships |
| Theme color system | Custom color map | Bootstrap's `$theme-colors` map | Auto-generates utility classes, CSS variables, dark mode variants |
| Alert/status colors | Custom red/yellow/green definitions | Bootstrap's $danger, $warning, $success | Semantic meaning, accessibility tested, ecosystem integration |
| Dark mode color adaptation | Manual dark variants | Bootstrap 5.3's CSS variable system | Automatic color mode switching via `--bs-*` variables |
| Finding all hardcoded colors | Manual search | Regex pattern `#(?:[0-9a-fA-F]{3}){1,2}` | Systematic, finds both 3-char and 6-char hex codes |

**Key insight:** Bootstrap's color system is not just variables - it's a complete theming infrastructure with functions, maps, and generated utilities. Attempting to hand-roll this loses ecosystem benefits.

## Common Pitfalls

### Pitfall 1: SCSS vs CSS Variable Confusion
**What goes wrong:** Mixing SCSS variables (compile-time) with CSS custom properties (runtime) without understanding the difference
**Why it happens:** Both use similar syntax and are called "variables"
**How to avoid:** Use SCSS variables for this project (compile-time theming). Bootstrap 5.3 generates CSS variables automatically from SCSS variables, so you get both.
**Warning signs:** Trying to access `--bs-primary` in SCSS code (that's a CSS variable, use `$primary` in SCSS)

### Pitfall 2: Import Order Violations
**What goes wrong:** Defining variables after they're needed, causing compilation errors or values being ignored
**Why it happens:** Not following Bootstrap's required import sequence
**How to avoid:** Strict order from Phase 1: functions → your variable overrides → Bootstrap variables → maps → mixins → components → your overrides
**Warning signs:** Compilation errors like "undefined variable", or variable overrides not taking effect

### Pitfall 3: Hardcoded Bootstrap 4 Colors
**What goes wrong:** Using hardcoded hex colors that match Bootstrap 4 values, which changed in Bootstrap 5
**Why it happens:** Code copied from Bootstrap 4 examples or documentation
**How to avoid:** Verify colors against Bootstrap 5.3 documentation. Example: Bootstrap 4's danger was `#d9534f`, Bootstrap 5's is `#dc3545`
**Warning signs:** Colors in logs-page.component.scss like `#f2dede` (Bootstrap 4 alert-danger background) that should use `$danger-bg-subtle`

### Pitfall 4: Semantic Color Misuse
**What goes wrong:** Using green/red as generic colors instead of for their semantic meaning
**Why it happens:** Thinking of colors visually rather than semantically
**How to avoid:** Use $success for positive actions/states, $danger for errors/destructive actions, $warning for cautions. For non-semantic green/red, define custom variables.
**Warning signs:** Green "add" button using custom green instead of $success, losing semantic meaning

### Pitfall 5: Incomplete Migration
**What goes wrong:** Migrating obvious colors but missing rgba(), named colors (darkred, darkgreen), or colors in media queries
**Why it happens:** Search pattern only finds hex codes
**How to avoid:** Search for: hex codes, rgb/rgba values, hsl values, named colors (red, green, darkred, darkgreen, darkgrey, black paired with custom usage)
**Warning signs:** Unit tests pass but visual inspection shows hardcoded colors remain

### Pitfall 6: Variable Definition Location
**What goes wrong:** Defining new custom variables in _common.scss when they should be in _bootstrap-variables.scss
**Why it happens:** Not understanding the two-layer customization pattern
**How to avoid:**
- _bootstrap-variables.scss: Variables that need Bootstrap functions or override Bootstrap defaults
- _common.scss: Application utilities, placeholders (%button), and non-color variables
**Warning signs:** Using `shade-color()` in _common.scss fails because functions not available

## Code Examples

Verified patterns from official sources:

### Migrating AutoQueue Status Buttons
```scss
// Source: Current codebase + Bootstrap 5.3 theme colors
// autoqueue-page.component.scss

// BEFORE - hardcoded colors
.pattern .button {
    background-color: red;
    border-color: darkred;
    &:active { background-color: darkred; }
}

#add-pattern .button {
    background-color: green;
    border-color: darkgreen;
    &:active { background-color: darkgreen; }
}

// AFTER - Bootstrap theme variables
.pattern .button {
    background-color: $danger;
    border-color: shade-color($danger, 20%);
    &:active { background-color: shade-color($danger, 20%); }
}

#add-pattern .button {
    background-color: $success;
    border-color: shade-color($success, 20%);
    &:active { background-color: shade-color($success, 20%); }
}
```

### Migrating Settings Error State
```scss
// Source: Current codebase + Bootstrap 5.3 subtle colors
// option.component.scss

// BEFORE - hardcoded Bootstrap 4 alert-danger colors
.error {
    background-color: #f2dede;
    color: #a94442;
    border: 1px solid #a94442;
}

// AFTER - Bootstrap 5.3 semantic variables
.error {
    background-color: $danger-bg-subtle;
    color: $danger-text-emphasis;
    border: 1px solid $danger-border-subtle;
}
```

### Migrating Logs Warning/Error States
```scss
// Source: Current codebase + Bootstrap 5.3 semantic colors
// logs-page.component.scss

// BEFORE - hardcoded Bootstrap 4 colors with comment
p.record {
    &.warning {
        // copied from bootstrap alert-warning
        color: #8a6d3b;
        background-color: #fcf8e3;
        border-color: #faebcc;
    }

    &.error, &.critical {
        // copied from bootstrap alert-danger
        color: #a94442;
        background-color: #f2dede;
        border-color: #ebccd1;
    }
}

// AFTER - Bootstrap 5.3 variables
p.record {
    &.warning {
        color: $warning-text-emphasis;
        background-color: $warning-bg-subtle;
        border-color: $warning-border-subtle;
    }

    &.error, &.critical {
        color: $danger-text-emphasis;
        background-color: $danger-bg-subtle;
        border-color: $danger-border-subtle;
    }
}
```

### Defining Custom Variables from Bootstrap Base
```scss
// Source: Bootstrap 5.3 functions + current _common.scss pattern
// _bootstrap-variables.scss (add after Bootstrap function import)

// Application-specific variables derived from Bootstrap theme
$primary-color: $primary;
$primary-dark-color: shade-color($primary, 20%);
$primary-light-color: tint-color($primary, 60%);
$primary-lighter-color: tint-color($primary, 80%);

$secondary-color: $secondary;
$secondary-light-color: tint-color($secondary, 40%);
$secondary-dark-color: shade-color($secondary, 20%);
$secondary-darker-color: shade-color($secondary, 40%);

// UI chrome colors (not semantic, so custom)
$header-color: #DDDDDD;
$header-dark-color: shade-color($header-color, 5%);

$logo-color: shade-color($success, 20%);  // Derive from semantic green
```

### File List Header Migration
```scss
// Source: Current file-list.component.scss
// file-list.component.scss

// BEFORE
#header div {
    font-weight: bold;
    color: #fff;
    background-color: #000;
}

// AFTER - Use named colors for true black/white
#header div {
    font-weight: bold;
    color: white;
    background-color: black;
}

// Note: True black/white can remain as named colors.
// If these should be themeable, use Bootstrap variables:
// color: var(--bs-body-bg);
// background-color: var(--bs-body-color);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded hex colors | Bootstrap theme variables | Bootstrap 5.0+ | Automatic dark mode, utility classes, semantic meaning |
| Manual color variants (lighten 20%) | Bootstrap functions (shade-color, tint-color) | Bootstrap 5.0+ | Consistent color manipulation, maintains color relationships |
| Bootstrap 4 theme colors | Bootstrap 5.3 theme colors + subtle variants | v5.3.0 (2023) | Added -text-emphasis, -bg-subtle, -border-subtle for better subtle UI states |
| Static SCSS variables | SCSS → CSS variable generation | Bootstrap 5.2+ | Enable runtime customization while keeping SCSS compilation benefits |
| Copying Bootstrap alert colors | Referencing semantic variables directly | Best practice | Single source of truth, automatic updates when Bootstrap updates |

**Deprecated/outdated:**
- Bootstrap 4 color values: Many hex codes changed between v4 and v5 (e.g., danger: `#d9534f` → `#dc3545`)
- Manual color copying: Comments like "copied from bootstrap alert-warning" indicate outdated pattern
- Named color keywords for semantic purposes: `red`, `green`, `darkred` should be `$danger`, `$success`, etc.

## Open Questions

1. **Logo color derivation**
   - What we know: Current `$logo-color: #118247` in _common.scss is a specific green
   - What's unclear: Should this derive from `$success` or remain custom? It's close to `shade-color($success, 20%)`
   - Recommendation: Derive from `$success` for consistency unless branding requires exact hex value

2. **Black/white header colors**
   - What we know: File list header uses `#000` and `#fff` for high contrast
   - What's unclear: Should these use Bootstrap's body color variables for dark mode compatibility?
   - Recommendation: Keep as named `black`/`white` for now. If dark mode is needed in future, use CSS variables

3. **Missing custom color variables**
   - What we know: Current _common.scss defines many custom colors, Phase 1 says missing variables need to be added
   - What's unclear: Requirements mention COLOR-04 "Missing color variables added to _common.scss (danger, success states)"
   - Recommendation: Migrate _common.scss custom variables to _bootstrap-variables.scss and have them reference Bootstrap theme colors

4. **Active state color in %button placeholder**
   - What we know: `%button:active { background-color: #286090; }` is hardcoded
   - What's unclear: This should be `shade-color($primary, 20%)` but %button might need to become mixin if used with different colors
   - Recommendation: Investigate %button usage. If always primary, use variable. If used with multiple colors, convert to mixin with color parameter.

## Sources

### Primary (HIGH confidence)
- [Bootstrap 5.3 Color Documentation](https://getbootstrap.com/docs/5.3/customize/color/) - Theme color system, semantic colors, CSS variables
- [Bootstrap 5.3 Sass Customization](https://getbootstrap.com/docs/5.3/customize/sass/) - Import order, variable override patterns
- [Bootstrap 5.3 _variables.scss on GitHub](https://github.com/twbs/bootstrap/blob/main/scss/_variables.scss) - Default theme color values, subtle variants

### Secondary (MEDIUM confidence)
- [Customizing Bootstrap 5 with Sass Variables - Vincent Schmalbach](https://www.vincentschmalbach.com/customizing-bootstrap-5-with-sass-variables/) - Practical customization patterns verified against official docs
- [Discover how to override theme colors in Bootstrap 5 using Sass - Assistancy](https://www.assistancy.be/blog/bootstrap-5-override-theme-colors-sass) - Theme color override examples

### Tertiary (LOW confidence)
- [How to Structure SCSS in an Angular App - Medium](https://medium.com/swlh/how-to-structure-scss-in-an-angular-app-a1b8a759a028) - Angular-specific SCSS patterns (community best practices, not official)
- [SCSS Color Variables - HTML Color Codes](https://htmlcolorcodes.com/blog/scss-color-variables/) - General SCSS variable patterns (educational, not authoritative)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Bootstrap 5.3.3 is already installed and configured via Phase 1
- Architecture: HIGH - Bootstrap official documentation provides clear import order and customization patterns
- Pitfalls: MEDIUM - Based on official docs + current codebase analysis, but specific project pitfalls discovered during implementation may vary

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable domain, Bootstrap 5.3 is mature)
