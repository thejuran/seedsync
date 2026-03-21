# Phase 29: Theme Infrastructure — Context

## Phase Boundary

**Goal:** App detects and applies theme preference with no flash on page load
**Requirements:** THEME-01 through THEME-06
**What this phase does NOT include:** Toggle UI (Phase 31), SCSS color audit (Phase 30), cosmetic fixes (Phase 32)

## Locked Architecture Decisions (from milestone planning)

- Bootstrap 5.3 native dark mode via `data-bs-theme` attribute
- Signal-based `ThemeService` for reactive state (Angular 19 patterns)
- `localStorage` for persistence (client-side only, no backend changes)
- Inline script in `index.html` for FOUC prevention
- Three-state model: `light` / `dark` / `auto`
- Multi-tab synchronization via `storage` event listener

## Discussed Decisions

### First-Visit Default Behavior

**Decision:** Default mode is `auto` (follows OS preference)

- Brand-new users with no stored preference get `auto` mode
- `auto` reads `prefers-color-scheme` media query to determine light vs dark
- If the OS has no preference set (rare), `auto` resolves to **light**
- `auto` is a permanent option in the three-state toggle — users can always switch back to it after manually selecting light or dark

### FOUC Prevention Script Scope

**Decision:** Full resolution in the inline script

- The inline `<script>` in `index.html` handles ALL cases before Angular bootstraps:
  - Reads `localStorage` for stored preference
  - If stored value is `light` or `dark` → apply directly
  - If stored value is `auto` or no value exists → check `window.matchMedia('(prefers-color-scheme: dark)')` and apply result
- This ensures zero flash regardless of mode (auto, light, dark, or first visit)

## Default Decisions (not discussed, use reasonable defaults)

### Theme Transition Behavior
- Use **instant swap** (no CSS transition) when theme changes
- Keeps implementation simple; avoids visual oddities on complex layouts

### Storage Unavailable (Private Browsing)
- **Silent fallback** to `auto` behavior (OS preference) with no user-facing indication
- Console warning for developers only

## Deferred Ideas

None captured.

---
*Created: 2026-02-11*
*Discussed areas: First-Visit Default (4 questions)*
