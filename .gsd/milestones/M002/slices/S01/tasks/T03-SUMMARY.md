---
id: T03
parent: S01
milestone: M002
provides:
  - authInterceptor functional interceptor reading token from meta tag
  - Bearer header attached to all HttpClient requests
  - Token cached on first read
  - _resetAuthInterceptorCache() test utility
affects: []
key_files:
  - src/angular/src/app/services/utils/auth.interceptor.ts
  - src/angular/src/app/app.config.ts
  - src/angular/src/app/tests/unittests/services/utils/auth.interceptor.spec.ts
key_decisions:
  - "Functional interceptor over class-based — Angular recommendation"
  - "Token cached at module level, not per-request — DOM read is expensive"
patterns_established:
  - "Meta tag token injection + interceptor reading pattern for SPA auth"
drill_down_paths:
  - .gsd/milestones/M002/slices/S01/tasks/T03-PLAN.md
duration: 15min
verification_result: pass
completed_at: 2026-03-25T21:00:00Z
---

# T03: Angular functional auth interceptor

**Functional HttpInterceptorFn reads token from `<meta name="api-token">`, caches it, and attaches Bearer header to all outgoing requests**

## What Happened

Created a functional Angular HTTP interceptor that reads the API token from a meta tag injected by Bottle and attaches an Authorization: Bearer header to all HttpClient requests. Token is cached on first read. When no token is configured (empty or missing meta tag), requests pass through unchanged. Registered in app.config.ts via provideHttpClient(withInterceptors([authInterceptor])).

## Deviations

None.

## Files Created/Modified

- `src/angular/src/app/services/utils/auth.interceptor.ts` — New functional interceptor
- `src/angular/src/app/app.config.ts` — Added withInterceptors([authInterceptor])
- `src/angular/src/app/tests/unittests/services/utils/auth.interceptor.spec.ts` — 6 new tests
