# S02: CONF-04 Fix + DNS Rebinding Prevention

**Goal:** Settings UI displays real config values (not **REDACTED**) for authenticated requests, and Host header validation blocks DNS rebinding attacks.
**Demo:** Settings page shows actual server address, username, path. Curl with foreign Host header → 400. Configurable allowed_hostname works.

## Must-Haves

- Authenticated GET /server/config/get returns unredacted values
- Unauthenticated/no-token GET returns redacted values (unchanged behavior)
- Settings UI displays real values and saves correctly
- Host header validation in before_request: localhost, 127.0.0.1, [::1] allowed
- Non-allowlisted Host → 400 with empty body
- Config.General.allowed_hostname field for reverse proxy support
- Configured hostname passes Host validation

## Proof Level

- This slice proves: integration
- Real runtime required: yes (webtest)
- Human/UAT required: no

## Verification

- `cd src/python && python3 -m pytest tests/unittests/test_web/test_serialize/test_serialize_config.py -v`
- `cd src/python && python3 -m pytest tests/unittests/test_web/test_auth.py -v` — Host validation tests added here
- `cd src/python && python3 -m pytest tests/unittests/test_web/ -v --ignore=tests/unittests/test_web/test_serialize/test_serialize_model.py --ignore=tests/unittests/test_web/test_serialize/test_serialize_status.py`

## Observability / Diagnostics

- Runtime signals: 400 response on invalid Host (no body, no information leak)
- Inspection surfaces: Config.General.allowed_hostname readable in config file
- Failure visibility: 400 on blocked Host; Settings UI showing **REDACTED** = auth not working
- Redaction constraints: Unredacted config only returned when request.auth_valid is True

## Integration Closure

- Upstream surfaces consumed: request.auth_valid flag from S01, Config from WebApp
- New wiring: Host header check in before_request, authenticated parameter in SerializeConfig
- What remains: S03 (CSP hardening)

## Tasks

- [x] **T01: Conditional config redaction and Host header validation** `est:40m`
  - Why: Fixes CONF-04 (Settings UI shows **REDACTED**) and adds DNS rebinding prevention — both depend on the auth state from S01
  - Files: `src/python/web/serialize/serialize_config.py`, `src/python/web/handler/config.py`, `src/python/web/web_app.py`, `src/python/common/config.py`, `src/python/seedsync.py`, `src/python/tests/unittests/test_web/test_serialize/test_serialize_config.py`, `src/python/tests/unittests/test_web/test_auth.py`, `src/python/tests/unittests/test_seedsync.py`
  - Do: (1) Add `authenticated` param to SerializeConfig.config() — skip redaction when True. (2) Update ConfigHandler.__handle_get_config() to pass bottle.request.auth_valid. (3) Add Config.General.allowed_hostname field with empty default. (4) Add Host header validation to before_request in WebApp — check against allowlist [localhost, 127.0.0.1, [::1], config.general.allowed_hostname], strip port before comparison, return 400 with empty body on mismatch. Host validation runs before auth check. (5) Update default config and backward compat. (6) Write tests for conditional redaction and Host validation.
  - Verify: `cd src/python && python3 -m pytest tests/unittests/test_web/ -v --ignore=tests/unittests/test_web/test_serialize/test_serialize_model.py --ignore=tests/unittests/test_web/test_serialize/test_serialize_status.py`
  - Done when: Authenticated config requests return unredacted values, unauthenticated return redacted, Host validation blocks non-allowlisted hosts, all tests pass

## Files Likely Touched

- `src/python/web/serialize/serialize_config.py`
- `src/python/web/handler/config.py`
- `src/python/web/web_app.py`
- `src/python/common/config.py`
- `src/python/seedsync.py`
- `src/python/tests/unittests/test_web/test_serialize/test_serialize_config.py`
- `src/python/tests/unittests/test_web/test_auth.py`
- `src/python/tests/unittests/test_seedsync.py`
