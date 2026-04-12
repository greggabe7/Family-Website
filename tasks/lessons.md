# Lessons Learned

## Feb 7, 2026 - Daily Reset Race Condition

**Problem:** Kids' task completions from Feb 6 were not saved. Investigation revealed a race condition between `loadState()` (which used `.once('value')`) and `setupRealtimeSync()` (which uses `.on('value')`). Both fired async Firebase queries on startup that could interfere with each other.

**Root Cause:**
1. `loadState()` had a `.once('value')` Firebase query that unconditionally overwrote state (no conflict resolution)
2. After `checkDailyReset()` ran and saved updated state, line 864 overwrote localStorage with the original pre-reset `firebaseData`
3. This caused `lastModified` to revert to the old value, making state inconsistent

**Fix:**
- Removed `.once('value')` from `loadState()` entirely
- Let `setupRealtimeSync()`'s `.on('value')` be the sole Firebase data entry point
- Fixed localStorage save to use post-reset `state` instead of pre-reset `firebaseData`
- Added `firebaseLoaded` guard to prevent 1-minute interval from running on stale data

**Pattern to avoid:** Never have two competing async Firebase queries that both modify global state. Use a single listener as the authoritative data source.

**Pattern to follow:** Always save the CURRENT state to localStorage after modifications, not a captured copy of the original data.

---

## Feb 7, 2026 - Full Audit Bug List

### HIGH Priority (Data Loss / Crashes)

- [x] **Bug 1: `deleteTask` deducts earnings from ALL history, not just current week** (line ~1611) ✅ Fixed
  - Loops through ALL `completionHistory` dates and subtracts payout for each from `weekTotal`. Old weeks already paid out get deducted again, can zero out current week's earnings.

- [x] **Bug 2: `toggleHistorySkipped` and `toggleTaskSkipped` crash on deleted tasks** (lines ~2225, ~1521) ✅ Fixed
  - `state.tasks.find(...)` returns `undefined` for deleted tasks, then `.payout` access throws TypeError.

- [x] **Bug 3: Transient UI state (including passwords) leaking to Firebase** (lines ~856-891) ✅ Fixed
  - `saveState()` strips some transient fields but misses `tempAccountPassword`, `tempAccountConfirmPassword`, `editingTaskName`, `tempTaskName`, `editingGoal`, `tempGoalName`, `showHistory`, `editingFrequency`, `editingJoint`, `selectedHistoryChild`, `editingAccount`, `newTaskName`, `newTaskPayout`, `newTaskSection`, `newTaskDays`, `syncedFromReward`, `tempName`.

- [x] **Bug 4: Firebase sync comparison always differs** (line ~930) ✅ Fixed
  - `currentJson !== newJson` compares full local state (with transient fields) against `firebaseData` (without them). They can never match, so every Firebase callback overwrites local state including in-progress editing.

### MEDIUM Priority (Incorrect Behavior)

- [x] **Bug 5: `checkHistoryDailyBonus` uses today's task list for past days** (line ~1062) ✅ Fixed
  - Evaluates daily bonus for previous days against current `state.tasks`. If tasks were added/removed since then, bonus calculation is wrong.

- [x] **Bug 6: Savings goals progress resets every week** (line ~3087) ✅ Fixed
  - Progress bar uses `weekTotal`, which resets to $0 after weekly payout. Multi-week savings goals always show only current week's progress.

- [x] **Bug 7: `checkHistoryDailyBonus` skips `roundMoney()`** (lines ~2161, ~2164) ✅ Fixed
  - Uses raw `+=` instead of `addEarnings`/`subtractEarnings`, risking floating-point display issues.

- [x] **Bug 8: `processWeeklyPayout` raw addition for yearly earnings** (line ~1911) ✅ Fixed
  - `yearlyEarnings` accumulates with `+=` instead of `roundMoney`.

- [x] **Bug 9: `defaultPayout` change not persisted** (line ~3846) ✅ Fixed
  - `oninput` updates state but doesn't call `saveState()`. Change lost on reload.

### LOW Priority (XSS / Edge Cases)

