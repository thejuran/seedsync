# Phase 4: Button Standardization - File Actions - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Migrate file action buttons on the Dashboard page from custom CSS to Bootstrap `btn` classes. This standardizes sizing, states, and visual consistency while preserving all existing click behaviors. Buttons affected include Queue, Stop, Extract, and bulk action buttons in the selection bar.

</domain>

<decisions>
## Implementation Decisions

### Button sizing
- Use Bootstrap's default button sizing (~38px) — no custom 40px override
- Buttons maintain same size on mobile/narrow screens (no responsive resizing)
- Button spacing uses Bootstrap defaults between adjacent buttons
- Buttons with icon + text: icon on left, text on right
- Dropdown toggle buttons use Bootstrap's default caret behavior

### Visual variants
- Primary actions (Queue, Start): `btn-primary` (blue)
- Destructive actions (Stop, Delete): `btn-danger` (red)
- Secondary/neutral actions (Extract, menu toggles): `btn-secondary`
- Icon-only buttons: solid variants (match text buttons, not outline)
- Bulk actions bar: same variants as individual actions (Queue All = btn-primary, Stop All = btn-danger)
- Button text/icon colors: Bootstrap defaults (automatic contrast)
- Already-queued state: show disabled button (not hidden, not different variant)

### State appearance
- Hover: Bootstrap default styles
- Disabled: Bootstrap default (faded opacity + cursor change)
- Focus rings: Bootstrap default (for keyboard accessibility)
- Transitions: Bootstrap default (~150ms)

### Icon handling
- Icon spacing from text: Bootstrap default padding
- No tooltips on icon-only buttons (icons should be self-explanatory)

### Claude's Discretion
- Icon-only button shape (square vs height-matched)
- Bulk actions bar button sizing (match toolbar or compact)
- Minimum width for short text buttons
- Visual distinction between file actions vs view actions
- Icon sizing inside buttons
- Loading spinners on action buttons

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard Bootstrap approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 04-button-standardization-file-actions*
*Context gathered: 2026-02-03*
