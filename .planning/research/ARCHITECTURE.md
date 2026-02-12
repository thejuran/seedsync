# Architecture Research: Dark Mode + Theme System

**Domain:** Bootstrap 5.3 Dark Mode Integration with Angular 19
**Researched:** 2026-02-11
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Angular Components                        │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │ Header  │  │ Sidebar │  │  Files  │  │Settings │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       │ inject     │ inject     │            │              │
│       └────────────┴────────────┴────────────┘              │
├─────────────────────────────────────────────────────────────┤
│                      Theme Service                           │
│  ┌────────────────────────────────────────────────────┐     │
│  │  • Detect OS preference (matchMedia)               │     │
│  │  • Manage theme signal (light/dark/auto)           │     │
│  │  • Apply data-bs-theme to <html>                   │     │
│  │  • Persist to localStorage                         │     │
│  └────────────────────────────────────────────────────┘     │
├─────────────────────────────────────────────────────────────┤
│                  Bootstrap 5.3 CSS Layer                     │
│  ┌──────────────────────────────────────────────────┐       │
│  │  [data-bs-theme="light"] { CSS vars }            │       │
│  │  [data-bs-theme="dark"]  { CSS vars }            │       │
│  │  .form-control, .dropdown-menu, etc.             │       │
│  └──────────────────────────────────────────────────┘       │
├─────────────────────────────────────────────────────────────┤
│                         SCSS Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ _bootstrap-  │  │ _bootstrap-  │  │  styles.scss │      │
│  │  variables   │  │  overrides   │  │   (imports)  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **ThemeService** | Detect OS preference, manage theme state, apply to DOM | Angular service with signals, localStorage, matchMedia |
| **Theme Toggle Component** | UI control for theme switching | Standalone component with icon/dropdown in header/settings |
| **Bootstrap CSS** | Provide color mode CSS variables | Compiled from SCSS with `variables-dark.scss` |
| **SCSS Overrides** | Customize dark mode colors | `[data-bs-theme="dark"]` selectors in `_bootstrap-overrides.scss` |

## Integration with Existing SeedSync Architecture

### Current SCSS System (Two-Layer Customization)

**Existing files:**
- `src/angular/src/styles.scss` - Main entry point (uses @import for Bootstrap, @use for app modules)
- `src/angular/src/app/common/_bootstrap-variables.scss` - Pre-compilation variable overrides
- `src/angular/src/app/common/_bootstrap-overrides.scss` - Post-compilation CSS overrides
- `src/angular/src/app/common/_common.scss` - Re-exports variables via @forward

**Current customization points:**
1. **Pre-compilation variables** (`_bootstrap-variables.scss`): Sets $primary, $secondary, form colors BEFORE Bootstrap compiles
2. **Post-compilation overrides** (`_bootstrap-overrides.scss`): Already has dark dropdown theme, dark form inputs

**Bootstrap 5.3 dark mode files already imported:**
```scss
// In styles.scss (line 25)
@import '../node_modules/bootstrap/scss/variables-dark';
```
This file defines `$body-color-dark`, `$body-bg-dark`, and other dark-specific SCSS variables that Bootstrap converts to CSS custom properties scoped to `[data-bs-theme="dark"]`.

### How data-bs-theme Integrates with SCSS Variables

Bootstrap 5.3 uses a **two-step compilation process**:

1. **Compile-time (SCSS)**: Sass variables in `_variables-dark.scss` define dark mode colors
   ```scss
   // Bootstrap's _variables-dark.scss
   $body-color-dark: $gray-300;
   $body-bg-dark: $gray-900;
   $link-color-dark: tint-color($primary, 40%);
   ```

2. **Runtime (CSS)**: These compile to CSS custom properties scoped to `[data-bs-theme="dark"]`
   ```css
   [data-bs-theme="dark"] {
     --bs-body-color: #adb5bd;
     --bs-body-bg: #212529;
     --bs-link-color: #6ea8fe;
   }
   ```

**Key integration point:** The existing `_bootstrap-overrides.scss` already demonstrates this pattern:
```scss
// Lines 18-39 in _bootstrap-overrides.scss
[data-bs-theme="dark"] {
  .dropdown-menu {
    --bs-dropdown-bg: #{bv.$primary-color};
    --bs-dropdown-border-color: #{bv.$primary-dark-color};
    // ... more overrides
  }
}
```

