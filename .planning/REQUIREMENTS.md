# Requirements: SeedSync v4.0.3 Dependency Fixes & CI

**Defined:** 2026-04-08
**Core Value:** Reliable file sync from seedbox to local with automated media library integration

## v4.0.3 Requirements

Requirements for v4.0.3 milestone.

### Security — Dependabot Alerts

- [x] **SEC-01**: hono updated to ^4.12.12 (resolves 4.12.12), closing Dependabot alerts #45-#49 — Phase 52
- [x] **SEC-02**: @hono/node-server updated to ^1.19.13 (resolves 1.19.13), closing Dependabot alert #44 — Phase 52
- [ ] **SEC-03**: Zero open Dependabot security alerts on the repository after merge to master — verify post-merge

### CI — Uniform Pipeline (already implemented in v4.0.2)

- [x] **CI-01**: CI pipeline runs ruff lint on Python code — already in master.yml lint job
- [x] **CI-02**: CI pipeline runs eslint on Angular code — already in master.yml lint job
- [x] **CI-03**: All release paths publish `:main` tag to GHCR — already in publish-docker-image and publish-docker-image-dev jobs

## Validated (Previous Milestones)

All v3.2 security requirements (32 total) completed across Phases 47-49 and M002:
- PATH-01 through PATH-03 (path traversal guards) — Phase 49
- CONF-01 through CONF-04 (config hardening) — Phases 47-48
- AUTH-01 through AUTH-08 (API token auth) — M002
- WHOOK-01 through WHOOK-02 (webhook hardening) — Phase 48
- DNS-01 through DNS-03 (DNS rebinding prevention) — M002
- ENDP-01 through ENDP-02 (endpoint hygiene) — Phase 47
- LOG-01 through LOG-03 (log redaction) — Phase 47
- CSP-01 through CSP-04 (CSP hardening) — M002
- WARN-01 through WARN-03 (startup warnings) — Phase 48

## Future Requirements

- **SSRF-01**: Resolve-once DNS pattern for outbound SSRF validation (low ROI — *arr endpoints are localhost)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full dependency audit beyond Dependabot alerts | Scope creep — only address flagged alerts |
| Angular major version bump | Not needed — Angular 21 is current |
| Python major version bump | Not needed — Python 3.12+ compatible |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 52 | Complete |
| SEC-02 | Phase 52 | Complete |
| SEC-03 | Phase 52 | Pending (verify post-merge) |
| CI-01 | v4.0.2 | Complete |
| CI-02 | v4.0.2 | Complete |
| CI-03 | v4.0.2 | Complete |

**Coverage:**
- v4.0.3 requirements: 6 total
- Mapped to phases: 6
- Unmapped: 0
- Complete: 5 (SEC-01, SEC-02, CI-01, CI-02, CI-03)
- Pending post-merge verification: 1 (SEC-03)

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after Phase 52 execution*
