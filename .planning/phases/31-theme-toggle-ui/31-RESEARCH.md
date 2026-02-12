# Phase 31: Theme Toggle UI - Research

**Researched:** 2026-02-12
**Domain:** Angular 19 UI Components, Bootstrap 5.3 Form Controls, Accessibility (WCAG 2.2)
**Confidence:** HIGH

## Summary

Phase 31 implements a theme toggle UI in the Settings page that allows users to select between Light, Dark, and Auto theme modes. The ThemeService (Phase 29) and theme-aware CSS variables (Phase 30) are already in place, so this phase focuses solely on the UI layer: presenting three options, binding to the existing service, and providing accessible visual feedback.

The implementation pattern is straightforward: create a component that reads `ThemeService.theme()` signal and calls `ThemeService.setTheme()` on user selection. Bootstrap 5.3 button groups provide a native toggle UI pattern that works well for mutually exclusive options. Angular 19's signal-based components eliminate the need for traditional reactive forms - simple event handlers calling service methods are sufficient for this use case.

Key accessibility requirements include proper ARIA attributes (`role="group"`, `aria-label`, `aria-pressed`), keyboard navigation support, and visible focus indicators. Icons (sun/moon/circle-half) should be decorative with `aria-hidden="true"` since button text provides semantic meaning.

**Primary recommendation:** Add Appearance section to Settings page with three-button group (Light/Dark/Auto), bind to ThemeService signals, use SVG icons inline (sun/moon/circle-half), implement ARIA attributes for accessibility, show current selection with Bootstrap `.active` class and visual indicator, and ensure keyboard navigation works correctly.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Angular | 19.2.18 | Framework with signals API | Already in use, signal-based components eliminate need for reactive forms |
| Bootstrap | 5.3.3 | UI framework with button groups | Native button group component, theme-aware styling built-in |
| TypeScript | 5.7.3 | Type safety | Required by Angular 19, enables strong typing for signals |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Bootstrap Icons | Free SVG library | Sun/moon/circle-half icons | Optional - can use inline SVGs or existing icon pattern |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Button group | Dropdown menu | Less discoverable, requires click to see options, worse for mobile |
| Button group | Radio buttons (native) | Less visually appealing, harder to style consistently with Bootstrap theme |
| Button group | Segmented control (custom) | More work to build, Bootstrap button group is standard pattern |
| Signal-based component | Reactive Forms | Overkill for three buttons, adds complexity (FormControl, FormGroup, validators) |
| Inline SVG icons | Icon font | SVGs are lighter, support better accessibility, no FOUT issues |

**Installation:**
No new dependencies required - all tools already in package.json.

## Architecture Patterns

### Recommended Component Structure
```
src/angular/src/app/
├── pages/
│   └── settings/
│       ├── settings-page.component.ts/html/scss    # Add Appearance section
│       ├── option.component.ts/html/scss           # Existing component (reusable pattern)
│       └── options-list.ts                         # Existing options config
└── services/
    └── theme/
        ├── theme.service.ts                        # Already exists (Phase 29)
        └── theme.types.ts                          # Already exists (Phase 29)
```

### Pattern 1: Signal-Based Component with Direct Service Binding

**What:** Component reads signal from service, calls service method on user action

**When to use:** Simple state management where component is purely presentational

**Example:**
```typescript
// Source: Angular 19 signals documentation + existing ThemeService
import { Component, inject } from '@angular/core';
import { ThemeService } from '../../services/theme/theme.service';
import { ThemeMode } from '../../services/theme/theme.types';

@Component({
  selector: 'app-theme-toggle',
  templateUrl: './theme-toggle.component.html',
  styleUrls: ['./theme-toggle.component.scss'],
  standalone: true
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);

  // Expose signals to template
  theme = this.themeService.theme;
  resolvedTheme = this.themeService.resolvedTheme;

  setTheme(mode: ThemeMode): void {
    this.themeService.setTheme(mode);
  }
}
```

