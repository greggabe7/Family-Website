# Gabriel Family Project

This project contains two apps: the Family Website landing page and the Weekly Allowance Tracker.

## GitHub Repo
https://github.com/greggabe7/Family-Website

---

## 1. Family Website (`index.html`)

### What It Does
Landing page for the Gabriel family with a photo collage hero section and links to family apps.

### Architecture
- **Static HTML** with Tailwind CSS (via CDN)
- **Photos**: Hosted on Imgur
- **No backend** - pure static site

### Key Sections
- Hero with 10-photo grid (5x2 grid at all screen sizes)
- Family Apps section with two cards: Weekly Allowance and Trip Planner

### External Links
- Trip Planner: https://gabriel-trip-planner.netlify.app/

---

## 2. Weekly Allowance Tracker (`kids-money-tracker.html`)

### What It Does
Chore/allowance tracking app for Helena and Maria. Kids and parents can log in, mark completed chores, and track weekly earnings. Includes celebratory fireworks animation when tasks are completed.

### Users
- **Parents**: Mom, Dad (can modify settings, approve tasks)
- **Kids**: Helena, Maria

### Architecture
- **Frontend**: Static HTML with Tailwind CSS and vanilla JavaScript
- **Data Storage**: Firebase Realtime Database (cross-device sync built-in)
- **No server needed** - Firebase SDK handles everything from the browser

### Firebase Project
- Project: `gabriel-family-allowance`
- Database URL: `https://gabriel-family-allowance-default-rtdb.firebaseio.com`

### Features
- Individual login for each family member
- Daily chore tracking with adjustable per-chore payout (default $0.15)
- Weekly totals and history
- Customizable payout amounts (parent only)
- Real-time sync across devices via Firebase
- Fireworks celebration effect on task completion
- Cash register cha-ching sound on chore completion (`sounds/cha-ching.mp3`)
- Coin drop sound on payout (`sounds/coin-drop.mp3`)
- Back to Family Website link on login page

### Important Technical Notes
- `checkDailyReset()` must only run AFTER Firebase data loads (not on stale localStorage) to avoid wiping cross-device progress
- Transient UI state (`showSettings`, `editingSection`, `editingPayout`, `editingDays`, `editingName`, `showAddTask`) is excluded from Firebase/localStorage saves to prevent stale UI on reload
- HTML `<select>` elements must use `selected` attribute on `<option>` tags, not `value` on the `<select>` tag
- Sound files are in `/sounds/` directory

---

## Deployment Notes
All files are static HTML and can be hosted on **Netlify** (recommended) or any static hosting platform. No build step required - just upload the files.

- Family Website: https://gabrielfamilywebsite.netlify.app/
- Trip Planner: https://gabriel-trip-planner.netlify.app/

### Data Persistence
- localStorage data is NOT affected by code deploys — it's tied to the browser, not the code files
- Firebase is the authoritative data source; localStorage is a local cache
- Adding new state properties is safe (loadState merges on top of defaults)
- Avoid renaming/removing existing state keys that hold user data

The Weekly Allowance app already uses the ideal architecture (static HTML + Firebase), which could serve as a template for future projects.

## Owner Preferences
- Prefers Netlify + Firebase for simple apps
- Most apps don't need heavy security or computation
- When starting new projects, weigh pros/cons of serverless vs server-based

---

## Session Log: Feb 3, 2025 - Allowance App Bug Fixes

### What Was Completed

**Critical Bug Fixes (all merged to main):**

1. **History View Task Filtering** - Fixed `taskAppliesToDate` function
   - One-time tasks now only show on the day completed (or today if pending)
   - Bonus section tasks only show on completion day (or today)
   - Weekly/monthly tasks show every day (can be completed any day)
   - Added legacy 'weekday' format support (Mon-Fri)

