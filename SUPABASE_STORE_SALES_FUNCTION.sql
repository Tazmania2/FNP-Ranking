-- ============================================================================
-- STORE-WIDE SALES FUNCTION (v2 - with delivery_id deduplication)
-- Awards points to ALL players with presence today from store sales
-- Uses delivery_id as unique key to prevent duplicate processing
--
-- See DEDUPLICATION_MIGRATION.sql for full migration steps
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
  -- DEDUPLICATION: Check if this delivery_id already exists
  SELECT id INTO v_existing_id
  FROM daily_sales
  WHERE delivery_id = p_delivery_id;

  IF v_existing_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'duplicate', true,
      'message', 'Sale already processed (delivery_id: ' || p_delivery_id || ')',
      'delivery_id', p_delivery_id
    );
  END IF;

  -- Get sale date in São Paulo timezone
  v_sale_date := (p_sale_timestamp AT TIME ZONE 'America/Sao_Paulo')::DATE;

  -- Record the sale in daily_sales (source of truth)
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

  -- Refresh dashboard
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

-- Example usage:
-- SELECT log_store_sale('90127-6822-19290', 'FNP CHURRAS - KAUA FERNANDES', 19.04, '2026-07-23 14:32:35'::timestamptz);