**Why this pattern:**
- No need for reactive forms (overkill for 3 buttons)
- Signal automatically updates template when theme changes
- Direct service binding keeps component thin
- Easy to test (mock service, verify setTheme called)

### Pattern 2: Bootstrap Button Group for Mutually Exclusive Options

**What:** `.btn-group` with `.btn` elements, one active at a time

**When to use:** 2-5 mutually exclusive options that should be visually grouped

**Example:**
```html
<!-- Source: Bootstrap 5.3 Button Groups documentation -->
<div class="btn-group" role="group" aria-label="Theme selection">
  <button type="button"
          class="btn btn-outline-secondary"
          [class.active]="theme() === 'light'"
          (click)="setTheme('light')"
          aria-pressed="{{theme() === 'light'}}">
    <svg aria-hidden="true" class="icon"><!-- sun icon --></svg>
    Light
  </button>
  <button type="button"
          class="btn btn-outline-secondary"
          [class.active]="theme() === 'dark'"
          (click)="setTheme('dark')"
          aria-pressed="{{theme() === 'dark'}}">
    <svg aria-hidden="true" class="icon"><!-- moon icon --></svg>
    Dark
  </button>
  <button type="button"
          class="btn btn-outline-secondary"
          [class.active]="theme() === 'auto'"
          (click)="setTheme('auto')"
          aria-pressed="{{theme() === 'auto'}}">
    <svg aria-hidden="true" class="icon"><!-- circle-half icon --></svg>
    Auto
  </button>
</div>
```

**Why this pattern:**
- Bootstrap provides built-in styling (borders, spacing, hover states)
- `.active` class automatically styled by Bootstrap
- `role="group"` provides semantic grouping for screen readers
- Keyboard navigation works out of the box (Tab, Arrow keys)

### Pattern 3: Current Theme Visual Indicator

**What:** Show which theme mode is active and what it resolves to

**When to use:** User needs to understand difference between mode (light/dark/auto) and resolved theme (light/dark)

**Example:**
```html
<!-- Show current selection in button group via .active class -->
<!-- Show resolved theme with additional text indicator -->
<div class="theme-status">
  <small class="text-muted">
    Current theme:
    <strong>{{ theme() }}</strong>
    @if (theme() === 'auto') {
      (currently {{ resolvedTheme() }})
    }
  </small>
</div>
```

**Why this pattern:**
- Makes "auto" mode behavior clear (shows what it resolves to)
- Helps users understand why theme changes when OS preference changes
- Low visual noise (small, muted text below buttons)

### Pattern 4: Inline SVG Icons for Theme Toggle

**What:** Embed SVG markup directly in HTML rather than external files

**When to use:** Small, simple icons that need to inherit CSS color

**Example:**
```html
<!-- Sun icon (light mode) -->
<svg aria-hidden="true" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
</svg>

<!-- Moon icon (dark mode) -->
<svg aria-hidden="true" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
</svg>

<!-- Circle-half icon (auto mode) -->
<svg aria-hidden="true" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
  <path d="M8 15A7 7 0 1 0 8 1v14zm0 1A8 8 0 1 1 8 0a8 8 0 0 1 0 16z"/>
</svg>
```

**Why this pattern:**
- `fill="currentColor"` makes icon inherit button text color
- `aria-hidden="true"` prevents screen reader announcement (button text is semantic)
- No HTTP request (faster load)
- Works with theme-aware CSS variables automatically

### Pattern 5: Settings Page Collapsible Section

**What:** Add new collapsible card to Settings accordion for Appearance settings

**When to use:** Grouping related settings in Settings page structure

**Example:**
```html
<!-- Source: Existing settings-page.component.html pattern -->
<div class="card">
  <h3 class="card-header" id="heading-appearance">
    <button class="btn"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapse-appearance">
      Appearance
    </button>
  </h3>
  <div id="collapse-appearance" class="collapse" data-bs-parent="#accordion">
    <div class="card-body">
      <h4>Theme Mode</h4>
      <p class="text-muted">Choose your preferred color theme.</p>

      <!-- Theme toggle button group here -->

      <div class="theme-status mt-2">
        <small class="text-muted">
          Current: <strong>{{ theme() }}</strong>
          @if (theme() === 'auto') {
            (following system preference: {{ resolvedTheme() }})
          }
        </small>
      </div>
    </div>
  </div>
</div>
```

