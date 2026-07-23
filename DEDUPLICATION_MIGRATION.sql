-- ============================================================================
-- MIGRATION: Sale Deduplication via delivery_id
-- 
-- Problem: n8n re-sends old sales without deduplication, inflating daily_sales.
-- Solution: Use delivery_id as unique key. If a sale with that delivery_id
-- already exists, ignore it entirely.
--
-- Steps:
-- 1. Create daily_sales table (stores each unique sale once)
-- 2. Replace log_store_sale() to check delivery_id before processing
-- 3. Update refresh_dashboard_snapshot() to read from daily_sales
-- 4. Update get_daily_sales_summary() to read from daily_sales
-- 5. Reset today's data for a clean start
-- ============================================================================

-- ============================================================================
-- STEP 1: Create daily_sales table for deduplication
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id TEXT NOT NULL UNIQUE,
  delivery_title TEXT NOT NULL,
  price NUMERIC NOT NULL,
  sale_date DATE NOT NULL,
  sale_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by date
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales (sale_date);
-- Index for deduplication check
CREATE INDEX IF NOT EXISTS idx_daily_sales_delivery_id ON daily_sales (delivery_id);

-- ============================================================================
-- STEP 2: Replace log_store_sale() with delivery_id deduplication
-- ============================================================================

