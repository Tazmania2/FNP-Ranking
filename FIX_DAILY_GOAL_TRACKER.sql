-- ============================================================================
-- FIX: Daily Goal Tracker
-- 
-- Problem: The dashboard_snapshot table was never being populated.
-- The frontend reads from it to show the daily sales goal, but nothing writes to it.
--
-- Solution: Create a function that computes today's sales data in real-time
-- from the actions table, and a trigger to auto-update dashboard_snapshot
-- after each sale.
-- ============================================================================

-- ============================================================================
-- STEP 1: Create the dashboard_snapshot table if it doesn't exist
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboard_snapshot (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  daily_sales_total NUMERIC DEFAULT 0,
  daily_sales_target NUMERIC DEFAULT 50000,  -- Default daily target (R$ 50.000)
  daily_sales_count INTEGER DEFAULT 0,
  daily_goal_met BOOLEAN DEFAULT false,
  leaderboard JSONB DEFAULT '[]'::jsonb,
  total_players INTEGER DEFAULT 0,
  leader_points NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date)
);

-- ============================================================================
-- STEP 2: Function to get real-time daily sales (for direct frontend use)
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
  -- Get today's total sales amount from actions
  SELECT 
    COALESCE(SUM((a.attributes->>'price')::NUMERIC), 0),
    COUNT(DISTINCT a.id)
  INTO v_total, v_count
  FROM actions a
  WHERE a.action_id = 'sell_product'
    AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') = p_date
    AND (a.attributes->>'store_wide_sale')::BOOLEAN = true;

  -- Get target from existing snapshot or use default
  SELECT COALESCE(daily_sales_target, 50000)
  INTO v_target
  FROM dashboard_snapshot
  WHERE snapshot_date = p_date;

  -- Use default if no snapshot exists
  IF v_target IS NULL THEN
    v_target := 50000;
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
-- STEP 3: Function to refresh the dashboard_snapshot (called after each sale)
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_snapshot(
  p_date DATE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE
)
RETURNS void AS $$
DECLARE
  v_total NUMERIC;
  v_count INTEGER;
  v_target NUMERIC := 50000;  -- Default target
  v_total_players INTEGER;
  v_leader_points NUMERIC;
  v_leaderboard JSONB;
BEGIN
  -- Calculate today's total sales (sum of all sale prices, not points)
  SELECT 
    COALESCE(SUM((a.attributes->>'price')::NUMERIC), 0),
    COUNT(DISTINCT a.id)
  INTO v_total, v_count
  FROM actions a
  WHERE a.action_id = 'sell_product'
    AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') = p_date
    AND (a.attributes->>'store_wide_sale')::BOOLEAN = true;

  -- Get existing target if already set
  SELECT daily_sales_target INTO v_target
  FROM dashboard_snapshot
  WHERE snapshot_date = p_date;
  
  IF v_target IS NULL THEN
    v_target := 50000;
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
-- STEP 4: Trigger to auto-refresh snapshot after each sale action
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_refresh_dashboard_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Only refresh for sale actions
  IF NEW.action_id = 'sell_product' THEN
    PERFORM refresh_dashboard_snapshot(
      DATE(NEW.created_at AT TIME ZONE 'America/Sao_Paulo')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_refresh_dashboard_on_sale ON actions;
CREATE TRIGGER auto_refresh_dashboard_on_sale
  AFTER INSERT ON actions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_dashboard_on_sale();

-- ============================================================================
-- STEP 5: Also refresh on presence (to update leaderboard/player count)
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_refresh_dashboard_on_presence()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_dashboard_snapshot(NEW.presence_date);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_refresh_dashboard_on_presence ON daily_presence;
CREATE TRIGGER auto_refresh_dashboard_on_presence
  AFTER INSERT ON daily_presence
  FOR EACH ROW
  EXECUTE FUNCTION trigger_refresh_dashboard_on_presence();

-- ============================================================================
-- STEP 6: Initialize today's snapshot right now
-- ============================================================================

SELECT refresh_dashboard_snapshot();

-- ============================================================================
-- STEP 7: Set daily sales target (run this to configure your target)
-- Default is R$ 50.000. Change the value below as needed.
-- ============================================================================

-- To change the daily target:
-- UPDATE dashboard_snapshot SET daily_sales_target = 30000 WHERE snapshot_date = CURRENT_DATE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check today's snapshot:
SELECT * FROM dashboard_snapshot WHERE snapshot_date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

-- Get real-time summary:
SELECT get_daily_sales_summary();
