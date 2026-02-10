# Technology Stack: Sonarr Integration

**Project:** SeedSync - Sonarr API Integration (v1.7)
**Research Focus:** Stack additions for Sonarr API integration and auto-delete features
**Researched:** 2026-02-10
**Overall Confidence:** HIGH

## Executive Summary

The Sonarr integration requires minimal stack additions to the existing SeedSync Python/Angular stack. The Python backend already has `requests ^2.32.5` for HTTP operations. For production robustness, adding `pyarr ^5.2.0` provides a battle-tested Sonarr API client with proper error handling and pagination support. The Angular frontend needs `ngx-toastr ^19.1.0` for in-app toast notifications. Webhook handling works with existing Bottle framework (no new dependencies).

**Key finding:** Stack additions are minimal and align with existing technology choices (synchronous Python HTTP client, Bootstrap-compatible Angular notifications).

## Existing Stack (DO NOT ADD)

### Already Available for Sonarr Integration

| Component | Current Version | Use For | Why Sufficient |
|-----------|----------------|---------|----------------|
| **requests** | ^2.32.5 | HTTP client for Sonarr API | Industry standard, synchronous, already in pyproject.toml |
| **bottle** | ^0.13.4 | Webhook endpoint handling | POST body parsing via `request.json`, no special webhook libraries needed |
| **@angular/animations** | ^19.2.18 | Toast notification animations | Required peer dependency for ngx-toastr, already installed |
| **bootstrap** | ^5.3.3 | Notification styling | ngx-toastr has Bootstrap 5 theme support built-in |
| **pytest** | ^7.4.4 | Testing HTTP mocking | Works with requests library for unit testing API calls |

**Implication:** The project has most infrastructure needed. Only add Sonarr-specific client library and notification UI component.

## Recommended Stack Additions

### Core: Python Sonarr API Client (OPTIONAL BUT RECOMMENDED)

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **pyarr** | ^5.2.0 | Sonarr/Radarr/Lidarr API wrapper | Production-stable, handles pagination, JSON responses, error handling, actively maintained (200+ stars) |

**Installation:**
```bash
cd src/python
poetry add pyarr@^5.2.0
```

**Why pyarr over raw requests:**
- **Type safety:** Returns JSON dicts with documented structure
- **Pagination handling:** Built-in support for `get_history()` and `get_queue()` pagination
- **Error handling:** Wraps API errors with meaningful exceptions
- **Battle-tested:** Used by Home Assistant, Notifiarr, and other production systems
- **Maintenance:** Last release July 2023, stable (not abandoned)

