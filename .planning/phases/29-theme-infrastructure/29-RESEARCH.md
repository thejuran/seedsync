# Phase 29: Theme Infrastructure - Research

**Researched:** 2026-02-11
**Domain:** Angular 19 + Bootstrap 5.3 Dark Mode Implementation
**Confidence:** HIGH

## Summary

Phase 29 implements Bootstrap 5.3 native dark mode using the `data-bs-theme` attribute with Angular 19 signal-based reactive state management. The architecture involves three components: (1) an inline script in `index.html` for FOUC prevention, (2) a signal-based `ThemeService` for reactive state management, and (3) multi-tab synchronization via `storage` event listeners.

Bootstrap 5.3's color mode system is attribute-based rather than media-query-based by default, giving full programmatic control while supporting OS preference detection through `window.matchMedia('(prefers-color-scheme: dark)')`. Angular 19's signal API provides a modern alternative to RxJS BehaviorSubject patterns, with synchronous reactivity and automatic change detection.

The critical FOUC prevention pattern requires an inline script in `<head>` that executes before any DOM rendering, reading localStorage and applying the theme attribute immediately. This cannot be delegated to Angular services which bootstrap too late.

**Primary recommendation:** Use Bootstrap's documented JavaScript pattern for theme switching, adapt it to Angular signals with readonly signal exposure, apply theme via effect() to update the `data-bs-theme` attribute on `<html>`, and handle CSP requirements through nonce-based approach or AOT compilation defaults.

## User Constraints (from CONTEXT.md)

### Locked Decisions

From milestone planning:
- Bootstrap 5.3 native dark mode via `data-bs-theme` attribute
- Signal-based `ThemeService` for reactive state (Angular 19 patterns)
- `localStorage` for persistence (client-side only, no backend changes)
- Inline script in `index.html` for FOUC prevention
- Three-state model: `light` / `dark` / `auto`
- Multi-tab synchronization via `storage` event listener

From discussion:
- Default mode is `auto` (follows OS preference)
- Brand-new users with no stored preference get `auto` mode
- `auto` reads `prefers-color-scheme` media query to determine light vs dark
- If OS has no preference set (rare), `auto` resolves to **light**
- Inline script in `index.html` handles ALL cases before Angular bootstraps (reads localStorage, applies light/dark directly, or checks `window.matchMedia` for auto mode)

### Default Decisions (Not Discussed)

- Use **instant swap** (no CSS transition) when theme changes
- **Silent fallback** to `auto` behavior (OS preference) when storage unavailable (private browsing)
- Console warning for developers only when storage fails

### Deferred Ideas (OUT OF SCOPE)

None captured.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Bootstrap | 5.3.3 | Dark mode CSS framework | Native `data-bs-theme` attribute support introduced in 5.3.0, eliminates need for custom theming solutions |
| Angular | 19.2.18 | Framework with signals API | Signal-based reactive state is the modern Angular pattern replacing RxJS for simple state management |
| TypeScript | 5.7.3 | Type safety | Required by Angular 19, enables strong typing for signal services |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| RxJS | 7.5.0 | Reactive programming (already installed) | Only for multi-tab `storage` event handling via `fromEvent()`, not for service state management |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Signals | RxJS BehaviorSubject | Codebase currently uses BehaviorSubject pattern (see ConfigService), but signals are simpler for this use case and align with Angular 19+ best practices |
| `data-bs-theme` attribute | CSS media queries with `prefers-color-scheme` | Bootstrap supports media-query mode via Sass config, but loses per-component control and JavaScript-driven user toggles |
| localStorage | sessionStorage | Would lose persistence across browser sessions |
| `storage` event | BroadcastChannel API | BroadcastChannel is more efficient but has weaker browser support (Safari 15.4+), storage event works everywhere |

**Installation:**
```bash
# All dependencies already installed
# Bootstrap 5.3.3 in package.json
# Angular 19.2.18 in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/angular/src/app/
├── services/
│   └── theme/
│       ├── theme.service.ts       # Signal-based service
│       └── theme.types.ts         # ThemeMode type definition
└── index.html                      # Inline FOUC prevention script
```

### Pattern 1: Signal-Based Service with Readonly Exposure

**What:** Private writable signal with public readonly signal exposed via `asReadonly()`

