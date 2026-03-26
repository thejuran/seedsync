---
estimated_steps: 6
estimated_files: 3
---

# T02: Bottle meta tag injection for Angular token delivery

**Slice:** S01 — API Token Authentication
**Milestone:** M002

## Description

Modify WebApp.__index() to dynamically inject a `<meta name="api-token" content="TOKEN">` tag into index.html at serve time. This solves the token bootstrap problem — Angular needs the token before it can make any authenticated API call, and EventSource can't send custom headers.

## Steps

1. Read current __index() and __static() in web_app.py
2. Modify WebApp.__init__() to read and cache index.html content from self._html_path at startup
3. Modify __index() to:
   - Take the cached index.html content
   - Inject `<meta name="api-token" content="TOKEN_VALUE">` before `</head>`
   - If api_token is empty, inject `<meta name="api-token" content="">`
   - Return the modified content as an HTTPResponse with Content-Type text/html; charset=UTF-8
   - Do NOT use static_file() for index.html anymore (other static files still use static_file)
4. Handle the case where index.html doesn't exist yet (dev mode, build not run) — return 404 gracefully
5. Write tests in test_web_app.py:
   - index.html response contains <meta name="api-token" content="TOKEN">
   - Meta tag has correct token value from config
   - Empty token produces empty content attribute
   - All Angular routes (/, /dashboard, /settings, /logs, /about) serve injected index.html
   - Static files other than index.html are still served via static_file()
6. Verify existing security header tests still pass (after_request hook still fires)

## Must-Haves

- [ ] index.html contains api-token meta tag with correct token value
- [ ] Empty config token → meta tag with empty content
- [ ] All Angular routes serve the injected index.html
- [ ] Other static files unaffected (still served by static_file)
- [ ] Content-Type is text/html; charset=UTF-8
- [ ] All existing web_app tests still pass

## Verification

- `cd src/python && python -m pytest tests/unittests/test_web/test_web_app.py -v`
- `cd src/python && python -m pytest tests/unittests/test_web/ -v`

## Observability Impact

- Signals added/changed: None (meta tag is silent, read by Angular)
- How a future agent inspects this: curl / and check for <meta name="api-token"> in HTML response
- Failure state exposed: Missing meta tag → Angular interceptor won't attach token → 401 on all API calls (visible symptom)

## Inputs

- `src/python/web/web_app.py` — T01's modified WebApp with config and auth hook
- `src/angular/src/index.html` — Static template to inject into

## Expected Output

- `src/python/web/web_app.py` — Modified __index() with meta tag injection, cached index.html content
- `src/python/tests/unittests/test_web/test_web_app.py` — New tests for meta tag injection
