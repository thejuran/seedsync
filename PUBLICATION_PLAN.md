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

## Session 1: Version Bump & Core Metadata

**Context needed**: Version locations, pyproject.toml structure
**Estimated scope**: 4 files, ~20 lines changed

### 1.1 Fix pyproject.toml
**File**: `src/python/pyproject.toml`

Update:
```toml
[tool.poetry]
name = "seedsync"
version = "1.0.0"
description = "Fast file syncing from remote servers with a web UI, powered by LFTP"
authors = ["thejuran"]
```

### 1.2 Update Angular Version
**File**: `src/angular/package.json`

Change version from `0.8.6` to `1.0.0`

### 1.3 Update Debian Changelog
**File**: `src/debian/changelog`

Add new entry at top:
```
seedsync (1.0.0) stable; urgency=low

  * Fork maintained by thejuran
  * Re-enable ARM64 support
  * Modernized Angular frontend
  * Version 1.0.0 release

 -- thejuran <thejuran@users.noreply.github.com>  <DATE>
```

### 1.4 Update E2E Version Test
**File**: `src/e2e/tests/about.page.spec.ts`

Update expected version from `v0.8.6` to `v1.0.0`

**Completion check**: `grep -r "0\.8\.6" src/` returns no results

---

## Session 2: Update Repository References

**Context needed**: Current README.md, about-page.component.html, DeveloperReadme.md
**Estimated scope**: 3 files, ~30 lines changed

### 2.1 Update README.md
**File**: `README.md`

Changes:
- Add fork attribution at top (after logo)
- Update all `ipsingh06` references to `thejuran`
- Update Docker Hub badges to GHCR
- Update documentation link to `thejuran.github.io/seedsync`

Add after logo section:
```markdown
> **Note**: This is a maintained fork of [ipsingh06/seedsync](https://github.com/ipsingh06/seedsync).
```

Badge URLs to update:
- `github.com/ipsingh06/seedsync` → `github.com/thejuran/seedsync`
- `hub.docker.com/r/ipsingh06/seedsync` → `ghcr.io/thejuran/seedsync`
- Documentation: `ipsingh06.github.io/seedsync` → `thejuran.github.io/seedsync`

### 2.2 Update About Page
**File**: `src/angular/src/app/pages/about/about-page.component.html`

Changes:
- Copyright: `2017-2020` → `2017-2025`
- GitHub link: `ipsingh06/seedsync` → `thejuran/seedsync`

### 2.3 Update Developer Readme
**File**: `doc/DeveloperReadme.md`

Changes:
- Git clone URL: `gitlab.com:ipsingh06/seedsync.git` → `github.com:thejuran/seedsync.git`
- Any other `ipsingh06` references

**Completion check**: `grep -r "ipsingh06" . --include="*.md" --include="*.html"` returns no results (except ACKNOWLEDGMENTS.md)

---

## Session 3: Re-enable ARM64 Builds

**Context needed**: Makefile structure
**Estimated scope**: 1 file, ~4 lines changed

### 3.1 Update Makefile
**File**: `Makefile`

Line ~78 (scanfs build):
```makefile
# Before:
# TODO: Add arm64 back once Angular migration is complete
DOCKER_BUILD_PLATFORMS = linux/amd64

# After:
DOCKER_BUILD_PLATFORMS = linux/amd64,linux/arm64
```

Line ~110 (docker image build):
```makefile
# Before:
# TODO: Add arm64 back once Angular migration is complete
DOCKER_BUILD_PLATFORMS = linux/amd64

# After:
DOCKER_BUILD_PLATFORMS = linux/amd64,linux/arm64
```

### 3.2 Update CLAUDE.md
**File**: `CLAUDE.md`

Remove or update the note:
```markdown
# Before:
Note: ARM64 support (Raspberry Pi 3/4/5) temporarily disabled during Angular migration.

# After:
Docker images are built for: `linux/amd64`, `linux/arm64` (Raspberry Pi 3/4/5)
```

**Completion check**: `make docker-image` builds successfully for both platforms

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

| Session | Focus | Files | Dependencies |
|---------|-------|-------|--------------|
| 0 | Manual GitHub setup | - | None |
| 1 | Version & metadata | 4 | Session 0 |
| 2 | Repository references | 3 | Session 0 |
| 3 | ARM64 builds | 2 | None |
| 4 | CI/CD configuration | 1 | Session 0 |
| 5 | Community files (docs) | 3 | None |
| 6 | GitHub templates | 4 | None |
| 7 | Documentation site | 2-3 | Sessions 0, 2 |
| 8 | Final review & release | - | All sessions |

**Parallelizable**: Sessions 1-6 can be done in any order after Session 0. Session 7 depends on Session 2 (URLs). Session 8 must be last.

**Recommended order**: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8

---

## Quick Reference: All Files to Modify

### Existing Files
- `src/python/pyproject.toml` - version, description, authors
- `src/angular/package.json` - version
- `src/debian/changelog` - new version entry
- `src/e2e/tests/about.page.spec.ts` - version check
- `README.md` - URLs, badges, fork attribution
- `src/angular/src/app/pages/about/about-page.component.html` - copyright, GitHub link
- `doc/DeveloperReadme.md` - clone URL
- `Makefile` - ARM64 platforms
- `CLAUDE.md` - ARM64 note
- `.github/workflows/master.yml` - GHCR configuration
- `src/python/mkdocs.yml` - site URLs

### New Files
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `ACKNOWLEDGMENTS.md`
- `SECURITY.md`
- `.github/ISSUE_TEMPLATE/bug_report.md`
- `.github/ISSUE_TEMPLATE/feature_request.md`
- `.github/pull_request_template.md`
