# Project Research Summary

**Project:** SeedSync v1.4 Sass @use Migration
**Domain:** Sass module system migration (Angular + Bootstrap application)
**Researched:** 2026-02-07
**Confidence:** HIGH

## Executive Summary

The SeedSync Angular frontend can successfully migrate from deprecated Sass `@import` to the modern `@use/@forward` module system using current tooling (Dart Sass 1.97.3, Angular CLI 19.2.19). However, a critical constraint shapes the entire migration strategy: Bootstrap 5.3 has not migrated to the module system and continues to use `@import` internally. This means a hybrid approach is required where Bootstrap loading remains on `@import` while application-specific SCSS files migrate to `@use/@forward`.

The recommended strategy is pragmatic and achievable: keep Bootstrap imports in `styles.scss` using the legacy `@import` pattern, transform `_common.scss` into a `@forward` aggregation hub using the module system, and migrate all component files (already using `@use`) to consume the modernized common module. This hybrid approach eliminates deprecation warnings from application code while accepting that Bootstrap itself will continue emitting warnings until Bootstrap 6 ships with module support.

Key risks are manageable: namespace conflicts from mixing `@use` and `@import` are avoided by isolating Bootstrap to the global stylesheet, variable override timing issues are sidestepped by keeping Bootstrap's pre-import configuration pattern, and the `sass-migrator` tool's inability to handle third-party dependencies is mitigated by manual migration of the small number of files that interact with Bootstrap. Visual regression is the highest risk and requires careful before/after comparison, but the architecture analysis confirms that Angular's ViewEncapsulation and Sass's module scoping are orthogonal concerns that won't interfere.

## Key Findings

### Recommended Stack

The current stack (Dart Sass 1.97.3 via Angular CLI 19.2.19) fully supports the Sass module system with no version upgrades required. The module system has been available since Dart Sass 1.23.0 (October 2019) and is mature with 4+ years of stability. The only addition needed is `sass-migrator` 2.5.7 as a dev dependency for automated migration of component files.

**Core technologies:**
- **Dart Sass 1.97.3**: Already installed via Angular CLI — Full `@use/@forward` support with 4+ years maturity
- **Bootstrap 5.3.3**: CSS framework — CRITICAL CONSTRAINT: Uses `@import` internally, cannot use `@use` syntax until Bootstrap 6
- **sass-migrator 2.5.7**: Migration tool — Automates 90% of component file conversion (cannot handle Bootstrap boundaries)
- **Angular CLI 19.2.19**: Build system — Native `@use/@forward` compilation support via sass-loader

**Critical finding:** Bootstrap 5.3 must be imported with `@import` because Bootstrap's internal SCSS files use `@import`. The `@use "bootstrap" with ($primary: ...)` configuration pattern does not work with Bootstrap 5.3. This is not a project limitation but a Bootstrap architectural constraint that will be resolved in Bootstrap 6 (no release date confirmed).

### Expected Features

The migration must deliver a hybrid architecture that modernizes application code while maintaining Bootstrap compatibility. The feature landscape defines both what must be migrated (table stakes) and what should be deferred.

**Must have (table stakes):**
- All component SCSS files use `@use` instead of `@import` — Required to eliminate application deprecation warnings
- Variable access via `@use` with namespace management — Core module system functionality
- Bootstrap variable overrides continue working — Critical constraint for theme customization
- Zero visual regressions — Non-negotiable success criteria
- Zero Sass warnings from application code — Primary goal of migration

**Should have (differentiators):**
- `_common.scss` as `@forward` aggregation hub — Provides clean variable re-export pattern
- Index files for module organization — Simplifies import paths if module structure grows
- Private member prefixes for API boundaries — Marks internal-only variables with `_` prefix

**Defer (v2+ or Bootstrap 6):**
- Migrating Bootstrap to `@use` — Blocked by Bootstrap 5.3 architecture, wait for Bootstrap 6
- Scoped Bootstrap imports — Optimization not required for initial migration
- Explicit namespaces instead of wildcard — `as *` is acceptable for pragmatic migration

