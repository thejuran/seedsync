# Architecture Patterns: Bootstrap 5 SCSS in Angular

**Domain:** Bootstrap 5 SCSS Customization in Angular 19
**Researched:** 2026-02-03
**Confidence:** MEDIUM (based on Bootstrap 5 official patterns and Angular SCSS integration)

## Recommended Architecture

### File Structure Overview

```
src/angular/src/
├── styles/
│   ├── _variables.scss          # Bootstrap variable overrides (before import)
│   ├── _bootstrap.scss          # Bootstrap imports (required + optional)
│   ├── _custom-utilities.scss   # Custom utility classes
│   └── _overrides.scss          # Post-import style overrides
├── styles.scss                  # Global styles entry point
├── app/
│   ├── common/
│   │   └── _common.scss         # Shared app variables and mixins
│   └── pages/
│       └── **/*.component.scss  # Component styles
```

### Component Boundaries

| Component | Responsibility | Imports |
|-----------|---------------|---------|
| `styles/_variables.scss` | Override Bootstrap variables BEFORE import | None (pure variables) |
| `styles/_bootstrap.scss` | Import Bootstrap with customizations | `_variables.scss` first |
| `styles/_overrides.scss` | Override compiled Bootstrap classes | `_bootstrap.scss` (indirectly) |
| `app/common/_common.scss` | App-specific shared variables, mixins | Can use Bootstrap variables via `styles.scss` |
| Component `.scss` files | Component-specific styles | `@use 'common'` for app variables |

### Critical Import Order

Bootstrap SCSS customization requires **strict import order** for variable overrides to work:

```scss
// styles.scss - CORRECT ORDER
@use 'styles/variables' as bootstrap-vars;  // 1. Override variables FIRST
@use 'styles/bootstrap';                     // 2. Import Bootstrap (uses overrides)
@use 'styles/overrides';                     // 3. Override compiled classes
@use 'app/common/common' as *;              // 4. App-specific styles
```

**Why this order matters:**
1. Bootstrap variables must be set BEFORE Bootstrap is imported
2. Bootstrap compilation happens during `@use 'bootstrap'`
3. Overrides must come AFTER Bootstrap to have higher specificity
4. App variables can use Bootstrap variables (via transitive imports)

### Current State Analysis

**Existing structure:**
- `src/angular/src/styles.scss` - Global styles entry (minimal)
- `src/angular/src/app/common/_common.scss` - App variables + custom `%button` placeholder
- Component `.scss` files - Import common via `@use '../../common/common'`

**Current issues identified:**
- Bootstrap imported as precompiled CSS (`node_modules/bootstrap/dist/css/bootstrap.min.css`)
- No variable customization possible (CSS is already compiled)
- Custom `%button` placeholder duplicates Bootstrap functionality
- Hardcoded colors in components instead of using Bootstrap theme variables

## Data Flow

### Variable Cascading Pattern

```
Bootstrap Default Variables
    ↓ (overridden by)
styles/_variables.scss
    ↓ (compiled into)
Bootstrap Components & Utilities
    ↓ (referenced by)
app/common/_common.scss
    ↓ (used by)
Component .scss files
```

### Build-Time Resolution

Angular's SCSS compilation happens per-file with module resolution:

1. **Global styles** (`styles.scss`): Compiled once, injected into `<head>`
2. **Component styles**: Compiled separately, scoped via ViewEncapsulation
3. **Shared partials**: Resolved via `@use` statements at build time

**Key insight:** Each component's SCSS is isolated by default. Variables must be explicitly imported via `@use`.

## Patterns to Follow

### Pattern 1: Variable Overrides
**What:** Override Bootstrap variables BEFORE importing Bootstrap
**When:** Customizing colors, spacing, breakpoints, etc.
**Example:**
```scss
// styles/_variables.scss
@use 'sass:map';

// Override primary color
$primary: #337BB7;
$secondary: #79DFB6;

// Override spacing scale
$spacer: 1rem;
$spacers: (
  0: 0,
  1: $spacer * .25,
  2: $spacer * .5,
  3: $spacer,
  4: $spacer * 1.5,
  5: $spacer * 3,
);

// Add custom color to theme
$custom-colors: (
  "seed-green": #32AD7B
);
```

