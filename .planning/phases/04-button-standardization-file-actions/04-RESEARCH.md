# Phase 4: Button Standardization - File Actions - Research

**Researched:** 2026-02-03
**Domain:** Bootstrap 5.3 button components, Angular button patterns, file action UI
**Confidence:** HIGH

## Summary

This phase migrates file action buttons on the Dashboard page from custom CSS (`%button` placeholder + custom `.button` classes) to Bootstrap `btn` classes. The codebase currently has two button systems: (1) a legacy custom button system defined in `_common.scss` using a `%button` SCSS placeholder with hardcoded colors and manual state management, and (2) an emerging Bootstrap button pattern already in use in `file-actions-bar.component.html` and `bulk-actions-bar.component.html`.

The key migration targets are:
1. **file.component.html** - Contains `.actions .button` divs with custom styling (currently hidden via `display: none` in favor of file-actions-bar)
2. **file-actions-bar.component.html** - Already uses Bootstrap `btn` classes but needs alignment with context decisions (Stop should use btn-danger, Extract should use btn-secondary)
3. **bulk-actions-bar.component.html** - Already uses Bootstrap `btn` classes but needs variant alignment (Stop = btn-danger, Extract = btn-secondary)

Bootstrap 5.3.3 provides complete button infrastructure: `.btn` base class with semantic variants (`btn-primary`, `btn-secondary`, `btn-danger`), size modifiers (`btn-sm`, `btn-lg`), built-in states (hover, disabled, focus), and approximately 38px default height. The context decisions specify using Bootstrap defaults for all sizing and state appearance, with specific semantic color mappings for actions.

**Primary recommendation:** Migrate all file action buttons to use Bootstrap `btn` + `btn-{variant}` classes with semantic mapping: Queue/Start = `btn-primary` (blue), Stop/Delete = `btn-danger` (red), Extract/neutral = `btn-secondary`. Remove the `%button` placeholder from `_common.scss` once no longer referenced.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bootstrap | 5.3.3 | CSS framework with button component | Industry standard, includes all button states, accessibility features, customizable via SCSS variables |
| Angular | 19.2.18 | Frontend framework | Application framework, uses `[disabled]` binding for button state |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Bootstrap Spinners | 5.3.3 | Loading state indicators | When buttons need to show loading state (`spinner-border-sm`) |
| Bootstrap Icons | 1.11.x | Icon library | For button icons if migrating from custom SVGs (optional) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bootstrap `btn` classes | Custom `%button` placeholder | Custom = more code, less consistent, more maintenance; Bootstrap = standard, accessible, maintainable |
| `btn-sm` for compact areas | Default sizing | Context specifies default sizing (~38px), so use default everywhere |
| `btn-outline-*` variants | Solid variants | Context specifies solid variants for icon-only buttons; outline only where explicitly chosen |

**Installation:**
Already installed via Phase 1 (Bootstrap 5.3.3).

## Architecture Patterns

### Pattern 1: Bootstrap Button Semantic Mapping
**What:** Map action types to Bootstrap semantic button variants
**When to use:** All file action buttons
**Example:**
```html
<!-- Source: Bootstrap 5.3 official docs + context decisions -->

<!-- Primary actions: Queue, Start -->
<button class="btn btn-primary" (click)="onQueue()">
    <img src="assets/icons/queue.svg" alt="" class="me-1" />
    Queue
</button>

<!-- Destructive actions: Stop, Delete -->
<button class="btn btn-danger" (click)="onStop()">
    <img src="assets/icons/stop.svg" alt="" class="me-1" />
    Stop
</button>

<!-- Secondary/neutral actions: Extract, menu toggles -->
<button class="btn btn-secondary" (click)="onExtract()">
    <img src="assets/icons/extract.svg" alt="" class="me-1" />
    Extract
</button>
```

### Pattern 2: Icon + Text Button Layout
**What:** Icon on left, text on right, with Bootstrap spacing utility
**When to use:** Buttons with both icon and text
**Example:**
```html
<!-- Source: Bootstrap icon-link helper pattern -->
<button class="btn btn-primary">
    <img src="assets/icons/queue.svg" alt="" class="me-1" />
    Queue
</button>

<!-- Icon spacing: me-1 (margin-end: 0.25rem) or me-2 (0.5rem) -->
<!-- Icon sizing: Should match font size, typically 16px for default buttons -->
```

