# Domain Pitfalls: Sass @import to @use/@forward Migration

**Domain:** Sass @import to @use/@forward migration in Angular 19.x + Bootstrap 5.3
**Researched:** 2026-02-07
**Confidence:** HIGH (based on official Sass documentation, Angular community issues, Bootstrap compatibility research)

## Critical Pitfalls

Mistakes that cause rewrites, compilation failures, or major regressions.

### Pitfall 1: Bootstrap 5.3 Still Uses @import Internally

**What goes wrong:** Bootstrap 5.3 has not yet migrated to the Sass module system. All Bootstrap SCSS files use `@import` internally. If you migrate your project to `@use` while loading Bootstrap, you'll hit compatibility issues.

**Why it happens:** Bootstrap team is working on module system migration for v6, but v5.x still uses legacy `@import`. The Sass module system and `@import` can technically coexist, but variable configuration becomes problematic.

**Consequences:**
- Cannot use `@use "bootstrap" with ($primary: ...)` syntax for variable overrides
- Must continue using `@import` for Bootstrap loading in global styles
- Mixing `@use` and `@import` for the same library creates namespace confusion

**Prevention:**
- Keep `@import` for Bootstrap loading in `styles.scss` (global stylesheet)
- Use `@use` only for application-specific partials (`_common.scss`, component files)
- Accept that Bootstrap customization must happen via pre-import variable overrides, not `@use with` configuration

**Detection:**
- Compilation errors mentioning "This module and the new module both define a variable"
- Variables not being overridden despite `@use with` configuration
- Undefined mixin errors from Bootstrap when using `@use`

**Roadmap phase:** Phase 1 (Strategy) - This is a foundational architecture decision that affects all subsequent work.