CREATE OR REPLACE FUNCTION log_store_sale(
  p_delivery_id TEXT,
  p_delivery_title TEXT,
  p_price NUMERIC,
  p_sale_timestamp TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON AS $$
DECLARE
  v_sale_date DATE;
  v_players_with_presence UUID[];
  v_player_id UUID;
  v_points_per_player INTEGER;
  v_total_players INTEGER := 0;
  v_total_points_awarded INTEGER := 0;
  v_existing_id UUID;
BEGIN
  -- Check if this delivery_id already exists (deduplication)
  SELECT id INTO v_existing_id
  FROM daily_sales
  WHERE delivery_id = p_delivery_id;

  IF v_existing_id IS NOT NULL THEN
    -- Sale already processed, return duplicate signal
    RETURN json_build_object(
      'success', true,
      'duplicate', true,
      'message', 'Sale already processed (delivery_id: ' || p_delivery_id || ')',
      'delivery_id', p_delivery_id
    );
  END IF;

  -- Get sale date in São Paulo timezone
  v_sale_date := (p_sale_timestamp AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- Insert into daily_sales (deduplication record)
  INSERT INTO daily_sales (delivery_id, delivery_title, price, sale_date, sale_timestamp)
  VALUES (p_delivery_id, p_delivery_title, p_price, v_sale_date, p_sale_timestamp);

  -- Calculate points: 0.1 * price per player
  v_points_per_player := FLOOR(p_price * 0.1);

  -- Get all players who have presence today
  SELECT ARRAY_AGG(DISTINCT player_id)
  INTO v_players_with_presence
  FROM daily_presence
  WHERE presence_date = v_sale_date;

  -- If no players with presence, just log the sale without awarding points
  IF v_players_with_presence IS NULL OR array_length(v_players_with_presence, 1) = 0 THEN
    -- Still refresh dashboard to show the sale
    PERFORM refresh_dashboard_snapshot(v_sale_date);

    RETURN json_build_object(
      'success', true,
      'duplicate', false,
      'message', 'Sale logged but no players with presence today',
      'delivery_id', p_delivery_id,
      'sale_date', v_sale_date,
      'delivery_title', p_delivery_title,
      'price', p_price,
      'points_per_player', v_points_per_player,
      'players_awarded', 0,
      'total_points_awarded', 0
    );
  END IF;

  -- Award points to each player with presence
  FOREACH v_player_id IN ARRAY v_players_with_presence
  LOOP
    -- Update player stats
    INSERT INTO player_stats (player_id, total_points)
    VALUES (v_player_id, v_points_per_player)
    ON CONFLICT (player_id)
    DO UPDATE SET
      total_points = player_stats.total_points + v_points_per_player,
      updated_at = NOW();

    -- Log action for this player
    INSERT INTO actions (
      action_id,
      player_id,
      attributes,
      points_awarded,
      created_at
    ) VALUES (
      'sell_product',
      v_player_id,
      json_build_object(
        'delivery_id', p_delivery_id,
        'delivery_title', p_delivery_title,
        'price', p_price,
        'sale_date', v_sale_date,
        'store_wide_sale', true
      )::jsonb,
      v_points_per_player,
      p_sale_timestamp
    );

    v_total_players := v_total_players + 1;
    v_total_points_awarded := v_total_points_awarded + v_points_per_player;
  END LOOP;

  -- Refresh dashboard snapshot
  PERFORM refresh_dashboard_snapshot(v_sale_date);

  -- Return success with summary
  RETURN json_build_object(
    'success', true,
    'duplicate', false,
    'message', 'Store sale logged and points awarded to all players with presence',
    'delivery_id', p_delivery_id,
    'sale_date', v_sale_date,
    'delivery_title', p_delivery_title,
    'price', p_price,
    'points_per_player', v_points_per_player,
    'players_awarded', v_total_players,
    'total_points_awarded', v_total_points_awarded
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 3: Update get_daily_sales_summary() to use daily_sales table
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
  v_dow INTEGER;
BEGIN
  -- Get sales from daily_sales table (already deduplicated)
  SELECT
    COALESCE(SUM(price), 0),
    COUNT(*)
  INTO v_total, v_count
  FROM daily_sales
  WHERE sale_date = p_date;

  -- Dynamic target based on day of week
  -- 1=Monday...7=Sunday (ISO)
  v_dow := EXTRACT(ISODOW FROM p_date);
  
  CASE
    WHEN v_dow = 6 THEN v_target := 12000;  -- Sábado
    WHEN v_dow = 7 THEN v_target := 8000;   -- Domingo
    ELSE v_target := 6600;                   -- Seg-Sex
  END CASE;

  -- Override with snapshot target if manually set
  SELECT daily_sales_target INTO v_target
  FROM dashboard_snapshot
  WHERE snapshot_date = p_date
    AND daily_sales_target IS NOT NULL;

  IF v_target IS NULL THEN
    v_dow := EXTRACT(ISODOW FROM p_date);
    CASE
      WHEN v_dow = 6 THEN v_target := 12000;
      WHEN v_dow = 7 THEN v_target := 8000;
      ELSE v_target := 6600;
    END CASE;
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
-- STEP 4: Update refresh_dashboard_snapshot() to use daily_sales table
-- ============================================================================

CREATE OR REPLACE FUNCTION refresh_dashboard_snapshot(
  p_date DATE DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE
)
RETURNS void AS $$
DECLARE
  v_total NUMERIC;
  v_count INTEGER;
  v_target NUMERIC;
  v_dow INTEGER;
  v_total_players INTEGER;
  v_leader_points NUMERIC;
  v_leaderboard JSONB;
BEGIN
  -- Get sales from daily_sales (already deduplicated by delivery_id)
  SELECT
    COALESCE(SUM(price), 0),
    COUNT(*)
  INTO v_total, v_count
  FROM daily_sales
  WHERE sale_date = p_date;

  -- Dynamic target based on day of week
  v_dow := EXTRACT(ISODOW FROM p_date);
  CASE
    WHEN v_dow = 6 THEN v_target := 12000;
    WHEN v_dow = 7 THEN v_target := 8000;
    ELSE v_target := 6600;
  END CASE;

  -- Override with existing manual target if set
  SELECT daily_sales_target INTO v_target
  FROM dashboard_snapshot
  WHERE snapshot_date = p_date
    AND daily_sales_target IS NOT NULL;

  IF v_target IS NULL THEN
    v_dow := EXTRACT(ISODOW FROM p_date);
    CASE
      WHEN v_dow = 6 THEN v_target := 12000;
      WHEN v_dow = 7 THEN v_target := 8000;
      ELSE v_target := 6600;
    END CASE;
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
-- STEP 5: Reset today's inflated data for a clean start
-- ============================================================================

-- Remove today's inflated actions (old sales without delivery_id)
DELETE FROM actions
WHERE action_id = 'sell_product'
  AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') = (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE
  AND (attributes->>'store_wide_sale')::BOOLEAN = true;

-- Reset today's snapshot sales values
UPDATE dashboard_snapshot
SET daily_sales_total = 0,
    daily_sales_count = 0,
    daily_goal_met = false,
    updated_at = NOW()
WHERE snapshot_date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

-- Refresh the snapshot (will show 0 sales until new ones come in)
SELECT refresh_dashboard_snapshot();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check daily_sales table is empty (ready for new deduplicated sales)
SELECT COUNT(*) AS sales_today FROM daily_sales
WHERE sale_date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;

-- Check dashboard shows 0
SELECT snapshot_date, daily_sales_total, daily_sales_count, daily_goal_met
FROM dashboard_snapshot
WHERE snapshot_date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE;
