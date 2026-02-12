# Stack Research

**Domain:** Dark/Light Theme System with OS Preference Detection
**Researched:** 2026-02-11
**Confidence:** HIGH

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Bootstrap 5.3.8 | 5.3.8 (already installed) | Native dark mode via `data-bs-theme` | Built-in color mode system since 5.3.0, no additional libraries needed. Uses CSS custom properties that automatically switch between light/dark values. |
| Angular 19.x | 19.2.18 (already installed) | Theme service with Signals | Modern reactive theme state management. Signals provide automatic UI updates without manual change detection. |
| TypeScript 5.7 | 5.7.3 (already installed) | Type safety for matchMedia API | Ensures type safety for `MediaQueryList` and `MediaQueryListEvent` objects. |
| SCSS/Sass | 1.32.0 (already installed) | Dark mode color customization | Required for customizing Bootstrap's `_variables-dark.scss` Sass maps and using `@include color-mode(dark)` mixin. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @angular/common | 19.2.18 (already installed) | DOCUMENT injection token | Always use for SSR-safe DOM access. Required for setting `data-bs-theme` on document element. |
| @angular/core | 19.2.18 (already installed) | Renderer2, inject, Signal | Use Renderer2 for SSR-safe DOM manipulation. Use Signal for reactive theme state. |
| Web Storage API (built-in) | N/A (browser native) | Persist theme preference | Use `localStorage.setItem('theme', value)` to remember user's choice across sessions. |
| matchMedia API (built-in) | N/A (browser native) | Detect OS color scheme preference | Use `window.matchMedia('(prefers-color-scheme: dark)')` to detect and listen for OS theme changes. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Chrome DevTools | Test dark mode without changing OS | Use DevTools > Rendering > Emulate CSS media feature `prefers-color-scheme` |
| Bootstrap Color Mode Mixin | SCSS dark mode overrides | Use `@include color-mode(dark) { ... }` in custom SCSS files to scope dark-only styles |

## Installation

**NO NEW PACKAGES REQUIRED.** All necessary dependencies are already installed.

```bash
# Verify existing versions
cd src/angular
npm list bootstrap        # Should show 5.3.8
npm list @angular/core    # Should show 19.2.18
npm list sass             # Should show 1.32.0
```

## What's Already Available

### Bootstrap 5.3.8 Dark Mode Features

Bootstrap 5.3+ provides out-of-the-box:

1. **CSS Custom Properties** - All color variables automatically switch based on `data-bs-theme`:
   - `--bs-body-color`, `--bs-body-bg`
   - `--bs-emphasis-color`, `--bs-border-color`
   - `--bs-link-color`, `--bs-primary`, etc.
   - All component-specific variables (buttons, forms, dropdowns, etc.)

2. **data-bs-theme Attribute** - Controls color mode at any scope:
   ```html
   <!-- Global dark mode -->
   <html data-bs-theme="dark">

   <!-- Per-component override -->
   <div class="card" data-bs-theme="light">
   ```

3. **Sass Variables for Customization** - Already imported in `styles.scss`:
   - `_variables-dark.scss` (line 25) provides dark-specific color maps
   - Can override in `_bootstrap-variables.scss` BEFORE importing Bootstrap
   - Example: `$body-bg-dark: #1a1a1a;` to customize dark background

4. **Color Mode Mixin** - For custom dark mode styles:
   ```scss
   @include color-mode(dark) {
     .custom-component {
       --custom-var: value;
     }
   }
   // Outputs: [data-bs-theme=dark] .custom-component { ... }
   ```

### Angular Features Already in Place

1. **Renderer2** - SSR-safe DOM manipulation (though app uses CSR, good practice)
2. **DOCUMENT token** - Injectable document reference for accessing `documentElement`
3. **Signals** - Reactive state management (Angular 19.x feature)
4. **localStorage** - Browser API for persistence (no polyfill needed)
5. **matchMedia** - Browser API for OS preference detection (no polyfill needed)

## What Needs to be Built

### 1. ThemeService (Angular Service)

**Purpose:** Centralize theme management, persistence, and OS preference detection.

**Responsibilities:**
- Initialize theme from localStorage or OS preference
- Provide Signal for reactive theme state
- Set `data-bs-theme` attribute on `<html>` element
- Persist theme changes to localStorage
- Listen for OS preference changes (optional: respect when no saved preference)

**Implementation Pattern:**
```typescript
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private themeSignal = signal<'light' | 'dark' | 'auto'>('auto');
  public theme = this.themeSignal.asReadonly();

  constructor(@Inject(DOCUMENT) private document: Document) {
    // 1. Check localStorage
    // 2. Fall back to OS preference via matchMedia
    // 3. Apply to document.documentElement
    // 4. Listen for OS changes
  }

  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    // 1. Update signal
    // 2. Apply to document.documentElement
    // 3. Save to localStorage
  }
}
```

**Why NOT use Renderer2:**
- App uses CSR (browser builder), not SSR
- Direct `document.documentElement.setAttribute()` is simpler and sufficient
- If SSR is added later, wrap in `isPlatformBrowser()` check

