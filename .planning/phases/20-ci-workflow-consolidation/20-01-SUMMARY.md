---
phase: 20-ci-workflow-consolidation
plan: 01
subsystem: ci-infrastructure
tags: [ci, docker, github-actions, consolidation]

dependency_graph:
  requires:
    - ".github/workflows/master.yml (existing CI pipeline)"
    - ".github/workflows/docker-publish.yml (duplicate workflow)"
    - "Makefile docker-image-release target"
  provides:
    - "Consolidated Docker publishing in master.yml only"
    - "Multi-arch :dev publishing after e2e tests"
    - "Eliminated duplicate docker-publish.yml workflow"
  affects:
    - "CI/CD pipeline behavior (no functional change to end result)"
    - "CLAUDE.md documentation"

tech_stack:
  added: []
  patterns:
    - "Workflow consolidation for better test gating"
    - "Mutual exclusion via GitHub ref conditions"

key_files:
  created: []
  modified:
    - ".github/workflows/master.yml"
    - "CLAUDE.md"
  deleted:
    - ".github/workflows/docker-publish.yml"

decisions: []

metrics:
  duration_minutes: 2
  tasks_completed: 2
  files_modified: 2
  files_deleted: 1
  commits: 2
  completion_date: "2026-02-10"
---

# Phase 20 Plan 01: CI Workflow Consolidation Summary

Consolidated Docker publishing into master.yml and eliminated the duplicate docker-publish.yml workflow.

## Objective Achieved

All Docker publishing now flows through master.yml, ensuring :dev images are only published after all tests pass. The duplicate docker-publish.yml workflow that bypassed testing has been removed.

## Tasks Completed

### Task 1: Add :dev Docker publishing job to master.yml
**Status:** ✓ Complete
**Commit:** eab6146

Added `publish-docker-image-dev` job to master.yml that:
- Runs only on master push (not PRs, not tags) via `if: github.ref == 'refs/heads/master'`
- Gates on e2e test passage via `needs: [ e2etests-deb, e2etests-docker-image ]`
- Publishes `ghcr.io/thejuran/seedsync:dev` for both amd64 and arm64
- Uses `make docker-image-release` with `RELEASE_VERSION=dev`
- Reuses staging cache built during earlier CI steps

The job follows the exact same pattern as the existing `publish-docker-image` job (for versioned releases), ensuring consistency in setup, authentication, and multi-arch build configuration.

### Task 2: Delete docker-publish.yml and update CLAUDE.md
**Status:** ✓ Complete
**Commit:** 268a86b

Deleted `.github/workflows/docker-publish.yml` because:
- Its :dev publishing on master push is now handled by the new job in master.yml
- Its version tag publishing was already handled by the existing job in master.yml
- The master.yml approach is superior: gates on test passage and builds multi-arch

Updated CLAUDE.md to remove the docker-publish.yml reference from the Key Files section.

## Verification Results

All verification criteria passed:

1. ✓ YAML syntax valid (python yaml.safe_load successful)
2. ✓ docker-publish.yml deleted (file does not exist)
3. ✓ Both publishing jobs exist in master.yml (publish-docker-image and publish-docker-image-dev)
4. ✓ Both jobs gate on e2e test passage (needs: [ e2etests-deb, e2etests-docker-image ])
5. ✓ Both jobs use make docker-image-release (multi-arch builds via Makefile)
6. ✓ Mutual exclusion confirmed (dev job: master ref, tag job: v* tags)
7. ✓ PR pushes trigger neither publishing job (refs/pull/... doesn't match either condition)
8. ✓ CLAUDE.md updated (no docker-publish references remain)

## Publishing Behavior After Consolidation

| Trigger | Publishing Jobs Executed | Docker Tags Published | Test Gating |
|---------|-------------------------|----------------------|-------------|
| PR to master | None | None | Tests run, no publishing |
| Push to master | publish-docker-image-dev | ghcr.io/thejuran/seedsync:dev | After e2e tests pass |
| Tag vX.Y.Z | publish-docker-image | ghcr.io/thejuran/seedsync:X.Y.Z + :latest | After e2e tests pass |

All publishing is now multi-arch (amd64 + arm64) and gated on test passage.

## Deviations from Plan

None - plan executed exactly as written.

## Success Criteria

All success criteria met:

- ✓ master.yml is the ONLY workflow handling Docker publishing
- ✓ :dev publishing runs on master push, after e2e tests pass, multi-arch
- ✓ :X.Y.Z + :latest publishing runs on tag push, after e2e tests pass, multi-arch (unchanged)
- ✓ docker-publish.yml no longer exists
- ✓ WKFL-01, WKFL-02, WKFL-03 requirements satisfied

## Technical Details

### Multi-arch Build Pattern

Both publishing jobs use the same build pattern:
1. Set up QEMU and Docker Buildx with moby/buildkit:master
2. Log into GHCR with GitHub token
3. Call `make docker-image-release` which:
   - Pulls from staging cache (built during build-docker-image job)
   - Builds for `--platform linux/amd64,linux/arm64`
   - Pushes to release registry with specified version tag

This approach is superior to the deleted docker-publish.yml which used docker/build-push-action directly (single arch only, no test gating, no cache reuse).

### Workflow Design

The mutual exclusion is achieved via GitHub ref matching:
- `publish-docker-image-dev`: `if: github.ref == 'refs/heads/master'`
- `publish-docker-image`: `if: startsWith(github.ref, 'refs/tags/v')`
- `publish-docs`: `if: github.ref == 'refs/heads/master' || startsWith(github.ref, 'refs/tags/v')`

This ensures only the appropriate publishing job runs for each trigger type.

## Self-Check: PASSED

Verified all claims in this summary:

**Files created:** None

**Files modified:**
- .github/workflows/master.yml: FOUND
- CLAUDE.md: FOUND

**Files deleted:**
- .github/workflows/docker-publish.yml: CONFIRMED DELETED

**Commits:**
- eab6146: FOUND (feat(20-01): add :dev Docker publishing job to master.yml)
- 268a86b: FOUND (feat(20-01): delete docker-publish.yml and update CLAUDE.md)
