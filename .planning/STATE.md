# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Reliable file sync from seedbox to local with automated media library integration
**Current focus:** v3.1 Harden & Fix — Phase 43: Frontend Quality

## Current Position

Phase: 43 of 45 (Frontend Quality)
Plan: 2 of 3 complete in current phase
Status: Phase 43 plan 02 complete
Last activity: 2026-02-24 — Phase 43 Plan 02 complete (subscription leak fixes: takeUntil/destroy$ in AppComponent, SettingsPage, AutoQueuePage)

Progress: [██████░░░░] 60% (v3.1)

## Milestones Shipped

| Milestone | Phases | Date |
|-----------|--------|------|
| v1.0 Unify UI Styling | 1-5 | 2026-02-03 |
| v1.1 Dropdown & Form Migration | 6-8 | 2026-02-04 |
| v1.2 UI Cleanup | 9 | 2026-02-04 |
| v1.3 Polish & Clarity | 10-11 | 2026-02-04 |
| v1.4 Sass @use Migration | 12-14 | 2026-02-08 |
| v1.5 Backend Testing | 15-19 | 2026-02-08 |
| v1.6 CI Cleanup | 20-21 | 2026-02-10 |
| v1.7 Sonarr Integration | 22-25 | 2026-02-10 |
| v1.8 Radarr + Webhooks | 26-28 | 2026-02-11 |
| v2.0 Dark Mode & Polish | 29-32 | 2026-02-12 |
| v2.0.1 Hotfix: Webhook Child Matching | — | 2026-02-14 |
| v3.0 Terminal UI Overhaul | 33-38 | 2026-02-17 |

## Performance Metrics

**Total Project:**
- 12 milestones shipped
- 42 phases complete (phases 1-42)
- 75 plans executed
- 15 days total (2026-02-03 to 2026-02-24)

**v3.1 so far:** 4 phases complete + phase 43 in progress, 12 plans

## Accumulated Context

### Decisions

