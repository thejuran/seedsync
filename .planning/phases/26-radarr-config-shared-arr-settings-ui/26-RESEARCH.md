# Phase 26: Radarr Config & Shared *arr Settings UI - Research

**Researched:** 2026-02-11
**Domain:** Backend configuration patterns, REST API testing, Angular reactive forms, Bootstrap UI patterns
**Confidence:** HIGH

## Summary

Phase 26 adds Radarr configuration mirroring the existing Sonarr implementation (Phase 22) and unifies both into a shared *arr Integration UI section. The implementation follows established patterns in the codebase: Python Config.InnerConfig for backend config sections, Bottle REST endpoints for test connection, Angular Immutable.js Record models, and Bootstrap 5 accordion cards with fieldset disabled pattern.

**Key insight:** This is pattern replication, not greenfield development. Sonarr implementation (Phase 22) established the architecture. Radarr mirrors it identically except for different default port (7878 vs 8989) and property naming (radarr_url/radarr_api_key vs sonarr_url/sonarr_api_key).

**Primary recommendation:** Copy-modify approach. Clone Sonarr implementation, rename to Radarr, adjust port defaults and property names, then refactor Settings UI to use shared accordion section with subsections for each service.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python configparser | stdlib | INI file parsing | Built-in, used by Config.from_str/to_str |
| Python requests | existing | HTTP client for *arr APIs | Already in use for Sonarr, proven for REST calls |
| Bottle | existing | Web framework | Existing REST endpoint pattern for test connections |
| Angular Immutable.js | existing | Immutable data structures | Existing pattern for Config models (Record-based) |
| Bootstrap 5.3 | existing | UI framework | Accordion, card, fieldset patterns already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| unittest.mock | stdlib | Mocking for tests | Config handler unit tests |
| WebTest | existing | Integration testing | Config endpoint integration tests |

### Alternatives Considered
None — this phase replicates existing architecture. No technology choices to make.

**Installation:**
No new dependencies required. All libraries already present in codebase.

## Architecture Patterns

### Backend: Config.InnerConfig Pattern

**Existing Sonarr implementation (lines 302-311 in config.py):**
```python
class Sonarr(IC):
    enabled = PROP("enabled", Checkers.null, Converters.bool)
    sonarr_url = PROP("sonarr_url", Checkers.null, Converters.null)
    sonarr_api_key = PROP("sonarr_api_key", Checkers.null, Converters.null)

    def __init__(self):
        super().__init__()
        self.enabled = None
        self.sonarr_url = None
        self.sonarr_api_key = None
```

**Pattern details:**
- `PROP` macro creates property with checker (validation) and converter (string->type)
- `Checkers.null` = no validation (validation happens at test endpoint, not config parse)
- `Converters.null` for strings, `Converters.bool` for booleans
- All properties initialized to None in `__init__`

**Backward compatibility pattern (lines 391-398):**
```python
# Sonarr section is optional for backward compatibility with older config files
if "Sonarr" in config_dict:
    config.sonarr = Config.Sonarr.from_dict(Config._check_section(config_dict, "Sonarr"))
else:
    # Default values for existing installs missing [Sonarr] section
    config.sonarr.enabled = False
    config.sonarr.sonarr_url = ""
    config.sonarr.sonarr_api_key = ""
```

**Why this pattern:** Allows existing installations to upgrade without config file migration. New sections default to safe values if missing.

### Backend: Test Connection Endpoint Pattern