**Anti-features (explicitly avoid):**
- Mixing `@use` and `@import` in same file — Creates namespace conflicts
- Using `sass-migrator` on Bootstrap-dependent files — Tool fails on third-party dependencies
- Silencing all deprecation warnings — Hides application code issues
- Adding `!default` everywhere — Breaks existing variable precedence

### Architecture Approach

The current SeedSync SCSS architecture already has component files using `@use` correctly, positioning the project well for completing the migration. The dependency graph reveals that only three files need transformation: `_common.scss` (convert to `@forward` aggregator), `_bootstrap-overrides.scss` (add namespace to variable references), and `styles.scss` (maintain hybrid `@import` for Bootstrap).

**Current architecture (already partially modernized):**
```
styles.scss (global) — @import Bootstrap + app modules
├── Bootstrap core (@import) — Legacy loading required
├── _bootstrap-variables.scss — Variable overrides (plain definitions)
├── _bootstrap-overrides.scss (@import) — Post-compilation CSS tweaks
└── _common.scss (@import) — Variable re-export bridge

Component files (16 files) — @use '../../common/common' as * (ALREADY MODERN)
```

**Target architecture (hybrid approach):**
```
styles.scss (global) — Hybrid @import (Bootstrap) + @use (app)
├── Bootstrap core (@import) — KEEP legacy loading (Bootstrap 5.3 constraint)
├── _bootstrap-variables.scss — No changes (pure variable definitions)
├── _bootstrap-overrides.scss (@use) — Add namespaces to variable refs
└── _common.scss (@forward) — Transform into aggregation module

Component files (16 files) — No changes needed (already using @use correctly)
```

**Major components:**
1. **Bootstrap isolation layer** (`styles.scss`) — Maintains `@import` for Bootstrap core, uses `@use` for app modules
2. **Variable aggregation hub** (`_common.scss`) — Uses `@forward` to re-export Bootstrap variables and custom variables
3. **Component consumption** (all `*.component.scss`) — Already using `@use` with wildcard namespace for direct variable access

**Key architectural insight:** Angular's ViewEncapsulation (component style scoping) and Sass's module system (variable/mixin scoping) are orthogonal concerns that don't interfere. ViewEncapsulation scopes compiled CSS selectors to components at runtime; the module system scopes variables during SCSS compilation. Both can coexist without conflicts.

### Critical Pitfalls

The research identified 13 pitfalls across critical, moderate, and minor categories. The top 5 that directly impact this migration:

1. **Bootstrap 5.3 uses `@import` internally** (CRITICAL) — Cannot use `@use "bootstrap"` syntax. Must keep `@import` for all Bootstrap loading in `styles.scss`. This is a foundational architecture decision that affects all subsequent work. Accept that Bootstrap deprecation warnings will remain until Bootstrap 6.

2. **Variable override timing with `@use with` configuration** (CRITICAL) — The `@use "module" with ($var: value)` pattern doesn't work with Bootstrap 5.3 because Bootstrap doesn't expose configuration properly. Must continue using pre-import variable definition pattern: define overrides in `_bootstrap-variables.scss`, then `@import` Bootstrap variables afterward.

3. **Namespace conflicts from mixing `@use` and `@import`** (CRITICAL) — A file loaded via both `@use` and `@import` creates duplicate definitions. Choose ONE mechanism per file. For SeedSync: `@import` for Bootstrap (required), `@use` for application modules (preferred). Never mix both for the same file.

4. **sass-migrator fails on third-party dependencies** (CRITICAL) — The automated migration tool cannot handle Bootstrap imports in `node_modules`. Do NOT run with `--migrate-deps` flag on global stylesheets. Use migrator only for pure application code without Bootstrap dependencies. Manually migrate `_common.scss` and `styles.scss`.

5. **`@forward` must come before all other rules** (MODERATE) — Sass enforces strict ordering: `@forward` first, then `@use`, then variables/CSS. When transforming `_common.scss`, place all `@forward` statements at the top. Violation causes explicit compilation errors.

