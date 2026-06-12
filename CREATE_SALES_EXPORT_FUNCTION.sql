-- ============================================================================
-- FUNÇÃO PARA EXPORTAÇÃO RÁPIDA DE VENDAS
-- ============================================================================
-- Esta função facilita a exportação de vendas com parâmetros flexíveis

CREATE OR REPLACE FUNCTION export_sales(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_player_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  data_hora_venda TIMESTAMP WITH TIME ZONE,
  data_formatada TEXT,
  hora_venda TEXT,
  dia_semana TEXT,
  codigo_vendedor TEXT,
  nome_vendedor TEXT,
  titulo_entrega TEXT,
  valor_venda NUMERIC,
  pontos_ganhos INTEGER,
  tinha_presenca TEXT
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Se não fornecer datas, usa o mês atual
  v_start_date := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
  v_end_date := COALESCE(p_end_date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE);
  
  RETURN QUERY
  SELECT 
    a.created_at AT TIME ZONE 'America/Sao_Paulo' AS data_hora_venda,
    TO_CHAR(a.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') AS data_formatada,
    TO_CHAR(a.created_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS') AS hora_venda,
    TO_CHAR(a.created_at AT TIME ZONE 'America/Sao_Paulo', 'Day') AS dia_semana,
    p.player_code AS codigo_vendedor,
    p.name AS nome_vendedor,
    (a.attributes->>'delivery_title')::TEXT AS titulo_entrega,
    (a.attributes->>'price')::NUMERIC AS valor_venda,
    a.points_awarded AS pontos_ganhos,
    CASE 
      WHEN (a.attributes->>'has_presence')::BOOLEAN = true THEN 'Sim'
      ELSE 'Não'
    END AS tinha_presenca
  FROM actions a
  INNER JOIN players p ON a.player_id = p.id
  WHERE a.action_id = 'sell_product'
    AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
    AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') <= v_end_date
    AND (p_player_code IS NULL OR p.player_code = p_player_code)
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNÇÃO PARA RESUMO DIÁRIO DE VENDAS
-- ============================================================================

CREATE OR REPLACE FUNCTION sales_daily_summary(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  data DATE,
  data_formatada TEXT,
  dia_semana TEXT,
  total_vendas BIGINT,
  total_vendedores BIGINT,
  valor_total NUMERIC,
  ticket_medio NUMERIC,
  total_pontos BIGINT,
  vendas_com_presenca BIGINT,
  vendas_sem_presenca BIGINT
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Se não fornecer datas, usa o mês atual
  v_start_date := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
  v_end_date := COALESCE(p_end_date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE);
  
  RETURN QUERY
  SELECT 
    DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') AS data,
    TO_CHAR(DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo'), 'DD/MM/YYYY') AS data_formatada,
    TO_CHAR(DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo'), 'Day') AS dia_semana,
    COUNT(*)::BIGINT AS total_vendas,
    COUNT(DISTINCT a.player_id)::BIGINT AS total_vendedores,
    SUM((a.attributes->>'price')::NUMERIC) AS valor_total,
    ROUND(AVG((a.attributes->>'price')::NUMERIC), 2) AS ticket_medio,
    SUM(a.points_awarded)::BIGINT AS total_pontos,
    COUNT(CASE WHEN (a.attributes->>'has_presence')::BOOLEAN = true THEN 1 END)::BIGINT AS vendas_com_presenca,
    COUNT(CASE WHEN (a.attributes->>'has_presence')::BOOLEAN = false THEN 1 END)::BIGINT AS vendas_sem_presenca
  FROM actions a
  WHERE a.action_id = 'sell_product'
    AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
    AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') <= v_end_date
  GROUP BY DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo')
  ORDER BY DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNÇÃO PARA RANKING DE VENDEDORES
-- ============================================================================

CREATE OR REPLACE FUNCTION sales_ranking(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  posicao INTEGER,
  codigo_vendedor TEXT,
  nome_vendedor TEXT,
  total_vendas BIGINT,
  valor_total NUMERIC,
  ticket_medio NUMERIC,
  total_pontos BIGINT,
  dias_com_vendas BIGINT
) AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Se não fornecer datas, usa o mês atual
  v_start_date := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
  v_end_date := COALESCE(p_end_date, (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE);
  
  RETURN QUERY
  WITH ranked_sellers AS (
    SELECT 
      p.player_code,
      p.name,
      COUNT(*)::BIGINT AS total_vendas,
      SUM((a.attributes->>'price')::NUMERIC) AS valor_total,
      ROUND(AVG((a.attributes->>'price')::NUMERIC), 2) AS ticket_medio,
      SUM(a.points_awarded)::BIGINT AS total_pontos,
      COUNT(DISTINCT DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo'))::BIGINT AS dias_com_vendas,
      ROW_NUMBER() OVER (ORDER BY SUM((a.attributes->>'price')::NUMERIC) DESC) AS posicao
    FROM actions a
    INNER JOIN players p ON a.player_id = p.id
    WHERE a.action_id = 'sell_product'
      AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') >= v_start_date
      AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') <= v_end_date
    GROUP BY p.player_code, p.name
  )
  SELECT 
    rs.posicao::INTEGER,
    rs.player_code,
    rs.name,
    rs.total_vendas,
    rs.valor_total,
    rs.ticket_medio,
    rs.total_pontos,
    rs.dias_com_vendas
  FROM ranked_sellers rs
  ORDER BY rs.posicao
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- EXEMPLOS DE USO:
-- ============================================================================

-- 1. Exportar todas as vendas do mês atual (sem parâmetros)
SELECT * FROM export_sales();

-- 2. Exportar vendas de um período específico
SELECT * FROM export_sales('2026-06-01'::DATE, '2026-06-30'::DATE);

-- 3. Exportar vendas de um vendedor específico no período
SELECT * FROM export_sales('2026-06-01'::DATE, '2026-06-30'::DATE, 'VENDEDOR123');

-- 4. Resumo diário do mês atual
SELECT * FROM sales_daily_summary();

-- 5. Resumo diário de um período
SELECT * FROM sales_daily_summary('2026-05-01'::DATE, '2026-05-31'::DATE);

-- 6. Ranking de vendedores do mês atual (top 20)
SELECT * FROM sales_ranking(NULL, NULL, 20);

-- 7. Ranking de vendedores de maio 2026 (top 50)
SELECT * FROM sales_ranking('2026-05-01'::DATE, '2026-05-31'::DATE, 50);

-- 8. Exportar vendas de hoje
SELECT * FROM export_sales(CURRENT_DATE, CURRENT_DATE);

-- 9. Exportar vendas de ontem
SELECT * FROM export_sales(CURRENT_DATE - 1, CURRENT_DATE - 1);

-- ============================================================================

SELECT 'Funções de exportação criadas com sucesso!' AS status;

