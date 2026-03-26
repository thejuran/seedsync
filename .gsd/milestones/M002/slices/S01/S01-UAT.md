# S01: API Token Authentication — UAT

## Prerequisites

- SeedSync running locally or in Docker
- A config file with a generated api_token (auto-generated on first run)
- Note the token from the config file or startup log

## Test Script

### 1. Verify unauthenticated API request is blocked

```bash
curl -v http://localhost:8800/server/status
```

**Expected:** HTTP 401 Unauthorized

### 2. Verify authenticated API request succeeds

```bash
curl -v -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8800/server/status
```

**Expected:** HTTP 200 with status JSON

### 3. Verify SSE stream works without auth

Open in browser: `http://localhost:8800/server/stream`

**Expected:** SSE events flowing (model updates, heartbeat pings). No 401 error.

### 4. Verify Angular UI loads and functions

Open: `http://localhost:8800/`

**Expected:**
- File list page loads and shows files
- Navigate to Settings, Logs, About — all pages work
- No authentication errors in browser console
- Network tab shows Authorization: Bearer header on API requests

### 5. Verify token meta tag in HTML

```bash
curl -s http://localhost:8800/ | grep 'api-token'
```

**Expected:** `<meta name="api-token" content="YOUR_TOKEN">` present in HTML

### 6. Verify backward compatibility (no token)

Edit config, set `api_token = ` (empty). Restart SeedSync.

```bash
curl -v http://localhost:8800/server/status
```

**Expected:** HTTP 200 (no auth required). Startup log shows warning about no API token.

### 7. Verify startup log

Check the startup log for:
- `Security: API token configured — all /server/* endpoints require Bearer authentication` (when token set)
- OR `Security: No API token configured` warning (when token empty)
