# Phase 1: Bootstrap SCSS Setup - Research

**Researched:** 2026-02-03
**Domain:** Bootstrap SCSS integration with Angular 19
**Confidence:** HIGH

## Summary

This phase establishes SCSS compilation infrastructure with Bootstrap source imports. The project currently uses pre-compiled Bootstrap CSS (`node_modules/bootstrap/dist/css/bootstrap.min.css`). Migration to Bootstrap SCSS source files enables customization through variable overrides while maintaining identical visual appearance.

Bootstrap 5.3.8 is already installed via npm with Sass 1.97.3 (very recent, includes Dart Sass 1.80+ deprecation warnings). Angular 19.2.18 uses the Angular CLI's built-in Sass compiler. The standard approach requires strict import order: functions → variable overrides → variables/variables-dark/maps/mixins/root → components → utilities API.

Critical consideration: Angular 19 + Dart Sass 1.80+ produces deprecation warnings about `@import` (deprecated in favor of `@use`). Bootstrap 5.3 has NOT migrated to Sass modules yet, so `@import` is required. Angular CLI provides `silenceDeprecations` configuration to suppress these expected warnings.

**Primary recommendation:** Import Bootstrap SCSS using traditional `@import` syntax with strict ordering, configure `silenceDeprecations` for `@import` warnings in `angular.json`, and validate visual equivalence through test suite execution and manual visual inspection.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bootstrap | 5.3.8 | CSS framework source | Official Bootstrap package with SCSS source files in `scss/` directory |
| Sass | 1.97.3 | SCSS compiler | Modern Dart Sass implementation, built into Angular CLI via @angular-devkit/build-angular |
| @popperjs/core | 2.11.8 | Dropdown positioning | Bootstrap 5 peer dependency for dropdown/tooltip components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Angular CLI | 19.2.19 | Build system | Provides built-in Sass compilation via stylePreprocessorOptions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bootstrap SCSS | Pre-compiled CSS | Pre-compiled is simpler but prevents customization; SCSS source enables variable overrides |
| @import syntax | @use/@forward | @use is modern Sass but Bootstrap 5.3 hasn't migrated yet; @import required for now |

**Installation:**
No additional packages needed - Bootstrap and Sass already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── styles.scss                          # Main stylesheet (existing)
├── app/
│   ├── common/
│   │   ├── _common.scss                # Custom variables (existing)
│   │   ├── _bootstrap-variables.scss   # Bootstrap variable overrides (new)
│   │   └── _bootstrap-overrides.scss   # Post-compilation overrides (new)
```

### Pattern 1: Bootstrap SCSS Import Order

**What:** Strict import sequence required by Bootstrap's internal dependencies
**When to use:** Every Bootstrap SCSS integration
**Example:**
```scss
// styles.scss
// Source: https://getbootstrap.com/docs/5.3/customize/sass/

// 1. Include functions first (required for variable calculations)
@import '../node_modules/bootstrap/scss/functions';

// 2. Include any default variable overrides here
@import 'app/common/bootstrap-variables';

// 3. Include remainder of required Bootstrap stylesheets
@import '../node_modules/bootstrap/scss/variables';
@import '../node_modules/bootstrap/scss/variables-dark';

// 4. Include any default map overrides here (if needed)

// 5. Include remainder of required parts
@import '../node_modules/bootstrap/scss/maps';
@import '../node_modules/bootstrap/scss/mixins';
@import '../node_modules/bootstrap/scss/root';

