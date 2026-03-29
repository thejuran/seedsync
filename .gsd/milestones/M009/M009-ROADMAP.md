# M009: Full Codebase Deep Review Fixes

**Vision:** Address all 55 issues from the full-codebase TuringMind deep review — 2 security (command injection), 5 concurrency/data bugs, 3 frontend bugs, credential logging, and 44 code quality/style fixes across Python and TypeScript.

## Success Criteria

- No command injection vectors in LFTP escape() or remote scanner shell commands
- All model/dict access protected by locks in multi-threaded paths
- SSE subscription lifecycle properly managed
- Credentials redacted from debug logs
- All 401+ unit tests pass, `ng build` clean, Python tests pass
- CI fully green

## Key Risks / Unknowns

- SEC-1/SEC-2 changes touch LFTP and SSH command paths — must verify file operations still work with special characters in filenames
- BUG-1/PY-1 lock changes could introduce deadlocks if lock ordering is wrong
- BUG-4 parent ref fix changes ModelFile internals — need to verify freeze/unfreeze semantics

## Verification Classes

- Contract verification: Python unit tests, Angular unit tests (401+), `ng build` clean
- Integration verification: Full CI pipeline (unit + E2E + builds)
- Operational verification: `:dev` Docker image deployed and functional
- UAT / human verification: Settings page, file operations, pattern management all work

## Milestone Definition of Done

This milestone is complete only when all are true:

- All 55 issues addressed (fixed or documented as intentional)
- No regressions in unit tests or E2E tests
- CI fully green
- `:dev` image published

## Slices

- [ ] **S01: Security — command injection fixes** `risk:high` `depends:[]`
  > After this: LFTP escape() rejects newline/CR/null characters; remote scanner shell commands use shlex.quote(); credentials redacted from debug logs
- [ ] **S02: Concurrency & data integrity fixes** `risk:high` `depends:[]`
  > After this: Model reads in __process_commands are locked; __pending_auto_deletes has its own threading.Lock; shallow copy fixes parent references; webhook import loop lock optimization
- [ ] **S03: Frontend bugs & TypeScript fixes** `risk:medium` `depends:[]`
  > After this: SSE subscription stored and cancelled on reconnect; view-file indices updated on add; pexpect TIMEOUT handled; inner Observable subscription connected to teardown; all TS quality items fixed
- [ ] **S04: Python code quality & style fixes** `risk:low` `depends:[]`
  > After this: Bare except handlers narrowed; BFS uses deque; log levels corrected; Optional types specified; pexpect process closed on exception; version files synced; remaining Python quality items addressed

## Boundary Map

### S01

Produces:
- Hardened lftp.py escape() function
- Quoted shell commands in remote_scanner.py
- Redacted credentials in context.py print_to_log()

Consumes:
- nothing (independent)

### S02

Produces:
- Thread-safe model access in controller __process_commands
- Thread-safe __pending_auto_deletes with dedicated lock
- Fixed shallow-copy parent references in ModelFile
- Optimized lock scope in webhook import loop

Consumes:
- nothing (independent)

### S03

Produces:
- Managed SSE subscription lifecycle in stream-service.registry.ts
- Fixed view-file.service.ts index update on file-add
- Safe pexpect TIMEOUT handling in lftp.py
- Fixed inner Observable subscription in bulk-command.service.ts
- All remaining TS quality items

Consumes:
- nothing (independent)

### S04

Produces:
- Narrowed exception handlers in webhook.py and config.py
- deque.popleft() replacing list.pop(0) in BFS traversals
- Corrected log levels (INFO→DEBUG for per-file logging)
- Concrete Optional types replacing Optional[object]
- Version sync across package.json, debian/changelog
- All remaining Python quality items

Consumes:
- nothing (independent)
