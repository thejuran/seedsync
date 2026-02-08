# Requirements: v1.5 Backend Testing

## Must Have

- **REQ-01**: Add pytest-cov dependency and coverage configuration to pyproject.toml
- **REQ-02**: Establish baseline coverage measurement with HTML and terminal reports
- **REQ-03**: Unit tests for all common module gaps (constants, context, error, localization, types)
- **REQ-04**: Unit tests for controller.py covering command queuing, model operations, listener callbacks, and error handling
- **REQ-05**: Unit tests for controller_job.py covering Job lifecycle contract
- **REQ-06**: Unit tests for all web handler gaps (auto_queue, config, server, status, stream_heartbeat, stream_model, stream_status)
- **REQ-07**: All existing 711 tests continue passing (zero regressions)
- **REQ-08**: Create conftest.py with shared fixtures (logger setup, common mocks)

## Should Have

- **REQ-09**: Coverage threshold enforced in pytest config (fail if below baseline)
- **REQ-10**: Improve test quality — extract repeated patterns into shared fixtures and factories
- **REQ-11**: Add Make target for local coverage reporting (`make coverage`)

## Out of Scope

- E2E tests (Playwright) — separate concern
- Angular unit tests — frontend, not backend
- Performance testing / load testing
- Refactoring production code to improve testability (test what exists)
- Adding type annotations to Python code
- CI/CD pipeline changes (coverage gates in GitHub Actions)

## Constraints

- Tests must run with `poetry run pytest` (no Docker required for unit tests)
- Use existing test patterns (unittest.TestCase style) for consistency
- Mock external dependencies (LFTP, SSH, filesystem) — no real I/O in unit tests
- Keep test timeout at 60s (existing pytest-timeout config)
- New test files follow existing naming convention: `test_<module>.py`

## Success Criteria

1. `poetry run pytest` passes all tests (existing + new)
2. Coverage report generated with `poetry run pytest --cov`
3. Common module has 100% test coverage
4. Controller module has unit tests (not just integration)
5. All web handlers have unit tests (not just integration)
6. Shared fixtures reduce test boilerplate
7. Coverage baseline established and documented

---
*Created: 2026-02-08*
*Milestone: v1.5 Backend Testing*