**Additional notable pitfall:** Using `@use as *` wildcard defeats namespace benefits (moderate impact). For SeedSync, this is an acceptable pragmatic choice to minimize code changes in component files. Document this as "minimum viable migration" and consider future refactoring to explicit namespaces.

## Implications for Roadmap

Based on the dependency graph and constraint analysis, the migration should follow a 6-phase structure that isolates Bootstrap handling early, transforms the aggregation layer, then tackles component migration with automation.

### Phase 1: Strategy and Dependency Audit
**Rationale:** Bootstrap 5.3 compatibility is a foundational constraint that dictates the entire migration strategy. Must validate assumptions and catalog all SCSS files before making architectural decisions.

**Delivers:** Complete inventory of SCSS files, confirmed Bootstrap/Font Awesome versions, documented hybrid approach decision, migration strategy document with Bootstrap isolation pattern.

**Addresses:** Pitfall 1 (Bootstrap compatibility), Pitfall 8 (Font Awesome version check), Pitfall 9 (deprecation warning strategy).

**Avoids:** Starting migration without understanding Bootstrap constraints (would require rework).

**Research flag:** Standard inventory phase, no additional research needed (patterns well-documented).

### Phase 2: Bootstrap Isolation (styles.scss)
**Rationale:** Isolate Bootstrap to its own loading context before migrating application code. This prevents namespace conflicts and validates that the hybrid approach compiles successfully.

**Delivers:** `styles.scss` updated to maintain `@import` for Bootstrap core while preparing for `@use` integration of application modules. Confirmed that Bootstrap continues to work with current variable override pattern.

**Uses:** Bootstrap 5.3.3 (keep on `@import`), Angular CLI Sass compilation.

**Addresses:** Feature requirement (Bootstrap variable overrides must work), Pitfall 3 (namespace conflicts).

**Avoids:** Attempting to migrate Bootstrap to `@use` (not supported until Bootstrap 6).

**Research flag:** No additional research needed (Bootstrap limitation confirmed by official sources).

### Phase 3: Transform _common.scss (aggregation layer)
**Rationale:** The `_common.scss` file is the bridge between Bootstrap and components. Converting it to use `@forward` enables components to access variables via `@use` while maintaining the current variable API.

**Delivers:** `_common.scss` transformed into a `@forward` aggregation module that re-exports Bootstrap variables and custom variables. All downstream consumers (component files) can now use `@use` to access these variables with proper module scoping.

**Uses:** `@forward` for re-export, `@use` for local consumption of Bootstrap functions.

**Implements:** Variable aggregation hub component from architecture analysis.

**Addresses:** Feature requirement (variable access with `@use`), Architecture pattern (`@forward` aggregation).

**Avoids:** Pitfall 5 (`@forward` ordering), Pitfall 6 (Bootstrap variable re-export pattern).

**Research flag:** No additional research needed (pattern well-documented in ARCHITECTURE.md).

### Phase 4: Transform _bootstrap-overrides.scss
**Rationale:** This file contains post-compilation CSS tweaks that reference Bootstrap variables. Must add namespaces to variable references to work with the modernized `_common.scss`.

**Delivers:** `_bootstrap-overrides.scss` converted from `@import 'bootstrap-variables'` to `@use 'bootstrap-variables' as bv`, with all variable references updated to use `bv.$` prefix.

**Uses:** `@use` with explicit namespace for clarity.

**Addresses:** Architecture component (post-compilation override layer).

**Avoids:** Forgetting to namespace variable references (causes undefined variable errors).

**Research flag:** No additional research needed (straightforward namespace addition).

### Phase 5: Component File Migration (automated)
**Rationale:** Component files already use `@use` syntax correctly (`@use '../../common/common' as *`). This phase is primarily validation that the transformed `_common.scss` works correctly with all consumers.

**Delivers:** Verification that all 16 component files continue to compile and access variables correctly through the modernized `_common.scss`. Any manual fixes needed for edge cases.

