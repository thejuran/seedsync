# Debug: "Enable Sonarr Integration" Checkbox Not Responding

## Root Cause

**Two compounding issues cause the checkbox to appear non-functional:**

### Issue 1 (Primary): Checkbox is DISABLED when `sonarr.enabled` is `null`

The `OptionComponent` template (`option.component.html` line 25) disables the checkbox when `value == null`:

```html
<input type="checkbox" ... [disabled]="value == null" [ngModel]="value" ... />
```

The `value` for the Sonarr enable checkbox comes from the config:

```html
[value]="(config | async)?.get('sonarr')?.get('enabled')"
```

**When does `sonarr.enabled` arrive as `null`?**

For **existing installations** whose config file on disk predates Phase 22-02 (i.e., the `.ini` file has no `[Sonarr]` section):

1. Backend `Config.from_dict()` (`config.py` lines 391-393) treats `Sonarr` as **optional** for backward compatibility:
   ```python
   if "Sonarr" in config_dict:
       config.sonarr = Config.Sonarr.from_dict(...)
   ```
2. When absent, `config.sonarr` remains the default `Config.Sonarr()` with all `None` values (`config.py` lines 307-311).
3. `Config.as_dict()` (`config.py` line 413) always includes the `"Sonarr"` section, so the JSON response is:
   ```json
   {"sonarr": {"enabled": null, "sonarr_url": null, "sonarr_api_key": null}}
   ```
4. Frontend `Config` constructor (`config.ts` line 172) creates `SonarrRecord({enabled: null, ...})`.
5. Template reads `config.get('sonarr').get('enabled')` which is `null`.
6. `[disabled]="value == null"` evaluates to `true`. **The checkbox is disabled and completely unclickable.**

A disabled HTML checkbox does not fire any events, does not toggle visually, and does not trigger `ngModelChange`. This matches the symptom: "does not respond at all when clicked. Nothing happens on click."

### Issue 2 (Secondary): `debounceTime(1000)` causes poor checkbox UX even when enabled

Even on **new installations** where `sonarr.enabled = false` (boolean, not null), the `OptionComponent` has a UX problem specific to checkboxes:

In `option.component.ts` (lines 37-42):
```typescript
this.newValue.pipe(
    debounceTime(this.DEBOUNCE_TIME_MS),  // 1000ms delay
    distinctUntilChanged()
).subscribe({next: val => this.changeEvent.emit(val)});
```

Combined with one-way `[ngModel]="value"` binding and `OnPush` change detection:

1. User clicks checkbox (unchecked -> checked visually).
2. `ngModelChange` fires with `true`, pushed into Subject.
3. Change detection runs immediately. `[ngModel]="value"` where `value` is still `false` (config not updated yet). **Angular writes `false` back to the checkbox, reverting it to unchecked.**
4. 1000ms later, debounce completes. `changeEvent` emits. `onSetConfig` calls the API.
5. API response updates config. `value` becomes `true`. Checkbox finally shows checked.

The user sees the checkbox flicker back immediately after clicking, then change 1+ seconds later. This feels broken even though it technically works.

Note: This debounce issue applies to ALL checkboxes in the settings page (AutoQueue enable, Debug, etc.), but text inputs tolerate it better because the user is still typing during the debounce window.

## Evidence

### File Trace

| File | Line(s) | Role |
|------|---------|------|
| `src/angular/src/app/pages/settings/option.component.html` | 21-33 | Checkbox template with `[disabled]="value == null"` |
| `src/angular/src/app/pages/settings/option.component.ts` | 37-42 | `debounceTime(1000)` + `distinctUntilChanged` pipeline |
| `src/angular/src/app/pages/settings/settings-page.component.html` | 60-65 | Sonarr enable checkbox binding |
| `src/angular/src/app/services/settings/config.ts` | 109-114 | `DefaultSonarr` has `enabled: null` |
| `src/angular/src/app/services/settings/config.ts` | 172 | `SonarrRecord` constructed with `null` when sonarr data has nulls |
| `src/python/common/config.py` | 302-311 | `Config.Sonarr` defaults all to `None` |
| `src/python/common/config.py` | 391-393 | `[Sonarr]` section is optional in `from_dict` |
| `src/python/seedsync.py` | 322-324 | Default config sets `sonarr.enabled = False` (only for fresh installs) |

### Comparison: How AutoQueue's "Enable" checkbox works

AutoQueue's "Enable" checkbox uses the same `OptionComponent` but does NOT hit Issue 1 because:
- `[AutoQueue]` is a **required** config section (line 389 in `config.py`), not optional
- On any installation, `autoqueue.enabled` is always a boolean (never `null`)
- The `_create_default_config` sets `autoqueue.enabled = True` for new installs
- Existing config files always have `[AutoQueue]`

## Suggested Fix Direction

### For Issue 1 (disabled checkbox):

The backend should ensure Sonarr section values are never `null` when served to the frontend. Options:

- **Option A (backend):** In `Config.from_dict`, when `[Sonarr]` section is missing, populate with sensible defaults (like `_create_default_config` does) instead of leaving all `None`.
- **Option B (frontend):** In the `Config` constructor, when sonarr record values are all `null`, substitute with working defaults (`enabled: false`, `sonarr_url: ""`, `sonarr_api_key: ""`).
- **Option C (template):** Change the checkbox disabled condition from `[disabled]="value == null"` to only disable for truly unloaded states (e.g., when the entire config is null), not for individual field nulls that are just "unset."

### For Issue 2 (debounce UX):

- Bypass the `debounceTime` for checkbox inputs (checkboxes don't need debounce since they're single discrete actions, unlike text fields where the user may still be typing).
- Or use two-way `[(ngModel)]` with immediate emission for checkboxes.

### Auto-Delete has the same Issue 1

Note: `[AutoDelete]` is also optional in `Config.from_dict` (lines 396-399), so the "Enable auto-delete" checkbox in that section will have the exact same disabled-when-null bug for existing installations.
