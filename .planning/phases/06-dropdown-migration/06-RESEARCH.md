# Phase 6: Dropdown Migration - Research

**Researched:** 2026-02-04
**Domain:** Bootstrap 5.3 Dropdown Component with Angular 19
**Confidence:** HIGH

## Summary

This phase involves migrating the existing custom dropdown implementation (`%dropdown`, `%toggle` SCSS placeholders) to Bootstrap 5.3's native dropdown component. The current codebase already has Bootstrap 5.3.8 with Popper.js properly configured and loaded via `bootstrap.bundle.min.js`.

The existing dropdowns in `file-options.component` already use Bootstrap's `data-bs-toggle="dropdown"` attribute and `.dropdown-menu` / `.dropdown-item` classes, but rely on custom SCSS placeholders (`%dropdown`, `%toggle`) for styling. The migration will involve:
1. Removing the custom SCSS placeholders
2. Applying Bootstrap's native dropdown styling with dark theme customization
3. Implementing close-on-scroll behavior (requires custom JavaScript)
4. Ensuring proper keyboard navigation and accessibility

**Primary recommendation:** Use Bootstrap 5.3's native dropdown component with `data-bs-theme="dark"` attribute and CSS variable overrides for the teal accent color. Add a custom scroll event listener to close dropdowns on scroll.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bootstrap | 5.3.8 | Dropdown component, positioning | Already installed, provides Popper.js integration |
| @popperjs/core | 2.11.8 | Dynamic positioning, flip behavior | Bundled with Bootstrap, handles viewport constraints |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| bootstrap.bundle.min.js | 5.3.x | JavaScript functionality | Already loaded in angular.json |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Bootstrap native | ng-bootstrap | More Angular-native but adds dependency; not needed since Bootstrap JS is already working |
| Bootstrap native | ngx-bootstrap | Same as above; adds complexity for no benefit in this case |

**Installation:**
No additional installation required. Bootstrap 5.3.8 and Popper.js are already installed and configured.

## Architecture Patterns

### Recommended Project Structure
The dropdown implementation should modify existing files:
```
src/angular/src/app/
├── common/
│   ├── _bootstrap-overrides.scss  # Add dark dropdown theme overrides
│   └── _common.scss               # Remove z-index if consolidated
├── pages/files/
│   ├── file-options.component.scss  # REMOVE %dropdown, %toggle placeholders
│   ├── file-options.component.html  # Minimal changes (add data-bs-theme)
│   └── file-options.component.ts    # Add scroll listener for close-on-scroll
```

### Pattern 1: Dark Theme Dropdown with CSS Variables
**What:** Apply dark theme using Bootstrap 5.3's color mode system with custom CSS variables
**When to use:** When dropdown needs dark background with custom accent colors
**Example:**
```html
<!-- Apply dark theme to dropdown container -->
<div class="dropdown" data-bs-theme="dark">
  <button class="btn btn-secondary dropdown-toggle" data-bs-toggle="dropdown">
    Dropdown
  </button>
  <ul class="dropdown-menu dropdown-menu-end">
    <li><button class="dropdown-item">Action</button></li>
  </ul>
</div>
```

```scss
// Source: Bootstrap 5.3 Documentation - Color Modes
// In _bootstrap-overrides.scss
[data-bs-theme="dark"] {
  .dropdown-menu {
    --bs-dropdown-bg: #{$primary-color};
    --bs-dropdown-border-color: #{$primary-dark-color};
    --bs-dropdown-link-color: white;
    --bs-dropdown-link-hover-color: white;
    --bs-dropdown-link-hover-bg: #{$secondary-dark-color}; // Teal highlight
    --bs-dropdown-link-active-bg: #{$secondary-dark-color};
    --bs-dropdown-link-disabled-color: rgba(white, 0.65);
    --bs-dropdown-box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
  }
}
```

