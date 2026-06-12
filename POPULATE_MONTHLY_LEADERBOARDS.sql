-- Populate monthly leaderboards from existing data
-- This will create May 2026 and June 2026 leaderboards

-- First, run the fixed recalculate function
-- (Copy from FIX_RECALCULATE_FUNCTION.sql if not already run)

-- Step 1: Recalculate May 2026 (days 26-31)
SELECT 'Recalculating May 2026...' as status;
SELECT * FROM recalculate_monthly_leaderboard(2026, 5)
ORDER BY "position"
LIMIT 10;

-- Step 2: Recalculate June 2026 (days 1-12)
SELECT 'Recalculating June 2026...' as status;
SELECT * FROM recalculate_monthly_leaderboard(2026, 6)
ORDER BY "position"
LIMIT 10;

-- Step 3: Verify leaderboards were created
SELECT 'Leaderboards created:' as status;
SELECT * FROM list_monthly_leaderboards();

-- Step 4: Check May 2026 full results
SELECT 'May 2026 Rankings:' as status;
SELECT 
  "position",
  player_name,
  total_points,
  presence_days,
  sales_count
FROM get_monthly_leaderboard(2026, 5)
ORDER BY "position"
LIMIT 20;

-- Step 5: Check June 2026 full results
SELECT 'June 2026 Rankings:' as status;
SELECT 
  "position",
  player_name,
  total_points,
  presence_days,
  sales_count
FROM get_monthly_leaderboard(2026, 6)
ORDER BY "position"
LIMIT 20;