**Existing Sonarr implementation (lines 44-99 in web/handler/config.py):**
```python
def __handle_test_sonarr_connection(self):
    sonarr_url = self.__config.sonarr.sonarr_url
    sonarr_api_key = self.__config.sonarr.sonarr_api_key

    if not sonarr_url or not sonarr_url.strip():
        return HTTPResponse(
            body=json.dumps({"success": False, "error": "Sonarr URL is required"}),
            content_type="application/json"
        )
    if not sonarr_api_key or not sonarr_api_key.strip():
        return HTTPResponse(
            body=json.dumps({"success": False, "error": "Sonarr API key is required"}),
            content_type="application/json"
        )

    # Strip trailing slash from URL
    url = sonarr_url.rstrip("/")

    try:
        response = requests.get(
            "{}/api/v3/system/status".format(url),
            headers={"X-Api-Key": sonarr_api_key},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            version = data.get("version", "unknown")
            return HTTPResponse(
                body=json.dumps({"success": True, "version": version}),
                content_type="application/json"
            )
        elif response.status_code == 401:
            return HTTPResponse(
                body=json.dumps({"success": False, "error": "Invalid API key"}),
                content_type="application/json"
            )
        else:
            return HTTPResponse(
                body=json.dumps({"success": False, "error": "Sonarr returned status {}".format(response.status_code)}),
                content_type="application/json"
            )
    except requests.ConnectionError:
        return HTTPResponse(
            body=json.dumps({"success": False, "error": "Connection refused - check Sonarr URL"}),
            content_type="application/json"
        )
    except requests.Timeout:
        return HTTPResponse(
            body=json.dumps({"success": False, "error": "Connection timed out"}),
            content_type="application/json"
        )
    except Exception as e:
        return HTTPResponse(
            body=json.dumps({"success": False, "error": str(e)}),
            content_type="application/json"
        )
```

**Pattern details:**
- Validate required fields first (URL and API key)
- Strip trailing slash from URL (normalize input)
- Use `/api/v3/system/status` endpoint (standard across Sonarr/Radarr)
- 10-second timeout (reasonable for LAN API calls)
- Return JSON with `{"success": bool, "version": str}` or `{"success": bool, "error": str}`
- Specific error messages for ConnectionError (network), Timeout (slow response), 401 (bad key)
- Generic fallback for unexpected exceptions

