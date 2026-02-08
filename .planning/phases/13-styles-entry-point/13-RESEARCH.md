# Phase 13: Styles Entry Point - Research

**Researched:** 2026-02-08
**Domain:** Sass entry point hybrid architecture (@use for modules, @import for legacy libraries)
**Confidence:** HIGH

## Summary

Phase 13 transforms the application's main entry point file (`styles.scss`) from pure `@import` to a hybrid architecture: keeping `@import` for Bootstrap 5.3 (which requires it) while migrating application modules (`_common.scss`, `_bootstrap-overrides.scss`) to modern `@use` syntax. This is the final step in the v1.4 Sass migration, enabling zero application deprecation warnings while accepting Bootstrap's legacy import warnings as external dependency noise.

The key challenge is understanding Sass's ordering requirements when mixing `@use` and `@import` in the same file. While the Sass module system officially discourages long-term coexistence, practical interoperability exists specifically for this migration scenario: loading legacy third-party libraries via `@import` while using `@use` for modernized application code.

**Primary recommendation:** Structure `styles.scss` with all `@import` rules first (Bootstrap loading sequence), followed by `@use` rules for application modules, followed by global CSS. This order satisfies both Bootstrap's variable override timing requirements and Sass's module system constraints, while minimizing deprecation warnings to only external Bootstrap code.

## Standard Pattern: Entry Point Hybrid Architecture

### Pattern 1: Pure @import Entry Point (Legacy/Current State)

**What:** Traditional Sass entry point loading everything via `@import`.

**Structure:**
```scss
// styles.scss (current pattern)
@import '../node_modules/bootstrap/scss/functions';
@import 'app/common/bootstrap-variables';
@import '../node_modules/bootstrap/scss/variables';
@import '../node_modules/bootstrap/scss/maps';
@import '../node_modules/bootstrap/scss/mixins';
// ... more Bootstrap components
@import 'app/common/bootstrap-overrides';
@import 'app/common/common';

// Global CSS rules
html, body { /* ... */ }
```

**Problems:**
- All files loaded into global scope (namespace pollution)
- Each `@import` generates deprecation warning (as of Dart Sass 1.80.0)
- No encapsulation or modularity for application code

