---
phase: 27-webhook-import-detection
plan: 02
subsystem: frontend
tags: [ui, settings, webhooks, angular]
dependencies:
  requires:
    - phase: 26
      plan: 02
      artifact: "Radarr config UI in Settings page"
  provides:
    - artifact: "Webhook URL display in Settings page"
      type: "UI component"
  affects:
    - "Settings page *arr Integration section"
tech_stack:
  added: []
  patterns:
    - "Angular async pipe for config observable"
    - "Bootstrap CSS variables (--bs-dark, --bs-light, --bs-secondary)"
    - "user-select: all for easy URL copying"
key_files:
  created: []
  modified:
    - path: "src/angular/src/app/pages/settings/settings-page.component.html"
      changes: "Added Webhook URLs subsection with Sonarr and Radarr webhook URL display"
    - path: "src/angular/src/app/pages/settings/settings-page.component.scss"
      changes: "Added styles for webhook URL display with dark theme and easy-copy selection"
decisions: []
metrics:
  duration: "65 seconds"
  completed: "2026-02-11T23:53:13Z"
---

# Phase 27 Plan 02: Webhook URL Display in Settings Summary

**One-liner:** Added webhook URL display section to *arr Integration Settings showing Sonarr/Radarr webhook endpoints with dynamic port.

## What Was Built

Added a "Webhook URLs" subsection to the Settings page's *arr Integration card that displays the webhook endpoint URLs for both Sonarr and Radarr. The URLs include the dynamically-read port from the config and clear instructions on where to configure them in the *arr applications.

## Implementation Details

### Webhook URLs Section (HTML)

Added a new subsection after the Radarr fieldset in the *arr Integration card with:
- A description paragraph explaining where to configure webhooks in *arr apps (Settings → Connect → Add → Webhook)
- Sonarr webhook URL: `http://<seedsync-address>:{port}/server/webhook/sonarr`
- Radarr webhook URL: `http://<seedsync-address>:{port}/server/webhook/radarr`
- Port read from config observable using `(config | async)?.get('web')?.get('port')`
- Placeholder `<seedsync-address>` for users to replace with their server IP/hostname (avoiding auto-detection pitfalls per research)

### Webhook URLs Styling (SCSS)

Added consistent styling following existing Settings page patterns:
- Dark background (`var(--bs-dark)`) with light text (`var(--bs-light)`) for URL display
- `user-select: all` on code blocks for easy one-click selection and copying
- `word-break: break-all` to prevent URL overflow on narrow screens
- Font sizes and margins matching existing subsection patterns
- Uses Bootstrap CSS variables for theme consistency

### Key Design Decisions

1. **Not gated by enable toggles**: Webhook URLs are always visible because webhooks work regardless of the enable toggle state. The enable toggle only controls the Test Connection feature.

2. **Manual address replacement**: Used `<seedsync-address>` placeholder instead of auto-detecting the server address to avoid the pitfalls identified in research (port conflicts, localhost vs network addressing).

3. **Consistent styling**: Used existing Bootstrap CSS variables and Settings page patterns for visual consistency with the rest of the UI.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification steps passed:

1. Angular build succeeded with no errors (only pre-existing warnings about unused files)
2. HTML contains 8 webhook references (>= 5 required)
3. SCSS contains 4 webhook references (>= 3 required)
4. No changes to settings-page.component.ts required (config observable already available)

## Task Breakdown

| Task | Name | Status | Commit | Files Modified |
|------|------|--------|--------|---------------|
| 1 | Add webhook URL display section and styles | Complete | 84a365a | settings-page.component.html, settings-page.component.scss |

## Commits

- `84a365a`: feat(27-02): add webhook URL display to Settings page

## Self-Check: PASSED

Verifying created/modified files exist:

```bash
# Modified files
[ -f "/Users/julianamacbook/seedsync/src/angular/src/app/pages/settings/settings-page.component.html" ] && echo "FOUND: settings-page.component.html" || echo "MISSING: settings-page.component.html"
[ -f "/Users/julianamacbook/seedsync/src/angular/src/app/pages/settings/settings-page.component.scss" ] && echo "FOUND: settings-page.component.scss" || echo "MISSING: settings-page.component.scss"
```

Result: Both files found.

Verifying commits exist:

```bash
git log --oneline --all | grep -q "84a365a" && echo "FOUND: 84a365a" || echo "MISSING: 84a365a"
```

Result: Commit 84a365a found.

All files and commits verified successfully.