- **SSH TOFU mode:** Use StrictHostKeyChecking=accept-new (Trust On First Use) rather than reject-all — preserves first-connect usability while blocking MITM on subsequent connections
- **UserKnownHostsFile removed:** Removed /dev/null redirect so known_hosts persists across reconnects
- **MITM detection:** Added REMOTE HOST IDENTIFICATION HAS CHANGED pattern in both pexpect branches (password and key-auth paths) in sshcp.py
- **Test exception documented:** test/python/Dockerfile keeps StrictHostKeyChecking=no for ephemeral localhost test container — documented with explicit comment
- **Pickle replaced with JSON (CWE-502):** SystemFile uses to_dict/from_dict; scan_fs outputs json.dumps; remote_scanner uses json.loads — eliminates RCE vector from untrusted SSH stdout
- **Error message format-agnostic:** Changed "Invalid pickled data" to "Invalid scan data" to avoid leaking transport format details
- **Redact at serialization layer:** Sensitive config fields (remote_password, sonarr_api_key, radarr_api_key) redacted in SerializeConfig.config() not at storage layer — internal code still reads real values
- **Preserve field keys in API response:** Use **REDACTED** value (not omit key) so frontend knows fields exist and can render edit controls
- **Scrub SSE at SerializeLogRecord:** Log stream password scrubbing applied in SerializeLogRecord.record() to cover both live and cached history paths
- **webhook_secret in Config.General (shared):** Single shared webhook secret for all webhook sources (Sonarr/Radarr) placed on Config.General — simpler than per-service secrets
- **Empty webhook_secret skips HMAC verification:** Backward compat for existing installs — no secret = no verification; configured secret = strict HMAC-SHA256 check with 401 on failure
- **Security headers via after_request hook:** CSP, X-Frame-Options, X-Content-Type-Options injected on all Bottle responses via a single after_request hook — zero-touch, applies to all routes automatically
- **SSRF via socket.getaddrinfo:** Hostname resolution before outbound requests catches hostnames resolving to private IPs — not just literal private IP addresses in the URL
- **Generic except never leaks details:** Generic exception handlers return static "An unexpected error occurred" — str(e) dropped entirely to prevent internal detail exposure (SEC-10)
- **shlex.quote over manual quoting:** `shlex.quote(file_path)` replaces `'%s'` for shell commands — handles embedded single quotes that break naive wrapping (SEC-08)
- **delete_local outside model lock (THRD-01):** Timer callback acquires lock only for get_file, then releases before delete_local — holding lock across subprocess spawn would starve model updates; ModelFile freeze-on-add makes post-lock use safe
- **Two-window lock in __check_webhook_imports (THRD-02):** Window 1 = name_to_root BFS build under lock; Window 2 = update_file per import under lock; webhook Queue processing and Timer scheduling outside lock
- [Phase 41-02]: Queue mutex pattern: all __task_queue.queue accesses wrapped in with self.__task_queue.mutex in ExtractDispatch (THRD-03)
- [Phase 41-02]: Copy-under-lock for ExtractDispatch listeners: snapshot in with self.__listeners_lock, iterated outside — prevents RuntimeError (THRD-04)
- [Phase 41-02]: TOCTOU window in extract() accepted: duplicate check under mutex then put() has narrow race; worst case is double extraction matching prior behavior
- [Phase 42-02]: Map.has() guard before Map.get().notifyEvent() in StreamDispatchService: unknown SSE event names log a warning instead of crashing the observable subscription (CRASH-04)
- [Phase 42-02]: try/catch wraps JSON.parse in ModelFileService.parseEvent(), ServerStatusService.parseStatus(), LogService.onEvent() — malformed JSON logged and skipped, stream continues (CRASH-05)
- [Phase 42-02]: LoggerService injected into ServerStatusService for consistent error logging on malformed JSON
- [Phase 42-03]: _ACTION_TIMEOUT = 30.0 on ControllerHandler: 30s bounds individual action endpoint waits; timed-out commands return HTTP 504; mirrors bulk endpoint pattern (CRASH-06)
- [Phase 42-01]: propagate_exception outer raise removed (CRASH-01): exc.re_raise() raises internally; outer raise was unreachable and could produce TypeError
- [Phase 42-01]: WebhookManager bare except replaced with except Empty (CRASH-03): bare except masks SystemExit/KeyboardInterrupt/programming errors
- [Phase 42-01]: remote_size None guard in _estimate_root_eta (CRASH-02): guard added before subtraction to prevent TypeError when remote scanner hasn't returned size
- [Phase 43-02]: takeUntil/destroy$ pattern (FE-03/FE-07): all three components use destroy$ = new Subject<void>() + takeUntil(this.destroy$) on subscriptions; ngOnDestroy calls destroy$.next() and destroy$.complete()
- [Phase 43-02]: AppComponent constructor side-effect removed: router.events subscription moved from constructor into ngOnInit; constructor now has no subscription side-effects
- [Phase 43-02]: Manual _toastSubscription removed from AppComponent: converted to takeUntil pattern for uniformity; eliminates mixed subscription management styles

### Todos

None.

### Blockers

None.

## Tech Debt

- Bootstrap 5.3 still uses @import internally (blocked until Bootstrap 6)
- `make run-tests-python` Docker build fails on arm64 (Apple Silicon) — `rar` package amd64-only; CI unaffected
- WAITING_FOR_IMPORT enum exists as structural placeholder (no business logic sets it yet)

## Session Continuity

Last session: 2026-02-24
Stopped at: Completed 43-02-PLAN.md (subscription leak fixes: takeUntil/destroy$ in AppComponent, SettingsPage, AutoQueuePage)
Next action: Execute 43-03-PLAN.md

---
*v3.1 Harden & Fix: phase 40 complete 2026-02-24 (all 3 plans executed); phase 41 plans 01-02 complete 2026-02-24; phase 42 all 4 plans complete 2026-02-23; phase 43 plans 01-02 complete 2026-02-24*
