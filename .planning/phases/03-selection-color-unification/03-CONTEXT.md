# Phase 3: Selection Color Unification - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Standardize teal selection highlighting across all selection-related UI components. This includes the selection banner (showing count), bulk actions bar, and selected file rows. All selection states should be visually cohesive using the secondary (teal) color palette.

</domain>

<decisions>
## Implementation Decisions

### Color Intensity
- Medium teal presence (30-40% opacity) for selected row backgrounds — clear selection without being heavy
- Text and icons shift to darker teal on selected items for cohesion with background
- Original colors don't persist on selection — darker teal text provides unified look

### State Variations
- Unselected rows: Very light teal hint on hover — suggests "this could be selected"
- Selected rows: No hover change — already selected, hover doesn't alter appearance
- Multi-select (shift-click, select-all): Same styling as single selection — no visual distinction
- Keyboard focus: Standard browser/Bootstrap focus ring — not custom teal

### Visual Hierarchy
- Graduated intensity approach: Banner darkest, bulk actions bar medium, selected rows lightest
- Selection count displayed in banner (top) only, not in actions bar
- Banner appears only when 1+ files selected — disappears when none
- Bulk actions bar appears only when 1+ files selected — disappears when none

### Transition Behavior
- Row selection/deselection: Instant color change — fast, responsive feel
- Banner show/hide: Instant — no animation
- Bulk actions bar show/hide: Instant — no animation
- Hover states: Quick 100ms fade transition — subtle polish for hover interactions

### Claude's Discretion
- Exact teal shades for banner (darkest), bar (medium), and rows (lightest) within Bootstrap secondary palette
- Banner styling details (text color, padding, layout)
- Actions bar color relationship to banner

</decisions>

<specifics>
## Specific Ideas

No specific references — open to standard approaches within Bootstrap's secondary color palette.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-selection-color-unification*
*Context gathered: 2026-02-03*
