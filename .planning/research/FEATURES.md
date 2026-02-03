# Feature Landscape: Bootstrap 5 SCSS Styling Unification

**Domain:** CSS/SCSS Refactoring for Angular Bootstrap 5 UI
**Researched:** 2026-02-03
**Confidence:** HIGH

## Table Stakes

Features that are essential for a well-unified Bootstrap 5 UI. Missing these = inconsistent, unprofessional appearance.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Centralized color variables** | Bootstrap 5's design system depends on theme color variables (`$primary`, `$secondary`, etc.) for consistency | Low | Replace all hardcoded hex values (`#337BB7`, `#286090`, etc.) with Bootstrap variables or custom SCSS variables that map to Bootstrap theme |
| **Single selection color scheme** | Users expect one consistent selection/highlight color throughout the UI | Low | Currently mixing `$secondary-color` (green) and `$primary-color` (blue) for selections. Pick one semantic approach |
| **Bootstrap button classes** | Bootstrap 5 provides standardized button variants (`.btn`, `.btn-primary`, etc.) that ensure consistent sizing, padding, states | Medium | Migrate from custom `%button` placeholder to Bootstrap's `.btn` classes. Ensures hover, active, disabled states work correctly |
| **Consistent spacing scale** | Bootstrap 5's spacing utilities (`m-*`, `p-*`) provide a standardized scale (0.25rem, 0.5rem, 1rem, etc.) | Low | Replace arbitrary padding/margin values with Bootstrap spacing utilities or variables (`$spacer * N`) |
| **Theme color integration** | Colors should come from Bootstrap's `$theme-colors` map to inherit dark mode, accessibility, and utility class generation | Medium | Integrate custom colors into Bootstrap's theme system so they work with utilities like `.text-primary`, `.bg-secondary` |
| **Proper import order** | Bootstrap SCSS must be imported in the correct sequence: functions → variable overrides → variables → maps → mixins → components | Low | Critical for variable overrides to work. Wrong order = overrides ignored |

## Differentiators

Features that elevate the UI beyond basic consistency. Not expected, but provide polish and better DX.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **SCSS color functions** | Use Bootstrap's `tint-color()`, `shade-color()`, `shift-color()` instead of manual hex values for hover/active states | Low | Provides consistent color relationships. Example: `hover: tint-color($primary, 10%)` instead of hardcoded `#2e6da4` |
| **Component state variables** | Define semantic state variables (e.g., `$file-selected-bg`, `$file-hover-bg`) that wrap Bootstrap colors | Low | Makes intent clear and enables easy theme changes. Better than direct `$secondary-color` usage everywhere |
| **CSS custom properties bridge** | Expose SCSS variables as CSS custom properties on `:root` for runtime flexibility | Medium | Enables dynamic theming without recompilation. Bootstrap 5.3+ does this automatically for theme colors |
| **Utility class usage** | Use Bootstrap utilities (`.text-primary`, `.bg-light`, `.p-3`) in templates instead of custom SCSS where possible | Low | Reduces CSS bundle size, improves consistency, leverages Bootstrap's responsive variants |
| **Color contrast automation** | Use Bootstrap's `color-contrast()` function to auto-select readable text colors based on background | Medium | Ensures accessibility without manual testing. Example: `color: color-contrast($bg-color)` |
| **Responsive color variants** | Leverage Bootstrap's subtle variants (`.bg-primary-subtle`, `.text-primary-emphasis`, `.border-primary-subtle`) for better visual hierarchy | Low | New in Bootstrap 5.3. Provides semantically correct lighter/darker variants that adapt to dark mode |

## Anti-Features

Features to explicitly NOT build. Common mistakes in SCSS refactoring projects.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Complete Bootstrap replacement** | Tempting to "improve" Bootstrap by rewriting components, but creates maintenance burden and loses ecosystem benefits | Keep Bootstrap components intact. Only override variables and extend with custom classes |
| **Pixel-perfect variable mapping** | Creating SCSS variables that exactly match old hex values defeats the purpose of unification | Map to nearest Bootstrap theme color or create new semantic theme color. Embrace minor visual changes for consistency |
| **Inline style migration** | Moving hardcoded colors from SCSS to inline styles or CSS variables without structure | Use SCSS variables that map to Bootstrap theme. Inline styles should only be for truly dynamic values |
| **Deep Sass nesting** | Over-nesting selectors (`.component .section .item .text`) creates specificity wars and brittle styles | Keep nesting shallow (1-2 levels). Use BEM-style classes or component scoping instead |
| **Custom button variants for everything** | Creating `.btn-download`, `.btn-queue`, `.btn-extract` for every action | Use semantic Bootstrap variants (`.btn-primary`, `.btn-secondary`) with icons. Action meaning comes from context, not color |
| **Mixing color systems** | Using both Bootstrap variables AND custom hex values throughout the codebase | Pick one: Bootstrap's theme system. All custom colors should extend it, not replace it |
| **Overly granular color palette** | Creating 20+ custom color variables (`$primary-lighter`, `$primary-lightest`, `$primary-extra-light`) | Use Bootstrap's tint/shade functions to generate variants on demand. Store only base colors |

