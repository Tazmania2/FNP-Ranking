-- ============================================================================
-- MIGRATION: Sale Deduplication via delivery_id
-- 
-- A tabela daily_sales atual é agregada (1 row por dia, PK = sale_date).
-- Precisamos de uma tabela de registros individuais para deduplicar.
-- Estratégia: renomear a antiga, criar nova com a estrutura certa.
--
-- RODE CADA STEP SEPARADO NO SQL EDITOR DO SUPABASE
-- ============================================================================


-- ============================================================================
-- STEP 1: Renomear tabela antiga (preserva dados) e criar nova
-- ============================================================================

-- Preserva a tabela antiga como backup
ALTER TABLE daily_sales RENAME TO daily_sales_old;

-- Cria a nova tabela com delivery_id como chave de deduplicação
CREATE TABLE daily_sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  delivery_title TEXT NOT NULL,
  price NUMERIC NOT NULL,
  sale_date DATE NOT NULL,
  sale_timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT daily_sales_delivery_id_unique UNIQUE (delivery_id)
);

CREATE INDEX idx_daily_sales_sale_date ON daily_sales (sale_date);


-- ============================================================================
-- STEP 2: Recriar log_store_sale() com deduplicação por delivery_id
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

  -- Record the sale (source of truth for deduplication)
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
    INSERT INTO player_stats (player_id, total_points)
    VALUES (v_player_id, v_points_per_player)
    ON CONFLICT (player_id)
    DO UPDATE SET
      total_points = player_stats.total_points + v_points_per_player,
      updated_at = NOW();

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
-- STEP 3: Recriar get_daily_sales_summary() lendo da nova daily_sales
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
  -- Get sales from new daily_sales table (each row = 1 unique sale)
  SELECT
    COALESCE(SUM(price), 0),
    COUNT(*)
  INTO v_total, v_count
  FROM daily_sales
  WHERE sale_date = p_date;

  -- Dynamic target based on day of week (ISO: 1=Mon...7=Sun)
  v_dow := EXTRACT(ISODOW FROM p_date);
  CASE
    WHEN v_dow = 6 THEN v_target := 12000;  -- Sábado
    WHEN v_dow = 7 THEN v_target := 8000;   -- Domingo
    ELSE v_target := 6600;                   -- Seg-Sex
  END CASE;

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
-- STEP 4: Recriar refresh_dashboard_snapshot() lendo da nova daily_sales
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
  -- Get sales from daily_sales (each row = 1 unique sale by delivery_id)
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
    daily_sales_target = EXCLUDED.daily_sales_target,
    daily_sales_count = EXCLUDED.daily_sales_count,
    daily_goal_met = EXCLUDED.daily_goal_met,
    leaderboard = EXCLUDED.leaderboard,
    total_players = EXCLUDED.total_players,
    leader_points = EXCLUDED.leader_points,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- STEP 5: Limpar actions infladas de hoje e resetar snapshot
-- ============================================================================

-- Remove today's duplicated action rows
DELETE FROM actions
WHERE action_id = 'sell_product'
  AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') = (NOW() AT TIME ZONE 'America/Sao_Paulo')::DATE
  AND (attributes->>'store_wide_sale')::BOOLEAN = true;

-- Refresh snapshot (will show 0 sales since daily_sales is empty)
SELECT refresh_dashboard_snapshot();


-- ============================================================================
-- STEP 6: Testar deduplicação
-- ============================================================================

-- Primeira vez: deve registrar
SELECT log_store_sale('TEST-001', 'TESTE DEDUP', 19.04, NOW());

-- Segunda vez com mesmo delivery_id: deve retornar duplicate: true
SELECT log_store_sale('TEST-001', 'TESTE DEDUP', 19.04, NOW());

-- Limpar teste
DELETE FROM daily_sales WHERE delivery_id = 'TEST-001';
DELETE FROM actions WHERE attributes->>'delivery_id' = 'TEST-001';
SELECT refresh_dashboard_snapshot();


-- ============================================================================
-- NOTA: A tabela daily_sales_old fica de backup. Pode dropar depois se quiser:
-- DROP TABLE daily_sales_old;
-- ============================================================================
