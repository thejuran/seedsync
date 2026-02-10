# Phase 22: Configuration & Settings UI - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

User can configure and test Sonarr connection in the existing Settings page. This includes URL, API key, enable/disable toggle, and a Test Connection button with inline feedback. Configuration persists across app restarts. This phase does NOT include Sonarr API polling, import detection, status visibility, or auto-delete — those are Phases 23-25.

</domain>

<decisions>
## Implementation Decisions

### Section placement & grouping
- New accordion section in the **left column**, below Archive Extraction
- Section header: **"*arr Integration"** (generic name to accommodate future integrations)
- Field order: Enable toggle → Sonarr URL → API Key → Test Connection button
- Follows the **same auto-save pattern** as all existing fields (1s debounce per field, restart notification on success)

### Connection test interaction
- Test Connection button sits **directly below the API Key field**, inside the section body
- **Inline message below button** shows result (stays visible until next test)
- Success message: **"Connected to Sonarr vX.X.X"** — shows version to confirm correct instance
- Error messages are **specific by error type**: "Connection refused", "Invalid API key", "Timeout", etc. — helps user troubleshoot

### Enable/disable toggle behavior
- Toggle label: **"Enable Sonarr Integration"**
- When OFF: fields are **visible but disabled** (greyed out) — user can see what's configured but can't edit
- Default state (fresh install): **disabled, fields empty**
- **No confirmation** when disabling — consistent with other checkboxes in Settings, user can re-enable anytime

### API key input handling
- API key field is **masked** (password style, always masked) — consistent with existing Server Password field
- No reveal toggle — keeps consistency with existing password field pattern
- **Help text under API key**: "Found in Sonarr under Settings → General → API Key"
- **Help text under URL**: "e.g. http://localhost:8989"

### Claude's Discretion
- Loading/spinner state on Test Connection button while request is in flight
- Exact styling of inline success/error messages (colors, icons)
- Backend endpoint design for the test connection action
- Config section naming in Python backend (InnerConfig class name)

</decisions>

<specifics>
## Specific Ideas

- Section header "*arr Integration" chosen to be forward-compatible with Radarr/Lidarr
- Toggle label specifically says "Sonarr" (not "*arr") since that's the only integration for now
- Inline test result (not toast) so user can see it persist while adjusting settings
- URL hint uses `http://localhost:8989` as the example — Sonarr's default port

</specifics>

<deferred>
## Deferred Ideas

- Auto-delete delay setting in this section — belongs in Phase 25 (Auto-Delete with Safety)
- Radarr/Lidarr integration fields — future milestone
- Reveal/hide toggle for masked fields — potential UX improvement across all password fields, not specific to this phase

</deferred>

---

*Phase: 22-configuration-settings-ui*
*Context gathered: 2026-02-10*
