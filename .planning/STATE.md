# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-23)

**Core value:** Reliable file sync from seedbox to local with automated media library integration
**Current focus:** v3.2 Code Review Fixes — Phase 46: Code Review Fixes

## Current Position

Phase: 46 of 46 (Code Review Fixes)
Plan: 4 of 4 complete in current phase (01, 02, 03, 04)
Status: Phase 46 Plan 04 complete
Last activity: 2026-02-24 — Phase 46 Plan 04 complete (clearTimeout before _reconnectTimer reassignment CR-06; real unknown-event test CR-08; LogService uses LoggerService CR-09; RestService handleSuccess/handleError helpers CR-11)

Progress: [██████████] 100% (v3.1)

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
- 76 plans executed
- 15 days total (2026-02-03 to 2026-02-24)

**v3.1 so far:** 7 phases complete (phases 39-45), 23 plans (45-02 added)

**v3.2 so far:** 1 phase complete (phase 46), 4 plans

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
- [Phase 43-01]: escapeHtml applied to options.title and options.body before innerHTML interpolation — file names from remote server are the XSS vector; <b> tags in localization.ts render as literal text (FE-01)
- [Phase 43-01]: RestService.sendRequest uses pipe(map, catchError, shareReplay) directly on http.get() — eliminates Observable constructor wrapping a nested subscribe (FE-02)
- [Phase 43-02]: takeUntil/destroy$ pattern (FE-03/FE-07): all three components use destroy$ = new Subject<void>() + takeUntil(this.destroy$) on subscriptions; ngOnDestroy calls destroy$.next() and destroy$.complete()
- [Phase 43-02]: AppComponent constructor side-effect removed: router.events subscription moved from constructor into ngOnInit; constructor now has no subscription side-effects
- [Phase 43-02]: Manual _toastSubscription removed from AppComponent: converted to takeUntil pattern for uniformity; eliminates mixed subscription management styles
- [Phase 43-03]: AutoQueueService.remove reads fresh patterns.findIndex inside subscribe callback (FE-04): pre-request currentPatterns snapshot cannot be used post-response — stale index could remove wrong pattern if list changed during request
- [Phase 43-03]: StreamDispatchService implements OnDestroy with _reconnectTimer field (FE-05): both setTimeout paths (timeout-detected reconnect and error-handler reconnect) store handle in _reconnectTimer; ngOnDestroy clears interval, cancels timer, closes EventSource
- [Phase 43-03]: latestOptions property pattern in FileOptionsComponent (FE-06): one subscription in ngOnInit writes to public latestOptions + detectChanges() replaces 16 async pipe subscriptions — same observable, zero-cost property access under OnPush
- [Phase 44-01]: Inline _strtobool replaces distutils.util.strtobool (CODE-04): distutils removed in Python 3.12; inline function with identical boolean-string-to-int behavior; no new dependencies
- [Phase 44-01]: ModelFile.unfreeze() public method (CODE-11): eliminates name-mangling bypass pattern (_ModelFile__frozen = False) — clear intent, survives refactoring, symmetric with freeze()
- [Phase 44-01]: isinstance() over type() == (CODE-01): isinstance correctly handles subclasses, is idiomatic Python; replaced 12 instances across 7 setters in ModelFile
- [Phase 44-02]: pexpect.spawn with argv list (CODE-02): __run_command flags/args params changed from str to list; spawn called as spawn(command_args[0], command_args[1:]) — no shell involved, metacharacters in file paths are literal
- [Phase 44-02]: Local shell quoting removed from Sshcp.shell(): quoting was only needed for local shell expansion; without a shell, command string is forwarded as-is to the remote shell which handles quoting correctly
- [Phase 44-02]: logger.warning for TIMEOUT in lftp.py (CODE-08): TIMEOUT is semi-expected in long-running LFTP sessions; logger.exception replaced by logger.warning; bare pass removed — finally: block provides continuation
- [Phase 44-02]: time.sleep(0.01) in AppProcess.terminate busy-poll (CODE-05): 10ms polling interval prevents 100% CPU spin during process shutdown wait
- [Phase 44-05]: Docker test credential constants over inline strings (CODE-13): _TEST_USER/_TEST_PASSWORD module-level constants with documentation comment in integration test files; inline comments for mock unit test fake passwords — documentation not parameterization, since Docker test containers use intentionally fixed credentials
- [Phase 44-code-quality]: POST for queue/stop/extract (CODE-09): GET requests can be unintentionally triggered by browser prefetch and crawlers; POST prevents unintended side effects
- [Phase 44-code-quality]: Instance-level _bulk_request_times and _bulk_rate_lock (CODE-03): class-level state is shared across all handler instances; per-instance rate limiting is the correct semantics
- [Phase 44-code-quality]: ScannerResult/ExtractStatusResult/ExtractCompletedResult type annotations (CODE-06): replaces opaque Optional[object] with domain-specific types in controller _collect_scan_results and _collect_extract_results
- [Phase 44-code-quality]: BoundedOrderedSet type annotation for __downloaded_files with None init: set() lacks .touch() support; None correctly represents uninitialized state
- [Phase 44-code-quality]: clear() resets __downloaded_files = None (not .clear()): avoids mutating shared persist BoundedOrderedSet and wiping download history
- [Phase 44-code-quality]: has_downloadable_children flag in _are_all_children_downloaded: prevents empty/subdir-only directories from vacuously satisfying DOWNLOADED check
- [Phase 44-code-quality]: _set_import_status helper takes Model parameter: works for both new_model (pre-diff) and self.__model (live, under lock) — eliminates duplicated copy-unfreeze-set-update pattern (CODE-10)
- [Phase 45-01]: Version reference update scoped to Key Files entry only — Versioning Scheme table uses 1.0.0 as illustrative format strings, not current-version claims (DOCS-01)
- [Phase 45-01]: 504 entry placed after 500 in API Response Codes to preserve numeric order across all six codes (DOCS-02)
- [Phase 45-02]: Focus cancel button on open as safe default (setTimeout 0 lets DOM settle); user must explicitly choose OK (DOCS-03)
- [Phase 45-02]: Two-element focus trap handles boundary cases only: Tab at OK wraps to Cancel, Shift+Tab at Cancel wraps to OK; middle navigation is native browser behavior (DOCS-03)
- [Phase 45-02]: keydownHandler stored as private field for clean removeEventListener in destroyModal() (DOCS-03)
- [Phase 45-02]: previouslyFocusedElement saved at createModal() start, restored after DOM removal in destroyModal() — not before removal to avoid focus flicker (DOCS-03)
- [Phase 45-03]: ARIA grid/row pattern for file list: role=grid on container, role=row on file rows — matches tabular layout (DOCS-04)
- [Phase 45-03]: Dynamic aria-label combines name + capitalize(status) + optional ', selected' for full screen reader state announcement (DOCS-04)
- [Phase 45-03]: Clamp (no wrap) on ArrowDown/ArrowUp at list boundaries — reaching end stops, matches standard data grid behavior (DOCS-04)
- [Phase 45-03]: :focus-visible heuristic: .file:focus shows outline, .file:focus:not(:focus-visible) suppresses for mouse clicks (DOCS-04)
- [Phase 46-01]: webhook_secret redacted at serialization layer in _SENSITIVE_FIELDS["general"] — consistent with existing remote_password/sonarr_api_key/radarr_api_key pattern; internal code reads real value for HMAC-SHA256 (CR-01)
- [Phase 46-01]: getMessage() replaces record.msg in SerializeLogRecord — returns fully interpolated message string so format-arg passwords (logger.info('%s', password)) are caught by regex scrubbers before hitting SSE stream (CR-03)
- [Phase 46-03]: Tab handler restructured to single 'event.key === Tab' branch with unconditional preventDefault() — eliminates the conditional that allowed Tab to escape when focus was on modal container or any non-button element (CR-02)
- [Phase 46-03]: Four additional escapeHtml() calls added (okBtn, okBtnClass, cancelBtn, cancelBtnClass) — defense-in-depth; current callers pass static strings but prevents future injection if callers pass user input (CR-05)
- [Phase 46-04]: spyOnProperty for LoggerService.warn getter: spyOn cannot intercept getters on prototypes; spyOnProperty captures the getter call and returns a jasmine.createSpy() that production code invokes (CR-08 test fix)
- [Phase 46-04]: clearTimeout guard before _reconnectTimer reassignment at both sites: prevents ghost timer accumulation when reconnect is triggered while one is already pending (CR-06)
- [Phase 46-04]: LogService injects LoggerService for consistent error logging; eliminates direct console.error usage (CR-09)
- [Phase 46-04]: handleSuccess/handleError factory methods in RestService: each returns a closure over url, eliminates three copies of identical map/catchError blocks across sendRequest/post/delete (CR-11)

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
Stopped at: Completed 46-04-PLAN.md (clearTimeout guards CR-06; real unknown-event test with spyOnProperty CR-08; LogService LoggerService injection CR-09; RestService handleSuccess/handleError helpers CR-11)
Next action: Phase 46 Plan 04 complete. Check if remaining Phase 46 plans exist, or if phase is done.

---
*v3.1 Harden & Fix: phase 40 complete 2026-02-24 (all 3 plans executed); phase 41 plans 01-02 complete 2026-02-24; phase 42 all 4 plans complete 2026-02-23; phase 43 all 3 plans complete 2026-02-24; phase 44 all 5 plans complete 2026-02-24; phase 45 all 3 plans complete 2026-02-24*
*v3.2 Code Review Fixes: phase 46 all 3 plans complete 2026-02-24*