**Uses:** `sass-migrator` for validation (dry-run mode), manual review for any Bootstrap-touching components.

**Addresses:** Feature requirement (all component SCSS uses `@use`), Pitfall 4 (sass-migrator limitations).

**Avoids:** Running sass-migrator on files that import Bootstrap (tool fails).

**Research flag:** No additional research needed (components already modernized).

### Phase 6: Validation and Testing
**Rationale:** Visual regression is the highest risk. Must systematically verify that compiled CSS output is identical and all Angular tests continue passing.

**Delivers:** Confirmed zero visual regressions via screenshot comparison, all 381 Angular unit tests passing, zero deprecation warnings from application code, documented Bootstrap warnings as expected (external dependency).

**Uses:** Angular test suite, visual comparison tooling (manual screenshots or automated).

**Addresses:** Feature requirement (zero visual regressions, zero warnings from app code), Success criteria from FEATURES.md.

**Avoids:** Pitfall 9 (silencing all warnings prematurely), Pitfall 13 (not measuring build performance improvement).

**Research flag:** No additional research needed (standard validation phase).

### Phase Ordering Rationale

- **Bootstrap isolation first (Phase 2):** Prevents namespace conflicts by establishing clear boundary between legacy `@import` (Bootstrap) and modern `@use` (application code).
- **Aggregation layer next (Phase 3):** The `_common.scss` transformation is the critical dependency for all component files. Must be stable before validating component consumption.
- **Component validation last (Phase 5):** Components already use correct syntax, so this is primarily validation rather than migration. Low risk, can parallelize with Phase 4.
- **Validation throughout (Phase 6):** Visual regression testing after each phase would be ideal, but comprehensive validation at the end is acceptable given low file count.

### Research Flags

Phases with standard patterns (skip research-phase):
- **Phase 1:** Inventory and audit — Standard file enumeration
- **Phase 2:** Bootstrap isolation — Pattern documented in STACK.md and PITFALLS.md
- **Phase 3:** `@forward` aggregation — Pattern documented in ARCHITECTURE.md
- **Phase 4:** Namespace addition — Mechanical transformation
- **Phase 5:** Component validation — Already migrated, just verification
- **Phase 6:** Testing and validation — Standard QA phase

**No phases require `/gsd:research-phase` invocation.** All patterns are well-documented in the completed research files with high confidence from official Sass and Bootstrap sources.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified, Dart Sass 1.97.3 fully supports module system with 4+ years maturity |
| Features | HIGH | Hybrid approach validated by community (Bootstrap limitation documented in official GitHub discussions) |
| Architecture | HIGH | Component files already using `@use` correctly, dependency graph clear, transformation pattern well-defined |
| Pitfalls | HIGH | All critical pitfalls verified with official Sass documentation and Bootstrap GitHub issues |

**Overall confidence:** HIGH

The research is based on official documentation from Sass team (module system spec, deprecation timeline) and authoritative sources from Bootstrap maintainers (GitHub discussions confirming no module support until v6). The hybrid approach is the industry-standard workaround used by Angular projects worldwide. The main uncertainty is visual regression risk, which is inherent to any SCSS refactoring and mitigated by comprehensive testing.

### Gaps to Address

While research confidence is high, these areas need validation during implementation:

- **Bootstrap function namespace behavior:** Research indicates Bootstrap functions (`shade-color`, `tint-color`) are defined in `bootstrap/scss/functions` with `@import`. Need to test whether `@use 'bootstrap/scss/functions'` makes these available, or if `_common.scss` must continue using `@import` for Bootstrap functions. Fallback pattern documented in ARCHITECTURE.md Phase 2.

- **Angular CLI compilation with hybrid approach:** While research confirms Angular CLI supports both `@import` and `@use` in the same project, need to validate that mixing both in `styles.scss` (Bootstrap via `@import`, application modules via `@use`) compiles without warnings or errors. This is a critical assumption for Phase 2.

- **sass-migrator behavior on component files:** Tool should skip components that already use `@use`, but need to verify it doesn't attempt to "re-migrate" or introduce changes. Plan to run in `--dry-run` mode first to preview changes before applying.

