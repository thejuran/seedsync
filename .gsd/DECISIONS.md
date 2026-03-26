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
