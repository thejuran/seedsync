---
estimated_steps: 7
estimated_files: 5
---

# T03: Angular functional interceptor and integration verification

**Slice:** S01 — API Token Authentication
**Milestone:** M002

## Description

Create a functional Angular HTTP interceptor that reads the API token from the injected `<meta name="api-token">` tag and attaches an Authorization: Bearer header to all outgoing HttpClient requests. Register it via provideHttpClient(withInterceptors([...])).

## Steps

1. Create `src/angular/src/app/services/utils/auth.interceptor.ts`:
   - Export a functional interceptor `authInterceptor` matching the `HttpInterceptorFn` signature
   - On first call, read token from `document.querySelector('meta[name="api-token"]')?.getAttribute('content')`
   - Cache the token value (read once from DOM)
   - If token is non-empty, clone the request with `setHeaders: { Authorization: 'Bearer ' + token }`
   - If token is empty or meta tag missing, pass request through unchanged
   - Call `next(req)` to continue the chain
2. Update `src/angular/src/app/app.config.ts`:
   - Import `withInterceptors` from `@angular/common/http`
   - Import `authInterceptor` from `./services/utils/auth.interceptor`
   - Change `provideHttpClient()` to `provideHttpClient(withInterceptors([authInterceptor]))`
3. Create test file `src/angular/src/app/tests/unittests/services/utils/auth.interceptor.spec.ts`:
   - Test: when meta tag has token, Authorization header is added to outgoing request
   - Test: when meta tag has empty content, no Authorization header added
   - Test: when meta tag is missing, no Authorization header added
   - Test: existing request headers are preserved (not clobbered)
   - Use Angular's HttpClientTestingModule / provideHttpClientTesting
4. Run all existing Angular unit tests to verify no regressions
5. Verify the mock-rest.service.ts test mock still works (interceptor shouldn't affect mocked HttpClient)
6. Check that RestService tests pass with interceptor registered
7. Final pass: run full Python test suite to confirm nothing broke on the backend side

## Must-Haves

- [ ] authInterceptor exported as functional HttpInterceptorFn
- [ ] Token read from <meta name="api-token"> and cached
- [ ] Bearer header attached when token present
- [ ] No header attached when token empty or meta tag missing
- [ ] Registered in app.config.ts via withInterceptors
- [ ] All existing Angular tests pass
- [ ] All existing Python tests pass

## Verification

- `cd src/angular && npx ng test --watch=false`
- `cd src/python && python -m pytest tests/unittests/ -v`

## Observability Impact

- Signals added/changed: None (interceptor is transparent)
- How a future agent inspects this: Browser DevTools Network tab shows Authorization header on API requests
- Failure state exposed: Missing interceptor → 401 on all API calls → Angular services report WebReaction with success=false

## Inputs

- `src/angular/src/app/app.config.ts` — Current providers setup
- `src/angular/src/app/services/utils/rest.service.ts` — RestService uses HttpClient (interceptor applies)
- T02's meta tag injection in index.html (interceptor reads from it)

## Expected Output

- `src/angular/src/app/services/utils/auth.interceptor.ts` — New functional interceptor
- `src/angular/src/app/app.config.ts` — Modified with withInterceptors registration
- `src/angular/src/app/tests/unittests/services/utils/auth.interceptor.spec.ts` — New test file