### Pattern 2: Selective Component Import
**What:** Import only needed Bootstrap components to reduce bundle size
**When:** Production builds where bundle size matters
**Example:**
```scss
// styles/_bootstrap.scss

// Required Bootstrap core
@import '~bootstrap/scss/functions';
@import '~bootstrap/scss/variables';
@import '~bootstrap/scss/variables-dark';
@import '~bootstrap/scss/maps';
@import '~bootstrap/scss/mixins';
@import '~bootstrap/scss/utilities';
@import '~bootstrap/scss/root';
@import '~bootstrap/scss/reboot';

// Optional components (import only what you use)
@import '~bootstrap/scss/type';
@import '~bootstrap/scss/containers';
@import '~bootstrap/scss/grid';
@import '~bootstrap/scss/forms';
@import '~bootstrap/scss/buttons';
@import '~bootstrap/scss/transitions';
@import '~bootstrap/scss/dropdown';
@import '~bootstrap/scss/nav';
@import '~bootstrap/scss/navbar';
@import '~bootstrap/scss/card';
@import '~bootstrap/scss/modal';
@import '~bootstrap/scss/close';

// Utilities API (generates utility classes)
@import '~bootstrap/scss/utilities/api';
```

### Pattern 3: Custom Utilities
**What:** Extend Bootstrap's utility API with domain-specific utilities
**When:** Repeated patterns that should be utility classes
**Example:**
```scss
// styles/_custom-utilities.scss
@use 'sass:map';
@use '~bootstrap/scss/functions' as *;
@use '~bootstrap/scss/variables' as *;
@use '~bootstrap/scss/maps' as *;
@use '~bootstrap/scss/mixins' as *;

// Add custom utilities to Bootstrap's API
$utilities: map-merge(
  $utilities,
  (
    "cursor": (
      property: cursor,
      class: cursor,
      responsive: true,
      values: auto default pointer not-allowed
    ),
    "user-select": (
      property: user-select,
      class: user-select,
      values: auto none all
    )
  )
);
```

### Pattern 4: Angular ViewEncapsulation Integration
**What:** Understand how Angular's component scoping interacts with global Bootstrap styles
**When:** All component development
**Example:**
```typescript
// Component with ViewEncapsulation.Emulated (default)
@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.scss'],
  encapsulation: ViewEncapsulation.Emulated  // Default
})
```

**Behavior:**
- Bootstrap classes from `styles.scss` are global (no scope)
- Component styles get `_ngcontent-*` attributes for scoping
- `:host` selector targets component's host element
- Global Bootstrap styles can be overridden in component SCSS

**Gotcha:** Component SCSS specificity must be higher than global styles to override.

### Pattern 5: Shared Variables via @use
**What:** Share variables between files using Sass modules (`@use`)
**When:** Components need access to theme variables or mixins
**Example:**
```scss
// app/common/_common.scss
@use 'sass:color';

// Re-export Bootstrap variables for components
@forward '../../styles/variables';

// App-specific variables
$sidebar-width: 170px;
$zindex-sidebar: 300;

// App-specific mixins using Bootstrap variables
@mixin button-variant($color) {
  background-color: $color;
  border-color: color.adjust($color, $lightness: -10%);

  &:hover {
    background-color: color.adjust($color, $lightness: -5%);
  }
}
```

```scss
// Component using shared variables
@use '../../common/common' as *;

.sidebar {
  width: $sidebar-width;
  z-index: $zindex-sidebar;
}

.custom-button {
  @include button-variant($primary);
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Using Precompiled Bootstrap CSS
**What:** Importing `bootstrap/dist/css/bootstrap.min.css` instead of SCSS source
**Why bad:**
- Cannot customize variables
- Cannot tree-shake unused components
- Larger bundle size
- Defeats the purpose of SCSS customization
**Instead:** Import Bootstrap SCSS source and compile with your variables

**Current state:** Project currently does this (line 36 of `angular.json`)
```json
"styles": [
  "node_modules/bootstrap/dist/css/bootstrap.min.css",  // ❌ Precompiled
  "src/styles.scss"
]
```

**Should be:**
```json
"styles": [
  "src/styles.scss"  // ✓ Compiles Bootstrap from source with overrides
]
```

### Anti-Pattern 2: Hardcoding Theme Colors
**What:** Using hardcoded hex values instead of Bootstrap theme variables
**Why bad:**
- Theming requires finding/replacing all hardcoded values
- Inconsistent colors across the app
- Cannot leverage Bootstrap's color utilities
**Instead:** Use Bootstrap's semantic color variables

**Current state:** `_common.scss` has hardcoded colors
```scss
// ❌ Hardcoded - should use Bootstrap variables
$primary-color: #337BB7;
$secondary-color: #79DFB6;
```

**Should be:**
```scss
// ✓ Override Bootstrap's theme variables
$primary: #337BB7;
$secondary: #79DFB6;
```

### Anti-Pattern 3: Duplicating Bootstrap Components
**What:** Creating custom components/placeholders that Bootstrap already provides
**Why bad:**
- Reinvents the wheel
- Inconsistent with Bootstrap's API
- Harder to maintain
**Instead:** Use Bootstrap's button variants, utilities, and mixins

**Current state:** Custom `%button` placeholder in `_common.scss`
```scss
// ❌ Duplicates Bootstrap's button styling
%button {
    background-color: $primary-color;
    color: white;
    border: 1px solid $primary-dark-color;
    // ... more styles
}
```

**Should be:**
```scss
// ✓ Use Bootstrap's button-variant mixin
@use '~bootstrap/scss/mixins/buttons' as *;

