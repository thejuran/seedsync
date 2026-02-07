# Architecture Patterns: Sass @use/@forward Migration in Angular

**Domain:** Angular 19.x SCSS with Bootstrap 5.3 variable sharing
**Researched:** 2026-02-07
**Overall Confidence:** HIGH

## Executive Summary

Migrating from `@import` to `@use/@forward` in Angular's component-scoped SCSS architecture requires understanding how Sass's module system interacts with Angular CLI's build process and ViewEncapsulation. The current SeedSync architecture has **already adopted `@use` for all component files**, with only the shared module files (`_common.scss` and `_bootstrap-overrides.scss`) still using `@import`. This positions the project well for completing the migration, which primarily involves transforming the shared module layer.

**Key architectural insight:** `@use` introduces module scoping that fundamentally changes variable access patterns. Instead of global variables available everywhere, variables are namespaced and must be explicitly accessed via `module.$variable` or imported with `as *` for wildcard namespace access.

## Current Architecture Analysis

### File Dependency Graph

```
styles.scss (global entry point)
├── Bootstrap functions (@import)
├── _bootstrap-variables.scss (@import) — CUSTOM OVERRIDES
├── Bootstrap core (@import)
│   ├── variables
│   ├── variables-dark
│   ├── maps
│   ├── mixins
│   └── root
├── Bootstrap components (@import) — ALL COMPONENTS
├── _bootstrap-overrides.scss (@import) — POST-COMPILATION OVERRIDES
│   └── @import 'bootstrap-variables'
└── _common.scss (@import) — VARIABLE RE-EXPORT MODULE
    └── @import 'bootstrap-variables'

Component .scss files (16 files):
├── file.component.scss (@use '../../common/common' as *)
├── sidebar.component.scss (@use '../../common/common' as *)
├── settings-page.component.scss (@use '../../common/common' as *)
└── ... (all other components use @use)
```

**Key observation:** Components already use `@use` with wildcard namespace (`as *`), which provides direct access to all variables, functions, and mixins exported by `_common.scss`. The migration challenge is in transforming the shared module layer.

### Current Variable Access Patterns

**In _common.scss (current with @import):**
```scss
@import 'bootstrap-variables';

// Re-export Bootstrap variables for component access
$warning-text-emphasis: shade-color($warning, 60%);
$danger-text-emphasis: shade-color($danger, 60%);
$gray-100: #f8f9fa;
```

**In component files (current with @use):**
```scss
@use '../../common/common' as *;

.file.selected {
    background-color: $secondary-color;  // Direct access via wildcard namespace
}

.bulk-progress-overlay .progress-text {
    color: $gray-800;  // Bootstrap variable re-exported by _common.scss
}
```

**Critical insight:** Components already use `@use` with wildcard (`as *`), which means they expect direct variable access without namespace prefixes. The migration must preserve this access pattern by using `@forward` in `_common.scss`.

## Sass Module System Architecture

### @use vs @forward: When to Use Each

| Directive | Purpose | Use Case | Members Available |
|-----------|---------|----------|-------------------|
| **@use** | Load module for local use | Consume variables/mixins in current file | Only in current file (namespaced) |
| **@forward** | Re-export module members | Create aggregation modules for downstream consumers | Available to files that `@use` this file |

**Key distinction:**
- `@use` is for **consumption** (using variables/mixins in the current file)
- `@forward` is for **aggregation** (making variables/mixins available to downstream files)

### The @forward Rule for Variable Re-export

**Current pattern (with @import):**
```scss
// _common.scss (current)
@import 'bootstrap-variables';

// Re-declare variables to make them available
$warning-text-emphasis: shade-color($warning, 60%);
```

**New pattern (with @forward):**
```scss
// _common.scss (migrated)
@forward 'bootstrap-variables';

// Re-declare variables that use forwarded module's functions
@use 'bootstrap-variables' as bv;
$warning-text-emphasis: shade-color(bv.$warning, 60%);
```

**Why both @forward and @use?**
- `@forward 'bootstrap-variables'` makes all Bootstrap variable overrides available to downstream consumers
- `@use 'bootstrap-variables' as bv` allows _common.scss itself to access those variables to compute derived values
- Derived variables are automatically available to downstream consumers as module members

### Module Namespace Access Patterns

When component files use `@use '../../common/common' as *`, they get wildcard namespace access:

```scss
// Component file
@use '../../common/common' as *;

// Direct access (no prefix needed)
background-color: $secondary-color;
color: $gray-800;

// Functions also available without prefix
$subtle-bg: tint-color($warning, 80%);
```

**Alternative namespace patterns:**

```scss
// Explicit namespace
@use '../../common/common' as common;
background-color: common.$secondary-color;

// Default namespace (uses filename)
@use '../../common/common';
background-color: common.$secondary-color;
```

