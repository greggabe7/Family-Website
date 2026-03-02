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
- [x] Fix Firebase security rules — `landingPage/` now public read/write, `allowanceData/` kept auth-protected
- [x] Connect Allowance widget to Firebase — added anonymous auth + live weekTotal/yearlyEarnings display
- [x] Remove debug logging from hub.js (debug banner, console.log statements)
- [x] Remove debug.html and fix-rules.html helper files

## Still Todo
- [ ] Test photo edit: upload, reposition (drag + scroll zoom), restore to default
- [ ] Test all 5 widgets work with Firebase (Notes, Shopping, Quick Ref confirmed; Calendar needs API key)
- [ ] Mobile responsive testing (400px)
- [ ] Calendar widget: needs Google Calendar API key + Calendar ID (or remove/replace)
- [ ] Clean up — remove tasks/ from git if not wanted

## Notes
- Local server: `cd Family-Website && python3 -m http.server 8888`
- Chrome in Chrome MCP is now connected and working