- **Performance impact measurement:** Research indicates 10-30% faster compilation with `@use` vs `@import`. Should measure before/after build times to quantify improvement and validate research claims. Use `ng build --configuration production` for timing.

## Sources

### Primary (HIGH confidence)

**Official Sass documentation:**
- [Sass @use Rule](https://sass-lang.com/documentation/at-rules/use/) — Module loading syntax and namespace rules
- [Sass @forward Rule](https://sass-lang.com/documentation/at-rules/forward/) — Re-export patterns and ordering requirements
- [Sass @import Deprecation](https://sass-lang.com/blog/import-is-deprecated/) — Deprecation timeline (Dart Sass 3.0 removes `@import`)
- [Sass Module System Launch](https://www.sasscss.com/blog/the-module-system-is-launched) — Official announcement and rationale
- [Sass Migrator CLI](https://sass-lang.com/documentation/cli/migrator/) — Automated migration tool documentation

**Official Bootstrap documentation:**
- [Bootstrap 5.3 Sass Docs](https://getbootstrap.com/docs/5.3/customize/sass/) — Shows only `@import` syntax, no `@use` support
- [Bootstrap Issue #35906](https://github.com/twbs/bootstrap/issues/35906) — Module system tracking issue
- [Bootstrap Roadmap April 2025](https://github.com/orgs/twbs/discussions/41370) — Bootstrap 6 in early development
- [Bootstrap @use Discussion #41260](https://github.com/orgs/twbs/discussions/41260) — Community confirmation of no module support

**Official Angular documentation:**
- [Angular Component Styling](https://angular.dev/guide/components/styling) — ViewEncapsulation behavior
- [The New State of CSS in Angular](https://blog.angular.dev/the-new-state-of-css-in-angular-bec011715ee6) — Angular CLI Sass support

### Secondary (MEDIUM confidence)

**Community migration guides:**
- [Stop Using @import Guide](https://dev.to/quesby/stop-using-import-how-to-prepare-for-dart-sass-30-full-migration-guide-1agh) — Comprehensive migration walkthrough
- [Migrating from @import to @use](https://norato-felipe.medium.com/migrating-from-import-to-use-and-forward-in-sass-175b3a8a6221) — Real-world migration patterns
- [Using index files with Sass @use](https://tannerdolby.com/writing/using-index-files-in-sass/) — Aggregation patterns
- [Sass modules primer (OddBird)](https://www.oddbird.net/2019/10/02/sass-modules/) — Module system concepts

**Angular community resources:**
- [Angular SCSS Best Practices](https://medium.com/@sehban.alam/structure-your-angular-scss-like-a-pro-best-practices-real-world-examples-8da57386afdd) — Namespace conventions
- [Structure SCSS in Angular](https://dev.to/stefaniefluin/how-to-structure-scss-in-an-angular-app-3376) — Architecture patterns
- [Angular 19 Sass Warnings](https://coreui.io/blog/angular-19-sass-deprecation-warnings/) — Deprecation warning handling

### Tertiary (LOW confidence, for patterns only)

- [Bootstrap 6 Preview](https://coreui.io/blog/bootstrap-6/) — Speculative features (not official)
- [Bootstrap 5.3.8 with @use workaround](https://timdows.com/blogs/bootstrap-5-3-8-with-use/) — Community workaround attempt

---

*Research completed: 2026-02-07*
*Ready for roadmap: yes*

**Total files to modify:** 3 files
- `_common.scss` — Transform to `@forward` aggregation module
- `_bootstrap-overrides.scss` — Add namespaces to variable references
- `styles.scss` — Maintain hybrid `@import` (Bootstrap) + prepare for `@use` (app modules)

**Component files (16):** No changes needed, already using `@use` correctly

**Success criteria:**
- All component SCSS files use `@use` (already done)
- Zero deprecation warnings from application code
- All 381 Angular unit tests passing
- Zero visual regressions
- Bootstrap warnings accepted as external dependency limitation