### Pattern 3: Disabled State with Angular
**What:** Use Angular `[disabled]` binding, Bootstrap handles appearance
**When to use:** All conditional button disabling
**Example:**
```html
<!-- Source: Bootstrap + Angular pattern -->
<button class="btn btn-primary"
        [disabled]="!isQueueable()"
        (click)="onQueue()">
    Queue
</button>

<!-- Bootstrap automatically applies:
     - opacity: 0.65
     - pointer-events: none
     - cursor: default
-->
```

### Pattern 4: Loading State with Spinner
**What:** Replace icon with spinner, disable button during loading
**When to use:** Actions that take time (API calls)
**Example:**
```html
<!-- Source: Bootstrap 5.3 spinner documentation -->
<button class="btn btn-primary"
        [disabled]="isLoading"
        (click)="onQueue()">
    <!-- Show spinner when loading -->
    <span *ngIf="isLoading"
          class="spinner-border spinner-border-sm me-1"
          aria-hidden="true"></span>
    <!-- Show icon when not loading -->
    <img *ngIf="!isLoading"
         src="assets/icons/queue.svg"
         alt=""
         class="me-1" />
    <span>{{ isLoading ? 'Queuing...' : 'Queue' }}</span>
</button>
```

### Pattern 5: Icon-Only Button
**What:** Button with icon only, solid variant, proper sizing
**When to use:** Compact UI areas where text doesn't fit
**Example:**
```scss
// Ensure square-ish shape for icon-only buttons
.btn-icon-only {
    // Match height by making width equal padding + icon
    padding-left: .5rem;
    padding-right: .5rem;

    img {
        width: 1em;
        height: 1em;
    }
}
```
```html
<button class="btn btn-primary btn-icon-only"
        [disabled]="!isQueueable()"
        (click)="onQueue()">
    <img src="assets/icons/queue.svg" alt="Queue" />
</button>
```

### Pattern 6: Button Group for Related Actions
**What:** Use Bootstrap button groups for logically related actions
**When to use:** When multiple buttons form a single conceptual group
**Example:**
```html
<!-- Source: Bootstrap button-group component -->
<div class="btn-group" role="group" aria-label="File actions">
    <button class="btn btn-primary" [disabled]="!isQueueable()">Queue</button>
    <button class="btn btn-danger" [disabled]="!isStoppable()">Stop</button>
</div>
```

### Anti-Patterns to Avoid

- **Custom button placeholder:** Don't use the `%button` SCSS placeholder when Bootstrap classes suffice - creates inconsistency
- **Mixing outline and solid for same action type:** Context specifies solid variants for icon-only buttons
- **`btn-outline-danger` for Delete Local:** Context specifies solid variants; use `btn-danger` for both delete actions
- **Custom 40px height override:** Context explicitly uses Bootstrap default (~38px), don't override
- **Manual hover/active states:** Bootstrap provides these; don't duplicate in component SCSS
- **Using `div` instead of `button`:** Current code uses `<div class="button">` - migrate to `<button class="btn">`
- **Icon color inversion in SCSS:** Current code uses `filter: invert(1.0)` - Bootstrap btn colors handle contrast automatically

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Button hover states | Custom `:hover` color calculation | Bootstrap `btn-*` classes | Bootstrap uses shade-color() with 15% shade, handles all variants consistently |
| Button disabled appearance | Custom `[disabled]` styling | Bootstrap disabled state | Bootstrap applies opacity: 0.65, pointer-events: none, cross-browser consistent |
| Button focus rings | Custom `:focus` outline | Bootstrap focus-ring utility | Bootstrap provides accessible, theme-aware focus indicators |
| Icon spacing in buttons | Custom margin on icons | `me-1` or `me-2` utility classes | Bootstrap spacing scale is consistent, theme-aware |
| Loading spinners | Custom CSS animation | Bootstrap `spinner-border-sm` | Bootstrap spinners respect prefers-reduced-motion, accessible |
| Button sizing | Custom padding/height | Bootstrap default (no `btn-sm` or `btn-lg`) | Context specifies default sizing, Bootstrap provides ~38px height |
| Button transitions | Custom `transition` property | Bootstrap default (150ms ease-in-out) | Bootstrap applies consistent transitions to all state changes |

