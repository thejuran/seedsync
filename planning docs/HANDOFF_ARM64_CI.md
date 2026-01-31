# Handoff: ARM64 CI/CD Gaps

## Summary

The publication plan (Sessions 1-7) is complete and merged. However, there are gaps in the CI/CD pipeline for ARM64 support that were identified but not addressed.

## Current State

### What Works
- **Docker images**: Build for both `linux/amd64` and `linux/arm64` (via `--platform` flag in Makefile)
- **Debian control**: Lists `Architecture: amd64 arm64`
- **All tests pass on amd64**

### What's Missing

#### 1. ARM64 Deb Package Builds
**Location**: `.github/workflows/master.yml` - `build-deb` job

**Current behavior**: Only builds amd64 deb (runs on `ubuntu-latest` which is amd64)

**Problem**: The `debian/control` claims to support arm64, but CI never builds an arm64 .deb

**Options**:
- Use GitHub's arm64 runners (`runs-on: ubuntu-24.04-arm`) - simplest
- Cross-compile using Docker buildx with QEMU
- Remove arm64 from `debian/control` to be honest about what's actually built

#### 2. ARM64 Docker E2E Tests
**Location**: `.github/workflows/master.yml` - `e2etests-docker-image` job

**Current behavior**:
```yaml
strategy:
  matrix:
    # Note: arm64 excluded from e2e tests - too slow under QEMU emulation
    arch: [ amd64 ]
```

**Problem**: Docker image is built for arm64 but never tested

**Options**:
- Enable arm64 in the matrix (will be slow, ~15-30 min under QEMU)
- Use GitHub's arm64 runners for native speed
- Leave as-is with the understanding that arm64 is untested

## Files to Modify

1. `.github/workflows/master.yml`:
   - `build-deb` job: Add arm64 build using matrix or separate job
   - `e2etests-docker-image` job: Add `arm64` to arch matrix
   - `publish-deb` job: Handle multiple .deb artifacts

2. Potentially `Makefile`:
   - May need changes if cross-compilation approach is chosen

## Recommended Approach

### For v1.0.0 Release (Minimal)
1. Update `debian/control` to `Architecture: amd64` only (remove arm64)
2. Update `CLAUDE.md` to clarify deb is amd64 only, Docker supports both
3. Leave arm64 Docker untested (matches previous behavior)

### For Future Release (Full ARM64 Support)
1. Add arm64 deb build job using `runs-on: ubuntu-24.04-arm`
2. Add arm64 to e2e test matrix (accept slower CI)
3. Update publish-deb to upload both architectures

## Context

This was discovered during Session 6 of the publication plan. The Session 3 changes enabled arm64 in the Makefile and debian/control, but the CI workflow was not updated to actually build/test arm64.

## Branch

Work was done on: `claude/publication-plan-session-6-vsDja` (now merged to master)

## Related Files

- `Makefile` - lines 86, 116 have `--platform linux/amd64,linux/arm64`
- `src/debian/control` - line 10 has `Architecture: amd64 arm64`
- `.github/workflows/master.yml` - build-deb, e2etests-docker-image, publish-deb jobs
- `CLAUDE.md` - line 196 claims arm64 support
