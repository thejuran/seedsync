# Phase 3: Selection Color Unification - Research

**Researched:** 2026-02-03
**Domain:** Bootstrap 5 SCSS color theming, selection UI patterns
**Confidence:** HIGH

## Summary

This phase unifies selection highlighting across three components (selection-banner, bulk-actions-bar, file rows) from blue/primary colors to teal/secondary colors. The codebase currently has the selection banner using primary (blue) colors while bulk-selected file rows already use secondary (teal) with 30% opacity. Phase 2 established the color variable system and Bootstrap color functions (shade-color, tint-color) for generating color variations.

The standard approach is to leverage Bootstrap's secondary color ($secondary: #79DFB6) and its derived variables ($secondary-color, $secondary-light-color, $secondary-dark-color, $secondary-darker-color) to create a graduated intensity system: darkest teal for the banner, medium teal for the bulk actions bar, and lightest teal for selected rows. The context decisions specify 30-40% opacity for selected row backgrounds, instant transitions for selection state changes, and 100ms fade for hover states.

Bootstrap 5.3's shade-color() and tint-color() functions provide systematic color variation, ensuring consistent color relationships across the selection UI. The critical insight is that all three selection components should form a cohesive visual hierarchy using the same color family with different intensities, making the selection state immediately recognizable throughout the interface.

**Primary recommendation:** Use graduated teal intensity with the secondary color palette: banner background uses a darker teal (either $secondary-dark-color or a tinted/shaded variant), bulk actions bar uses medium teal ($secondary-light-color), and selected rows maintain their current 30% opacity teal.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bootstrap | 5.3.3 | CSS framework with semantic color system | Industry-standard theme colors with built-in color functions |
| SCSS/Sass | Latest | CSS preprocessor | Enables color functions (shade-color, tint-color, rgba) and compile-time color manipulation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Bootstrap Functions | 5.3.3 | Color manipulation (shade-color, tint-color) | Creating consistent color variants from base theme colors |
| SCSS rgba() | Latest | Transparency/opacity | Adding transparency to solid colors for subtle backgrounds |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Graduated intensity approach | Uniform teal across all components | Loses visual hierarchy, harder to distinguish banner from rows |
| Bootstrap color functions | Hardcoded hex colors | Breaks consistency, harder to maintain theme changes |
| SCSS rgba() for opacity | CSS opacity property | rgba() better - only affects background, not text/children |

**Installation:**
Already installed via Phase 1 (Bootstrap 5.3.3).

## Architecture Patterns

### Pattern 1: Graduated Intensity Hierarchy
**What:** Use the same color family (secondary/teal) with different intensities for visual hierarchy
**When to use:** When multiple components represent the same concept (selection) at different levels
**Example:**
```scss
// selection-banner.component.scss
.selection-banner {
    // Darkest: Banner at top is most prominent
    background-color: $secondary-color;  // Or tint-color($secondary, 20%)
    border: 1px solid $secondary-dark-color;
}

.selection-count {
    color: $secondary-darker-color;
}

// bulk-actions-bar.component.scss
.bulk-actions-bar {
    // Medium: Actions bar is secondary prominence
    background-color: $secondary-light-color;  // Already implemented
    border: 1px solid $secondary-dark-color;
}

// file.component.scss
.file.bulk-selected {
    // Lightest: Selected rows are subtle background
    background-color: rgba($secondary-color, 0.3);  // Already at 30%
}
```

### Pattern 2: Text Color Coordination
**What:** Adjust text colors on teal backgrounds for readability and cohesion
**When to use:** When changing background colors, ensure text remains readable
**Example:**
```scss
// On lighter teal backgrounds ($secondary-light-color), use darker teal text
.bulk-actions-bar {
    background-color: $secondary-light-color;
}

.selection-label {
    color: $secondary-darker-color;  // Already implemented
}

// On medium teal backgrounds ($secondary-color), use darker teal or white text
.selection-banner {
    background-color: $secondary-color;
}

.selection-count {
    color: $secondary-darker-color;  // Dark teal for good contrast
}

// On transparent teal backgrounds, keep original text colors
.file.bulk-selected {
    background-color: rgba($secondary-color, 0.3);
    // Text colors remain unchanged - transparency maintains readability
}
```

