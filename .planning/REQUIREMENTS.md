# Requirements: SeedSync

**Defined:** 2026-02-23
**Core Value:** Reliable file sync from seedbox to local with automated media library integration

## v3.1 Requirements

Requirements for v3.1 Harden & Fix. Each maps to roadmap phases.

### Security

- [x] **SEC-01**: RSA private key removed from repository and added to .gitignore (Finding 1, CWE-312)
- [x] **SEC-02**: SSH connections use StrictHostKeyChecking=accept-new with a known_hosts file instead of disabled verification (Finding 2, CWE-295)
- [ ] **SEC-03**: Webhook endpoints verify request authenticity via configurable HMAC secret (Finding 3, CWE-306)
- [ ] **SEC-04**: Config API redacts sensitive fields (remote_password, sonarr_api_key, radarr_api_key) from GET responses (Finding 4, CWE-200)
- [ ] **SEC-05**: Debug/verbose mode toggle protected — LFTP passwords redacted from SSE log stream when verbose enabled (Finding 6, CWE-15)
- [ ] **SEC-06**: Sonarr/Radarr test-connection endpoints validate URL scheme (http/https only) and block private IP ranges (Finding 7, CWE-918)
- [x] **SEC-07**: Remote scanner uses JSON deserialization instead of pickle (Finding 10, CWE-502)
- [ ] **SEC-08**: DeleteRemoteProcess escapes shell metacharacters in file paths (Finding 26)
- [ ] **SEC-09**: Web server sets Content-Security-Policy, X-Frame-Options, and X-Content-Type-Options headers (Finding 27)
- [ ] **SEC-10**: Internal error details not exposed in API responses to clients (Finding 28)

### Thread Safety

- [ ] **THRD-01**: Auto-delete timer callback acquires model lock before reading model (Finding 8)
- [ ] **THRD-02**: Webhook import check acquires model lock before reading/mutating model files (Finding 9)
- [ ] **THRD-03**: ExtractDispatch iterates task queue under Queue.mutex (Finding 13)
- [ ] **THRD-04**: ExtractDispatch uses context manager lock pattern and copy-under-lock per CLAUDE.md (Finding 22)

### Crash Prevention

- [ ] **CRASH-01**: propagate_exception calls exc.re_raise() without redundant outer raise (Finding 5)
- [ ] **CRASH-02**: _estimate_root_eta guards remote_size is None before arithmetic (Finding 11)
- [ ] **CRASH-03**: WebhookManager.process catches queue.Empty specifically instead of bare except (Finding 14)
- [ ] **CRASH-04**: SSE notifyEvent handles unknown event names without crashing subscription (Finding 15)
- [ ] **CRASH-05**: SSE handlers wrap JSON.parse in try/catch to prevent observable teardown (Finding 19)
- [ ] **CRASH-06**: Action endpoint callbacks use bounded timeout instead of indefinite wait (Finding 20)

### Frontend Quality

- [ ] **FE-01**: ConfirmModalService sanitizes file names before innerHTML insertion (Finding 12)
- [ ] **FE-02**: RestService uses RxJS pipe operators instead of nested subscribe in Observable constructor (Finding 17)
- [ ] **FE-03**: AppComponent router subscriptions stored and unsubscribed on destroy (Finding 18)
- [ ] **FE-04**: AutoQueueService.remove uses post-request state for index operations (Finding 25)
- [ ] **FE-05**: StreamServiceRegistry reconnect timers cancelled on service destroy (Finding 37)
- [ ] **FE-06**: file-options.component consolidates 16 async pipe subscriptions into single observable (Finding 38)
- [ ] **FE-07**: SettingsPage and AutoQueuePage observables properly unsubscribed on destroy (Finding 40)

### Code Quality

