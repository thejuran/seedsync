# SeedSync

## What This Is

SeedSync is a file syncing tool that syncs files from a remote Linux server (like a seedbox) to a local machine using LFTP. Features a Terminal/Hacker-themed web UI (dark-only, Fira Code + IBM Plex Sans, matrix-green accents, ASCII progress bars), Sonarr/Radarr integration for automated post-download workflows, and real-time transfer status via SSE. Security-hardened with HMAC webhook auth, credential redaction, SSRF protection, and thread-safe concurrent operations.

## Core Value

Reliable file sync from seedbox to local with automated media library integration.

## Previous State

**v3.1 Harden & Fix (shipped 2026-02-24)** — Comprehensive security hardening and code quality pass addressing 68 findings from deep code review. Closed RCE attack chain (RSA key, pickle, SSH MITM), sealed credential exposure, fixed 4 race conditions, eliminated 6 crash bugs, hardened Angular frontend (XSS, subscription leaks, focus trap), Python 3.12+ compatibility.

952+ Python tests, 84% coverage with fail_under threshold. Angular 19.x with Bootstrap 5.3, SCSS uses @use/@forward. 420+ Angular unit tests passing. Zero TypeScript lint errors. Single CI workflow (master.yml) handles all Docker publishing.

<details>
<summary>v3.1 Harden & Fix (Shipped 2026-02-24)</summary>

- Removed committed RSA key, SSH StrictHostKeyChecking=accept-new (TOFU), pickle→JSON in remote scanner
- Config API redacts passwords/API keys, SSE log stream scrubs LFTP credentials, HMAC webhook auth
- SSRF protection on *arr test endpoints, security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- Thread-safe auto-delete and webhook imports under model lock, atomic ExtractDispatch queue, copy-under-lock listeners
- Fixed propagate_exception, None guards, bare except→queue.Empty, SSE unknown event guards, JSON.parse try/catch, 30s action timeout
- XSS sanitization in confirm modal, RxJS pipe refactor, takeUntil/destroy$ subscription cleanup, focus trap + ARIA
- Python 3.12+ (distutils replaced), pexpect argv lists, POST/DELETE mutations, isinstance() throughout
- 12 code review follow-up fixes (Phase 46): webhook_secret redaction, getMessage() log scrubbing, atomic extract(), full Tab interception, timer cleanup, RestService helpers

</details>

<details>
<summary>v3.0 Terminal UI Overhaul (Shipped 2026-02-17)</summary>