**Decision for SeedSync:** Keep wildcard namespace (`as *`) to maintain existing component code compatibility.

## Integration with Angular Architecture

### Angular CLI Build Process with @use

Angular CLI's SCSS preprocessor (sass-embedded) resolves `@use` rules using:

1. **Relative paths first:** `@use '../../common/common'` resolves relative to current file
2. **Load paths second:** Can be configured in `angular.json` via `stylePreprocessorOptions.includePaths`
3. **node_modules fallback:** Automatically checks `node_modules/` for packages

**Current configuration analysis:**
- No `stylePreprocessorOptions.includePaths` in angular.json (default behavior)
- Bootstrap loaded via full path: `@import '../node_modules/bootstrap/scss/functions'`
- Component files use relative paths: `@use '../../common/common'`

**No configuration changes needed** for @use/@forward migration. Path resolution works identically for both directives.

### ViewEncapsulation and Module Scoping

Angular's component scoping (ViewEncapsulation.Emulated) is **orthogonal** to Sass module scoping:

| Scoping Layer | Mechanism | Scope |
|---------------|-----------|-------|
| **Angular ViewEncapsulation** | Attribute selectors (`[_ngcontent-xxx]`) | CSS selectors are scoped to component template |
| **Sass Module System** | Namespace prefixes | Variables/functions/mixins are scoped to modules |

**Key insight:** Angular's ViewEncapsulation scopes **compiled CSS selectors** to components. Sass's module system scopes **variables/functions/mixins** during SCSS compilation. These are separate concerns that don't interfere with each other.

**Example of both working together:**

```scss
// file.component.scss (SCSS source)
@use '../../common/common' as *;

.file.selected {  // Selector
    background-color: $secondary-color;  // Variable (Sass module scope)
}
```

**Compiled output (CSS):**
```css
/* Angular adds ViewEncapsulation attributes */
.file.selected[_ngcontent-abc-123] {
    background-color: #79DFB6;  /* Variable resolved during Sass compilation */
}
```

**No conflicts:** Module scoping resolves variables at compile-time, ViewEncapsulation scopes selectors at runtime.

### Bootstrap 5.3 and the Module System

**Critical finding:** Bootstrap 5.3 itself **does not use** the Sass module system internally. Bootstrap still uses `@import` for its internal structure. This has implications for how we integrate with it.

**Bootstrap's current architecture:**
```scss
// bootstrap/scss/_functions.scss
// Uses @import internally

// bootstrap/scss/_variables.scss
// Defines variables with !default flag
// Uses @import for dependencies
```

**What this means for migration:**
- We can use `@use` to load Bootstrap modules **from the outside**
- Bootstrap functions like `shade-color()` and `tint-color()` are globally available within the Bootstrap compilation context
- Variable overrides must happen **before** Bootstrap's variables are loaded (same as @import)

**The Bootstrap import sequence must be preserved:**

```scss
// 1. Functions first (required for variable calculations)
@use '../node_modules/bootstrap/scss/functions' as bootstrap-fn;

// 2. Variable overrides BEFORE Bootstrap variables
@use 'app/common/bootstrap-variables' as bv;

// 3. Bootstrap core (uses overrides)
@use '../node_modules/bootstrap/scss/variables' with (
    $primary: bv.$primary,
    $secondary: bv.$secondary,
    // ... other overrides
);
```

**WAIT — configuration constraint discovered:** Bootstrap 5.3 uses `@import` internally, which means:
- Bootstrap's `_variables.scss` doesn't properly expose configurable variables via `@use ... with ()`
- We cannot use `@use` with configuration for Bootstrap until Bootstrap itself migrates to the module system

**Current recommendation:** Keep Bootstrap imports using `@use` for loading, but variable overrides must still happen via separate import ordering (load functions, define overrides, load variables). This is a **hybrid pattern** that works with Bootstrap's current architecture.

## Migration Strategy

### Phase 1: Transform _bootstrap-variables.scss

**Goal:** Convert from global `@import` consumer to module that can be `@forward`ed.

**Current structure:**
```scss
// _bootstrap-variables.scss
// Variable definitions (no imports needed)
$primary: #337BB7;
$secondary: #79DFB6;
```

**After migration:**
```scss
// _bootstrap-variables.scss
// No changes needed - this file only defines variables
// It becomes a pure variable definition module
$primary: #337BB7;
$secondary: #79DFB6;
```

**Confidence:** HIGH — this file is already structured as a pure variable module with no dependencies.

### Phase 2: Transform _common.scss (The Aggregation Module)

**Goal:** Convert from `@import` re-export to `@forward` aggregation pattern.