**Why this pattern:**
- Consistent with existing Settings page structure
- Bootstrap accordion provides built-in expand/collapse behavior
- `data-bs-parent="#accordion"` ensures only one section open at a time
- Familiar UX pattern for users

### Anti-Patterns to Avoid

**Anti-pattern 1: Using reactive forms for simple button group**
- **Why it's bad:** FormControl, FormGroup, validators add complexity for 3 buttons
- **What to do instead:** Direct signal binding with click handlers

**Anti-pattern 2: Icon-only buttons without text labels**
- **Why it's bad:** Fails WCAG 2.2 - not all users recognize sun/moon metaphor
- **What to do instead:** Include text labels ("Light", "Dark", "Auto") with icons

**Anti-pattern 3: Not showing resolved theme for "auto" mode**
- **Why it's bad:** Users don't understand why theme changes when they didn't click anything
- **What to do instead:** Show "Auto (currently dark)" status text

**Anti-pattern 4: Using dropdown instead of button group**
- **Why it's bad:** Hides options behind click, worse discoverability, extra click to change
- **What to do instead:** Button group shows all 3 options immediately

**Anti-pattern 5: Not cleaning up ThemeService injection**
- **Why it's bad:** Settings page uses OnPush change detection - service injection without cleanup can cause stale renders
- **What to do instead:** Use `inject()` function (automatic cleanup) or proper component lifecycle

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Button group styling | Custom CSS for toggle buttons | Bootstrap `.btn-group` + `.btn-outline-secondary` | Bootstrap provides hover, active, focus states, keyboard nav, ARIA |
| Icon library | Custom SVG sprite system | Bootstrap Icons or inline SVGs | Bootstrap Icons free, well-tested, consistent design language |
| Form state management | Custom signal + storage sync | ThemeService (already exists) | Service already handles localStorage, multi-tab sync, OS preference |
| Accessibility attributes | Manual ARIA implementation | Bootstrap semantic HTML + minimal ARIA | Bootstrap button groups have built-in keyboard nav, just add aria-label and aria-pressed |
| Theme resolution logic | Duplicate "auto" logic in component | Read `resolvedTheme` signal from service | Service already computes resolved theme, single source of truth |

**Key insight:** The hard parts (theme state management, localStorage persistence, FOUC prevention, multi-tab sync) are already done in Phases 29-30. This phase is purely presentational - bind existing signals to Bootstrap UI components.

## Common Pitfalls

### Pitfall 1: Forgetting aria-pressed for Toggle Buttons

**What goes wrong:** Screen readers don't announce which button is selected
**Why it happens:** Bootstrap `.active` class is visual only, not semantic
**How to avoid:** Add `aria-pressed="true"` to active button, `aria-pressed="false"` to others
**Warning signs:** NVDA/JAWS announce "button" but not "pressed" or "selected"

**Example:**
```html
<!-- BAD: No aria-pressed -->
<button class="btn" [class.active]="theme() === 'light'">Light</button>

<!-- GOOD: Proper ARIA -->
<button class="btn"
        [class.active]="theme() === 'light'"
        [attr.aria-pressed]="theme() === 'light'">
  Light
</button>
```

### Pitfall 2: Icon Without aria-hidden Causes Double Announcement

**What goes wrong:** Screen reader announces "Light button sun icon graphic" (redundant)
**Why it happens:** SVG without aria-hidden is treated as content
**How to avoid:** Always add `aria-hidden="true"` to decorative icons
**Warning signs:** Screen reader verbosity, users complain about redundant announcements