### Pattern 2: Close-on-Scroll Implementation
**What:** Close all open dropdowns when user scrolls the page
**When to use:** Required for file list scrolling to prevent orphaned dropdowns
**Example:**
```typescript
// Source: Custom implementation based on Bootstrap 5 Dropdown API
// In file-options.component.ts or a shared service

ngOnInit() {
  this.setupScrollListener();
}

ngOnDestroy() {
  this.removeScrollListener();
}

private scrollHandler = () => {
  document.querySelectorAll('.dropdown-toggle.show').forEach(toggle => {
    const instance = bootstrap.Dropdown.getInstance(toggle);
    instance?.hide();
  });
};

private setupScrollListener() {
  // Listen on both window and scrollable containers
  window.addEventListener('scroll', this.scrollHandler, { passive: true });
}

private removeScrollListener() {
  window.removeEventListener('scroll', this.scrollHandler);
}
```

### Pattern 3: End-Aligned Dropdown
**What:** Align dropdown menu to the right edge of the toggle button
**When to use:** When dropdown appears near right edge of viewport
**Example:**
```html
<!-- Source: Bootstrap 5.3 Documentation - Dropdowns -->
<div class="dropdown">
  <button class="btn dropdown-toggle" data-bs-toggle="dropdown">
    Options
  </button>
  <ul class="dropdown-menu dropdown-menu-end">
    <!-- dropdown-menu-end aligns right edge of menu to right edge of button -->
    <li><button class="dropdown-item">Action</button></li>
  </ul>
</div>
```

### Pattern 4: Disabled Items
**What:** Show disabled items greyed out (not hidden)
**When to use:** For items that are contextually unavailable (e.g., Extract on non-archives)
**Example:**
```html
<!-- Source: Bootstrap 5.3 Documentation - Dropdowns -->
<button class="dropdown-item" [class.disabled]="!isExtractable()"
        [attr.aria-disabled]="!isExtractable()"
        (click)="isExtractable() && onExtract()">
  Extract
</button>
```

### Anti-Patterns to Avoid
- **Using `dropdown-menu-dark` class:** Deprecated in v5.3.0, use `data-bs-theme="dark"` instead
- **Preventing click propagation on entire dropdown:** Breaks Bootstrap's click-outside-to-close behavior
- **Manual show/hide without using Bootstrap API:** Can desync internal state
- **Forgetting to clean up scroll listeners:** Memory leak in Angular components

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dropdown positioning | Custom position calculations | Popper.js via Bootstrap | Handles flip, viewport constraints, scroll positioning |
| Keyboard navigation | Custom keydown handlers | Bootstrap's built-in | Arrow keys, Enter, Escape all handled |
| Click outside to close | Document click listeners | Bootstrap's autoClose | Properly handles edge cases |
| Toggle button active state | Manual class toggling | Bootstrap adds `.show` class | Automatic, synced with dropdown state |
| Z-index management | Per-dropdown z-index | Bootstrap's `$zindex-dropdown` variable (1000) | Consistent with other Bootstrap components |

**Key insight:** Bootstrap's dropdown component handles significant complexity around positioning, keyboard navigation, and click handling. The only custom code needed is the scroll-to-close behavior.

## Common Pitfalls

### Pitfall 1: Scroll Listener Not Cleaned Up
**What goes wrong:** Memory leaks and errors when component is destroyed while dropdown is open
**Why it happens:** Event listener added in ngOnInit but not removed in ngOnDestroy
**How to avoid:** Always remove scroll listener in ngOnDestroy, use `takeUntil` pattern or bound function reference
**Warning signs:** "Cannot read property of null" errors after navigation, memory growth over time

### Pitfall 2: Using Deprecated `dropdown-menu-dark` Class
**What goes wrong:** May not work correctly with future Bootstrap updates
**Why it happens:** Old tutorials/examples still reference this approach
**How to avoid:** Use `data-bs-theme="dark"` attribute on dropdown container
**Warning signs:** Bootstrap deprecation warnings in console

