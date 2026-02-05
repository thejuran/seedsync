# Phase 11: Status Dropdown Counts - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Add file counts to status dropdown options so users can see at a glance how many files are in each status category. Counts appear in parentheses after each status label. Does not change filtering logic or add new statuses.

</domain>

<decisions>
## Implementation Decisions

### Count display format
- Parentheses after label: "Downloaded (5)"
- Single space between label and count
- Thousands separator with commas: "Downloaded (1,234)"
- Show count in both dropdown button (selected option) and dropdown items

### Zero-count behavior
- Show "(0)" for empty statuses — all statuses always visible
- Empty statuses are disabled (not selectable)
- Disabled statuses have grayed out text (standard disabled styling)
- "All" option is never disabled, even when total is zero

### Count update timing
- Counts refresh when dropdown is opened (not real-time)
- No loading indicator needed — calculation is fast
- Selected option in button shows its count

### "All" option semantics
- "All" displays total file count across all statuses: "All (42)"
- "All" appears at top (first option in dropdown)
- Same styling as other options (no separator or distinction)
- Keep current default selection behavior (don't change what's selected on page load)

### Claude's Discretion
- Whether to show count in button (answered: yes, show it)
- Exact disabled state implementation details

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches using Bootstrap 5 dropdown conventions.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-status-dropdown-counts*
*Context gathered: 2026-02-04*
