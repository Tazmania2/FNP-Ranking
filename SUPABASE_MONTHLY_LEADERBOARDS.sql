-- ============================================================================
-- MONTHLY LEADERBOARDS SYSTEM
-- Automatic monthly leaderboard creation and management
-- ============================================================================

-- ============================================================================
-- FUNCTION: Get or Create Current Month Leaderboard
-- ============================================================================

CREATE OR REPLACE FUNCTION get_or_create_monthly_leaderboard(
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS UUID AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_month_name TEXT;
  v_leaderboard_id UUID;
  v_leaderboard_title TEXT;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Extract year and month
  v_year := EXTRACT(YEAR FROM p_date);
  v_month := EXTRACT(MONTH FROM p_date);
  
  -- Get month name in Portuguese
  v_month_name := CASE v_month
    WHEN 1 THEN 'Janeiro'
    WHEN 2 THEN 'Fevereiro'
    WHEN 3 THEN 'Março'
    WHEN 4 THEN 'Abril'
    WHEN 5 THEN 'Maio'
    WHEN 6 THEN 'Junho'
    WHEN 7 THEN 'Julho'
    WHEN 8 THEN 'Agosto'
    WHEN 9 THEN 'Setembro'
    WHEN 10 THEN 'Outubro'
    WHEN 11 THEN 'Novembro'
    WHEN 12 THEN 'Dezembro'
  END;
  
  -- Calculate period start and end
  v_period_start := DATE_TRUNC('month', p_date);
  v_period_end := (DATE_TRUNC('month', p_date) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Build title
  v_leaderboard_title := 'Ranking ' || v_month_name || ' ' || v_year;
  
  -- Try to find existing leaderboard for this month
  SELECT id INTO v_leaderboard_id
  FROM leaderboards
  WHERE title = v_leaderboard_title
    AND is_active = true;
  
  -- If not found, create it
  IF v_leaderboard_id IS NULL THEN
    INSERT INTO leaderboards (
      title,
      description,
      principal_type,
      operation_type,
      achievement_type,
      operation_item,
      sort_order,
      period_type,
      period_time_amount,
      period_time_scale,
      is_active
    ) VALUES (
      v_leaderboard_title,
      'Ranking mensal baseado em pontos totais - ' || v_month_name || '/' || v_year,
      0, -- Player based
      0, -- Points based
      0, -- Achievement type
      'total_points', -- Operation item
      -1, -- Descending order
      2, -- Monthly period
      1, -- 1 month
      30, -- Days scale
      true
    )
    RETURNING id INTO v_leaderboard_id;
    
    RAISE NOTICE 'Created new monthly leaderboard: % (ID: %)', v_leaderboard_title, v_leaderboard_id;
  END IF;
  
  RETURN v_leaderboard_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Update Monthly Leaderboard
-- This should be called after points are awarded (presença or sales)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_monthly_leaderboard(
  p_player_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS void AS $$
DECLARE
  v_leaderboard_id UUID;
  v_total_points NUMERIC;
  v_current_position INTEGER;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Get or create the leaderboard for this month
  v_leaderboard_id := get_or_create_monthly_leaderboard(p_date);
  
  -- Calculate period
  v_period_start := DATE_TRUNC('month', p_date);
  v_period_end := (DATE_TRUNC('month', p_date) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Calculate total points for the month
  SELECT COALESCE(SUM(points_awarded), 0) INTO v_total_points
  FROM actions
  WHERE player_id = p_player_id
    AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') >= v_period_start
    AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') <= v_period_end;
  
  -- Calculate current position
  -- Position is based on total points (higher = better position)
  SELECT COUNT(*) + 1 INTO v_current_position
  FROM (
    SELECT a.player_id, SUM(a.points_awarded) as total
    FROM actions a
    WHERE DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_period_start
      AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') <= v_period_end
    GROUP BY a.player_id
    HAVING SUM(a.points_awarded) > v_total_points
  ) sub;
  
  -- Update or insert leaderboard entry
  PERFORM upsert_leaderboard_entry(
    v_leaderboard_id,
    p_player_id,
    v_current_position,
    v_total_points,
    p_date
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Recalculate Entire Monthly Leaderboard
-- Useful for corrections or monthly recalculation
-- ============================================================================

CREATE OR REPLACE FUNCTION recalculate_monthly_leaderboard(
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  player_id UUID,
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
  
  -- Calculate and insert new entries
  RETURN QUERY
  WITH player_points AS (
    SELECT 
      p.id AS player_id,
      p.name AS player_name,
      COALESCE(SUM(a.points_awarded), 0) AS total_points,
      COUNT(DISTINCT CASE WHEN a.action_id = 'presenca' THEN DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') END)::INTEGER AS presence_days,
      COUNT(CASE WHEN a.action_id = 'sell_product' THEN 1 END) AS sales_count
    FROM players p
    LEFT JOIN actions a ON p.id = a.player_id
      AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_period_start
      AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') <= v_period_end
    WHERE p.is_active = true
    GROUP BY p.id, p.name
  ),
  ranked_players AS (
    SELECT 
      player_id,
      player_name,
      total_points,
      presence_days,
      sales_count,
      ROW_NUMBER() OVER (ORDER BY total_points DESC, player_name ASC) AS "position"
    FROM player_points
    WHERE total_points > 0
  )
  SELECT 
    rp.player_id,
    rp.player_name,
    rp."position"::INTEGER,
    rp.total_points,
    rp.presence_days,
    rp.sales_count
  FROM ranked_players rp;
  
  -- Insert into leaderboard_entries
  INSERT INTO leaderboard_entries (
    leaderboard_id,
    player_id,
    "position",
    total,
    snapshot_date
  )
  SELECT 
    v_leaderboard_id,
    player_id,
    "position",
    total_points,
    v_period_end
  FROM recalculate_monthly_leaderboard(p_year, p_month);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Get Monthly Leaderboard Data
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
  v_date DATE;
BEGIN
  -- Calculate period
  v_date := make_date(p_year, p_month, 1);
  v_period_start := DATE_TRUNC('month', v_date);
  v_period_end := (DATE_TRUNC('month', v_date) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Get leaderboard ID
  v_leaderboard_id := get_or_create_monthly_leaderboard(v_date);
  
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
    AND le.snapshot_date = v_period_end
    AND p.is_active = true
  ORDER BY le."position" ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: List All Monthly Leaderboards
-- ============================================================================

CREATE OR REPLACE FUNCTION list_monthly_leaderboards()
RETURNS TABLE (
  id UUID,
  title TEXT,
  year INTEGER,
  month INTEGER,
  player_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    EXTRACT(YEAR FROM l.created_at)::INTEGER AS year,
    EXTRACT(MONTH FROM l.created_at)::INTEGER AS month,
    (SELECT COUNT(*) FROM leaderboard_entries WHERE leaderboard_id = l.id) AS player_count,
    l.created_at
  FROM leaderboards l
  WHERE l.title ~ '^Ranking (Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro) [0-9]{4}$'
    AND l.is_active = true
  ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update monthly leaderboard after action
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_update_monthly_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if points were awarded
  IF NEW.points_awarded > 0 THEN
    PERFORM update_monthly_leaderboard(
      NEW.player_id,
      DATE(NEW.created_at AT TIME ZONE 'America/Sao_Paulo')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_update_monthly_leaderboard ON actions;
CREATE TRIGGER auto_update_monthly_leaderboard
  AFTER INSERT ON actions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_monthly_leaderboard();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test: Get or create current month leaderboard
SELECT get_or_create_monthly_leaderboard(CURRENT_DATE) AS current_month_leaderboard_id;

-- Test: List all monthly leaderboards
SELECT * FROM list_monthly_leaderboards();

-- Test: Get current month leaderboard data
SELECT * FROM get_monthly_leaderboard(
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
);

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- You now have:
-- ✅ Automatic monthly leaderboard creation
-- ✅ Auto-update trigger on new actions
-- ✅ Recalculation function for corrections
-- ✅ Query functions for frontend
-- ============================================================================