**When to use:** For state management where consumers should read but not directly mutate state

**Example:**
```typescript
// Source: Angular official docs + community best practices
import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'auto';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  // Private writable signal
  private readonly _theme = signal<ThemeMode>('auto');

  // Public readonly signal
  readonly theme = this._theme.asReadonly();

  // Computed signal for resolved theme (what actually gets applied)
  readonly resolvedTheme = computed(() => {
    const mode = this._theme();
    if (mode === 'auto') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return mode;
  });

  constructor() {
    // Apply theme changes to DOM
    effect(() => {
      const resolved = this.resolvedTheme();
      document.documentElement.setAttribute('data-bs-theme', resolved);
    });
  }

  setTheme(mode: ThemeMode): void {
    this._theme.set(mode);
    // Persist to localStorage
    try {
      localStorage.setItem('theme', mode);
    } catch (e) {
      console.warn('Failed to persist theme preference:', e);
    }
  }
}
```

**Why this pattern:**
- Prevents external code from calling `_theme.set()` directly
- Forces controlled mutations through `setTheme()` method
- Enables validation, side effects (localStorage), and logging in one place
- Computed signals derive resolved theme automatically when mode or OS preference changes

### Pattern 2: FOUC Prevention Inline Script

**What:** Blocking JavaScript in `<head>` that applies theme before any content renders

**When to use:** Always required for dark mode to prevent flash of wrong theme

**Example:**
```html
<!-- Source: Bootstrap official docs + FOUC prevention best practices -->
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>SeedSync</title>
  <base href="/">

  <!-- FOUC Prevention: Must run before any content renders -->
  <script>
    (function() {
      const stored = localStorage.getItem('theme') || 'auto';
      let resolved;

      if (stored === 'light' || stored === 'dark') {
        resolved = stored;
      } else {
        // auto mode: check OS preference
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      document.documentElement.setAttribute('data-bs-theme', resolved);
    })();
  </script>

  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/png" href="assets/favicon.png">
</head>
<body>
  <app-root></app-root>
</body>
</html>
```

**Critical requirements:**
- Script must be **inline** (not external) to execute synchronously
- Must be in `<head>` **before** any content
- Must be **blocking** (not async/defer)
- Must wrap in IIFE to avoid global namespace pollution
- Must handle localStorage errors silently (private browsing mode)

### Pattern 3: Multi-Tab Synchronization with Storage Event

**What:** Listen for `storage` events to detect theme changes in other tabs

**When to use:** Always required for cross-tab synchronization

**Example:**
```typescript
// Source: MDN Storage Event + Angular patterns
import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService implements OnDestroy {
  private readonly _theme = signal<ThemeMode>('auto');
  private storageListener: ((event: StorageEvent) => void) | null = null;

  constructor() {
    // Initialize from localStorage
    this.initializeTheme();

    // Listen for changes from other tabs
    this.storageListener = (event: StorageEvent) => {
      if (event.key === 'theme' && event.newValue) {
        this._theme.set(event.newValue as ThemeMode);
      }
    };
    window.addEventListener('storage', this.storageListener);
  }

  ngOnDestroy(): void {
    // Clean up listener to prevent memory leak
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
  }

  private initializeTheme(): void {
    try {
      const stored = localStorage.getItem('theme') as ThemeMode | null;
      this._theme.set(stored || 'auto');
    } catch (e) {
      console.warn('localStorage unavailable, using default theme');
      this._theme.set('auto');
    }
  }
}
```

**Key insights:**
- `storage` event fires only in **other tabs**, not the tab that made the change
- Must clean up listener in `ngOnDestroy()` to prevent memory leaks
- Event includes `key`, `oldValue`, `newValue`, and `storageArea`
- Only fires for `localStorage`, not `sessionStorage`

### Pattern 4: OS Preference Change Detection

**What:** Listen for OS-level theme changes when in `auto` mode

**When to use:** Optional enhancement for users in `auto` mode who change OS theme while app is open

