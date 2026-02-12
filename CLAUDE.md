# Family Website - Claude Code Instructions

## Project Overview

Family website hosted on Netlify (gabrielfamilywebsite.netlify.app) with a kids' allowance/chore tracker as the main interactive app.

## Architecture

- **Static site** — Single HTML files, no build system, no framework
- **kids-money-tracker.html** — Main app. Vanilla JS with Tailwind CSS (CDN). All logic in one file (~4900 lines)
- **Firebase Realtime Database** — Shared state backend. All devices sync through Firebase
- **localStorage** — Local cache/backup of state. Firebase is the source of truth

## Key Concepts

### State Management
- Single global `state` object holds everything (tasks, earnings, users, history)
- `saveState()` writes to both localStorage and Firebase
- `stripTransientFields()` removes UI-only fields before persisting
- `sanitizeState()` ensures all required properties exist after load/sync

### Firebase Sync
- `setupRealtimeSync()` is the sole Firebase listener (`onValue`)
- On initial load: Firebase ALWAYS wins over local state (never trust localStorage timestamps on first load)
- On reconnection (`firebaseLoaded === true`): newer timestamp wins
- `saveState()` is gated on `firebaseLoaded` — won't push to Firebase until initial load completes
- After sync, execution order matters: `sanitizeState()` → `checkDailyReset()` → `cleanupInvalidCompletions()` → `silentRecalculateEarnings()`
- **Daily reset must run BEFORE cleanup** — cleanup filters by today's applicability, which would remove yesterday's day-specific completions before they can be archived

### Earnings System
- **Earning period**: From last payout date (inclusive) through today
- **Payout boundary**: Payout day is inclusive in next period (payouts happen Sunday AM before tasks)
- **Weekly streak**: Fixed Sun-Sat calendar weeks via `getCalendarWeekDates()`
- **Earnings are derived**: Always recomputed from completionHistory + dailyBonusAwarded + weeklyStreakAwarded
- **Daily bonuses are re-validated**: `silentRecalculateEarnings()` re-derives `dailyBonusAwarded` from actual completion data on every recalc — never trusts stored flags blindly
- **Joint tasks**: Payout only counted when BOTH children completed the task. All recalculation and editing functions check `task.isJoint`
- **Yearly total**: Paid-out amounts (`yearlyEarnings`) + current unpaid `weekTotal`

### History View
- `renderWeeklyHistory()` shows one calendar week at a time
- `state.historyWeekOffset` controls navigation (0 = this week, -1 = last week, etc.)
- Transient field — not persisted to Firebase/localStorage

## Critical Safety Rules

1. **NEVER open the app on a new origin/port while Firebase is live** — A fresh instance can overwrite production data even with sync guards
2. **Test with `database.goOffline()` first** when using localhost or test instances
3. **Override `confirm()`/`alert()` before calling functions that use them** in browser automation — dialogs block the extension
4. **Export backup before any risky changes** — Use the built-in Export All Data button in parent settings
5. **Earnings are derived, not stored** — If earnings look wrong, the fix is in recalculation logic, not in patching stored values
6. **Bonus flags are re-validated, not trusted** — `silentRecalculateEarnings()` re-derives all bonus flags from completion data. Don't add code that trusts stored `dailyBonusAwarded` without re-checking

## Users

- `dad` / `mom` — Parent accounts (full access including settings, payouts, history editing)
- `maria` / `helena` — Child accounts (can only toggle their own tasks for today)

## File Structure

```
kids-money-tracker.html  — Main app (all-in-one)
tasks/lessons.md         — Bug history and patterns learned
tasks/todo.md            — Current task tracking
```

## Common Operations

- **Payout**: Parent settings > Weekly Payout > "Pay Out" button. Calls `processWeeklyPayout(childKey)`
- **History edit**: Parent view > Weekly History & Edit > select child > toggle tasks/bonuses for past days
- **Export/Import**: Parent settings > Data Management section
- **Earnings recalc**: Happens automatically via `silentRecalculateEarnings()` after any state change

## Testing Approach

- Use `database.goOffline()` in browser console before testing to prevent Firebase writes
- Override `window.confirm = () => true` and `window.alert = console.log` to avoid blocking dialogs
- Refresh the page after testing to restore real state from Firebase
