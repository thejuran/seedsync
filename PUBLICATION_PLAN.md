# SeedSync Publication Plan

This plan outlines the steps to publish SeedSync as a maintained fork under the new GitHub identity.

## Confirmed Decisions

| Decision | Choice |
|----------|--------|
| GitHub username | `thejuran` |
| Project name | SeedSync (with fork attribution) |
| Starting version | `1.0.0` |
| Docker registry | GHCR (`ghcr.io/thejuran/seedsync`) |
| Docs hosting | GitHub Pages (`thejuran.github.io/seedsync`) |

---

## Release Strategy

### Versioning Scheme

Follow [Semantic Versioning](https://semver.org/):

| Release Type | Version Format | Example | When to Use |
|--------------|----------------|---------|-------------|
| **Production** | `X.Y.Z` | `1.0.0`, `1.1.0` | Stable, tested releases |
| **Pre-release** | `X.Y.Z-beta.N` | `1.1.0-beta.1` | Feature-complete, needs testing |
| **Dev builds** | `X.Y.Z-dev.N` or SHA | `1.1.0-dev.42` | Bleeding edge (optional, future) |

### Docker Tag Strategy

```
ghcr.io/thejuran/seedsync:latest       # Latest stable release (production)
ghcr.io/thejuran/seedsync:1.0.0        # Pinned version (production)
ghcr.io/thejuran/seedsync:1.0          # Minor version track (gets patch updates)
ghcr.io/thejuran/seedsync:dev          # Latest from main branch (optional, future)
```

**For v1.0.0 launch**: Start simple with just `:latest` and `:X.Y.Z` tags. Add `:dev` later if users request bleeding-edge builds.

### Branch & Release Flow

```
main (default branch)
  │
  ├── Every push → Run tests (CI)
  │
  └── Tag v1.0.0 → Build & publish:
                    ├── Docker: :latest, :1.0.0, :1.0
                    ├── GitHub Release with .deb
                    └── Documentation site update
```

### CI/CD Tag Configuration

The GitHub Actions workflow should use `docker/metadata-action` for automatic tagging:

```yaml
- name: Docker metadata
  id: meta
  uses: docker/metadata-action@v5
  with:
    images: ghcr.io/thejuran/seedsync
    tags: |
      type=semver,pattern={{version}}      # v1.0.0 → 1.0.0
      type=semver,pattern={{major}}.{{minor}}  # v1.0.0 → 1.0
      type=raw,value=latest,enable=${{ startsWith(github.ref, 'refs/tags/v') }}
```

### What Users Should Use

| User Type | Recommended Tag | Why |
|-----------|-----------------|-----|
| Most users | `:latest` or `:1.0.0` | Stable, tested |
| Want auto-updates | `:1.0` | Gets patch releases automatically |
| Debugging issues | `:X.Y.Z` exact | Reproducible environment |

### Release Checklist

For each release:
1. Update version in all 4 locations (see Session 1)
2. Update `src/debian/changelog` with release notes
3. Ensure all tests pass
4. Create and push git tag: `git tag -a v1.0.0 -m "Release 1.0.0"`
5. CI automatically builds and publishes
6. Verify artifacts are available (GHCR image, GitHub Release .deb)

---

## Session 0: Manual Prerequisites (User Action Required)

**Context needed**: None (manual GitHub steps)

These steps must be completed by the user before any code changes:

### 0.1 Change GitHub Username
1. Go to GitHub Settings → Account → Change username
2. Change to `thejuran`
3. Note: GitHub will set up redirects from your old username temporarily

### 0.2 Verify Repository Access
1. Confirm the repo is now at `github.com/thejuran/seedsync`
2. Update local git remote if needed:
   ```bash
   git remote set-url origin git@github.com:thejuran/seedsync.git
   ```

### 0.3 Set Up GitHub Container Registry
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a token with `write:packages` scope (for CI to push images)
3. Add as repository secret `GHCR_TOKEN` (or use `GITHUB_TOKEN` if sufficient)

**Completion check**: Can push to `github.com/thejuran/seedsync`

---

## Session 1: Version Bump & Core Metadata ✅ COMPLETED

**Status**: Completed 2026-01-30
**Commit**: `294bfe1` - "Bump version to 1.0.0 for publication (Session 1)"

### Changes Made

| File | Change |
|------|--------|
| `src/python/pyproject.toml` | Version `0.0.0` → `1.0.0`, added description and author `thejuran` |
| `src/angular/package.json` | Version `0.8.6` → `1.0.0` |
| `src/debian/changelog` | Added 1.0.0 entry with modernization notes |
| `src/e2e/tests/about.page.spec.ts` | Test expects `v1.0.0` |

### Version Locations Reference

For future version bumps, update these 4 files:
1. `src/python/pyproject.toml` - `version = "X.Y.Z"`
2. `src/angular/package.json` - `"version": "X.Y.Z"`
3. `src/debian/changelog` - Add new entry at top
4. `src/e2e/tests/about.page.spec.ts` - `expect(version).toBe('vX.Y.Z')`

### Verification

- `grep -r "0\.8\.6" src/` returns only historical debian changelog entry (expected)
- All active version references now show `1.0.0`

---

## Session 2: Update Repository References ✅ COMPLETED

**Status**: Completed 2026-01-30
**Commit**: `0b083b9` - "Update repository references for thejuran fork (Session 2)"

### Changes Made

| File | Change |
|------|--------|
| `README.md` | Added fork attribution, updated badges to GHCR, updated all URLs |
| `src/angular/src/app/pages/about/about-page.component.html` | Copyright `2017-2020` → `2017-2026`, GitHub link updated |
| `doc/DeveloperReadme.md` | Clone URL `gitlab.com:ipsingh06` → `github.com:thejuran`, registry refs updated |

### Verification

- Session 2 files have no remaining `ipsingh06` references
- README.md fork attribution intentionally links to original repo
- Remaining `ipsingh06` refs are in Session 4 (CI/CD) and Session 7 (docs)

---

## Session 3: ARM64 Builds & Debian Packaging Modernization ✅ COMPLETED

**Status**: Completed 2026-01-30
**Commit**: `9ef086b` - "Enable ARM64 builds and modernize Debian packaging (Session 3)"

### Changes Made

| File | Change |
|------|--------|
| `Makefile` | `--platform linux/amd64` → `linux/amd64,linux/arm64` (2 locations) |
| `CLAUDE.md` | Updated ARM64 support note |
| `src/debian/control` | Modernized: Standards 4.6.2, debhelper-compat 13, arm64 arch |
| `src/debian/compat` | Deleted (superseded by debhelper-compat) |
| `src/debian/rules` | Removed `--with=systemd` (automatic in compat 13+) |

### Debian Packaging Modernization Details

- `Priority: extra` → `optional` (extra deprecated)
- `debhelper (>= 10)` → `debhelper-compat (= 13)`
- `Standards-Version: 4.0.0` → `4.6.2`
- Added `Rules-Requires-Root: no`
- `Architecture: amd64` → `amd64 arm64`

---

## Session 4: CI/CD & Registry Configuration

**Context needed**: GitHub Actions workflow structure
**Estimated scope**: 1 file, ~15 lines changed

### 4.1 Update GitHub Actions Workflow
**File**: `.github/workflows/master.yml`

Changes needed:
1. Update Docker registry from Docker Hub to GHCR
2. Update image name references
3. Ensure GITHUB_TOKEN has package write permissions

Find and replace patterns:
- `ipsingh06/seedsync` → `ghcr.io/thejuran/seedsync`
- Docker Hub login → GHCR login:
  ```yaml
  - name: Login to GHCR
    uses: docker/login-action@v3
    with:
      registry: ghcr.io
      username: ${{ github.actor }}
      password: ${{ secrets.GITHUB_TOKEN }}
  ```

### 4.2 Update Workflow Permissions
Ensure workflow has:
```yaml
permissions:
  contents: read
  packages: write
```

**Completion check**: Push to main triggers successful workflow with GHCR push

---

## Session 5: Community Files (Part 1)

**Context needed**: None (new files)
**Estimated scope**: 3 new files

### 5.1 Create CONTRIBUTING.md
**File**: `CONTRIBUTING.md`

Content:
- How to report bugs
- How to suggest features
- Development setup (link to DeveloperReadme.md)
- Pull request process
- Code style guidelines (link to CodingGuidelines.md)
- Testing requirements

### 5.2 Create CODE_OF_CONDUCT.md
**File**: `CODE_OF_CONDUCT.md`

Use Contributor Covenant v2.1 (standard for open source)

### 5.3 Create ACKNOWLEDGMENTS.md
**File**: `ACKNOWLEDGMENTS.md`

Content:
- Credit to Inderpreet Singh (original author)
- Link to original repository
- Credit to other contributors
- Icon attribution (currently in about page)

**Completion check**: All three files exist and are properly formatted

---

## Session 6: Community Files (Part 2) - GitHub Templates

**Context needed**: None (new files)
**Estimated scope**: 4 new files

### 6.1 Create Bug Report Template
**File**: `.github/ISSUE_TEMPLATE/bug_report.md`

Include:
- Description
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Docker/deb, version)
- Logs

