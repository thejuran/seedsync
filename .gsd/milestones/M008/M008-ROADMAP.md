# M008: AutoQueue Migration, Token UI & Toast Polish

**Vision:** Eliminate the standalone AutoQueue page by merging its functionality into Settings, surface the API token in Settings for authenticated users, polish toast notifications to match Triggarr's style, and clean up stale branches.

## Success Criteria

- AutoQueue page no longer exists — route removed, nav link removed, component deleted
- AutoQueue pattern management is accessible from the Settings page
- API token is visible (with reveal/hide toggle) in Settings for authenticated sessions
- Toast notifications match Triggarr's clean notification aesthetic
- All stale gsd/* branches deleted

## Key Risks / Unknowns

- AutoQueue page has pattern CRUD (add/remove patterns) — need to understand the component structure before merging into Settings
- R017 token display may already partially work from M007's reveal/hide toggle — need to verify on live instance

## Verification Classes

- Contract verification: `ng build` clean, 401+ unit tests pass
- Integration verification: full CI pipeline (unit + E2E + builds)
- Operational verification: `:dev` Docker image deployed with working AutoQueue-in-Settings and token display
- UAT / human verification: visual inspection of Settings page with AutoQueue section, token reveal, and toast styling

## Milestone Definition of Done

This milestone is complete only when all are true:

- AutoQueue functionality works from Settings page (enable/disable, pattern management)
- Standalone AutoQueue page and route are deleted
- Token displays in Settings for authenticated sessions with reveal/hide
- Toasts match Triggarr styling
- CI green, `:dev` image published
- Stale branches cleaned up

## Slices

- [x] **S01: Merge AutoQueue into Settings page** `risk:high` `depends:[]`
  > After this: AutoQueue enable/disable, pattern restrict toggle, auto-extraction toggle, and pattern list CRUD all live inside a Settings card; standalone AutoQueue page, route, and nav link are deleted
- [x] **S02: API token in Settings & toast polish** `risk:low` `depends:[]`
  > After this: Authenticated users see their API token in Settings with reveal/hide/copy; toast notifications use Triggarr-style clean styling; stale gsd/* branches deleted

## Boundary Map

### S01

Produces:
- AutoQueue settings card in `settings-page.component.html` with pattern list CRUD
- Deleted: `autoqueue-page.component.{ts,html,scss}`, route entry, nav link
- Updated E2E tests targeting AutoQueue functionality

Consumes:
- nothing (first slice)

### S02

Produces:
- Working token display in Settings Security card (R017 complete)
- Restyled toast component matching Triggarr patterns (R040 complete)
- Stale branches `gsd/M006/S01`, `gsd/M007/S01`, `gsd/M007/S02` deleted

Consumes:
- nothing (independent of S01)
