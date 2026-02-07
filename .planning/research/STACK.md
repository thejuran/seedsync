# Technology Stack: Sass @use/@forward Migration

**Project:** SeedSync - Angular 19.x + Bootstrap 5.3
**Research Focus:** Stack requirements for @import → @use/@forward migration
**Researched:** 2026-02-07
**Overall Confidence:** HIGH

## Executive Summary

The SeedSync Angular frontend can successfully migrate from Sass `@import` to `@use`/`@forward` module system using current tooling. However, **Bootstrap 5.3 itself has not migrated to the module system** and will continue to emit deprecation warnings. This is expected and does not prevent the migration. The project's own SCSS files can be fully modernized while Bootstrap remains on `@import`.

**Key constraint:** Bootstrap 5.3.3 internally uses `@import` and cannot be imported with `@use` syntax. Bootstrap 6 (in early development, no release date) will address this.

## Current Stack Analysis

### Dart Sass (CURRENT)

| Component | Current Version | Support Status | Notes |
|-----------|----------------|----------------|-------|
| **sass** (package.json) | 1.97.3 | ✅ Full @use/@forward support | Direct dependency |
| **@angular/build** | Uses sass 1.85.0 | ✅ Full @use/@forward support | Via Angular CLI |
| **sass-loader** | Uses sass 1.97.3 | ✅ Full @use/@forward support | Via Angular CLI |

**Analysis:**
- Dart Sass 1.23.0+ (October 2019) introduced `@use` and `@forward`
- Current version 1.97.3 has 4+ years of module system maturity
- All versions in the project (1.85.0, 1.97.3) fully support module system
- **HIGH confidence:** Zero Dart Sass version blockers for this migration

