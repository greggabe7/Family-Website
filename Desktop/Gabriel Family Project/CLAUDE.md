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

## Session Log: Feb 4, 2025 - Daily Reset Bug Fix

### Issue Reported
- App not resetting for new day - tasks from Feb 3 showing as completed on Feb 4
- Streak showing 4/7 instead of 3/7 (counting stale data as today's completions)
- Totals not matching expected values

### Root Cause
The `setupRealtimeSync()` function's `.on('value')` listener was overwriting local state with Firebase data WITHOUT calling `checkDailyReset()`. This caused:
1. Yesterday's `completedTasks` to persist and display as completed
2. Streak calculation to count stale `completedTasks` as today's data
3. Daily bonus not being awarded for the previous day

### Fix Applied
Added `checkDailyReset()` call to the realtime sync handler in `setupRealtimeSync()`:
- Location: Lines 616-627 in `kids-money-tracker.html`
- Now when Firebase data syncs, daily reset logic runs immediately after
- If it's a new day, tasks are archived to history, `completedTasks` is cleared, and `todayTotal` resets to 0

### Lessons Learned
5. **Always run reset checks after loading external data** - Firebase sync was bypassing the daily reset logic, causing stale state to persist

### Additional Changes (Feb 4)

1. **Daily Bonus Animation** - Replaced alert popup with pot of gold animation
   - Trophy floats down from top of screen
   - Sprinkles gold coins and sparkles
   - Shows child's name and "+$1 BONUS!" text
   - Auto-disappears after 3 seconds (no click required)

2. **Confirmation Dialogs** - Added to `deleteTask()` function
   - Shows task name and warns about earnings deduction
   - Other destructive actions (reset data, weekly payout) already had confirmations

3. **Task Reordering - Drag and Drop** - Replaced ▲/▼ buttons with drag-and-drop
   - Tasks can now be dragged to reorder within their section
   - Visual feedback: dragging task becomes semi-transparent, drop target shows blue border
   - Drag handle icon (≡) indicates draggable items
   - Tasks stay within their section (can't drag Morning task to Evening)

4. **Better Error Messages** - Added toast notification system
   - Shows user-friendly messages when Firebase sync fails
   - Different messages for load/save/sync errors
   - "Connected!" toast when connection is restored
   - 10-second cooldown prevents toast spam
   - Toasts auto-dismiss after 5 seconds (can also click to close)

5. **Offline Mode Indicator** - Enhanced sync status visibility
   - Fixed yellow banner at top of screen when offline
   - Banner shows "You're offline — changes are saved locally and will sync when reconnected"
   - Enhanced status badge with color-coded backgrounds (green=synced, yellow=syncing, red=offline)
   - Pulsing dot animation for active states
   - Banner auto-appears/disappears based on connection state

---

## Remaining Improvements (Future Sessions)

### Priority 1: Quick Wins (Low Effort, High Impact)

- [x] **Confirmation dialogs** - Add "Are you sure?" before destructive actions (delete task, reset week, clear data) ✅ Implemented Feb 4
- [x] **Undo for task completion** - Kids can un-check tasks (already working)
- [x] **Better error messages** - Toast notifications for sync errors ✅ Implemented Feb 4

### Priority 2: UX Improvements

- [x] **Offline mode indicator** - Prominent banner + enhanced status badge ✅ Implemented Feb 4
- [x] **Task reordering** - Drag-and-drop to reorder tasks within sections ✅ Implemented Feb 4
- [ ] **Bulk task operations** - Select multiple tasks for delete/edit (parent only)
- [ ] **Keyboard shortcuts** - Quick keys for common actions (especially on desktop)

### Priority 3: Feature Ideas

- [x] **Savings goals** - Already implemented
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