**Key insight:** The current `%button` placeholder in `_common.scss` manually recreates what Bootstrap `btn` classes provide automatically. Migration eliminates ~30 lines of custom button styling.

## Common Pitfalls

### Pitfall 1: Forgetting to Migrate Event Handling
**What goes wrong:** Changing `<div class="button">` to `<button class="btn">` but keeping `(click)="!isQueueable() || onQueue(file)"`
**Why it happens:** The `!condition || action()` pattern was used with divs that don't have native disabled state
**How to avoid:** Use `[disabled]="!isQueueable()"` and standard `(click)="onQueue(file)"` - Angular won't fire click when disabled
**Warning signs:** Disabled-looking buttons still respond to clicks

### Pitfall 2: Icon Color Not Adapting
**What goes wrong:** Icons remain dark on colored button backgrounds
**Why it happens:** SVG icons don't automatically invert; current code uses `filter: invert(1.0)`
**How to avoid:** Keep the `filter: invert(1)` on icon images inside buttons, or use Bootstrap Icons which are CSS-colored
**Warning signs:** Icons barely visible against btn-primary or btn-danger backgrounds

### Pitfall 3: Breaking Loading State
**What goes wrong:** Migrated buttons lose the loading spinner functionality
**Why it happens:** Current code has custom `.loading` class with custom spinner
**How to avoid:** Migrate to Bootstrap spinner pattern with `spinner-border-sm`
**Warning signs:** No visual feedback during async operations

### Pitfall 4: Inconsistent Button Variants in Same Component
**What goes wrong:** file-actions-bar uses `btn-warning` for Stop, bulk-actions-bar uses same, but context specifies `btn-danger`
**Why it happens:** Not applying context decisions consistently
**How to avoid:** Audit all button components against context decision: Stop = btn-danger, not btn-warning
**Warning signs:** Stop button is yellow instead of red

### Pitfall 5: Removing Button Display When Hidden
**What goes wrong:** Migrating `.actions { display: none }` without understanding why it exists
**Why it happens:** file.component.scss hides `.actions` because virtual scrolling requires fixed row heights
**How to avoid:** Leave the `display: none` rule in place OR verify the file-actions-bar external component handles actions
**Warning signs:** Actions bar appears inside file rows, breaks virtual scroll

### Pitfall 6: Using btn-sm When Default is Specified
**What goes wrong:** Adding `btn-sm` because current buttons look small
**Why it happens:** Habit of making buttons compact
**How to avoid:** Context explicitly specifies using Bootstrap default sizing (~38px), not btn-sm
**Warning signs:** Buttons look different from Bootstrap default examples

## Code Examples

Verified patterns from official sources:

### Migrating Custom Button to Bootstrap
```html
<!-- Source: Current file.component.html pattern -->

<!-- BEFORE: Custom div-based button -->
<div class="button" appClickStopPropagation
     [attr.disabled]="isQueueable() ? null : true"
     (click)="!isQueueable() || onQueue(file)"
     [class.loading]="activeAction == FileAction.QUEUE">
    <div class="loader"></div>
    <img src="assets/icons/queue.svg" />
    <div class="text"><span>Queue</span></div>
</div>

<!-- AFTER: Bootstrap button -->
<button class="btn btn-primary"
        appClickStopPropagation
        [disabled]="!isQueueable()"
        (click)="onQueue(file)">
    <span *ngIf="activeAction === FileAction.QUEUE"
          class="spinner-border spinner-border-sm me-1"
          aria-hidden="true"></span>
    <img *ngIf="activeAction !== FileAction.QUEUE"
         src="assets/icons/queue.svg"
         alt=""
         class="me-1" />
    Queue
</button>
```