- [x] **Bug 10: XSS in child names, goal names, passwords** (multiple locations) ✅ Fixed
  - `escapeHtml()` not applied to child names (lines ~2939, ~2942), goal names (lines ~3082, ~3928), passwords (line ~3970), form input values (lines ~2924, ~3352). Names with quotes break onclick handlers.

- [x] **Bug 11: Drag-and-drop cross-section confusion** (line ~1697) ✅ Fixed
  - Weekly/monthly tasks have visual section but `task.section` is still `morning` etc. Drag uses `task.section` for same-section check.

- [x] **Bug 12: Import is a destructive overwrite** (line ~2057) ✅ Fixed
  - Import replaces state entirely with no merge, pushes immediately to Firebase, overwrites other devices.

---

## Feb 8, 2026 - History Window, Weekly Streak, and Earnings Calculation

**Problem:** Three interconnected bugs caused by the rolling 7-day `getWeekDates()` window being used for everything:

1. **Feb 1 data disappears on Feb 8** — the rolling window shifts daily, so day 8 falls off
2. **Weekly streak bonus ($3) never awarded** — the 7-day window shifts each day, so a completed week's streak eventually slides past and is never rechecked
3. **Earnings lost on recalculation** — `silentRecalculateEarnings()` and `recalculateEarningsFromHistory()` only sum the rolling 7-day window, so older days lose their earnings

**Root Cause:** A single rolling 7-day window was being used for three different purposes that need different date ranges: weekly streak checking (needs fixed Sun-Sat calendar week), earnings calculation (needs all dates since last payout), and history display (needs all dates since last payout).

**Fix:** Replaced with two purpose-specific functions:
- `getCalendarWeekDates(refDate)` — Fixed Sun-Sat calendar week. Used for weekly streak evaluation and streak progress display.
- `getEarningPeriodDates(childKey)` — All dates from (last payout + 1 day) through today. Used for earnings calculation, history display, and deleteTask deductions.
- `getWeekDates()` kept as backward-compatible wrapper delegating to `getCalendarWeekDates(new Date())`.

**Additional fixes discovered during implementation:**

- [x] **`silentRecalculateEarnings` didn't include streak bonus at all** — Added full streak evaluation logic (not just reading already-awarded flags)
- [x] **Firebase sync overwrites correct earnings with stale data** — `Object.assign(state, firebaseData)` in the realtime sync handler would overwrite freshly-computed earnings with the old Firebase value. Fixed by always calling `silentRecalculateEarnings()` after sync, since earnings are derived data.
- [x] **Yearly total didn't include unpaid earnings** — `getYearlyEarnings()` only counted payouts. Fixed to add current `weekTotal` (unpaid earnings) for the current year.
- [x] **`checkWeeklyStreak` now checks both current and previous calendar week** — Ensures the bonus is awarded even if the last task of the week is completed near the week boundary.
- [x] **`checkDailyReset` now checks weekly streak on week boundary** — When the day transitions to Sunday, checks both children for the just-completed week's streak.

**Patterns learned:**

1. **Earnings are derived data, not a source of truth.** They should always be recomputed from completion history + daily bonuses + streak awards. Any path that modifies state (sync, import, manual history edits) must recalculate earnings afterward.
2. **Firebase sync can overwrite computed state.** After `Object.assign(state, firebaseData)`, any locally-computed values are lost. Always re-derive computed values after accepting synced data.
3. **A rolling window is wrong for accumulation.** Use a fixed anchor point (last payout date or calendar week boundary) instead of "last N days" when the goal is to track totals across a period.
4. **`silentRecalculateEarnings` must be comprehensive.** Since it's called after sync and cleanup, it's the last line of defense for correct totals. It must evaluate everything, not just read flags — otherwise bugs compound silently.

---

## Feb 8, 2026 - Stale localStorage Overwriting Firebase on Slow Connections

**Problem:** When the kids' Chromebook opens the app, it loads stale localStorage data. If a child clicks a task before Firebase connects, `saveState()` pushes stale data to Firebase with a fresh `Date.now()` timestamp — rolling back all devices.

**Root Cause:** `saveState()` unconditionally wrote to Firebase regardless of whether the initial Firebase load had completed. The `firebaseLoaded` flag existed but only gated `checkDailyReset()`.