**Source:** [Dart Sass Changelog](https://github.com/sass/dart-sass/blob/main/CHANGELOG.md), [Module System Launch](https://www.sasscss.com/blog/the-module-system-is-launched)

### Bootstrap (CRITICAL CONSTRAINT)

| Aspect | Status | Impact |
|--------|--------|--------|
| **Bootstrap version** | 5.3.3 | Uses `@import` internally |
| **Module system support** | ❌ Not available | Cannot import Bootstrap with `@use` |
| **Deprecation warnings** | Expected | Bootstrap emits warnings, this is normal |
| **Migration timeline** | Bootstrap 6 (TBD) | No confirmed release date |
| **Workaround** | Continue using `@import` for Bootstrap | Project can use `@use` for own files |

**Critical finding:** Bootstrap 5.3 **must be imported with `@import`** because Bootstrap's internal files use `@import`. You cannot write `@use 'bootstrap'`.

**What this means:**
1. `styles.scss` will continue to use `@import` for Bootstrap files
2. `_common.scss` can use `@forward` to re-export Bootstrap variables
3. Component SCSS files can use `@use` to import `_common.scss`
4. Deprecation warnings from Bootstrap itself are expected and normal

**Source:**
- [Bootstrap 5.3 Sass Documentation](https://getbootstrap.com/docs/5.3/customize/sass/) - shows only `@import` syntax
- [Bootstrap Issue #35906](https://github.com/twbs/bootstrap/issues/35906) - Module system tracking issue
- [Bootstrap Roadmap April 2025](https://github.com/orgs/twbs/discussions/41370) - Bootstrap 6 in early development
- [Bootstrap 6 Preview](https://coreui.io/blog/bootstrap-6/) - Sass modules planned for v6

### Angular CLI (INTEGRATION)

| Component | Version | SCSS Compilation | Notes |
|-----------|---------|------------------|-------|
| **@angular/cli** | 19.2.19 | ✅ Supports @use/@forward | Via sass-loader 16.0.5 |
| **@angular-devkit/build-angular** | 19.2.19 | ✅ Supports @use/@forward | Uses Vite + Sass |
| **Angular stylePreprocessorOptions** | N/A | ✅ Works with @use | Load paths supported |

**Analysis:**
- Angular CLI has supported `@use`/`@forward` since Angular 12+ (2021)
- Angular Material migrated to `@use` in v12 as a reference implementation
- `stylePreprocessorOptions.includePaths` works with `@use` syntax
- No Angular CLI configuration changes needed for the migration

**Source:**
- [The New State of CSS in Angular](https://blog.angular.dev/the-new-state-of-css-in-angular-bec011715ee6)
- [Angular Material Migration to @use](https://github.com/sass/sass/issues/3514) discussion

## Recommended Stack: Migration Tools

### sass-migrator (STRONGLY RECOMMENDED)

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| **sass-migrator** | 2.5.7 (latest) | Automated @import → @use conversion | First pass migration, component files |

**Installation:**
```bash
npm install -D sass-migrator
```

**Why use it:**
- Automates 90% of mechanical conversion work
- Handles namespace insertion
- Updates variable/mixin/function references
- Reduces manual errors

**Key limitation:** Cannot migrate Bootstrap files (they're third-party in node_modules). This is expected and correct behavior.

**Usage for this project:**
```bash
# Dry run to preview changes
npx sass-migrator module --migrate-deps --dry-run --verbose src/app/common/_common.scss

# Migrate component files (do NOT include styles.scss which imports Bootstrap)
npx sass-migrator module --migrate-deps src/app/**/*.component.scss
```

**Source:**
- [Sass Migrator Documentation](https://sass-lang.com/documentation/cli/migrator/)
- [sass-migrator on npm](https://www.npmjs.com/package/sass-migrator)

### Manual Migration (REQUIRED FOR BOOTSTRAP BOUNDARIES)

Files that interact with Bootstrap require manual migration:

| File | Migration Approach | Reason |
|------|-------------------|---------|
| `styles.scss` | Keep `@import` for Bootstrap | Bootstrap 5.3 not module-compatible |
| `_bootstrap-variables.scss` | Keep as variables-only file | Used before Bootstrap import |
| `_common.scss` | Manual `@forward` with `@use` | Bridges Bootstrap and components |
| Component SCSS | sass-migrator + manual review | Can use full `@use` syntax |

**Source:** Research synthesis from Bootstrap constraints and Sass module system documentation

## Migration Strategy: Hybrid Approach

### What Gets Migrated (Full @use/@forward)

1. **Component SCSS files** - All `*.component.scss` files
   - Migrate `@import '../../common/common'` → `@use '../../common/common' as *`
   - sass-migrator can handle this automatically

2. **_common.scss** - Manually convert to `@forward` hub
   - Forward Bootstrap variables from `_bootstrap-variables.scss`
   - Use `@forward ... as *` to maintain global variable access
   - Add custom variables and re-export them

### What Stays on @import (Bootstrap Boundary)

1. **styles.scss** - Entry point that imports Bootstrap
   - Must use `@import` for all Bootstrap SCSS files
   - Bootstrap 5.3 internals use `@import`, non-negotiable

2. **_bootstrap-variables.scss** - Bootstrap overrides
   - Stays as plain variable definitions (no `@import`, `@use`, or `@forward`)
   - Gets imported BEFORE Bootstrap's `_variables.scss` in styles.scss

### Why This Hybrid Works

- **Component isolation:** Components use modern `@use`, unaffected by Bootstrap's `@import`
- **Build order:** Angular compiles `styles.scss` separately from component styles
- **Deprecation warnings:** Only Bootstrap files emit warnings, not your code
- **Future-proof:** When Bootstrap 6 ships with module support, only `styles.scss` needs updates

**Source:** Synthesis of Angular CLI compilation behavior and Sass module system scoping rules

## Version Requirements

### DO NOT CHANGE

| Package | Current Version | Keep Because |
|---------|----------------|--------------|
| **sass** | ^1.32.0 (resolves to 1.97.3) | Already supports @use/@forward (1.23+) |
| **bootstrap** | ^5.3.3 | Latest stable; v6 not released |
| **@angular/cli** | ~19.2.19 | Already supports @use compilation |

### DO ADD (dev dependency)

| Package | Version | Purpose |
|---------|---------|---------|
| **sass-migrator** | ^2.5.7 | Automated migration tool |

**Installation:**
```bash
cd src/angular
npm install -D sass-migrator
```

## Integration Details

### Angular Build Process with @use

**How Angular CLI handles SCSS:**
1. Global styles (`styles.scss`) compiled once, output to global CSS
2. Component styles compiled per-component, scoped to component
3. `stylePreprocessorOptions.includePaths` available for both

**Effect on @use migration:**
- Component SCSS files compile independently
- Each component's `@use '../../common/common'` creates isolated scope
- No global variable pollution between components
- Bootstrap warnings only appear during global styles compilation

**Source:** [Angular CLI build process](https://github.com/angular/angular-cli/issues/25018) and Sass module system scoping

### Namespace Conventions for Component Files

**Recommended patterns:**

```scss
// Pattern 1: Global namespace (maintain current variable access)
@use '../../common/common' as *;

// Pattern 2: Explicit namespace (more explicit, safer for large teams)
@use '../../common/common' as common;
// Access: common.$primary-color

// Pattern 3: Custom namespace (semantic naming)
@use '../../common/common' as theme;
// Access: theme.$primary-color
```

**For this project:** Pattern 1 (`as *`) recommended
- Matches current usage where components access `$primary-color` directly
- Minimal code changes in component files
- Familiar to existing codebase patterns

**Source:**
- [Angular SCSS Best Practices](https://medium.com/@sehban.alam/structure-your-angular-scss-like-a-pro-best-practices-real-world-examples-8da57386afdd)
- [Sass @use Documentation](https://sass-lang.com/documentation/at-rules/use/)

## Deprecation Timeline

| Date | Event | Impact |
|------|-------|--------|
| **October 2019** | Dart Sass 1.23.0 ships `@use`/`@forward` | Module system available |
| **October 2021** | `@import` officially deprecated in Dart Sass 1.80.0 | Warnings appear |
| **Q2 2026 (estimated)** | Dart Sass 3.0.0 earliest possible release | `@import` removed |
| **TBD** | Bootstrap 6 release | Bootstrap module support |

**Critical insight:** Dart Sass 3.0 is **at least 2 years after Dart Sass 1.80.0** (October 2021), meaning no earlier than **October 2023**. However, Dart Sass 2.0 shipped first with smaller breaking changes. **Dart Sass 3.0 has no confirmed release date as of February 2026.**

**Implication:** There is time to migrate, but the migration should not be delayed indefinitely.

**Source:**
- [Dart Sass @import Deprecation](https://sass-lang.com/blog/import-is-deprecated/)
- [Dart Sass Breaking Changes](https://sass-lang.com/documentation/breaking-changes/import/)

## What NOT to Change and Why

### DO NOT migrate styles.scss to @use for Bootstrap

**Why:**
- Bootstrap 5.3 internally uses `@import` between its own files
- When you `@use 'bootstrap'`, Sass tries to load it as a module
- Bootstrap's internal `@import` statements conflict with module scoping
- Result: Build errors or missing Bootstrap styles

**What to do instead:**
- Keep `@import 'bootstrap/scss/functions'` etc. in styles.scss
- Only migrate your own files (`_common.scss`, component files)

### DO NOT use sass-migrator on node_modules

**Why:**
- sass-migrator skips third-party files in node_modules by design
- Bootstrap files are not under your control
- npm updates would overwrite any changes

**What to do instead:**
- Use `--migrate-deps` only for files in `src/`
- Manually review any Bootstrap import statements in your code

### DO NOT expect zero deprecation warnings

**Why:**
- Bootstrap 5.3 will continue emitting `@import` deprecation warnings
- These warnings come from Bootstrap's internal SCSS files
- You cannot silence them without modifying node_modules (bad practice)

**What to do instead:**
- Accept that Bootstrap warnings will appear
- Focus on eliminating warnings from your own SCSS files
- When Bootstrap 6 releases, update and warnings disappear

## Success Criteria

Migration is complete when:

- ✅ All component `*.component.scss` files use `@use` instead of `@import`
- ✅ `_common.scss` uses `@forward` to re-export variables
- ✅ Component files access variables with `@use '../../common/common' as *`
- ✅ All Angular unit tests still pass (381 tests)
- ✅ Zero TypeScript lint errors
- ✅ Visual regression: UI looks identical
- ⚠️ Bootstrap deprecation warnings remain (expected)
- ✅ Your project's SCSS files emit zero deprecation warnings

## Sources

### Primary Sources (HIGH Confidence)

1. [Dart Sass @import Deprecation](https://sass-lang.com/blog/import-is-deprecated/) - Official timeline
2. [Sass @use Documentation](https://sass-lang.com/documentation/at-rules/use/) - Official spec
3. [Sass @forward Documentation](https://sass-lang.com/documentation/at-rules/forward/) - Official spec
4. [Bootstrap 5.3 Sass Docs](https://getbootstrap.com/docs/5.3/customize/sass/) - Shows @import only
5. [Sass Migrator CLI](https://sass-lang.com/documentation/cli/migrator/) - Official tool docs

### Secondary Sources (MEDIUM Confidence)

6. [Bootstrap Issue #35906](https://github.com/twbs/bootstrap/issues/35906) - Module system tracking
7. [Bootstrap Roadmap April 2025](https://github.com/orgs/twbs/discussions/41370) - Bootstrap 6 status
8. [Angular CSS State](https://blog.angular.dev/the-new-state-of-css-in-angular-bec011715ee6) - Angular CLI Sass support
9. [Stop Using @import Guide](https://dev.to/quesby/stop-using-import-how-to-prepare-for-dart-sass-30-full-migration-guide-1agh) - Migration walkthrough

### Community Sources (LOW Confidence, for patterns only)

10. [Angular SCSS Best Practices](https://medium.com/@sehban.alam/structure-your-angular-scss-like-a-pro-best-practices-real-world-examples-8da57386afdd) - Namespace conventions
11. [Bootstrap 6 Preview](https://coreui.io/blog/bootstrap-6/) - Upcoming features discussion
