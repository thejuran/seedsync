# Domain Pitfalls: Bootstrap 5 SCSS Styling Migration

**Domain:** CSS/SCSS refactoring and Bootstrap 5 customization in Angular
**Researched:** 2026-02-03
**Confidence:** MEDIUM-HIGH (Official Bootstrap 5.3 docs verified, patterns validated against SeedSync codebase)

## Critical Pitfalls

Mistakes that cause rewrites, visual regressions, or broken builds.

### Pitfall 1: Pre-compiled CSS to SCSS Migration Breaking Change

**What goes wrong:** The project currently imports pre-compiled Bootstrap CSS (`bootstrap.min.css`). Switching to SCSS imports to enable customization breaks the entire build if not done correctly, and custom variables won't work with pre-compiled CSS.

**Why it happens:**
- `angular.json` currently imports `node_modules/bootstrap/dist/css/bootstrap.min.css`
- Pre-compiled CSS cannot be customized via SCSS variables
- Developers assume they can just add SCSS variable overrides without changing the import strategy

**Consequences:**
- Build failures if imports are switched incorrectly
- Variable overrides silently ignored if pre-compiled CSS still loaded
- Duplicate Bootstrap CSS (both pre-compiled and SCSS-compiled) causing bloat and specificity conflicts
- Loss of existing Bootstrap styles if migration is incomplete

**Prevention:**
1. **Phase 1 must establish proper SCSS import structure:**
   ```scss
   // In styles.scss, REPLACE bootstrap.min.css import with:

   // 1. Import Bootstrap functions first
   @import 'bootstrap/scss/functions';

   // 2. Define variable overrides BEFORE importing variables
   $primary: #337BB7;  // From existing _common.scss
   $secondary: #79DFB6;

   // 3. Import Bootstrap variables
   @import 'bootstrap/scss/variables';
   @import 'bootstrap/scss/variables-dark';
   @import 'bootstrap/scss/maps';

   // 4. Override maps if needed (after maps are defined)

   // 5. Import rest of Bootstrap
   @import 'bootstrap/scss/mixins';
   @import 'bootstrap/scss/root';
   @import 'bootstrap/scss/reboot';
   @import 'bootstrap/scss/utilities';
   // ... other component imports as needed
   ```

2. **Remove pre-compiled CSS from angular.json:**
   - Delete `node_modules/bootstrap/dist/css/bootstrap.min.css` from `styles` array
   - Keep `bootstrap.bundle.min.js` for JavaScript components

3. **Test incrementally:**
   - Verify build succeeds before applying any customizations
   - Check that existing Bootstrap components still render correctly
   - Use browser DevTools to confirm only one Bootstrap CSS source is loading

**Detection:**
- Build fails with SCSS compilation errors
- Browser DevTools shows both `bootstrap.min.css` and compiled SCSS
- Custom variables don't affect Bootstrap components
- File size unexpectedly doubles

**Phase assignment:** Phase 1 (Foundation) - Must be established before any other work

---

### Pitfall 2: SCSS Import Order Violations

**What goes wrong:** Bootstrap 5 requires strict import order. Variables must come after functions but before maps. Maps must come before mixins. Violating this order causes cryptic compilation errors or variables that don't take effect.

**Why it happens:**
- Bootstrap v5 split `_variables.scss` into separate `_variables.scss` and `_maps.scss` files (v5.2.0+)
- Sass no longer provides default map merging
- Developers familiar with Bootstrap 4 use old import patterns

**Consequences:**
- Compilation errors: "Undefined variable", "Map key not found"
- Variable overrides silently ignored (Bootstrap defaults used instead)
- Custom colors don't propagate to dependent utilities
- Build succeeds but customizations don't apply

**Prevention:**
**REQUIRED import order (from official Bootstrap 5.3 docs):**

```scss
// 1. Functions (ALWAYS FIRST)
@import 'bootstrap/scss/functions';

// 2. Variable overrides (AFTER functions, BEFORE variables)
$primary: #custom-color;

// 3. Variables
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/variables-dark';  // If using dark mode

// 4. Maps (NEW in Bootstrap 5.2.0 - REQUIRED)
@import 'bootstrap/scss/maps';

// 5. Map overrides (AFTER maps are defined)
$theme-colors: map-merge($theme-colors, ('custom': #df711b));

// 6. Mixins (AFTER variables and maps)
@import 'bootstrap/scss/mixins';

// 7. Utilities API (LAST)
@import 'bootstrap/scss/utilities';
```