**Fix:**
- Added `pendingLocalSave` flag alongside `firebaseLoaded`
- `saveState()` still writes to localStorage (preserving local state), but skips Firebase write if `firebaseLoaded === false`, setting `pendingLocalSave = true` instead
- After Firebase initial load in `setupRealtimeSync()`, `pendingLocalSave` is cleared without flushing — because `Object.assign(state, firebaseData)` already replaced state with fresh data, making the pending save stale

**Pattern to follow:** Any function that writes to a shared backend (Firebase, API, etc.) must be gated on whether the initial load from that backend has completed. Writing before reading = data loss risk.

---

## Feb 10, 2026 - Firebase Sync Race (Round 2), Payout Boundary, History Week View

**Problem:** Three issues:
1. Opening the app on a new origin (e.g., localhost:8081) with no localStorage caused fresh default state to overwrite Firebase production data — passwords reverted, yesterday's data lost
2. History view only showed days within the earning period, hiding days at the start of the calendar week
3. No way to navigate to prior weeks in history
4. Payout boundary excluded the payout day from the next earning period

**Root Cause (sync race):** The Feb 8 fix (`pendingLocalSave` + `firebaseLoaded` gate on `saveState`) prevented pre-load saves from reaching Firebase. But the `onValue` callback's timestamp comparison (line 993) still allowed a fresh instance to win: on a new origin, there's no localStorage, so default state loads. When Firebase data arrives, `localTimestamp > firebaseTimestamp` could be true if anything called `saveState()` before the callback (setting `state.lastModified = Date.now()`), causing the empty state to push over real data.

**Fix (sync race):** Added `firebaseLoaded` guard to the timestamp comparison. On initial load (`firebaseLoaded === false`), Firebase ALWAYS wins. The "local wins" path only activates during reconnection when `firebaseLoaded` is already true.

**Fix (payout boundary):** Removed `+1 day` offset in `getEarningPeriodDates()`. Earning period now starts on the payout date itself (inclusive). Payouts happen Sunday morning before tasks are entered, so the payout day's tasks should count toward the next period.

**Fix (history view):** Rewrote `renderWeeklyHistory()` to show a single full calendar week (Sun-Sat) based on `state.historyWeekOffset`. Added dropdown + arrow navigation for current week + 8 prior weeks. For current week, only shows days up to today.

**Critical lesson: NEVER open the app on a new origin/port while connected to the shared Firebase.** A fresh instance with no localStorage can overwrite production data. The sync fix mitigates this, but the pattern is dangerous. Always test with Firebase offline (`database.goOffline()`) or use a separate Firebase project for testing.

**Pattern to follow:** On initial page load, the remote database is ALWAYS the source of truth. Timestamp-based conflict resolution should only apply to reconnection scenarios where the user was actively making changes offline.

---

## Feb 11, 2026 - Task Completions Lost on Day Boundary + Stale Bonus

**Problem:** Maria's task completions from the previous day were appearing unchecked in history the next morning. The daily bonus still showed as earned despite the missing completion.

**Root Cause (task loss):** In `setupRealtimeSync()`, `cleanupInvalidCompletions()` ran BEFORE `checkDailyReset()`. When Firebase data arrived the next morning with yesterday's `completedTasks` still un-archived (daily reset hadn't fired yet on the saving device):
1. `cleanupInvalidCompletions()` filtered `completedTasks` using `isTaskApplicableToday()` — removing tasks not scheduled for TODAY
2. `checkDailyReset()` then archived the already-filtered (incomplete) set to `completionHistory` for yesterday
3. Day-specific task completions were permanently lost from history

**Root Cause (stale bonus):** `silentRecalculateEarnings()` blindly trusted the stored `dailyBonusAwarded` flag without re-validating whether all tasks were actually complete. Once set, the bonus persisted even if task data changed. Additionally, `checkHistoryDailyBonus()` only checks tasks with a record for that day — since the lost task had NO record at all (removed before archival), it was invisible to the bonus check.

