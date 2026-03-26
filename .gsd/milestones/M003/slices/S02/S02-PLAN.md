# S02: Top Nav Bar & Layout

**Goal:** Replace the sidebar navigation with a Triggarr-style top nav bar and restructure the root layout.
**Demo:** Sidebar replaced with horizontal top nav bar showing "SeedSync" branding and text links, responsive mobile layout working.

## Must-Haves
- Top nav bar with "SeedSync" text branding (left) and text nav links (right)
- Active route highlighted in nav
- No sidebar component or sidebar layout margins
- Content area is full-width under the nav bar
- Mobile: nav links remain visible
- Version number visible in nav
- Route icon references removed from routes.ts

## Tasks

- [x] **T01: Replace sidebar with top nav bar and restructure layout**
  Rewrote app.component to use top nav bar. Deleted sidebar.component. Removed icon refs from routes.ts.

## Files Likely Touched
- src/angular/src/app/pages/main/app.component.html
- src/angular/src/app/pages/main/app.component.scss
- src/angular/src/app/pages/main/app.component.ts
- src/angular/src/app/pages/main/sidebar.component.* (deleted)
- src/angular/src/app/routes.ts