**Never do this:**
```scss
// WRONG: Variables before functions
@import 'bootstrap/scss/variables';
$primary: #custom-color;  // Too late!
@import 'bootstrap/scss/functions';

// WRONG: Missing maps import
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/mixins';  // Map-dependent mixins will fail

// WRONG: Map overrides before maps are imported
$theme-colors: map-merge(...);  // map-merge() not available yet
@import 'bootstrap/scss/maps';
```

**Detection:**
- Sass compilation errors mentioning undefined variables or functions
- Custom `$primary` color doesn't appear in `.btn-primary`
- DevTools shows Bootstrap's default blue instead of custom color
- "Function map-merge() not found" errors

**Phase assignment:** Phase 1 (Foundation) - Document and enforce in initial setup

---

### Pitfall 3: CSS Specificity Wars (Custom Placeholders vs Bootstrap Classes)

**What goes wrong:** Existing custom `%button` placeholder styles conflict with Bootstrap `.btn` classes. Specificity issues cause styles to apply inconsistently, or custom styles override Bootstrap's hover/focus/disabled states incorrectly.

**Why it happens:**
- SCSS placeholders (`@extend %button`) generate selector chains that may have different specificity than Bootstrap's `.btn` class
- Custom styles don't account for Bootstrap's hover (`.btn:hover`), focus (`.btn:focus`), active (`.btn:active`), and disabled (`.btn:disabled`) pseudo-classes
- Bootstrap 5 uses CSS variables internally, which have different override behavior than direct property declarations

**Consequences:**
- Buttons look correct in default state but broken on hover/focus
- Disabled buttons don't look disabled (opacity not applying)
- Selected state (`.selected` class) conflicts with Bootstrap's `.active` state
- Inconsistent styling across different button instances
- Hard-to-debug visual regressions

**Current risky pattern in SeedSync:**
```scss
// _common.scss
%button {
    background-color: $primary-color;  // Direct property
    color: white;
    border: 1px solid $primary-dark-color;
    cursor: default;  // Conflicts with Bootstrap's cursor: pointer

    &:active {
        background-color: #286090;  // Hardcoded hex instead of variable
    }

    &.selected {
        background-color: $secondary-color;  // Custom state
        border-color: $secondary-darker-color;
    }
}

// file.component.scss
.actions .button {
    @extend %button;  // Generates complex selector
    // More custom properties...
}
```

**Prevention:**

**Strategy A: Extend Bootstrap classes instead of replacing them**
```scss
// RECOMMENDED: Build on Bootstrap, don't replace it
.actions .button {
    @extend .btn;
    @extend .btn-primary;

    // Only add non-conflicting custom properties
    width: 60px;
    height: 60px;

    // Use Bootstrap's state classes
    &.loading {
        @extend .btn-primary;
        // Custom loading state additions only
    }
}
```

**Strategy B: Use Bootstrap CSS variables for customization (Bootstrap 5.2+)**
```scss
// BEST: Let Bootstrap handle states, customize via variables
.actions .button {
    @extend .btn;
    @extend .btn-primary;

    // Override Bootstrap's CSS variables
    --bs-btn-padding-x: 0;
    --bs-btn-padding-y: 0;
    --bs-btn-font-size: 12px;

    width: 60px;
    height: 60px;
}
```

**Strategy C: Use Bootstrap's Sass mixins (most control)**
```scss
.actions .button {
    // Use Bootstrap's button-variant mixin
    @include button-variant(
        $primary-color,        // background
        $primary-dark-color,   // border
        white,                 // color
        // Hover/active states calculated automatically
    );

    width: 60px;
    height: 60px;
}
```

**For custom states (like `.selected`):**
```scss
.actions .button {
    @extend .btn;
    @extend .btn-primary;

    // Add custom state AFTER Bootstrap states
    &.selected {
        // Use Bootstrap's CSS variables for consistency
        --bs-btn-bg: #{$secondary-color};
        --bs-btn-border-color: #{$secondary-darker-color};
        --bs-btn-color: white;
    }
}
```

**Detection:**
- Button hover states don't work
- DevTools shows crossed-out styles (specificity conflicts)
- Disabled buttons still look clickable
- Inconsistent button appearance across pages
- Custom states (like `.selected`) don't override properly

**Phase assignment:**
- Phase 2 (Button Migration) - Apply strategy when migrating each button
- Phase 4 (Visual Testing) - Verify all states work correctly

---

### Pitfall 4: Hardcoded Hex Colors Breaking Variable Unification

**What goes wrong:** Existing code has hardcoded hex colors (like `#286090` in `:active` state) that don't update when SCSS variables change. This creates inconsistent color schemes and makes the teal unification incomplete.

**Why it happens:**
- Legacy code predates SCSS variable system
- Copy-paste from old codebases
- Developers don't realize the hardcoded value is derived from a variable

