-- ============================================================================
-- FIX V2: Daily Goal Tracker - Correct Sales Calculation
-- 
-- Problem: log_store_sale() creates one action row PER PLAYER for each sale.
-- The dashboard functions were summing ALL rows, counting the same sale
-- price once per player (e.g., 12 players × R$64 = R$768 instead of R$64).
--
-- Solution: Deduplicate by grouping on (delivery_title, price, created_at)
-- to count each unique sale only once before summing.
-- ============================================================================

-- ============================================================================
-- STEP 1: Fix get_daily_sales_summary() - used as RPC fallback by frontend
-- ============================================================================

CREATE OR REPLACE FUNCTION get_daily_sales_summary(
  p_date DATE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE
)
RETURNS JSON AS $$
DECLARE
  v_total NUMERIC;
  v_count INTEGER;
  v_target NUMERIC;
  v_goal_met BOOLEAN;
BEGIN
  -- Get today's total sales - deduplicated by unique sale
  -- Each sale creates N rows (one per player), all sharing the same
  -- delivery_title, price, and created_at timestamp.
  -- We group by these to count each physical sale only once.
  SELECT 
    COALESCE(SUM(unique_sale.price), 0),
    COUNT(*)
  INTO v_total, v_count
  FROM (
    SELECT 
      (a.attributes->>'price')::NUMERIC AS price
    FROM actions a
    WHERE a.action_id = 'sell_product'
      AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') = p_date
      AND (a.attributes->>'store_wide_sale')::BOOLEAN = true
    GROUP BY a.attributes->>'delivery_title', a.attributes->>'price', a.created_at
  ) unique_sale;

  -- Get target from existing snapshot or use default
  SELECT COALESCE(daily_sales_target, 6600)
  INTO v_target
  FROM dashboard_snapshot
  WHERE snapshot_date = p_date;

  -- Use default if no snapshot exists
  IF v_target IS NULL THEN
    v_target := 6600;
  END IF;

  v_goal_met := v_total >= v_target;

  RETURN json_build_object(
    'date', p_date,
    'daily_sales_total', v_total,
    'daily_sales_target', v_target,
    'daily_sales_count', v_count,
    'daily_goal_met', v_goal_met
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 2: Fix refresh_dashboard_snapshot() - called by trigger after each sale
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_snapshot(
  p_date DATE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE
)
RETURNS void AS $$
DECLARE
  v_total NUMERIC;
  v_count INTEGER;
  v_target NUMERIC := 6600;  -- Default target
  v_total_players INTEGER;
  v_leader_points NUMERIC;
  v_leaderboard JSONB;
BEGIN
  -- Calculate today's total sales - DEDUPLICATED
  -- Each sale inserts one row per player, so we group to get unique sales
  SELECT 
    COALESCE(SUM(unique_sale.price), 0),
    COUNT(*)
  INTO v_total, v_count
  FROM (
    SELECT 
      (a.attributes->>'price')::NUMERIC AS price
    FROM actions a
    WHERE a.action_id = 'sell_product'
      AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') = p_date
      AND (a.attributes->>'store_wide_sale')::BOOLEAN = true
    GROUP BY a.attributes->>'delivery_title', a.attributes->>'price', a.created_at
  ) unique_sale;

  -- Get existing target if already set
  SELECT daily_sales_target INTO v_target
  FROM dashboard_snapshot
  WHERE snapshot_date = p_date;
  
  IF v_target IS NULL THEN
    v_target := 6600;
  END IF;

  -- Get total active players
  SELECT COUNT(*) INTO v_total_players
  FROM players WHERE is_active = true;

  -- Get leader's points
  SELECT COALESCE(MAX(ps.total_points), 0) INTO v_leader_points
  FROM player_stats ps
  JOIN players p ON ps.player_id = p.id
  WHERE p.is_active = true;

  -- Get top 10 leaderboard as JSON
  SELECT COALESCE(jsonb_agg(row_to_json(sub)::jsonb), '[]'::jsonb)
  INTO v_leaderboard
  FROM (
    SELECT 
      p.id,
      p.name,
      COALESCE(ps.total_points, 0) AS points,
      ROW_NUMBER() OVER (ORDER BY COALESCE(ps.total_points, 0) DESC) AS position
    FROM players p
    LEFT JOIN player_stats ps ON p.id = ps.player_id
    WHERE p.is_active = true
    ORDER BY COALESCE(ps.total_points, 0) DESC
    LIMIT 10
  ) sub;

  -- Upsert the snapshot
  INSERT INTO dashboard_snapshot (
    snapshot_date,
    daily_sales_total,
    daily_sales_target,
    daily_sales_count,
    daily_goal_met,
    leaderboard,
    total_players,
    leader_points,
    updated_at
  ) VALUES (
    p_date,
    v_total,
    v_target,
    v_count,
    v_total >= v_target,
    v_leaderboard,
    v_total_players,
    v_leader_points,
    NOW()
  )
  ON CONFLICT (snapshot_date)
  DO UPDATE SET
    daily_sales_total = EXCLUDED.daily_sales_total,
    daily_sales_count = EXCLUDED.daily_sales_count,
    daily_goal_met = EXCLUDED.daily_goal_met,
    leaderboard = EXCLUDED.leaderboard,
    total_players = EXCLUDED.total_players,
    leader_points = EXCLUDED.leader_points,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Refresh today's snapshot immediately with corrected calculation
-- ============================================================================

SELECT refresh_dashboard_snapshot();

-- ============================================================================
-- VERIFICATION: Check the corrected values
-- ============================================================================

-- This should now show the real sales total (not inflated by player count)
SELECT * FROM dashboard_snapshot 
WHERE snapshot_date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

-- Compare: total action rows vs unique sales
SELECT 
  COUNT(*) AS total_action_rows,
  COUNT(DISTINCT (attributes->>'delivery_title' || '|' || created_at::text)) AS unique_sales,
  COUNT(DISTINCT player_id) AS players_involved
FROM actions 
WHERE action_id = 'sell_product'
  AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') = (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE
  AND (attributes->>'store_wide_sale')::BOOLEAN = true;
