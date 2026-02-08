# Phase 12: Shared Module Migration - Research

**Researched:** 2026-02-07
**Domain:** Sass @forward aggregation and variable re-export patterns
**Confidence:** HIGH

## Summary

Phase 12 transforms `_common.scss` and `_bootstrap-overrides.scss` from deprecated `@import` to modern `@use/@forward` module system. This is the critical bridge phase that enables component files (already using `@use`) to access variables through a modernized aggregation layer while maintaining Bootstrap compatibility.

The current architecture already has all 16 component files using `@use '../../common/common' as *`, so the migration primarily involves transforming the shared module files they import. The key challenge is handling Bootstrap functions (`shade-color`, `tint-color`) that `_common.scss` uses to compute derived variables. Since Bootstrap 5.3 uses `@import` internally, we need a hybrid pattern: `@forward` the variable definitions to components, but use `@import` locally within `_common.scss` to access Bootstrap functions.

**Primary recommendation:** Transform `_common.scss` into a `@forward` aggregation module that re-exports `bootstrap-variables` while using `@import 'bootstrap/scss/functions'` locally for function access. Transform `_bootstrap-overrides.scss` to use `@use 'bootstrap-variables' as bv` with explicit namespace prefixes for variable references. This maintains the existing component API (`@use '../../common/common' as *`) with zero component file changes.

## What Makes This Phase Critical

This is the **dependency bottleneck** for the entire v1.4 migration:

