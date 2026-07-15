-- ============================================================================
-- FIX: get_monthly_leaderboard - Use latest available snapshot, not end-of-month
-- 
-- Problem: The trigger writes entries with snapshot_date = today's date,
-- but the query was filtering by snapshot_date = end_of_month (e.g., July 31).
-- This means data was never visible until the last day of the month.
--
-- Fix: Use the MAX(snapshot_date) within the month period instead.
-- ============================================================================

CREATE OR REPLACE FUNCTION get_monthly_leaderboard(
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
RETURNS TABLE (
  leaderboard_id UUID,
  leaderboard_title TEXT,
  player_id UUID,
  player_code TEXT,
  player_name TEXT,
  "position" INTEGER,
  total_points NUMERIC,
  previous_position INTEGER,
  move TEXT,
  image_url TEXT,
  presence_days INTEGER,
  sales_count BIGINT
) AS $$
DECLARE
  v_leaderboard_id UUID;
  v_period_start DATE;
  v_period_end DATE;
  v_latest_snapshot DATE;
  v_date DATE;
BEGIN
  -- Calculate period
  v_date := make_date(p_year, p_month, 1);
  v_period_start := DATE_TRUNC('month', v_date);
  v_period_end := (DATE_TRUNC('month', v_date) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Get leaderboard ID
  v_leaderboard_id := get_or_create_monthly_leaderboard(v_date);
  
  -- Find the latest snapshot_date available for this leaderboard within the month
  SELECT MAX(le.snapshot_date) INTO v_latest_snapshot
  FROM leaderboard_entries le
  WHERE le.leaderboard_id = v_leaderboard_id
    AND le.snapshot_date >= v_period_start
    AND le.snapshot_date <= v_period_end;
  
  -- If no snapshot exists yet, return empty result
  IF v_latest_snapshot IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    v_leaderboard_id AS leaderboard_id,
    l.title AS leaderboard_title,
    p.id AS player_id,
    p.player_code,
    p.name AS player_name,
    le."position",
    le.total AS total_points,
    le.previous_position,
    CASE 
      WHEN le.previous_position IS NULL THEN 'same'
      WHEN le."position" < le.previous_position THEN 'up'
      WHEN le."position" > le.previous_position THEN 'down'
      ELSE 'same'
    END AS move,
    p.image_url,
    (
      SELECT COUNT(DISTINCT DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo'))::INTEGER
      FROM actions a
      WHERE a.player_id = p.id
        AND a.action_id = 'presenca'
        AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_period_start
        AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') <= v_period_end
    ) AS presence_days,
    (
      SELECT COUNT(*)
      FROM actions a
      WHERE a.player_id = p.id
        AND a.action_id = 'sell_product'
        AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_period_start
        AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') <= v_period_end
    ) AS sales_count
  FROM leaderboard_entries le
  JOIN players p ON le.player_id = p.id
  JOIN leaderboards l ON le.leaderboard_id = l.id
  WHERE le.leaderboard_id = v_leaderboard_id
    AND le.snapshot_date = v_latest_snapshot
    AND p.is_active = true
  ORDER BY le."position" ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Also fix update_monthly_leaderboard to use today's date as snapshot_date
-- (verify the upsert_leaderboard_entry call is using the correct date)
-- ============================================================================

-- Quick test after applying:
-- SELECT * FROM get_monthly_leaderboard(2026, 7);