### Standardizing file-actions-bar Variants
```html
<!-- Source: file-actions-bar.component.html + context decisions -->

<!-- Stop: Change from btn-warning to btn-danger per context -->
<button class="btn btn-danger"
        [disabled]="!isStoppable()"
        [class.loading]="activeAction === 'stop'"
        (click)="onStop()">
    <img src="assets/icons/stop.svg" alt="" class="me-1" />
    Stop
</button>

<!-- Extract: Change from btn-info to btn-secondary per context -->
<button class="btn btn-secondary"
        [disabled]="!isExtractable()"
        [class.loading]="activeAction === 'extract'"
        (click)="onExtract()">
    <img src="assets/icons/extract.svg" alt="" class="me-1" />
    Extract
</button>

<!-- Delete Local: Change from btn-outline-danger to btn-danger per context (solid variants) -->
<button class="btn btn-danger"
        [disabled]="!isLocallyDeletable()"
        [class.loading]="activeAction === 'delete_local'"
        (click)="onDeleteLocal()">
    <img src="assets/icons/delete-local.svg" alt="" class="me-1" />
    Delete Local
</button>
```

### Icon Styling for Bootstrap Buttons
```scss
// Source: Current pattern + Bootstrap adaptation

// In component SCSS file
.actions button {
    img {
        height: 1em;    // Match font size
        width: 1em;
        filter: invert(1);  // Make dark icons white for colored backgrounds
    }

    &:disabled img {
        opacity: 0.5;  // Dim icon when disabled (matches Bootstrap's 0.65 opacity)
    }
}
```

### Removing %button Placeholder Usage
```scss
// Source: _common.scss

// BEFORE: Custom button placeholder (TO BE REMOVED)
%button {
    background-color: $primary-color;
    color: white;
    border: 1px solid $primary-dark-color;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: default;
    user-select: none;

    &:active {
        background-color: shade-color($primary-color, 20%);
    }

    &[disabled] {
        opacity: .65;
        background-color: $primary-color;
    }

    &.selected {
        background-color: $secondary-color;
        border-color: $secondary-darker-color;
    }
}

// AFTER: Remove %button entirely once all usages migrated to Bootstrap btn classes
// Components should use Bootstrap classes directly:
// - btn btn-primary (replaces default %button)
// - btn btn-secondary (replaces %button.selected)
// - [disabled] attribute (replaces [attr.disabled])
```

## Bootstrap 5.3 Button Sizing Reference

Understanding the default button height calculation:

| Property | Default Value | Small (btn-sm) | Large (btn-lg) |
|----------|---------------|----------------|----------------|
| padding-y | 0.375rem (6px) | 0.25rem (4px) | 0.5rem (8px) |
| padding-x | 0.75rem (12px) | 0.5rem (8px) | 1rem (16px) |
| font-size | 1rem (16px) | 0.875rem (14px) | 1.25rem (20px) |
| line-height | 1.5 | 1.5 | 1.5 |
| border-width | 1px | 1px | 1px |
| **Computed height** | ~38px | ~31px | ~48px |

**Context decision:** Use default sizing (~38px), not btn-sm or btn-lg.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom `%button` placeholder | Bootstrap `btn` classes | Bootstrap 5 adoption | Less custom CSS, consistent states, accessible |
| `div` with click handler | `button` element with [disabled] | HTML5 semantic elements | Better accessibility, native disabled behavior |
| Manual hover/active colors | Bootstrap shade-color() system | Bootstrap 5 | Consistent color variations, theme-aware |
| Custom loading spinner CSS | Bootstrap `spinner-border` | Bootstrap 5 spinners | Respects prefers-reduced-motion, consistent |
| `[attr.disabled]` on div | `[disabled]` on button | Native HTML | Proper keyboard accessibility, no click when disabled |