**Sources:**
- [Bootstrap not compatible with Sass modules](https://github.com/orgs/twbs/discussions/41260)
- [Bootstrap v5.3.4 addresses Sass deprecation warnings](https://github.com/orgs/twbs/discussions/41370)
- [@import will remain until October 2026 minimum](https://sass-lang.com/documentation/breaking-changes/import/)

---

### Pitfall 2: Variable Override Timing with `@use with` Configuration

**What goes wrong:** When migrating from `@import`, developers expect to override variables the same way (define variable, then import). With `@use`, variable configuration MUST happen inline: `@use "module" with ($var: value)`. Variables defined before the `@use` statement are ignored.

**Why it happens:** `@import` created a global namespace where variables could be defined anywhere before compilation. `@use` creates module scopes where configuration happens atomically at load time.

**Consequences:**
- Silent failures where variable overrides don't apply
- Variables defined before `@use` statement have no effect
- Custom values don't propagate to the module

**Prevention:**
```scss
// WRONG - variables defined before @use are ignored
$primary: #337BB7;
@use 'bootstrap';  // Still uses Bootstrap's default $primary

// CORRECT - configure at load time
@use 'bootstrap' with (
  $primary: #337BB7,
  $secondary: #79DFB6
);
```

**Exception:** Bootstrap 5.3 doesn't support `@use with` configuration. For Bootstrap specifically, continue using the `@import` pattern:
```scss
// Variables must be defined BEFORE @import (legacy pattern)
$primary: #337BB7;
@import 'bootstrap/scss/functions';
@import 'bootstrap-variables';  // Your overrides
@import 'bootstrap/scss/variables';
```

**Detection:**
- Visual regressions where colors/sizing don't match expected values
- Variables reverting to framework defaults
- Console warnings about undefined variables in calculations

**Roadmap phase:** Phase 2 (Bootstrap Isolation) - When deciding how to handle Bootstrap variable configuration.

**Sources:**
- [Sass @use documentation](https://sass-lang.com/documentation/at-rules/use/)
- [Migration issues with !default variables](https://github.com/sass/sass/issues/3782)
- [Variable override doesn't work with @use](https://github.com/sass/sass/issues/2811)

---

### Pitfall 3: Namespace Conflicts When Mixing @use and @import

**What goes wrong:** A file loaded via `@use` creates a namespaced module. The same file loaded via `@import` creates global members. If both happen in the same compilation, you get duplicate definitions or namespace conflicts.

**Why it happens:** Sass maintains interoperability between module system and legacy `@import`, but the same file can exist in both the global namespace (from `@import`) and a module namespace (from `@use`).

**Consequences:**
- "This module and the new module both define a variable named X" errors
- Ambiguous member references (is it global or namespaced?)
- Compilation failures when Sass can't determine which definition to use

**Prevention:**
- Choose ONE loading mechanism per file: either always `@use` or always `@import`
- For SeedSync: Use `@import` for Bootstrap (necessary), `@use` for app partials
- Never `@use` a file that's also loaded via `@import` elsewhere
- Document in `_common.scss` which loading mechanism each file uses

**Pattern for SeedSync:**
```scss
// styles.scss (global) - uses @import for Bootstrap
@import 'bootstrap/scss/functions';
@import 'app/common/bootstrap-variables';
@import 'bootstrap/scss/variables';

// _common.scss - forwards app variables with @forward
@forward 'bootstrap-variables';  // Make variables available to components

// component.scss - uses @use for app modules
@use '../../common/common' as *;  // Accesses forwarded variables
```

**Detection:**
- Compilation errors with "both define a variable"
- Variables suddenly becoming undefined after adding `@use`
- Mixins or functions not found despite being imported

**Roadmap phase:** Phase 2 (Bootstrap Isolation) and Phase 3 (Common.scss @forward layer).

**Sources:**
- [Sass module system interoperability](https://sass-lang.com/blog/the-module-system-is-launched/)
- [Mixing @use and @import compatibility](https://sass-lang.com/documentation/at-rules/import/)
- [Namespace conflicts discussion](https://github.com/sass/sass/issues/2778)

---

### Pitfall 4: sass-migrator Tool Fails on Third-Party Dependencies

**What goes wrong:** The `sass-migrator` tool (Sass's official migration assistant) crashes or produces broken code when encountering third-party libraries in `node_modules` like Bootstrap or Font Awesome.

**Why it happens:** The migrator can only rewrite files in your project, not dependencies. When it encounters `@import "bootstrap"`, it tries to analyze and migrate Bootstrap's internal files, which fails because:
- Bootstrap uses nested `@import` statements
- Bootstrap functions aren't compatible with module loading
- Migrator can't rewrite files outside the project directory

**Consequences:**
- Automated migration fails completely
- Must manually migrate files one-by-one
- Time-consuming manual work instead of automated tooling

**Prevention:**
- Do NOT run `sass-migrator` with `--migrate-deps` flag
- Migrate only application-specific partials, not global stylesheets that import Bootstrap
- Accept that Bootstrap loading must remain `@import`-based until Bootstrap v6
- Use migrator only for pure application code without third-party imports

**Migration strategy for SeedSync:**
1. Keep `styles.scss` using `@import` (loads Bootstrap)
2. Keep `_common.scss` using `@import` for now (re-exports Bootstrap variables)
3. Migrate component SCSS files from `@import 'common'` to `@use 'common' as *`
4. Do NOT attempt to migrate Bootstrap loading itself

**Detection:**
- `sass-migrator` errors: "Could not find Sass file"
- Errors about nested imports containing functions
- Migrator trying to rewrite files in `node_modules/`

**Roadmap phase:** Phase 4 (Component Migration) - When deciding whether to use automated tooling.

**Sources:**
- [sass-migrator fails on Bootstrap](https://github.com/sass/migrator/issues/215)
- [sass-migrator fails with Angular Material](https://github.com/sass/migrator/issues/266)
- [Nested import function errors](https://github.com/sass/dart-sass/issues/2402)

---

### Pitfall 5: @forward Must Come Before All Other Rules

**What goes wrong:** When converting a file to use `@forward`, placing it anywhere except the very top of the file (before `@use`, before any CSS rules) causes compilation errors.

**Why it happens:** Sass module system has strict ordering requirements:
1. `@forward` rules (make members available to downstream)
2. `@use` rules (load dependencies for this file)
3. Everything else (variables, mixins, CSS rules)

**Consequences:**
- Compilation error: "`@forward` rules must be written before any other rules"
- Cannot interleave `@forward` and `@use` statements
- Cannot conditionally `@forward` based on variables

**Prevention:**
```scss
// CORRECT order in _common.scss
@forward 'bootstrap-variables';  // First: forward to components
@use 'bootstrap-variables' as *; // Second: use for this file
@import 'other-stuff';           // Third: remaining imports

// Variables, mixins, CSS rules come after all @forward/@use/@import
$custom-var: 10px;
```

**Detection:**
- Compilation error explicitly mentioning `@forward` must be first
- Members not being forwarded to downstream files
- "This file doesn't forward any members" errors

**Roadmap phase:** Phase 3 (Common.scss @forward layer).

**Sources:**
- [Sass @forward documentation](https://sass-lang.com/documentation/at-rules/forward/)
- [@forward ordering discussion](https://github.com/sass/sass/issues/2893)
- [@forward specification](https://github.com/sass/sass/blob/main/spec/at-rules/forward.md)

---

## Moderate Pitfalls

Mistakes that cause delays, require workarounds, or create technical debt.

### Pitfall 6: Re-exporting Bootstrap Variables Requires Import-then-Forward Pattern

**What goes wrong:** When trying to make Bootstrap variables available to component files via `@forward`, you discover that `_common.scss` must use `@import 'bootstrap-variables'` (not `@use`) because `_bootstrap-variables.scss` itself imports Bootstrap functions.

**Why it happens:**
- `_bootstrap-variables.scss` uses `@import 'bootstrap/scss/functions'` to access `shade-color()`, `tint-color()` functions
- If `_common.scss` tries to `@use` or `@forward` the variables file, the Bootstrap functions aren't in scope
- The current architecture requires mixing `@import` and `@forward`

**Consequences:**
- Cannot fully migrate `_common.scss` to pure `@use/@forward`
- Must maintain hybrid `@import + @forward` pattern
- More complex mental model for developers

**Prevention:**
- Accept the hybrid pattern for Bootstrap-dependent files
- Document the architecture clearly in `_common.scss`:
  ```scss
  // Bootstrap variables must use @import (they depend on Bootstrap functions)
  @import 'bootstrap-variables';

  // Forward them to components using @forward
  @forward 'bootstrap-variables';  // Make available to @use 'common'
  ```
- Consider this temporary until Bootstrap v6 migration

**Alternative (requires refactoring):**
- Move Bootstrap function loading into `_bootstrap-variables.scss` using `@use`
- Configure Bootstrap variables using `@use with` (blocked by Bootstrap 5.3 compatibility)
- Not viable until Bootstrap supports module system

**Detection:**
- Compilation errors about undefined functions (`shade-color`, `tint-color`)
- Variables becoming undefined when switching from `@import` to `@use`

**Roadmap phase:** Phase 3 (Common.scss @forward layer).

**Sources:**
- [Bootstrap uses @import internally](https://getbootstrap.com/docs/5.3/customize/sass/)
- [@forward with configuration](https://github.com/sass/sass/issues/2744)

---

### Pitfall 7: @use as * Wildcard Defeats Namespace Benefits

**What goes wrong:** When migrating component files, developers use `@use '../../common/common' as *` (wildcard) to avoid updating all variable references. This removes the safety benefits of the module system.

**Why it happens:**
- Updating `$primary-color` to `common.$primary-color` everywhere is tedious
- Wildcard syntax makes migration faster
- Looks like a transparent migration path

**Consequences:**
- Loses namespace protection (the main benefit of `@use`)
- Name collisions become possible again
- Harder to track where members come from
- Defeats the purpose of migrating away from `@import`'s global scope

**Prevention:**
- Accept the wildcard for SeedSync's migration (pragmatic choice for large codebase)
- Document that this is a "minimum viable migration" to eliminate deprecation warnings
- Consider future refactoring to use namespaces: `common.$primary-color`
- Alternatively, use a short namespace: `@use 'common' as c` → `c.$primary-color`

**Best practice (if you have time):**
```scss
// Better: use explicit namespace
@use '../../common/common' as common;

.file.selected {
  background-color: common.$secondary-color;
}
```

**Pragmatic choice for large migration:**
```scss
// Acceptable: wildcard for faster migration
@use '../../common/common' as *;

.file.selected {
  background-color: $secondary-color;  // No namespace needed
}
```

**Detection:**
- No compilation errors (wildcard works fine)
- Code review: seeing `as *` everywhere
- Linter warnings about name collisions (if configured)

**Roadmap phase:** Phase 4 (Component Migration) - When converting component files.

**Sources:**
- [Sass @use wildcard namespace](https://sass-lang.com/documentation/at-rules/use/)
- [Wildcard namespace discussion](https://github.com/sass/sass/issues/2625)
- [Module system best practices](https://sass-lang.com/blog/the-module-system-is-launched/)

---

### Pitfall 8: Font Awesome Version Compatibility with Module System

**What goes wrong:** Older versions of Font Awesome (version 4.x) use `@import` internally and don't support the Sass module system. Version 7+ supports `@use/@forward`.

**Why it happens:** Font Awesome 4.x was released before the Sass module system existed. The library was refactored for v7 to support modules.

**Consequences:**
- If using Font Awesome 4.x, cannot migrate Font Awesome loading to `@use`
- Must check Font Awesome version before attempting migration
- May need to upgrade Font Awesome as part of Sass migration

**Prevention:**
- Check `package.json` to determine Font Awesome version
- For Font Awesome 4.x/5.x: Keep using `@import` (like Bootstrap)
- For Font Awesome 6+/7+: Can use `@use '@fortawesome/fontawesome-free/scss/fontawesome'`

**SeedSync-specific:**
- Project uses `font-awesome` package (version 4.x based on node_modules structure)
- Keep Font Awesome loading via `@import` in `styles.scss`
- Do NOT attempt to migrate Font Awesome to `@use` in this milestone

**Detection:**
- Check `package.json` for `font-awesome` vs `@fortawesome/fontawesome-free`
- Compilation errors when trying to `@use` Font Awesome 4.x
- Undefined mixin errors from Font Awesome

**Roadmap phase:** Phase 1 (Strategy) - When cataloging third-party dependencies.

**Sources:**
- [Font Awesome v7 @use support](https://fontawesome.com/docs/web/use-with/scss)
- [Font Awesome v7 upgrade guide](https://docs.fontawesome.com/upgrade/scss/)
- [Font Awesome GitHub @use issues](https://github.com/FortAwesome/font-awesome-sass/issues/195)

---

### Pitfall 9: Suppressing Deprecation Warnings Hides Real Issues

**What goes wrong:** Angular 19+ allows silencing Sass deprecation warnings via `angular.json` configuration. Developers silence ALL warnings, including ones from their own code.

**Why it happens:**
- Bootstrap and Font Awesome emit hundreds of deprecation warnings
- Warnings pollute build output, making real issues hard to see
- `silenceDeprecations: ["import"]` seems like an easy fix

**Consequences:**
- Hides deprecation warnings from application code that should be migrated
- Makes it impossible to track migration progress
- When Dart Sass 3.0 removes `@import`, compilation fails with no warning history

**Prevention:**
- Silence deprecations selectively: only for third-party libraries
- Use Sass's `@import` suppression API to silence specific files:
  ```scss
  // Silence Bootstrap deprecations only
  @import 'bootstrap' with ($silence-deprecation-warnings: ("import"));
  ```
- Keep warnings enabled for application code to track migration progress
- Document which files are silenced and why

**Alternative approach:**
- Accept the deprecation warnings during migration
- Use them as a checklist: warnings disappear as you migrate files
- Silence warnings only AFTER migration is complete

**Detection:**
- Zero deprecation warnings despite using `@import` everywhere
- Warnings suddenly appearing when `silenceDeprecations` config is removed
- Unexpected compilation failures when upgrading Sass

**Roadmap phase:** Phase 1 (Strategy) - When deciding how to handle deprecation warnings.

**Sources:**
- [Angular 19 Sass deprecation warnings](https://coreui.io/blog/angular-19-sass-deprecation-warnings/)
- [Angular CLI silence deprecations](https://www.angulararchitects.io/blog/how-to-disable-the-angular-v19s-sass-compiler-deprecation-warnings/)
- [Sass deprecation timeline](https://sass-lang.com/documentation/breaking-changes/import/)

---

### Pitfall 10: Circular Dependencies from @forward Chains

**What goes wrong:** When using `@forward` to create re-export chains (A forwards B, B forwards C, C forwards A), Sass encounters circular dependencies and compilation fails.

**Why it happens:**
- `@forward` loads the module to determine what to forward
- If that module also forwards back to the original file, infinite loop
- More subtle when chains go through multiple files

**Consequences:**
- Compilation error: "This file is a circular dependency of itself"
- Hard to debug when chain is long (A → B → C → D → A)
- May not be obvious which file introduced the cycle

**Prevention:**
- Keep `@forward` chains unidirectional: always flow downstream
- Use a "barrel file" pattern: one central file forwards many modules, but those modules never forward back
- Document dependency direction in file comments

**SeedSync architecture (avoids this):**
```
styles.scss (global)
  ↓ @import
_common.scss (barrel/bridge file)
  ↓ @forward (one-way: makes variables available downstream)
component.scss (leaf files)
  ↓ @use (consumes forwarded members)
```

**Detection:**
- Explicit compilation error: "circular dependency"
- Sass indicates which files are in the cycle
- Build hangs or times out (rare)

**Roadmap phase:** Phase 3 (Common.scss @forward layer).

**Sources:**
- [Sass @forward documentation](https://sass-lang.com/documentation/at-rules/forward/)
- [Circular dependency plugin error](https://github.com/aackerman/circular-dependency-plugin/issues/55)
- [@use/@forward ordering](https://github.com/sass/dart-sass/issues/1027)

---

## Minor Pitfalls

Mistakes that cause annoyance or temporary confusion but are easily fixed.

### Pitfall 11: @use Requires Top-Level Placement (No Nested Imports)

**What goes wrong:** Developers try to use `@use` inside a selector, mixin, or conditional block. Sass requires `@use` at the file's top level.

**Why it happens:** With `@import`, you could nest imports inside selectors or conditions. `@use` loads modules once globally per file.

**Consequences:**
- Compilation error: "`@use` rules must be written before any other rules"
- Cannot conditionally load modules based on variables
- Cannot scope modules to specific selectors

**Prevention:**
```scss
// WRONG - @use cannot be nested
.component {
  @use 'common';  // ERROR
}

// CORRECT - @use at top level
@use 'common';

.component {
  // use members from common module
}
```

**Detection:**
- Explicit compilation error
- Easy to fix: move `@use` to top of file

**Roadmap phase:** Phase 4 (Component Migration).

**Sources:**
- [Sass @use documentation](https://sass-lang.com/documentation/at-rules/use/)
- [Nested @use discussion](https://github.com/sass/sass/issues/2858)

---

### Pitfall 12: Path Resolution Changes with @use

**What goes wrong:** Paths in `@use` are resolved relative to the current file, but developers might expect them to resolve relative to the project root (like some build tools).

**Why it happens:** Sass always resolves paths relative to the importing file, but developers coming from other ecosystems may expect different behavior.

**Consequences:**
- `@use 'common'` fails with "file not found"
- Must use relative paths: `@use '../../common/common'`
- Path depth depends on file location

**Prevention:**
- Always use relative paths with `@use`: `../../common/common`
- Or configure Sass `includePaths` in `angular.json` to add search paths
- Document path conventions in project README

**SeedSync pattern:**
```scss
// Component at src/app/pages/files/file.component.scss
@use '../../common/common' as *;  // Navigate up to app/, then into common/
```

**Detection:**
- "File not found" errors when using simple names
- Works when using full relative paths

**Roadmap phase:** Phase 4 (Component Migration).

**Sources:**
- [Sass module resolution](https://sass-lang.com/documentation/at-rules/use/)
- [Sass includePaths configuration](https://sass-lang.com/documentation/cli/dart-sass/)

---

### Pitfall 13: Build Performance Impact (Positive)

**What goes wrong:** This is actually a positive "pitfall" - developers don't realize that migrating to `@use` will improve build performance.

**Why it happens:** `@import` compiles the same file every time it's imported. `@use` compiles each file once and caches it.

**Consequences:**
- Faster incremental builds
- Reduced memory usage during compilation
- Smaller output CSS (duplicate code eliminated)

**Measurement opportunity:**
- Record build time before migration: `ng build --configuration production`
- Record build time after migration
- Document improvement in migration report

**Expected improvement:**
- 10-30% faster compilation for projects with many components
- More noticeable with larger dependency trees

**Detection:**
- No negative detection - this is a benefit
- Monitor build times to verify improvement

**Roadmap phase:** Phase 6 (Validation) - When measuring impact.

**Sources:**
- [Sass module system performance benefits](https://sass-lang.com/blog/the-module-system-is-launched/)
- [@use vs @import performance](https://medium.com/@philip.mutua/difference-between-use-and-import-in-scss-1cb6f501e649)
- [Angular compilation performance](https://coryrylan.com/blog/sass-and-css-import-performance-in-angular)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Phase 1: Strategy & Inventory | Assuming all third-party libraries can migrate to @use | Survey Bootstrap, Font-Awesome versions before planning. Accept @import for libraries not supporting modules. |
| Phase 2: Bootstrap Isolation | Trying to migrate Bootstrap to @use | Keep Bootstrap loading via @import in styles.scss. Bootstrap 5.3 requires legacy loading. |
| Phase 3: Common.scss @forward | Incorrect @forward ordering | Place all @forward statements at top of file, before @use and variables. |
| Phase 4: Component Migration | Using @use without relative paths | Always use relative paths: `@use '../../common/common'`. Document conventions. |
| Phase 4: Component Migration | Attempting to automate with sass-migrator | Do NOT use sass-migrator on files importing Bootstrap. Manual migration only. |
| Phase 5: Visual Regression Testing | Missing subtle color/spacing changes from variable scoping | Compare screenshots before/after. Test all pages, all states. |
| Phase 6: Deprecation Warning Suppression | Silencing all deprecations too early | Only silence third-party deprecations. Keep app warnings visible until migration complete. |
| Phase 7: Performance Validation | Not measuring build time improvement | Record build time before/after to demonstrate migration value. |

---

## SeedSync-Specific Context

### Current Architecture (v1.3)

```
styles.scss (global entry point)
  └─ @import 'bootstrap/scss/...'  [KEEP @import - Bootstrap 5.3 uses legacy system]
  └─ @import 'app/common/bootstrap-variables'
  └─ @import 'app/common/common'

_bootstrap-variables.scss
  └─ Variable overrides ($primary, $secondary, etc.)
  └─ Uses Bootstrap functions (shade-color, tint-color)

_common.scss (bridge file)
  └─ @import 'bootstrap-variables'
  └─ Re-exports Bootstrap variables for component access
  └─ Defines layout variables ($sidebar-width, z-indexes)

component.scss (many files)
  └─ Currently: no imports (relies on global scope from styles.scss via Angular)
  └─ v1.4 target: @use '../../common/common' as *
```

### Migration Constraints

1. **Bootstrap 5.3 limitation:** Cannot use `@use "bootstrap" with (...)` configuration
2. **Font Awesome 4.x limitation:** Cannot migrate Font Awesome to `@use`
3. **Zero visual regression requirement:** Must maintain identical rendered output
4. **Angular component scoping:** Component SCSS is scoped by Angular; global styles are not re-imported per component

### Key Decision Implications

From PROJECT.md:
- "Keep @import for Bootstrap SCSS - Mixing @use/@import creates namespace conflicts" (v1.0 decision)
- This decision is being REVISITED for v1.4 to migrate app code to `@use` while keeping Bootstrap on `@import`

### Success Criteria

- All component SCSS files use `@use` instead of relying on global scope
- Zero deprecation warnings from application code
- Bootstrap/Font-Awesome warnings silenced (they're using @import, out of our control)
- All 381 Angular unit tests passing
- Visual QA shows zero regressions

---

## Research Confidence Assessment

| Pitfall Category | Confidence | Source Quality |
|------------------|------------|----------------|
| Bootstrap 5.3 compatibility | HIGH | Official GitHub discussions, Bootstrap docs |
| @use variable configuration | HIGH | Official Sass docs, GitHub issues |
| Namespace conflicts | HIGH | Sass blog, specification |
| sass-migrator limitations | HIGH | sass/migrator GitHub issues |
| @forward ordering | HIGH | Sass specification, official docs |
| Bootstrap variable re-export | MEDIUM | Community patterns, inferred from Bootstrap architecture |
| Wildcard namespace impact | HIGH | Sass documentation |
| Font Awesome compatibility | HIGH | Font Awesome official docs |
| Deprecation warning suppression | HIGH | Angular CLI docs, Sass docs |
| Circular dependencies | HIGH | Sass docs, GitHub issues |
| Nested @use restriction | HIGH | Sass specification |
| Path resolution | HIGH | Sass documentation |
| Performance impact | MEDIUM | Community blog posts, Sass team statements |

**Overall confidence:** HIGH - All critical pitfalls verified with official documentation or authoritative GitHub issue discussions.

---

## Sources

### Official Documentation
- [Sass @use documentation](https://sass-lang.com/documentation/at-rules/use/)
- [Sass @forward documentation](https://sass-lang.com/documentation/at-rules/forward/)
- [Sass @import deprecation timeline](https://sass-lang.com/documentation/breaking-changes/import/)
- [Sass module system announcement](https://sass-lang.com/blog/the-module-system-is-launched/)
- [Bootstrap 5.3 Sass documentation](https://getbootstrap.com/docs/5.3/customize/sass/)
- [Font Awesome v7 @use support](https://fontawesome.com/docs/web/use-with/scss)

### GitHub Discussions (HIGH confidence)
- [Bootstrap not compatible with Sass modules - Discussion #41260](https://github.com/orgs/twbs/discussions/41260)
- [Bootstrap April 2025 update roadmap - Discussion #41370](https://github.com/orgs/twbs/discussions/41370)
- [Migration from @import to @use impossible with !default - Issue #3782](https://github.com/sass/sass/issues/3782)
- [Overriding variables through nested @use not possible - Issue #2811](https://github.com/sass/sass/issues/2811)
- [sass-migrator fails on Bootstrap files - Issue #215](https://github.com/sass/migrator/issues/215)
- [sass-migrator fails with Angular Material - Issue #266](https://github.com/sass/migrator/issues/266)
- [Font Awesome @use issues - Issue #195](https://github.com/FortAwesome/font-awesome-sass/issues/195)
- [@forward ordering restrictions - Issue #2893](https://github.com/sass/sass/issues/2893)
- [Namespace conflicts - Issue #2778](https://github.com/sass/sass/issues/2778)
- [Wildcard namespace syntax - Issue #2625](https://github.com/sass/sass/issues/2625)
- [Angular 19 Sass warnings - Issue #4809](https://github.com/ng-bootstrap/ng-bootstrap/issues/4809)

### Community Resources (MEDIUM confidence)
- [Angular 19 Sass deprecation warnings guide - CoreUI](https://coreui.io/blog/angular-19-sass-deprecation-warnings/)
- [Disabling Angular v19 Sass warnings - ANGULARarchitects](https://www.angulararchitects.io/blog/how-to-disable-the-angular-v19s-sass-compiler-deprecation-warnings/)
- [Sass import performance in Angular - Cory Rylan](https://coryrylan.com/blog/sass-and-css-import-performance-in-angular)
- [Difference between @use and @import - Medium](https://medium.com/@philip.mutua/difference-between-use-and-import-in-scss-1cb6f501e649)
- [Structure Angular SCSS - Medium](https://medium.com/@sehban.alam/structure-your-angular-scss-like-a-pro-best-practices-real-world-examples-8da57386afdd)
- [Migrating @import to @use - Medium](https://norato-felipe.medium.com/migrating-from-import-to-use-and-forward-in-sass-175b3a8a6221)

### Web Search Verification
All pitfalls cross-referenced with 2026-dated search results to verify current status and recommendations.
