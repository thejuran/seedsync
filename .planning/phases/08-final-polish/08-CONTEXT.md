# Phase 8: Final Polish - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Validation and cleanup after v1.1 dropdown and form migration. Ensure the application passes all tests with no visual regressions and remove unused code. This is a verification phase, not a feature phase.

</domain>

<decisions>
## Implementation Decisions

### Visual QA Scope
- Files page deep-dive is the priority (most complex page with dropdowns)
- Quick scan of other pages (Settings, AutoQueue, Logs, About)
- "Better than before" standard — v1.1 can look different as long as it's more consistent
- Key interactive states: dropdown open, form focus, button hover
- Skip pixel-perfect comparison to pre-v1.1

### Responsive Testing
- Desktop + tablet breakpoints only (mobile not a realistic use case for server tool)
- Tablet goal: readable and usable — content fits, buttons tappable, no horizontal scroll
- Use browser devtools responsive mode (industry standard approach)

### Cleanup Criteria
- Moderate aggressiveness: remove unused code + code clearly superseded by Bootstrap
- Don't remove code that might still be referenced somewhere

### Bundle Size
- Not a concern for this application
- SeedSync is self-hosted, accessed on local network, loaded once per session
- Remove from success criteria

### Claude's Discretion
- Whether to check empty states and error states during visual QA
- Whether tablet-width dropdown testing is needed
- Whether to remove old placeholder patterns (%dropdown, %toggle)
- Whether to remove old CSS variables from pre-consolidation
- Whether to delete entire unused SCSS files vs clean within files

</decisions>

<specifics>
## Specific Ideas

- Files page is the critical path for visual QA — it has the dropdown work from Phase 6
- Settings and AutoQueue have the form work from Phase 7 — quick verification there
- Cleanup should focus on SCSS code that was replaced by Bootstrap native components

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-final-polish*
*Context gathered: 2026-02-04*