**Example:**
```typescript
// Source: MDN MediaQueryList + Angular patterns
import { Injectable, signal, computed, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService implements OnDestroy {
  private readonly _theme = signal<ThemeMode>('auto');
  private mediaQueryList: MediaQueryList;
  private mediaListener: ((event: MediaQueryListEvent) => void) | null = null;

  constructor() {
    this.mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');

    // Trigger re-computation when OS preference changes
    this.mediaListener = () => {
      // This will cause resolvedTheme computed signal to re-evaluate
      // if current mode is 'auto'
      if (this._theme() === 'auto') {
        // Force effect re-run by updating a signal
        this._theme.set('auto'); // No-op assignment triggers reactivity
      }
    };

    // Modern API (Safari 14+, all other modern browsers)
    this.mediaQueryList.addEventListener('change', this.mediaListener);
  }

  ngOnDestroy(): void {
    if (this.mediaListener) {
      this.mediaQueryList.removeEventListener('change', this.mediaListener);
    }
  }
}
```

**Browser compatibility note:**
- `addEventListener` on MediaQueryList supported Safari 14+, iOS 14+ (released 2020)
- Older Safari 13 used deprecated `addListener()` method
- For 2026, `addEventListener` is safe to use without fallback

### Anti-Patterns to Avoid

**Anti-pattern 1: Applying theme to `<body>` instead of `<html>`**
- **Why it's bad:** Creates timing gap where `<body>` hasn't loaded yet, causes FOUC
- **What to do instead:** Always apply `data-bs-theme` to `<html>` element (document root)

**Anti-pattern 2: Using `effect()` to write to signals**
- **Why it's bad:** Creates infinite loops and ExpressionChangedAfterItHasBeenChecked errors
- **What to do instead:** Use `computed()` for derived values, only use `effect()` for external side effects like DOM manipulation or localStorage writes

**Anti-pattern 3: Exposing writable signals publicly**
- **Why it's bad:** Allows external code to bypass validation and side effects
- **What to do instead:** Expose readonly signals via `asReadonly()`, provide methods for controlled mutations

**Anti-pattern 4: Reading signals outside reactive context**
- **Why it's bad:** Signal won't track dependency, won't trigger updates
- **What to do instead:** Always read signals inside `computed()`, `effect()`, or component templates

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Theme toggle UI | Custom dropdown component | Bootstrap dropdown with `data-bs-theme-value` attributes | Bootstrap's documented pattern works with any UI library, avoids reinventing click handlers |
| CSS variable overrides for dark mode | Custom dark mode Sass | Bootstrap's built-in dark mode CSS variables | Bootstrap 5.3 defines dozens of color variables that update automatically, hand-rolling misses edge cases |
| localStorage wrapper | Custom storage abstraction | Try/catch around native localStorage with fallback | Simple pattern handles all edge cases (quota, private browsing, disabled storage), abstraction adds unnecessary complexity |
| Cross-tab sync mechanism | Custom BroadcastChannel or SharedWorker | Native `storage` event | Storage event is simpler, works everywhere, requires no polyfill |

**Key insight:** Bootstrap 5.3's theme system is production-ready and well-tested across millions of sites. The official JavaScript example in their docs handles edge cases most developers miss (OS preference changes, localStorage errors, tab sync). Adapting their pattern to Angular signals is straightforward; reimplementing from scratch is error-prone.

## Common Pitfalls

### Pitfall 1: Inline Script Blocked by Content Security Policy

**What goes wrong:** Production builds with strict CSP block inline scripts, FOUC prevention script never runs, users see flash of light theme

**Why it happens:** Angular 19 production builds use AOT compilation which enables stricter CSP by default. Inline scripts require `'unsafe-inline'` (bad) or nonce/hash (good).

**How to avoid:**
- **Option 1 (Recommended):** Use Angular's CSP nonce support by setting `ngCspNonce` attribute on root element or providing `CSP_NONCE` injection token. Server must generate unique nonce per request and inject into both CSP header and script tag.
- **Option 2 (Simpler for static sites):** Use hash-based CSP by computing SHA-256 hash of inline script and adding to CSP policy. Hash stays constant unless script changes.
- **Option 3 (Development only):** Use `'unsafe-inline'` in development builds, enforce nonce/hash in production.

**Warning signs:**
- Browser console error: "Refused to execute inline script because it violates CSP directive"
- FOUC appears in production but not development
- Theme script in index.html is being ignored

