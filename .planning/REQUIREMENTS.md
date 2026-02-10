# Requirements: SeedSync Quality

**Defined:** 2026-02-09
**Core Value:** Clean, maintainable codebase with intuitive user interface

## v1.6 Requirements

Requirements for CI Cleanup milestone. Each maps to roadmap phases.

### Workflow Consolidation

- [ ] **WKFL-01**: `:dev` Docker image published to GHCR on every master push (multi-arch: amd64 + arm64)
- [ ] **WKFL-02**: `docker-publish.yml` removed — single CI workflow handles everything
- [ ] **WKFL-03**: Version tag publishing (`:X.Y.Z`, `:latest`) continues working on tag pushes

### Test Warnings

- [ ] **WARN-01**: pytest cache warnings suppressed in Docker test runner output
- [ ] **WARN-02**: webob cgi deprecation warnings filtered from pytest output

## Future Requirements

None planned.

## Out of Scope

| Feature | Reason |
|---------|--------|
| CI coverage gates (fail_under in CI) | GitHub Actions changes beyond consolidation |
| E2E test improvements | Separate concern, not CI cleanup |
| Angular test runner changes | Frontend, not backend CI |
| Dark mode toggle | Feature work, not CI |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| WKFL-01 | — | Pending |
| WKFL-02 | — | Pending |
| WKFL-03 | — | Pending |
| WARN-01 | — | Pending |
| WARN-02 | — | Pending |

**Coverage:**
- v1.6 requirements: 5 total
- Mapped to phases: 0
- Unmapped: 5

---
*Requirements defined: 2026-02-09*
*Last updated: 2026-02-09 after initial definition*
