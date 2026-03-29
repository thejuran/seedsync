# Decisions

Append-only register of architectural and pattern decisions.

## 2026-03-21 — Angular upgrade path: 19→20→21 stepwise

Angular requires upgrading one major version at a time using `ng update`. Skipping versions is unsupported and causes transitive dependency conflicts. Will go 19→20→21.

## 2026-03-21 — Dependabot ignore rules for Angular 19 compatibility

Added `.github/dependabot.yml` ignoring major bumps for Angular, TypeScript, webpack, jQuery, ESLint, zone.js, and other packages incompatible with Angular 19. These ignores will be removed as part of the Angular 21 migration milestone.

| # | When | Scope | Decision | Choice | Rationale | Revisable? |
|---|------|-------|----------|--------|-----------|------------|
| D001 | M002 | arch | CONF-04 fix approach | Return unredacted config for authenticated requests | Auth gate proves trust; simplest fix, Settings UI just works | No |
| D002 | M002 | arch | Token lifecycle | Auto-generate on first run with secrets.token_urlsafe(32) | No manual step required; cryptographically strong | No |
| D003 | M002 | arch | Token discovery | Log at startup + deferred Settings UI display | Sufficient for first run; R017 deferred for UX polish | Yes — when R017 implemented |
| D004 | M002 | arch | Host allowlist default | localhost, 127.0.0.1, [::1] only + configurable | Minimal default; user adds reverse proxy hostname | No |
| D005 | M002 | arch | CSP strategy | autoCsp (hash-based) + scoped Bottle header | No server-side nonce logic needed; set-and-forget | No |
| D006 | M002 | convention | External fonts | Keep Google Fonts CDN in CSP allowlist | Existing UI depends on them; bundling is out of scope | Yes — if self-hosting needed |
| D007 | M003 | arch | Navigation pattern | Top nav bar replacing sidebar | Matches Triggarr's pattern for visual kinship | No |
| D008 | M003 | convention | Typography | System font stack, no Google Fonts | Removes external dependency, faster load (supersedes D006 for fonts) | No |
| D009 | M003 | convention | Color palette | Earthy 5-color palette (#13262f, #583e23, #73683b, #b0a084, #e9e6ff) | User-specified palette for visual differentiation from Triggarr | No |
| D010 | M003 | convention | Terminal effects | Remove all terminal/hacker theming | CRT, ASCII art, prompts, glows — none preserved | No |
| D011 | M003 | convention | Icons | Remove all SVG icons, text-only UI | Clean minimal aesthetic; status dots for filter dropdowns | No |
| D012 | M003 | convention | Status colors | Keep functional green/amber/red/blue | Semantic colors independent of theme palette | No |
| D013 | M003 | convention | Progress display | Percentage + size text replacing ASCII bar | Clean text over decorative ASCII visualization | No |
| D014 | M003 | convention | Branding | Text-only "SeedSync" in accent color, no logo image | Matches Triggarr's text branding pattern | No |
| D017 | M007 | convention | Settings cards use .settings-card pattern, no Bootstrap accordion JS | Flat layout, labels above inputs | No |
| D018 | M007 | arch | Merge selection-banner into bulk-actions-bar as single unified bar | One bar for both single and bulk actions | No |
| D019 | M007 | scope | Defer screenshots/docs/v3.3.0 release to future milestone | Not blocking dev work | Yes |
| D020 | M008 | arch | Merge AutoQueue page into Settings card with inline pattern CRUD | Reduces nav, all config in one place | No |
| D021 | M008 | arch | Hide file-actions-bar during bulk selection (single bar only) | Cleaner UX, no competing action bars | No |
| D022 | M008 | convention | Triggarr-style toasts with type icons and slide-in animation | ✓✕⚠ℹ icons, colored per type | No |
| D023 | M009 | arch | Keep bare except in config.py test connection handlers | CI mock prevents RequestException class resolution | No |
| D024 | M009 | arch | pexpect close uses explicit except blocks, not finally | Preserves post-close attribute access for error reporting | No |
| D025 | M010 | scope | Major version bump to 4.0.0 (not 3.3.0) | UI redesign + security hardening = breaking change scope | No |