**Example:**
```html
<!-- BAD: Icon announced separately -->
<button>
  <svg><!-- sun --></svg>
  Light
</button>

<!-- GOOD: Icon hidden from screen readers -->
<button>
  <svg aria-hidden="true"><!-- sun --></svg>
  Light
</button>
```

### Pitfall 3: Not Showing Resolved Theme for Auto Mode

**What goes wrong:** User selects "Auto", theme changes based on OS, user confused why
**Why it happens:** Auto mode behavior is invisible without explicit indicator
**How to avoid:** Show status text like "Auto (currently dark)" below buttons
**Warning signs:** User feedback "theme changes randomly", "auto doesn't work"

**Example:**
```html
<!-- BAD: No indication of resolved theme -->
<p>Selected: {{ theme() }}</p>

<!-- GOOD: Show what auto resolves to -->
<p>
  Selected: {{ theme() }}
  @if (theme() === 'auto') {
    (currently {{ resolvedTheme() }})
  }
</p>
```

### Pitfall 4: OnPush Change Detection Missing Updates

**What goes wrong:** User clicks theme button, nothing happens, component doesn't re-render
**Why it happens:** SettingsPageComponent uses OnPush strategy, signal changes may not trigger CD
**How to avoid:** Ensure component reads signal in template (automatic CD), or inject ChangeDetectorRef
**Warning signs:** Button click has no effect, theme changes after navigating away and back

**Example:**
```typescript
// BAD: Reading signal in method (not tracked)
onClick(): void {
  const current = this.theme(); // Not in reactive context
}

// GOOD: Reading signal in template (tracked)
// Template: {{ theme() }}
```

### Pitfall 5: Button Group Breaking on Mobile

**What goes wrong:** Three buttons overflow on small screens, text wraps, looks broken
**Why it happens:** Default button group is not responsive
**How to avoid:** Use `.btn-sm` for smaller buttons, or stack vertically on mobile with media query
**Warning signs:** Mobile layout testing shows horizontal scroll or awkward wrapping

**Example:**
```scss
// Optional: Stack buttons vertically on very small screens
@media (max-width: 360px) {
  .btn-group {
    flex-direction: column;
    width: 100%;

    .btn {
      width: 100%;
    }
  }
}
```

## Code Examples

Verified patterns from official sources:

### Example 1: Complete Theme Toggle Component (Inline in Settings Page)

```typescript
// Source: Angular 19 signals + existing ThemeService pattern
// settings-page.component.ts (additions)

import { ThemeService } from '../../services/theme/theme.service';
import { ThemeMode } from '../../services/theme/theme.types';

export class SettingsPageComponent implements OnInit {
  // ... existing properties ...

  private _themeService = inject(ThemeService);

  // Expose theme signals to template
  public theme = this._themeService.theme;
  public resolvedTheme = this._themeService.resolvedTheme;

  onSetTheme(mode: ThemeMode): void {
    this._themeService.setTheme(mode);
  }
}
```

### Example 2: Settings Page Appearance Section HTML

```html
<!-- Source: Bootstrap 5.3 button groups + existing settings page accordion pattern -->
<!-- settings-page.component.html (add to right column after Other settings) -->

<div class="card">
  <h3 class="card-header" id="heading-appearance">
    <button class="btn"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#collapse-appearance">
      Appearance
    </button>
  </h3>
  <div id="collapse-appearance" class="collapse" data-bs-parent="#accordion">
    <div class="card-body">
      <h4>Theme Mode</h4>
      <p class="text-muted">Choose your preferred color theme.</p>

      <div class="btn-group theme-toggle" role="group" aria-label="Theme mode selection">
        <button type="button"
                class="btn btn-outline-secondary"
                [class.active]="theme() === 'light'"
                [attr.aria-pressed]="theme() === 'light'"
                (click)="onSetTheme('light')">
          <svg aria-hidden="true" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-1">
            <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/>
          </svg>
          Light
        </button>
        <button type="button"
                class="btn btn-outline-secondary"
                [class.active]="theme() === 'dark'"
                [attr.aria-pressed]="theme() === 'dark'"
                (click)="onSetTheme('dark')">
          <svg aria-hidden="true" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-1">
            <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
          </svg>
          Dark
        </button>
        <button type="button"
                class="btn btn-outline-secondary"
                [class.active]="theme() === 'auto'"
                [attr.aria-pressed]="theme() === 'auto'"
                (click)="onSetTheme('auto')">
          <svg aria-hidden="true" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-1">
            <path d="M8 15A7 7 0 1 0 8 1v14zm0 1A8 8 0 1 1 8 0a8 8 0 0 1 0 16z"/>
          </svg>
          Auto
        </button>
      </div>

      <div class="theme-status mt-2">
        <small class="text-muted">
          Current theme: <strong>{{ theme() }}</strong>
          @if (theme() === 'auto') {
            <span>(following system preference: {{ resolvedTheme() }})</span>
          }
        </small>
      </div>
    </div>
  </div>
</div>
```