### 6.2 Create Feature Request Template
**File**: `.github/ISSUE_TEMPLATE/feature_request.md`

Include:
- Problem description
- Proposed solution
- Alternatives considered

### 6.3 Create PR Template
**File**: `.github/pull_request_template.md`

Include:
- Description of changes
- Related issue
- Testing done
- Checklist (tests pass, docs updated, etc.)

### 6.4 Create Security Policy
**File**: `SECURITY.md`

Include:
- Supported versions
- How to report vulnerabilities
- Expected response time

**Completion check**: Creating new issue/PR shows templates

---

## Session 7: Documentation Site Setup

**Context needed**: MkDocs configuration, GitHub Pages setup
**Estimated scope**: 2-3 files, repo settings

### 7.1 Update MkDocs Configuration
**File**: `src/python/mkdocs.yml`

Update:
- `site_url` to `https://thejuran.github.io/seedsync`
- `repo_url` to `https://github.com/thejuran/seedsync`
- Any other URL references

### 7.2 Set Up GitHub Pages
Options:
1. Deploy from `gh-pages` branch (add to CI)
2. Deploy from `/docs` folder on main

Add to GitHub Actions:
```yaml
- name: Deploy docs
  uses: peaceiris/actions-gh-pages@v3
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: ./site
```

### 7.3 Update Documentation Content
Review and update any docs that reference old URLs or outdated information.

