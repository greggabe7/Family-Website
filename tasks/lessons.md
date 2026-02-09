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

## Current Status

### How the app works now (post Feb 8 fixes):

- **Earning period**: Starts the day after the last payout (or earliest history entry if no payouts). All task earnings, daily bonuses, and streak bonuses within this period are summed.
- **Weekly streak**: Evaluated on fixed Sun-Sat calendar weeks. Checked on every daily bonus check, at week boundaries (Sunday), and during recalculation.
- **History view**: Shows all days in the earning period, grouped by calendar week with headers ("Week of Feb 1 - Feb 7") and streak indicators.
- **Yearly total**: Includes both paid-out amounts and current unpaid earnings.
- **Savings goals**: Accumulate from payouts only (not unpaid earnings). Start at $0 when goal is set, add each future payout amount.
- **Payout**: Resets `weekTotal` to $0, adds amount to `yearlyEarnings` and `goals.saved`.