**Fix:**
1. Swapped execution order: `checkDailyReset()` now runs BEFORE `cleanupInvalidCompletions()` in the sync callback. Yesterday's completions are archived to history before any day-applicability filtering can remove them.
2. `silentRecalculateEarnings()` now re-validates all `dailyBonusAwarded` flags from actual completion data instead of trusting stored values. Uses the same "known tasks only" approach as `checkHistoryDailyBonus()` for past dates, and `isTaskApplicableToday()` for today.

**Pattern to follow:** When multiple cleanup/transition functions run in sequence, order matters. Archival (moving data to its permanent location) must happen BEFORE cleanup (filtering data based on current-day rules). Derived flags (like bonus awarded) should be re-validated whenever the source data they depend on could have changed.

---

## Feb 11, 2026 - Joint Task Earnings Not Handled in Recalculation/Editing

**Problem:** `silentRecalculateEarnings()`, `recalculateEarningsFromHistory()`, `toggleTaskSkipped()`, `deleteTask()`, `toggleHistoryTask()`, and `toggleHistorySkipped()` all summed/adjusted task payouts without checking `task.isJoint`. For joint tasks, the payout should only count when BOTH children completed the task — but these functions awarded it to anyone with the task in their completions.

**Fix:**
1. Both recalculation functions now check `task.isJoint` and verify the other child also completed the task before counting the payout. Uses `completedTasks` for today, `completionHistory` for past dates.
2. `toggleTaskSkipped()` now checks joint status: if both children had a joint task completed and one is unskipping+removing completion, both children's earnings are deducted.
3. `deleteTask()` simplified: instead of manual per-child deductions (which couldn't handle joint logic), it now removes completion records, removes the task, then calls `silentRecalculateEarnings()` to re-derive correct totals.
4. `toggleHistoryTask()` and `toggleHistorySkipped()` now check joint status and adjust both children's earnings when the joint condition is met/broken.
5. Added null safety to `checkHistoryDailyBonus()` and `toggleHistoryBonus()` for `state.dailyBonusAwarded[childKey]` access.

**Pattern to follow:** Any function that adjusts earnings for a specific task must check `task.isJoint`. For joint tasks, the payout is only earned when BOTH children complete it — so adding/removing must account for the other child's state. When manual deduction logic gets complex, prefer calling `silentRecalculateEarnings()` to re-derive totals from scratch.

---

## Feb 12, 2026 - Stale Completions Shown Before Firebase Loads

**Problem:** A child logs in and sees tasks already checked as completed even though they hadn't completed them that day.

**Root Cause:** `loadState()` restores `completedTasks` from localStorage (which may contain yesterday's or a previous session's data). `checkDailyReset()` — the only function that clears stale completions — was only called inside the Firebase sync callback (async) and a 60-second interval. If the child logged in before Firebase responded, `render()` displayed stale `completedTasks` from localStorage.

**Fix:** Added `checkDailyReset()` call immediately after `loadState()` in the initialization sequence, before `setupRealtimeSync()` and `render()`. This clears stale completions synchronously before any UI is shown. Safe because:
- `saveState()` is gated on `firebaseLoaded` — won't push stale data to Firebase
- When Firebase arrives, `Object.assign(state, firebaseData)` replaces everything
- `pendingLocalSave` from the early reset is discarded by the sync handler
- `checkDailyReset()` runs again with correct Firebase data in the sync callback

**Pattern to follow:** Any function that transitions state based on date/time should run synchronously during initialization, not only in async callbacks. The user should never see stale state from a previous day, even briefly.

---

## Feb 15, 2026 - History Task Toggle Incorrectly Awards Daily Bonus

**Problem:** Checking any single task in the history view would immediately award the daily bonus, even if the child hadn't completed all their tasks for that day.

**Root Cause:** Both `checkHistoryDailyBonus()` and `silentRecalculateEarnings()` used a `knownTaskIds` filter that only considered tasks with a completion or skip record for that day. If a child had 5 daily tasks but only 1 was toggled in history, the system counted "1/1 tasks complete = all done!" and awarded the bonus. Tasks with no record were invisible to the check.

**Fix:** Removed the `knownTaskIds` filter from both functions. Now they evaluate ALL daily-applicable tasks for the date (matching what `renderWeeklyHistory()` already does at line 3595), then check if all non-skipped tasks are completed. This means a task must actually be completed to count, not just have a record.

**Note:** The original `knownTaskIds` approach was added to "prevent newly added tasks from retroactively affecting past bonuses." This was over-protective — the correct behavior is that the daily bonus requires ALL applicable tasks to be complete. If a new task is added, it correctly won't appear in past days' history (since `taskAppliesToDate` checks task creation date/applicability), so the concern was unfounded.

**Pattern to follow:** When checking "are all X done?", always start from the full universe of applicable items, not just the ones that have been touched. Filtering to only known/recorded items creates a selection bias where any single completion looks like 100%.

---

## Feb 23, 2026 - Payout Doesn't Clear Weekly Earnings

**Problem:** After hitting payout, the weekly earnings total showed the old (pre-payout) amount. Yearly total was correct because `processWeeklyPayout` adds to `yearlyEarnings` before the recalculation overwrites `weekTotal`.

**Root Cause:** `processWeeklyPayout` set `weekTotal = 0` and called `saveState()`, but did NOT clear `completedTasks[childKey]`. The `saveState()` triggered Firebase sync, which called `silentRecalculateEarnings()`, which recounted `completedTasks` (still full from today's tasks) back into `weekTotal` — immediately undoing the reset.

**Fix:** Added `state.completedTasks[childKey] = []` and `state.skippedTasks[childKey] = []` in `processWeeklyPayout` after resetting the totals. This gives `silentRecalculateEarnings()` a clean slate so it calculates `weekTotal = 0` for the new earning period.

**Pattern to follow:** Since earnings are derived data (recalculated from completionHistory + completedTasks), resetting `weekTotal` directly is insufficient — the recalculation will overwrite it. You must also clear the source data that feeds the recalculation, or the reset is a no-op.

---

## Feb 23, 2026 - One-Time Cleanup Race Condition with Firebase

**Problem:** The one-time data cleanup (to remove stale completionHistory entries from the payout bug) ran AFTER `checkDailyReset()` in the Firebase sync callback. But `checkDailyReset()` calls `saveState()`, which pushed stale data to Firebase before the cleanup could remove it. The Firebase echo then overwrote the cleanup with stale data.

**Root Cause:** Execution order in the sync callback: `checkDailyReset()` (saves stale data to Firebase) → cleanup (fixes in-memory state) → Firebase echo (overwrites fix with stale data).

**Fix:** Moved the one-time cleanup to run BEFORE `checkDailyReset()`. Now `checkDailyReset()`'s `saveState()` includes the cleaned data and the migration flag, so the Firebase echo has clean data.

**Pattern to follow:** Any one-time data migration in the Firebase sync callback must run BEFORE any function that calls `saveState()`. Otherwise the save pushes pre-migration data to Firebase, and the echo overwrites the migration.

---

## Feb 23, 2026 - One-Time Tasks Reappearing After Completion

**Problem:** One-time tasks that were completed on a previous day would reappear in the child's task list the next day.

**Root Cause:** `groupTasks()` filtered one-time tasks by checking `state.completedTasks[childKey]` (today's completions only). After `checkDailyReset()` archived completions to `completionHistory` and cleared `completedTasks`, the one-time task was no longer marked as completed for today, so it showed up again. `isTaskApplicableToday()` always returns `true` for one-time tasks without checking completion status.

**Fix:** In `groupTasks()`, the one-time task filter now also checks `completionHistory` and `skippedHistory` for past completions/skips. If a one-time task was completed or skipped on any past day, it's hidden. Parents can still see today's completed one-time tasks (to allow undo), but not past ones.

**Pattern to follow:** One-time tasks have lifecycle semantics (done once, gone forever). Any filter that decides whether to show them must check ALL completion sources (today's `completedTasks` AND historical `completionHistory`), not just today's state.

---

## Feb 23, 2026 - Late Payout Excludes New Week's Tasks

**Problem:** Paying out on Monday (Feb 23) for the previous weeks' work set the earning period start to Feb 23. Tasks entered for Sunday (Feb 22, the start of the new week) were excluded from the weekly total because Feb 22 < Feb 23.

**Root Cause:** `getEarningPeriodDates()` uses the payout date (inclusive) as the earning period start. When payout happens after the new week has started, the new week's early days fall before the earning period.

**Workaround (data fix):** Adjusted the payout record dates to Feb 21 so the earning period includes Feb 22+. No code fix yet — the earning period is fundamentally tied to the payout date.

**Known limitation:** Paying out "late" (after the new week has started) excludes the new week's early days from the earning period. Workaround: pay out before or on the first day of the new week. A future fix could anchor the earning period to calendar week boundaries instead of the payout date.

---

## Apr 10-12, 2026 - One-Time Task Earnings Lost After Completion

**Problem:** One-time chore earnings vanished from the weekly total the day after the chore was completed and disappeared from the task list.

**Root Cause (layer 1 — code bug):** `cleanupCompletedOneTimeTasks()` DELETED one-time tasks from `state.tasks` when both children completed them. Since `silentRecalculateEarnings()` looks up each task by ID from `completionHistory`, deleted tasks returned `undefined` and their payouts were silently skipped. `cleanupInvalidCompletions()` then removed the orphaned IDs from history, making the loss permanent.

**Fix (layer 1):** Changed from deletion (`state.tasks.filter(t => t.id !== task.id)`) to archival (`task.archived = true`). Added `if (task.archived) return false` to `isTaskApplicableToday()` and filtered archived tasks in `groupAllTasks()`. Archived tasks stay in `state.tasks` for earnings recalculation but are hidden from the UI.

**Root Cause (layer 2 — browser caching):** After deploying the archive fix, the bug persisted because other devices (kids' iPad/Chromebook) served the OLD cached JavaScript. The old code ran `cleanupCompletedOneTimeTasks()` with the delete behavior, corrupted Firebase, and undid the fix.

**Fix (layer 2):** Two-part cache defense:
1. Netlify `_headers` file: `Cache-Control: no-cache, must-revalidate` on all HTML files
2. In-app `CODE_VERSION` constant: `saveState()` stamps the version into Firebase. On sync, if Firebase has a newer version than the running code, the page force-reloads.

**Pattern to follow:** When deploying a fix that changes behavior affecting shared state (Firebase), you must also prevent stale cached code on OTHER devices from undoing the fix. Static HTML apps served from CDNs need explicit cache-control headers and/or code versioning to ensure all clients run the same code version.

---

## Current Status

### How the app works now (post Feb 23 fixes):

- **Earning period**: Starts on the last payout date (inclusive) through today. All task earnings, daily bonuses, and streak bonuses within this period are summed. Known limitation: paying out "late" excludes new-week days before the payout date.
- **Weekly streak**: Evaluated on fixed Sun-Sat calendar weeks. Checked on every daily bonus check, at week boundaries (Sunday), and during recalculation.
- **History view**: Shows a single full calendar week (Sun-Sat) with dropdown + arrow navigation. Current week shows days up to today. Supports current week + 8 prior weeks.
- **Yearly total**: Includes both paid-out amounts and current unpaid earnings.
- **Savings goals**: Accumulate from payouts only (not unpaid earnings). Start at $0 when goal is set, add each future payout amount.
- **Payout**: Resets `weekTotal` to $0, clears `completedTasks`/`skippedTasks` for the child (prevents recounting by `silentRecalculateEarnings`), adds amount to `yearlyEarnings` and `goals.saved`.
- **Firebase sync**: On initial load, Firebase always wins. On reconnection, newer timestamp wins. `saveState()` won't push to Firebase until initial load completes. Sync order: `sanitizeState()` → one-time migrations → `checkDailyReset()` → `cleanupInvalidCompletions()` → `silentRecalculateEarnings()`.
- **Daily bonuses**: Re-validated on every recalculation from actual completion data. Never blindly trusted from stored flags.
- **Joint tasks**: Payout only awarded when both children complete the task. All recalculation functions, `deleteTask()`, and history editing functions check `task.isJoint` and adjust both children's earnings accordingly.
- **One-time tasks**: Archived (not deleted) when both children complete. Hidden from child views once completed or skipped. Archived tasks stay in `state.tasks` for earnings recalculation.
- **Cache control**: Netlify `_headers` sets `no-cache` on HTML. `CODE_VERSION` in JS forces reload if stale code detects a newer version in Firebase.
