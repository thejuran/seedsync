# SeedSyncarr Rebrand Design

## Overview

Rebrand SeedSync from a "maintained fork" of ipsingh06/seedsync into **SeedSyncarr** — a standalone, community-trusted project in the *arr ecosystem. The codebase has diverged ~80-90% from the original, with 770+ commits of modernization (Angular 4 to 21, Bootstrap 5, thread safety overhaul, manager extraction, ARM64 support, full CI/CD). The fork label no longer reflects reality.

## Goals

1. **Standalone identity** — new repo, new name, no fork baggage
2. **Community trust** — code quality that holds up to scrutiny regardless of how it was written
3. **Adoption** — listed on awesome-selfhosted, Awesomarr, and recognized in *arr/selfhosted communities
4. **Cross-promotion** — leverage existing Triggarr presence in the community

## Target Audience (priority order)

1. Seedbox users in the *arr ecosystem (Sonarr/Radarr/Lidarr users) who need a sync tool
2. Existing SeedSync users looking for an actively maintained version
3. Broader self-hosted/homelab community

## Name & Identity

- **Name:** SeedSyncarr
- **Repo:** `github.com/thejuran/seedsyncarr` (fresh repo, no fork relationship)
- **Registry:** `ghcr.io/thejuran/seedsyncarr`
- **Docs:** `thejuran.github.io/seedsyncarr`
- **License:** Apache 2.0 (carried from original, required and appropriate)
- **Versioning:** Starts at v1.0.0 (this is v1 of SeedSyncarr)

## Acknowledgment of Original

The README and docs will include:

> SeedSyncarr evolved from [SeedSync](https://github.com/ipsingh06/seedsync) by Inderpreet Singh. The original project inspired this work, and we're grateful for the foundation it provided.

The old `thejuran/seedsync` repo will be archived with a pointer to the new project.

## Execution Phases

### Phase 1 — Rebrand

- Create new repo `thejuran/seedsyncarr`
- Port source code without git history (clean `git init`)
- Rename all "SeedSync" references in code, configs, UI, Docker, docs
- Update CI/CD pipeline for new repo and registry
- Get builds and tests green
- Tag v1.0.0

### Phase 2 — Harden

- **Code cleanup:** Remove AI artifacts (Co-Authored-By handled by fresh history), audit for overly verbose comments, unnecessary docstrings, defensive code that doesn't need to be there
- **Dead code removal:** Strip planning docs, modernization reports, analysis files, TODOs
- **Test audit:** Review coverage for gaps, ensure meaningful assertions (not just "does it not crash"), verify E2E tests cover real user workflows including unhappy paths
- **Code review pass:** Focus on anything that looks generated, inconsistent style, unnecessary abstraction. Architecture and thread safety patterns are already solid from modernization work.
- **Quality bar:** Someone cloning the repo and reading the code should think "this is well-engineered" regardless of how it was written.

### Phase 3 — Present

- **README:** Lead with value prop (LFTP speed, auto-extract, auto-queue, web UI). Clean screenshots. One-liner Docker install. Badge row (CI, version, Docker pulls, license). Cross-link to Triggarr.
- **Docs site:** mkdocs at `thejuran.github.io/seedsyncarr`. Installation guide, configuration reference, FAQ/troubleshooting, architecture overview for contributors.
- **Community signals:** GitHub Discussions enabled, contributing guide, issue templates (bug report, feature request), changelog showing active thoughtful development.

### Phase 4 — Launch

- Archive old `thejuran/seedsync` repo with pointer to SeedSyncarr
- r/selfhosted post
- awesome-selfhosted submission (verify criteria beforehand)
- *arr community Discord/Reddit outreach
- Awesomarr submission (when quality bar is confidently met)

## Key Constraint

The project is AI-assisted and the author is honest about it. The goal is not to hide this, but to ensure the code quality, test coverage, and project presentation are strong enough that how it was built is irrelevant. The Awesomarr rejection of Triggarr (despite 60 stars) is the benchmark to beat — the project must pass scrutiny from curators who are skeptical of AI-generated code.

## What Carries Over

- All source code (it's the author's work)
- Apache 2.0 license
- Core functionality and architecture
- Existing CI/CD approach (adapted for new repo)

## What Does Not Carry Over

- Git history (fresh start)
- Fork relationship
- "Maintained fork" framing
- Internal planning docs and analysis files
- Star count (2 stars, no loss)
