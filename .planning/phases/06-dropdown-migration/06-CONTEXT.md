# Phase 6: Dropdown Migration - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace custom dropdown implementation (`%dropdown`, `%toggle` SCSS placeholders) with Bootstrap's native dropdown component for file options menus. Users can click file options buttons to see available actions (Download, Extract, Delete, etc.) with correct positioning behavior.

</domain>

<decisions>
## Implementation Decisions

### Trigger behavior
- Click to toggle (click opens, click again closes)
- Only one dropdown open at a time — opening one auto-closes others
- Full keyboard navigation: Arrow keys to navigate items, Enter to select, Escape to close
- Close immediately on item selection
- Close on click-outside
- Button only — no right-click context menu
- Button shows pressed/active state while dropdown is open
- Disabled items (e.g., Extract on non-archives) shown greyed out, not hidden

### Visual styling
- Dark theme to match app's existing dark UI
- Teal highlight on menu item hover (app's accent color)
- Subtle border to define dropdown edges
- Subtle drop shadow for depth

### Positioning behavior
- Default direction: down, with auto-flip up when near viewport bottom
- End-aligned horizontally (dropdown right edge aligns with button right edge)
- Constrain to viewport — no horizontal overflow/scrolling
- Close dropdown on scroll (prevents orphaned dropdowns in scrollable file list)

### Animation & transitions
- Quick fade (~150ms) on open
- Matching fade on close
- Subtle transition (~100ms) on menu item hover color change
- No special animation on flip/reposition

### Claude's Discretion
- Exact z-index values
- Specific pixel values for padding, border-radius
- Bootstrap dropdown configuration details
- Popper.js modifier settings

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard Bootstrap dropdown approaches that achieve the decisions above.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-dropdown-migration*
*Context gathered: 2026-02-04*