**Consequences:**
- Color scheme changes don't apply everywhere
- Visual inconsistencies (same semantic color appears different in different places)
- Failed QA testing because "not all buttons are teal"
- Extra rework to hunt down hardcoded values

**Current examples in SeedSync:**
```scss
%button {
    &:active {
        background-color: #286090;  // Should be darken($primary-color, X%)
    }
}

// file.component.scss line 78
accent-color: $secondary-dark-color;  // Good: uses variable

// Other files may have:
border-color: #D3D3D3;  // Should be $header-dark-color
```

**Prevention:**

1. **Phase 1: Audit for hardcoded colors:**
   ```bash
   # Find all hex colors in SCSS files
   grep -rn "#[0-9A-Fa-f]\{6\}" src/**/*.scss

   # Document each occurrence:
   # - Which variable should it use?
   # - Or is it truly unique?
   ```

2. **Phase 2: Replace with variable references or functions:**
   ```scss
   // BEFORE
   &:active {
       background-color: #286090;
   }

   // AFTER: Use Bootstrap's shade-color function
   &:active {
       background-color: shade-color($primary-color, 20%);
   }

   // Or define explicit variables
   $primary-active-color: shade-color($primary-color, 20%);
   &:active {
       background-color: $primary-active-color;
   }
   ```

