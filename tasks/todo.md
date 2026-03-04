# Family Hub — Revision Todo

## Completed
- [x] Photo grid → full hero section (6×3, 18 slots, min-height 100vh)
- [x] Add `loading="lazy"` to all images
- [x] Port photo edit system from index.html (Replace/Move/Restore overlays, upload, reposition, FAB toggle)
- [x] Firebase Storage CDN added to hub.html
- [x] Hub uses `landingPage/` Firebase paths (same as main site)
- [x] Remove 4 widgets: Chores, Trip Countdown, Meal Planner, Family Wins
- [x] Remove trips modal
- [x] Keep 5 widgets: Calendar, Notes, Shopping, Allowance, Quick Reference
- [x] Update widget grid layout for 5 widgets
- [x] Replace pill app links with gradient card tiles (4 cards matching index.html design)
- [x] Clean up all dead JS/CSS code for removed widgets
- [x] Hero text overlay: "The Gabriel Family" + "Get Shit Done!" centered on photo grid
- [x] Hero text hides in edit mode (JS toggle)
- [x] Rename all "Pizzo" → "Gabriel" throughout
- [x] Header nav updated: Home, Allowance, Trip Planner, Stuffies, Books
- [x] Edit FAB always visible (not waiting for Firebase)
- [x] Firebase appId matched to index.html
- [x] Fix Firebase security rules — `landingPage/` public, `hub/` public, `allowanceData/` auth-protected
- [x] Connect Allowance widget to Firebase — anonymous auth + live weekTotal/yearlyEarnings
- [x] Remove debug logging from hub.js (debug banner, console.log statements)
- [x] Remove debug.html and fix-rules.html helper files
- [x] Create dedicated Shopping Lists page (shopping.html) — full-page with store tabs
- [x] Create dedicated Notes page (notes.html) — full-page with author badges, timestamps
- [x] Wire hub widget "View →" / "Add →" links to new pages
- [x] Shopping: Full List tab (all stores grouped with headers)
- [x] Shopping: Export to .txt file (single store or combined)
- [x] Shopping: Person tracking (addedBy field + person selector + colored badges)
- [x] Shopping: Filter by person (All/Dad/Mom/Helena/Maria pills)
- [x] Shopping: Reset list with 2-tap confirmation
- [x] Shopping: Claude AI REST API integration (documented endpoints, gold badge)

## Still Todo
- [ ] Test photo edit: upload, reposition (drag + scroll zoom), restore to default
- [ ] Mobile responsive testing (400px) for hub, shopping, notes pages
- [ ] Calendar widget: needs Google Calendar API key + Calendar ID (or remove/replace)
- [ ] Merge feature/family-hub → main when ready to deploy
- [ ] Clean up — remove tasks/ from git if not wanted

## Notes
- Local server: `cd Family-Website && python3 -m http.server 8888`
- Chrome in Chrome MCP is connected and working
- Firebase REST API for Claude: POST to `https://gabriel-family-allowance-default-rtdb.firebaseio.com/hub/shopping/{store}.json`
- Branch: feature/family-hub (4 commits ahead of main)