### Pitfall 3: Dropdown Closes When Clicking Form Elements Inside
**What goes wrong:** Dropdown closes unexpectedly when user clicks input fields
**Why it happens:** Bootstrap's default autoClose behavior
**How to avoid:** Use `data-bs-auto-close="outside"` if dropdown contains form elements (not applicable to this migration, but good to know)
**Warning signs:** Dropdown closes when interacting with internal elements

### Pitfall 4: Toggle Button Doesn't Show Active/Pressed State
**What goes wrong:** No visual feedback that dropdown is open
**Why it happens:** Not styling the `.show` class Bootstrap adds to toggle
**How to avoid:** Style `.dropdown-toggle.show` for active state
**Warning signs:** User confusion about whether dropdown is open

### Pitfall 5: Z-index Conflicts with Sticky Header
**What goes wrong:** Dropdown appears behind sticky header or other elements
**Why it happens:** App has custom z-index values that conflict with Bootstrap's defaults
**How to avoid:** Ensure dropdown z-index (1000) is below sticky header z-index (201 for file-options)
**Warning signs:** Dropdown content clipped or hidden

### Pitfall 6: Animation CSS Conflicts
**What goes wrong:** Jerky or missing animations
**Why it happens:** Custom CSS overriding Bootstrap's transition properties
**How to avoid:** Let Bootstrap handle fade animations (~150ms built-in), only customize via CSS variables
**Warning signs:** Instant show/hide instead of smooth fade

## Code Examples

Verified patterns from official sources:

### Complete Dropdown HTML Structure
```html
<!-- Source: Bootstrap 5.3 Documentation -->
<div id="filter-status" class="dropdown" data-bs-theme="dark">
  <button class="btn btn-secondary dropdown-toggle"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false">
    <span class="title">Status:</span>
    <span class="selection">All</span>
  </button>
  <ul class="dropdown-menu dropdown-menu-end">
    <li>
      <button class="dropdown-item"
              [class.active]="selectedStatus === null"
              (click)="onSelectStatus(null)">
        All
      </button>
    </li>
    <li>
      <button class="dropdown-item"
              [class.active]="selectedStatus === 'downloading'"
              [class.disabled]="!hasDownloading"
              (click)="hasDownloading && onSelectStatus('downloading')">
        Downloading
      </button>
    </li>
  </ul>
</div>
```

### Dark Theme SCSS Customization
```scss
// Source: Bootstrap 5.3 Documentation - CSS Variables
// Add to _bootstrap-overrides.scss

// Dark dropdown theme with app colors
[data-bs-theme="dark"] {
  .dropdown-menu {
    // Background and border
    --bs-dropdown-bg: #{$primary-color};           // #337BB7 dark blue
    --bs-dropdown-border-color: #{$primary-dark-color}; // #2e6da4
    --bs-dropdown-box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.3);

    // Item colors
    --bs-dropdown-link-color: white;
    --bs-dropdown-link-hover-color: white;
    --bs-dropdown-link-hover-bg: #{$secondary-dark-color}; // #32AD7B teal
    --bs-dropdown-link-active-color: white;
    --bs-dropdown-link-active-bg: #{$secondary-dark-color};
    --bs-dropdown-link-disabled-color: rgba(white, 0.65);
  }

  // Toggle button pressed state
  .dropdown-toggle.show {
    background-color: $secondary-dark-color;
    border-color: $secondary-darker-color;
  }
}

// Transition customization (hover color change)
.dropdown-item {
  transition: background-color 0.1s ease-in-out;
}
```

