# Phase 21: Test Runner Cleanup - Research

**Researched:** 2026-02-09
**Domain:** pytest configuration, warning suppression, Docker test environments
**Confidence:** HIGH

## Summary

The SeedSync Python test runner produces two categories of noise warnings: (1) pytest cache warnings caused by a read-only Docker volume mount preventing `.pytest_cache` creation, and (2) `DeprecationWarning` messages from the `cgi` module (deprecated in Python 3.11) triggered by both `webob` (via webtest) and `bottle` importing `cgi`.

Both issues are well-understood and have standard solutions within pytest's `filterwarnings` and `cache_dir` configuration options in `pyproject.toml`. The fix requires only additions to the existing `[tool.pytest.ini_options]` section -- no Dockerfile changes, no compose changes, no code changes.

**Primary recommendation:** Add `cache_dir` to redirect pytest cache to a writable `/tmp` path (eliminates cache warnings at the root cause), and add `filterwarnings` entries to suppress the `cgi` module `DeprecationWarning` from webob and bottle.

## Standard Stack

### Core (already in use)
| Library | Version | Purpose | Relevance |
|---------|---------|---------|-----------|
| pytest | ^7.4.4 | Test runner | Owns `filterwarnings` and `cache_dir` config |
| webtest | ^3.0.7 | HTTP testing | Depends on webob which triggers cgi warning |
| bottle | ^0.13.4 | Web framework | Directly imports cgi module |
| paste | ^3.10.1 | WSGI utilities | Depends on webob |

### Key Dependencies (transitive)
| Library | Version | Purpose | Warning Source |
|---------|---------|---------|---------------|
| webob | 1.8.9 | HTTP request/response objects | Imports `cgi.parse_header` and `cgi.FieldStorage` in `webob/compat.py` |

**No new libraries needed.** All changes are configuration-only.

## Architecture Patterns

### Recommended Configuration Structure

The entire fix lives in `src/python/pyproject.toml`:

```toml
[tool.pytest.ini_options]
pythonpath = ["."]
timeout = 60
cache_dir = "/tmp/.pytest_cache"
filterwarnings = [
    "ignore:'cgi' is deprecated:DeprecationWarning",
]
```

### Pattern: Root-Cause Elimination Over Warning Suppression

