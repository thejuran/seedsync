---
phase: 29-theme-infrastructure
plan: 01
subsystem: frontend/theme
tags: [angular, signals, theme, dark-mode, bootstrap]
dependency_graph:
  requires: []
  provides:
    - ThemeService with signal-based state management
    - FOUC prevention inline script
    - Theme persistence via localStorage
    - Multi-tab theme synchronization
    - OS preference detection
  affects:
    - src/angular/src/index.html
    - src/angular/src/app/app.config.ts
    - src/angular/src/styles.scss
tech_stack:
  added:
    - Angular 19 signals for reactive theme state
    - Bootstrap 5.3 data-bs-theme attribute system
  patterns:
    - Signal-based reactive state (writable signal + computed)
    - FOUC prevention via inline blocking script
    - Cross-tab synchronization via storage events
    - OS preference tracking via matchMedia
key_files:
  created:
    - src/angular/src/app/services/theme/theme.types.ts
    - src/angular/src/app/services/theme/theme.service.ts
  modified:
    - src/angular/src/index.html
    - src/angular/src/app/app.config.ts
    - src/angular/src/styles.scss
decisions:
  - Use plain addEventListener for storage events (not RxJS fromEvent) to match signal-based architecture
  - Same-value signal assignment (_theme.set('auto')) used to force computed re-evaluation when OS preference changes
  - Silent console.warn fallback for localStorage errors in private browsing mode (no user-facing error)
  - Hardcoded light theme-color meta tag acceptable for now (Phase 31 will make dynamic)
metrics:
  duration_seconds: 149
  tasks_completed: 2
  files_created: 2
  files_modified: 3
  commits: 2
  completed_date: 2026-02-12
---

# Phase 29 Plan 01: Theme Infrastructure Summary

**One-liner:** Signal-based ThemeService with localStorage persistence, FOUC prevention inline script, multi-tab sync, and OS preference detection for Bootstrap 5.3 dark/light themes

## What Was Built

Implemented the complete theme infrastructure for SeedSync's dark mode feature:

1. **ThemeService** - Signal-based reactive service managing theme state
   - ThemeMode type: 'light' | 'dark' | 'auto'
   - ResolvedTheme computed signal resolves 'auto' to actual light/dark based on OS
   - localStorage persistence with private browsing fallback
   - Multi-tab synchronization via storage events
   - OS preference change detection via matchMedia
   - Auto-applies theme to DOM via effect() setting data-bs-theme attribute

2. **FOUC Prevention** - Inline blocking script in index.html
   - Executes before Angular bootstrap
   - Reads localStorage 'theme' key
   - Resolves 'auto' by checking window.matchMedia('(prefers-color-scheme: dark)')
   - Sets data-bs-theme attribute on document.documentElement
   - Logic matches ThemeService exactly to prevent flash

3. **Integration**
   - ThemeService registered via APP_INITIALIZER in app.config.ts
   - styles.scss updated to use var(--bs-body-bg) instead of hardcoded #f5f5f5
   - Proper cleanup with ngOnDestroy removing event listeners

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ index.html (FOUC Prevention)                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ <script> IIFE                                           │ │
│ │ 1. Read localStorage.getItem('theme')                  │ │
│ │ 2. If 'light'/'dark' -> use directly                   │ │
│ │ 3. If 'auto'/null -> check matchMedia                  │ │
│ │ 4. Set data-bs-theme BEFORE Angular boots             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ ThemeService (Angular Signal-based)                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Private _theme = signal<ThemeMode>('auto')             │ │
│ │ Public theme = _theme.asReadonly()                     │ │
│ │ Computed resolvedTheme: 'auto' -> matchMedia check     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Effects & Listeners:                                         │
│ • effect(): resolvedTheme() -> setAttribute(data-bs-theme)  │
│ • storage event: other tabs update -> sync _theme signal    │
│ • matchMedia change: OS pref changes -> trigger re-compute  │
│                                                              │
│ Public API:                                                  │
│ • setTheme(mode: ThemeMode): void                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ DOM: <html data-bs-theme="light|dark">                      │
│ Bootstrap 5.3 CSS variables respond to attribute            │
│ • --bs-body-bg, --bs-body-color, etc.                       │
└─────────────────────────────────────────────────────────────┘
```

## Signal Architecture Pattern

**Key Insight:** The service uses Angular 19's signal best practices:
- Private writable signal for internal state (`_theme`)
- Public readonly signal for external consumption (`theme`)
- Computed signal for derived state (`resolvedTheme`)
- Effect for side effects (DOM manipulation)

**Same-value Assignment Pattern:** When OS preference changes, `_theme.set('auto')` is called even though the value is already 'auto'. This forces the computed signal to re-evaluate `window.matchMedia`, which may now return a different result. This is documented in the code.

## Deviations from Plan

None - plan executed exactly as written.

## Testing Strategy

**Manual Testing via Browser Console (Phase 29-01 output spec):**

```javascript
// Access service via Angular DevTools or global injection
const themeService = window.ng.getComponent($0).injector.get(ThemeService);

