# M005: Dashboard Polish & v3.3.0 Release

**Vision:** Ship a visually polished dashboard with proper alignment and consistent typography, then cut the v3.3.0 release.

## Success Criteria

- Dashboard column headers visually align with file row data at medium and large breakpoints
- Font sizes form a clear hierarchy: headers > body text > secondary info > timestamps
- v3.3.0 Docker image and Deb packages are published

## Key Risks / Unknowns

- None significant — straightforward CSS fixes and a release tag

## Verification Classes

- Contract verification: Angular unit tests (400/400), lint (0 errors)
- Integration verification: full CI pipeline (unit + E2E + builds)
- Operational verification: v3.3.0 tag triggers publish jobs
- UAT / human verification: visual inspection of dashboard at multiple widths

## Milestone Definition of Done

This milestone is complete only when all are true:

- Dashboard alignment and font issues are fixed and visually verified
- All Angular tests pass, lint clean
- CI fully green on master
- v3.3.0 tag pushed, Docker and Deb artifacts published

## Slices

- [x] **S01: Dashboard layout & typography polish** `risk:low` `depends:[]`
  > After this: dashboard headers align with row data, font sizes are consistent and well-proportioned
- [ ] **S02: Tag v3.3.0 release** `risk:low` `depends:[S01]`
  > After this: v3.3.0 is tagged, CI publishes Docker image and Deb packages to ghcr.io and GitHub Releases

## Boundary Map

### S01 → S02

Produces:
- Polished dashboard CSS on master, CI green

Consumes:
- nothing (first slice)
