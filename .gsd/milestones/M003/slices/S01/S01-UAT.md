# S01: Design Tokens & Global Cleanup — UAT

## Prerequisites
- SeedSync Angular dev server running at http://localhost:4200

## Test Script

1. **Open Dashboard page**
   - [ ] Background is dark blue-black (Jet Black #13262f), not pure black
   - [ ] Text is light lavender (#e9e6ff), not white-gray
   - [ ] No CRT scan lines visible across the viewport
   - [ ] No green glow or pulse effects anywhere

2. **Check fonts**
   - [ ] Body text uses system sans-serif (not IBM Plex Sans)
   - [ ] Open browser DevTools Network tab — no requests to fonts.googleapis.com

3. **Check sidebar/nav accent colors**
   - [ ] Active sidebar item uses olive/brown tone (#73683b), not green
   - [ ] Logo text uses olive/brown tone, not green

4. **Navigate to all pages**
   - [ ] Settings, AutoQueue, Logs, About all load with same earthy background
   - [ ] No green terminal colors visible on any page (status colors excepted)

5. **Status colors preserved**
   - [ ] If any files are downloading, status dot is still green (#3fb950)
   - [ ] If any files are queued, status dot is still amber (#f0883e)