**Current structure:**
```scss
// _common.scss
@import 'bootstrap-variables';

// Re-export Bootstrap variables
$warning-text-emphasis: shade-color($warning, 60%);
$gray-100: #f8f9fa;

// Custom variables
$small-max-width: 600px;
$sidebar-width: 170px;
```

**After migration:**
```scss
// _common.scss
@forward 'bootstrap-variables';

// Load Bootstrap functions for color calculations
@use '../../../node_modules/bootstrap/scss/functions' as bs;
@use 'bootstrap-variables' as bv;

// Re-export computed Bootstrap semantic variables
$warning-text-emphasis: bs.shade-color(bv.$warning, 60%);
$danger-text-emphasis: bs.shade-color(bv.$danger, 60%);
$warning-bg-subtle: bs.tint-color(bv.$warning, 80%);
$danger-bg-subtle: bs.tint-color(bv.$danger, 80%);
$warning-border-subtle: bs.tint-color(bv.$warning, 60%);
$danger-border-subtle: bs.tint-color(bv.$danger, 60%);

// Re-export Bootstrap gray scale
$gray-100: #f8f9fa;
$gray-300: #dee2e6;
$gray-800: #343a40;

// Custom variables (automatically available to consumers)
$small-max-width: 600px;
$medium-min-width: 601px;
$medium-max-width: 992px;
$large-min-width: 993px;
$sidebar-width: 170px;

// Z-index variables
$zindex-sidebar: 300;
$zindex-top-header: 200;
$zindex-file-options: 201;
$zindex-file-search: 100;
```

**Key changes:**
1. `@forward 'bootstrap-variables'` makes all Bootstrap overrides available to consumers
2. `@use` Bootstrap functions with `bs` namespace for color calculations
3. `@use 'bootstrap-variables' as bv` for accessing variables in calculations
4. Computed variables are defined at module level (automatically available to consumers)

**Critical consideration:** Bootstrap functions (`shade-color`, `tint-color`) are defined in `bootstrap/scss/functions`, not in a module system format. We need to test whether `@use 'bootstrap/scss/functions'` makes these functions available, or if we need to keep using `@import` for Bootstrap dependencies.

**Fallback pattern if Bootstrap functions aren't module-compatible:**
```scss
// _common.scss
@forward 'bootstrap-variables';

// Bootstrap functions still need @import
@import '../../../node_modules/bootstrap/scss/functions';
@use 'bootstrap-variables' as bv;

// Rest of file unchanged
```

### Phase 3: Transform _bootstrap-overrides.scss

**Goal:** Convert post-compilation overrides from `@import` to `@use`.

**Current structure:**
```scss
// _bootstrap-overrides.scss
@import 'bootstrap-variables';

.modal-body {
    overflow-wrap: normal;
    hyphens: auto;
}

[data-bs-theme="dark"] {
    .dropdown-menu {
        --bs-dropdown-bg: #{$primary-color};
    }
}
```

**After migration:**
```scss
// _bootstrap-overrides.scss
@use 'bootstrap-variables' as bv;

.modal-body {
    overflow-wrap: normal;
    hyphens: auto;
}

[data-bs-theme="dark"] {
    .dropdown-menu {
        --bs-dropdown-bg: #{bv.$primary-color};
    }
}

.form-control {
    &:focus {
        border-color: tint-color(bv.$secondary, 50%);
    }
}
```

**Key changes:**
1. `@use 'bootstrap-variables' as bv` loads variables with namespace
2. All variable references use `bv.$` prefix
3. Functions need namespace if available, or may still need `@import` for Bootstrap functions

### Phase 4: Transform styles.scss (Global Entry Point)

**Goal:** Convert Bootstrap imports from `@import` to `@use`.

**Current structure (excerpt):**
```scss
// styles.scss
@import '../node_modules/bootstrap/scss/functions';
@import 'app/common/bootstrap-variables';
@import '../node_modules/bootstrap/scss/variables';
@import '../node_modules/bootstrap/scss/variables-dark';
// ... all Bootstrap components
@import 'app/common/bootstrap-overrides';
@import 'app/common/common';
```

**After migration (target structure):**
```scss
// styles.scss

// 1. Load Bootstrap functions (for variable calculations)
@use '../node_modules/bootstrap/scss/functions' as bs-fn;

// 2. Load our variable overrides
@use 'app/common/bootstrap-variables' as bv;

// 3. Load Bootstrap core with configuration
// NOTE: This may not work with Bootstrap 5.3 - needs testing
@use '../node_modules/bootstrap/scss/variables' as bs-vars with (
    $primary: bv.$primary,
    $secondary: bv.$secondary,
    // ... other overrides
);

// Alternative if configuration doesn't work:
@import '../node_modules/bootstrap/scss/functions';
@forward 'app/common/bootstrap-variables';
@import '../node_modules/bootstrap/scss/variables';

// 4. Bootstrap core systems
@use '../node_modules/bootstrap/scss/variables-dark' as *;
@use '../node_modules/bootstrap/scss/maps' as *;
@use '../node_modules/bootstrap/scss/mixins' as *;
@use '../node_modules/bootstrap/scss/root' as *;

// 5. Bootstrap components
@use '../node_modules/bootstrap/scss/utilities' as *;
@use '../node_modules/bootstrap/scss/reboot' as *;
// ... all other Bootstrap components

// 6. Post-compilation overrides
@use 'app/common/bootstrap-overrides' as *;

// 7. Custom application styles
@use 'app/common/common' as *;
```