**Source:** [Sass @import documentation](https://sass-lang.com/documentation/at-rules/import/)

### Pattern 2: Pure @use Entry Point (Ideal/Future State)

**What:** Modern Sass entry point loading everything via `@use`.

**Structure:**
```scss
// styles.scss (ideal pattern, requires Bootstrap 6+)
@use 'bootstrap' with (
  $primary: #007bff
);
@use 'app/common/bootstrap-overrides';
@use 'app/common/common';

// Global CSS rules
html, body { /* ... */ }
```

**Benefits:**
- Namespaced modules (no pollution)
- Zero deprecation warnings
- True encapsulation

**Blocker:** Bootstrap 5.3 is NOT compatible with `@use`. Bootstrap maintainer (mdo) confirmed "Not going to be using that until v6" (tracked in issue #29853).

**Source:** [Bootstrap @use discussion](https://github.com/orgs/twbs/discussions/36050), [Bootstrap 5.3 Sass documentation](https://getbootstrap.com/docs/5.3/customize/sass/)

### Pattern 3: Hybrid Entry Point (Transition State)

**What:** Pragmatic entry point using `@import` for legacy third-party libraries, `@use` for modernized application code.

**Structure:**
```scss
// styles.scss (hybrid pattern for Phase 13)

// SECTION 1: Bootstrap core (must use @import)
@import '../node_modules/bootstrap/scss/functions';
@import 'app/common/bootstrap-variables';
@import '../node_modules/bootstrap/scss/variables';
@import '../node_modules/bootstrap/scss/variables-dark';
@import '../node_modules/bootstrap/scss/maps';
@import '../node_modules/bootstrap/scss/mixins';
@import '../node_modules/bootstrap/scss/root';

// SECTION 2: Bootstrap components (must use @import)
@import '../node_modules/bootstrap/scss/utilities';
@import '../node_modules/bootstrap/scss/reboot';
// ... more components
@import '../node_modules/bootstrap/scss/utilities/api';

// SECTION 3: Application modules (modernized with @use)
@use 'app/common/bootstrap-overrides';
@use 'app/common/common';

// SECTION 4: Global CSS rules
html, body { /* ... */ }
```

**Why this works:**
1. Bootstrap `@import` rules satisfy Bootstrap's internal dependencies
2. Application `@use` rules provide namespaced access to modernized modules
3. Sass interoperability allows both in same file: "When you use `@use` (or `@forward`) to load a module that uses `@import`, that module will contain all the public members defined by the stylesheet you load and everything that stylesheet transitively imports."
4. Deprecation warnings isolated to Bootstrap (external noise, acceptable)

**Trade-offs:**
- Still generates `@import` deprecation warnings for Bootstrap (accepted as external dependency limitation)
- Not as clean as pure `@use` pattern
- Temporary solution until Bootstrap 6

**Source:** [Sass @import interoperability](https://sass-lang.com/documentation/at-rules/import/), [CSS-Tricks Sass modules guide](https://css-tricks.com/introducing-sass-modules/)

## Critical Ordering Requirements

### Rule 1: @use Must Come Before Style Rules

**What the spec says:** "A stylesheet's `@use` rules must come before any rules other than `@forward`, including style rules."

**What this means for Phase 13:**
- All `@use` statements must appear before the global CSS block (`html, body { ... }`)
- `@import` rules are NOT "style rules" — they're directives
- Configuration variables CAN appear before `@use` for module configuration

**Example:**
```scss
// ✅ VALID: @use before style rules
@import 'bootstrap/scss/functions';
@use 'app/common/common';

html { margin: 0; }  // Style rule after @use
```

```scss
// ❌ INVALID: @use after style rules
@import 'bootstrap/scss/functions';

html { margin: 0; }  // Style rule

@use 'app/common/common';  // ERROR: "@use rules must be written before any other rules"
```

**Source:** [Sass @use documentation](https://sass-lang.com/documentation/at-rules/use/), [@use ordering error discussion](https://github.com/thgh/rollup-plugin-scss/issues/70)

### Rule 2: @import Can Appear Anywhere (But Generates Warnings)

**What the spec says:** `@import` is deprecated but still functional. It can appear at the top level or nested within rules.

**What this means for Phase 13:**
- `@import` rules can appear before OR after `@use` rules (both are valid Sass)
- Order choice depends on OTHER constraints (Bootstrap requirements, readability)
- Each `@import` generates deprecation warning regardless of position

**Source:** [Sass @import documentation](https://sass-lang.com/documentation/at-rules/import/)

### Rule 3: Bootstrap Variable Override Timing

**What Bootstrap requires:** "Variable overrides must come after our functions are imported, but before the rest of the imports."

**Required order:**
```scss
// 1. Functions FIRST (provides shade-color, tint-color, etc.)
@import '../node_modules/bootstrap/scss/functions';

// 2. Variable overrides SECOND (uses functions, before defaults)
@import 'app/common/bootstrap-variables';

// 3. Bootstrap defaults THIRD (uses !default flag, won't override)
@import '../node_modules/bootstrap/scss/variables';
```

**Why this order:**
- Bootstrap functions must exist before computing overrides (e.g., `shade-color($primary, 20%)`)
- Override variables must be set before Bootstrap's `!default` variables are evaluated
- `!default` flag in Bootstrap means "assign only if undefined" — so overrides must come first

**Source:** [Bootstrap 5.3 Sass customization guide](https://getbootstrap.com/docs/5.3/customize/sass/)

### Rule 4: Recommended Hybrid Ordering

Combining all constraints, the recommended order is:

```scss
// SECTION 1: Bootstrap @import block (satisfies Bootstrap timing requirements)
@import 'bootstrap/scss/functions';      // Functions first
@import 'overrides';                     // Overrides second
@import 'bootstrap/scss/variables';      // Defaults third
@import 'bootstrap/scss/components...';  // Components fourth

// SECTION 2: Application @use block (modernized modules)
@use 'app/common/bootstrap-overrides';
@use 'app/common/common';

// SECTION 3: Global CSS (style rules last)
html, body { /* ... */ }
```

**Why @import before @use:**
1. Keeps Bootstrap loading sequence intact (satisfies Bootstrap constraints)
2. Clearly separates legacy code (top) from modern code (middle)
3. Satisfies "@use before style rules" requirement (global CSS is at bottom)
4. No technical blocker: Sass allows @import before or after @use

**Alternative (NOT RECOMMENDED):** Placing `@use` before `@import` is technically valid Sass, but fragments the Bootstrap loading sequence and makes the hybrid boundary less clear.

## Bootstrap 5.3 Compatibility Constraints

### Constraint 1: Bootstrap Must Use @import

**Status as of Bootstrap 5.3:** Bootstrap internally uses `@import` throughout its codebase. It is NOT compatible with Sass `@use`/`@forward`.

**Confirmation:** Bootstrap maintainer stated "Not going to be using that until v6" when asked about `@use` support.

**Impact on Phase 13:**
- All Bootstrap core files MUST be loaded via `@import`
- Cannot use `@use 'bootstrap'` pattern
- Must use granular imports: functions, variables, mixins, components

**Source:** [Bootstrap @use support discussion](https://github.com/orgs/twbs/discussions/36050), [Bootstrap 5.3 Sass docs](https://getbootstrap.com/docs/5.3/customize/sass/)

### Constraint 2: Bootstrap Import Order is Non-Negotiable

**Required sequence (from Bootstrap docs):**

1. Functions (`scss/functions`)
2. Variable overrides (custom file)
3. Variables (`scss/variables`, `scss/variables-dark`)
4. Maps (`scss/maps`)
5. Mixins (`scss/mixins`)
6. Root (`scss/root`)
7. Optional components
8. Utilities API (`scss/utilities/api`)

**What breaks if order changes:**
- Functions before overrides: Functions unavailable for computing overrides
- Overrides after variables: `!default` flag prevents overrides from applying
- Maps before variables: Maps reference undefined variables
- Utilities API before components: Component classes not available for utility generation

**Source:** [Bootstrap 5.3 Sass structure](https://getbootstrap.com/docs/5.3/customize/sass/)

### Constraint 3: Deprecation Warnings Are Unavoidable for Bootstrap

**Reality:** As of Dart Sass 1.80.0, `@import` is deprecated. Bootstrap 5.3 uses `@import` internally.

**Implications:**
- Every Bootstrap import generates deprecation warning
- Cannot eliminate Bootstrap warnings until Bootstrap 6
- Silencing warnings globally hides application issues

**Recommended approach:**
1. Accept Bootstrap warnings as external dependency noise
2. Document in code comments: "Bootstrap 5.3 requires @import, accepted as external limitation"
3. Ensure zero application code warnings (verify no application files use `@import`)
4. Optional: Configure build tool to filter Bootstrap warnings specifically

**Angular-specific workaround:** Add to `angular.json`:
```json
"stylePreprocessorOptions": {
  "sass": {
    "silenceDeprecations": ["import"]
  }
}
```

**Trade-off:** This silences ALL `@import` warnings, including application code. Only use if application migration is complete and tested.

**Source:** [Bootstrap Angular 19 migration discussion](https://github.com/orgs/twbs/discussions/41260), [Sass deprecation warning fix guide](https://coreui.io/blog/how-to-fix-sass-import-rules-are-deprecated-and-will-be-removed-in-dart-sass-3-0-0/)

## Application Module Migration (Phase 12 Context)

### Current State After Phase 12

Phase 12 transformed application modules to modern Sass:

**_common.scss:**
```scss
@forward 'bootstrap-variables';
@use 'bootstrap-variables' as bv;
@import 'bootstrap/scss/functions';  // Hybrid for shade-color/tint-color

$warning-text-emphasis: shade-color(bv.$warning, 60%);
$gray-100: #f8f9fa;
// ... more derived variables
```

**_bootstrap-overrides.scss:**
```scss
@use 'bootstrap-variables' as bv;

.dropdown-toggle.show {
    background-color: bv.$secondary-dark-color;
}
// ... more Bootstrap overrides
```

**Key insight:** Both modules are now `@use`-ready. They can be loaded via `@use` from the entry point.

### How @use Works in Entry Point

When `styles.scss` uses:
```scss
@use 'app/common/bootstrap-overrides';
@use 'app/common/common';
```

**What happens:**
1. Sass compiles each module in its own scope
2. All CSS output is included in compiled stylesheet
3. Variables/mixins/functions are NOT added to global scope
4. Module namespaces (`bootstrap-overrides.$var`) are available in `styles.scss` (but not needed for entry point)

**Critical distinction:** Entry point doesn't need to ACCESS variables from modules — it only needs to INCLUDE their compiled CSS. So namespaces are irrelevant in this context.

**Result:** Application modules compile once, output their CSS, zero deprecation warnings.

### Why @use Eliminates Application Warnings

**Before (with @import):**
```scss
// styles.scss (old)
@import 'app/common/bootstrap-overrides';  // ⚠️ Deprecation warning
@import 'app/common/common';              // ⚠️ Deprecation warning
```

**After (with @use):**
```scss
// styles.scss (new)
@use 'app/common/bootstrap-overrides';  // ✅ No warning (modern syntax)
@use 'app/common/common';              // ✅ No warning (modern syntax)
```

**Why warnings disappear:**
- `@use` is the modern, non-deprecated directive
- Application code no longer generates ANY deprecation warnings
- Only Bootstrap imports (external code) generate warnings

**Verification command:**
```bash
ng build --configuration development 2>&1 | grep "Deprecation"
```

**Expected output after Phase 13:**
- All warnings reference `node_modules/bootstrap/` paths (external)
- Zero warnings reference `src/app/` paths (application)

## Don't Hand-Roll: Use Sass Module System

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Module namespacing | Custom prefix conventions (`$app-color-primary`) | `@use 'module' as prefix` | Sass enforces uniqueness, prevents collisions |
| Module loading | Custom concatenation scripts | `@use` directive | Loads once, compiles once, proper dependency graph |
| Variable scoping | Global variables with prefixes | `@forward` aggregation pattern | Explicit exports, clear API boundaries |
| Configuration | Override variables in multiple files | `@use 'module' with ($var: value)` | Single configuration point, clear precedence |

**Key insight:** Don't try to implement module-like behavior with `@import` and naming conventions. Use the actual module system.

## Architecture for Phase 13

### Current Structure (Before Phase 13)

```
styles.scss
├── @import 'bootstrap/scss/functions'
├── @import 'app/common/bootstrap-variables'
├── @import 'bootstrap/scss/variables'
├── @import 'bootstrap/scss/maps'
├── @import 'bootstrap/scss/mixins'
├── @import 'bootstrap/scss/root'
├── @import 'bootstrap/scss/utilities'
├── @import 'bootstrap/scss/reboot'
├── ... (30+ Bootstrap component imports)
├── @import 'bootstrap/scss/utilities/api'
├── @import 'app/common/bootstrap-overrides'  ⚠️ Application code
├── @import 'app/common/common'              ⚠️ Application code
└── Global CSS (html, body, input, div rules)
```

**Problems:**
- Lines 54, 57: Application code uses deprecated `@import`
- Generates 2+ application deprecation warnings
- No clear separation between external (Bootstrap) and internal (app) code

### Target Structure (After Phase 13)

```
styles.scss
├── SECTION 1: Bootstrap Core (@import — required by Bootstrap)
│   ├── @import 'bootstrap/scss/functions'
│   ├── @import 'app/common/bootstrap-variables'
│   ├── @import 'bootstrap/scss/variables'
│   ├── @import 'bootstrap/scss/variables-dark'
│   ├── @import 'bootstrap/scss/maps'
│   ├── @import 'bootstrap/scss/mixins'
│   └── @import 'bootstrap/scss/root'
│
├── SECTION 2: Bootstrap Components (@import — required by Bootstrap)
│   ├── @import 'bootstrap/scss/utilities'
│   ├── @import 'bootstrap/scss/reboot'
│   ├── ... (30+ Bootstrap component imports)
│   └── @import 'bootstrap/scss/utilities/api'
│
├── SECTION 3: Application Modules (@use — modernized)
│   ├── @use 'app/common/bootstrap-overrides'  ✅ Modern syntax
│   └── @use 'app/common/common'              ✅ Modern syntax
│
└── SECTION 4: Global CSS Rules
    ├── html { ... }
    ├── body { ... }
    ├── input[type=search] { ... }
    └── div { ... }
```

**Benefits:**
1. Clear visual separation: external (@import) vs. internal (@use)
2. Zero application deprecation warnings
3. Bootstrap warnings isolated and documented
4. Satisfies all Sass ordering requirements
5. Preserves Bootstrap loading sequence

### Dependency Flow After Phase 13

```
                    styles.scss (entry point)
                         |
        +----------------+----------------+
        |                                 |
   Bootstrap Core                  Application Modules
   (@import block)                    (@use block)
        |                                 |
   functions.scss                  bootstrap-overrides
   variables.scss         +--------+
   maps.scss              |        |
   mixins.scss            |    common.scss
   root.scss              |        |
   [components...]        |    @forward bootstrap-variables
   utilities/api          |    @use bootstrap-variables as bv
        |                 |    @import bootstrap/scss/functions
        |                 |
        +-----------------+
                |
          Compiled CSS
          (single output file)
```

**Key insight:** Bootstrap and application modules compile independently (different scopes), but output merges into single CSS file. Bootstrap variables are available in application modules via Phase 12's `@forward` mechanism.

## Common Pitfalls

### Pitfall 1: Placing @use After Global CSS

**What goes wrong:** Sass compilation error "@use rules must be written before any other rules".

**Why it happens:** Forgetting that global CSS blocks (html, body rules) are "style rules" that must come after ALL module loading.

**Example:**
```scss
// ❌ WRONG
@import 'bootstrap/scss/functions';

html {
    margin: 0;  // Style rule
}

@use 'app/common/common';  // ERROR: too late
```

**Prevention:**
```scss
// ✅ CORRECT
@import 'bootstrap/scss/functions';
@use 'app/common/common';  // Before style rules

html {
    margin: 0;  // Style rule
}
```

**Detection:** Build fails with clear error message pointing to `@use` line.

**Source:** [Sass @use documentation](https://sass-lang.com/documentation/at-rules/use/), [@use ordering issue](https://github.com/thgh/rollup-plugin-scss/issues/70)

### Pitfall 2: Breaking Bootstrap Import Order

**What goes wrong:** Variables undefined, mixins unavailable, or components render incorrectly.

**Why it happens:** Reordering Bootstrap imports while consolidating sections.

**Example:**
```scss
// ❌ WRONG: Variables before functions
@import 'bootstrap/scss/variables';  // Uses functions that don't exist yet
@import 'bootstrap/scss/functions';

// ❌ WRONG: Overrides after variables
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';  // !default values lock in
@import 'app/common/bootstrap-variables';  // Overrides ignored
```

**Prevention:** Maintain exact Bootstrap sequence (functions → overrides → variables → maps → mixins → root → components → utilities API).

**Detection:**
- Build errors: "Undefined function", "Undefined variable"
- Visual regressions: Wrong colors, spacing, or component appearance

**Source:** [Bootstrap 5.3 Sass structure](https://getbootstrap.com/docs/5.3/customize/sass/)

### Pitfall 3: Using @import for Application Modules

**What goes wrong:** Application code continues generating deprecation warnings.

**Why it happens:** Missing modules during conversion, copy-paste errors, or partial migration.

**Example:**
```scss
// ❌ WRONG: Application code still using @import
@import 'bootstrap/scss/functions';
@import 'bootstrap/scss/variables';

@use 'app/common/common';              // Modernized
@import 'app/common/bootstrap-overrides';  // Missed during migration
```

**Prevention:** Systematic checklist:
1. List all application imports: `grep "@import.*app/" styles.scss`
2. Convert each to `@use`: Replace `@import` → `@use`
3. Verify: No application paths in deprecation warnings

**Detection:**
```bash
ng build 2>&1 | grep -E "Deprecation.*src/app"
```

**Expected output after fix:** No matches (all warnings reference `node_modules/bootstrap/`).

### Pitfall 4: Mixing @import and @use for Same Module

**What goes wrong:** Sass compilation error or unexpected duplication.

**Why it happens:** Accidentally loading a module via both mechanisms in the same file.

**Example:**
```scss
// ❌ WRONG: Same module loaded twice
@import 'app/common/common';  // First load
@use 'app/common/common';    // Second load — ERROR or duplication
```

**Prevention:** Each module should be loaded exactly once per file, via one mechanism.

**Rule:** In `styles.scss`, Bootstrap uses `@import`, application modules use `@use`. Never mix for the same module.

**Source:** [Sass @import documentation](https://sass-lang.com/documentation/at-rules/import/)

### Pitfall 5: Expecting @use to Provide Global Variables

**What goes wrong:** Expecting variables from `@use` modules to be accessible globally, like `@import` provided.

**Why it happens:** Misunderstanding `@use` scoping (namespace-only, not global).

**Example:**
```scss
// styles.scss
@use 'app/common/common';

// Later in styles.scss
.custom-class {
    color: $primary-color;  // ERROR: Undefined variable
}
```

**Why it fails:** `@use` doesn't add variables to global scope. Must use namespace: `common.$primary-color`.

**But wait:** In Phase 13, this ISN'T a problem because the entry point doesn't reference module variables — it just includes their CSS output.

**Prevention:** Understand that entry point `@use` is for CSS inclusion, not variable access. If variables are needed in `styles.scss` itself, use namespace (`common.$var`) or keep that module on `@import` (but this creates deprecation warning).

**Recommended approach for Phase 13:** Keep all variable usage inside modules. Entry point just includes compiled CSS.

## Testing Strategy

### Test 1: Build Compilation

**Command:**
```bash
cd src/angular
ng build --configuration development
```

**Expected output:**
- Build succeeds (exit code 0)
- Zero errors
- Deprecation warnings ONLY reference `node_modules/bootstrap/` paths
- Zero warnings reference `src/app/` paths

**Pass criteria:**
```bash
ng build 2>&1 | grep -E "Deprecation.*src/app" | wc -l
# Expected: 0
```

### Test 2: Deprecation Warning Audit

**Command:**
```bash
ng build --configuration development 2>&1 | grep "Deprecation" > deprecation-log.txt
cat deprecation-log.txt
```

**Manual review:**
- [ ] All warnings mention Bootstrap file paths (`node_modules/bootstrap/scss/`)
- [ ] Zero warnings mention application paths (`src/app/`)
- [ ] Warning count matches expected Bootstrap imports (30-40 warnings expected)

**Pass criteria:** Application code is clean, only external Bootstrap warnings remain.

### Test 3: CSS Output Comparison

**Purpose:** Verify zero visual regressions — compiled CSS should be identical.

**Process:**
1. Before Phase 13: Build and save CSS: `ng build && cp dist/angular/browser/styles.css before.css`
2. Apply Phase 13 changes
3. After Phase 13: Build and save CSS: `ng build && cp dist/angular/browser/styles.css after.css`
4. Diff: `diff before.css after.css`

**Expected output:** Zero differences (or only whitespace/comment differences).

**If differences found:**
- Investigate: Which CSS rules changed?
- Root cause: Did Bootstrap import order change? Did a module not compile?
- Fix: Restore correct ordering or module loading

**Pass criteria:** `diff` output is empty or contains only inconsequential formatting differences.

### Test 4: Application Module Loading

**Purpose:** Verify application modules still compile and include their CSS.

**Method:** Check compiled CSS for application-specific rules.

**Commands:**
```bash
ng build --configuration development
grep "dropdown-toggle.show" dist/angular/browser/styles.css  # From bootstrap-overrides
grep "warning-text-emphasis" dist/angular/browser/styles.css  # From common
```

**Expected output:** Both patterns found in compiled CSS.

**Pass criteria:** Application module CSS is present in output (modules loaded successfully via `@use`).

### Test 5: Unit Tests

**Command:**
```bash
cd src/angular
ng test --no-watch --browsers=ChromeHeadless
```

**Expected output:**
- All 381+ tests pass
- Zero test failures
- Zero compilation errors

**Pass criteria:** Test suite passes completely (SCSS changes shouldn't affect unit tests, but verifies no build breakage).

### Test 6: Visual Regression (Manual)

**Purpose:** Verify application appearance is unchanged.

**Process:**
1. Run development server: `ng serve`
2. Open in browser: http://localhost:4200
3. Check key UI elements:
   - Files page: Selection backgrounds (teal color)
   - Dropdowns: Dark theme appearance
   - Forms: Input styling, focus states
   - Alerts: Warning/danger colors
   - Buttons: Primary/secondary colors

**Pass criteria:**
- [ ] All colors match expected theme
- [ ] No missing styles or broken layouts
- [ ] Dropdowns render correctly
- [ ] Form inputs are visible and styled

## Files Modified in This Phase

### File 1: `src/angular/src/styles.scss`

**Current state (84 lines):**
- Lines 1-51: Bootstrap imports via `@import`
- Line 54: `@import 'app/common/bootstrap-overrides';` (APPLICATION CODE — must migrate)
- Line 57: `@import 'app/common/common';` (APPLICATION CODE — must migrate)
- Lines 59-84: Global CSS rules

**Target changes:**
1. Keep lines 1-51 unchanged (Bootstrap loading)
2. Replace line 54: `@import` → `@use` for bootstrap-overrides
3. Replace line 57: `@import` → `@use` for common
4. Add comments documenting hybrid approach
5. Keep lines 59-84 unchanged (global CSS)

**Estimated changes:** 5 lines modified, 10 lines of comments added

**Complexity:** LOW
- Simple find/replace: 2 `@import` → 2 `@use`
- No logic changes, no variable modifications
- Main risk: Incorrect ordering (mitigated by keeping Bootstrap block intact)

## Success Criteria

Phase 13 is complete when:

1. ✅ `styles.scss` uses `@import` for all Bootstrap files
2. ✅ `styles.scss` uses `@use` for `app/common/bootstrap-overrides`
3. ✅ `styles.scss` uses `@use` for `app/common/common`
4. ✅ Bootstrap import order preserved (functions → overrides → variables → components → API)
5. ✅ `@use` rules appear before global CSS style rules
6. ✅ `ng build` succeeds with zero errors
7. ✅ Zero deprecation warnings reference `src/app/` paths
8. ✅ Bootstrap deprecation warnings accepted and documented
9. ✅ Compiled CSS output is identical (or whitespace-only differences)
10. ✅ All 381+ unit tests pass
11. ✅ Visual regression check shows no UI changes
12. ✅ Code comments document hybrid approach decision

## Code Examples

### Example 1: Current styles.scss Structure (Before Phase 13)

```scss
// styles.scss (BEFORE — generates application warnings)

// Bootstrap core (lines 1-14)
@import '../node_modules/bootstrap/scss/functions';
@import 'app/common/bootstrap-variables';
@import '../node_modules/bootstrap/scss/variables';
@import '../node_modules/bootstrap/scss/variables-dark';
@import '../node_modules/bootstrap/scss/maps';
@import '../node_modules/bootstrap/scss/mixins';
@import '../node_modules/bootstrap/scss/root';

// Bootstrap components (lines 17-48)
@import '../node_modules/bootstrap/scss/utilities';
@import '../node_modules/bootstrap/scss/reboot';
@import '../node_modules/bootstrap/scss/type';
// ... 30+ more component imports
@import '../node_modules/bootstrap/scss/utilities/api';

// Application modules (lines 54-57) ⚠️ GENERATES WARNINGS
@import 'app/common/bootstrap-overrides';
@import 'app/common/common';

// Global CSS (lines 59-84)
html, body {
    font-family: Verdana,sans-serif;
    font-size: 15px;
    margin: 0;
}
```

**Problems:**
- Lines 54, 57: Application code using deprecated `@import`
- Build generates 2+ application deprecation warnings

### Example 2: Target styles.scss Structure (After Phase 13)

```scss
// styles.scss (AFTER — zero application warnings)

// ===========================================================================
// SECTION 1: Bootstrap Core
// Bootstrap 5.3 requires @import (not compatible with @use until Bootstrap 6)
// Deprecation warnings from Bootstrap are accepted as external dependency limitation
// ===========================================================================

// 1. Bootstrap functions (required for variable calculations)
@import '../node_modules/bootstrap/scss/functions';

// 2. Bootstrap variable overrides (our customizations)
@import 'app/common/bootstrap-variables';

// 3. Bootstrap core variables and maps
@import '../node_modules/bootstrap/scss/variables';
@import '../node_modules/bootstrap/scss/variables-dark';
@import '../node_modules/bootstrap/scss/maps';
@import '../node_modules/bootstrap/scss/mixins';
@import '../node_modules/bootstrap/scss/root';

// ===========================================================================
// SECTION 2: Bootstrap Components
// All Bootstrap components (import ALL to ensure no visual changes)
// ===========================================================================

@import '../node_modules/bootstrap/scss/utilities';
@import '../node_modules/bootstrap/scss/reboot';
@import '../node_modules/bootstrap/scss/type';
// ... 30+ more component imports (unchanged)
@import '../node_modules/bootstrap/scss/utilities/api';

// ===========================================================================
// SECTION 3: Application Modules (Modern Sass @use)
// These modules have been migrated to @use/@forward (Phase 12)
// Loading them with @use eliminates application deprecation warnings
// ===========================================================================

@use 'app/common/bootstrap-overrides';
@use 'app/common/common';

// ===========================================================================
// SECTION 4: Global CSS Rules
// ===========================================================================

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
    background-color: #f5f5f5;
}

input[type=search]::-webkit-search-cancel-button {
    -webkit-appearance: searchfield-cancel-button;
}

div {
    box-sizing: border-box;
}
```

**Changes:**
1. Added section comments documenting hybrid approach
2. Line 54 (old): `@import 'app/common/bootstrap-overrides';` → Line 56 (new): `@use 'app/common/bootstrap-overrides';`
3. Line 57 (old): `@import 'app/common/common';` → Line 57 (new): `@use 'app/common/common';`
4. All Bootstrap imports unchanged (still `@import`)
5. Global CSS unchanged

**Result:**
- Zero application deprecation warnings
- Bootstrap warnings documented and accepted
- Clear separation between external (Bootstrap) and internal (app) code

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Hybrid pattern validity | HIGH | Official Sass docs confirm `@use` and `@import` interoperability |
| Ordering requirements | HIGH | Explicit rules from Sass (@use before style rules) and Bootstrap (function → override → variable sequence) |
| Bootstrap constraint | HIGH | Official Bootstrap maintainer confirmed @use unsupported until v6 |
| Application module compatibility | HIGH | Phase 12 completed, modules tested with @use in components |
| Deprecation warning elimination | HIGH | @use syntax is non-deprecated, only application `@import` rules generate app warnings |

**Overall confidence:** HIGH

**Primary risk:** None significant. Pattern is well-documented, constraints are clear, changes are minimal (2 line modifications), and Phase 12 validated module readiness.

## Sources

### Primary (HIGH confidence)

- [Sass @use Rule](https://sass-lang.com/documentation/at-rules/use/) — Ordering requirements, syntax
- [Sass @import Rule](https://sass-lang.com/documentation/at-rules/import/) — Deprecation status, interoperability with @use
- [Sass Breaking Change: @import deprecation](https://sass-lang.com/documentation/breaking-changes/import/) — Dart Sass 1.80.0 deprecation timeline
- [Sass Module System Proposal](https://github.com/sass/sass/blob/main/accepted/module-system.md) — Interoperability details
- [Bootstrap 5.3 Sass Customization](https://getbootstrap.com/docs/5.3/customize/sass/) — Required import order, variable override timing
- [Bootstrap @use Support Discussion](https://github.com/orgs/twbs/discussions/36050) — Official confirmation of Bootstrap 6 timeline

### Secondary (MEDIUM confidence)

- [Bootstrap Angular 19 Migration Issue](https://github.com/orgs/twbs/discussions/41260) — Real-world hybrid pattern usage
- [CSS-Tricks: Introducing Sass Modules](https://css-tricks.com/introducing-sass-modules/) — Practical examples
- [Sass @use Ordering Error Discussion](https://github.com/thgh/rollup-plugin-scss/issues/70) — Error message context
- [Medium: Migrating from @import to @use](https://norato-felipe.medium.com/migrating-from-import-to-use-and-forward-in-sass-175b3a8a6221) — Migration patterns
- [CoreUI: Fixing Sass Import Deprecation](https://coreui.io/blog/how-to-fix-sass-import-rules-are-deprecated-and-will-be-removed-in-dart-sass-3-0-0/) — Warning suppression options

---

*Research completed: 2026-02-08*
*Ready for planning: YES*

**Next step:** Create execution plan with precise line-by-line modifications to `styles.scss`, including comment additions and deprecation warning verification.