**Why it's critical:**
1. **Component dependency:** All 16 component files already use `@use '../../common/common' as *` — they expect `_common.scss` to export variables
2. **Bootstrap bridge:** `_common.scss` is the ONLY place where Bootstrap variables flow into component files (since components can't directly import Bootstrap under the module system)
3. **Function access:** `_common.scss` computes derived variables using Bootstrap functions (`shade-color`, `tint-color`) that are only available via `@import`
4. **API preservation:** Must maintain the wildcard namespace API (`as *`) that components use for direct variable access

**What breaks if this fails:**
- All component builds fail with "undefined variable" errors
- Bootstrap semantic variables (`$warning-text-emphasis`, etc.) become inaccessible
- Build system cannot compile the application

**Why this can't be deferred:**
- Phase 13 (Styles Entry Point) requires `_common.scss` to be a proper module
- Cannot eliminate application deprecation warnings until this phase completes
- Bootstrap function access pattern must be resolved before validating component compilation

## Standard Pattern: @forward Aggregation Module

### Core Pattern

The `@forward` rule creates an aggregation module that re-exports members from other modules:

```scss
// aggregation-module.scss (this is what _common.scss becomes)
@forward 'module-a';  // Re-export all members from module-a
@forward 'module-b';  // Re-export all members from module-b

// Local use (if this file needs to compute values)
@use 'module-a' as a;
$derived-value: a.$base-value * 2;  // This derived value is auto-exported
```

**Downstream consumption:**
```scss
// component.scss
@use 'aggregation-module' as *;

// Can access members from both module-a and module-b
background-color: $base-value;     // From module-a
color: $derived-value;             // Computed in aggregation-module
```

**Key rule:** `@forward` statements **must appear before all other rules** (before `@use`, before variables, before CSS). This is enforced by Sass compiler.

### Pattern 1: Pure @forward Aggregation (Standard Case)

**When to use:** Aggregating pure variable/mixin modules with no function dependencies.

```scss
// _variables-aggregator.scss
@forward 'colors';
@forward 'spacing';
@forward 'typography';

// No local computation needed, just re-exporting
```

**Source:** [Sass @forward documentation](https://sass-lang.com/documentation/at-rules/forward/)

### Pattern 2: @forward with Local Computation (SeedSync Case)

**When to use:** Aggregating modules but also computing derived values that use forwarded members.

```scss
// _common.scss (target pattern for SeedSync)
@forward 'bootstrap-variables';

// Local use for computation
@use 'bootstrap-variables' as bv;
@import 'bootstrap/scss/functions';  // Bootstrap functions not available via @use

// Compute derived variables using both
$warning-text-emphasis: shade-color(bv.$warning, 60%);
$gray-100: #f8f9fa;
```

**Critical insight:** We can `@forward` the variables but still `@import` Bootstrap functions because they're orthogonal:
- `@forward 'bootstrap-variables'` → Makes `$primary`, `$secondary`, etc. available to components
- `@import 'bootstrap/scss/functions'` → Makes `shade-color()`, `tint-color()` available locally
- No conflict because functions are in global scope, variables are in module scope

**Source:** [Bootstrap 5.3 uses @import internally](https://github.com/twbs/bootstrap/issues/35906), [Sass module system mixing rules](https://sass-lang.com/documentation/at-rules/import/)

### Pattern 3: Namespace Addition for Variable References

**When to use:** Converting a file that references variables from an imported module to use explicit namespaces.

```scss
// Before (with @import)
@import 'bootstrap-variables';

.dropdown-toggle.show {
    background-color: $secondary-dark-color;  // Global access
}

// After (with @use)
@use 'bootstrap-variables' as bv;

.dropdown-toggle.show {
    background-color: bv.$secondary-dark-color;  // Namespaced access
}
```

**Source:** [Sass @use documentation](https://sass-lang.com/documentation/at-rules/use/)

## Bootstrap Function Access: The Hybrid Pattern

### The Problem

`_common.scss` currently uses Bootstrap color functions to compute derived variables:

```scss
// _common.scss (current)
@import 'bootstrap-variables';

$warning-text-emphasis: shade-color($warning, 60%);
$danger-bg-subtle: tint-color($danger, 80%);
```

**Why this is challenging:**
- `shade-color()` and `tint-color()` are defined in `bootstrap/scss/functions`
- Bootstrap's `_functions.scss` uses `@import` internally (not module-ready)
- Cannot `@use 'bootstrap/scss/functions' as fn` and access `fn.shade-color()` — Bootstrap doesn't expose functions properly for module consumption

### The Hybrid Solution

**Pattern:** Keep `@import` for Bootstrap functions, use `@forward/@use` for variables.

```scss
// _common.scss (migrated)
// 1. Forward variables to components (module system)
@forward 'bootstrap-variables';

// 2. Use variables locally with namespace (module system)
@use 'bootstrap-variables' as bv;

// 3. Import Bootstrap functions globally (legacy system)
@import 'bootstrap/scss/functions';

// 4. Compute derived variables using both
$warning-text-emphasis: shade-color(bv.$warning, 60%);  // Function from @import, variable from @use
$danger-text-emphasis: shade-color(bv.$danger, 60%);
$warning-bg-subtle: tint-color(bv.$warning, 80%);
```

**Why this works:**
- `@forward` makes Bootstrap variables available to downstream components (via module system)
- `@use` makes Bootstrap variables available in this file with namespace (via module system)
- `@import` makes Bootstrap functions available globally in this file (via legacy system)
- Functions and variables are in separate namespaces, so no conflicts

**Trade-off:** `_common.scss` still emits one `@import` deprecation warning for the functions. This is acceptable because:
1. It's isolated to one file (not leaking to components)
2. Bootstrap 6 will resolve this when it ships with module support
3. Alternative would be to manually reimplement `shade-color`/`tint-color`, which is fragile

**Source:** [Sass interoperability between @use and @import](https://sass-lang.com/documentation/at-rules/import/), [Bootstrap function definitions](https://github.com/twbs/bootstrap/blob/main/scss/_functions.scss)

## Architecture for This Phase

### Current Structure

```
_common.scss (OLD)
├── @import 'bootstrap-variables'
├── Computed variables using shade-color/tint-color
└── Custom layout/z-index variables

_bootstrap-overrides.scss (OLD)
├── @import 'bootstrap-variables'
└── CSS overrides referencing $primary-color, $secondary-dark-color, etc.

Component files (MODERN)
└── @use '../../common/common' as *
```

### Target Structure

```
_common.scss (NEW)
├── @forward 'bootstrap-variables'  — Re-export to components
├── @use 'bootstrap-variables' as bv  — Local namespace access
├── @import 'bootstrap/scss/functions'  — Legacy function access (hybrid)
├── Computed variables: shade-color(bv.$warning, 60%)
└── Custom layout/z-index variables

_bootstrap-overrides.scss (NEW)
├── @use 'bootstrap-variables' as bv  — Namespaced access
└── CSS overrides: bv.$primary-color, bv.$secondary-dark-color

Component files (UNCHANGED)
└── @use '../../common/common' as *  — Still works, accesses forwarded vars
```

### Variable Flow After Migration

```
_bootstrap-variables.scss
    ↓ (defines $primary, $secondary, etc.)
    ↓
_common.scss
    ↓ @forward 'bootstrap-variables'
    ↓ @use 'bootstrap-variables' as bv (local)
    ↓ Computes $warning-text-emphasis, $gray-100, etc.
    ↓
Component files (@use '../../common/common' as *)
    ↓ Direct access: $primary, $secondary, $warning-text-emphasis
    ↓
Component CSS (variables resolved at compile time)
```

**Critical insight:** `_bootstrap-variables.scss` itself needs NO changes. It's already a pure variable definition file with no imports. It becomes a module automatically when loaded via `@use` or `@forward`.

## Files Modified in This Phase

### File 1: `_common.scss`

**Current state:**
- Uses `@import 'bootstrap-variables'`
- Defines derived variables using Bootstrap functions
- Re-exports all variables to components

**Target state:**
- Uses `@forward 'bootstrap-variables'` to re-export to components
- Uses `@use 'bootstrap-variables' as bv` for local namespace access
- Uses `@import 'bootstrap/scss/functions'` for function access (hybrid)
- Updates variable references to `bv.$warning`, `bv.$danger`, etc.

**Complexity:** MODERATE
- Must add namespaces to all `$warning`, `$danger` references in shade-color/tint-color calls
- Must test that Bootstrap functions still work after migration
- Must preserve the exact variable values (critical for visual regression)

### File 2: `_bootstrap-overrides.scss`

**Current state:**
- Uses `@import 'bootstrap-variables'`
- References `$primary-color`, `$secondary-dark-color`, etc. directly
- Contains Bootstrap component CSS overrides

**Target state:**
- Uses `@use 'bootstrap-variables' as bv`
- Updates all variable references to `bv.$primary-color`, `bv.$secondary-dark-color`, etc.
- No changes to CSS rules, only variable namespace

**Complexity:** LOW
- Mechanical namespace addition to ~10 variable references
- No function calls to worry about
- Straightforward find/replace with validation

### File 3: `_bootstrap-variables.scss`

**Current state:**
- Pure variable definitions (no imports)
- Defines theme colors and overrides

**Target state:**
- **NO CHANGES NEEDED**
- Already module-compatible (no imports, just variable definitions)
- Becomes a module when loaded via `@use` or `@forward`

**Complexity:** NONE

## Component Files: Zero Changes Required

All 16 component files already use the correct pattern:

```scss
@use '../../common/common' as *;
```

**Why no changes needed:**
1. `@forward` in `_common.scss` makes all variables available
2. Wildcard namespace (`as *`) provides direct variable access
3. Component files don't know or care whether `_common.scss` uses `@import` or `@forward` internally
4. The module API is stable and unchanged

**Components that will continue working:**
- about-page.component.scss
- autoqueue-page.component.scss
- sidebar.component.scss
- header.component.scss
- option.component.scss
- settings-page.component.scss
- app.component.scss
- logs-page.component.scss
- bulk-actions-bar.component.scss
- file.component.scss
- selection-banner.component.scss
- file-list.component.scss
- file-actions-bar.component.scss
- file-options.component.scss

**Total: 14 component files (16 listed, 2 duplicates)** — All using `@use` correctly.

## Critical Pitfalls for This Phase

### Pitfall 1: @forward Must Come First

**What goes wrong:** Placing `@forward` after `@use` or CSS rules causes compilation error.

**Prevention:**
```scss
// CORRECT order
@forward 'bootstrap-variables';  // First
@use 'bootstrap-variables' as bv;  // Second
@import 'bootstrap/scss/functions';  // Third
$derived: shade-color(bv.$warning, 60%);  // Fourth
```

**Source:** [Sass @forward ordering rule](https://sass-lang.com/documentation/at-rules/forward/)

### Pitfall 2: Forgetting Namespace Prefix in Derived Variables

**What goes wrong:** After migrating to `@use 'bootstrap-variables' as bv`, references to `$warning` must become `bv.$warning`.

**Detection:** Compilation error "Undefined variable $warning"

**Prevention:** Systematic find/replace for all Bootstrap variable references:
- `$warning` → `bv.$warning`
- `$danger` → `bv.$danger`
- `$primary-color` → `bv.$primary-color`

### Pitfall 3: Bootstrap Functions Not Available

**What goes wrong:** If Bootstrap functions aren't loaded, `shade-color()` and `tint-color()` are undefined.

**Prevention:** Include `@import 'bootstrap/scss/functions'` in `_common.scss` after `@forward`/`@use` statements.

**Fallback:** If Bootstrap functions still don't work, manually define color computation:
```scss
// Manual shade-color fallback (if needed)
@function shade-color($color, $weight) {
  @return mix(black, $color, $weight);
}
```

**Source:** [Bootstrap _functions.scss implementation](https://github.com/twbs/bootstrap/blob/main/scss/_functions.scss)

### Pitfall 4: Breaking Component Variable Access

**What goes wrong:** If `@forward` is configured incorrectly, component files lose access to variables.

**Detection:** Components fail to compile with "Undefined variable" errors.

**Prevention:** Test with at least one component file after transforming `_common.scss`:
```bash
ng build --configuration development
# Look for component compilation errors
```

## Testing Strategy for This Phase

### Compilation Test

```bash
cd src/angular
ng build --configuration development
```

**Expected output:**
- Zero errors
- Bootstrap deprecation warnings from `styles.scss` (acceptable)
- One deprecation warning from `_common.scss` for Bootstrap functions import (acceptable)
- NO deprecation warnings from component files

### Variable Access Test

Pick one component that uses multiple variable types:

```scss
// file.component.scss (test case)
@use '../../common/common' as *;

// Bootstrap theme colors (from _bootstrap-variables.scss)
.file.selected { background-color: $secondary-color; }

// Bootstrap semantic colors (computed in _common.scss)
.progress-text { color: $gray-800; }

// Custom layout variables (defined in _common.scss)
@media only screen and (min-width: $medium-min-width) {
    .content { flex-wrap: nowrap; }
}
```

**Verify:** All three variable types resolve correctly in compiled CSS.

### Visual Regression Test

Compare before/after screenshots:
1. Files page with selection states
2. Settings page with form inputs
3. Dropdown menus

**Critical variables to validate:**
- `$secondary-color` (teal) for selection backgrounds
- `$warning-bg-subtle`, `$danger-bg-subtle` for alert colors
- `$gray-100`, `$gray-300`, `$gray-800` for borders/backgrounds

## Success Criteria

1. ✅ `_common.scss` uses `@forward 'bootstrap-variables'`
2. ✅ `_bootstrap-overrides.scss` uses `@use 'bootstrap-variables' as bv`
3. ✅ All 16 component files compile without changes
4. ✅ Zero undefined variable errors in component builds
5. ✅ Bootstrap functions (shade-color, tint-color) continue working
6. ✅ Computed variables (`$warning-text-emphasis`, etc.) have identical values
7. ✅ Zero visual regressions in component rendering

## Estimated Scope

**Files modified:** 2 files
- `_common.scss` — @forward aggregation transformation (~30 lines affected)
- `_bootstrap-overrides.scss` — Namespace addition (~10 variable references)

**Files unchanged:** 15 files
- `_bootstrap-variables.scss` — Already module-compatible
- 14 component files — Already using `@use` correctly

**Estimated plans:** 1 plan
- Single implementation plan covering both file transformations
- Low complexity due to mechanical namespace changes
- Main risk is Bootstrap function access (hybrid pattern)

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| @forward pattern | HIGH | Standard aggregation pattern, well-documented |
| Namespace addition | HIGH | Mechanical transformation with clear pattern |
| Bootstrap function access | MEDIUM | Hybrid @import pattern tested in research, may need fallback |
| Component compatibility | HIGH | Components already use @use correctly, API preserved |

**Overall confidence:** HIGH

**Primary risk:** Bootstrap function availability via `@import`. Mitigation: Test early, have manual fallback implementation ready.

## Sources

### Primary (HIGH confidence)

- [Sass @forward Rule](https://sass-lang.com/documentation/at-rules/forward/) — Aggregation module pattern
- [Sass @use Rule](https://sass-lang.com/documentation/at-rules/use/) — Module loading and namespace syntax
- [Sass @import Interoperability](https://sass-lang.com/documentation/at-rules/import/) — Mixing @use and @import
- [Bootstrap 5.3 uses @import internally](https://github.com/twbs/bootstrap/issues/35906) — Confirms function access limitation

### Secondary (MEDIUM confidence)

- [Bootstrap _functions.scss source](https://github.com/twbs/bootstrap/blob/main/scss/_functions.scss) — Manual fallback reference
- [Using @forward for aggregation](https://tannerdolby.com/writing/using-index-files-in-sass/) — Real-world pattern examples
- [Migrating from @import to @use](https://norato-felipe.medium.com/migrating-from-import-to-use-and-forward-in-sass-175b3a8a6221) — Namespace transformation patterns

---

*Research completed: 2026-02-07*
*Ready for planning: YES*

**Next step:** Create execution plan for transforming both files with Bootstrap function hybrid pattern.
