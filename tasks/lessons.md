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