// 6. Include optional components
@import '../node_modules/bootstrap/scss/utilities';
@import '../node_modules/bootstrap/scss/reboot';
@import '../node_modules/bootstrap/scss/type';
@import '../node_modules/bootstrap/scss/images';
@import '../node_modules/bootstrap/scss/containers';
@import '../node_modules/bootstrap/scss/grid';
@import '../node_modules/bootstrap/scss/tables';
@import '../node_modules/bootstrap/scss/forms';
@import '../node_modules/bootstrap/scss/buttons';
@import '../node_modules/bootstrap/scss/transitions';
@import '../node_modules/bootstrap/scss/dropdown';
@import '../node_modules/bootstrap/scss/button-group';
@import '../node_modules/bootstrap/scss/nav';
@import '../node_modules/bootstrap/scss/navbar';
@import '../node_modules/bootstrap/scss/card';
@import '../node_modules/bootstrap/scss/accordion';
@import '../node_modules/bootstrap/scss/breadcrumb';
@import '../node_modules/bootstrap/scss/pagination';
@import '../node_modules/bootstrap/scss/badge';
@import '../node_modules/bootstrap/scss/alert';
@import '../node_modules/bootstrap/scss/progress';
@import '../node_modules/bootstrap/scss/list-group';
@import '../node_modules/bootstrap/scss/close';
@import '../node_modules/bootstrap/scss/toasts';
@import '../node_modules/bootstrap/scss/modal';
@import '../node_modules/bootstrap/scss/tooltip';
@import '../node_modules/bootstrap/scss/popover';
@import '../node_modules/bootstrap/scss/carousel';
@import '../node_modules/bootstrap/scss/spinners';
@import '../node_modules/bootstrap/scss/offcanvas';
@import '../node_modules/bootstrap/scss/placeholders';
@import '../node_modules/bootstrap/scss/helpers';

// 7. Optionally include utilities API last (enables custom utility generation)
@import '../node_modules/bootstrap/scss/utilities/api';

// 8. Add custom code and overrides after Bootstrap
@import 'app/common/bootstrap-overrides';
@import 'app/common/common';
```

**Critical timing:** Functions MUST be imported before variable overrides. Variable overrides MUST come before variables import. Once Bootstrap uses a default variable, it cannot be updated later.

### Pattern 2: Variable Override Strategy

**What:** Override Bootstrap's default variables by setting values after functions but before variables
**When to use:** Customizing Bootstrap theme colors, spacing, fonts, etc.
**Example:**
```scss
// app/common/_bootstrap-variables.scss
// Source: https://getbootstrap.com/docs/5.3/customize/sass/

// Override theme colors (Bootstrap uses $primary, $success, $danger internally)
$primary: #337BB7;  // Match existing app primary color

// Override spacing scale if needed
// $spacer: 1rem;

// Override font settings if needed
// $font-family-base: Verdana, sans-serif;

// DO NOT include !default flag - that makes it a default, not an override
// DO NOT import this file after @import 'variables' - too late
```

### Pattern 3: Post-Compilation Overrides

**What:** Style modifications that override compiled Bootstrap classes
**When to use:** Adjusting specific Bootstrap components after compilation
**Example:**
```scss
// app/common/_bootstrap-overrides.scss