**Deprecated/outdated:**
- `%button` SCSS placeholder: Should be removed after migration, replaced by Bootstrap btn classes
- `<div class="button">`: Should be replaced with `<button class="btn">` for semantics
- Custom `.loader` animation: Should be replaced with Bootstrap `spinner-border`
- Manual `filter: invert(1.0)` might be replaceable with Bootstrap Icons if icon library migration is desired (optional, Claude's discretion)

## Open Questions

1. **Icon library migration**
   - What we know: Current code uses custom SVG icons with `filter: invert(1)` for white-on-color appearance
   - What's unclear: Should icons migrate to Bootstrap Icons for consistency?
   - Recommendation: Keep existing SVG icons with `filter: invert(1)` - simpler, no new dependencies
   - Rationale: Context focuses on button classes, not icon library

2. **file.component.html .actions section**
   - What we know: The `.actions` div in file.component.html is hidden (`display: none`) because file-actions-bar handles actions externally
   - What's unclear: Should this hidden section be removed entirely, or kept for future use?
   - Recommendation: Keep but migrate to Bootstrap classes - minimal effort, useful for potential future restoration
   - Rationale: Virtual scroll architecture may change; having migrated buttons ready is low-cost

3. **Loading state pattern**
   - What we know: Current code uses custom `.loading` class with CSS spinner
   - What's unclear: Should loading state show spinner + text, or spinner only?
   - Recommendation: Spinner + text for clarity (e.g., "Queuing...")
   - Rationale: Better user feedback, Bootstrap pattern supports both

4. **Icon sizing inside buttons**
   - What we know: Context gives discretion on icon sizing
   - What's unclear: Exact pixel size for icons in default-sized buttons
   - Recommendation: Use `1em` (matches font-size, ~16px in default buttons)
   - Rationale: Scales with button text, Bootstrap icon-link pattern uses 1em

## Implementation Scope

### Files to Modify

1. **file-actions-bar.component.html** (HIGH PRIORITY)
   - Change `btn-warning` to `btn-danger` for Stop button
   - Change `btn-info` to `btn-secondary` for Extract button
   - Change `btn-outline-danger` to `btn-danger` for Delete Local (solid per context)
   - Add `me-1` spacing between icons and text (verify current state)
   - Ensure loading state uses Bootstrap spinner pattern

2. **file-actions-bar.component.scss** (MEDIUM)
   - Verify icon styling (filter: invert for white icons on colored backgrounds)
   - Remove any redundant styling that Bootstrap handles
   - Keep mobile responsiveness rules

3. **bulk-actions-bar.component.html** (HIGH PRIORITY)
   - Change `btn-warning` to `btn-danger` for Stop button
   - Change `btn-info` to `btn-secondary` for Extract button
   - Change `btn-outline-danger` to `btn-danger` for Delete Local (solid per context)
   - Already has loading spinner pattern

4. **bulk-actions-bar.component.scss** (LOW)
   - Verify action-btn styles don't conflict with Bootstrap
   - Keep responsive rules

5. **file.component.html** (OPTIONAL - hidden content)
   - Migrate `<div class="button">` to `<button class="btn">` if restoring hidden .actions
   - Not urgent since this section is display:none

6. **file.component.scss** (LOW)
   - Remove `.actions .button` styling after migration
   - Remove custom `.loader` animation after migration to Bootstrap spinner
   - Keep `display: none` on `.actions`

7. **_common.scss** (CLEANUP)
   - Remove `%button` placeholder once all usages are migrated
   - Verify no other components extend %button

### Testing Checklist

1. **Visual verification**: All action buttons use correct variants (Queue=primary, Stop=danger, Extract=secondary, Delete=danger)
2. **State verification**: Disabled buttons show 65% opacity, no click response
3. **Hover verification**: Bootstrap hover states work (15% shade darkening)
4. **Focus verification**: Focus rings appear on keyboard navigation
5. **Loading verification**: Spinner appears during async operations
6. **Icon verification**: Icons visible (white) on colored backgrounds
7. **Size verification**: Buttons are ~38px height (Bootstrap default)
8. **Mobile verification**: Buttons remain same size on narrow screens (no responsive resizing per context)
9. **Functional regression**: All button clicks trigger correct actions

## Sources

### Primary (HIGH confidence)
- [Bootstrap 5.3 Buttons Documentation](https://getbootstrap.com/docs/5.3/components/buttons/) - Button classes, variants, states
- [Bootstrap 5.3 Spinners Documentation](https://getbootstrap.com/docs/5.3/components/spinners/) - Loading state pattern
- [Bootstrap 5.3 Icon Link Helper](https://getbootstrap.com/docs/5.3/helpers/icon-link/) - Icon spacing in buttons (0.375rem gap)
- Bootstrap 5.3.3 source (`node_modules/bootstrap/scss/_variables.scss`) - Verified button sizing variables
- Current codebase analysis - file.component.html, file-actions-bar.component.html, bulk-actions-bar.component.html

### Secondary (MEDIUM confidence)
- [Bootstrap 5.3 Spacing Utilities](https://getbootstrap.com/docs/5.3/utilities/spacing/) - me-1, me-2 for icon spacing
- [Bootstrap Migration Guide](https://getbootstrap.com/docs/5.3/migration/) - Button class changes from v4

### Tertiary (LOW confidence)
- [Tutorial Republic - Bootstrap Icons](https://www.tutorialrepublic.com/twitter-bootstrap-tutorial/bootstrap-icons.php) - Icon spacing best practices
- [MDBootstrap - Buttons with Icons](https://mdbootstrap.com/docs/standard/extended/buttons-with-icons/) - Icon + text patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Bootstrap 5.3.3 already installed and configured
- Button variants: HIGH - Context decisions explicitly specify variant mapping
- Migration pattern: HIGH - Clear path from custom to Bootstrap classes
- Icon handling: MEDIUM - May need adjustment during implementation
- Loading state: MEDIUM - Pattern clear but implementation details TBD

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - Bootstrap button API is stable)

## What You Need to Know to Plan This Phase Well

### Critical Success Factors

1. **Variant Mapping is Non-Negotiable**: Context decisions specify exact semantic mapping:
   - Queue, Start = `btn-primary` (blue)
   - Stop, Delete = `btn-danger` (red)
   - Extract, menu toggles = `btn-secondary` (gray)
   - NO btn-warning, NO btn-info, NO btn-outline-* for these actions

2. **Two Components Need Alignment**: Both file-actions-bar and bulk-actions-bar currently have incorrect variants:
   - Stop uses `btn-warning` (yellow) but should be `btn-danger` (red)
   - Extract uses `btn-info` (cyan) but should be `btn-secondary` (gray)
   - Delete Local uses `btn-outline-danger` but should be `btn-danger` (solid)

3. **Hidden Actions Section**: file.component.html has an `.actions` div that's hidden by CSS (`display: none`). This exists because virtual scrolling requires fixed row heights. Don't remove the hiding rule.

4. **Icon Inversion Required**: Current icons are dark SVGs. Bootstrap colored buttons need white icons. Keep `filter: invert(1)` on icon images inside buttons.

5. **Default Sizing, Not btn-sm**: Context explicitly chooses Bootstrap default sizing (~38px height). The existing code uses `btn-sm` in some places - remove the `btn-sm` class.

### Planning Considerations

**Effort Estimation:**
- file-actions-bar.component.html variant changes: ~10 minutes
- bulk-actions-bar.component.html variant changes: ~10 minutes
- SCSS cleanup (remove custom styles): ~15 minutes
- %button removal from _common.scss: ~5 minutes (after verifying no other usages)
- Testing and verification: ~30 minutes
- Total: ~70 minutes of focused work

**Risk Areas:**
- Icon visibility on colored backgrounds - verify filter:invert works
- Loading state migration - verify spinner replacement works
- Any other components using %button placeholder - grep before removing

**Quick Wins:**
- Variant changes are simple class swaps
- Bootstrap handles all hover/active/disabled states automatically
- No new dependencies needed

**Decision Points:**
1. btn-sm removal: Context says default size - remove all btn-sm?
   - Recommend: Yes, remove btn-sm everywhere
2. Icon sizing: What value for icon height/width?
   - Recommend: 1em to match Bootstrap icon-link pattern
3. Hidden .actions migration: Migrate to Bootstrap classes even though hidden?
   - Recommend: Yes, low effort, keeps code consistent

### Integration Points

**Depends on Phase 3:**
- Needs unified secondary color palette (used in .selected button states)
- Phase 3 research confirms $secondary-color variables are available

**No backend changes needed** - this is pure frontend component work

**TypeScript changes minimal** - Only if loading state logic changes (likely no changes)

### Verification Strategy

**Must verify:**
1. `grep "btn-warning" src/angular/` returns zero results (Stop buttons migrated)
2. `grep "btn-info" src/angular/` returns zero results (Extract buttons migrated)
3. `grep "btn-outline-danger" src/angular/` returns zero results (Delete Local migrated)
4. Visual check: All action buttons have correct colors
5. Functional check: All buttons trigger correct actions when clicked
6. Disabled check: Disabled buttons don't respond to clicks
7. Keyboard check: Tab navigation works, focus rings visible

**Nice to verify:**
- No custom button styling conflicts with Bootstrap
- Loading spinners appear during async operations
- Icons are visible (white) on all button variants