**References:**
- [Angular CSP Guide](https://www.stackhawk.com/blog/angular-content-security-policy-guide-what-it-is-and-how-to-enable-it/)
- [Angular CSP_NONCE API](https://angular.dev/api/core/CSP_NONCE)

### Pitfall 2: Signal Effect Infinite Loop

**What goes wrong:** Effect reads a signal, updates that signal, triggers infinite loop, browser freezes

**Why it happens:** Effects automatically track signal dependencies. Writing to a tracked signal inside effect creates circular dependency.

**How to avoid:**
```typescript
// BAD: Infinite loop
effect(() => {
  const theme = this._theme();
  this._theme.set(theme); // Triggers effect again!
});

// GOOD: Use untracked() to break dependency
effect(() => {
  const theme = this._theme();
  untracked(() => {
    // Side effect that doesn't create dependency
    localStorage.setItem('theme', theme);
  });
});

// BETTER: Don't write to signals in effects at all
effect(() => {
  const resolved = this.resolvedTheme();
  document.documentElement.setAttribute('data-bs-theme', resolved);
  // Only DOM manipulation, no signal writes
});
```

**Warning signs:**
- Browser tab becomes unresponsive
- Angular throws ExpressionChangedAfterItHasBeenChecked error
- DevTools shows thousands of effect executions

**References:**
- [6 Common effect() Mistakes](https://medium.com/@krunalvekariya12345/6-common-effect-mistakes-in-angular-signals-and-how-to-fix-them-7cf21b911d69)
- [Learn When to Use Signal Effects](https://www.codigotipado.com/p/learn-when-to-use-signal-effects)

### Pitfall 3: localStorage Unavailable in Private Browsing

**What goes wrong:** Safari private browsing throws exception on `localStorage.setItem()`, breaks entire service initialization, app fails to boot

**Why it happens:** Safari (and some other browsers) make localStorage appear available but throw QuotaExceededError on any write operation in private mode

**How to avoid:**
```typescript
// BAD: Assumes localStorage always works
setTheme(mode: ThemeMode): void {
  this._theme.set(mode);
  localStorage.setItem('theme', mode); // May throw!
}

// GOOD: Defensive try/catch
setTheme(mode: ThemeMode): void {
  this._theme.set(mode);
  try {
    localStorage.setItem('theme', mode);
  } catch (e) {
    // Silent fallback - theme still works in memory
    console.warn('Failed to persist theme:', e);
  }
}

// BEST: Test storage availability once on init
private testStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}
```

**Warning signs:**
- App works in normal browsing, fails in private/incognito
- Console shows QuotaExceededError or SecurityError
- Theme resets on every page load in private mode

**References:**
- [Why Using localStorage Directly is a Bad Idea](https://michalzalecki.com/why-using-localStorage-directly-is-a-bad-idea/)
- [Failed to Execute 'setItem' on 'Storage'](https://trackjs.com/javascript-errors/failed-to-execute-setitem-on-storage/)

### Pitfall 4: Storage Event Listener Memory Leak

**What goes wrong:** Service registered `storage` event listener never gets cleaned up, app leaks memory as services are created/destroyed, multiple listeners fire for same event

**Why it happens:** `window.addEventListener` creates persistent listener. Angular services can be destroyed (in lazy-loaded modules) but window persists.

**How to avoid:**
```typescript
// BAD: No cleanup
export class ThemeService {
  constructor() {
    window.addEventListener('storage', (e) => {
      // Listener never removed!
    });
  }
}

// GOOD: Store reference and clean up
export class ThemeService implements OnDestroy {
  private storageListener: ((event: StorageEvent) => void) | null = null;

  constructor() {
    this.storageListener = (event: StorageEvent) => {
      if (event.key === 'theme' && event.newValue) {
        this._theme.set(event.newValue as ThemeMode);
      }
    };
    window.addEventListener('storage', this.storageListener);
  }

  ngOnDestroy(): void {
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
    }
  }
}

// BEST: Use RxJS fromEvent with takeUntilDestroyed (Angular 16+)
import { fromEvent } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export class ThemeService {
  constructor() {
    fromEvent<StorageEvent>(window, 'storage')
      .pipe(takeUntilDestroyed())
      .subscribe(event => {
        if (event.key === 'theme' && event.newValue) {
          this._theme.set(event.newValue as ThemeMode);
        }
      });
  }
}
```

**Warning signs:**
- Chrome DevTools Performance monitor shows increasing listener count
- Same theme change triggers multiple updates
- Memory usage grows over time in single-page app

**References:**
- [Memory Leaks from Event Listener Mismanagement](https://www.mindfulchase.com/explore/troubleshooting-tips/programming-languages/troubleshooting-javascript-memory-leaks-from-event-listener-mismanagement.html)
- [Preventing Memory Leaks in State Management](https://blog.pixelfreestudio.com/how-to-prevent-memory-leaks-in-state-management-systems/)

### Pitfall 5: Resolving `auto` Mode Too Late

**What goes wrong:** FOUC prevention script checks localStorage, sees "auto", doesn't know how to resolve it, applies nothing or defaults to light, then Angular service resolves to dark, user sees flash

**Why it happens:** Both inline script and Angular service need the same resolution logic: check OS preference when mode is "auto"

**How to avoid:**
```typescript
// INLINE SCRIPT in index.html (MUST match service logic)
<script>
(function() {
  const stored = localStorage.getItem('theme') || 'auto';
  let resolved;

  // CRITICAL: Resolve 'auto' to actual theme
  if (stored === 'light' || stored === 'dark') {
    resolved = stored;
  } else {
    // auto mode: check OS preference
    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  document.documentElement.setAttribute('data-bs-theme', resolved);
})();
</script>

// ANGULAR SERVICE (MUST use same logic)
readonly resolvedTheme = computed(() => {
  const mode = this._theme();
  if (mode === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
});
```

**Warning signs:**
- FOUC happens even with inline script
- Script applies light theme, then Angular switches to dark
- Works when theme is explicitly light/dark, fails when "auto"

## Code Examples

Verified patterns from official sources:

### Bootstrap 5.3 Theme Switcher (Official)
```javascript
// Source: https://getbootstrap.com/docs/5.3/customize/color-modes/
(() => {
  'use strict'

  const getStoredTheme = () => localStorage.getItem('theme')
  const setStoredTheme = theme => localStorage.setItem('theme', theme)

  const getPreferredTheme = () => {
    const storedTheme = getStoredTheme()
    if (storedTheme) {
      return storedTheme
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const setTheme = theme => {
    if (theme === 'auto') {
      document.documentElement.setAttribute('data-bs-theme',
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
    } else {
      document.documentElement.setAttribute('data-bs-theme', theme)
    }
  }

  setTheme(getPreferredTheme())

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const storedTheme = getStoredTheme()
    if (storedTheme !== 'light' && storedTheme !== 'dark') {
      setTheme(getPreferredTheme())
    }
  })
})()
```

### Angular Signal Service Pattern (Official)
```typescript
// Source: https://angular.dev/guide/signals
import { Injectable, signal, computed, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CounterService {
  // Private writable signal
  private readonly _count = signal(0);

  // Public readonly signal
  readonly count = this._count.asReadonly();

  // Computed signal
  readonly doubled = computed(() => this._count() * 2);

  constructor() {
    // Effect for side effects
    effect(() => {
      console.log('Count changed:', this._count());
    });
  }

  increment() {
    this._count.update(v => v + 1);
  }
}
```

### Storage Event Listener (MDN)
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
window.addEventListener('storage', (event) => {
  if (event.key === 'theme') {
    console.log('Theme changed in another tab');
    console.log('Old value:', event.oldValue);
    console.log('New value:', event.newValue);
  }
});
```

### Media Query Change Detection (MDN)
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/MediaQueryList
const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

darkModeQuery.addEventListener('change', (event) => {
  if (event.matches) {
    console.log('User switched to dark mode');
  } else {
    console.log('User switched to light mode');
  }
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom CSS classes (`.dark-theme`) | Bootstrap `data-bs-theme` attribute | Bootstrap 5.3.0 (May 2023) | Standardized theming, no custom CSS needed, per-component control |
| RxJS BehaviorSubject for state | Angular Signals | Angular 16+ (stable in 19) | Simpler API, synchronous reactivity, no subscribe/unsubscribe needed |
| Constructor injection | `inject()` function | Angular 14+ | Cleaner for functional patterns, works outside classes |
| `addListener()` on MediaQueryList | `addEventListener()` | Safari 14 (2020) | Standard EventTarget API, consistent with other event listeners |
| Separate nonce per script | Single nonce via `CSP_NONCE` token | Angular 17+ | Simpler CSP implementation, centralized nonce management |

**Deprecated/outdated:**
- **MediaQueryList.addListener()**: Deprecated in favor of standard `addEventListener()`. Still works but generates warnings. Migration is trivial.
- **BehaviorSubject for simple state**: Not deprecated, but signals are now preferred for new code in Angular 19+. RxJS still needed for complex async operations.
- **`useFactory` with custom providers**: Still valid, but `providedIn: 'root'` with signals is simpler for singleton services.

## Open Questions

1. **CSP Implementation Strategy**
   - What we know: Angular supports nonce-based CSP via `CSP_NONCE` token, requires server-side nonce generation
   - What's unclear: Whether SeedSync's Python backend can easily inject nonces into index.html, or if hash-based CSP is simpler for static builds
   - Recommendation: Start with hash-based CSP (compute SHA-256 of inline script, add to meta tag), defer nonce-based approach until backend integration is needed

2. **Testing Strategy for FOUC Prevention**
   - What we know: Inline script must execute before rendering, impossible to test with standard Angular unit tests
   - What's unclear: How to verify FOUC prevention in Playwright E2E tests (check computed styles immediately on page load?)
   - Recommendation: Manual verification during development, Playwright test that checks `data-bs-theme` attribute exists on first navigation

3. **Interaction with Existing Bootstrap Components**
   - What we know: Bootstrap 5.3 dropdowns, modals, tooltips inherit theme from parent or global setting
   - What's unclear: Whether any existing SeedSync Bootstrap 4 → 5 customizations conflict with color mode system
   - Recommendation: Visual regression testing after theme infrastructure is in place, before implementing toggle UI

## Sources

### Primary (HIGH confidence)
- [Bootstrap 5.3 Color Modes Official Documentation](https://getbootstrap.com/docs/5.3/customize/color-modes/) - Complete API and JavaScript examples
- [Angular Signals Official Guide](https://angular.dev/guide/signals) - Signal API, computed(), effect(), best practices
- [Angular inject() Function](https://angular.dev/api/core/inject) - Dependency injection patterns
- [Angular CSP_NONCE API](https://angular.dev/api/core/CSP_NONCE) - CSP nonce support

### Secondary (MEDIUM confidence)
- [Practical Guide: State Management Angular Services + Signals](https://www.telerik.com/blogs/practical-guide-state-management-using-angular-services-signals) - Signal service patterns
- [Angular Signals Best Practices](https://blog.angulartraining.com/angular-signals-best-practices-around-exposing-signals-5385452150a1) - Readonly signal exposure
- [Fixing Dark Mode Flickering (FOUC)](https://notanumber.in/blog/fixing-react-dark-mode-flickering) - FOUC prevention patterns
- [MDN: prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme) - Media query API
- [MDN: Storage Event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event) - Multi-tab sync

### Tertiary (LOW confidence - needs verification)
- [Building a Theme Switcher for Bootstrap 5.3+](https://albertoroura.com/building-a-theme-switcher-for-bootstrap/) - Community implementation example
- [6 Common effect() Mistakes in Angular Signals](https://medium.com/@krunalvekariya12345/6-common-effect-mistakes-in-angular-signals-and-how-to-fix-them-7cf21b911d69) - Pitfall examples

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Bootstrap 5.3.3 and Angular 19.2.18 verified in package.json, official docs consulted
- Architecture: HIGH - All patterns sourced from official Bootstrap and Angular documentation
- Pitfalls: MEDIUM-HIGH - CSP and storage issues verified from multiple sources, effect pitfalls from Angular official docs and community consensus

**Research date:** 2026-02-11
**Valid until:** 2026-03-11 (30 days - stable technologies, established patterns)

**Notes:**
- Bootstrap 5.3 theme system is mature (released May 2023, widely adopted)
- Angular signals are stable API in Angular 19 (no breaking changes expected)
- FOUC prevention pattern is framework-agnostic and proven across React, Vue, Angular
- CSP requirements may need project-specific validation during implementation