For the cache issue, redirecting `cache_dir` to a writable path is preferred over suppressing `PytestCacheWarning` via `filterwarnings`. This eliminates the root cause (can't write to read-only filesystem) rather than hiding the symptom.

For the cgi deprecation, `filterwarnings` is the only appropriate mechanism since the warning originates in third-party code (webob, bottle) that the project does not control.

### Anti-Patterns to Avoid
- **Global warning suppression via `--disable-warnings`**: Hides ALL warnings including meaningful ones from test code
- **Using `-W` flags in Dockerfile CMD**: Bypasses pyproject.toml, not portable to local development
- **Using `addopts = "-p no:cacheprovider"`**: Disables the entire cache plugin, which also disables `--lf` (last-failed) and `--ff` (failed-first) functionality
- **Filtering by module name (`ignore::DeprecationWarning:cgi`)**: While valid, filtering by message text is more precise and self-documenting

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cache write failures | Custom cache cleanup scripts | `cache_dir = "/tmp/.pytest_cache"` | Built-in pytest config, zero code |
| cgi deprecation noise | conftest.py warning filters | `filterwarnings` in pyproject.toml | Centralized config, no code files to maintain |
| Warning suppression | PYTHONWARNINGS env var in Docker | pytest `filterwarnings` config | Portable across Docker and local runs |

## Common Pitfalls

### Pitfall 1: PytestCacheWarning Cannot Be Filtered in Older pytest
**What goes wrong:** In pytest versions before the fix for issue #6681 (merged via PR #7700), `PytestCacheWarning` was emitted via `_issue_warning_captured` which bypassed Python's `warnings` module, making `filterwarnings` ineffective.
**Why it happens:** The cache plugin initialized before the warnings plugin could apply filters.
**How to avoid:** Use `cache_dir` redirection instead of `filterwarnings` for cache issues. This approach works regardless of pytest version.
**Warning signs:** `PytestCacheWarning` still appears despite `filterwarnings` entry. This was fixed in pytest 7.x but `cache_dir` is more robust.

### Pitfall 2: Overly Broad DeprecationWarning Suppression
**What goes wrong:** Using `"ignore::DeprecationWarning"` (without message filter) hides ALL deprecation warnings, including ones from the project's own code or meaningful warnings from other dependencies.
**Why it happens:** Developer wants to quickly silence all noise.
**How to avoid:** Always scope the filter to the specific warning message: `"ignore:'cgi' is deprecated:DeprecationWarning"`.
**Warning signs:** New deprecation warnings from project code go unnoticed.

### Pitfall 3: Filter Order Matters
**What goes wrong:** Placing `"error"` after `"ignore"` entries converts previously-ignored warnings back to errors.
**Why it happens:** pytest processes filterwarnings list and the last matching entry wins.
**How to avoid:** Put broad rules first (like `"error"`) and specific exceptions after.
**Warning signs:** Warnings that should be ignored cause test failures.

### Pitfall 4: cache_dir Path Must Be Writable in Docker
**What goes wrong:** Setting `cache_dir` to a path inside the read-only mount still fails.
**Why it happens:** The container mounts `src/python` as `/src` read-only. Any path under `/src/` is unwritable.
**How to avoid:** Use `/tmp/.pytest_cache` which is always writable in Docker containers.
**Warning signs:** Same cache warnings appear after config change.

### Pitfall 5: Multiple Sources of the Same Warning
**What goes wrong:** Filtering webob's cgi warning but not bottle's (or vice versa), leaving residual noise.
**Why it happens:** Both webob (via `webob/compat.py`) and bottle (via `bottle.py` line 72) independently import the `cgi` module.
**How to avoid:** Use message-based filtering (`"ignore:'cgi' is deprecated:DeprecationWarning"`) which catches ALL sources of this specific warning regardless of which module triggers it.
**Warning signs:** Some cgi warnings disappear but others remain.

## Code Examples

### The Complete Fix (verified pattern)

```toml
# src/python/pyproject.toml
[tool.pytest.ini_options]
pythonpath = ["."]
timeout = 60
cache_dir = "/tmp/.pytest_cache"
filterwarnings = [
    # webob and bottle both import the deprecated cgi module (Python 3.11+)
    "ignore:'cgi' is deprecated:DeprecationWarning",
]
```

Source: [pytest filterwarnings docs](https://docs.pytest.org/en/stable/how-to/capture-warnings.html), [Python warnings filter format](https://docs.python.org/3/library/warnings.html#the-warnings-filter)

### Filter Format Explanation

The pytest `filterwarnings` format follows Python's warning filter specification:

```
action:message:category:module:line
```

| Field | Value in our case | Meaning |
|-------|-------------------|---------|
| action | `ignore` | Suppress the warning entirely |
| message | `'cgi' is deprecated` | Regex matching the start of the warning message |
| category | `DeprecationWarning` | The warning class |
| module | (empty) | Match any module -- catches both webob and bottle |
| line | (empty) | Match any line number |

### Alternative: Filtering by Module Name

If more granular control is needed, module-based filters can target specific sources:

```toml
filterwarnings = [
    "ignore::DeprecationWarning:cgi",
    "ignore::DeprecationWarning:bottle",
]
```

However, message-based filtering is preferred because:
1. It is self-documenting (the message explains what is being suppressed)
2. It catches ALL sources of the cgi deprecation in one rule
3. It won't accidentally suppress unrelated DeprecationWarnings from those modules

### Alternative: Using addopts for Cache (NOT recommended)

```toml
# NOT recommended -- disables --lf and --ff
[tool.pytest.ini_options]
addopts = "-p no:cacheprovider"
```

This disables the entire cache plugin. While `--lf`/`--ff` cannot persist across Docker runs anyway (read-only volume), disabling the plugin is heavier-handed than redirecting `cache_dir`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `pytest.ini` filterwarnings | `pyproject.toml` filterwarnings | pytest 6.0+ | Single config file for all Python tooling |
| `-p no:cacheprovider` | `cache_dir = "/tmp/..."` | Available since pytest 3.x | Keeps cache plugin active, just redirects storage |
| `_issue_warning_captured` (internal) | `warnings.warn()` for PytestCacheWarning | pytest 7.x (PR #7700) | filterwarnings now works for cache warnings |

**Deprecated/outdated:**
- `pytest.ini` format: Still works but `pyproject.toml` is the modern standard
- `setup.cfg [tool:pytest]`: Superseded by `pyproject.toml`

## Warning Details

### Warning 1: Pytest Cache Warning

**Source:** pytest cacheprovider plugin (`_pytest/cacheprovider.py`)
**Category:** `pytest.PytestCacheWarning`
**Trigger:** Docker volume mount is `read_only: true` in `compose.yml`, preventing `.pytest_cache` directory creation under `/src/`
**Exact message pattern:** `"could not create cache path /src/.pytest_cache/v/cache/nodeids: ..."` (OSError details follow)
**Solution:** `cache_dir = "/tmp/.pytest_cache"` -- redirects cache writes to writable `/tmp`

### Warning 2: CGI Module Deprecation

**Source:** Python 3.11 standard library deprecation (PEP 594)
**Category:** `DeprecationWarning`
**Trigger:** `import cgi` in `webob/compat.py` (line 3-4) and `bottle.py` (line 72)
**Exact message:** `'cgi' is deprecated and slated for removal in Python 3.13`
**Solution:** `filterwarnings = ["ignore:'cgi' is deprecated:DeprecationWarning"]`

**Note:** webob 1.8.9 (current in project) added `legacy-cgi` as a dependency for Python 3.13 compatibility, but does NOT suppress the DeprecationWarning on Python 3.11/3.12. The project uses Python 3.11-slim as its Docker base image.

## Open Questions

1. **Exact warning count per test run**
   - What we know: Cache warnings appear in the pytest header/summary, cgi warnings appear per-import
   - What's unclear: Whether there are exactly 1 or multiple cache warnings per run, and how many cgi warnings appear
   - Recommendation: Run the tests once to see exact output, then verify they disappear after the fix. The fix handles all instances regardless of count.

2. **Paste library cgi usage**
   - What we know: Paste depends on webob. Webob imports cgi.
   - What's unclear: Whether paste itself also directly imports cgi (independent of webob)
   - Recommendation: The message-based filter catches ALL cgi deprecation warnings regardless of source, so this does not affect the fix.

## Sources

### Primary (HIGH confidence)
- [pytest filterwarnings documentation](https://docs.pytest.org/en/stable/how-to/capture-warnings.html) - filter syntax and pyproject.toml format
- [Python warnings filter documentation](https://docs.python.org/3/library/warnings.html#the-warnings-filter) - action:message:category:module:line format
- [pytest cacheprovider source](https://docs.pytest.org/en/stable/_modules/_pytest/cacheprovider.html) - confirmed PytestCacheWarning class and "could not create cache path" message
- [pytest issue #6681](https://github.com/pytest-dev/pytest/issues/6681) - confirmed PytestCacheWarning now filterable via standard mechanism (fixed in PR #7700)

### Secondary (MEDIUM confidence)
- [webob issue #437](https://github.com/Pylons/webob/issues/437) - confirmed cgi import in webob/compat.py, no fix for DeprecationWarning
- [bottle issue #1403](https://github.com/bottlepy/bottle/issues/1403) - confirmed cgi import in bottle.py line 72
- [WebOb on PyPI](https://pypi.org/project/WebOb/) - confirmed 1.8.9 adds legacy-cgi for Python 3.13 only
- [pytest issue #3557](https://github.com/pytest-dev/pytest/issues/3557) - read-only filesystem cache behavior

### Tertiary (LOW confidence)
- None. All findings verified through primary or secondary sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - using only existing dependencies, no new libraries
- Architecture: HIGH - standard pytest configuration patterns, verified with official docs
- Pitfalls: HIGH - confirmed through issue trackers and source code review

**Research date:** 2026-02-09
**Valid until:** 2026-06-09 (stable; pytest filterwarnings and cache_dir have been stable across many versions)