### 2. Dark Mode Color Customizations (SCSS)

**Where:** `/src/angular/src/app/common/_bootstrap-variables.scss`

**What to add:**
```scss
// Dark mode color overrides (placed BEFORE Bootstrap imports)
$body-bg-dark: #1a1a1a;                    // Custom dark background
$body-color-dark: #e0e0e0;                 // Custom dark text color
$header-color-dark: #2a2a2a;               // Custom dark header
// ... other dark-specific overrides
```

**Why here:**
- Existing file already overrides Bootstrap variables
- Must appear BEFORE Bootstrap's `_variables.scss` import (already correctly ordered in `styles.scss`)
- Bootstrap uses these Sass variables to generate CSS custom properties

**Alternative approach (post-compilation):**
```scss
// In _bootstrap-overrides.scss (post-compilation overrides)
@include color-mode(dark) {
  :root {
    --bs-body-bg: #1a1a1a;
    --bs-body-color: #e0e0e0;
  }
}
```

**Recommendation:** Use Sass variable approach in `_bootstrap-variables.scss` for consistency with existing pattern.

### 3. Theme Toggle Component (Optional UI)

**Purpose:** Give users manual control to override OS preference.

**Options:**
- Toggle button (light/dark/auto)
- Dropdown menu (light/dark/auto)
- Icon-only switch

**Integration:**
```typescript
@Component({ ... })
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);
  theme = this.themeService.theme;  // Signal for reactive template

  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.themeService.setTheme(theme);
  }
}
```

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Bootstrap 5.3 `data-bs-theme` | Manual CSS class switching (`.dark-theme`) | Never. Bootstrap provides this out-of-the-box. |
| Native matchMedia API | Third-party theme libraries (@ngneat/theme-switcher) | Never for this use case. Adds unnecessary dependency. |
| Angular Signals | RxJS BehaviorSubject | If on Angular <16. Signals are simpler and built-in for Angular 19. |
| localStorage | sessionStorage | Only if theme should NOT persist across browser sessions (unlikely). |
| CSS custom properties | SCSS variables only | Never. CSS custom properties enable runtime switching. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@media (prefers-color-scheme: dark)` only | Doesn't allow user override. Can't toggle programmatically. | `data-bs-theme` attribute (respects user choice AND OS preference) |
| Third-party Angular Material themes | Incompatible with Bootstrap. Would require Material components. | Bootstrap's native `data-bs-theme` system |
| CSS class-based theming (`.dark-theme`) | Requires custom CSS for every component. Bootstrap already solved this. | Bootstrap CSS custom properties that switch via `data-bs-theme` |
| jQuery for DOM manipulation | Not Angular-idiomatic. Bypasses change detection. | Renderer2 or direct DOM access (CSR app) |
| Setting individual CSS variables | Tedious and error-prone. Bootstrap handles this automatically. | Set `data-bs-theme` attribute; Bootstrap updates all variables |
| Global CSS color overrides | Breaks Bootstrap component theming. Hard to maintain. | SCSS variable overrides in `_bootstrap-variables.scss` |

## Integration with Existing Bootstrap Variable System

### Current Setup (from milestone context)

```
styles.scss (imports in this order):
  1. @import 'bootstrap/scss/functions';
  2. @import 'app/common/bootstrap-variables';   ← Pre-compilation overrides
  3. @import 'bootstrap/scss/variables';
  4. @import 'bootstrap/scss/variables-dark';    ← Already imported! (line 25)
  5. ... (rest of Bootstrap)
  6. @use 'app/common/bootstrap-overrides';      ← Post-compilation overrides
```

**Key insight:** `variables-dark` is ALREADY imported. Dark mode is ready to use. We just need to:
1. Set the `data-bs-theme` attribute (ThemeService)
2. Customize dark colors if needed (add to `_bootstrap-variables.scss`)

### Where to Add Dark Mode Customizations

| File | When to Use | Example |
|------|-------------|---------|
| `_bootstrap-variables.scss` | Override Bootstrap's dark Sass variables (recommended) | `$body-bg-dark: #1a1a1a;` |
| `_bootstrap-overrides.scss` | Post-compilation CSS variable overrides | `@include color-mode(dark) { --bs-body-bg: #1a1a1a; }` |

**Recommendation:** Use `_bootstrap-variables.scss` for consistency with existing light theme customization pattern.

## Version Compatibility

| Package | Current Version | Compatible With | Notes |
|---------|-----------------|-----------------|-------|
| bootstrap | 5.3.8 | Angular 19.x | Dark mode introduced in 5.3.0. No breaking changes. |
| @angular/core | 19.2.18 | bootstrap 5.3.x | Framework-agnostic. Bootstrap works with any framework. |
| sass | 1.32.0 | bootstrap 5.3.x | Bootstrap requires Sass for compilation. Version adequate. |
| @popperjs/core | 2.11.8 | bootstrap 5.3.x | Required for dropdowns, popovers, tooltips. Already installed. |

**No version upgrades needed.** All packages are compatible.

