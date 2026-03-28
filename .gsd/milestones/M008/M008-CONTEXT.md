# M008 Context

## Background

SeedSync's UI redesign is functionally complete across M003–M007: Deep Moss + Amber palette, Triggarr-style layout, flat settings cards, unified multi-select bar, and all code review findings addressed. CI is fully green with 401 unit tests and E2E coverage across amd64/arm64 Deb and Docker.

However, user-facing documentation still shows the old UI (pre-redesign screenshots), the changelog hasn't been updated since v3.2.0, and no formal release tag has been cut. The `:dev` Docker image is the only published artifact with the new UI.

## What This Milestone Delivers

- Updated screenshots and documentation reflecting the current Deep Moss UI
- Complete v3.3.0 changelog covering all changes since v3.2.0 (M003–M007)
- Tagged v3.3.0 release with published Docker `:latest` image and Deb packages
- Branch cleanup (stale gsd/* branches)

## What's Out of Scope

- Further UI feature work — the redesign is done
- R017 (token in Settings UI) and R040 (toast redesign) remain deferred
- No backend changes

## Key References

- Current live `:dev` at http://maguffynas:8800
- README screenshots: `docs/img/` directory
- Changelog: `CHANGELOG.md`
- GitHub Pages docs site: `docs/` directory
- Release workflow triggers on version tags