.custom-button {
  @include button-variant($primary);
}

// Or use Bootstrap classes directly in HTML:
// <button class="btn btn-primary">...</button>
```

### Anti-Pattern 4: @import Instead of @use/@forward
**What:** Using deprecated `@import` instead of modern Sass module system
**Why bad:**
- `@import` is deprecated in Dart Sass
- Creates global namespace pollution
- Doesn't support namespacing or selective imports
**Instead:** Use `@use` for imports, `@forward` for re-exports

```scss
// ❌ Old way (deprecated)
@import '~bootstrap/scss/bootstrap';

// ✓ New way (Sass modules)
@use '~bootstrap/scss/bootstrap' as *;
```

### Anti-Pattern 5: Mixing Global and Component Variables
**What:** Defining app-wide variables in component SCSS files
**Why bad:**
- Variables not reusable across components
- Duplicated definitions
- Harder to maintain consistency
**Instead:** Define shared variables in `app/common/_common.scss`

## Build Order Implications

### Angular SCSS Compilation Pipeline

```
angular.json "styles" array
    ↓
styles.scss (entry point)
    ↓ resolve @use statements
├── styles/_variables.scss
├── styles/_bootstrap.scss (imports Bootstrap SCSS)
│       ↓ resolve Bootstrap @imports
│       ├── ~bootstrap/scss/functions
│       ├── ~bootstrap/scss/variables (uses overrides)
│       └── ... other Bootstrap files
└── styles/_overrides.scss
    ↓
Compiled CSS → injected into index.html <head>
```

**Component SCSS compilation (parallel):**
```
file.component.scss
    ↓ resolve @use statements
app/common/_common.scss
    ↓ resolve @forward
styles/_variables.scss (Bootstrap variables available)
    ↓
Compiled CSS → scoped with _ngcontent-* attributes
```

### Critical Timing Issues

**Issue 1: Bootstrap Variables Not Available in Components**
- **Problem:** Components import `app/common/_common.scss`, but Bootstrap variables aren't available
- **Cause:** `_common.scss` doesn't forward Bootstrap variables
- **Solution:** Use `@forward` in `_common.scss`:
  ```scss
  // app/common/_common.scss
  @forward '../../styles/variables';  // Make Bootstrap variables available
  ```

**Issue 2: Circular Dependencies**
- **Problem:** File A imports B, B imports A → build error
- **Cause:** Poor separation of variables vs. styles
- **Solution:** Separate concerns - variables in one file, styles in another

**Issue 3: Duplicate CSS Output**
- **Problem:** Each component that `@use`s Bootstrap generates duplicate Bootstrap CSS
- **Cause:** Using `@use` incorrectly - imports everything
- **Solution:** Only `@use` variables/mixins in components, import full Bootstrap once in `styles.scss`

### Migration Order

When migrating from precompiled CSS to SCSS source, follow this order to avoid breaking changes:

**Phase 1: Setup Bootstrap SCSS Import**
1. Create `styles/_variables.scss` with Bootstrap variable overrides
2. Create `styles/_bootstrap.scss` with selective Bootstrap imports
3. Update `styles.scss` to import the new structure
4. Update `angular.json` to remove precompiled CSS reference
5. Verify build completes without errors

**Phase 2: Migrate Custom Variables**
1. Map custom colors in `_common.scss` to Bootstrap theme variables
2. Update `_variables.scss` to override Bootstrap with these values
3. Update component SCSS to use Bootstrap variable names
4. Remove duplicate variable definitions from `_common.scss`

**Phase 3: Replace Custom Components**
1. Identify custom placeholders/mixins that Bootstrap provides
2. Replace custom implementations with Bootstrap equivalents
3. Update component HTML/SCSS to use Bootstrap classes
4. Remove unused custom code from `_common.scss`

**Phase 4: Optimize Bundle**
1. Audit which Bootstrap components are actually used
2. Remove unused component imports from `_bootstrap.scss`
3. Measure bundle size reduction
4. Consider splitting vendor CSS if needed

## Integration with Angular ViewEncapsulation

### How Angular Scopes Styles

Angular uses three ViewEncapsulation modes:

| Mode | Behavior | Bootstrap Integration |
|------|----------|----------------------|
| **Emulated** (default) | Adds `_ngcontent-*` attributes to scope styles | Bootstrap classes work globally, component styles scoped |
| **None** | No encapsulation, styles are global | Same as global `styles.scss` - use with caution |
| **ShadowDom** | Uses native Shadow DOM | Bootstrap classes DON'T penetrate Shadow DOM boundary |

**Recommendation:** Stick with **Emulated** (default) for Bootstrap integration. ShadowDom would require including Bootstrap inside each component.

### Specificity Rules

When component SCSS needs to override Bootstrap:

```scss
// styles.scss (global)
.btn-primary {
  background-color: $primary;  // Specificity: 0-1-0
}

