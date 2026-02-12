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

## Current Status

### How the app works now (post Feb 10 fixes):

- **Earning period**: Starts on the last payout date (inclusive) through today. All task earnings, daily bonuses, and streak bonuses within this period are summed.
- **Weekly streak**: Evaluated on fixed Sun-Sat calendar weeks. Checked on every daily bonus check, at week boundaries (Sunday), and during recalculation.
- **History view**: Shows a single full calendar week (Sun-Sat) with dropdown + arrow navigation. Current week shows days up to today. Supports current week + 8 prior weeks.
- **Yearly total**: Includes both paid-out amounts and current unpaid earnings.
- **Savings goals**: Accumulate from payouts only (not unpaid earnings). Start at $0 when goal is set, add each future payout amount.
- **Payout**: Resets `weekTotal` to $0, adds amount to `yearlyEarnings` and `goals.saved`.
- **Firebase sync**: On initial load, Firebase always wins. On reconnection, newer timestamp wins. `saveState()` won't push to Firebase until initial load completes.
