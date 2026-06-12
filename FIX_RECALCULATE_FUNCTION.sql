-- Fix the recalculate_monthly_leaderboard function to avoid ambiguous column reference

-- Drop the existing function first (required to change return type)
DROP FUNCTION IF EXISTS recalculate_monthly_leaderboard(integer, integer);

CREATE OR REPLACE FUNCTION recalculate_monthly_leaderboard(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  result_player_id UUID,
  player_name TEXT,
  "position" INTEGER,
  total_points NUMERIC,
  presence_days INTEGER,
  sales_count BIGINT
) AS $$
DECLARE
  v_leaderboard_id UUID;
  v_period_start DATE;
  v_period_end DATE;
  v_date DATE;
BEGIN
  -- Calculate period
  v_date := make_date(p_year, p_month, 1);
  v_period_start := DATE_TRUNC('month', v_date);
  v_period_end := (DATE_TRUNC('month', v_date) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Get or create leaderboard
  v_leaderboard_id := get_or_create_monthly_leaderboard(v_date);
  
  -- Delete existing entries for this leaderboard
  DELETE FROM leaderboard_entries
  WHERE leaderboard_id = v_leaderboard_id;
  
  -- Calculate and insert new entries in a single operation
  RETURN QUERY
  WITH player_points AS (
    SELECT 
      p.id AS pp_player_id,
      p.name AS pp_player_name,
      COALESCE(SUM(a.points_awarded), 0)::NUMERIC AS pp_total_points,
      COUNT(DISTINCT CASE WHEN a.action_id = 'presenca' THEN DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') END)::INTEGER AS pp_presence_days,
      COUNT(CASE WHEN a.action_id = 'sell_product' THEN 1 END)::BIGINT AS pp_sales_count
    FROM players p
    LEFT JOIN actions a ON p.id = a.player_id
      AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_period_start
      AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') <= v_period_end
    WHERE p.is_active = true
    GROUP BY p.id, p.name
  ),
  ranked_players AS (
    SELECT 
      pp.pp_player_id,
      pp.pp_player_name,
      pp.pp_total_points,
      pp.pp_presence_days,
      pp.pp_sales_count,
      ROW_NUMBER() OVER (ORDER BY pp.pp_total_points DESC, pp.pp_player_name ASC) AS rp_position
    FROM player_points pp
    WHERE pp.pp_total_points > 0
  ),
  inserted_entries AS (
    INSERT INTO leaderboard_entries (
      leaderboard_id,
      player_id,
      "position",
      total,
      snapshot_date
    )
    SELECT 
      v_leaderboard_id,
      pp_player_id,
      rp_position,
      pp_total_points,
      v_period_end
    FROM ranked_players
    RETURNING *
  )
  SELECT 
    rp.pp_player_id,
    rp.pp_player_name,
    rp.rp_position::INTEGER,
    rp.pp_total_points,
    rp.pp_presence_days,
    rp.pp_sales_count
  FROM ranked_players rp
  ORDER BY rp.rp_position;
END;
$$ LANGUAGE plpgsql;

SELECT 'Function fixed!' as status;
