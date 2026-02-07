# Feature Landscape: Sass @use/@forward Migration

**Domain:** Sass module system migration (@import to @use/@forward)
**Project Context:** Angular 19.x with Bootstrap 5.3 SCSS
**Researched:** 2026-02-07

## Table Stakes

Features required for a complete @use/@forward migration. Missing = migration incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Global styles.scss uses @use | Entry point must use module system | **Medium** | Bootstrap doesn't support @use yet; workaround needed |
| Component SCSS uses @use | All @import statements must be replaced | **Low** | Standard namespace pattern `@use '../../common/common' as *` |
| Namespace management | Prevent naming collisions | **Low** | Use `as *` for convenience or explicit namespaces |
| Variable access with @use | Access Bootstrap/custom variables | **Medium** | Requires @forward aggregation pattern |
| Bootstrap variable overrides | Customize theme colors | **High** | Bootstrap's lack of @use support complicates this |
| No visual regressions | Identical CSS output | **High** | Critical constraint; requires careful testing |
| Zero Sass warnings | Clean build output | **Low** | Primary goal: eliminate @import deprecation warnings |
| Backward-compatible structure | Existing architecture preserved | **Medium** | Don't break component import patterns |

## Differentiators

Features that improve code quality beyond basic migration. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Index files for aggregation | Clean `@use 'common'` instead of deep paths | **Low** | Use `_index.scss` with @forward rules |
| Private member prefixes | Clear API boundaries with `_` or `-` prefix | **Low** | Hide internal-only variables/mixins |
| Explicit namespaces | Self-documenting imports like `@use 'colors' as c` | **Low** | Alternative to `as *` for clarity |
| Scoped Bootstrap imports | Only import needed Bootstrap components | **Medium** | Reduces compiled CSS size |
| Prefixed forwards | Namespace collision prevention with `as prefix-*` | **Low** | Useful for large module sets |
| Show/hide forwarding control | Explicit API surface with `show` or `hide` | **Low** | Fine-grained control over exposed members |
| Configuration cascade | Override variables at multiple levels | **High** | Would enable better theming patterns |

## Anti-Features

Features to explicitly NOT build during migration. Common mistakes in Sass migrations.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Mix @import and @use in same file | Creates namespace conflicts and unpredictable behavior | Migrate file completely to @use or leave as @import |
| Global namespace pollution | Defeats purpose of module system | Use namespaces (even `as *` is scoped to file) |
| Deep-copy Bootstrap internals | Maintenance nightmare when Bootstrap updates | Use @forward to re-export, not duplicate |
| Premature optimization | Over-engineering the module structure | Start simple, refactor if needed |
| Silent failures | Hiding broken imports/references | Let build fail, fix issues explicitly |
| Automated migration without testing | Tools can't catch Bootstrap incompatibility | Manual verification after any automation |
| Adding `!default` everywhere | Breaks existing variable precedence | Only add where configuration is intentional |
| Using `includePaths` with @use | Not recommended by Sass team | Use relative or package-based URLs |

## Feature Dependencies

```
Migration sequence (order matters):

1. Bootstrap handling strategy
   ↓
2. Variable forwarding pattern (_common.scss becomes aggregator)
   ↓
3. Component file migration (@use instead of @import)
   ↓
4. Verification (visual + tests)
```

### Critical Path: Bootstrap Compatibility