## Feature Dependencies

```
Proper Import Order
    ↓
Centralized Color Variables
    ↓
Theme Color Integration
    ↓
┌───────────────┴───────────────┐
↓                               ↓
Bootstrap Button Classes    SCSS Color Functions
                               ↓
                        Component State Variables
```

**Critical path:** Import order must be correct before any variable overrides work. Color variables must be centralized before they can be integrated into Bootstrap's theme system.

**Parallel tracks:** Once theme integration is done, button migration and color function usage can proceed independently.

## Scope-Specific Recommendations

Based on project context (Sessions 1-4: colors and buttons only, dropdowns and forms deferred):

### Session Focus Areas

**Colors (Sessions 1-2):**
1. Centralized color variables (table stakes)
2. Single selection color scheme (table stakes)
3. Theme color integration (table stakes)
4. SCSS color functions (differentiator - adds polish)

**Buttons (Sessions 3-4):**
1. Bootstrap button classes (table stakes)
2. Consistent spacing scale (table stakes - applies to button padding)
3. Utility class usage (differentiator - for button containers)

### Defer to Later Sessions

- Dropdown styling patterns
- Form input styling
- Component state variables (helpful but can wait until comprehensive refactor)
- CSS custom properties bridge (nice-to-have, not critical for SCSS unification)

## Complexity Notes

**Low complexity features:**
- Variable consolidation (find/replace with verification)
- Single selection color (one-time decision + update)
- SCSS color functions (syntax is simple once learned)
- Spacing scale (straightforward mapping)

**Medium complexity features:**
- Bootstrap button migration (need to test all states: hover, active, disabled, loading)
- Theme color integration (requires understanding Bootstrap's map structure)
- Color contrast automation (need to identify which elements need it)

**High complexity (not in current scope):**
- Full utility class migration (requires template changes, extensive testing)
- Dark mode support (requires comprehensive color system overhaul)

## Current State Analysis

**Existing patterns in SeedSync:**

1. **Custom color variables:** Uses `$primary-color`, `$secondary-color` etc. in `_common.scss`
2. **Hardcoded hex values:** Found in multiple places:
   - `#286090` (button active state)
   - `#fcf8e3`, `#f2dede` (log backgrounds)
   - `#f5f5f5`, `#000` (misc backgrounds)
3. **Custom button placeholder:** Uses `%button` Sass placeholder instead of Bootstrap classes
4. **Mixed selection colors:** Uses `$secondary-color` (green) for selected files, but also has `$primary-color` (blue) usage
5. **No Bootstrap integration:** Custom variables exist alongside Bootstrap but aren't connected to Bootstrap's theme system

**Impact on feature priorities:**

- **High priority:** Color variable consolidation (many hardcoded values to eliminate)
- **High priority:** Selection color standardization (currently inconsistent)
- **High priority:** Bootstrap button class migration (custom placeholder is not leveraging Bootstrap)
- **Medium priority:** Theme integration (currently siloed from Bootstrap)

## Success Metrics

A well-unified Bootstrap 5 UI should have:

1. **Zero hardcoded hex values** in SCSS files (except in variable definitions)
2. **Single source of truth** for each semantic color (primary, secondary, selection, etc.)
3. **All buttons using Bootstrap classes** (`.btn`, `.btn-*` variants)
4. **Consistent spacing** using Bootstrap's spacing scale or utilities
5. **Color variables integrated** into Bootstrap's `$theme-colors` map
6. **Maintainable overrides** in a single custom SCSS file with proper import order

## Sources

**HIGH Confidence:**
- Bootstrap 5.3 Official Documentation (via WebFetch):
  - https://getbootstrap.com/docs/5.3/customize/sass/ (SCSS customization patterns)
  - https://getbootstrap.com/docs/5.3/customize/color/ (Color theming system)
  - https://getbootstrap.com/docs/5.3/components/buttons/ (Button variants and patterns)
  - https://getbootstrap.com/docs/5.3/utilities/spacing/ (Spacing utilities)

**MEDIUM Confidence:**
- SeedSync codebase analysis (current state patterns identified via file inspection)
  - `/src/angular/src/app/common/_common.scss` (custom color variables)
  - `/src/angular/src/app/pages/files/file.component.scss` (selection patterns, button placeholder usage)
  - Multiple component SCSS files (hardcoded hex value usage)