**Radarr API endpoint:** Identical to Sonarr — `/api/v3/system/status` with `X-Api-Key` header
**Source:** [Radarr API Docs](https://radarr.video/docs/api/), [pycliarr documentation](https://pycliarr.readthedocs.io/en/stable/_modules/pycliarr/api/radarr.html)

### Frontend: Immutable.js Record Pattern

**Existing Sonarr model (lines 101-114 in config.ts):**
```typescript
interface ISonarr {
    enabled: boolean;
    sonarr_url: string;
    sonarr_api_key: string;
}
const DefaultSonarr: ISonarr = {
    enabled: null,
    sonarr_url: null,
    sonarr_api_key: null,
};
const SonarrRecord = Record(DefaultSonarr);
```

**Config constructor backward compatibility (lines 172-173):**
```typescript
sonarr: props.sonarr ? SonarrRecord(props.sonarr) : SonarrRecord(DefaultSonarr),
```

**Pattern details:**
- Interface defines shape with TypeScript types
- Default object provides null values for all fields
- Record factory creates immutable Record class
- Constructor checks if section exists in JSON, falls back to defaults

**Why this pattern:** Immutable.js Records provide immutability (freeze-on-add pattern), type safety, and `.get()` accessor methods used in templates.

### Frontend: Bootstrap Accordion with Fieldset Disabled

**Existing Sonarr UI structure (settings-page.component.html lines 48-100):**
```html
<div class="card">
    <h3 class="card-header" id="heading-arr">
        <button class="btn"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#collapse-arr">
            *arr Integration
        </button>
    </h3>
    <div id="collapse-arr" class="collapse" data-bs-parent="#accordion">
        <div class="card-body">
            <div>
                <app-option
                    [type]="OptionType.Checkbox"
                    [label]="'Enable Sonarr Integration'"
                    [value]="(config | async)?.get('sonarr')?.get('enabled')"
                    (changeEvent)="onSetConfig('sonarr', 'enabled', $event)">
                </app-option>
            </div>
            <fieldset [attr.disabled]="!(config | async)?.get('sonarr')?.get('enabled') ? '' : null">
                <div>
                    <app-option
                        [type]="OptionType.Text"
                        [label]="'Sonarr URL'"
                        [description]="'e.g. http://localhost:8989'"
                        [value]="(config | async)?.get('sonarr')?.get('sonarr_url')"
                        (changeEvent)="onSetConfig('sonarr', 'sonarr_url', $event)">
                    </app-option>
                </div>
                <div>
                    <app-option
                        [type]="OptionType.Password"
                        [label]="'Sonarr API Key'"
                        [description]="'Found in Sonarr under Settings → General → API Key'"
                        [value]="(config | async)?.get('sonarr')?.get('sonarr_api_key')"
                        (changeEvent)="onSetConfig('sonarr', 'sonarr_api_key', $event)">
                    </app-option>
                </div>
                <div class="test-connection">
                    <button class="btn btn-secondary" type="button"
                            [disabled]="testConnectionLoading"
                            (click)="onTestSonarrConnection()">
                        <span *ngIf="!testConnectionLoading">Test Connection</span>
                        <span *ngIf="testConnectionLoading">Testing...</span>
                    </button>
                    <div *ngIf="testConnectionResult"
                         class="test-result"
                         [class.text-success]="testConnectionResult.success"
                         [class.text-danger]="!testConnectionResult.success">
                        {{testConnectionResult.message}}
                    </div>
                </div>
            </fieldset>
        </div>
    </div>
</div>
```

**Pattern details:**
- Card with collapsible accordion section (`data-bs-toggle="collapse"`)
- Enable toggle OUTSIDE fieldset (always enabled)
- URL/API Key/Test Connection INSIDE fieldset (disabled when toggle is OFF)
- `[attr.disabled]="condition ? '' : null"` — empty string enables disabled, null removes attribute
- Test button shows "Testing..." state during API call
- Result div uses Bootstrap text-success/text-danger classes for color

**Why this pattern:** HTML5 fieldset disabled attribute automatically disables all child form controls. Bootstrap provides visual styling (grayed out). No JavaScript needed to disable individual fields.
**Source:** [Bootstrap 5.3 Forms Overview](https://getbootstrap.com/docs/5.3/forms/overview/)

### Frontend: OnPush Change Detection with markForCheck

**Existing Sonarr test connection (settings-page.component.ts lines 131-161):**
```typescript
onTestSonarrConnection(): void {
    this.testConnectionLoading = true;
    this.testConnectionResult = null;
    this._cdr.markForCheck();

    this._configService.testSonarrConnection().subscribe({
        next: reaction => {
            this.testConnectionLoading = false;
            if (reaction.success) {
                try {
                    const result = JSON.parse(reaction.data);
                    if (result.success) {
                        this.testConnectionResult = {
                            success: true,
                            message: "Connected to Sonarr v" + result.version
                        };
                    } else {
                        this.testConnectionResult = {
                            success: false,
                            message: result.error
                        };
                    }
                } catch (e) {
                    this.testConnectionResult = {
                        success: false,
                        message: "Invalid response from server"
                    };
                }
            } else {
                this.testConnectionResult = {
                    success: false,
                    message: reaction.errorMessage
                };
            }
            this._cdr.markForCheck();
        }
    });
}
```

**Pattern details:**
- Component uses `ChangeDetectionStrategy.OnPush` (line 27 in component)
- Set loading state and call `markForCheck()` before async operation
- Subscribe to Observable, update state in `next` callback
- Call `markForCheck()` again after state update to trigger view refresh

**Why this pattern:** OnPush components only check for changes when inputs change or events fire. Async updates from observables don't trigger change detection automatically. `markForCheck()` tells Angular "check this component on next cycle."
**Source:** [Angular ChangeDetectorRef](https://angular.dev/api/core/ChangeDetectorRef), [OnPush Deep Dive](https://medium.com/angular-in-depth/deep-dive-into-the-onpush-change-detection-strategy-in-angular-fab5e4da1d69)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config validation | Custom validation per-field | InnerConfig PROP macro | Centralized checker/converter pattern, tested |
| Immutable models | TypeScript readonly classes | Immutable.js Record | Already in use, freeze semantics, `.get()` accessors |
| HTTP error handling | Custom try/catch per endpoint | requests built-in exceptions | ConnectionError, Timeout, status_code standard |
| Form disable logic | Disable each field manually | HTML fieldset disabled | Browser-native, accessible, Bootstrap-styled |
| Change detection | Manual DOM updates | Angular markForCheck | Framework-managed, OnPush compatible |

**Key insight:** Every pattern needed for Phase 26 already exists in the Sonarr implementation (Phase 22). Zero greenfield architecture decisions.

## Common Pitfalls

### Pitfall 1: Forgetting Backward Compatibility in Config.from_dict
**What goes wrong:** Existing installations with no [Radarr] section in config file fail to load config on upgrade.
**Why it happens:** `Config._check_section()` raises ConfigError if section missing (line 334-338).
**How to avoid:** Use optional section pattern like Sonarr/AutoDelete (lines 391-409). Check `if "Radarr" in config_dict` before parsing, default to safe values if missing.
**Warning signs:** ConfigError on app startup after upgrade, config file missing [Radarr] section.

### Pitfall 2: Forgetting to Strip Trailing Slash from URL
**What goes wrong:** User enters `http://localhost:7878/` (with trailing slash), test connection fails with 404 because request URL becomes `http://localhost:7878//api/v3/system/status` (double slash).
**Why it happens:** URL concatenation doesn't normalize slashes: `url + "/api/v3/..."` when `url` already ends with `/`.
**How to avoid:** Always `url.rstrip("/")` before constructing API endpoint URL (line 60 in config.py).
**Warning signs:** Test connection fails with 404, but Radarr is running and accessible in browser at URL with trailing slash.

### Pitfall 3: Not Calling markForCheck After Async State Updates
**What goes wrong:** Click "Test Connection", button shows "Testing..." but result never appears even though API call completes successfully.
**Why it happens:** Component uses OnPush change detection. Async state updates don't trigger view refresh unless explicitly marked.
**How to avoid:** Call `this._cdr.markForCheck()` after setting state in async callback (lines 134, 161 in settings-page.component.ts).
**Warning signs:** Template bindings don't update after async operations, but logging shows state changed correctly.
**Source:** [OnPush Change Detection Guide](https://mokkapps.de/blog/the-last-guide-for-angular-change-detection-you-will-ever-need)

### Pitfall 4: Fieldset Disabled with Custom Elements
**What goes wrong:** User disables Radarr integration toggle, but "Test Connection" button (if it's a custom element like `<a class="btn">`) remains focusable and clickable.
**Why it happens:** Fieldset disabled only affects native form controls (`<input>`, `<select>`, `<button>`). Custom elements styled as buttons need manual handling.
**How to avoid:** Use native `<button>` element for Test Connection, not `<a class="btn">`. Bootstrap styles both identically, but only `<button>` respects fieldset disabled.
**Warning signs:** Disabled fields are grayed out, but custom button elements still respond to clicks.
**Source:** [Bootstrap 5.3 Forms Overview - Disabled Forms](https://getbootstrap.com/docs/5.3/forms/overview/)

### Pitfall 5: Hardcoding Separate Test Connection State
**What goes wrong:** Add `testRadarrConnectionLoading` and `testRadarrConnectionResult` as separate component properties. Template gets cluttered with two sets of variables. Future *arr services (Lidarr, Readarr) require even more duplication.
**Why it happens:** Each service gets its own state tracking, no shared abstraction.
**How to avoid:** For Phase 26, use separate state (only 2 services, low duplication cost). Plan for Phase 27+ to refactor to map-based state if adding more services: `testConnectionState = {sonarr: {...}, radarr: {...}}`.
**Warning signs:** Component grows large with repeated patterns. Adding third service feels tedious.

### Pitfall 6: Wrong Default Port in Example Text
**What goes wrong:** Copy Sonarr example text "e.g. http://localhost:8989" for Radarr URL field. User follows example, test connection fails.
**Why it happens:** Sonarr default port is 8989, Radarr default port is 7878. Copy-paste error.
**How to avoid:** Update example text to `'e.g. http://localhost:7878'` for Radarr (line 72 in settings-page.component.html).
**Warning signs:** User reports "test connection fails with provided example URL."
**Source:** [Radarr Default Port](https://docs.linuxserver.io/images/docker-radarr/)

## Code Examples

### Backend: Config.Radarr InnerConfig
```python
# Source: Mirroring Config.Sonarr pattern from src/python/common/config.py lines 302-311
class Radarr(IC):
    enabled = PROP("enabled", Checkers.null, Converters.bool)
    radarr_url = PROP("radarr_url", Checkers.null, Converters.null)
    radarr_api_key = PROP("radarr_api_key", Checkers.null, Converters.null)

    def __init__(self):
        super().__init__()
        self.enabled = None
        self.radarr_url = None
        self.radarr_api_key = None
```

### Backend: Config Initialization with Radarr
```python
# Source: Adding to Config.__init__ (after line 331)
def __init__(self):
    self.general = Config.General()
    self.lftp = Config.Lftp()
    self.controller = Config.Controller()
    self.web = Config.Web()
    self.autoqueue = Config.AutoQueue()
    self.sonarr = Config.Sonarr()
    self.radarr = Config.Radarr()  # NEW
    self.autodelete = Config.AutoDelete()
```

### Backend: Backward-Compatible Config.from_dict
```python
# Source: Mirroring Sonarr backward-compat pattern (lines 391-398)
# Add after Sonarr section parsing, before AutoDelete

# Radarr section is optional for backward compatibility with older config files
if "Radarr" in config_dict:
    config.radarr = Config.Radarr.from_dict(Config._check_section(config_dict, "Radarr"))
else:
    # Default values for existing installs missing [Radarr] section
    config.radarr.enabled = False
    config.radarr.radarr_url = ""
    config.radarr.radarr_api_key = ""
```

### Backend: Config.as_dict with Radarr
```python
# Source: Adding to Config.as_dict (after line 423)
def as_dict(self) -> OuterConfigType:
    config_dict = collections.OrderedDict()
    config_dict["General"] = self.general.as_dict()
    config_dict["Lftp"] = self.lftp.as_dict()
    config_dict["Controller"] = self.controller.as_dict()
    config_dict["Web"] = self.web.as_dict()
    config_dict["AutoQueue"] = self.autoqueue.as_dict()
    config_dict["Sonarr"] = self.sonarr.as_dict()
    config_dict["Radarr"] = self.radarr.as_dict()  # NEW
    config_dict["AutoDelete"] = self.autodelete.as_dict()
    return config_dict
```

### Backend: Test Radarr Connection Endpoint
```python
# Source: Mirroring __handle_test_sonarr_connection from web/handler/config.py lines 44-99
def __handle_test_radarr_connection(self):
    radarr_url = self.__config.radarr.radarr_url
    radarr_api_key = self.__config.radarr.radarr_api_key

    if not radarr_url or not radarr_url.strip():
        return HTTPResponse(
            body=json.dumps({"success": False, "error": "Radarr URL is required"}),
            content_type="application/json"
        )
    if not radarr_api_key or not radarr_api_key.strip():
        return HTTPResponse(
            body=json.dumps({"success": False, "error": "Radarr API key is required"}),
            content_type="application/json"
        )

    # Strip trailing slash from URL
    url = radarr_url.rstrip("/")

    try:
        response = requests.get(
            "{}/api/v3/system/status".format(url),
            headers={"X-Api-Key": radarr_api_key},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            version = data.get("version", "unknown")
            return HTTPResponse(
                body=json.dumps({"success": True, "version": version}),
                content_type="application/json"
            )
        elif response.status_code == 401:
            return HTTPResponse(
                body=json.dumps({"success": False, "error": "Invalid API key"}),
                content_type="application/json"
            )
        else:
            return HTTPResponse(
                body=json.dumps({"success": False, "error": "Radarr returned status {}".format(response.status_code)}),
                content_type="application/json"
            )
    except requests.ConnectionError:
        return HTTPResponse(
            body=json.dumps({"success": False, "error": "Connection refused - check Radarr URL"}),
            content_type="application/json"
        )
    except requests.Timeout:
        return HTTPResponse(
            body=json.dumps({"success": False, "error": "Connection timed out"}),
            content_type="application/json"
        )
    except Exception as e:
        return HTTPResponse(
            body=json.dumps({"success": False, "error": str(e)}),
            content_type="application/json"
        )
```

### Backend: Add Route in ConfigHandler.add_routes
```python
# Source: Adding after line 23 in web/handler/config.py
@overrides(IHandler)
def add_routes(self, web_app: WebApp):
    web_app.add_handler("/server/config/get", self.__handle_get_config)
    web_app.add_handler("/server/config/set/<section>/<key>/<value:re:.+>", self.__handle_set_config)
    web_app.add_handler("/server/config/sonarr/test-connection", self.__handle_test_sonarr_connection)
    web_app.add_handler("/server/config/radarr/test-connection", self.__handle_test_radarr_connection)  # NEW
```

### Frontend: IRadarr Interface and Record
```typescript
// Source: Mirroring ISonarr pattern from config.ts lines 101-114
interface IRadarr {
    enabled: boolean;
    radarr_url: string;
    radarr_api_key: string;
}
const DefaultRadarr: IRadarr = {
    enabled: null,
    radarr_url: null,
    radarr_api_key: null,
};
const RadarrRecord = Record(DefaultRadarr);
```

### Frontend: IConfig with Radarr
```typescript
// Source: Adding to IConfig interface (after line 141)
export interface IConfig {
    general: IGeneral;
    lftp: ILftp;
    controller: IController;
    web: IWeb;
    autoqueue: IAutoQueue;
    sonarr: ISonarr;
    radarr: IRadarr;  // NEW
    autodelete: IAutoDelete;
}
const DefaultConfig: IConfig = {
    general: null,
    lftp: null,
    controller: null,
    web: null,
    autoqueue: null,
    sonarr: null,
    radarr: null,  // NEW
    autodelete: null,
};
```

### Frontend: Config Constructor with Radarr
```typescript
// Source: Adding to Config constructor (after line 173)
constructor(props) {
    super({
        general: GeneralRecord(props.general),
        lftp: LftpRecord(props.lftp),
        controller: ControllerRecord(props.controller),
        web: WebRecord(props.web),
        autoqueue: AutoQueueRecord(props.autoqueue),
        sonarr: props.sonarr ? SonarrRecord(props.sonarr) : SonarrRecord(DefaultSonarr),
        radarr: props.radarr ? RadarrRecord(props.radarr) : RadarrRecord(DefaultRadarr),  // NEW
        autodelete: props.autodelete ? AutoDeleteRecord(props.autodelete) : AutoDeleteRecord(DefaultAutoDelete),
    });
}
```

### Frontend: ConfigService testRadarrConnection Method
```typescript
// Source: Mirroring testSonarrConnection from config.service.ts lines 84-89
private readonly RADARR_TEST_URL = "/server/config/radarr/test-connection";

public testRadarrConnection(): Observable<WebReaction> {
    return this._restService.sendRequest(this.RADARR_TEST_URL);
}
```

### Frontend: Shared *arr Integration UI with Subsections
```html
<!-- Source: Refactoring settings-page.component.html lines 48-103 -->
<div class="card">
    <h3 class="card-header" id="heading-arr">
        <button class="btn"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#collapse-arr">
            *arr Integration
        </button>
    </h3>
    <div id="collapse-arr" class="collapse" data-bs-parent="#accordion">
        <div class="card-body">
            <!-- Sonarr Subsection -->
            <h4 class="subsection-header">Sonarr</h4>
            <div>
                <app-option
                    [type]="OptionType.Checkbox"
                    [label]="'Enable Sonarr Integration'"
                    [value]="(config | async)?.get('sonarr')?.get('enabled')"
                    (changeEvent)="onSetConfig('sonarr', 'enabled', $event)">
                </app-option>
            </div>
            <fieldset [attr.disabled]="!(config | async)?.get('sonarr')?.get('enabled') ? '' : null">
                <div>
                    <app-option
                        [type]="OptionType.Text"
                        [label]="'Sonarr URL'"
                        [description]="'e.g. http://localhost:8989'"
                        [value]="(config | async)?.get('sonarr')?.get('sonarr_url')"
                        (changeEvent)="onSetConfig('sonarr', 'sonarr_url', $event)">
                    </app-option>
                </div>
                <div>
                    <app-option
                        [type]="OptionType.Password"
                        [label]="'Sonarr API Key'"
                        [description]="'Found in Sonarr under Settings → General → API Key'"
                        [value]="(config | async)?.get('sonarr')?.get('sonarr_api_key')"
                        (changeEvent)="onSetConfig('sonarr', 'sonarr_api_key', $event)">
                    </app-option>
                </div>
                <div class="test-connection">
                    <button class="btn btn-secondary" type="button"
                            [disabled]="testSonarrConnectionLoading"
                            (click)="onTestSonarrConnection()">
                        <span *ngIf="!testSonarrConnectionLoading">Test Connection</span>
                        <span *ngIf="testSonarrConnectionLoading">Testing...</span>
                    </button>
                    <div *ngIf="testSonarrConnectionResult"
                         class="test-result"
                         [class.text-success]="testSonarrConnectionResult.success"
                         [class.text-danger]="!testSonarrConnectionResult.success">
                        {{testSonarrConnectionResult.message}}
                    </div>
                </div>
            </fieldset>

            <!-- Radarr Subsection -->
            <h4 class="subsection-header">Radarr</h4>
            <div>
                <app-option
                    [type]="OptionType.Checkbox"
                    [label]="'Enable Radarr Integration'"
                    [value]="(config | async)?.get('radarr')?.get('enabled')"
                    (changeEvent)="onSetConfig('radarr', 'enabled', $event)">
                </app-option>
            </div>
            <fieldset [attr.disabled]="!(config | async)?.get('radarr')?.get('enabled') ? '' : null">
                <div>
                    <app-option
                        [type]="OptionType.Text"
                        [label]="'Radarr URL'"
                        [description]="'e.g. http://localhost:7878'"
                        [value]="(config | async)?.get('radarr')?.get('radarr_url')"
                        (changeEvent)="onSetConfig('radarr', 'radarr_url', $event)">
                    </app-option>
                </div>
                <div>
                    <app-option
                        [type]="OptionType.Password"
                        [label]="'Radarr API Key'"
                        [description]="'Found in Radarr under Settings → General → API Key'"
                        [value]="(config | async)?.get('radarr')?.get('radarr_api_key')"
                        (changeEvent)="onSetConfig('radarr', 'radarr_api_key', $event)">
                    </app-option>
                </div>
                <div class="test-connection">
                    <button class="btn btn-secondary" type="button"
                            [disabled]="testRadarrConnectionLoading"
                            (click)="onTestRadarrConnection()">
                        <span *ngIf="!testRadarrConnectionLoading">Test Connection</span>
                        <span *ngIf="testRadarrConnectionLoading">Testing...</span>
                    </button>
                    <div *ngIf="testRadarrConnectionResult"
                         class="test-result"
                         [class.text-success]="testRadarrConnectionResult.success"
                         [class.text-danger]="!testRadarrConnectionResult.success">
                        {{testRadarrConnectionResult.message}}
                    </div>
                </div>
            </fieldset>
        </div>
    </div>
</div>
```

### Frontend: Component Properties for Radarr Test Connection
```typescript
// Source: Adding to SettingsPageComponent class (after line 52)
public testSonarrConnectionLoading = false;
public testSonarrConnectionResult: {success: boolean; message: string} = null;

public testRadarrConnectionLoading = false;  // NEW
public testRadarrConnectionResult: {success: boolean; message: string} = null;  // NEW
```

### Frontend: onTestRadarrConnection Handler
```typescript
// Source: Mirroring onTestSonarrConnection from settings-page.component.ts lines 131-161
onTestRadarrConnection(): void {
    this.testRadarrConnectionLoading = true;
    this.testRadarrConnectionResult = null;
    this._cdr.markForCheck();

    this._configService.testRadarrConnection().subscribe({
        next: reaction => {
            this.testRadarrConnectionLoading = false;
            if (reaction.success) {
                try {
                    const result = JSON.parse(reaction.data);
                    if (result.success) {
                        this.testRadarrConnectionResult = {
                            success: true,
                            message: "Connected to Radarr v" + result.version
                        };
                    } else {
                        this.testRadarrConnectionResult = {
                            success: false,
                            message: result.error
                        };
                    }
                } catch (e) {
                    this.testRadarrConnectionResult = {
                        success: false,
                        message: "Invalid response from server"
                    };
                }
            } else {
                this.testRadarrConnectionResult = {
                    success: false,
                    message: reaction.errorMessage
                };
            }
            this._cdr.markForCheck();
        }
    });
}
```

### Frontend: SCSS for Subsection Headers
```scss
// Source: Adding to settings-page.component.scss after line 52
.card-body {
    padding: 10px 0;

    .subsection-header {
        font-size: 100%;
        font-weight: 600;
        margin: 20px 20px 10px;
        color: var(--bs-secondary);

        &:first-child {
            margin-top: 0;
        }
    }

    .test-connection {
        margin: 10px 20px 0;
        // ... existing styles
    }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| N/A (new feature) | Radarr config | Phase 26 | First movie-focused *arr integration |
| Separate Sonarr section | Shared *arr Integration | Phase 26 | Unified UI, scalable for future services |
| N/A | Bootstrap fieldset disabled | Phase 22 (Sonarr) | Native HTML5 semantics, accessible |

**Deprecated/outdated:**
None — all patterns are current as of Phase 22 implementation.

## Open Questions

None. All patterns verified in existing Sonarr implementation. Radarr API confirmed identical to Sonarr for `/api/v3/system/status` endpoint.

## Sources

### Primary (HIGH confidence)
- Existing Sonarr implementation in codebase (Phase 22):
  - `/Users/julianamacbook/seedsync/src/python/common/config.py` lines 302-311, 391-425
  - `/Users/julianamacbook/seedsync/src/python/web/handler/config.py` lines 23, 44-99
  - `/Users/julianamacbook/seedsync/src/angular/src/app/services/settings/config.ts` lines 101-177
  - `/Users/julianamacbook/seedsync/src/angular/src/app/services/settings/config.service.ts` lines 25, 87-89
  - `/Users/julianamacbook/seedsync/src/angular/src/app/pages/settings/settings-page.component.ts` lines 51-52, 131-161
  - `/Users/julianamacbook/seedsync/src/angular/src/app/pages/settings/settings-page.component.html` lines 48-100
  - `/Users/julianamacbook/seedsync/src/angular/src/app/pages/settings/settings-page.component.scss` lines 40-52

### Secondary (MEDIUM confidence)
- [Bootstrap 5.3 Forms Overview](https://getbootstrap.com/docs/5.3/forms/overview/) - Fieldset disabled attribute
- [Angular ChangeDetectorRef](https://angular.dev/api/core/ChangeDetectorRef) - markForCheck API
- [OnPush Change Detection Deep Dive](https://medium.com/angular-in-depth/deep-dive-into-the-onpush-change-detection-strategy-in-angular-fab5e4da1d69) - Pattern explanation
- [Immutable.js Record Documentation](https://immutable-js.com/docs/v5/Record/) - Record API
- [Radarr API Docs](https://radarr.video/docs/api/) - API reference (OpenAPI spec)
- [pycliarr Radarr API Documentation](https://pycliarr.readthedocs.io/en/stable/_modules/pycliarr/api/radarr.html) - System status response schema

### Tertiary (LOW confidence)
- [Radarr Port Configuration](https://docs.linuxserver.io/images/docker-radarr/) - Default port 7878 (verified across multiple sources)
- [Python Requests Exception Handling](https://requests.readthedocs.io/en/latest/_modules/requests/exceptions/) - ConnectionError, Timeout patterns
- [Python Requests Timeout Guide](https://oxylabs.io/blog/python-requests-timeout) - Best practices

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, zero new dependencies
- Architecture: HIGH - Patterns verified in existing Sonarr implementation
- Pitfalls: HIGH - Derived from actual codebase patterns and Bootstrap/Angular documentation

**Research date:** 2026-02-11
**Valid until:** 60 days (stable patterns, Bootstrap 5.3 and Angular 19 not changing rapidly)