## Browser Compatibility

| Feature | Browser Support | Fallback Needed? |
|---------|----------------|------------------|
| CSS custom properties | All modern browsers (IE11 requires fallback) | No. SeedSync targets modern browsers. |
| matchMedia API | All browsers including IE10+ | No. |
| prefers-color-scheme | Chrome 76+, Firefox 67+, Safari 12.1+ | Yes. Fall back to 'light' if not supported. |
| localStorage | All browsers including IE8+ | No. |
| Angular 19 Signal | N/A (Angular runtime) | No. |

**Recommendation:** Detect `matchMedia('(prefers-color-scheme: dark)')` support. If unsupported, default to 'light' theme.

```typescript
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
```

## Performance Considerations

### CSS Custom Property Switching

**Fast:** Setting `data-bs-theme` attribute triggers CSS custom property cascade. Browser handles this natively with GPU acceleration.

**Avoid:** Dynamically loading different CSS files. Causes flash of unstyled content (FOUC).

**Bootstrap approach:** All color mode styles are loaded upfront. Only the attribute changes.

### localStorage Access

**Pattern:** Read once on service initialization, write on theme change.

**Avoid:** Reading localStorage on every component initialization. Use service singleton.

### matchMedia Listener

**Pattern:** Register ONE listener in ThemeService, notify via Signal.

**Avoid:** Multiple matchMedia listeners across components. Wastes memory.

**Cleanup:** Use Angular's `DestroyRef` to remove listener when app destroyed.

```typescript
constructor() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const destroyRef = inject(DestroyRef);

  const listener = (e: MediaQueryListEvent) => this.handleOSThemeChange(e);
  mediaQuery.addEventListener('change', listener);

  destroyRef.onDestroy(() => mediaQuery.removeEventListener('change', listener));
}
```

## Testing Strategy

### Manual Testing

1. **Browser DevTools:**
   - Chrome DevTools > Rendering > Emulate CSS media feature `prefers-color-scheme`
   - Toggle between light/dark/no preference
   - Verify theme changes without changing OS setting

2. **OS-level Testing:**
   - Change OS dark mode setting (macOS, Windows, Linux)
   - Verify app respects preference when no saved theme

3. **localStorage Persistence:**
   - Set theme to dark
   - Reload page
   - Verify dark theme persists

### Unit Testing Considerations

**ThemeService tests should verify:**
- Initial theme from localStorage
- Fallback to OS preference if no localStorage
- Theme changes update document.documentElement
- Theme changes persist to localStorage
- OS preference changes trigger theme update (when theme is 'auto')

**Mock dependencies:**
- `DOCUMENT` token → mock document with documentElement
- `window.matchMedia` → mock MediaQueryList
- `localStorage` → mock storage

## Sources

**HIGH CONFIDENCE** - Official Documentation:
- [Bootstrap 5.3 Color Modes](https://getbootstrap.com/docs/5.3/customize/color-modes/) — Official Bootstrap 5.3 dark mode documentation
- [Bootstrap 5.3 CSS Variables](https://getbootstrap.com/docs/5.3/customize/css-variables/) — CSS custom properties reference
- [Angular Renderer2 API](https://angular.dev/api/core/Renderer2) — Official Angular Renderer2 documentation
- [Angular DOCUMENT Token](https://angular.dev/api/common/DOCUMENT) — Official Angular DOCUMENT injection token

**MEDIUM CONFIDENCE** - Verified Community Sources (2025-2026):
- [Building a Modern Theme Switcher in Angular](https://medium.com/@dmmishchenko/building-a-modern-theme-switcher-in-angular-2bfba412f9a4) — Angular 19 Signal-based theme service pattern
- [LocalStorage in Angular 19: Clean, Reactive, and Signal-Based Approaches](https://medium.com/@MichaelVD/localstorage-in-angular-19-clean-reactive-and-signal-based-approaches-b0be8adfd1e8) — localStorage integration with Signals
- [prefers-color-scheme MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme) — Media query specification
- [Bootstrap 5.3.0 Release Blog](https://blog.getbootstrap.com/2023/05/30/bootstrap-5-3-0/) — Dark mode feature announcement
- [Theme Switcher in Angular: Using Signals](https://medium.com/@manpreetkaur6311062/theme-switcher-in-angular-using-signals-change-theme-from-light-to-dark-and-vice-versa-da05012a8016) — Signal-based theme implementation
- [Detecting Dark Mode in JavaScript](https://ultimatecourses.com/blog/detecting-dark-mode-in-javascript) — matchMedia API usage patterns

**VERIFICATION NOTES:**
- Bootstrap 5.3.8 installed confirmed via `npm list bootstrap`
- `variables-dark` import confirmed in `styles.scss` line 25
- Existing Bootstrap variable override system confirmed in project structure
- Angular 19.2.18 with Signal support confirmed in `package.json`

---
*Stack research for: Dark/Light Theme System with OS Preference Detection*
*Researched: 2026-02-11*
*Confidence: HIGH (all core features verified in official docs and existing codebase)*