### Pattern 3: Hover State Differentiation
**What:** Different hover behaviors for unselected vs selected states
**When to use:** To provide visual feedback while maintaining selection clarity
**Example:**
```scss
// file.component.scss

// Unselected rows: Light teal hint on hover
.file:not(.selected):not(.bulk-selected):hover {
    background-color: $secondary-light-color;  // Already implemented
    transition: background-color 0.1s ease;  // Add 100ms fade
}

// Selected rows: No hover change
// .file.bulk-selected:hover - DO NOT add hover state
// Rationale: Already selected, hover doesn't convey additional information
```

### Pattern 4: Instant State Transitions
**What:** Selection changes happen instantly without animation for responsive feel
**When to use:** For checkbox state and selection background changes
**Example:**
```scss
// file.component.scss

// Checkbox already has instant transition disabled
input[type="checkbox"] {
    transition: none;  // Already implemented
}

// Selection background changes should be instant (no transition property)
.file.bulk-selected {
    background-color: rgba($secondary-color, 0.3);
    // No transition property = instant change
}
```

### Pattern 5: Bootstrap Color Function Usage
**What:** Use Bootstrap's shade-color() and tint-color() for consistent color variations
**When to use:** When you need lighter or darker versions of theme colors
**Example:**
```scss
// _common.scss already defines these:
$secondary-light-color: #C5F0DE;           // Tinted teal
$secondary-dark-color: #32AD7B;            // Shaded teal
$secondary-darker-color: #077F4F;          // More shaded teal

// If additional variations needed:
$selection-banner-bg: tint-color($secondary, 20%);  // Lighter than base
$selection-banner-border: shade-color($secondary, 30%);  // Darker than base
```

### Anti-Patterns to Avoid

- **Inconsistent color families:** Don't mix primary (blue) and secondary (teal) in selection UI - breaks visual cohesion
- **Uniform intensity:** Don't use same shade of teal for banner and rows - loses hierarchy
- **Hover on selected:** Don't add hover state to already-selected items - redundant visual feedback
- **Animated selections:** Don't animate selection state changes - feels sluggish, context specifies instant
- **Hardcoded opacity:** Don't use hardcoded rgba values without referencing base color variable
- **Text color mismatch:** Don't use primary-based text colors on secondary backgrounds

## Current State Analysis

### Component Inventory

