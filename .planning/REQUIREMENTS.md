# Requirements: SeedSync

**Defined:** 2026-02-16
**Core Value:** Reliable file sync from seedbox to local with automated media library integration

## v3.0 Requirements

Requirements for v3.0 Terminal UI Overhaul. Each maps to roadmap phases.

### Visual Identity

- [ ] **VIS-01**: User sees Fira Code font for all data displays (filenames, speeds, sizes, progress)
- [ ] **VIS-02**: User sees IBM Plex Sans for UI labels, buttons, and navigation
- [ ] **VIS-03**: User sees deep dark backgrounds (#0d1117 base) with green accent palette (#00ff41 neon, #3fb950 readable, #238636 muted)
- [ ] **VIS-04**: User sees CRT scan-line overlay effect (subtle, low opacity repeating gradient)
- [ ] **VIS-05**: User sees custom dark scrollbar styling (webkit + Firefox)

### Navigation

- [ ] **NAV-01**: User sees sidebar as 56px icon rail that expands to 200px on hover (CSS-only transition)
- [ ] **NAV-02**: User sees `>` prompt indicator on active route in sidebar
- [ ] **NAV-03**: User sees app version at bottom of sidebar
- [ ] **NAV-04**: User can navigate via mobile hamburger menu (preserved from current behavior)

### File Dashboard

- [ ] **DASH-01**: User sees search input with terminal prompt `>` prefix
- [ ] **DASH-02**: User sees colored left border on file rows by status (green=downloading, teal=downloaded, amber=queued, red=stopped)
- [ ] **DASH-03**: User sees ASCII-style block progress bars (`[████░░░░] 67%`) replacing Bootstrap progress component
- [ ] **DASH-04**: User sees green glow effect on actively downloading rows (box-shadow pulse)
- [ ] **DASH-05**: User sees colored dot + text for file status (no SVG icons)
- [ ] **DASH-06**: User sees ghost-style action buttons with green/red outlines and glow on hover

### Secondary Pages

- [ ] **PAGE-01**: User sees terminal-style section headers in Settings (`--- Server ---`)
- [ ] **PAGE-02**: User sees monospace patterns in AutoQueue with green/red buttons
- [ ] **PAGE-03**: User sees true terminal-style Logs (monospace, colored by level green/amber/red, no background blocks)
- [ ] **PAGE-04**: User sees ASCII-art inspired About page with monospace version display

### Theme Cleanup

- [ ] **CLEAN-01**: Theme toggle removed from Settings page (Appearance section removed)
- [ ] **CLEAN-02**: ThemeService simplified to dark-only (no light/auto modes, no OS detection, no localStorage toggle)

## Future Requirements

### Additional *arr Support

- **ARR-01**: Lidarr integration following same *arr pattern
- **ARR-02**: Readarr integration following same *arr pattern

## Out of Scope

| Feature | Reason |
|---------|--------|
| Lidarr/Readarr integration | Separate milestone — different feature area |
| E2E tests (Playwright) | Separate concern |
| Bootstrap @import → @use migration | Blocked until Bootstrap 6 |
| Light mode preservation | Intentionally removed — Terminal/Hacker is dark-only |
| Custom animations beyond spec | Scope creep — stick to design spec |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| VIS-01 | Phase 33 | Pending |
| VIS-02 | Phase 33 | Pending |
| VIS-03 | Phase 33 | Pending |
| VIS-04 | Phase 33 | Pending |
| VIS-05 | Phase 33 | Pending |
| NAV-01 | Phase 34 | Pending |
| NAV-02 | Phase 34 | Pending |
| NAV-03 | Phase 34 | Pending |
| NAV-04 | Phase 34 | Pending |
| DASH-01 | Phase 35 | Pending |
| DASH-02 | Phase 35 | Pending |
| DASH-03 | Phase 35 | Pending |
| DASH-04 | Phase 35 | Pending |
| DASH-05 | Phase 35 | Pending |
| DASH-06 | Phase 35 | Pending |
| PAGE-01 | Phase 36 | Pending |
| PAGE-02 | Phase 36 | Pending |
| PAGE-03 | Phase 36 | Pending |
| PAGE-04 | Phase 36 | Pending |
| CLEAN-01 | Phase 37 | Pending |
| CLEAN-02 | Phase 37 | Pending |

**Coverage:**
- v3.0 requirements: 21 total
- Mapped to phases: 21
- Unmapped: 0

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-16 after roadmap creation*
