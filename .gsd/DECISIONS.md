# Decisions

Append-only register of architectural and pattern decisions.

## 2026-03-21 — Angular upgrade path: 19→20→21 stepwise

Angular requires upgrading one major version at a time using `ng update`. Skipping versions is unsupported and causes transitive dependency conflicts. Will go 19→20→21.

## 2026-03-21 — Dependabot ignore rules for Angular 19 compatibility

Added `.github/dependabot.yml` ignoring major bumps for Angular, TypeScript, webpack, jQuery, ESLint, zone.js, and other packages incompatible with Angular 19. These ignores will be removed as part of the Angular 21 migration milestone.