- Replaced Bootstrap color system with Terminal/Hacker palette (Fira Code + IBM Plex Sans, #0d1117 dark base, green accents)
- Collapsible 56px icon-rail sidebar expanding to 200px on hover, `>` prompt on active route, version display
- ASCII progress bars, colored status borders, green glow on downloading, ghost-style action buttons
- Terminal-style Settings headers, AutoQueue monospace patterns, colored log levels, ASCII art About page
- CRT scan-line overlay (z-index 9999, pointer-events:none), custom dark scrollbars
- Removed light/auto theme system entirely — deleted ThemeService for dark-only simplification

</details>

<details>
<summary>v2.0 Dark Mode & Polish (Shipped 2026-02-12)</summary>

- Signal-based ThemeService with localStorage persistence and multi-tab sync
- FOUC prevention via inline script in `<head>`
- Custom CSS variables for light/dark themes with Bootstrap 5.3 data-bs-theme
- All SCSS hardcoded colors migrated to theme-aware CSS variables
- Appearance section in Settings with Light/Dark/Auto toggle
- *arr text updated to "Sonarr/Radarr" + WAITING_FOR_IMPORT enum

</details>

<details>
<summary>v1.8 Radarr + Webhooks (Shipped 2026-02-11)</summary>

- Radarr config and test connection (mirror of Sonarr pattern)
- Shared *arr Integration section in Settings UI (Sonarr + Radarr subsections)
- Webhook POST endpoints replacing polling for instant import detection
- WebhookManager with thread-safe Queue (web → controller thread)
- SonarrManager polling code removed (webhook-only architecture)
- 23 new unit tests, 381/381 Angular tests passing

</details>

<details>
<summary>v1.7 Sonarr Integration (Shipped 2026-02-10)</summary>

- Sonarr API integration (connection, queue polling, import detection)
- Auto-delete local files after Sonarr confirms import (global toggle, 60s delay)
- Import status badges in file list UI + toast notifications
- Settings UI for Sonarr configuration (URL, API key, enable/disable)
- 6-layer safety system for auto-delete (local-only, dry-run, hot-toggle, etc.)

</details>

## Requirements

### Validated

**v3.1 (Shipped 2026-02-24):**

- ✓ RSA key removed, SSH host key verification hardened (TOFU), pickle→JSON — v3.1
- ✓ Config API redacts credentials, LFTP passwords scrubbed from SSE logs — v3.1
- ✓ SSRF protection on *arr test endpoints, shell metacharacter escaping — v3.1
- ✓ HMAC webhook authentication, security headers on all responses — v3.1
- ✓ Thread-safe auto-delete, webhook imports, and ExtractDispatch queue — v3.1
- ✓ Crash prevention: exception propagation, None guards, SSE resilience, bounded timeouts — v3.1
- ✓ XSS sanitization, Observable pipe refactors, subscription leak fixes — v3.1
- ✓ Python 3.12+ compatibility (distutils replaced), pexpect argv, POST/DELETE mutations — v3.1
- ✓ Focus trap + ARIA labels for keyboard accessibility — v3.1
- ✓ CLAUDE.md updated, API response codes documented — v3.1
- ✓ 12 code review follow-up fixes (credential leak, log redaction, TOCTOU, timer cleanup) — v3.1

**v3.0 (Shipped 2026-02-17):**

- ✓ Fira Code font for all data displays (filenames, speeds, sizes, progress) — v3.0
- ✓ IBM Plex Sans for UI labels, buttons, and navigation — v3.0
- ✓ Deep dark backgrounds (#0d1117 base) with green accent palette — v3.0
- ✓ CRT scan-line overlay effect (subtle, low opacity) — v3.0
- ✓ Custom dark scrollbar styling — v3.0
- ✓ Sidebar as 56px icon rail, expands to 200px on hover — v3.0
- ✓ `>` prompt indicator on active route in sidebar — v3.0
- ✓ App version at bottom of sidebar — v3.0
- ✓ Mobile hamburger menu preserved — v3.0
- ✓ Search input with terminal prompt `>` prefix — v3.0
- ✓ Colored left border on file rows by status — v3.0
- ✓ ASCII-style block progress bars — v3.0
- ✓ Green glow effect on actively downloading rows — v3.0
- ✓ Colored dot + text for file status (no SVG icons) — v3.0
- ✓ Ghost-style action buttons with glow on hover — v3.0
- ✓ Terminal-style section headers in Settings — v3.0
- ✓ Monospace patterns in AutoQueue with green/red buttons — v3.0
- ✓ True terminal-style Logs (monospace, colored by level) — v3.0
- ✓ ASCII-art inspired About page — v3.0
- ✓ Theme toggle removed from Settings page — v3.0
- ✓ ThemeService simplified to dark-only — v3.0

**v2.0 (Shipped 2026-02-12):**

- ✓ Dark theme for entire UI (backgrounds, text, components) — v2.0
- ✓ Light theme preserved as current default — v2.0
- ✓ OS `prefers-color-scheme` auto-detection — v2.0
- ✓ Manual dark/light toggle in Settings page (Appearance section) — v2.0
- ✓ Toast/notification text references both Sonarr and Radarr — v2.0
- ✓ Auto-delete description references both Sonarr and Radarr — v2.0
- ✓ WAITING_FOR_IMPORT enum value for file status — v2.0

**v1.6 (Shipped 2026-02-10):**

- ✓ `:dev` Docker image published to GHCR on every master push (multi-arch) — v1.6
- ✓ `docker-publish.yml` removed — single CI workflow handles everything — v1.6
- ✓ Version tag publishing continues working on tag pushes — v1.6
- ✓ pytest cache warnings suppressed in Docker test runner — v1.6
- ✓ webob cgi deprecation warnings filtered from test output — v1.6

**v1.5 (Shipped 2026-02-08):**

- ✓ pytest-cov integration with coverage reporting and fail_under threshold — v1.5
- ✓ Unit tests for common module gaps (5 modules, 100% coverage) — v1.5
- ✓ Unit tests for web handler gaps (7 handlers, 69 tests) — v1.5
- ✓ Unit tests for controller.py and controller_job.py (106 tests) — v1.5
- ✓ Coverage 77% → 84%, 231 new tests — v1.5

**v1.4 (Shipped 2026-02-08):**

- ✓ Migrate all @import to @use/@forward across Angular SCSS files — v1.4
- ✓ Eliminate Sass @import deprecation warnings from build output — v1.4

**v1.3 (Shipped 2026-02-04):**

- ✓ Fix TypeScript strictness lint errors (62 issues) — v1.3
- ✓ Status dropdown shows file counts per status — v1.3

**v1.2 (Shipped 2026-02-04):**

- ✓ Details button removed — v1.2
- ✓ Pin button removed — v1.2

**v1.1 (Shipped 2026-02-04):**

- ✓ File options dropdowns use Bootstrap dropdown component — v1.1
- ✓ All text inputs use consistent Bootstrap form styling — v1.1
- ✓ Form focus states use app color scheme — v1.1
- ✓ Full E2E test suite passes — v1.1

**v1.0 (Shipped 2026-02-03):**

- ✓ Bootstrap SCSS infrastructure with customizable variables — v1.0
- ✓ All colors consolidated to Bootstrap theme variables — v1.0
- ✓ Selection highlighting unified with teal palette — v1.0
- ✓ All buttons standardized to Bootstrap semantic variants — v1.0

### Active

(None — define in next milestone)

### Out of Scope

- E2E tests (Playwright) — separate concern
- Lidarr/Readarr support — defer to future milestone
- Bootstrap @import → @use migration — blocked until Bootstrap 6
- Light mode restoration — intentionally removed in v3.0, Terminal/Hacker is dark-only

## Context

**Codebase state:**
- ~31,557 Python LOC, ~16,534 TypeScript LOC
- 952+ Python tests, 84% coverage (fail_under enforced)
- 420+ Angular unit tests passing
- Zero TypeScript lint errors
- Python 3.12+ compatible (distutils replaced)

**Technical notes:**
- Application SCSS uses @use/@forward; Bootstrap remains on @import (required by Bootstrap 5.3)
- Dark-only via hardcoded `data-bs-theme="dark"` on HTML element (no JS theme switching)
- Google Fonts CDN for Fira Code + IBM Plex Sans (graceful fallback)
- CRT scan-line overlay at z-index 9999 with pointer-events:none
- WAITING_FOR_IMPORT enum exists as structural placeholder (no business logic sets it yet)
- `make run-tests-python` Docker build fails on arm64 (Apple Silicon) — `rar` package only available for amd64. CI unaffected.
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options) on all API responses
- HMAC-SHA256 webhook authentication (empty secret = skip verification for backward compat)
- Config API redacts sensitive fields; SSE log stream scrubs passwords
- SSH uses StrictHostKeyChecking=accept-new (TOFU) with persistent known_hosts

## Constraints

- **No functional regressions**: All existing features must continue working
- **Bootstrap 5 patterns**: Leverage Bootstrap classes where possible
- **Dark-only**: v3.0 removed light/auto modes — Terminal/Hacker is inherently dark

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use teal (secondary) for all selections | Teal is more distinctive than blue, already used in bulk selection | ✓ Good |
| Migrate to Bootstrap `btn` classes | Reduces custom CSS, leverages Bootstrap's states | ✓ Good |
| Keep @import for Bootstrap SCSS | Mixing @use/@import creates namespace conflicts | ✓ Good |
| CSS variables for Bootstrap theming | Easier maintenance, runtime flexibility vs SCSS overrides | ✓ Good |
| Bootstrap 5.3 data-bs-theme for dark mode | Native framework support, minimal custom CSS | ✓ Good |
| Hardcode data-bs-theme="dark" (v3.0) | App is dark-only, no runtime JS needed for theme switching | ✓ Good |
| Google Fonts CDN for Fira Code + IBM Plex Sans | Zero build-time cost, graceful fallback | ✓ Good |
| CRT overlay z-index 9999 pointer-events:none | Floats above all content without blocking interaction | ✓ Good |
| Sidebar overlays content on hover (fixed 56px margin) | Matches VS Code/terminal UX, no content reflow | ✓ Good |
| Direct hex values for terminal palette colors | Dark-only app, Bootstrap variable indirection unnecessary | ✓ Good |
| Source-agnostic toast text ("Sonarr/Radarr") | System doesn't distinguish which *arr triggered import | ✓ Good |
| SSH TOFU (accept-new) over reject-all | Preserves first-connect usability while blocking MITM on reconnects | ✓ Good |
| Pickle→JSON for remote scanner | Eliminates RCE vector (CWE-502), same data fidelity | ✓ Good |
| Redact at serialization layer not storage | Internal code reads real values, API clients see **REDACTED** | ✓ Good |
| Empty webhook_secret skips HMAC | Backward compat for existing installs; configured = strict | ✓ Good |
| Security headers via after_request hook | Zero-touch, applies to all routes automatically | ✓ Good |
| Model lock two-window pattern | Lock only for data access, release before subprocess spawn | ✓ Good |
| Atomic extract() under single mutex | Eliminates TOCTOU race between duplicate check and insert | ✓ Good |
| POST/DELETE for mutation endpoints | Prevents browser prefetch/crawler side effects | ✓ Good |
| pexpect argv list over shell string | Eliminates shell metacharacter injection (CWE-88) | ✓ Good |
| Inline _strtobool over distutils | Zero new dependencies, Python 3.12+ compatible | ✓ Good |
| takeUntil/destroy$ for Angular cleanup | Uniform subscription management, no mixed patterns | ✓ Good |
| getMessage() for log redaction | Catches format-arg passwords that record.msg misses | ✓ Good |

## Project Status

**Status:** v3.1 Harden & Fix shipped

13 milestones shipped (v1.0 through v3.1), 46 phases, 88 plans completed.

**Future work (if desired):**
- Lidarr/Readarr support (same *arr pattern)
- E2E test coverage (Playwright)

---
*Last updated: 2026-02-24 after v3.1 milestone*