**Selection Banner (selection-banner.component.scss):**
- Current: Uses primary (blue) colors
  - Background: `$primary-light-color` (#D7E7F4)
  - Border: `$primary-color` (#337BB7)
  - Text: `$primary-dark-color` (#2e6da4)
- Status: NEEDS MIGRATION to secondary palette

**Bulk Actions Bar (bulk-actions-bar.component.scss):**
- Current: Already uses secondary (teal) colors
  - Background: `$secondary-light-color` (#C5F0DE)
  - Border: `$secondary-dark-color` (#32AD7B)
  - Text: `$secondary-darker-color` (#077F4F)
- Status: CORRECT - matches target palette

**File Rows (file.component.scss):**
- Current: Mixed approach
  - `.file.selected` (details panel selection): Uses solid secondary `$secondary-color` (#79DFB6)
  - `.file.bulk-selected` (checkbox selection): Uses 30% opacity teal `rgba($secondary-color, 0.3)`
  - Hover (unselected): Uses `$secondary-light-color` (#C5F0DE)
- Status: MOSTLY CORRECT - opacity is in 30-40% range

**File Actions Bar (file-actions-bar.component.scss):**
- Current: Uses solid secondary color
  - Background: `$secondary-color` (#79DFB6)
  - Border: `$secondary-dark-color` (#32AD7B)
- Status: CORRECT - represents single-file selection

### Color Variables Available

From `_bootstrap-variables.scss` and `_common.scss`:
```scss
// Base theme color
$secondary: #79DFB6;  // Bootstrap theme override

// Derived application variables
$secondary-color: $secondary;           // #79DFB6 - Base teal
$secondary-light-color: #C5F0DE;        // Light teal (bulk actions bar)
$secondary-dark-color: #32AD7B;         // Dark teal (borders)
$secondary-darker-color: #077F4F;       // Darker teal (text)
```

### Current Opacity Usage

```scss
// file.component.scss line 38
.file.bulk-selected {
    background-color: rgba($secondary-color, 0.3);  // 30% opacity
}
```

This is already within the 30-40% range specified in context decisions.

### Current Hover Implementation

```scss
// file.component.scss lines 260-262
.file:not(.selected):not(.bulk-selected):hover {
    background-color: $secondary-light-color;
}
```

Context specifies adding 100ms fade transition for polish.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Color intensity variations | Manual hex lightening/darkening | Bootstrap's `tint-color()` and `shade-color()` | Maintains color relationships, handles edge cases, consistent percentages |
| Transparent backgrounds | CSS opacity property | SCSS `rgba()` function with color variable | Opacity affects all children, rgba only affects background |
| Graduated color scheme | Multiple separate color definitions | Single base color + systematic functions | Single source of truth, easier theme changes |
| Color contrast checking | Visual inspection | Bootstrap's color-contrast() function | Ensures WCAG compliance, especially with darker teal text |
| Hover transitions | No transition or hard-coded values | CSS transition with standard duration | 100ms is established UX standard for hover feedback |

**Key insight:** The codebase already has the color variable infrastructure from Phase 2. Phase 3 is primarily a migration task (banner: primary → secondary) plus minor polish (hover transitions).

## Common Pitfalls

### Pitfall 1: Breaking Visual Hierarchy
**What goes wrong:** Using the same intensity of teal for banner, bar, and rows makes them blend together
**Why it happens:** Thinking of selection as a binary state rather than a hierarchical system
**How to avoid:** Use graduated intensities: darkest for banner (most prominent), medium for actions bar, lightest for rows
**Warning signs:** User feedback that selection components are hard to distinguish from each other

### Pitfall 2: Text Readability on Teal Backgrounds
**What goes wrong:** Primary-dark-color (blue) text on secondary (teal) background has poor contrast
**Why it happens:** Forgetting to migrate text colors when changing backgrounds
**How to avoid:** When changing background to secondary palette, change text to $secondary-darker-color
**Warning signs:** Low contrast ratios, hard to read text in selection banner

### Pitfall 3: Opacity vs RGBA Confusion
**What goes wrong:** Using CSS opacity property instead of rgba() for transparent backgrounds
**Why it happens:** Both create transparency, but opacity affects all descendants
**How to avoid:** Always use `rgba($color-variable, 0.3)` for backgrounds, never `opacity: 0.3` on parent
**Warning signs:** Text becoming transparent along with background, child elements fading

### Pitfall 4: Animated Selections Feel Sluggish
**What goes wrong:** Adding transitions to selection state changes makes UI feel unresponsive
**Why it happens:** Copying hover transition pattern to all state changes
**How to avoid:** Context specifies instant transitions for selection, 100ms only for hover
**Warning signs:** Checkbox feels delayed, selection changes feel laggy

### Pitfall 5: Inconsistent Hover Behavior
**What goes wrong:** Adding hover effects to selected items creates visual confusion
**Why it happens:** Applying hover styles globally without considering selection state
**How to avoid:** Context specifies no hover change for selected rows - `:not(.bulk-selected)` selector critical
**Warning signs:** Selected rows changing color on hover, visual instability

### Pitfall 6: Button Color Conflicts
**What goes wrong:** Banner buttons use `.btn-outline-secondary` which becomes confusing with teal background
**Why it happens:** Not updating button classes when changing banner background color
**How to avoid:** Review button classes when changing container background - may need primary or white buttons
**Warning signs:** Poor button contrast, buttons blend into background

## Code Examples

Verified patterns from official sources and current codebase:

### Migrating Selection Banner to Teal
```scss
// Source: Current selection-banner.component.scss + context decisions
// selection-banner.component.scss

// BEFORE - Primary (blue) colors
.selection-banner {
    background-color: $primary-light-color;  // #D7E7F4 light blue
    border: 1px solid $primary-color;         // #337BB7 blue
}

.selection-count {
    color: $primary-dark-color;  // #2e6da4 dark blue
}

.select-all-link {
    color: $primary-color;
    &:hover {
        color: $primary-dark-color;
    }
}

// AFTER - Secondary (teal) colors with darkest intensity
.selection-banner {
    // Option 1: Use medium teal (lighter than base)
    background-color: $secondary-light-color;  // #C5F0DE - matches bulk actions bar
    border: 1px solid $secondary-dark-color;    // #32AD7B

    // Option 2: Use base teal (darker, more prominent)
    // background-color: $secondary-color;  // #79DFB6 - more prominent
    // border: 1px solid $secondary-dark-color;
}

.selection-count {
    color: $secondary-darker-color;  // #077F4F dark teal for contrast
}

.select-all-link {
    color: $secondary-dark-color;    // #32AD7B
    &:hover {
        color: $secondary-darker-color;  // #077F4F
    }
}
```

### Adding Hover Transition to File Rows
```scss
// Source: Context decisions + current file.component.scss
// file.component.scss

// BEFORE - No transition
.file:not(.selected):not(.bulk-selected):hover {
    background-color: $secondary-light-color;
}

// AFTER - 100ms fade for polish
.file:not(.selected):not(.bulk-selected):hover {
    background-color: $secondary-light-color;
    transition: background-color 0.1s ease;  // Quick fade transition
}
```

### Banner Button Color Adjustment
```scss
// selection-banner.component.html

// BEFORE - May need adjustment depending on background intensity
<button class="btn btn-sm btn-outline-secondary clear-btn">Clear</button>

// AFTER - Consider these options based on final banner background:

// Option 1: If banner uses $secondary-light-color (lighter teal)
// Keep btn-outline-secondary - has good contrast with light teal

// Option 2: If banner uses $secondary-color (medium teal)
// Consider btn-outline-dark or btn-outline-primary for better contrast
<button class="btn btn-sm btn-outline-dark clear-btn">Clear</button>
```

### Optional: Adjusting Selected Row Opacity
```scss
// Source: Context decisions specify 30-40% opacity range
// file.component.scss

// CURRENT - 30% opacity (lower end of range)
.file.bulk-selected {
    background-color: rgba($secondary-color, 0.3);
}

// IF NEEDED - 35% opacity (middle of range) for more prominence
.file.bulk-selected {
    background-color: rgba($secondary-color, 0.35);
}

// NOTE: Current 30% is already within acceptable range per context.
// Only adjust if user feedback indicates selection not visible enough.
```

### Ensuring Instant Selection Changes
```scss
// file.component.scss

// Checkbox already configured for instant changes
input[type="checkbox"] {
    transition: none;  // Already implemented - keeps instant feel
}

// Selection background should NOT have transition property
.file.bulk-selected {
    background-color: rgba($secondary-color, 0.3);
    // No transition property = instant background change
}

// Only hover has transition
.file:not(.selected):not(.bulk-selected):hover {
    transition: background-color 0.1s ease;  // Only on hover
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single selection color for all UI | Graduated intensity hierarchy | Modern design systems | Better visual hierarchy, clearer component relationships |
| CSS opacity for transparency | SCSS rgba() with variables | Sass maturity | Text stays opaque, only background transparent |
| No hover feedback | Subtle hover transitions (100ms) | Modern UX standards | Improved discoverability, feels more responsive |
| Inconsistent selection colors | Unified color family across components | Bootstrap 5+ theme system | Visual cohesion, clear selection paradigm |
| Hardcoded selection colors | Variable-based theme colors | Bootstrap theming | Easy theme changes, maintainable |

**Deprecated/outdated:**
- Mixed primary/secondary colors for selection states - causes visual confusion
- No visual hierarchy between selection components - all feel equally important
- Instant hover changes (no transition) - feels dated, lacking polish

## Open Questions

1. **Selection banner intensity level**
   - What we know: Context specifies "darkest" for banner, but bulk actions bar already uses $secondary-light-color
   - What's unclear: Should banner use $secondary-color (darker than bar) or $secondary-light-color (same as bar)?
   - Recommendation: Use $secondary-color for banner (darker) to maintain hierarchy specified in context
   - Rationale: Context says "darkest" for banner, "medium" for bar, "lightest" for rows

2. **Banner button styling**
   - What we know: Current banner has `.btn-outline-secondary` on Clear button
   - What's unclear: With teal background, does outline-secondary button have enough contrast?
   - Recommendation: Test visually. If banner uses $secondary-light-color, keep outline-secondary. If $secondary-color, consider outline-dark
   - Rationale: Button must be clearly distinguishable from background

3. **Selected row text color**
   - What we know: Context says "text and icons shift to darker teal on selected items"
   - What's unclear: Current file.component.scss doesn't show text color changes on .bulk-selected
   - Recommendation: If original colors persist without issue, no change needed (context later says "darker teal text provides unified look")
   - Rationale: 30% opacity background is subtle enough that original text colors likely remain readable

4. **File actions bar relationship**
   - What we know: File actions bar uses $secondary-color (solid) for single-file selection
   - What's unclear: Should this match banner intensity or remain distinct?
   - Recommendation: Keep as-is - represents different selection type (single file vs bulk)
   - Rationale: Context focuses on banner, bulk actions bar, and selected rows - doesn't mention file actions bar

## Implementation Scope

### Files to Modify

1. **selection-banner.component.scss** (PRIMARY)
   - Change background from $primary-light-color to $secondary-light-color or $secondary-color
   - Change border from $primary-color to $secondary-dark-color
   - Change text color from $primary-dark-color to $secondary-darker-color
   - Update link colors from primary to secondary palette

2. **file.component.scss** (MINOR)
   - Add 100ms transition to hover state (line 261)
   - Optional: Adjust bulk-selected opacity from 0.3 to 0.35 if needed
   - Optional: Add text color for .bulk-selected if testing shows readability issues

3. **bulk-actions-bar.component.scss** (NO CHANGE)
   - Already uses correct secondary color palette
   - No changes needed per current implementation

### Testing Checklist

1. **Visual hierarchy**: Banner should be more prominent than bulk actions bar
2. **Text readability**: All text on teal backgrounds passes contrast checks
3. **Hover behavior**: Unselected rows show teal hint with smooth fade, selected rows no change
4. **Selection responsiveness**: Checkbox and row selection changes feel instant
5. **Color consistency**: All selection UI uses teal/secondary family, no blue remnants
6. **Button contrast**: Banner Clear button clearly visible against background

## Sources

### Primary (HIGH confidence)
- [Bootstrap 5.3 Color Functions](https://getbootstrap.com/docs/5.3/customize/sass/#color-functions) - shade-color(), tint-color() documentation
- Current codebase analysis - _bootstrap-variables.scss, selection component files
- Phase 2 verification report - Confirms color variable infrastructure in place

### Secondary (MEDIUM confidence)
- [Material Design Selection Patterns](https://m2.material.io/design/interaction/selection.html) - Visual hierarchy in selection states
- [Nielsen Norman Group: Visual Hierarchy](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/) - Principles of graduated intensity

### Tertiary (LOW confidence)
- [CSS Tricks: RGBA vs Opacity](https://css-tricks.com/almanac/properties/o/opacity/) - Differences between rgba and opacity property

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Bootstrap 5.3.3 already installed, color functions available
- Architecture: HIGH - Color variable system from Phase 2 is in place and verified
- Current state: HIGH - All component files analyzed, current color usage documented
- Implementation: HIGH - Changes are straightforward SCSS variable swaps

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable domain, color theming is mature)

## What You Need to Know to Plan This Phase Well

### Critical Success Factors

1. **Color Intensity Hierarchy**: The graduated intensity approach (darkest→medium→lightest) is not optional - it's how users will distinguish between selection banner, actions bar, and selected rows. Without this hierarchy, the UI becomes a sea of teal.

2. **Single-File vs Bulk Selection**: The codebase has TWO selection concepts:
   - `.file.selected` = single file selected for details panel (uses solid teal)
   - `.file.bulk-selected` = file checked for bulk operations (uses 30% teal)
   - These must remain visually distinct - don't make them identical

3. **Bootstrap Function Access**: The shade-color() and tint-color() functions are available because styles.scss imports Bootstrap functions first. Component files access these through `@use '../../common/common'` which imports _bootstrap-variables.scss.

4. **No New Variables Needed**: Phase 2 already created all the secondary color variables needed:
   - $secondary-color, $secondary-light-color, $secondary-dark-color, $secondary-darker-color
   - Don't create $selection-bg or $selection-border - use existing variables

5. **Migration Pattern**: This is a SWAP operation, not a creation operation:
   - selection-banner.component.scss: Find/replace $primary-* with $secondary-*
   - Similar to what Phase 2 did for other components

### Planning Considerations

**Effort Estimation:**
- Selection banner migration: ~15 minutes (simple variable swap)
- Hover transition addition: ~5 minutes (add one line)
- Testing and verification: ~20 minutes (visual checks, contrast verification)
- Total: ~40 minutes of focused work

**Risk Areas:**
- Text contrast on teal backgrounds - must verify readability
- Banner button visibility - may need class change depending on background intensity
- File actions bar should stay unchanged (single-file selection context)

**Quick Wins:**
- Bulk actions bar already correct - no work needed
- File row opacity already in correct range (30%)
- Color variables all exist - no variable creation needed

**Decision Points:**
1. Banner background: $secondary-light-color (same as bar) or $secondary-color (darker)?
   - Recommend: $secondary-color for "darkest" hierarchy per context
2. Selected row opacity: Keep at 30% or increase to 35-40%?
   - Recommend: Keep at 30% unless testing shows insufficient visibility
3. Banner button: Keep outline-secondary or change to outline-dark?
   - Recommend: Decide after seeing banner background color in browser

### Integration Points

**Depends on Phase 2:**
- Needs _bootstrap-variables.scss with secondary color definitions ✓ (verified complete)
- Needs Bootstrap functions available through _common.scss ✓ (verified working)
- Needs @use pattern for importing variables ✓ (already in all component files)

**No backend changes needed** - this is pure SCSS styling

**No HTML changes needed** - CSS classes remain the same, only colors change

**Angular component TypeScript unchanged** - only SCSS files modified

### Verification Strategy

**Must verify:**
1. grep for "$primary" in selection-banner.component.scss returns zero results
2. Visual browser check: Banner is more prominent than bulk actions bar
3. WCAG contrast check: Text on teal backgrounds meets AA standards (4.5:1 for normal text)
4. Behavioral check: Hover on unselected rows shows fade transition
5. Behavioral check: Hover on selected rows shows no change

**Nice to verify:**
- No blue colors anywhere in selection UI
- Selection count text clearly readable
- Clear button stands out from background