// Component SCSS
:host .btn-primary {
  background-color: $custom-color;  // Specificity: 0-2-0 (wins)
}
```

**Key insight:** `:host` selector adds specificity, allowing component overrides without `!important`.

### Common Patterns

**Pattern: Override Bootstrap component in specific component**
```scss
// file.component.scss
.btn-primary {
  // This will be scoped to this component only
  background-color: $secondary-dark-color;
}
```

**Pattern: Use Bootstrap utilities with component styles**
```html
<!-- file.component.html -->
<div class="d-flex align-items-center custom-container">
  <!-- Bootstrap utilities (d-flex, align-items-center) + custom class -->
</div>
```

```scss
// file.component.scss
.custom-container {
  // Component-specific styles that work WITH Bootstrap utilities
  padding: 10px;
}
```

## Testing Considerations

### SCSS Compilation in Tests

Karma test configuration must include `styles.scss`:

```json
// angular.json - test configuration
"test": {
  "styles": [
    "src/styles.scss"  // Compiles Bootstrap for tests
  ]
}
```

**Current state:** Tests use precompiled CSS (same as build)
**After migration:** Tests will compile SCSS (matches build)

### Component Test Isolation

**Issue:** Component tests run with compiled CSS but without full DOM context
**Solution:** Use `TestBed` with style compilation:

```typescript
TestBed.configureTestingModule({
  declarations: [FileComponent],
  // Styles automatically compiled from component metadata
});
```

**Gotcha:** Global `styles.scss` is available in tests, but component styles are isolated.

## Performance Considerations

### Build Time Impact

| Approach | Build Time | Bundle Size | Customizable |
|----------|------------|-------------|--------------|
| Precompiled CSS | Fast (no compilation) | Large (includes all Bootstrap) | No |
| Full Bootstrap SCSS | Medium (compiles all) | Large (includes all Bootstrap) | Yes |
| Selective Bootstrap SCSS | Medium-Slow (compiles subset) | Small (only used components) | Yes |

**Recommendation for SeedSync:** Start with full Bootstrap SCSS for simplicity, optimize later if needed.

### Runtime Performance

- **No runtime impact:** SCSS compiles to CSS at build time
- **Bundle size matters:** Smaller CSS = faster initial load
- **Critical CSS:** Consider inlining critical styles for above-the-fold content

### Development Experience

**Hot reload:** Angular dev server recompiles SCSS on change
- Full Bootstrap SCSS: ~2-3 seconds to recompile
- Component SCSS: <1 second (only that component)

**Recommendation:** Use selective imports for faster incremental builds during development.

## Sources

**Confidence Level: MEDIUM**

Based on:
- Bootstrap 5 official documentation patterns (SCSS customization, theming API)
- Angular CLI SCSS integration (build pipeline, ViewEncapsulation)
- Sass module system (`@use`/`@forward`) - official Dart Sass documentation
- Current SeedSync codebase analysis

**Not verified:**
- Specific Bootstrap 5.3.3 SCSS file structure (would need to inspect `node_modules/bootstrap/scss/`)
- Angular 19.2 SCSS compilation behavior changes (assuming consistent with Angular 12+)
- Bundle size impact of selective imports (would need to measure)

**Gaps:**
- Exact Bootstrap component dependencies (which components require which others)
- Performance benchmarks for this specific project
- Migration effort estimation (would need to audit all component SCSS files)
