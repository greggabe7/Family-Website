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

- [ ] **Bug 5: `checkHistoryDailyBonus` uses today's task list for past days** (line ~1062)
  - Evaluates daily bonus for previous days against current `state.tasks`. If tasks were added/removed since then, bonus calculation is wrong.

- [ ] **Bug 6: Savings goals progress resets every week** (line ~3087)
  - Progress bar uses `weekTotal`, which resets to $0 after weekly payout. Multi-week savings goals always show only current week's progress.

- [x] **Bug 7: `checkHistoryDailyBonus` skips `roundMoney()`** (lines ~2161, ~2164) ✅ Fixed
  - Uses raw `+=` instead of `addEarnings`/`subtractEarnings`, risking floating-point display issues.

- [x] **Bug 8: `processWeeklyPayout` raw addition for yearly earnings** (line ~1911) ✅ Fixed
  - `yearlyEarnings` accumulates with `+=` instead of `roundMoney`.

- [x] **Bug 9: `defaultPayout` change not persisted** (line ~3846) ✅ Fixed
  - `oninput` updates state but doesn't call `saveState()`. Change lost on reload.

### LOW Priority (XSS / Edge Cases)

- [ ] **Bug 10: XSS in child names, goal names, passwords** (multiple locations)
  - `escapeHtml()` not applied to child names (lines ~2939, ~2942), goal names (lines ~3082, ~3928), passwords (line ~3970), form input values (lines ~2924, ~3352). Names with quotes break onclick handlers.

- [ ] **Bug 11: Drag-and-drop cross-section confusion** (line ~1697)
  - Weekly/monthly tasks have visual section but `task.section` is still `morning` etc. Drag uses `task.section` for same-section check.

- [ ] **Bug 12: Import is a destructive overwrite** (line ~2057)
  - Import replaces state entirely with no merge, pushes immediately to Firebase, overwrites other devices.