// Test 1: Switch to dark mode
themeService.setTheme('dark');
// Expected: UI immediately switches to dark, localStorage updated

// Test 2: Switch to light mode
themeService.setTheme('light');
// Expected: UI immediately switches to light, localStorage updated

// Test 3: Switch to auto mode
themeService.setTheme('auto');
// Expected: UI matches OS preference

// Test 4: Multi-tab sync
// In second tab: themeService.setTheme('dark');
// Expected: First tab immediately switches to dark

// Test 5: FOUC prevention
// Set localStorage.setItem('theme', 'dark');
// Refresh page (hard reload)
// Expected: No flash of light theme - page loads directly in dark mode
```

**No Automated Tests:** Theme infrastructure is UI-focused. Testing strategy deferred to Phase 31 when toggle UI is built.

## Performance Notes

- FOUC script is ~300 bytes inline (minimal impact)
- Signal-based reactivity is more performant than RxJS for this use case
- localStorage reads/writes are synchronous but negligible overhead
- matchMedia listener only triggers on actual OS preference changes (rare)

## Known Limitations

1. **theme-color meta tag** - Still hardcoded to light mode (#f5f5f5). Phase 31 will make dynamic.
2. **No TypeScript strict mode** - Codebase uses non-strict mode, so some type assertions (e.g., `event.newValue as ThemeMode`) are needed.
3. **Service never destroyed** - providedIn: 'root' means ngOnDestroy rarely called, but cleanup is implemented for completeness.

## Key Commits

| Commit | Description | Files |
|--------|-------------|-------|
| ad35d2e | feat(29-01): create ThemeService with signal-based state management | theme.types.ts, theme.service.ts |
| 7e4157b | feat(29-01): add FOUC prevention and register ThemeService | index.html, app.config.ts, styles.scss, theme.service.ts (lint fixes) |

## Next Steps (Phase 29 Plan 02)

The theme infrastructure is complete and functional. Next plan will likely add:
- Theme toggle UI component (3-state button: light/dark/auto)
- Accessibility attributes (aria-label, role)
- Visual feedback for current mode
- Keyboard shortcuts (optional)

The service API (`themeService.setTheme()`) is ready to be called by the UI component.

## Success Criteria: ✅ PASSED

- [x] ThemeService created with signal-based state, localStorage persistence, multi-tab sync, OS preference detection
- [x] FOUC prevention inline script in index.html with matching resolution logic
- [x] ThemeService registered as APP_INITIALIZER in app.config.ts
- [x] styles.scss uses CSS variable for background-color
- [x] Angular build succeeds with no errors
- [x] ESLint passes with no new errors

## Self-Check: PASSED

**Files created:**
- ✅ src/angular/src/app/services/theme/theme.types.ts exists
- ✅ src/angular/src/app/services/theme/theme.service.ts exists

**Files modified:**
- ✅ src/angular/src/index.html contains inline script with data-bs-theme
- ✅ src/angular/src/app/app.config.ts imports and registers ThemeService
- ✅ src/angular/src/styles.scss uses var(--bs-body-bg)

**Commits:**
- ✅ ad35d2e exists in git log
- ✅ 7e4157b exists in git log

**Build verification:**
```bash
cd src/angular && npx ng build --configuration development
# Output: Build at: 2026-02-12T03:15:48.430Z - Hash: c035b88d7e06c130 - Time: 803ms
# Status: SUCCESS
```

**Lint verification:**
```bash
cd src/angular && npm run lint
# Output: (no errors or warnings)
# Status: PASSED
```

**Key patterns verified:**
- ✅ localStorage.getItem.*theme in index.html
- ✅ setAttribute.*data-bs-theme in theme.service.ts
- ✅ addEventListener.*storage in theme.service.ts
- ✅ matchMedia.*prefers-color-scheme in theme.service.ts