**Completion check**: `https://thejuran.github.io/seedsync` loads correctly

---

## Session 8: Final Review & Release

**Context needed**: All previous sessions complete
**Estimated scope**: Review + git operations

### 8.1 Final Grep Audit
Run these checks:
```bash
# Should return nothing (except ACKNOWLEDGMENTS.md):
grep -r "ipsingh06" . --include="*.md" --include="*.html" --include="*.yml" --include="*.json"

# Should return nothing:
grep -r "0\.8\.6" src/

# Should return nothing:
grep -r "gitlab.com" .
```

### 8.2 Test Build
```bash
make clean
make deb
make docker-image
make run-tests-python
make run-tests-angular
```

### 8.3 Create Release
```bash
git tag -a v1.0.0 -m "Version 1.0.0 - First release of maintained fork"
git push origin v1.0.0
```

### 8.4 Post-Release
- Verify GitHub Release is created automatically
- Verify Docker image is pushed to GHCR
- Verify documentation site is live
- Create announcement (optional)

**Completion check**:
- `ghcr.io/thejuran/seedsync:1.0.0` pulls successfully
- GitHub Releases shows v1.0.0 with deb artifact

---

## Session Summary

| Session | Focus | Files | Dependencies | Status |
|---------|-------|-------|--------------|--------|
| 0 | Manual GitHub setup | - | None | Pending |
| 1 | Version & metadata | 4 | Session 0 | ✅ Done |
| 2 | Repository references | 3 | Session 0 | ✅ Done |
| 3 | ARM64 builds & Debian modernization | 5 (1 deleted) | None | ✅ Done |
| 4 | CI/CD configuration | 1 | Session 0 | Pending |
| 5 | Community files (docs) | 3 | None | Pending |
| 6 | GitHub templates | 4 | None | Pending |
| 7 | Documentation site | 2-3 | Sessions 0, 2 | Pending |
| 8 | Final review & release | - | All sessions | Pending |

**Parallelizable**: Sessions 4-6 can be done in any order. Session 7 is unblocked. Session 8 must be last.

**Recommended order**: 4 → 5 → 6 → 7 → 8

---

## Quick Reference: All Files to Modify

### Existing Files
- `src/python/pyproject.toml` - version, description, authors
- `src/angular/package.json` - version
- `src/debian/changelog` - new version entry
- `src/debian/control` - maintainer, standards, architecture
- `src/debian/rules` - simplify dh call
- `src/e2e/tests/about.page.spec.ts` - version check
- `README.md` - URLs, badges, fork attribution
- `src/angular/src/app/pages/about/about-page.component.html` - copyright, GitHub link
- `doc/DeveloperReadme.md` - clone URL
- `Makefile` - ARM64 platforms
- `CLAUDE.md` - ARM64 note
- `.github/workflows/master.yml` - GHCR configuration
- `src/python/mkdocs.yml` - site URLs

### Files to Delete
- `src/debian/compat` - obsolete (replaced by debhelper-compat in control)

### New Files
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `ACKNOWLEDGMENTS.md`
- `SECURITY.md`
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/pull_request_template.md`