**Why NOT pyarr:**
- **Stale maintenance:** No releases in 18 months (but API stable)
- **Synchronous only:** No async support (fine for SeedSync's sync architecture)
- **If you prefer control:** Raw `requests` works fine for simple polling

**Alternative: Use raw requests library (ACCEPTABLE)**

If keeping dependencies minimal:
```python
import requests

def get_sonarr_history(sonarr_url: str, api_key: str, page: int = 1):
    response = requests.get(
        f"{sonarr_url}/api/v3/history",
        params={"page": page, "pageSize": 50, "sortKey": "date", "sortDir": "desc"},
        headers={"X-Api-Key": api_key},
        timeout=10
    )
    response.raise_for_status()
    return response.json()
```

**Verdict:** Use `pyarr` for production. Use raw `requests` for MVP/prototype.

**Confidence:** HIGH (verified with PyPI, official docs)

**Sources:**
- [pyarr on PyPI](https://pypi.org/project/pyarr/) - Latest version 5.2.0
- [pyarr documentation](https://docs.totaldebug.uk/pyarr/modules/sonarr.html) - SonarrAPI methods
- [GitHub totaldebug/pyarr](https://github.com/totaldebug/pyarr) - Source code and examples

### UI: Angular Toast Notifications

| Library | Version | Purpose | Why Recommended |
|---------|---------|---------|-----------------|
| **ngx-toastr** | ^19.1.0 | Toast notifications for import events | Angular 19 compatible (>=17, <23), Bootstrap 5 theme included, 200K+ weekly downloads, actively maintained |

**Installation:**
```bash
cd src/angular
npm install ngx-toastr@^19.1.0
```

**Why ngx-toastr:**
- **Angular 19 compatible:** Version 19.x supports Angular 17-22
- **Bootstrap 5 integration:** Built-in Bootstrap 5 theme matches existing UI
- **Production-ready:** 200,000+ weekly npm downloads
- **Actively maintained:** Version 20.x released 3 days ago (we use 19.x for Angular 19)
- **Flexible:** Supports success, error, warning, info toast types
- **Configurable:** Timeout, position, animations, max toasts, etc.

**Integration with existing Angular:**
```typescript
// app.config.ts (standalone components pattern)
import { provideToastr } from 'ngx-toastr';

export const appConfig: ApplicationConfig = {
  providers: [
    provideToastr({
      timeOut: 5000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      // Use Bootstrap 5 theme
      toastClass: 'ngx-toastr toast',
      iconClasses: {
        error: 'toast-error',
        info: 'toast-info',
        success: 'toast-success',
        warning: 'toast-warning',
      },
    }),
  ],
};

// In component
import { ToastrService } from 'ngx-toastr';

constructor(private toastr: ToastrService) {}

showImportNotification(episodeName: string) {
  this.toastr.success(`${episodeName} imported to Sonarr`, 'Import Complete');
}
```

**Styles required (add to styles.scss):**
```scss
// Import ngx-toastr CSS (uses @import because it's third-party)
@import 'ngx-toastr/toastr-bs5-alert';  // Bootstrap 5 theme
```

**Alternatives considered:**
- **angular-notifier:** Outdated (last release 3 years ago), not Angular 19 compatible
- **ng-bootstrap toasts:** Requires manual service creation, less feature-rich
- **Custom service:** Reinventing the wheel, maintenance burden

**Confidence:** HIGH (verified with npm search, GitHub releases, documentation)

**Sources:**
- [ngx-toastr on npm](https://www.npmjs.com/package/ngx-toastr) - Version 19.1.0 details
- [ngx-toastr GitHub releases](https://github.com/scttcper/ngx-toastr/releases) - Angular compatibility
- [ngx-toastr demo](https://ngx-toastr.vercel.app/) - Live examples

## What NOT to Add

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **httpx** | Async HTTP client adds complexity SeedSync doesn't need | Existing `requests` library (synchronous matches Manager pattern) |
| **sonarr-py (devopsarr)** | Auto-generated from OpenAPI, less Pythonic, 10x fewer GitHub stars | `pyarr` (community-maintained, better docs) |
| **aiohttp** | Async HTTP requires async/await rewrite of all Managers | Keep synchronous architecture |
| **Dedicated webhook library** | Bottle handles POST JSON natively via `request.json` | Bottle's built-in `request.json` |
| **angular2-notifications** | Outdated predecessor to ngx-toastr | `ngx-toastr` (modern, maintained) |
| **Custom notification service** | Maintenance burden, duplicates ngx-toastr features | `ngx-toastr` (battle-tested) |
| **Socket.io / SSE for Sonarr events** | Sonarr doesn't push events, polling is standard pattern | HTTP polling with configurable interval |

## Integration with Existing Architecture

### Python Backend: SonarrManager Pattern

The new `SonarrManager` follows existing Manager conventions:

**Fits existing patterns:**
- **ScanManager:** Uses `pexpect` subprocess for scanner, blocking calls
- **LftpManager:** Uses `lftp` via `pexpect` subprocess, blocking calls
- **FileOperationManager:** Uses `patool` for extraction, blocking calls
- **SonarrManager (NEW):** Uses `requests` or `pyarr` for HTTP calls, blocking calls

**Thread model:** Manager runs in dedicated thread with periodic polling (like ScanManager's periodic scans).

**Existing config pattern:**
```python
# Follows InnerConfig pattern from common/config.py
class SonarrInnerConfig:
    url: str = ""
    api_key: str = ""
    enabled: bool = False
    poll_interval_seconds: int = 60
```

**Integration point:** Controller instantiates SonarrManager, adds listener for import events, updates ModelBuilder.

### Angular Frontend: Settings UI + Notifications

**Fits existing patterns:**
- **Settings form:** Follows existing `settings` component with INI-style form controls
- **Notifications:** ngx-toastr integrates with existing Bootstrap 5 styling
- **Status display:** Follows existing `file-list` component display patterns

**No new architectural patterns needed:** Settings tab, toast service, status column in file list.

## Webhook Handling (NO NEW DEPENDENCIES)

### Bottle Framework Already Sufficient

Sonarr webhooks send JSON POST requests. Bottle handles this natively:

```python
from bottle import post, request

@post('/api/sonarr/webhook')
def sonarr_webhook():
    """Handle Sonarr webhook for import events"""
    payload = request.json  # Bottle parses JSON body automatically

    if payload.get('eventType') == 'Download':
        # Extract episode info from payload
        series_title = payload['series']['title']
        episode_file = payload['episodeFile']['relativePath']

        # Trigger delete via FileOperationManager
        controller.handle_sonarr_import(episode_file)

        return {'status': 'ok'}

    return {'status': 'ignored'}
```

**Why no webhook library needed:**
- Bottle's `request.json` parses POST body
- No signature verification needed (Sonarr is local network)
- Simple event-type switching with dict access
- Return JSON response with dict

**Alternative approach: Polling instead of webhooks**

If webhooks are complex for users to configure:
```python
# Poll Sonarr history every 60 seconds
sonarr_manager.get_recent_imports(since=last_poll_time)
# Compare with local files, trigger deletes
```

**Verdict:** Webhooks preferred (real-time), polling acceptable (simpler setup). Both use existing Bottle/requests.

## Version Compatibility Matrix

### Python Dependencies

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| **pyarr** | 5.2.0 | Python >=3.9 <4.0 | SeedSync uses Python >=3.11, fully compatible |
| **requests** | 2.32.5 | Python >=3.8 | Already in use, no changes needed |
| **pytest** | 7.4.4 | pytest-timeout 2.3.1, pytest-cov 7.0.0 | Existing test stack works for mocking HTTP |

### Angular Dependencies

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| **ngx-toastr** | 19.1.0 | Angular >=17 <23 | SeedSync uses Angular 19.2.18, fully compatible |
| **@angular/animations** | 19.2.18 | ngx-toastr peer dependency | Already installed |
| **bootstrap** | 5.3.3 | ngx-toastr Bootstrap 5 theme | Use `toastr-bs5-alert.scss` |

**No version conflicts detected.**

## Installation Summary

### Step 1: Python Backend

```bash
cd src/python

# Option A: With pyarr (recommended for production)
poetry add pyarr@^5.2.0

# Option B: Use existing requests library (no installation needed)
# Already have: requests ^2.32.5
```

### Step 2: Angular Frontend

```bash
cd src/angular

# Install ngx-toastr
npm install ngx-toastr@^19.1.0
```

### Step 3: Update styles.scss

```scss
// Add to src/angular/src/styles.scss
@import 'ngx-toastr/toastr-bs5-alert';  // Bootstrap 5 theme for toasts
```

### Step 4: Configure ngx-toastr in app.config.ts

```typescript
import { provideToastr } from 'ngx-toastr';

export const appConfig: ApplicationConfig = {
  providers: [
    // Existing providers...
    provideToastr({
      timeOut: 5000,
      positionClass: 'toast-top-right',
      preventDuplicates: true,
      toastClass: 'ngx-toastr toast',
    }),
  ],
};
```

## Testing Additions (NO NEW DEPENDENCIES)

### Python: Mocking HTTP Requests

Use existing pytest with unittest.mock:

```python
from unittest.mock import patch, MagicMock
import pytest

@patch('requests.get')
def test_sonarr_get_history(mock_get):
    mock_response = MagicMock()
    mock_response.json.return_value = {
        'records': [
            {'eventType': 'downloadFolderImported', 'episodeId': 123}
        ]
    }
    mock_get.return_value = mock_response

    # Test SonarrManager.get_history()
    # ...
```

**For pyarr:** Mock the library directly:
```python
@patch('pyarr.SonarrAPI')
def test_with_pyarr(mock_sonarr):
    # Mock methods
    # ...
```

### Angular: Testing Toasts

Use existing Jasmine/Karma with ToastrService spy:

```typescript
import { TestBed } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';

describe('SonarrNotificationComponent', () => {
  let toastr: jasmine.SpyObj<ToastrService>;

  beforeEach(() => {
    const toastrSpy = jasmine.createSpyObj('ToastrService', ['success', 'error']);

    TestBed.configureTestingModule({
      providers: [{ provide: ToastrService, useValue: toastrSpy }]
    });

    toastr = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;
  });

  it('should show success toast on import', () => {
    component.onImportEvent({ episodeName: 'S01E01' });
    expect(toastr.success).toHaveBeenCalledWith('S01E01 imported to Sonarr', 'Import Complete');
  });
});
```

**No new test libraries needed:** unittest.mock (Python stdlib), Jasmine spies (already in use).

## Migration Notes: None Required

This is a feature addition, not a migration. Existing code remains unchanged:
- No version upgrades of existing packages
- No breaking changes to current stack
- No deprecations to address

## Success Criteria

Stack additions are complete when:

- ✅ Python dependencies added to `src/python/pyproject.toml` (pyarr or use existing requests)
- ✅ Angular dependencies added to `src/angular/package.json` (ngx-toastr)
- ✅ ngx-toastr styles imported in `src/angular/src/styles.scss`
- ✅ ngx-toastr configured in `src/angular/src/app.config.ts`
- ✅ `poetry install` succeeds in src/python
- ✅ `npm install` succeeds in src/angular
- ✅ Existing tests still pass (Python pytest, Angular Karma)
- ✅ No version conflicts reported by poetry or npm

## Sources

### Primary Sources (HIGH Confidence)

1. [pyarr on PyPI](https://pypi.org/project/pyarr/) - Version 5.2.0, Python requirements
2. [pyarr documentation](https://docs.totaldebug.uk/pyarr/modules/sonarr.html) - API methods (get_history, get_queue)
3. [ngx-toastr on npm](https://www.npmjs.com/package/ngx-toastr) - Version 19.1.0, Angular compatibility
4. [ngx-toastr GitHub releases](https://github.com/scttcper/ngx-toastr/releases) - Release notes, compatibility
5. [Sonarr API Docs](https://sonarr.tv/docs/api/) - Official API endpoints
6. [Bottle API Reference](https://bottlepy.org/docs/dev/api.html) - request.json documentation

### Secondary Sources (MEDIUM Confidence)

7. [requests library PyPI](https://pypi.org/project/requests/) - Version 2.32.5 (verified in pyproject.toml)
8. [Sonarr Webhook Wiki](https://github.com/Sonarr/Sonarr/wiki/Webhook) - Payload format examples
9. [ngx-toastr demo](https://ngx-toastr.vercel.app/) - Configuration options

### Community Sources (LOW Confidence, for patterns only)

10. [10 Best Python HTTP Clients in 2026](https://iproyal.com/blog/best-python-http-clients/) - requests vs httpx comparison
11. [Top 10 Angular Component Libraries 2026](https://www.syncfusion.com/blogs/post/angular-component-libraries-in-2026) - Notification library comparison
12. [HTTPX vs Requests](https://scrapingant.com/blog/requests-vs-httpx) - Why requests is sufficient for synchronous use

---
*Stack research for: Sonarr Integration (SeedSync v1.7)*
*Researched: 2026-02-10*
*Focus: Additions to existing Python 3.11/Angular 19 stack*
