# S02: CONF-04 Fix + DNS Rebinding — UAT

## 1. Settings UI shows real values

Open Settings page while authenticated. Verify:
- Server Address shows the real hostname (not **REDACTED**)
- Server Username shows the real username
- Server Path shows the real path
- Sonarr/Radarr API keys show real values

## 2. Unauthenticated config still redacted

```bash
curl http://localhost:8800/server/config/get
```

Expected: 401 (if token configured) or redacted values (if no token)

## 3. DNS rebinding blocked

```bash
curl -H "Host: evil.com" http://localhost:8800/server/status
```

Expected: HTTP 400

## 4. Localhost works

```bash
curl -H "Host: localhost:8800" -H "Authorization: Bearer TOKEN" http://localhost:8800/server/status
```

Expected: HTTP 200

## 5. Allowed hostname works

Set `allowed_hostname = myhost.local` in config. Restart.

```bash
curl -H "Host: myhost.local" -H "Authorization: Bearer TOKEN" http://localhost:8800/server/status
```

Expected: HTTP 200