3. **Phase 2: Use Bootstrap color functions (NOT Sass's lighten/darken):**
   - `tint-color($color, $percentage)` - Lightens by mixing with white
   - `shade-color($color, $percentage)` - Darkens by mixing with black
   - `shift-color($color, $percentage)` - Shifts towards black or white
   - `color-contrast($color)` - Returns white or black for contrast

   **Never use Sass's `lighten()` or `darken()` - they're less consistent**

4. **Document which colors are intentionally unique:**
   ```scss
   // Loader spinner color - intentionally matches secondary dark for contrast
   $loader-border-top-color: $secondary-dark-color;  // Not derived from primary
   ```

**Detection:**
- `grep -r "#[0-9A-Fa-f]\{6\}"` finds hardcoded hex colors
- Visual regression: changing `$primary-color` doesn't update all primary elements
- QA reports "some buttons are still blue"

**Phase assignment:**
- Phase 1 (Foundation) - Audit and document all hardcoded colors
- Phase 2 (Button Migration) - Replace hardcoded colors with variables/functions
- Phase 4 (Visual Testing) - Verify color consistency

---

### Pitfall 5: Angular ViewEncapsulation Breaking Bootstrap Global Styles

**What goes wrong:** Angular components use `ViewEncapsulation.Emulated` by default, which scopes CSS to the component. Bootstrap classes applied in component templates may not receive Bootstrap styles if the styles are globally imported but the component has scoped styles that override them.

**Why it happens:**
- Bootstrap styles are global (in `styles.scss`)
- Angular adds scope attributes like `[_ngcontent-c0]` to component elements
- Component-level SCSS files with higher specificity override global Bootstrap styles

**Consequences:**
- Bootstrap classes (like `.btn`, `.btn-primary`) don't work as expected in component templates
- Styles work in development but break in production (different compilation)
- Inconsistent styling between components
- Hard-to-debug CSS issues

**Example of the problem:**
```typescript
// file.component.ts
@Component({
  selector: 'app-file',
  templateUrl: './file.component.html',
  styleUrls: ['./file.component.scss'],
  // encapsulation: ViewEncapsulation.Emulated (default)
})

// file.component.html
<button class="btn btn-primary">Download</button>
<!-- Angular compiles to: <button _ngcontent-c0 class="btn btn-primary"> -->

// file.component.scss
.button {
  width: 60px;  // This selector becomes .button[_ngcontent-c0]
}

// If you have:
.btn {
  width: 100px;  // This becomes .btn[_ngcontent-c0]
  // Now your scoped .btn has HIGHER specificity than Bootstrap's global .btn
  // Result: your width overrides Bootstrap's
}
```

**Prevention:**

**Option 1: Use ::ng-deep (cautiously)**
```scss
// file.component.scss
::ng-deep .btn-primary {
  // Override Bootstrap styles at global level
  // WARNING: This affects ALL .btn-primary globally!
}
```

**Option 2: Use :host selector for component boundaries**
```scss
// file.component.scss
:host {
  .btn-primary {
    // Scoped to this component only
  }
}
```

**Option 3: Move Bootstrap customizations to styles.scss (RECOMMENDED)**
```scss
// styles.scss (global)
.btn-primary {
  // Bootstrap customizations here affect all components
}

// file.component.scss (component-scoped)
.custom-file-button {
  // Component-specific styles that don't conflict with Bootstrap
  // Don't use .btn class name here
}
```

**Option 4: Don't override Bootstrap class names in component styles**
```scss
// file.component.scss
// DON'T DO THIS:
.btn { width: 60px; }  // Conflicts with Bootstrap

// DO THIS:
.file-action-button { width: 60px; }  // Custom class name
```

**Best practice for SeedSync migration:**
1. Keep Bootstrap class usage in component templates (HTML)
2. Put Bootstrap customizations in `styles.scss` or a shared `_bootstrap-overrides.scss`
3. Use component SCSS only for component-specific layout/positioning
4. Don't mix Bootstrap class names with custom class names in the same element
5. Use custom class names for component-specific styles

**Detection:**
- Bootstrap classes don't apply styles in component templates
- DevTools shows Bootstrap styles exist but are crossed out due to specificity
- Styles work differently in different components
- Production build has different styling than dev build

**Phase assignment:**
- Phase 1 (Foundation) - Document encapsulation strategy
- Phase 2-3 (Migration) - Follow strategy consistently
- Phase 4 (Visual Testing) - Verify all components render correctly

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or require refactoring.

### Pitfall 6: Dart Sass Deprecation Warnings Causing Noise

**What goes wrong:** Bootstrap 5.3.3 uses Sass features that trigger deprecation warnings in Dart Sass (the current compiler). Builds succeed but console is flooded with warnings, making it hard to spot real issues.

**Why it happens:**
- Bootstrap uses `@import` instead of `@use` (Sass is transitioning)
- Bootstrap uses legacy color functions
- Dart Sass warns about upcoming breaking changes

**Consequences:**
- Noisy build output (hundreds of warning lines)
- Real warnings get lost in the noise
- Developer fatigue (ignoring all warnings)
- Fear that something is broken (it's not)

**Prevention:**
1. **Document that warnings are expected (from official Bootstrap docs):**
   ```
   KNOWN ISSUE: Bootstrap 5.3.3 generates Dart Sass deprecation warnings.
   These are harmless and do NOT prevent compilation or usage.
   Bootstrap team is working on a fix for Bootstrap 6.
   ```

2. **Suppress Sass warnings from node_modules (if needed):**
   ```json
   // angular.json
   "options": {
     "stylePreprocessorOptions": {
       "quietDeps": true  // Suppresses warnings from node_modules
     }
   }
   ```

3. **Don't waste time fixing Bootstrap's warnings:**
   - You can't fix them without modifying Bootstrap source
   - They don't affect your build
   - Focus on your own SCSS warnings

**Detection:**
- Build output shows deprecation warnings mentioning `@import` or color functions
- Warnings come from `node_modules/bootstrap/scss/` files

**Phase assignment:** Phase 1 (Foundation) - Document and suppress if needed

---

### Pitfall 7: Selection Color Unification Breaking Existing Visual Hierarchy

**What goes wrong:** Unifying all selection colors to teal removes visual distinction between different types of selection (file details selection vs bulk checkbox selection). Users lose important visual feedback.

**Why it happens:**
- Project goal is to unify colors
- Developers assume "one selection color" is simpler
- Missing UX review of the change

**Current GOOD pattern in SeedSync:**
```scss
// file.component.scss
.file.selected {
    background-color: $secondary-color;  // Full teal
}
.file.bulk-selected {
    background-color: rgba($secondary-color, 0.3);  // Transparent teal
}
.file.selected.bulk-selected {
    background-color: $secondary-color;  // Full teal wins
}
```

**This is actually GOOD - it provides:**
- Visual hierarchy (selected = full color, bulk = transparent)
- Clear distinction between "viewing details" and "checked for action"
- Consistent color family (both use `$secondary-color`)

**Prevention:**
1. **Keep semantic meaning in color variations:**
   - Primary selection: Full opacity teal
   - Bulk selection: Transparent teal (30-50% opacity)
   - Hover: Light teal
   - Disabled: Gray (don't use teal)

2. **Use Bootstrap's color utilities for consistency:**
   ```scss
   .file.selected {
       background-color: $secondary-color;
   }
   .file.bulk-selected {
       background-color: rgba($secondary-color, 0.3);
       // Or use Bootstrap opacity utilities in HTML:
       // <div class="opacity-30 bg-secondary">
   }
   ```

3. **Document the color semantics:**
   ```scss
   // _common.scss or dedicated _colors.scss

   // Selection colors (teal family)
   $selection-primary: $secondary-color;              // Full selection
   $selection-secondary: rgba($secondary-color, 0.3); // Bulk selection
   $selection-hover: $secondary-light-color;          // Hover state
   ```

4. **Test with stakeholders BEFORE implementation:**
   - Show mockups of unified colors
   - Verify that visual distinctions are still clear
   - Confirm that accessibility (contrast) is maintained

**Detection:**
- User testing feedback: "Can't tell what's selected"
- Multiple elements with same visual state have different semantic meanings
- Accessibility audit fails (insufficient contrast between states)

**Phase assignment:**
- Phase 1 (Foundation) - Define color semantics
- Phase 3 (Selection Colors) - Implement with variations
- Phase 4 (Visual Testing) - Verify with users

---

### Pitfall 8: Font-Awesome Icon Color Inheritance Breaking After Bootstrap Migration

**What goes wrong:** Font-Awesome icons inherit color from parent elements. When migrating from custom button styles to Bootstrap classes, icon colors may break because Bootstrap uses CSS variables for color, which have different inheritance rules.

**Why it happens:**
- Custom `%button` sets `color: white` directly
- Bootstrap `.btn-primary` sets `color: var(--bs-btn-color)`
- CSS variables can be overridden differently than direct properties
- Filter effects (like `filter: invert(1.0)`) interact with CSS variables unexpectedly

**Current pattern in SeedSync:**
```scss
// file.component.scss
.actions .button {
    @extend %button;  // Sets color: white

    img {
        filter: invert(1.0);  // Makes icons white on blue background
    }
}
```

**Consequences:**
- Icons disappear (white on white)
- Icons have wrong color (blue on blue)
- Icons look correct in default state but break on hover/active

**Prevention:**

**Option 1: Let Bootstrap handle button colors**
```scss
.actions .button {
    @extend .btn;
    @extend .btn-primary;

    img {
        // Bootstrap already makes text white on primary buttons
        // Remove or adjust filter
        filter: none;
        // If icon needs color adjustment:
        filter: brightness(0) invert(1);  // Force white
    }
}
```

**Option 2: Use currentColor for icon fills**
```scss
.actions .button {
    @extend .btn;
    @extend .btn-primary;

    svg {
        fill: currentColor;  // Inherits text color from button
    }
}
```

**Option 3: Use Bootstrap's CSS variables explicitly**
```scss
.actions .button {
    @extend .btn;
    @extend .btn-primary;

    img {
        filter: brightness(0) invert(1);  // White icon
    }

    &:hover img {
        // Adjust icon brightness on hover if needed
    }
}
```

**Detection:**
- Icons are invisible or wrong color after migration
- Icons look correct in default state but break on hover
- DevTools shows icon color is inherited from parent

**Phase assignment:**
- Phase 2 (Button Migration) - Test icon colors in all button states
- Phase 4 (Visual Testing) - Verify all icons render correctly

---

### Pitfall 9: Responsive Design Breaking Due to Bootstrap Breakpoint Changes

**What goes wrong:** SeedSync uses custom breakpoint variables (`$small-max-width`, `$medium-min-width`, `$large-min-width`). Bootstrap 5 has different breakpoints and uses mixins (`@include media-breakpoint-down(md)`). Mixing the two systems causes inconsistent responsive behavior.

**Why it happens:**
- Custom breakpoints: `$small-max-width: 600px`, `$medium-max-width: 992px`
- Bootstrap 5 breakpoints: `sm: 576px`, `md: 768px`, `lg: 992px`, `xl: 1200px`, `xxl: 1400px`
- Media queries don't align with Bootstrap's grid system

**Consequences:**
- Layout breaks at unexpected viewport sizes
- Bootstrap grid behaves differently than custom breakpoints
- Inconsistent mobile/tablet/desktop experiences
- Hard to maintain two breakpoint systems

**Prevention:**

**Option 1: Migrate to Bootstrap breakpoints (RECOMMENDED)**
```scss
// BEFORE (custom)
@media only screen and (min-width: $medium-min-width) {
    .content {
        flex-wrap: nowrap;
    }
}

// AFTER (Bootstrap)
@include media-breakpoint-up(md) {  // 768px+
    .content {
        flex-wrap: nowrap;
    }
}
```

**Option 2: Override Bootstrap breakpoints to match custom values**
```scss
// After functions, before variables
@import 'bootstrap/scss/functions';

// Override Bootstrap breakpoints
$grid-breakpoints: (
  xs: 0,
  sm: 601px,    // Was $medium-min-width
  md: 601px,
  lg: 993px,    // Was $large-min-width
  xl: 1200px,
  xxl: 1400px
);

@import 'bootstrap/scss/variables';
```

**Option 3: Document which system to use where**
```scss
// _common.scss

// LEGACY: Only use for existing components during migration
$small-max-width: 600px;
$medium-min-width: 601px;

// NEW: Use Bootstrap breakpoints for all new code
// sm: 576px+
// md: 768px+
// lg: 992px+
```

**For SeedSync specifically:**
- `$medium-min-width: 601px` is close to Bootstrap's `sm: 576px`
- `$large-min-width: 993px` matches Bootstrap's `lg: 992px`
- Consider standardizing on Bootstrap breakpoints

**Detection:**
- Responsive behavior is inconsistent across components
- Elements break at unexpected viewport sizes
- Bootstrap grid and custom responsive code conflict
- Testing on tablet shows layout issues

**Phase assignment:**
- Phase 1 (Foundation) - Decide on breakpoint strategy
- Phase 2-3 (Migration) - Apply consistently
- Phase 4 (Visual Testing) - Test all breakpoints

---

### Pitfall 10: Z-Index Conflicts Between Custom Values and Bootstrap Components

**What goes wrong:** SeedSync defines custom z-index values (`$zindex-sidebar: 300`, `$zindex-top-header: 200`). Bootstrap 5 has its own z-index system for components. Conflicts cause overlapping issues.

**Why it happens:**
- Custom z-index values picked arbitrarily
- Bootstrap uses specific z-index values: dropdown (1000), sticky (1020), fixed (1030), modal-backdrop (1040), modal (1055), popover (1070), tooltip (1080)
- Components render in wrong order

**Consequences:**
- Sidebar appears above modals (should be below)
- Dropdowns hidden behind custom components
- Tooltips appear behind overlays
- Unpredictable stacking order

**Current SeedSync z-index values:**
```scss
$zindex-sidebar: 300;
$zindex-top-header: 200;
$zindex-file-options: 201;
$zindex-file-search: 100;
```

**Bootstrap 5 z-index values (from docs):**
```scss
$zindex-dropdown: 1000;
$zindex-sticky: 1020;
$zindex-fixed: 1030;
$zindex-modal-backdrop: 1040;
$zindex-offcanvas: 1050;
$zindex-modal: 1055;
$zindex-popover: 1070;
$zindex-tooltip: 1080;
```

**Prevention:**

**Strategy: Align custom z-index with Bootstrap system**
```scss
// After functions, before variables
@import 'bootstrap/scss/functions';

// Define app z-index layer (below Bootstrap components)
$zindex-app-base: 100;  // Base layer for app content

// Custom z-index values (relative to base)
$zindex-file-search: $zindex-app-base;           // 100
$zindex-top-header: $zindex-app-base + 100;      // 200
$zindex-file-options: $zindex-app-base + 101;    // 201
$zindex-sidebar: $zindex-app-base + 200;         // 300

// Ensure all app z-index values are below Bootstrap's lowest (1000)
// This ensures modals, dropdowns, tooltips always appear on top

@import 'bootstrap/scss/variables';
```

**Or explicitly document z-index layers:**
```scss
// Z-index layering system (low to high)
// 0-99:    Default document flow
// 100-299: App content layers (search, headers, sidebars)
// 300-999: Reserved for future use
// 1000+:   Bootstrap components (dropdowns, modals, tooltips)

$zindex-file-search: 100;
$zindex-top-header: 200;
$zindex-file-options: 201;
$zindex-sidebar: 300;
// Bootstrap components start at 1000
```

**Detection:**
- Modals appear behind custom components
- Dropdowns are cut off by headers
- Tooltips don't show above overlays
- Sidebar overlaps modal backdrop

**Phase assignment:**
- Phase 1 (Foundation) - Audit and document z-index system
- Phase 3 (Selection Colors) - Test z-index when modals/dropdowns are added
- Phase 4 (Visual Testing) - Verify stacking order in all scenarios

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 11: Sass @import vs @use Module System

**What goes wrong:** Mixing old `@import` syntax with new `@use`/`@forward` causes namespace collisions and deprecation warnings.

**Why it happens:**
- Bootstrap 5.3.3 still uses `@import` internally (will change in Bootstrap 6)
- Developers want to use modern `@use` syntax
- Sass deprecates `@import` but it's still widely used

**Prevention:**
1. **Use `@import` for Bootstrap consistency (until Bootstrap 6):**
   ```scss
   // styles.scss - use @import for Bootstrap
   @import 'bootstrap/scss/functions';
   @import 'bootstrap/scss/variables';
   // etc.
   ```

2. **Use `@use` for custom SCSS files:**
   ```scss
   // component.scss - use @use for your files
   @use '../../common/common' as *;
   ```

3. **Document the mixed approach:**
   ```scss
   // Until Bootstrap 6, we use both:
   // - @import for Bootstrap (required)
   // - @use for our files (best practice)
   ```

**Phase assignment:** Phase 1 (Foundation) - Document approach

---

### Pitfall 12: Box-Sizing Conflicts Between Custom Reset and Bootstrap

**What goes wrong:** `styles.scss` sets `box-sizing: border-box` on all divs. Bootstrap's reboot already sets this on all elements. Redundant or conflicting box-sizing declarations.

**Why it happens:**
- Legacy custom reset from before Bootstrap was added
- Defensive CSS from old browsers

**Current code:**
```scss
// styles.scss
div {
    box-sizing: border-box;  // Bootstrap already does this
}
```

**Prevention:**
1. **Remove redundant custom resets:**
   ```scss
   // DELETE: Bootstrap's reboot handles this
   // div {
   //     box-sizing: border-box;
   // }
   ```

2. **Only keep custom resets that Bootstrap doesn't provide:**
   ```scss
   // KEEP: Bootstrap doesn't handle this
   input[type=search]::-webkit-search-cancel-button {
       -webkit-appearance: searchfield-cancel-button;
   }
   ```

**Phase assignment:** Phase 1 (Foundation) - Clean up redundant resets

---

### Pitfall 13: Bootstrap JavaScript Not Initialized for Dynamic Components

**What goes wrong:** Bootstrap components (modals, dropdowns, tooltips) require JavaScript initialization. If Angular creates components dynamically, Bootstrap JavaScript doesn't attach.

**Why it happens:**
- Bootstrap JavaScript initializes on page load
- Angular creates components after page load
- Bootstrap doesn't re-initialize automatically

**Prevention:**

**Option 1: Use ng-bootstrap (RECOMMENDED for Angular)**
```bash
npm install @ng-bootstrap/ng-bootstrap
```

```typescript
// Use Angular-native Bootstrap components
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
```

**Option 2: Manual initialization in Angular lifecycle hooks**
```typescript
// component.ts
import { Component, AfterViewInit, ElementRef } from '@angular/core';
declare var bootstrap: any;

@Component({...})
export class MyComponent implements AfterViewInit {
  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit() {
    // Initialize Bootstrap modal
    const modalEl = this.elementRef.nativeElement.querySelector('.modal');
    new bootstrap.Modal(modalEl);
  }
}
```

**Current setup:** Bootstrap JS is loaded via angular.json (correct for non-dynamic usage)

**Phase assignment:**
- Phase 1 (Foundation) - Decide on strategy
- If using Bootstrap JavaScript components, test initialization

---

### Pitfall 14: Unused Bootstrap Components Bloating Bundle

**What goes wrong:** Importing all of Bootstrap when only using 20% of components increases bundle size unnecessarily.

**Why it happens:** Using `@import 'bootstrap/scss/bootstrap'` imports everything

**Consequences:**
- Larger CSS bundle than necessary
- Slower page loads
- Paying for code you don't use

**Prevention:**
Selective imports (can be done in later optimization phase):
```scss
// Required (always needed)
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/maps';
@import 'bootstrap/scss/mixins';
@import 'bootstrap/scss/root';
@import 'bootstrap/scss/reboot';

// Optional - only import what you use
@import 'bootstrap/scss/buttons';    // Using buttons
@import 'bootstrap/scss/forms';      // Using forms
// @import 'bootstrap/scss/carousel'; // Not using carousel - skip it
```

**Phase assignment:** Post-MVP optimization (not critical for initial migration)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| **Phase 1: Foundation** | Pre-compiled CSS not removed (#1) | Update angular.json, verify only one Bootstrap CSS loads |
| **Phase 1: Foundation** | Import order violations (#2) | Follow strict import order, test build immediately |
| **Phase 1: Foundation** | Hardcoded colors not audited (#4) | Run grep for hex colors, document all occurrences |
| **Phase 1: Foundation** | Dart Sass warnings (#6) | Document as expected, consider suppressing |
| **Phase 2: Button Migration** | Specificity conflicts (#3) | Use Bootstrap classes as base, test all button states |
| **Phase 2: Button Migration** | Icon colors breaking (#8) | Test icons in all button states (default, hover, active, disabled, loading) |
| **Phase 2: Button Migration** | Hardcoded colors in :active (#4) | Replace with shade-color() function |
| **Phase 3: Variable Unification** | Selection color variations lost (#7) | Keep semantic variations (opacity levels), test visual hierarchy |
| **Phase 3: Variable Unification** | Z-index conflicts (#10) | Test dropdowns, modals, tooltips don't appear behind custom components |
| **Phase 3: Variable Unification** | Responsive breakpoints misaligned (#9) | Decide on breakpoint strategy, apply consistently |
| **Phase 4: Visual Testing** | ViewEncapsulation issues (#5) | Test all components render Bootstrap classes correctly |
| **Phase 4: Visual Testing** | Icon colors in all states (#8) | Verify icons visible and correct color in all states |
| **Phase 4: Visual Testing** | Responsive breakpoints (#9) | Test all breakpoints (mobile, tablet, desktop) |

## Testing Strategy for Pitfall Avoidance

### Build-Time Tests
```bash
# Verify SCSS compiles without errors
npm run build

# Check for deprecation warnings (expected from Bootstrap)
npm run build 2>&1 | grep -i "deprecat"

# Verify bundle size (should not increase significantly)
ls -lh dist/*.css

# Find hardcoded hex colors
grep -rn "#[0-9A-Fa-f]\{6\}" src/angular/src/**/*.scss
```

### Visual Regression Tests
```bash
# Before migration - capture screenshots
npm run e2e -- --update-snapshots

# After migration - compare
npm run e2e  # Should match previous snapshots
```

### Manual Testing Checklist
- [ ] Test all button states: default, hover, focus, active, disabled, loading
- [ ] Test icon colors in all button states
- [ ] Test selection states: selected, bulk-selected, both
- [ ] Test responsive layouts at: 375px, 768px, 1024px, 1920px
- [ ] Test z-index: modals over content, dropdowns over content, tooltips over everything
- [ ] Test in multiple browsers: Chrome, Firefox, Safari, Edge
- [ ] Test color contrast for accessibility (WCAG AA)

## Quick Reference Checklist

Before submitting SCSS migration PR:

- [ ] Variables overridden BEFORE Bootstrap import (after functions)
- [ ] Import order: functions → variables → maps → mixins → components → utilities
- [ ] Pre-compiled bootstrap.min.css removed from angular.json
- [ ] No hardcoded hex colors (or documented if intentional)
- [ ] Button placeholders use Bootstrap classes or mixins
- [ ] Custom states use Bootstrap CSS variables
- [ ] Icon colors tested in all button states
- [ ] Selection colors maintain visual hierarchy
- [ ] Responsive breakpoints strategy decided and applied
- [ ] Z-index values documented and don't conflict with Bootstrap
- [ ] ViewEncapsulation strategy documented
- [ ] Tests pass with new SCSS setup
- [ ] Visual regression testing completed
- [ ] No new !important declarations added

## Sources

**HIGH CONFIDENCE (Official Bootstrap 5.3 Documentation):**
- https://getbootstrap.com/docs/5.3/customize/sass/ - SCSS customization guide (verified: import order, variable overrides, required map keys, Dart Sass deprecation warnings)
- https://getbootstrap.com/docs/5.3/migration/ - Migration guide (verified: breaking changes, Sass compiler changes, color system overhaul, Bootstrap 4→5 changes)
- https://getbootstrap.com/docs/5.3/components/buttons/ - Button customization (verified: CSS variables, mixins, Sass variables, available customization approaches)
- https://getbootstrap.com/docs/5.3/customize/css-variables/ - CSS variables (verified: specificity implications, scope, customization patterns, prefix convention)

**MEDIUM CONFIDENCE (Project-specific context):**
- SeedSync codebase analysis:
  - `src/angular/src/app/common/_common.scss` - Custom button placeholder, color variables, z-index values, breakpoint definitions
  - `src/angular/src/styles.scss` - Current CSS reset and box-sizing rules
  - `src/angular/src/app/pages/files/file.component.scss` - Button usage patterns, selection colors, icon filters, responsive breakpoints
  - `src/angular/angular.json` - Bootstrap pre-compiled CSS imports, current build configuration
  - `src/angular/package.json` - Bootstrap 5.3.3, Sass 1.32.0, Angular 19.2.18 versions

**LOW CONFIDENCE (Common migration patterns):**
- Angular ViewEncapsulation and Bootstrap interaction (needs project-specific testing)
- Responsive breakpoint alignment strategies (needs UX review)
- Z-index conflict resolution patterns (needs testing with actual Bootstrap components)
- Icon color inheritance with CSS variables (needs browser testing)

**VERIFICATION NEEDED:**
- Sass deprecation warning suppression effectiveness in Angular CLI (should be tested in Phase 1)
- Whether SeedSync uses any Bootstrap JavaScript components that need initialization (modal, dropdown, tooltip, etc.)
- Actual z-index conflicts with current custom components (test when Bootstrap modals/dropdowns are used)
- Performance impact of SCSS compilation vs pre-compiled CSS (should benchmark in Phase 1)