// Override specific Bootstrap component styles
.modal-body {
    overflow-wrap: normal;
    hyphens: auto;
    word-break: break-word;
}
```

### Pattern 4: Angular.json Configuration

**What:** Configure Sass compiler options and silence expected deprecation warnings
**When to use:** Every Angular project using Bootstrap SCSS with Dart Sass 1.80+
**Example:**
```json
// angular.json
// Source: https://github.com/angular/angular-cli/issues/28829
{
  "projects": {
    "seedsync": {
      "architect": {
        "build": {
          "options": {
            "styles": [
              "src/styles.scss"  // Remove bootstrap.min.css, only use styles.scss
            ],
            "stylePreprocessorOptions": {
              "sass": {
                "silenceDeprecations": [
                  "import",           // Bootstrap uses @import, not migrated to @use yet
                  "global-builtin",   // Bootstrap uses global functions like adjust-color()
                  "color-functions",  // Bootstrap uses legacy color functions
                  "mixed-decls"       // Bootstrap mixes declarations and nested rules
                ]
              }
            }
          }
        },
        "test": {
          "options": {
            "styles": [
              "src/styles.scss"  // Also update test configuration
            ],
            "stylePreprocessorOptions": {
              "sass": {
                "silenceDeprecations": [
                  "import",
                  "global-builtin",
                  "color-functions",
                  "mixed-decls"
                ]
              }
            }
          }
        }
      }
    }
  }
}
```

### Anti-Patterns to Avoid

- **Importing variables before functions:** Functions provide utilities like `color-contrast()` and `map-get()` needed by variable definitions. Import order: functions → overrides → variables.
- **Overriding variables after importing `variables`:** Sass `!default` only works if variable is undefined. Once `@import 'variables'` runs, all Bootstrap variables are set and cannot be overridden.
- **Using full `bootstrap.scss` import:** Single-line import is convenient but includes all components (carousel, offcanvas, etc.). Selective imports reduce CSS bundle size.
- **Removing required theme-color keys:** Bootstrap requires `primary`, `success`, and `danger` keys for buttons, alerts, and form validation. Removing these causes compilation errors.
- **Modifying Bootstrap source files:** Never edit `node_modules/bootstrap/scss/*` - changes lost on npm install. Always override in custom files.
- **Using @use/@forward syntax:** Bootstrap 5.3 hasn't migrated to Sass modules. Using `@use` causes "Undefined mixin" errors because Bootstrap's mixins aren't exported as modules.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Visual regression detection | Custom screenshot comparison tool | Existing test suite + manual inspection | Bootstrap migration should be transparent - unit tests validate functionality, manual check confirms visual equivalence |
| SCSS compilation | Custom Sass build script | Angular CLI built-in Sass compiler | Angular CLI handles Sass compilation via @angular-devkit/build-angular with proper sourcemaps, caching, and watch mode |
| Bootstrap customization | Fork Bootstrap repo | Variable overrides + post-compilation overrides | Bootstrap's `!default` system designed for customization - overrides are maintainable and upgrade-safe |

**Key insight:** Infrastructure phase should use existing tools (Angular CLI, test suite). Custom build tooling adds complexity without benefit.

## Common Pitfalls

### Pitfall 1: Import Order Violation
**What goes wrong:** Compilation errors like "Undefined function" or "Undefined variable", OR overrides silently ignored
**Why it happens:** Bootstrap's internal dependencies require functions before variables, and variable system requires overrides before `@import 'variables'`
**How to avoid:** Follow exact import order: functions → overrides → variables → variables-dark → maps → mixins → root → components
**Warning signs:** Variables not taking effect, errors mentioning undefined functions like `color-contrast()` or `map-get()`

### Pitfall 2: Sass Deprecation Warning Panic
**What goes wrong:** Developers see hundreds of `@import` deprecation warnings and assume compilation is broken
**Why it happens:** Dart Sass 1.80+ warns about `@import` being deprecated, Bootstrap 5.3 hasn't migrated to `@use` yet
**How to avoid:** Configure `silenceDeprecations: ["import", "global-builtin", "color-functions", "mixed-decls"]` in `angular.json`
**Warning signs:** Build succeeds but console filled with deprecation warnings about `@import` and global functions

### Pitfall 3: Missing Bootstrap Components
**What goes wrong:** After migration, dropdown menus or modals stop working or look broken
**Why it happens:** Selective imports omit required components, or component dependencies not understood (dropdowns need dropdown + transitions + utilities)
**How to avoid:** For Phase 1, import all Bootstrap components to ensure identical appearance; optimize in later phases
**Warning signs:** Visual differences in interactive components, console errors about missing CSS classes

### Pitfall 4: Angular.json Path Confusion
**What goes wrong:** Build fails with "Can't find stylesheet to import" or "File not found"
**Why it happens:** Relative paths in `styles.scss` are relative to the file location, not `angular.json`
**How to avoid:** Use `../node_modules/bootstrap/scss/` paths in `styles.scss` (relative from `src/`), NOT `node_modules/bootstrap/scss/` (which is relative from project root in CLI config)
**Warning signs:** File not found errors during compilation, paths work in one file but not another

### Pitfall 5: Test Configuration Mismatch
**What goes wrong:** Tests pass during development (`ng serve`) but fail in test runner (`ng test`)
**Why it happens:** `angular.json` has separate `build` and `test` configurations; updating styles in `build` but not `test` causes inconsistency
**How to avoid:** Update both `projects.seedsync.architect.build.options.styles` AND `projects.seedsync.architect.test.options.styles` to use `styles.scss`
**Warning signs:** Tests fail with CSS-related errors, visual differences between `ng serve` and `ng test` output

### Pitfall 6: Font Awesome SCSS Compatibility
**What goes wrong:** Font Awesome icons disappear or look broken after Bootstrap SCSS migration
**Why it happens:** Project imports `font-awesome/scss/font-awesome.scss` alongside Bootstrap - Sass compilation order or variable conflicts can occur
**How to avoid:** Keep Font Awesome import in `angular.json` styles array, ensure it's imported AFTER Bootstrap in compilation order
**Warning signs:** Icons render as squares or disappear, Font Awesome classes don't apply

## Code Examples

Verified patterns from official sources:

### Complete styles.scss Setup
```scss
// src/styles.scss
// Source: https://getbootstrap.com/docs/5.3/customize/sass/

// =============================================================================
// BOOTSTRAP SCSS INTEGRATION
// =============================================================================

// 1. Include functions first (required for variable calculations)
@import '../node_modules/bootstrap/scss/functions';

// 2. Include Bootstrap variable overrides
@import 'app/common/bootstrap-variables';

// 3. Include remainder of required Bootstrap stylesheets
@import '../node_modules/bootstrap/scss/variables';
@import '../node_modules/bootstrap/scss/variables-dark';

// 4. Include any default map overrides (none for Phase 1)

// 5. Include remainder of required parts
@import '../node_modules/bootstrap/scss/maps';
@import '../node_modules/bootstrap/scss/mixins';
@import '../node_modules/bootstrap/scss/root';

// 6. Include all Bootstrap components (ensure no visual changes)
@import '../node_modules/bootstrap/scss/utilities';
@import '../node_modules/bootstrap/scss/reboot';
@import '../node_modules/bootstrap/scss/type';
@import '../node_modules/bootstrap/scss/images';
@import '../node_modules/bootstrap/scss/containers';
@import '../node_modules/bootstrap/scss/grid';
@import '../node_modules/bootstrap/scss/tables';
@import '../node_modules/bootstrap/scss/forms';
@import '../node_modules/bootstrap/scss/buttons';
@import '../node_modules/bootstrap/scss/transitions';
@import '../node_modules/bootstrap/scss/dropdown';
@import '../node_modules/bootstrap/scss/button-group';
@import '../node_modules/bootstrap/scss/nav';
@import '../node_modules/bootstrap/scss/navbar';
@import '../node_modules/bootstrap/scss/card';
@import '../node_modules/bootstrap/scss/accordion';
@import '../node_modules/bootstrap/scss/breadcrumb';
@import '../node_modules/bootstrap/scss/pagination';
@import '../node_modules/bootstrap/scss/badge';
@import '../node_modules/bootstrap/scss/alert';
@import '../node_modules/bootstrap/scss/progress';
@import '../node_modules/bootstrap/scss/list-group';
@import '../node_modules/bootstrap/scss/close';
@import '../node_modules/bootstrap/scss/toasts';
@import '../node_modules/bootstrap/scss/modal';
@import '../node_modules/bootstrap/scss/tooltip';
@import '../node_modules/bootstrap/scss/popover';
@import '../node_modules/bootstrap/scss/carousel';
@import '../node_modules/bootstrap/scss/spinners';
@import '../node_modules/bootstrap/scss/offcanvas';
@import '../node_modules/bootstrap/scss/placeholders';
@import '../node_modules/bootstrap/scss/helpers';

// 7. Include utilities API last (enables custom utilities)
@import '../node_modules/bootstrap/scss/utilities/api';

// 8. Include Bootstrap post-compilation overrides
@import 'app/common/bootstrap-overrides';

// =============================================================================
// CUSTOM STYLES
// =============================================================================

@import 'app/common/common';

// Existing custom styles
html {
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
    -moz-text-size-adjust: 100%;
}

html, body {
    font-family: Verdana,sans-serif;
    font-size: 15px;
    line-height: 1.5;
    margin: 0;
}

input[type=search]::-webkit-search-cancel-button {
    -webkit-appearance: searchfield-cancel-button;
}

div {
    box-sizing: border-box;
}
```

### Bootstrap Variable Overrides File
```scss
// src/app/common/_bootstrap-variables.scss
// Bootstrap variable overrides - imported after functions, before variables
// Source: https://getbootstrap.com/docs/5.3/customize/sass/

// No variable overrides needed for Phase 1 (maintaining identical appearance)
// This file is a placeholder for future customization phases

// Example overrides (commented out for Phase 1):
// $primary: #337BB7;  // Match app primary color from _common.scss
// $font-family-base: Verdana, sans-serif;
```

### Bootstrap Post-Compilation Overrides File
```scss
// src/app/common/_bootstrap-overrides.scss
// Component-specific overrides applied after Bootstrap compilation
// Source: existing styles.scss

// Bootstrap modal customization (existing in styles.scss)
.modal-body {
    /* break up long text */
    overflow-wrap: normal;
    hyphens: auto;
    word-break: break-word;
}
```

### Angular.json Configuration Update
```json
// angular.json - Update both build and test configurations
// Source: https://www.angulararchitects.io/blog/how-to-disable-the-angular-v19s-sass-compiler-deprecation-warnings/
{
  "projects": {
    "seedsync": {
      "architect": {
        "build": {
          "options": {
            "styles": [
              "node_modules/font-awesome/scss/font-awesome.scss",
              "src/styles.scss"
            ],
            "stylePreprocessorOptions": {
              "sass": {
                "silenceDeprecations": [
                  "import",
                  "global-builtin",
                  "color-functions",
                  "mixed-decls"
                ]
              }
            }
          }
        },
        "test": {
          "options": {
            "styles": [
              "node_modules/font-awesome/scss/font-awesome.scss",
              "src/styles.scss"
            ],
            "stylePreprocessorOptions": {
              "sass": {
                "silenceDeprecations": [
                  "import",
                  "global-builtin",
                  "color-functions",
                  "mixed-decls"
                ]
              }
            }
          }
        }
      }
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @import syntax | @use/@forward modules | Dart Sass 1.80.0 (2024) | @import deprecated but Bootstrap 5.3 hasn't migrated; must use @import with silenceDeprecations |
| Bootstrap 4 | Bootstrap 5.3 | Bootstrap 5.0 (2021) | Major breaking changes: dropped IE support, new utilities API, CSS custom properties |
| Sass 1.32.0 | Sass 1.97.3 | Ongoing | Project uses older version (1.32.0 in package.json) but node_modules has 1.97.3; Angular CLI handles version |

**Deprecated/outdated:**
- **Bootstrap 4 syntax:** Project already on Bootstrap 5.3.8, no migration needed
- **@import syntax (future):** Sass deprecating @import in favor of @use, but Bootstrap hasn't migrated yet; use @import now, plan for @use migration when Bootstrap updates
- **Global Sass functions:** Functions like `adjust-color()` moving to namespaced modules, but Bootstrap uses global versions; warnings are expected

## Open Questions

Things that couldn't be fully resolved:

1. **Selective vs Full Bootstrap Import**
   - What we know: Bootstrap docs recommend selective imports for bundle size optimization
   - What's unclear: Which components are actually used in this application
   - Recommendation: Import ALL Bootstrap components in Phase 1 to ensure zero visual changes; defer optimization to later phase after validation

2. **Visual Regression Validation Scope**
   - What we know: Success criteria requires "identical visual appearance"
   - What's unclear: Manual inspection scope (all pages? specific pages? responsive sizes?)
   - Recommendation: Run full test suite (unit tests validate functionality), then manually inspect: Files page, Settings page, About page, Logs page, Autoqueue page at desktop and mobile sizes

3. **Font Awesome SCSS Compilation Order**
   - What we know: Font Awesome currently imported as `font-awesome/scss/font-awesome.scss` in angular.json
   - What's unclear: Whether Font Awesome SCSS import should move inside styles.scss or remain in angular.json
   - Recommendation: Keep Font Awesome in angular.json (current approach) to avoid import order complexity; if issues arise, can move to styles.scss after Bootstrap imports

## Sources

### Primary (HIGH confidence)
- [Bootstrap 5.3 Official Sass Documentation](https://getbootstrap.com/docs/5.3/customize/sass/) - Complete import order and variable override patterns
- [Bootstrap 5.3 Optimize Documentation](https://getbootstrap.com/docs/5.3/customize/optimize/) - Selective import strategies and bundle size optimization
- [Angular CLI Issue #28829](https://github.com/angular/angular-cli/issues/28829) - Official silenceDeprecations feature for Angular 19
- [CoreUI: Angular 19 Sass Deprecation Warnings](https://coreui.io/blog/angular-19-sass-deprecation-warnings/) - Comprehensive guide to silenceDeprecations configuration
- [ANGULARarchitects: Disable Angular v19 Sass Compiler Warnings](https://www.angulararchitects.io/blog/how-to-disable-the-angular-v19s-sass-compiler-deprecation-warnings/) - Production-ready silenceDeprecations setup

### Secondary (MEDIUM confidence)
- [GitHub Discussion #41260](https://github.com/orgs/twbs/discussions/41260) - Community discussion on Angular 19 + Bootstrap SCSS with @use/@forward challenges
- [Medium: SCSS Integration with Bootstrap 5 in Angular](https://medium.com/@kathar.rahul/scss-integration-with-bootstrap-5-in-angular-8e12ddf9b471) - Practical integration examples
- [10xdev: Integrating Bootstrap 5 with Angular 19](https://10xdev.blog/angular-bootstrap/) - Recent 2025 integration guide
- [Bootstrap Issue #21409](https://github.com/twbs/bootstrap/issues/21409) - Official discussion on correct import order for variable overrides
- [Vincent Schmalbach: Customizing Bootstrap 5 with Sass Variables](https://www.vincentschmalbach.com/customizing-bootstrap-5-with-sass-variables/) - Variable override patterns

### Tertiary (LOW confidence)
- WebSearch results about visual regression testing - general concepts, no Bootstrap-specific guidance for "no changes" validation
- Community forum posts about SCSS compilation errors - varied solutions, not systematically verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official Bootstrap package.json confirms SCSS source location, Angular 19 uses built-in Sass compiler
- Architecture: HIGH - Bootstrap official docs provide exact import order, verified across multiple authoritative sources
- Pitfalls: HIGH - Documented in official GitHub issues, Angular CLI documentation, and Bootstrap migration guides
- Configuration: HIGH - silenceDeprecations feature documented in Angular CLI issue tracker and implemented by Angular team

**Research date:** 2026-02-03
**Valid until:** 90 days (stable domain - Bootstrap 5.3 mature, Angular 19 stable, Sass compilation patterns well-established)

**Project-specific context:**
- Current state: Bootstrap 5.3.8 installed, using pre-compiled CSS (`bootstrap.min.css`)
- Current Sass version: 1.97.3 (Dart Sass with @import deprecation warnings)
- Angular version: 19.2.18 with @angular-devkit/build-angular 19.2.19
- Custom variables: Existing in `src/app/common/_common.scss` (primary/secondary colors, breakpoints, z-indexes)
- Font Awesome: Separately imported as `font-awesome/scss/font-awesome.scss`