**Critical challenge:** Bootstrap 5.3 uses `@import` internally, which makes the `@use ... with ()` configuration pattern unreliable. May need to keep hybrid `@import` approach for Bootstrap core while using `@use` for custom modules.

**Hybrid pattern (more realistic):**
```scss
// styles.scss

// Bootstrap must stay with @import (it uses @import internally)
@import '../node_modules/bootstrap/scss/functions';
@import 'app/common/bootstrap-variables';  // Overrides
@import '../node_modules/bootstrap/scss/variables';
@import '../node_modules/bootstrap/scss/variables-dark';
@import '../node_modules/bootstrap/scss/maps';
@import '../node_modules/bootstrap/scss/mixins';
@import '../node_modules/bootstrap/scss/root';

// Bootstrap components
@import '../node_modules/bootstrap/scss/utilities';
@import '../node_modules/bootstrap/scss/reboot';
// ... (all other components)

// Post-compilation overrides (can use @use)
@use 'app/common/bootstrap-overrides' as *;

// Custom application styles (can use @use)
@use 'app/common/common' as *;
```

**Confidence:** MEDIUM — Bootstrap's lack of module system support may force a hybrid approach where only custom modules use `@use/@forward`.

### Phase 5: Component Files (No Changes Required)

**Component files already use `@use` correctly:**
```scss
@use '../../common/common' as *;
```

**No changes needed.** Component files already follow the module system pattern and will automatically benefit from the transformed `_common.scss` aggregation module.

**Confidence:** HIGH — 16 component files already using correct pattern.

## Migration Order (Dependency-First)

Based on the dependency graph, migrate in this order:

```
1. _bootstrap-variables.scss (leaf node - no dependencies)
   Status: Already compatible (pure variable definitions)
   Changes: None needed

2. _common.scss (depends on _bootstrap-variables.scss)
   Status: Needs transformation
   Changes: Add @forward, convert @import to @use with namespace

3. _bootstrap-overrides.scss (depends on _bootstrap-variables.scss)
   Status: Needs transformation
   Changes: Convert @import to @use with namespace

4. styles.scss (depends on all modules)
   Status: Needs transformation (if Bootstrap allows)
   Changes: Convert custom module @imports to @use, may need hybrid approach for Bootstrap

5. Component files (depend on _common.scss)
   Status: Already migrated
   Changes: None needed
```

**Total files to modify:** 3 files (excluding component files which are already done)
- _common.scss (transform)
- _bootstrap-overrides.scss (transform)
- styles.scss (hybrid approach due to Bootstrap constraints)

## Sources

### Official Documentation (HIGH Confidence)
- [Sass @use Rule](https://sass-lang.com/documentation/at-rules/use/)
- [Sass @forward Rule](https://sass-lang.com/documentation/at-rules/forward/)
- [Sass Module System Launch](https://sass-lang.com/blog/the-module-system-is-launched/)
- [Bootstrap 5.3 Sass Documentation](https://getbootstrap.com/docs/5.3/customize/sass/)
- [Angular Component Styling](https://angular.dev/guide/components/styling)

### Community Resources (MEDIUM Confidence)
- [Understanding @use & @forward](https://aslamdoctor.com/understanding-the-difference-between-import-use-forward-in-sass/)
- [Migrating from @import to @use](https://norato-felipe.medium.com/migrating-from-import-to-use-and-forward-in-sass-175b3a8a6221)
- [Angular SCSS Structure Best Practices](https://dev.to/stefaniefluin/how-to-structure-scss-in-an-angular-app-3376)
- [Sass @use vs @forward](https://kjmonahan.dev/sass-use-vs-forward/)
- [Angular ViewEncapsulation Guide](https://dev.to/manthanank/angular-view-encapsulation-a-practical-guide-to-component-styling-5df2)

### Technical Discussions (MEDIUM Confidence)
- [Bootstrap Sass Module System Issue](https://github.com/sass/migrator/issues/235)
- [Angular CLI SCSS Path Resolution](https://github.com/angular/angular-cli/issues/12981)
- [Bootstrap 5 @use Migration Discussion](https://github.com/orgs/twbs/discussions/41260)