2. **Streak Bonus Attribution** - Fixed `checkWeeklyStreak` function
   - Weekly streak bonus no longer incorrectly inflates `todayTotal`
   - Bonus only adds to `weekTotal` (it's a week achievement, not daily)

3. **Race Condition Fix** - Fixed `toggleTaskSkipped` function
   - Removed `setTimeout` around `checkDailyBonus()` that caused async race conditions
   - Bonus calculations now run synchronously

4. **Task Deletion Cleanup** - Fixed `deleteTask` function
   - Now removes task ID from `completedTasks`, `skippedTasks`, `completionHistory`, and `skippedHistory`
   - Deducts earnings properly when deleting a completed task
   - Prevents orphaned task IDs from corrupting earnings data

5. **Admin Recalculation Tool** - Added `recalculateEarningsFromHistory` function
   - Available in browser console for data integrity fixes
   - Rebuilds earnings from completion history, ignoring orphaned task IDs
   - Run via: `recalculateEarningsFromHistory()` in DevTools console

6. **Data Integrity Fix**
   - Cleaned up orphaned task IDs (deleted tasks with lingering completion records)
   - Added $0.15 manual credit to Helena for deleted "massage table" task

**Commits:**
- `a3f8d88`: Fix history view task filtering and streak bonus attribution
- `47913d4`: Fix deleteTask to clean up completion records and add recalculation tool

---

## Remaining Improvements (Future Sessions)

### Priority 1: Quick Wins (Low Effort, High Impact)

- [ ] **Confirmation dialogs** - Add "Are you sure?" before destructive actions (delete task, reset week, clear data)
- [ ] **Undo for task completion** - Let kids un-check a task they accidentally marked complete (within same day)
- [ ] **Better error messages** - Show user-friendly errors when Firebase sync fails instead of silent failures

### Priority 2: UX Improvements

- [ ] **Offline mode indicator** - Make it clearer when app is offline vs syncing vs connected
- [ ] **Task reordering** - Drag-and-drop to reorder tasks within sections
- [ ] **Bulk task operations** - Select multiple tasks for delete/edit (parent only)
- [ ] **Keyboard shortcuts** - Quick keys for common actions (especially on desktop)

### Priority 3: Feature Ideas

- [ ] **Savings goals** - Let kids set a target amount they're working toward (shows progress bar)
- [ ] **Data export** - Export earnings history to CSV/PDF for record-keeping
- [ ] **Parent approval workflow** - Optional approval step for bonus tasks before payout counts
- [ ] **Task notes** - Kids can add a note when completing a task ("cleaned the whole bathroom!")
- [ ] **Recurring task templates** - Quick-add common chore sets

### Priority 4: Code Quality / Architecture

- [ ] **Split into modules** - Current file is 3600+ lines; separate HTML, CSS, and JS
- [ ] **Add error boundaries** - Catch and display JS errors gracefully instead of white screen
- [ ] **Unit tests** - Test critical functions like earnings calculation, date filtering
- [ ] **TypeScript migration** - Add type safety for state management

### Priority 5: Data Management

- [ ] **Automatic backups** - Scheduled Firebase backup or export reminder
- [ ] **Data import** - Restore from backup file
- [ ] **Audit log** - Track who made changes and when (useful for disputes)

---

## Known Technical Debt

1. **Single-file architecture** - All 3600+ lines in one HTML file makes maintenance harder
2. **No build step** - Using CDN for Tailwind means no tree-shaking, larger payload
3. **Manual state management** - Could benefit from a lightweight state library
4. **No automated tests** - All testing is manual

---

## Lessons Learned

1. **Always clean up references when deleting** - The orphaned task ID bug happened because `deleteTask` didn't clean completion records
2. **Don't add async delays without clear reason** - The `setTimeout` in `toggleTaskSkipped` created race conditions
3. **Recalculation tools are essential** - Having `recalculateEarningsFromHistory` saved hours of manual data fixing
4. **Test with real data** - The orphaned ID bug only surfaced when testing with actual week-long usage data