### TypeScript Scroll Handler
```typescript
// Source: Custom implementation using Bootstrap 5 Dropdown API
import { Component, OnInit, OnDestroy, NgZone } from '@angular/core';
declare var bootstrap: any;

@Component({...})
export class FileOptionsComponent implements OnInit, OnDestroy {

  private scrollHandler = () => {
    // Find all open dropdown toggles
    const openToggles = document.querySelectorAll('.dropdown-toggle.show');
    openToggles.forEach(toggle => {
      const dropdownInstance = bootstrap.Dropdown.getInstance(toggle);
      if (dropdownInstance) {
        dropdownInstance.hide();
      }
    });
  };

  constructor(private ngZone: NgZone) {}

  ngOnInit() {
    // Run outside Angular zone for performance
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
      // Also listen to file list scroll container if applicable
    });
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.scrollHandler);
  }
}
```

### Declaring Bootstrap Global
```typescript
// At top of component file
declare var bootstrap: any;

// Or create a types file: src/types/bootstrap.d.ts
declare namespace bootstrap {
  class Dropdown {
    static getInstance(element: Element): Dropdown | null;
    static getOrCreateInstance(element: Element): Dropdown;
    show(): void;
    hide(): void;
    toggle(): void;
    dispose(): void;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `dropdown-menu-dark` class | `data-bs-theme="dark"` attribute | Bootstrap 5.3.0 (May 2023) | More flexible, supports custom themes |
| jQuery for dropdown control | Native JavaScript API | Bootstrap 5.0 (May 2021) | No jQuery dependency required |
| Hardcoded SCSS colors | CSS custom properties | Bootstrap 5.0 | Runtime theming possible |

**Deprecated/outdated:**
- `.dropdown-menu-dark` class: Deprecated in v5.3.0, use `data-bs-theme="dark"` instead
- jQuery dependency: Bootstrap 5 works without jQuery (though this app still loads it)

## Open Questions

Things that couldn't be fully resolved:

1. **Exact scroll container for file list**
   - What we know: File list may use CDK virtual scroll or native scrolling
   - What's unclear: Which element specifically needs the scroll listener
   - Recommendation: Check if `window` scroll is sufficient or if a specific container needs the listener

2. **Fade animation timing**
   - What we know: Decision specifies ~150ms fade
   - What's unclear: Bootstrap's exact default timing (appears to be ~150ms for `fade` class)
   - Recommendation: Test with Bootstrap defaults first; only customize if noticeably different

## Sources

### Primary (HIGH confidence)
- [Bootstrap 5.3 Dropdowns Documentation](https://getbootstrap.com/docs/5.3/components/dropdowns/) - Complete API reference
- [Bootstrap 5.3 Color Modes](https://getbootstrap.com/docs/5.3/customize/color-modes/) - Dark theme implementation
- [Bootstrap 5.3 CSS Variables](https://getbootstrap.com/docs/5.3/customize/css-variables/) - Customization approach
- Bootstrap source: `node_modules/bootstrap/scss/_dropdown.scss` - CSS variable list verified
- Bootstrap source: `node_modules/bootstrap/scss/_variables.scss` - Default values verified

### Secondary (MEDIUM confidence)
- [MDBootstrap - Close dropdown on scroll](https://mdbootstrap.com/support/standard/close-dropdown-on-scroll/) - Scroll listener pattern
- [CodeOmelet - Bootstrap 5 with Angular](https://codeomelet.com/posts/exploring-bootstrap-5-with-angular-creating-dropdown) - Angular integration

### Tertiary (LOW confidence)
- None - all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified with package.json and angular.json, Bootstrap 5.3.8 already installed
- Architecture: HIGH - Patterns from official Bootstrap 5.3 documentation
- Pitfalls: MEDIUM - Based on general Bootstrap experience and documentation notes

**Research date:** 2026-02-04
**Valid until:** 2026-05-04 (3 months - Bootstrap is stable, major changes unlikely)

**Existing Code Analysis:**
- Current dropdowns in `file-options.component.html` already use `data-bs-toggle="dropdown"`
- Custom `%dropdown` and `%toggle` SCSS placeholders (lines 4-103 and 107-154) need removal
- Bootstrap JS is already loaded via `bootstrap.bundle.min.js` in angular.json
- App uses existing z-index values in `_common.scss` that should be preserved
