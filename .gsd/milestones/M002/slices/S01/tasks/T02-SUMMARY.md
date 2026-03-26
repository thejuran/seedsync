---
id: T02
parent: S01
milestone: M002
provides:
  - Dynamic meta tag injection in index.html with api-token value
  - Cached index.html template read at startup
  - All Angular routes serve injected HTML
  - Static files unaffected by injection
affects: [S02, S03]
key_files:
  - src/python/web/web_app.py
  - src/python/tests/unittests/test_web/test_web_app.py
key_decisions:
  - "index.html cached at startup, not re-read per request"
  - "Meta tag injected via string replace on </head> — simple, no template engine"
patterns_established:
  - "_load_index_html / _inject_meta_tag pattern for dynamic static file serving"
drill_down_paths:
  - .gsd/milestones/M002/slices/S01/tasks/T02-PLAN.md
duration: 15min
verification_result: pass
completed_at: 2026-03-25T20:45:00Z
---

# T02: Bottle meta tag injection for Angular token delivery

**index.html dynamically injected with `<meta name="api-token">` at serve time; cached at startup, all Angular routes serve modified HTML**

## What Happened

Modified WebApp.__index() to read and cache index.html at startup, then inject a `<meta name="api-token" content="TOKEN">` tag before `</head>` on every request. When no token is configured, the content attribute is empty. All Angular routes (/, /dashboard, /settings, etc.) serve the injected version. Static files bypass injection and are still served via static_file(). Missing index.html returns 404 gracefully.

## Deviations

None.

## Files Created/Modified

- `src/python/web/web_app.py` — Added _load_index_html(), _inject_meta_tag(), modified __index()
- `src/python/tests/unittests/test_web/test_web_app.py` — 12 new meta tag injection tests + helper functions