This means:
- **No changes needed** to the @import/@use hybrid approach
- **Extend the pattern** in `_bootstrap-overrides.scss` to override dark mode CSS variables
- **Bootstrap automatically** applies these when `data-bs-theme="dark"` is on `<html>` or specific elements

### Existing Dark Form Inputs Behavior

**Current implementation** (lines 61-84 in `_bootstrap-overrides.scss`):
```scss
.form-control {
  background-color: #212529;  // Dark theme appearance
  color: #dee2e6;
  border-color: #495057;
}
```

**Problem:** These styles apply ALWAYS, not just in dark mode.

**When global dark mode is applied:**
- `<html data-bs-theme="dark">` sets `--bs-body-bg: #212529` (Bootstrap's dark background)
- Form inputs remain `#212529` background
- **Result:** Dark inputs on dark background = good contrast maintained

**When light mode is active:**
- `<html>` has no `data-bs-theme` or `data-bs-theme="light"`
- Bootstrap sets `--bs-body-bg: #fff` (light background)
- Form inputs remain `#212529` background
- **Result:** Dark inputs on light background = current design (intentional for SeedSync's aesthetic)

**Recommendation:** Existing dark inputs are already theme-aware by accident. To make them explicit:

**Option 1: Keep current behavior (dark inputs in both modes)**
- No changes needed
- Maintains existing visual identity

**Option 2: Adaptive inputs (dark in dark mode, light in light mode)**
- Move form-control styles inside `[data-bs-theme="dark"]` selector
- Let Bootstrap's default light mode styles handle light theme

### Where Theme Service Should Live

**Location:** `src/angular/src/app/services/utils/theme.service.ts`

**Rationale:**
- Lives alongside other utility services (LoggerService, NotificationService, ConnectedService)
- Theme is a cross-cutting concern like logging/notifications
- Not domain-specific (settings, files, etc.)

**Service pattern:**
```typescript
// Similar to ConnectedService pattern
@Injectable({providedIn: 'root'})
export class ThemeService implements OnInit, OnDestroy {
  private _theme: WritableSignal<'light' | 'dark' | 'auto'>;
  private _effectiveTheme: Signal<'light' | 'dark'>;  // Computed from _theme + OS preference
  // ...
}
```

**Why signals:**
- Angular 19's reactivity model
- Components can read signals without manual subscriptions
- Automatic change detection when theme changes

### Theme Preference Persistence Strategy

**Recommendation: localStorage (not backend config)**

**Rationale:**

| Consideration | localStorage | Backend Config |
|---------------|--------------|----------------|
| **User expectation** | Theme is per-device/browser | Theme syncs across devices |
| **Performance** | Instant (no API call) | Requires config fetch + save |
| **Privacy** | No server tracking | Server knows user preference |
| **Offline support** | Works offline | Requires connection |
| **Existing pattern** | New pattern | Fits Settings page pattern |

**Analysis:**
1. **SeedSync's config pattern** (from ConfigService): Backend stores operational config (server paths, LFTP settings, *arr integration). These are functional, not cosmetic.
2. **Theme is cosmetic**: Doesn't affect backend behavior, only UI rendering
3. **Similar apps**: Most web apps store theme in localStorage (GitHub, Gmail, VS Code web)
4. **Settings page integration**: Could still show theme toggle in Settings for discoverability, but persist locally

**Implementation:**
```typescript
// ThemeService
private readonly STORAGE_KEY = 'seedsync-theme';

saveTheme(theme: 'light' | 'dark' | 'auto'): void {
  try {
    localStorage.setItem(this.STORAGE_KEY, theme);
  } catch (error) {
    // Private browsing or quota exceeded
    this._logger.warn('Could not save theme preference', error);
  }
}

loadTheme(): 'light' | 'dark' | 'auto' {
  try {
    return localStorage.getItem(this.STORAGE_KEY) as 'light' | 'dark' | 'auto' || 'auto';
  } catch {
    return 'auto';  // Fallback to OS preference
  }
}
```

**Alternative (hybrid approach):**
- Store in localStorage for instant apply
- Also save to backend config for cross-device sync (future enhancement)
- localStorage takes precedence for immediate UX

For the initial milestone, **localStorage-only is sufficient**.

## Recommended Project Structure

```
src/angular/src/
├── app/
│   ├── services/
│   │   └── utils/
│   │       └── theme.service.ts              # NEW: Theme management service
│   ├── common/
│   │   └── _bootstrap-overrides.scss         # MODIFY: Add light mode overrides
│   └── pages/
│       ├── main/
│       │   ├── header.component.ts           # MODIFY: Add theme toggle
│       │   ├── header.component.html         # MODIFY: Theme toggle UI
│       │   └── header.component.scss         # MODIFY: Toggle styling
│       └── settings/
│           ├── settings-page.component.html  # OPTIONAL: Add theme section
│           └── options-list.ts               # OPTIONAL: Theme option
└── styles.scss                               # NO CHANGE: Already imports variables-dark
```

### Structure Rationale

- **theme.service.ts in utils/:** Cross-cutting concern alongside logging, notifications
- **Bootstrap overrides modification:** Extends existing pattern of `[data-bs-theme]` selectors
- **Header component for toggle:** Most visible location, consistent with common UI patterns
- **Settings page optional:** Could add for discoverability, but header toggle is primary UX

## Architectural Patterns

### Pattern 1: Signal-Based Theme State

**What:** Use Angular signals for reactive theme state management without explicit subscriptions

**When to use:** Angular 19+ projects needing reactive UI updates

**Trade-offs:**
- **Pro:** Automatic change detection, no manual unsubscribe
- **Pro:** Computed signals for derived state (effectiveTheme from theme + OS preference)
- **Con:** Requires Angular 19+ (not an issue for SeedSync)

**Example:**
```typescript
@Injectable({providedIn: 'root'})
export class ThemeService {
  // User preference signal
  private _theme = signal<'light' | 'dark' | 'auto'>('auto');

  // OS preference signal
  private _osPrefersDark = signal<boolean>(false);

  // Computed effective theme (auto resolves to light/dark based on OS)
  readonly effectiveTheme = computed(() => {
    const theme = this._theme();
    if (theme === 'auto') {
      return this._osPrefersDark() ? 'dark' : 'light';
    }
    return theme;
  });

  // Public read-only signal
  readonly theme = this._theme.asReadonly();
}
```

### Pattern 2: matchMedia + Effect for OS Preference Detection

**What:** Use window.matchMedia to detect OS color scheme and Angular effects to apply changes

**When to use:** When supporting "auto" theme mode that respects OS preference

**Trade-offs:**
- **Pro:** Respects user's system-wide preference
- **Pro:** Automatically updates when user changes OS theme
- **Con:** Requires cleanup of event listeners

**Example:**
```typescript
export class ThemeService implements OnDestroy {
  private darkModeQuery: MediaQueryList;
  private mediaQueryListener: (e: MediaQueryListEvent) => void;

  constructor() {
    // Detect initial OS preference
    this.darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this._osPrefersDark.set(this.darkModeQuery.matches);

    // Listen for OS theme changes
    this.mediaQueryListener = (e) => this._osPrefersDark.set(e.matches);
    this.darkModeQuery.addEventListener('change', this.mediaQueryListener);

    // Apply theme whenever effectiveTheme changes
    effect(() => {
      const theme = this.effectiveTheme();
      document.documentElement.setAttribute('data-bs-theme', theme);
    });
  }

  ngOnDestroy(): void {
    this.darkModeQuery.removeEventListener('change', this.mediaQueryListener);
  }
}
```

### Pattern 3: Bootstrap CSS Variable Overrides in SCSS

**What:** Override Bootstrap's dark mode CSS variables using `[data-bs-theme="dark"]` selectors

**When to use:** When customizing Bootstrap's default dark mode colors

**Trade-offs:**
- **Pro:** Works with Bootstrap's built-in color mode system
- **Pro:** No need to redefine all component styles
- **Con:** Need to use `#{}` interpolation for SCSS variables in CSS custom properties

**Example:**
```scss
// In _bootstrap-overrides.scss
@use 'bootstrap-variables' as bv;

[data-bs-theme="dark"] {
  // Override global dark mode colors
  --bs-body-bg: #1a1a1a;          // Darker background
  --bs-body-color: #e0e0e0;       // Lighter text

  // Component-specific overrides
  .form-control {
    --bs-form-control-bg: #2a2a2a;
    --bs-form-control-color: #e0e0e0;
    --bs-border-color: #{bv.$input-border-color};
  }

  .card {
    --bs-card-bg: #252525;
  }
}

// Light mode overrides (if needed)
[data-bs-theme="light"] {
  // Override global light mode colors if defaults don't work
  --bs-body-bg: #f5f5f5;  // Current body background in styles.scss
}
```

## Data Flow

### Theme Selection Flow

```
[User clicks theme toggle]
    ↓
[Theme Toggle Component] → emit theme ('light'|'dark'|'auto')
    ↓
[ThemeService.setTheme()] → update _theme signal
    ↓
[Computed effectiveTheme] → resolves 'auto' → checks _osPrefersDark signal
    ↓
[Angular effect] → applies data-bs-theme to <html>
    ↓
[localStorage] ← save preference
    ↓
[Bootstrap CSS] → applies theme via [data-bs-theme] selector
    ↓
[All components] → re-render with new theme (automatic via CSS)
```

### Initialization Flow

```
[App Bootstrap]
    ↓
[ThemeService constructor] → initialize matchMedia listener
    ↓
[loadTheme()] → check localStorage → fallback to 'auto'
    ↓
[_osPrefersDark.set()] → read matchMedia.matches
    ↓
[effectiveTheme computed] → determine initial theme
    ↓
[Angular effect] → apply to <html> BEFORE first render
    ↓
[No flash of wrong theme]
```

### Key Data Flows

1. **OS preference change:** matchMedia listener → _osPrefersDark signal → effectiveTheme computed → effect applies to DOM
2. **User manual change:** Toggle component → ThemeService.setTheme() → _theme signal → effectiveTheme computed → effect + localStorage
3. **Page load:** ThemeService constructor → localStorage → _theme signal → matchMedia → _osPrefersDark → effectiveTheme → DOM

## Integration Points

### New Components

| Component | Type | Purpose | Integration |
|-----------|------|---------|-------------|
| **ThemeService** | Angular service | Theme state management | Injected into components needing theme info |
| **Theme Toggle** | Standalone component | UI for theme switching | Lives in Header or Settings page |

### Modified Components

| Component | Change | Reason |
|-----------|--------|--------|
| **Header** | Add theme toggle | Primary location for theme control |
| **Settings page** | Optional theme section | Alternative/additional theme control |
| **_bootstrap-overrides.scss** | Add light mode overrides | Make dark inputs adaptive (optional) |

### SCSS File Changes

| File | Change | Impact |
|------|--------|--------|
| **styles.scss** | NO CHANGE | Already imports variables-dark |
| **_bootstrap-variables.scss** | NO CHANGE | Pre-compilation variables unaffected |
| **_bootstrap-overrides.scss** | Add `[data-bs-theme="light"]` overrides | Make existing dark form inputs theme-aware (optional) |
| **_common.scss** | NO CHANGE | Just re-exports variables |

### External Dependencies

| Dependency | Current | Notes |
|------------|---------|-------|
| Bootstrap | 5.3.x | Already includes dark mode support via variables-dark.scss |
| Angular | 19.x | Signals API available |
| Browser APIs | window.matchMedia | Supported in all modern browsers |

## Build Order Recommendations

**Phase 1: Foundation (Theme Service + Detection)**
1. Create ThemeService with signals
2. Implement matchMedia detection
3. Implement localStorage persistence
4. Add effect to apply data-bs-theme to DOM
5. Test: Can manually call setTheme() in console, DOM updates

**Phase 2: UI Control (Theme Toggle)**
6. Create theme toggle component (3 states: light/dark/auto)
7. Integrate into header component
8. Test: Clicking toggle changes theme, persists across reload

**Phase 3: SCSS Refinement (Optional)**
9. Add `[data-bs-theme="light"]` overrides for form inputs if adaptive inputs desired
10. Test dark form inputs in both light/dark mode
11. Adjust any component-specific dark mode colors

**Phase 4: Settings Integration (Optional)**
12. Add theme option to Settings page
13. Test both header toggle and settings option work together

**Rationale:**
- **Phase 1 builds infrastructure** before UI concerns
- **Phase 2 delivers user-visible feature** (can stop here for MVP)
- **Phase 3 is polish** (only if design calls for adaptive inputs)
- **Phase 4 is discoverability** (if users struggle to find header toggle)

## Anti-Patterns

### Anti-Pattern 1: Applying Dark Mode Classes Manually

**What people do:** Add/remove CSS classes to switch themes instead of using data-bs-theme
```typescript
// DON'T DO THIS
document.body.classList.add('dark-mode');
```

**Why it's wrong:**
- Breaks Bootstrap's built-in color mode system
- Requires manual CSS for every component
- Doesn't leverage Bootstrap's CSS variables

**Do this instead:**
```typescript
// DO THIS
document.documentElement.setAttribute('data-bs-theme', 'dark');
```

### Anti-Pattern 2: Duplicating Entire Stylesheets for Dark Mode

**What people do:** Create separate `styles-dark.scss` and swap stylesheet href
```typescript
// DON'T DO THIS
<link rel="stylesheet" [href]="theme === 'dark' ? 'dark.css' : 'light.css'">
```

**Why it's wrong:**
- Large file size (duplicate CSS)
- Flash during stylesheet swap
- Difficult to maintain consistency

**Do this instead:** Use `[data-bs-theme]` selectors and CSS custom properties (already in Bootstrap 5.3)

### Anti-Pattern 3: Not Handling "auto" Mode

**What people do:** Only support explicit light/dark, ignore OS preference
```typescript
// DON'T DO THIS
theme: 'light' | 'dark';  // No 'auto' option
```

**Why it's wrong:**
- User expects app to respect system preference
- Forces manual theme selection
- Poor UX compared to modern apps

**Do this instead:** Support 'auto' mode that detects OS preference via matchMedia

### Anti-Pattern 4: Applying Theme After First Render

**What people do:** Load theme in ngOnInit, causing flash of wrong theme
```typescript
// DON'T DO THIS
ngOnInit() {
  this.themeService.loadTheme();  // Too late, already rendered
}
```

**Why it's wrong:**
- Flash of light theme before dark mode applies
- Poor user experience

**Do this instead:** Apply theme in service constructor or APP_INITIALIZER before first render

### Anti-Pattern 5: Storing Theme in Backend Config

**What people do:** Save theme to server like operational settings
```typescript
// DON'T DO THIS (for theme)
this._configService.set('ui', 'theme', 'dark');
```

**Why it's wrong (for theme):**
- Adds latency (API call to change theme)
- Doesn't work offline
- User expects per-device preference (work laptop vs personal laptop)
- Overkill for cosmetic setting

**Do this instead:** Use localStorage for instant, device-specific persistence

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-10k users | localStorage + single theme service = sufficient |
| 10k-100k users | No changes needed (theme is client-side only) |
| 100k+ users | Still no changes (localStorage scales infinitely per client) |

**Key insight:** Theme switching is entirely client-side. Server never involved. No scaling concerns.

## Sources

**Bootstrap 5.3 Dark Mode:**
- [Color modes · Bootstrap v5.3](https://getbootstrap.com/docs/5.3/customize/color-modes/) - Official dark mode documentation
- [bootstrap/scss/_variables-dark.scss at v5.3.5](https://github.com/twbs/bootstrap/blob/v5.3.5/scss/_variables-dark.scss) - Dark mode SCSS variables
- [Bootstrap 5.3.0 Release](https://blog.getbootstrap.com/2023/05/30/bootstrap-5-3-0/) - Dark mode feature announcement

**Angular Dark Mode Patterns:**
- [prefers-color-scheme - CSS | MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) - OS preference detection
- [Implementing Dark Mode in Angular Applications](https://www.sparkcodehub.com/angular/ui/implement-dark-mode-in-app) - Angular-specific patterns
- [LocalStorage in Angular 19: Signal‑Based Approaches](https://medium.com/@MichaelVD/localstorage-in-angular-19-clean-reactive-and-signal-based-approaches-b0be8adfd1e8) - Modern Angular storage patterns

**Best Practices:**
- [Best Practices for Persisting State in Frontend Applications](https://blog.pixelfreestudio.com/best-practices-for-persisting-state-in-frontend-applications/) - localStorage vs backend
- [How to store theme color preferences using the Local Storage API](https://codyhouse.co/blog/post/store-theme-color-preferences-with-localstorage) - Theme persistence patterns

---
*Architecture research for: SeedSync Dark Mode Integration*
*Researched: 2026-02-11*
