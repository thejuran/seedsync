# Phase 7: Form Input Standardization - Research

**Researched:** 2026-02-04
**Domain:** Bootstrap 5.3 form styling with custom teal accent color in dark theme
**Confidence:** HIGH

## Summary

This research investigates Bootstrap 5.3 form input customization for standardizing all text inputs, password inputs, and checkboxes across the SeedSync application (Settings, AutoQueue, and modal forms). The app uses Bootstrap 5.3.3 with a teal accent color (#79DFB6 as `$secondary`) and requires consistent focus states matching existing button and selection patterns.

Bootstrap 5.3 provides robust SCSS variable overrides for customizing form inputs, checkboxes, and focus states. The framework uses CSS variables internally for dark mode support, but SCSS variable overrides at compile time are the standard approach for customizing component colors. The key finding is that Bootstrap's form inputs and checkboxes both inherit from `$component-active-bg` and `$component-active-color`, which means overriding these variables will automatically propagate teal styling to focus states and checked checkboxes.

The user has decided to use `:focus` (not `:focus-visible`) to show focus rings for both keyboard and mouse interactions, which is a valid accessibility choice that ensures all users see focus indicators consistently.

**Primary recommendation:** Override `$component-active-bg` to use the app's teal color (`$secondary`), which will automatically style input focus borders, checkbox checked states, and focus rings consistently. Add supplementary overrides for input borders, backgrounds, and validation states to complete the dark theme form styling.

## Standard Stack

Bootstrap 5.3's form system uses no additional libraries—all styling is built-in.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bootstrap | 5.3.3 | Form styling framework | Industry standard, comprehensive form components with built-in dark mode support |
| SCSS | Built-in | Variable customization | Bootstrap's native customization method, recommended over CSS overrides |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Angular Forms | 19.2.18 | Form validation | Already in use for template-driven forms (Settings, AutoQueue) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| SCSS variables | CSS custom properties (runtime) | CSS variables work but lose compile-time optimizations and require more verbose selectors |
| Bootstrap forms | Custom CSS | Starting from scratch loses accessibility features, dark mode support, and validation patterns |
| `:focus` | `:focus-visible` | `:focus-visible` shows focus only for keyboard users (cleaner for mouse users), but user decided on consistent `:focus` for all interactions |

**Installation:**
```bash
# Already installed in package.json
npm install bootstrap@^5.3.3
```

## Architecture Patterns

### Recommended Project Structure
```
src/angular/src/app/common/
├── _bootstrap-variables.scss      # Variable overrides BEFORE Bootstrap import
├── _bootstrap-overrides.scss      # Component overrides AFTER Bootstrap import
└── _common.scss                   # App-specific shared styles

src/angular/src/styles.scss         # Main entry point (correct import order)
```

### Pattern 1: SCSS Variable Override for Component Active Colors
**What:** Override `$component-active-bg` and `$component-active-color` to propagate teal styling throughout all active states (focus, checked, etc.)

**When to use:** When you want consistent accent colors across inputs, checkboxes, buttons, and other interactive components

**Example:**
```scss
// _bootstrap-variables.scss
// Source: Official Bootstrap 5.3 documentation

// Bootstrap semantic colors
$primary: #337BB7;    // Existing app primary blue
$secondary: #79DFB6;  // Existing app teal (app accent)

// Component active states (used by inputs, checkboxes, buttons)
// Override to use teal instead of primary
$component-active-bg: $secondary;          // Background when active/checked/focused
$component-active-color: $white;           // Text/icon color when active

// This single override propagates to:
// - Input focus border color: tint-color($component-active-bg, 50%)
// - Checkbox checked background: $component-active-bg
// - Focus ring color: rgba($component-active-bg, 0.25)
```

**Why this works:** Bootstrap's form variables are designed with inheritance—`$form-check-input-checked-bg-color` defaults to `$component-active-bg`, `$input-focus-border-color` defaults to `tint-color($component-active-bg, 50%)`, and `$focus-ring-color` defaults to `rgba($primary, 0.25)`. By overriding the root `$component-active-bg` variable, all dependent variables automatically use the new color.

### Pattern 2: Input Border and Background Customization
**What:** Customize input appearance (borders, backgrounds) for dark theme visibility

**When to use:** When default Bootstrap inputs don't provide enough visual definition against dark backgrounds

**Example:**
```scss
// _bootstrap-variables.scss
// Source: Bootstrap 5.3 _variables.scss defaults

// Input borders (CSS variables, set via SCSS)
// Note: $input-border-color uses var(--#{$prefix}border-color)
// Override the base border color for better contrast
$border-color: #495057;                    // Darker border for definition

// Input backgrounds
// Note: $input-bg uses var(--#{$prefix}body-bg)
// For dark theme, ensure inputs are slightly lighter than page background
// This is handled by Bootstrap's dark mode CSS variables automatically

// Border radius
$input-border-radius: 0.375rem;            // ~4px, Bootstrap default
```

**Why this matters:** Bootstrap 5.3 uses CSS variables (`var(--bs-border-color)`) for inputs, which automatically adapt to dark mode. However, the default border color (#dee2e6 in light mode) has insufficient contrast (1.3:1 to white background), failing WCAG 2.1's 3:1 requirement for non-text UI components. For dark themes, you want borders dark enough to define the input area while maintaining 3:1 contrast.

### Pattern 3: Checkbox Styling with Custom Checked Color
**What:** Checkboxes automatically inherit `$component-active-bg` for checked state, but focus states need explicit handling

**When to use:** Always—checkboxes are a primary form control

**Example:**
```scss
// _bootstrap-variables.scss
// Source: Bootstrap 5.3 official documentation

// Checkbox checked state (automatically inherits from component-active)
$form-check-input-checked-bg-color: $component-active-bg;       // Defaults to this
$form-check-input-checked-border-color: $component-active-bg;   // Defaults to this

// Checkbox focus state
$form-check-input-focus-border: $input-focus-border-color;      // Matches text inputs
$form-check-input-focus-box-shadow: $focus-ring-box-shadow;     // Uses focus ring

// Disabled state
$form-check-input-disabled-opacity: 0.5;                         // Bootstrap default
```

**HTML Structure:**
```html
<!-- Source: Bootstrap 5.3 Checks and Radios documentation -->
<div class="form-check">
  <input class="form-check-input" type="checkbox" id="exampleCheck">
  <label class="form-check-label" for="exampleCheck">
    <span class="name">Option Label</span>
    <span class="description">Optional description text</span>
  </label>
</div>
```

**Key insight:** Bootstrap uses inline SVG backgrounds for the checkmark icon. The SVG references `$form-check-input-checked-color` (which defaults to `$component-active-color`, typically white). When you override `$component-active-bg` to teal, the checkbox background becomes teal and the white checkmark automatically contrasts properly.

### Pattern 4: Form Validation Styling
**What:** Bootstrap provides built-in validation classes (`.is-valid`, `.is-invalid`) with color-coded feedback

**When to use:** For fields with validation requirements (e.g., required fields, pattern matching)

**Example:**
```scss
// _bootstrap-variables.scss
// Source: Bootstrap 5.3 Validation documentation

// Validation colors (semantic, not changed)
$form-valid-color: $success;                // Green (Bootstrap default)
$form-invalid-color: $danger;               // Red (Bootstrap default)

// Validation borders
$form-valid-border-color: $success;
$form-invalid-border-color: $danger;
```

**HTML Implementation:**
```html
<!-- Source: Bootstrap 5.3 Validation documentation -->
<!-- Client-side validation with .was-validated on form submission -->
<form class="needs-validation" novalidate>
  <div class="mb-3">
    <label for="serverAddress" class="form-label">Server Address</label>
    <input type="text" class="form-control" id="serverAddress" required>
    <div class="invalid-feedback">
      Please provide a server address.
    </div>
  </div>
</form>

<!-- Or server-side validation with .is-invalid class -->
<input type="text" class="form-control is-invalid" id="serverAddress">
<div class="invalid-feedback">
  Server address is not reachable.
</div>
```

**JavaScript Pattern:**
```javascript
// Source: Bootstrap 5.3 Validation documentation
const forms = document.querySelectorAll('.needs-validation');

Array.from(forms).forEach(form => {
  form.addEventListener('submit', event => {
    if (!form.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
    }
    form.classList.add('was-validated');
  }, false);
});
```

### Pattern 5: Focus Ring Customization
**What:** Bootstrap 5.3 introduced `.focus-ring` helper and focus ring SCSS variables for consistent focus states

**When to use:** Applied automatically to form inputs; can be used on custom interactive elements

**Example:**
```scss
// _bootstrap-variables.scss
// Source: Bootstrap 5.3 Focus Ring documentation

// Focus ring variables (inherit from component-active)
$focus-ring-width: 0.25rem;                                     // 4px
$focus-ring-opacity: 0.25;                                      // 25% alpha
$focus-ring-color: rgba($component-active-bg, $focus-ring-opacity);  // Teal with 25% opacity
$focus-ring-blur: 0;                                            // No blur (sharp ring)
$focus-ring-box-shadow: 0 0 $focus-ring-blur $focus-ring-width $focus-ring-color;

// Input-specific focus (uses focus ring)
$input-btn-focus-width: $focus-ring-width;
$input-btn-focus-color-opacity: $focus-ring-opacity;
$input-btn-focus-color: rgba($component-active-bg, $input-btn-focus-color-opacity);
$input-btn-focus-box-shadow: 0 0 0 $input-btn-focus-width $input-btn-focus-color;
```

**Result:** Inputs show a 4px teal glow (25% opacity) when focused, matching the user's decision for "outer glow/shadow effect."

### Pattern 6: Dark Theme CSS Variable Approach
**What:** Bootstrap 5.3 uses CSS variables scoped to `[data-bs-theme="dark"]` for automatic dark mode styling

**When to use:** When you need runtime theme switching (not currently used in SeedSync, but good to understand)

**Example:**
```scss
// _bootstrap-overrides.scss (AFTER Bootstrap is imported)
// Source: Bootstrap 5.3 Color Modes documentation

// If you need to override dark mode specifically:
[data-bs-theme="dark"] {
  .form-control {
    --bs-body-bg: #212529;                  // Dark background
    --bs-body-color: #dee2e6;               // Light text
    --bs-border-color: #495057;             // Visible borders
  }
}
```

**Note:** SeedSync doesn't currently use `data-bs-theme="dark"` (it's a single dark-themed app), so SCSS variable overrides are sufficient. Bootstrap's CSS variables provide the dark appearance automatically when compiled.

### Anti-Patterns to Avoid

- **Overriding variables AFTER importing Bootstrap components:** Variables must be set after functions but before variables/maps/components. Otherwise, the overrides have no effect.
  ```scss
  // WRONG
  @import 'bootstrap/scss/bootstrap';
  $component-active-bg: #79DFB6;  // Too late! Bootstrap already compiled with defaults

  // CORRECT
  @import 'bootstrap/scss/functions';
  $component-active-bg: #79DFB6;  // Set BEFORE importing variables/components
  @import 'bootstrap/scss/variables';
  ```

- **Using CSS overrides instead of SCSS variables:** While CSS can override styles, it requires higher specificity, duplicates code, and doesn't integrate with Bootstrap's variable system.
  ```scss
  // AVOID
  .form-control:focus {
    border-color: #79DFB6 !important;  // Fragile, !important required
  }

  // PREFER
  $component-active-bg: #79DFB6;  // Works everywhere Bootstrap uses this variable
  ```

- **Forgetting `!default` flag is only in Bootstrap's files:** When overriding, don't add `!default` to your variables—that makes them take Bootstrap's defaults instead of your overrides.
  ```scss
  // WRONG
  $component-active-bg: #79DFB6 !default;  // Will use Bootstrap's default if set

  // CORRECT
  $component-active-bg: #79DFB6;  // Always uses your value
  ```

- **Inconsistent focus indicator styles:** Don't mix `:focus` and `:focus-visible` across different form elements. User decided on `:focus` for consistency—stick with that decision throughout.

- **Assuming dark mode "just works":** Bootstrap's CSS variables help, but you must verify border contrast ratios meet WCAG 2.1 (3:1 minimum for UI components). Default Bootstrap borders fail this in light mode (1.3:1 to white).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Custom checkboxes | Custom HTML/CSS checkbox with hidden input | Bootstrap `.form-check` + `.form-check-input` | Bootstrap provides inline SVG checkmarks, proper sizing, disabled states, focus states, and ARIA attributes out of the box |
| Form validation | Manual error message showing/hiding | Bootstrap validation classes + HTML5 Constraint Validation API | Bootstrap's `.was-validated`, `.is-valid`, `.is-invalid` classes work with native browser validation and provide accessible error messages with proper ARIA linkage |
| Focus ring styling | Custom outline or box-shadow | Bootstrap's `$focus-ring-*` variables and mixins | Bootstrap provides consistent focus styling across all components, with proper opacity, width, and color inheritance |
| Dark theme detection | JavaScript to detect `prefers-color-scheme` | Bootstrap's CSS variables with `[data-bs-theme]` | Bootstrap 5.3+ provides automatic dark mode styling for forms via CSS variables (though SeedSync uses single dark theme) |
| Input state colors (disabled, readonly) | Custom CSS for each state | Bootstrap's built-in state variables | Bootstrap handles disabled backgrounds, border colors, opacity, and cursor changes automatically |

**Key insight:** Bootstrap 5.3's form system is battle-tested across millions of sites. It handles edge cases like:
- High-DPI displays (uses rem units, not px)
- Screen readers (proper ARIA attributes, label associations)
- Touch targets (proper sizing for mobile)
- Browser inconsistencies (CSS resets, vendor prefixes where needed)
- Keyboard navigation (focus order, Enter key submission)

Custom solutions almost always miss some of these edge cases.

## Common Pitfalls

### Pitfall 1: Insufficient Border Contrast in Dark Themes
**What goes wrong:** Default Bootstrap borders (#dee2e6) have only 1.3:1 contrast to white backgrounds, failing WCAG 2.1's 3:1 requirement for UI components. In dark themes, borders can become invisible against dark backgrounds.

**Why it happens:** Bootstrap optimizes for light themes by default. Dark theme borders must be manually tuned to provide sufficient contrast against both the page background AND the input background (which is slightly lighter than the page).

**How to avoid:**
- Test border colors with a contrast checker (e.g., WebAIM Contrast Checker)
- Target 3:1 minimum contrast for borders against both backgrounds
- For dark themes, use medium-gray borders (#495057 or similar) that contrast with both dark page backgrounds (#000, #1a1a1a) and slightly lighter input backgrounds

**Warning signs:**
- Form inputs are hard to locate on the page
- Input boundaries blend with page background
- Users accidentally click outside inputs thinking they're clicking inside

**Source:** [Bootstrap GitHub Issue #38480](https://github.com/twbs/bootstrap/issues/38480) documents insufficient contrast on borders

### Pitfall 2: Variable Override Order Breaking Compilation
**What goes wrong:** Overriding Bootstrap variables in the wrong order causes them to be ignored, resulting in default blue focus states and checkboxes instead of custom teal.

**Why it happens:** Bootstrap's SCSS uses the `!default` flag, which only applies values if the variable hasn't been set yet. If you override variables after importing `_variables.scss`, your overrides are ignored.

**How to avoid:**
1. Import functions first: `@import 'bootstrap/scss/functions'`
2. Set variable overrides: `$component-active-bg: #79DFB6;`
3. Import Bootstrap variables: `@import 'bootstrap/scss/variables'`
4. Continue with maps, mixins, components

**Warning signs:**
- Focus states still show Bootstrap's default blue (#0d6efd) instead of teal
- Checkboxes still have blue checked state
- SCSS compiles without errors but colors don't change

**Example of correct order:**
```scss
// styles.scss
@import 'bootstrap/scss/functions';        // Step 1: Functions

// Step 2: Variable overrides
$primary: #337BB7;
$secondary: #79DFB6;
$component-active-bg: $secondary;

// Step 3: Continue Bootstrap import
@import 'bootstrap/scss/variables';
@import 'bootstrap/scss/variables-dark';
@import 'bootstrap/scss/maps';
// ... rest of Bootstrap
```

**Source:** [Bootstrap 5.3 Sass documentation](https://getbootstrap.com/docs/5.3/customize/sass/) and [GitHub Issue #39379](https://github.com/twbs/bootstrap/issues/39379)

### Pitfall 3: Assuming `:focus-visible` is More Accessible
**What goes wrong:** Developers use `:focus-visible` thinking it's always better for accessibility, but it can hide focus indicators from keyboard users who interact with forms using mouse/touch combinations.

**Why it happens:** `:focus-visible` shows focus rings only when the browser determines they're needed (typically keyboard-only navigation). However, some users with motor disabilities use a mouse/trackpad but still rely on visual focus indicators to track their position. `:focus-visible` hides the ring when they click into an input, removing their position reference.

**How to avoid:**
- User decided correctly to use `:focus` (always visible) instead of `:focus-visible`
- Bootstrap defaults to `:focus` for form controls for this reason
- Only use `:focus-visible` for non-form interactive elements (buttons, links) where visual clutter matters more

**Warning signs:**
- Focus indicators disappear when clicking into inputs
- Some users report losing track of which field is active
- Accessibility testing reveals users can't determine focus location

**Source:** [MDN :focus-visible documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) and [Focus vs Focus-Visible accessibility guide](https://mayashavin.com/articles/focus-vs-focus-visible-for-accessibility)

### Pitfall 4: Forgetting Disabled State Styling
**What goes wrong:** Custom focus and checked states look great, but disabled inputs/checkboxes don't visually indicate they're disabled, confusing users.

**Why it happens:** Developers focus on active states (focus, checked) and forget to verify disabled states still show proper opacity reduction and cursor changes.

**How to avoid:**
- Test all states: default, hover, focus, active, disabled
- Verify `$form-check-input-disabled-opacity: 0.5` reduces visibility
- Ensure disabled inputs show `cursor: not-allowed`
- Check that disabled checkboxes are visually distinct from unchecked

**Warning signs:**
- Users try to interact with disabled fields
- No visual difference between enabled and disabled fields
- Disabled checkboxes look like unchecked checkboxes

### Pitfall 5: Validation Timing Confusion
**What goes wrong:** Forms show "invalid" errors before users have a chance to fill them out, or never show validation despite invalid input.

**Why it happens:** Bootstrap's `.was-validated` class applies validation styling to ALL fields immediately. If added on page load, empty required fields show errors right away (bad UX). If never added, validation never appears (no feedback).

**How to avoid:**
- Use `.needs-validation` class on form, not `.was-validated`
- Add `.was-validated` only after form submission attempt
- For real-time validation, use `.is-invalid` class on individual fields, not the form-level `.was-validated`
- Consider `blur` event validation (validate when user leaves field) instead of form submission for better UX

**Warning signs:**
- Empty forms show red "Required" errors on page load
- Invalid fields never show validation feedback
- Users submit invalid forms without seeing errors

**Example pattern:**
```javascript
// Good: validate on submit, not on page load
form.addEventListener('submit', (event) => {
  if (!form.checkValidity()) {
    event.preventDefault();
    event.stopPropagation();
  }
  form.classList.add('was-validated');  // Only add after submit attempt
});
```

**Source:** [Bootstrap 5.3 Validation documentation](https://getbootstrap.com/docs/5.3/forms/validation/)

### Pitfall 6: Not Testing Placeholder Contrast
**What goes wrong:** Placeholder text is too light on dark backgrounds, making it hard to read and failing WCAG AA (4.5:1 for text).

**Why it happens:** Bootstrap's `$input-placeholder-color` uses `var(--bs-secondary-color)` which adapts to dark mode, but may not have sufficient contrast depending on your input background color.

**How to avoid:**
- Test placeholder contrast against input background (not page background)
- Target 4.5:1 minimum for WCAG AA compliance
- Override `$input-placeholder-color` if needed
- Consider slightly lighter placeholder color than default

**Warning signs:**
- Placeholder text is barely visible
- Users ask "what should I enter here?"
- Accessibility audits flag placeholder contrast

## Code Examples

Verified patterns from official sources:

### Complete SCSS Variable Override File
```scss
// _bootstrap-variables.scss
// Source: Bootstrap 5.3 official documentation and SeedSync existing setup

// ============================================================================
// Bootstrap Theme Colors (override Bootstrap defaults)
// ============================================================================
$primary: #337BB7;    // Existing app primary blue
$secondary: #79DFB6;  // Existing app teal - APP ACCENT COLOR
$success: #198754;    // Bootstrap default green - semantic "add" actions
$danger: #dc3545;     // Bootstrap default red - semantic "remove" actions
$warning: #ffc107;    // Bootstrap default yellow
$info: #0dcaf0;       // Bootstrap default cyan

// ============================================================================
// Component Active States (KEY: propagates teal throughout app)
// ============================================================================
$component-active-bg: $secondary;          // Teal for active/focused/checked states
$component-active-color: $white;           // White text/icons on teal background

// This override affects:
// - Input focus border color: tint-color($component-active-bg, 50%) = light teal
// - Checkbox checked background: $component-active-bg = teal
// - Button active state: $component-active-bg = teal
// - Focus ring color: rgba($component-active-bg, 0.25) = teal with 25% opacity

// ============================================================================
// Form Input Styling
// ============================================================================

// Borders (for definition against dark backgrounds)
$border-color: #495057;                    // Medium gray, sufficient contrast for dark theme
$input-border-color: var(--#{$prefix}border-color);  // Inherits from above

// Border radius (Bootstrap default, slightly rounded)
$input-border-radius: 0.375rem;            // ~6px (Bootstrap default is 0.375rem)

// Backgrounds (CSS variables handle dark mode automatically)
// Don't override $input-bg - let Bootstrap's CSS variables handle it

// Placeholder text color (appropriate for dark theme)
$input-placeholder-color: var(--#{$prefix}secondary-color);  // Bootstrap default, test contrast

// Focus states (uses component-active, automatically teal)
$input-focus-border-color: tint-color($component-active-bg, 50%);  // Light teal border
$input-focus-box-shadow: $input-btn-focus-box-shadow;              // Outer glow effect

// ============================================================================
// Checkboxes
// ============================================================================

// Checked state (inherits from component-active, automatically teal)
$form-check-input-checked-bg-color: $component-active-bg;       // Teal background
$form-check-input-checked-border-color: $component-active-bg;   // Teal border
$form-check-input-checked-color: $component-active-color;       // White checkmark

// Focus state (matches text inputs)
$form-check-input-focus-border: $input-focus-border-color;      // Light teal
$form-check-input-focus-box-shadow: $focus-ring-box-shadow;     // Teal glow

// Disabled state (reduced opacity)
$form-check-input-disabled-opacity: 0.5;                         // 50% opacity (Bootstrap default)

// ============================================================================
// Focus Ring (new in Bootstrap 5.3)
// ============================================================================
$focus-ring-width: 0.25rem;                                     // 4px (standard prominence)
$focus-ring-opacity: 0.25;                                      // 25% alpha
$focus-ring-color: rgba($component-active-bg, $focus-ring-opacity);  // Teal with transparency
$focus-ring-blur: 0;                                            // No blur (sharp outer glow)
$focus-ring-box-shadow: 0 0 $focus-ring-blur $focus-ring-width $focus-ring-color;

// Input/button focus (uses focus ring)
$input-btn-focus-width: $focus-ring-width;
$input-btn-focus-color-opacity: $focus-ring-opacity;
$input-btn-focus-color: rgba($component-active-bg, $input-btn-focus-color-opacity);
$input-btn-focus-box-shadow: 0 0 0 $input-btn-focus-width $input-btn-focus-color;

// ============================================================================
// Form Validation (semantic colors, not changed)
// ============================================================================
$form-valid-color: $success;                                    // Green
$form-valid-border-color: $success;
$form-invalid-color: $danger;                                   // Red
$form-invalid-border-color: $danger;

// Note: Validation colors have dark mode variants in _variables-dark.scss
// These use lighter shades (green-300, red-300) for better contrast on dark backgrounds
```

### Text Input Example (Settings Page)
```html
<!-- Source: Existing option.component.html -->
<label>
    <span class="name">Server Address</span>
    <input
           type="text"
           class="form-control"
           [disabled]="value == null"
           [ngModel]="value"
           (ngModelChange)="onChange($event)" />
    <span class="description">The remote server address</span>
</label>
```

**Styling applied automatically:**
- Default: subtle border (#495057), slightly lighter background than page
- Focus: light teal border (tint-color(#79DFB6, 50%)), teal outer glow (rgba(#79DFB6, 0.25))
- Disabled: grayed background, reduced opacity

### Checkbox Example (Settings Page)
```html
<!-- Source: Existing option.component.html -->
<div class="form-check">
    <input
           type="checkbox"
           class="form-check-input"
           [disabled]="value == null"
           [ngModel]="value"
           (ngModelChange)="onChange($event)" />
    <label class="form-check-label">
        <span class="name">Auto-Queue enabled</span>
        <span class="description">Automatically queue files for download</span>
    </label>
</div>
```

**Styling applied automatically:**
- Unchecked: subtle border (#495057), transparent background
- Checked: teal background (#79DFB6), white checkmark
- Focus: teal border + outer glow
- Disabled: 50% opacity, grayed appearance

### Form Validation Example (Recommended Pattern)
```html
<!-- Source: Bootstrap 5.3 Validation documentation -->
<form class="needs-validation" novalidate>
  <div class="mb-3">
    <label for="serverAddress" class="form-label">Server Address</label>
    <input type="text"
           class="form-control"
           id="serverAddress"
           required
           pattern="^[a-zA-Z0-9.-]+$"
           aria-describedby="serverAddressFeedback">
    <div id="serverAddressFeedback" class="invalid-feedback">
      Please provide a valid server address (letters, numbers, dots, and hyphens only).
    </div>
  </div>
  <button class="btn btn-primary" type="submit">Save Settings</button>
</form>
```

**TypeScript/JavaScript:**
```typescript
// Source: Bootstrap 5.3 Validation documentation
ngAfterViewInit() {
  const form = document.querySelector('.needs-validation') as HTMLFormElement;

  form.addEventListener('submit', (event: Event) => {
    if (!form.checkValidity()) {
      event.preventDefault();
      event.stopPropagation();
    }
    form.classList.add('was-validated');
  }, false);
}
```

### Password Input Example
```html
<!-- Source: Existing option.component.html pattern -->
<label>
    <span class="name">Server Password</span>
    <input
           type="password"
           class="form-control"
           [disabled]="value == null"
           [ngModel]="value"
           (ngModelChange)="onChange($event)"
           autocomplete="current-password" />
    <span class="description">Password for remote server access</span>
</label>
```

**Note:** `autocomplete="current-password"` helps password managers recognize the field.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual dark mode CSS | Bootstrap CSS variables with `[data-bs-theme="dark"]` | Bootstrap 5.3.0 (May 2023) | Forms automatically adapt to dark mode without custom CSS |
| `:focus` outline | `.focus-ring` helper with SCSS variables | Bootstrap 5.3.0 (May 2023) | Consistent focus styling across all components, easier customization |
| Manual checkbox styling with hidden inputs | Native `<input type="checkbox">` with `.form-check-input` | Bootstrap 5.0 (May 2021) | Better accessibility, touch targets, and browser consistency |
| Separate validation CSS | `.was-validated` class with HTML5 Constraint Validation API | Bootstrap 4.0+ (2018) | Native browser validation with Bootstrap styling, less JavaScript |
| `outline` for focus | `box-shadow` for focus | Bootstrap 4.0+ (2018) | Better control over focus appearance, avoids outline quirks |

**Deprecated/outdated:**
- **Custom checkboxes with `.custom-checkbox`:** Bootstrap 5.0+ uses standard `.form-check` (old custom-* classes removed)
- **`:focus-visible` polyfills:** All modern browsers now support `:focus-visible` natively (though user chose `:focus` for consistency)
- **Manual color mode switching JS:** Bootstrap 5.3+ handles via `data-bs-theme` attribute (though SeedSync uses single dark theme)

## Open Questions

Things that couldn't be fully resolved:

1. **Placeholder text contrast in current dark theme**
   - What we know: Bootstrap uses `var(--bs-secondary-color)` for placeholders, which adapts to dark mode
   - What's unclear: Actual contrast ratio against the input background color in SeedSync's dark theme
   - Recommendation: Test placeholder contrast after implementing styling. If below 4.5:1, override `$input-placeholder-color` with a lighter shade (e.g., `rgba(255, 255, 255, 0.65)`)

2. **Error state color choice (red vs orange)**
   - What we know: Bootstrap defaults to red (`$danger`) for invalid states, which is semantic and recognizable
   - What's unclear: Whether red has sufficient contrast on dark backgrounds in SeedSync's theme, and whether colorblind users can distinguish it
   - Recommendation: Start with Bootstrap's default `$danger` (#dc3545), which has dark mode variant (red-300) for better contrast. Test with colorblind simulators. Consider adding an icon (⚠️) alongside color for redundancy.

3. **Validation timing preference**
   - What we know: Bootstrap supports on-submit validation (`.was-validated`), on-blur validation (field-by-field), and real-time validation
   - What's unclear: SeedSync's existing patterns—does the app validate immediately, on blur, or on save?
   - Recommendation: Check existing Angular form patterns in Settings. Match the current timing for consistency. If no existing pattern, prefer on-blur validation (validate when user leaves field) for best UX—users get feedback without being interrupted mid-typing.

4. **Input background lightness on dark theme**
   - What we know: Bootstrap's CSS variables provide automatic dark backgrounds (`var(--bs-body-bg)`), and inputs should be "slightly lighter" than page background for definition
   - What's unclear: Exact background colors used in SeedSync's dark theme (page vs input)
   - Recommendation: Inspect page background color (appears to be very dark gray or black). Bootstrap's dark mode CSS variables should handle this automatically, but verify inputs are visually distinct. If not, override with `$input-bg: #212529` (slightly lighter than pure black).

## Sources

### Primary (HIGH confidence)
- [Bootstrap 5.3 Form Controls documentation](https://getbootstrap.com/docs/5.3/forms/form-control/) - Official form input styling and variables
- [Bootstrap 5.3 Checks and Radios documentation](https://getbootstrap.com/docs/5.3/forms/checks-radios/) - Official checkbox/radio styling and variables
- [Bootstrap 5.3 Form Validation documentation](https://getbootstrap.com/docs/5.3/forms/validation/) - Official validation patterns and classes
- [Bootstrap 5.3 Color Modes documentation](https://getbootstrap.com/docs/5.3/customize/color-modes/) - Official dark mode implementation
- [Bootstrap 5.3 Sass documentation](https://getbootstrap.com/docs/5.3/customize/sass/) - Official variable override order and patterns
- [Bootstrap 5.3 Focus Ring documentation](https://getbootstrap.com/docs/5.3/helpers/focus-ring/) - Official focus ring variables and helpers
- [Bootstrap v5.3.3 _variables.scss](https://github.com/twbs/bootstrap/blob/v5.3.3/scss/_variables.scss) - Source code default values
- [Angular Forms Validation guide](https://angular.dev/guide/forms/form-validation) - Official Angular validation patterns

### Secondary (MEDIUM confidence)
- [GeeksforGeeks: Bootstrap 5 Checkbox Customization](https://www.geeksforgeeks.org/bootstrap/how-to-customized-bootstrap-5-checkbox/) - Practical checkbox color override examples (July 2025)
- [Reintech: Forms and Validations in Bootstrap 5 Best Practices](https://reintech.io/blog/forms-validations-bootstrap-5-best-practices) - Community best practices for validation
- [Bootstrap Blog: Bootstrap 5.3.0 Release](https://blog.getbootstrap.com/2023/05/30/bootstrap-5-3-0/) - Official release notes for 5.3 features
- [MDN :focus-visible documentation](https://developer.mozilla.org/en-US/docs/Web/CSS/:focus-visible) - Browser behavior and accessibility considerations
- [Maya Shavin: Focus vs Focus-Visible accessibility guide](https://mayashavin.com/articles/focus-vs-focus-visible-for-accessibility) - Accessibility tradeoffs between focus selectors

### Tertiary (LOW confidence - flagged for validation)
- [Bootstrap GitHub Issue #38480](https://github.com/twbs/bootstrap/issues/38480) - Community-reported border contrast issues
- [Bootstrap GitHub Issue #39379](https://github.com/twbs/bootstrap/issues/39379) - Community-reported CSS variable override issues in 5.3
- [Stack Overflow and community tutorials](https://www.tutorialrepublic.com/faq/how-to-change-bootstrap-default-input-focus-glow-style.php) - Various customization approaches (verify with official docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Bootstrap 5.3.3 is confirmed installed, official documentation is authoritative
- Architecture: HIGH - All patterns verified with official Bootstrap 5.3 docs and source code
- Pitfalls: HIGH - Based on official documentation, GitHub issues, and community-reported problems

**Research date:** 2026-02-04
**Valid until:** Approximately 60 days (Bootstrap 5.3 is stable; next major version likely 6.0 which would introduce breaking changes)

**Key facts verified:**
- Bootstrap 5.3.3 installed in package.json ✓
- Teal color (#79DFB6) defined as `$secondary` in _bootstrap-variables.scss ✓
- Current app uses Bootstrap's default form styling (no custom focus state overrides) ✓
- Settings and AutoQueue use template-driven forms with `.form-control` and `.form-check-input` ✓
- User decisions for teal focus rings, standard checkboxes, and `:focus` (not `:focus-visible`) documented in CONTEXT.md ✓