### Example 3: Optional Styling Enhancements

```scss
// Source: Bootstrap 5.3 + custom theme-aware styling
// settings-page.component.scss (additions)

.theme-toggle {
  .btn {
    // Ensure consistent width for all buttons
    min-width: 90px;

    svg {
      vertical-align: text-bottom;
    }
  }

  // Optional: More prominent active state
  .btn.active {
    font-weight: 500;
  }
}

.theme-status {
  font-size: 0.875rem;

  strong {
    text-transform: capitalize;
  }
}

// Optional: Stack vertically on very small screens
@media (max-width: 360px) {
  .theme-toggle {
    flex-direction: column;
    width: 100%;

    .btn {
      width: 100%;
      text-align: left;
    }
  }
}
```

### Example 4: Accessibility Testing Checklist

```typescript
// Source: WCAG 2.2 requirements + Angular testing best practices
// theme-toggle.component.spec.ts (test cases)

describe('Theme Toggle Accessibility', () => {
  it('should have role="group" on button group', () => {
    const group = fixture.nativeElement.querySelector('.btn-group');
    expect(group.getAttribute('role')).toBe('group');
  });

  it('should have aria-label on button group', () => {
    const group = fixture.nativeElement.querySelector('.btn-group');
    expect(group.getAttribute('aria-label')).toBeTruthy();
  });

  it('should set aria-pressed="true" on active button', () => {
    component.theme.set('light');
    fixture.detectChanges();

    const lightBtn = fixture.nativeElement.querySelector('[data-theme="light"]');
    expect(lightBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('should set aria-pressed="false" on inactive buttons', () => {
    component.theme.set('light');
    fixture.detectChanges();

    const darkBtn = fixture.nativeElement.querySelector('[data-theme="dark"]');
    expect(darkBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('should have aria-hidden="true" on all icons', () => {
    const icons = fixture.nativeElement.querySelectorAll('svg');
    icons.forEach((icon: SVGElement) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('should support keyboard navigation (Tab, Enter)', () => {
    const lightBtn = fixture.nativeElement.querySelector('[data-theme="light"]');
    lightBtn.focus();
    expect(document.activeElement).toBe(lightBtn);

    // Simulate Enter key
    lightBtn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(component.theme()).toBe('light');
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Reactive Forms for everything | Signal-based components for simple cases | Angular 16+ (signals stable in 19) | Simpler code, less boilerplate for basic UI |
| External icon fonts (Font Awesome) | Inline SVGs with currentColor | Modern web (2020+) | Lighter, theme-aware, no FOUT, better accessibility |
| Custom toggle components | Bootstrap button groups | Bootstrap 5+ | Less CSS, consistent UX, built-in keyboard nav |
| Icon-only theme toggles | Icons + text labels | WCAG 2.2 (2023) | Better accessibility, clearer for users unfamiliar with metaphor |
| @Input/@Output decorators | Signal inputs/outputs | Angular 17+ (stable in 19+) | Modern pattern, but existing @Input/@Output still valid |

**Deprecated/outdated:**
- **Icon fonts for UI icons:** Inline SVGs preferred for small icon sets, better performance and accessibility
- **Reactive Forms for all user input:** Signal-based components sufficient for simple cases like button groups
- **Dropdown for theme selection:** Button group better UX for mutually exclusive options with 2-5 choices

## Open Questions

1. **Icon Source**
   - What we know: Bootstrap Icons has sun/moon, need circle-half for "auto"
   - What's unclear: Should we use Bootstrap Icons library or inline SVGs?
   - Recommendation: Inline SVGs (lighter, no dependency, 3 icons only), use Bootstrap Icons as reference

2. **Placement in Settings Page**
   - What we know: Settings page has left/right columns with accordion sections
   - What's unclear: Should Appearance go in left column (with Server, AutoQueue) or right (with Connections, Discovery, Other)?
   - Recommendation: Right column (after Other section) - Appearance is client-side setting like Other

3. **Default Collapsed State**
   - What we know: Settings page accordion has `class="collapse"` on all sections
   - What's unclear: Should Appearance section start expanded or collapsed?
   - Recommendation: Collapsed (consistent with existing sections), users expand as needed

4. **Mobile Layout**
   - What we know: Settings page works on mobile, button groups may wrap awkwardly
   - What's unclear: Should we stack buttons vertically on mobile?
   - Recommendation: Test on mobile (360px width), add responsive CSS if needed

## Sources

### Primary (HIGH confidence)
- [Bootstrap 5.3 Button Groups Documentation](https://getbootstrap.com/docs/5.3/components/button-group/) - Official component patterns
- [Angular Signals Guide](https://angular.dev/guide/signals) - Signal-based component architecture
- [Bootstrap Icons Library](https://icons.getbootstrap.com/) - Sun and moon icons
- Existing codebase: settings-page.component.ts/html, option.component.ts, theme.service.ts (Phase 29)

### Secondary (MEDIUM confidence)
- [Accessible Icon Buttons - Sara Soueidan](https://www.sarasoueidan.com/blog/accessible-icon-buttons/) - ARIA best practices for icon buttons
- [WCAG 2.2 Accessibility Best Practices](https://www.thewcag.com/best-practices) - 2026 implementation guide
- [Creating an Accessible Switch - WCAG Compliant Toggle](https://medium.com/@elikruunenberg/creating-an-accessible-switch-a-guide-to-building-a-wcag-compliant-toggle-switch-906894d0fdc4) - Toggle accessibility patterns
- [Angular Signal Components Guide - Angular University](https://blog.angular-university.io/angular-signal-components/) - Input/output signal patterns

### Tertiary (MEDIUM confidence - community/tutorial sources)
- [Building a Theme Switcher for Bootstrap 5.3+](https://albertoroura.com/building-a-theme-switcher-for-bootstrap/) - Implementation example
- [Font Awesome Accessibility](https://docs.fontawesome.com/web/dig-deeper/accessibility/) - Icon accessibility best practices (applicable to SVGs)
- [Angular Two-Way Binding with Signals](https://www.codemotion.com/magazine/frontend/angular-model-inputs-two-way-binding-inputs-with-signals/) - Model signals (not needed for this phase)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Angular 19.2.18 and Bootstrap 5.3.3 verified in package.json
- Architecture: HIGH - Patterns verified from official Bootstrap and Angular docs, ThemeService already exists
- Pitfalls: HIGH - Based on official WCAG 2.2 docs, Bootstrap accessibility docs, Angular change detection patterns
- UI patterns: HIGH - Bootstrap button groups documented, existing settings page provides template

**Research date:** 2026-02-12
**Valid until:** 2026-04-12 (60 days - stable technologies, WCAG standards stable, Bootstrap 5.3 mature)

**Notes:**
- ThemeService from Phase 29 provides all state management - this phase is purely UI
- Bootstrap 5.3 button groups are well-documented and widely used pattern
- WCAG 2.2 requirements for icon buttons are stable and well-established
- Inline SVGs are modern best practice for small icon sets (3 icons)
- No new dependencies required - everything already in project
