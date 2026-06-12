# Monthly Leaderboard Fix - Ready to Deploy

## Problem Summary

The `recalculate_monthly_leaderboard()` function had an **ambiguous column reference error** with `player_id`. PostgreSQL couldn't determine if `player_id` referred to the function's RETURNS TABLE column or the CTE column names.

**Error Message:**
```
ERROR: 42702: column reference "player_id" is ambiguous
DETAIL: It could refer to either a PL/pgSQL variable or a table column.
```

## Solution

All column names in the function now use prefixes to avoid ambiguity:
- `pp_*` prefix for `player_points` CTE columns
- `rp_*` prefix for `ranked_players` CTE columns
- `result_player_id` instead of `player_id` in RETURNS TABLE

## Current Data Status

✅ **Database has 1,531,226 actions** from May 26 to June 12, 2026
✅ **Ranking Junho 2026 exists** but is empty (0 players)
✅ **All helper functions created** (get_or_create_monthly_leaderboard, etc.)

## Step-by-Step Instructions

### Step 1: Run the Fix
Copy and paste the entire contents of `FIX_RECALCULATE_FUNCTION.sql` into Supabase Studio SQL Editor and run it.

**Expected result:**
```
status
--------------
Function fixed!
```

### Step 2: Populate Leaderboards
Copy and paste the entire contents of `POPULATE_MONTHLY_LEADERBOARDS.sql` into Supabase Studio SQL Editor and run it.

**Expected results:**
- May 2026 leaderboard populated (days 26-31)
- June 2026 leaderboard populated (days 1-12)
- Top 20 rankings displayed for each month

### Step 3: Verify Data
Run these queries to verify everything worked:

```sql
-- Check leaderboards were created
SELECT * FROM list_monthly_leaderboards();

-- Check June 2026 has entries now
SELECT 
  "position",
  player_name,
  total_points,
  presence_days,
  sales_count
FROM get_monthly_leaderboard(2026, 6)
ORDER BY "position"
LIMIT 10;
```

**Expected result:** June 2026 should now show players with rankings instead of being empty.

## Files Ready to Use

1. ✅ **FIX_RECALCULATE_FUNCTION.sql** - Fixes the ambiguous column error
2. ✅ **POPULATE_MONTHLY_LEADERBOARDS.sql** - Populates May and June 2026 from existing 1.5M actions
3. ✅ **CHECK_EXISTING_DATA.sql** - Verification queries

## What This Will Do

1. **Fix the broken function** - Replace `recalculate_monthly_leaderboard()` with working version
2. **Create May 2026 rankings** - Calculate from 1.5M actions (May 26-31)
3. **Update June 2026 rankings** - Calculate from 1.5M actions (June 1-12)
4. **Populate leaderboard_entries table** - Insert all player rankings with positions

## After Running

Once the leaderboards are populated, the frontend can display them with:

```typescript
// Get current month leaderboard
const june2026 = await supabaseApi.getMonthlyLeaderboard(2026, 6);

// Get previous month leaderboard
const may2026 = await supabaseApi.getMonthlyLeaderboard(2026, 5);

// List all available months
const allMonths = await supabaseApi.listMonthlyLeaderboards();
```

## Automatic Updates

Going forward, the trigger `update_monthly_leaderboard_on_action` will automatically update the current month's leaderboard whenever new actions are recorded. No manual intervention needed!

---

**Status:** Ready to run - just copy/paste SQL files into Supabase Studio
