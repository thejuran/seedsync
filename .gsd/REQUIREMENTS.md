# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R001 — Bearer token validation on /server/* endpoints
- Class: compliance/security
- Status: active
- Description: Bottle before_request hook validates Authorization: Bearer token on all /server/* API endpoints. Invalid or missing tokens receive 401 Unauthorized.
- Why it matters: Prevents unauthorized access to the API from any network client.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-01 in v3.2 audit

### R002 — Token auto-generated with secrets.token_urlsafe(32)
- Class: compliance/security
- Status: active
- Description: API token is auto-generated on first run using secrets.token_urlsafe(32), written to config file, and logged once at startup.
- Why it matters: Ensures cryptographically strong token without requiring user to generate one manually.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-02 in v3.2 audit

### R003 — SSE stream exempt from token auth
- Class: compliance/security
- Status: active
- Description: The /server/stream SSE endpoint is exempt from Bearer token auth because EventSource cannot send custom headers.
- Why it matters: SSE is the real-time data backbone; blocking it would break the entire UI.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-03. Accepts read-only data leak risk as documented.

### R004 — Webhook endpoints exempt from token auth
- Class: compliance/security
- Status: active
- Description: /server/webhook/* endpoints are exempt from Bearer token auth. They use existing HMAC authentication.
- Why it matters: Sonarr/Radarr send webhooks and cannot be configured to send Bearer tokens.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-04

### R005 — No-token-configured allows all requests with warning
- Class: compliance/security
- Status: active
- Description: When no API token is configured (empty string), all requests are allowed through without authentication. A startup warning is logged.
- Why it matters: Backward compatibility — existing installs upgrading must not be locked out.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-05. Startup warning already exists from Phase 48.

### R006 — Angular HttpClient interceptor sends Bearer token
- Class: compliance/security
- Status: active
- Description: A functional Angular HTTP interceptor reads the API token and attaches Authorization: Bearer header to all API requests via HttpClient.
- Why it matters: Transparent auth for the SPA without modifying every service.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-06. Uses Angular withInterceptors() functional pattern.

### R007 — Token injected into SPA via meta tag in index.html
- Class: compliance/security
- Status: active
- Description: Bottle dynamically injects a <meta name="api-token" content="..."> tag into index.html at serve time. The Angular interceptor reads this.
- Why it matters: Avoids circular fetch (can't GET the token if the GET needs the token).
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-07. Requires intercepting __index() in WebApp to inject meta tag.

### R008 — Timing-safe token comparison
- Class: compliance/security
- Status: active
- Description: Token comparison uses hmac.compare_digest() to prevent timing side-channel attacks.
- Why it matters: Standard security practice for secret comparison.
- Source: user
- Primary owning slice: M002/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to AUTH-08

### R009 — Host header allowlist validation
- Class: compliance/security
- Status: active
- Description: before_request hook validates Host header against allowlist: localhost, 127.0.0.1, [::1], and user-configured hostname. Includes port stripping.
- Why it matters: Prevents DNS rebinding attacks that bypass same-origin policy.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to DNS-01

### R010 — Non-allowlisted Host returns 400 with no body
- Class: compliance/security
- Status: active
- Description: Requests with a Host header not in the allowlist receive 400 Bad Request with an empty body.
- Why it matters: Reveals no information to the attacker about the service.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to DNS-02

### R011 — User-configurable allowed hostname
- Class: compliance/security
- Status: active
- Description: User can configure an additional allowed hostname in settings (Config.General.allowed_hostname) for reverse proxy setups.
- Why it matters: Reverse proxy users need their domain to pass Host validation.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to DNS-03. New config field needed.

### R012 — Settings UI displays unredacted config for authed requests
- Class: primary-user-loop
- Status: active
- Description: When the request carries a valid Bearer token, GET /server/config/get returns unredacted values. Settings UI displays real values instead of **REDACTED**.
- Why it matters: The Settings page is broken without this — users see **REDACTED** and risk saving redacted values.
- Source: user
- Primary owning slice: M002/S02
- Supporting slices: M002/S01
- Validation: unmapped
- Notes: Maps to CONF-04. Depends on S01 auth being in place.

### R013 — Angular autoCsp generates hash-based CSP meta tag
- Class: compliance/security
- Status: active
- Description: Angular build uses security.autoCsp option in angular.json to generate SHA-256 hash-based CSP meta tag for inline scripts and styles.
- Why it matters: Eliminates need for unsafe-inline without server-side nonce logic.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to CSP-01. Verified compatible with esbuild application builder.

### R014 — Bottle CSP scoped to non-autoCsp directives only
- Class: compliance/security
- Status: active
- Description: Bottle after_request CSP header covers only directives not handled by autoCsp: default-src, img-src, connect-src, font-src, frame-ancestors. Does not set script-src or style-src (those come from autoCsp meta tag).
- Why it matters: Avoids conflicting with Angular-generated CSP. Dual CSP headers/meta tags are merged by the browser.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to CSP-02

### R015 — unsafe-inline removed from script-src and style-src
- Class: compliance/security
- Status: active
- Description: The final CSP policy (autoCsp meta + Bottle header combined) contains no 'unsafe-inline' in script-src or style-src.
- Why it matters: unsafe-inline defeats XSS protection; removing it is the whole point of CSP hardening.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to CSP-03

### R016 — Zero CSP violations during normal app usage
- Class: quality-attribute
- Status: active
- Description: No CSP violations appear in the browser console when visiting all pages: file list, settings, logs, about.
- Why it matters: CSP violations mean something is broken or blocked.
- Source: user
- Primary owning slice: M002/S03
- Supporting slices: none
- Validation: unmapped
- Notes: Maps to CSP-04. Google Fonts external sources are kept in CSP allowlist.

### R021 — Earthy color palette design tokens
- Class: differentiator
- Status: active
- Description: All app colors replaced with earthy palette — Jet Black (#13262f) background, Deep Walnut (#583e23) surfaces, Olive Bark (#73683b) accents, Khaki Beige (#b0a084) muted text, Lavender (#e9e6ff) primary text.
- Why it matters: Core visual identity change from terminal/hacker to earthy modern aesthetic.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: M003/S02, M003/S03, M003/S04, M003/S05
- Validation: unmapped
- Notes: Bootstrap SCSS variable overrides + CSS custom properties

### R022 — System font stack (no Google Fonts)
- Class: quality-attribute
- Status: active
- Description: Drop Fira Code and IBM Plex Sans Google Fonts. Use system-ui sans-serif and system monospace.
- Why it matters: Removes external font dependency, faster load, consistent with Triggarr.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: none
- Validation: unmapped
- Notes: Remove link tags from index.html and SCSS variable overrides. Supersedes D006.

### R023 — Top nav bar replacing sidebar
- Class: primary-user-loop
- Status: active
- Description: Replace collapsible sidebar (icon rail on desktop, hamburger overlay on mobile) with a Triggarr-style horizontal top nav bar with text links.
- Why it matters: Core layout change — matches Triggarr's navigation pattern for visual kinship.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: none
- Validation: unmapped
- Notes: Affects app.component, sidebar.component. Sidebar component will be removed.

### R024 — Remove all terminal/hacker effects
- Class: differentiator
- Status: active
- Description: Remove CRT scan lines, ASCII art logo, blinking cursors, '>' prompts, '--- Section ---' headers, green-pulse animations, ghost-btn glow effects.
- Why it matters: Terminal aesthetic is being replaced with clean modern UI.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: M003/S03, M003/S04, M003/S05
- Validation: unmapped
- Notes: Spread across styles.scss, about, settings, autoqueue, logs, file components

### R025 — Remove SVG icons from navigation
- Class: differentiator
- Status: active
- Description: Navigation uses text-only links. All nav SVG icons (dashboard.svg, settings.svg, autoqueue.svg, logs.svg, about.svg) removed.
- Why it matters: Clean text nav like Triggarr — icons are unnecessary.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: M003/S06
- Validation: unmapped
- Notes: routes.ts icon references updated, sidebar.component removed

### R026 — Remove file type SVG icons from file list
- Class: differentiator
- Status: active
- Description: File list rows show filenames without file/directory/archive type icons.
- Why it matters: Cleaner, minimal file list matching Triggarr's list aesthetic.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: M003/S06
- Validation: unmapped
- Notes: file.component.html, file-actions-bar.component.html

### R027 — Text-only action buttons (no SVG icons)
- Class: differentiator
- Status: active
- Description: File action buttons (Queue, Stop, Extract, Delete Local, Delete Remote) use text labels only, no SVG icons.
- Why it matters: Consistent with removing all custom SVGs.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: M003/S06
- Validation: unmapped
- Notes: file.component, file-actions-bar.component, settings restart button

### R028 — Status dots in filter dropdowns
- Class: primary-user-loop
- Status: active
- Description: Status filter dropdown items show colored dot indicators next to text labels instead of SVG status icons.
- Why it matters: Provides visual status identification without custom SVGs.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: none
- Validation: unmapped
- Notes: file-options.component — status dots already exist in file rows, extend to dropdowns

### R029 — Percentage + size text replacing ASCII progress bar
- Class: primary-user-loop
- Status: active
- Description: File size display shows "42% — 1.2 GB of 2.8 GB" as clean text instead of ASCII block progress bar.
- Why it matters: Terminal ASCII bar doesn't fit clean aesthetic.
- Source: user
- Primary owning slice: M003/S03
- Supporting slices: none
- Validation: unmapped
- Notes: file.component — remove ascii-bar div, compute percentage

### R030 — Text-only branding in nav (no logo image)
- Class: differentiator
- Status: active
- Description: Top nav shows "SeedSync" as bold text in accent color. No logo.png image.
- Why it matters: Clean text branding like Triggarr. Logo image not needed.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: M003/S06
- Validation: unmapped
- Notes: logo.png asset removed in S06

### R031 — Triggarr-style card layout for Settings
- Class: primary-user-loop
- Status: active
- Description: Settings page uses clean card sections with simple headings instead of Bootstrap accordion with monospace '--- Section ---' headers.
- Why it matters: Matches Triggarr's settings page aesthetic.
- Source: user
- Primary owning slice: M003/S04
- Supporting slices: none
- Validation: unmapped
- Notes: settings-page.component, option.component

### R032 — Clean About page (no ASCII art)
- Class: differentiator
- Status: active
- Description: About page uses a simple centered card with version, description, features, and links. No ASCII art banner.
- Why it matters: Terminal ASCII art doesn't fit clean aesthetic.
- Source: user
- Primary owning slice: M003/S05
- Supporting slices: none
- Validation: unmapped
- Notes: about-page.component

### R033 — Clean Logs page (no terminal prompts)
- Class: primary-user-loop
- Status: active
- Description: Logs page displays log records without '>' prompt prefix or terminal styling. Clean layout.
- Why it matters: Consistent with removing all terminal theming.
- Source: user
- Primary owning slice: M003/S05
- Supporting slices: none
- Validation: unmapped
- Notes: logs-page.component

### R034 — Clean AutoQueue page (no terminal styling)
- Class: primary-user-loop
- Status: active
- Description: AutoQueue page uses clean card styling without '>' prompt prefix or terminal-styled pattern list.
- Why it matters: Consistent with removing all terminal theming.
- Source: user
- Primary owning slice: M003/S05
- Supporting slices: none
- Validation: unmapped
- Notes: autoqueue-page.component

### R035 — Responsive layout matching Triggarr patterns
- Class: quality-attribute
- Status: active
- Description: Mobile layout uses stacked cards, top nav stays visible, file list adapts columns. Matches Triggarr's responsive approach.
- Why it matters: Consistent mobile experience between the two related projects.
- Source: user
- Primary owning slice: M003/S02
- Supporting slices: M003/S03, M003/S04, M003/S05
- Validation: unmapped
- Notes: Major change is sidebar→top nav on mobile; file list column hiding stays similar

### R036 — Keep favicon.png unchanged
- Class: constraint
- Status: active
- Description: The existing favicon.png asset is preserved as-is.
- Why it matters: User explicitly wants to keep the current favicon.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: none
- Validation: unmapped
- Notes: No change needed — just don't delete it

### R037 — Remove unused SVG icon assets
- Class: quality-attribute
- Status: active
- Description: All SVG icon files in src/assets/icons/ that are no longer referenced by any component are deleted. logo.png is also removed.
- Why it matters: Clean repo — no dead assets.
- Source: user
- Primary owning slice: M003/S06
- Supporting slices: none
- Validation: unmapped
- Notes: Final cleanup after all components are restyled

### R038 — Functional status colors preserved
- Class: primary-user-loop
- Status: active
- Description: File status indicator colors (downloading=green, queued=amber, stopped=red, extracting=blue) remain as semantic functional colors independent of the earthy palette.
- Why it matters: Status colors are UX conventions (success/warning/danger/info), not theme colors.
- Source: user
- Primary owning slice: M003/S01
- Supporting slices: M003/S03
- Validation: unmapped
- Notes: Status dot colors and left-border colors stay as-is

### R039 — Visual kinship with Triggarr via shared layout patterns
- Class: differentiator
- Status: active
- Description: SeedSync and Triggarr should look like related projects — same layout structure (top nav, card sections, spacing density) differentiated only by color palette.
- Why it matters: Both are the user's projects — visual family coherence.
- Source: inferred
- Primary owning slice: M003/S02
- Supporting slices: M003/S04, M003/S05
- Validation: unmapped
- Notes: Palette is the differentiator, not layout

## Validated

(none yet)

## Deferred

### R017 — Token visible in Settings UI for authenticated users
- Class: admin/support
- Status: deferred
- Description: The Settings page displays the API token (copyable) for authenticated sessions.
- Why it matters: Convenience for users who lose the startup log output.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — token is logged at first startup. Can be a quick follow-up.

### R040 — Triggarr-style toast notifications
- Class: quality-attribute
- Status: deferred
- Description: Redesign toast notification styling to match Triggarr's clean notification patterns.
- Why it matters: Visual consistency, but current Bootstrap toasts are functional.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: unmapped
- Notes: Deferred — current toasts work fine, can be polished later.

## Out of Scope

### R041 — Rewrite Angular to htmx/Tailwind
- Class: anti-feature
- Status: out-of-scope
- Description: Do not rewrite the Angular/Bootstrap frontend to htmx/Tailwind like Triggarr uses.
- Why it matters: Prevents scope explosion — this is a retheme, not a rewrite.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Different tech stacks are fine — visual kinship comes from design patterns not framework.

### R042 — New favicon or logo design
- Class: constraint
- Status: out-of-scope
- Description: Do not create new favicon or logo artwork. Keep existing favicon.png.
- Why it matters: Prevents scope creep into graphic design.
- Source: user
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: User explicitly wants to keep existing favicon.

### R018 — OAuth / multi-user authentication
- Class: anti-feature
- Status: out-of-scope
- Description: No multi-user auth, OAuth, or session management. Single shared token.
- Why it matters: Prevents scope creep into identity management for a single-user daemon.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Single-user self-hosted tool.

### R019 — HTTPS termination
- Class: constraint
- Status: out-of-scope
- Description: HTTPS is handled by the reverse proxy, not by SeedSync itself.
- Why it matters: Avoids certificate management complexity in the daemon.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Standard practice for self-hosted services behind nginx/traefik.

### R020 — Rate limiting
- Class: constraint
- Status: out-of-scope
- Description: No request rate limiting on API endpoints.
- Why it matters: Prevents over-engineering for a single-user tool.
- Source: inferred
- Primary owning slice: none
- Supporting slices: none
- Validation: n/a
- Notes: Can be added at reverse proxy layer if needed.

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | compliance/security | active | M002/S01 | none | unmapped |
| R002 | compliance/security | active | M002/S01 | none | unmapped |
| R003 | compliance/security | active | M002/S01 | none | unmapped |
| R004 | compliance/security | active | M002/S01 | none | unmapped |
| R005 | compliance/security | active | M002/S01 | none | unmapped |
| R006 | compliance/security | active | M002/S01 | none | unmapped |
| R007 | compliance/security | active | M002/S01 | none | unmapped |
| R008 | compliance/security | active | M002/S01 | none | unmapped |
| R009 | compliance/security | active | M002/S02 | none | unmapped |
| R010 | compliance/security | active | M002/S02 | none | unmapped |
| R011 | compliance/security | active | M002/S02 | none | unmapped |
| R012 | primary-user-loop | active | M002/S02 | M002/S01 | unmapped |
| R013 | compliance/security | active | M002/S03 | none | unmapped |
| R014 | compliance/security | active | M002/S03 | none | unmapped |
| R015 | compliance/security | active | M002/S03 | none | unmapped |
| R016 | quality-attribute | active | M002/S03 | none | unmapped |
| R017 | admin/support | deferred | none | none | unmapped |
| R018 | anti-feature | out-of-scope | none | none | n/a |
| R019 | constraint | out-of-scope | none | none | n/a |
| R020 | constraint | out-of-scope | none | none | n/a |
| R021 | differentiator | active | M003/S01 | M003/S02–S05 | unmapped |
| R022 | quality-attribute | active | M003/S01 | none | unmapped |
| R023 | primary-user-loop | active | M003/S02 | none | unmapped |
| R024 | differentiator | active | M003/S01 | M003/S03–S05 | unmapped |
| R025 | differentiator | active | M003/S02 | M003/S06 | unmapped |
| R026 | differentiator | active | M003/S03 | M003/S06 | unmapped |
| R027 | differentiator | active | M003/S03 | M003/S06 | unmapped |
| R028 | primary-user-loop | active | M003/S03 | none | unmapped |
| R029 | primary-user-loop | active | M003/S03 | none | unmapped |
| R030 | differentiator | active | M003/S02 | M003/S06 | unmapped |
| R031 | primary-user-loop | active | M003/S04 | none | unmapped |
| R032 | differentiator | active | M003/S05 | none | unmapped |
| R033 | primary-user-loop | active | M003/S05 | none | unmapped |
| R034 | primary-user-loop | active | M003/S05 | none | unmapped |
| R035 | quality-attribute | active | M003/S02 | M003/S03–S05 | unmapped |
| R036 | constraint | active | M003/S01 | none | unmapped |
| R037 | quality-attribute | active | M003/S06 | none | unmapped |
| R038 | primary-user-loop | active | M003/S01 | M003/S03 | unmapped |
| R039 | differentiator | active | M003/S02 | M003/S04–S05 | unmapped |
| R040 | quality-attribute | deferred | none | none | unmapped |
| R041 | anti-feature | out-of-scope | none | none | n/a |
| R042 | constraint | out-of-scope | none | none | n/a |

## Coverage Summary

- Active requirements: 35 (16 M002 + 19 M003)
- Mapped to slices: 35
- Validated: 0
- Unmapped active requirements: 0