**The Problem:** Bootstrap 5.3 does not support Sass @use/@forward (see [GitHub discussion](https://github.com/orgs/twbs/discussions/41260)).

**Impact:** Cannot use `@use 'bootstrap' with ($primary: #337BB7)` pattern.

**Workaround Options:**

1. **Keep @import for Bootstrap** (simplest, used by many projects)
   - `styles.scss` continues using @import for Bootstrap
   - Component files use @use for custom modules only
   - Acceptable tradeoff: Bootstrap warnings remain, custom code is clean

2. **Migrate to CoreUI Bootstrap fork** (complete solution, high risk)
   - CoreUI maintains a Bootstrap fork with @use support
   - Requires dependency change and testing
   - Risk: fork may lag behind Bootstrap releases

3. **Manual Bootstrap @use wrapper** (complex, fragile)
   - Wrap Bootstrap imports in custom module with @forward
   - Attempt to expose variables for configuration
   - High risk of breaking on Bootstrap updates

**Recommendation:** Option 1 (keep Bootstrap on @import, migrate custom code to @use). This is the pragmatic approach used by the community until Bootstrap officially supports @use.

## Current Project Patterns

**Existing structure:**
```
styles.scss (global)
  ├─ @import 'bootstrap' (functions, variables, components)
  └─ @import 'app/common/common'

_common.scss (aggregator)
  ├─ @import 'bootstrap-variables'
  └─ Re-exports Bootstrap variables for component access

component.scss
  └─ @import '../../common/common' (accesses Bootstrap + custom variables)
```

**Target structure (hybrid approach):**
```
styles.scss (global)
  ├─ @import 'bootstrap' (KEPT as @import - no Bootstrap @use support)
  └─ @use 'app/common' as *

_common/_index.scss (aggregator)
  ├─ @forward 'bootstrap-variables'
  ├─ @forward 'app-variables'
  └─ @forward 'mixins' (if any)

component.scss
  └─ @use '../../common' as * (namespace-free for convenience)
```

**Key insight:** Hybrid approach is acceptable. Global `styles.scss` can use @import for Bootstrap while component files use @use for custom modules. This eliminates custom code deprecation warnings while accepting Bootstrap's @import warnings as external dependency noise.

## MVP Recommendation

For this migration, prioritize:

1. **Migrate component SCSS files to @use** - Eliminates custom code warnings
2. **Convert _common.scss to @forward aggregator** - Maintains variable access pattern
3. **Keep Bootstrap on @import** - Accepts external library limitations
4. **Verify zero visual regressions** - Critical success criteria

Defer to post-migration (if needed):
- Index files for deeply nested modules - Current structure is shallow enough
- Private member prefixes - No large shared module library yet
- Explicit namespaces - `as *` is fine for small module count
- Scoped Bootstrap imports - Optimization, not required

## Migration Complexity Assessment

| Area | Complexity | Reason |
|------|------------|--------|
| Component files | **Low** | Simple pattern: `@import 'common'` → `@use 'common' as *` |
| _common.scss aggregator | **Medium** | Convert @import to @forward, test variable access |
| Bootstrap integration | **High** | No official @use support; requires workaround |
| Variable overrides | **Medium** | Need to preserve existing customization via pre-import pattern |
| Visual verification | **Medium** | Compare before/after screenshots, run tests |

## Expected Outcomes

**Success criteria:**
- ✓ All component SCSS files use @use (no @import in custom code)
- ✓ Build output shows zero @import warnings from custom code
- ✓ All 381+ unit tests continue passing
- ✓ Visual comparison shows zero regressions
- ✓ Bootstrap customization continues working (theme colors, etc.)

**Acceptable tradeoffs:**
- ⚠️ Bootstrap @import warnings remain (external dependency limitation)
- ⚠️ Hybrid @import/@use approach in styles.scss (industry standard workaround)

**Not acceptable:**
- ✗ Visual regressions (colors, spacing, layout changes)
- ✗ Broken variable access in components
- ✗ Test failures
- ✗ New warnings from custom code

## Sources

Research based on:
- [Sass official @use documentation](https://sass-lang.com/documentation/at-rules/use/)
- [Sass official @forward documentation](https://sass-lang.com/documentation/at-rules/forward/)
- [Sass @import deprecation announcement](https://sass-lang.com/blog/import-is-deprecated/)
- [Bootstrap 5.3 Sass customization docs](https://getbootstrap.com/docs/5.3/customize/sass/)
- [GitHub: Bootstrap @use compatibility discussion](https://github.com/orgs/twbs/discussions/41260)
- [Using index files with Sass @use rules](https://tannerdolby.com/writing/using-index-files-in-sass/)
- [Migrating from @import to @use and @forward](https://norato-felipe.medium.com/migrating-from-import-to-use-and-forward-in-sass-175b3a8a6221)
- [Sass modules primer (OddBird)](https://www.oddbird.net/2019/10/02/sass-modules/)
- [Stop using @import: Dart Sass 3.0 migration guide](https://dev.to/quesby/stop-using-import-how-to-prepare-for-dart-sass-30-full-migration-guide-1agh)
- [Bootstrap 5.3.8 with @use workaround](https://timdows.com/blogs/bootstrap-5-3-8-with-use/)

**Confidence level:** HIGH - Patterns are well-documented, Bootstrap limitation is confirmed by official sources, hybrid approach is industry standard workaround.
