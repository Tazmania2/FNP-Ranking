# Monthly Leaderboard Deployment Checklist

## Status: Ready to Deploy ✅

All code changes are complete. Follow these steps in order:

---

## Step 1: Fix Database Function

**File:** `FIX_RECALCULATE_FUNCTION.sql`

**Action:** Copy and paste into Supabase Studio SQL Editor and run

**What it does:**
- Drops the old `recalculate_monthly_leaderboard()` function
- Creates new version with proper column types and no ambiguity
- Fixes: "column reference player_id is ambiguous" error
- Fixes: "Returned type bigint does not match expected type numeric" error

**Expected result:**
```
status
--------------
Function fixed!
```

---

## Step 2: Populate Leaderboards

**File:** `POPULATE_MONTHLY_LEADERBOARDS.sql`

**Action:** Copy and paste into Supabase Studio SQL Editor and run

**What it does:**
- Calculates May 2026 rankings from existing 1.5M actions (days 26-31)
- Calculates June 2026 rankings from existing 1.5M actions (days 1-12)
- Inserts entries into `leaderboard_entries` table
- Shows top 20 players for each month

**Expected result:**
```
May 2026 Rankings:
position | player_name    | total_points | presence_days | sales_count
---------|----------------|--------------|---------------|------------
1        | João Silva     | 250.5        | 6             | 15
2        | Maria Santos   | 245.0        | 5             | 18
...

June 2026 Rankings:
position | player_name    | total_points | presence_days | sales_count
---------|----------------|--------------|---------------|------------
1        | José Oliveira  | 310.0        | 10            | 22
2        | Ana Costa      | 305.5        | 9             | 20
...
```

---

## Step 3: Verify in Database

Run these queries to confirm everything worked:

```sql
-- Should show 2 leaderboards
SELECT * FROM list_monthly_leaderboards();

-- Should show rankings for June 2026
SELECT 
  "position",
  player_name,
  total_points,
  presence_days,
  sales_count
FROM get_monthly_leaderboard(2026, 6)
ORDER BY "position"
LIMIT 10;

-- Should show rankings for May 2026
SELECT 
  "position",
  player_name,
  total_points,
  presence_days,
  sales_count
FROM get_monthly_leaderboard(2026, 5)
ORDER BY "position"
LIMIT 10;
```

---

## Step 4: Build Frontend

**Action:** Build the updated TypeScript code

```bash
npm run build
# or
yarn build
```

**Expected result:** No TypeScript errors, build succeeds

---

## Step 5: Test in Browser

1. Open the app in browser
2. Click "Começar a Corrida!" 
3. **Expected:** App shows "Ranking Junho 2026" (not "Ranking Geral")
4. Check browser console for: "🚀 Fetching current month leaderboard from API..."
5. Verify rankings match database query results

---

## Automatic Updates

Once deployed, the system will automatically:

✅ Update current month's leaderboard when new actions are recorded (via trigger)
✅ Create new leaderboard for next month when July arrives
✅ Keep historical leaderboards (May, June, July, etc.) forever

---

## Rollback Plan

If something goes wrong:

1. **Database:** Just re-run `SUPABASE_MONTHLY_LEADERBOARDS.sql` to reset everything
2. **Frontend:** Revert git commit or redeploy previous version

---

## Files Reference

- ✅ `FIX_RECALCULATE_FUNCTION.sql` - Fixes function errors
- ✅ `POPULATE_MONTHLY_LEADERBOARDS.sql` - Populates May & June 2026
- ✅ `CHECK_EXISTING_DATA.sql` - Verification queries
- ✅ `src/services/supabaseApi.ts` - Added monthly leaderboard methods
- ✅ `src/hooks/useChickenRaceManager.ts` - Updated to use current month
- ✅ `MONTHLY_LEADERBOARD_FRONTEND_UPDATE.md` - Code changes documentation
- ✅ `MONTHLY_LEADERBOARDS_GUIDE.md` - Complete system documentation

---

**Status:** Everything ready! Just run the SQL files in order, then build and deploy frontend.