- [ ] **CODE-01**: ModelFile frozen bypass replaced with explicit unfreeze method instead of name-mangled access (Finding 16)
- [ ] **CODE-02**: pexpect.spawn receives argument list instead of shell-interpolated string (Finding 21, CWE-88)
- [ ] **CODE-03**: Rate limiter state uses instance variable instead of class-level mutable (Finding 23)
- [ ] **CODE-04**: distutils.strtobool replaced with inline implementation compatible with Python 3.12+ (Finding 24)
- [ ] **CODE-05**: AppProcess.terminate adds sleep interval to busy-poll loop (Finding 31)
- [ ] **CODE-06**: Controller return type annotations use proper tuple syntax (Finding 33)
- [ ] **CODE-07**: __downloaded_files type/usage corrected for set semantics (Finding 34)
- [ ] **CODE-08**: lftp.py logs pexpect.TIMEOUT instead of swallowing silently (Finding 35)
- [ ] **CODE-09**: Mutating endpoints (queue/stop/delete) use POST/DELETE HTTP methods (Finding 36)
- [ ] **CODE-10**: Import status management consolidated to single code path (Finding 39)
- [ ] **CODE-11**: type(x) == SomeType replaced with isinstance() across 12 instances (Finding 41)
- [ ] **CODE-12**: Directory DOWNLOADED state edge case handled correctly (Finding 29)
- [ ] **CODE-13**: Hardcoded test credentials parameterized or documented as intentional (Finding 30)

### Documentation & Accessibility

- [ ] **DOCS-01**: CLAUDE.md version reference updated from 1.0.0 to current version
- [ ] **DOCS-02**: API response codes 429 and 504 documented in CLAUDE.md
- [ ] **DOCS-03**: Confirm modal has focus trap and focus restoration on close (Finding 32)
- [ ] **DOCS-04**: File rows have keyboard navigation and ARIA labels for accessibility

## Future Requirements

### Deferred from Code Review

- **Lidarr/Readarr support** — same *arr integration pattern, separate milestone
- **E2E test coverage (Playwright)** — separate testing milestone

## Out of Scope

| Feature | Reason |
|---------|--------|
| Full authentication system | App relies on Tailscale/VPN for access control |
| HTTPS/TLS termination | Handled by reverse proxy or Tailscale |
| Database migration | No database in this application |
| Light mode restoration | Intentionally removed in v3.0 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 39 | Complete |
| SEC-02 | Phase 39 | Complete |
| SEC-07 | Phase 39 | Complete |
| SEC-03 | Phase 40 | Pending |
| SEC-04 | Phase 40 | Pending |
| SEC-05 | Phase 40 | Pending |
| SEC-06 | Phase 40 | Pending |
| SEC-08 | Phase 40 | Pending |
| SEC-09 | Phase 40 | Pending |
| SEC-10 | Phase 40 | Pending |
| THRD-01 | Phase 41 | Pending |
| THRD-02 | Phase 41 | Pending |
| THRD-03 | Phase 41 | Pending |
| THRD-04 | Phase 41 | Pending |
| CRASH-01 | Phase 42 | Pending |
| CRASH-02 | Phase 42 | Pending |
| CRASH-03 | Phase 42 | Pending |
| CRASH-04 | Phase 42 | Pending |
| CRASH-05 | Phase 42 | Pending |
| CRASH-06 | Phase 42 | Pending |
| FE-01 | Phase 43 | Pending |
| FE-02 | Phase 43 | Pending |
| FE-03 | Phase 43 | Pending |
| FE-04 | Phase 43 | Pending |
| FE-05 | Phase 43 | Pending |
| FE-06 | Phase 43 | Pending |
| FE-07 | Phase 43 | Pending |
| CODE-01 | Phase 44 | Pending |
| CODE-02 | Phase 44 | Pending |
| CODE-03 | Phase 44 | Pending |
| CODE-04 | Phase 44 | Pending |
| CODE-05 | Phase 44 | Pending |
| CODE-06 | Phase 44 | Pending |
| CODE-07 | Phase 44 | Pending |
| CODE-08 | Phase 44 | Pending |
| CODE-09 | Phase 44 | Pending |
| CODE-10 | Phase 44 | Pending |
| CODE-11 | Phase 44 | Pending |
| CODE-12 | Phase 44 | Pending |
| CODE-13 | Phase 44 | Pending |
| DOCS-01 | Phase 45 | Pending |
| DOCS-02 | Phase 45 | Pending |
| DOCS-03 | Phase 45 | Pending |
| DOCS-04 | Phase 45 | Pending |

**Coverage:**
- v3.1 requirements: 44 total
- Mapped to phases: 44
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-23*
*Last updated: 2026-02-23 — traceability filled after roadmap creation*
