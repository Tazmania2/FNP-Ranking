-- ============================================================================
-- EXPORTAÇÃO DE VENDAS DIÁRIAS
-- ============================================================================
-- Este arquivo contém queries para exportar vendas diárias em diferentes formatos

-- ============================================================================
-- OPÇÃO 1: Vendas Diárias Detalhadas (Todas as colunas)
-- ============================================================================
-- Use esta query para exportar TODAS as vendas com todos os detalhes

SELECT 
  -- Data e Hora da Venda
  a.created_at AT TIME ZONE 'America/Sao_Paulo' AS data_hora_venda,
  DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') AS data_venda,
  TO_CHAR(a.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY') AS data_formatada,
  TO_CHAR(a.created_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS') AS hora_venda,
  TO_CHAR(a.created_at AT TIME ZONE 'America/Sao_Paulo', 'Day') AS dia_semana,
  
  -- Informações do Vendedor
  p.player_code AS codigo_vendedor,
  p.name AS nome_vendedor,
  
  -- Detalhes da Venda
  (a.attributes->>'delivery_title')::TEXT AS titulo_entrega,
  (a.attributes->>'price')::NUMERIC AS valor_venda,
  a.points_awarded AS pontos_ganhos,
  
  -- Status
  CASE 
    WHEN (a.attributes->>'has_presence')::BOOLEAN = true THEN 'Sim'
    ELSE 'Não'
  END AS tinha_presenca,
  
  -- IDs (para referência)
  a.id AS id_action,
  p.id AS id_player

FROM actions a
INNER JOIN players p ON a.player_id = p.id
WHERE a.action_id = 'sell_product'
ORDER BY a.created_at DESC;


-- ============================================================================
-- OPÇÃO 2: Vendas Diárias Resumidas por Data
-- ============================================================================
-- Use esta query para ter um resumo por dia

SELECT 
  DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') AS data,
  TO_CHAR(DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo'), 'DD/MM/YYYY') AS data_formatada,
  TO_CHAR(DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo'), 'Day') AS dia_semana,
  
  -- Totais do Dia
  COUNT(*) AS total_vendas,
  COUNT(DISTINCT a.player_id) AS total_vendedores,
  SUM((a.attributes->>'price')::NUMERIC) AS valor_total,
  ROUND(AVG((a.attributes->>'price')::NUMERIC), 2) AS ticket_medio,
  SUM(a.points_awarded) AS total_pontos,
  
  -- Vendas com presença
  COUNT(CASE WHEN (a.attributes->>'has_presence')::BOOLEAN = true THEN 1 END) AS vendas_com_presenca,
  COUNT(CASE WHEN (a.attributes->>'has_presence')::BOOLEAN = false THEN 1 END) AS vendas_sem_presenca

FROM actions a
WHERE a.action_id = 'sell_product'
GROUP BY DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo')
ORDER BY DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') DESC;


-- ============================================================================
-- OPÇÃO 3: Vendas por Vendedor (Ranking)
-- ============================================================================
-- Use esta query para ver o desempenho de cada vendedor

SELECT 
  p.player_code AS codigo_vendedor,
  p.name AS nome_vendedor,
  
  -- Totais do Vendedor
  COUNT(*) AS total_vendas,
  SUM((a.attributes->>'price')::NUMERIC) AS valor_total_vendido,
  ROUND(AVG((a.attributes->>'price')::NUMERIC), 2) AS ticket_medio,
  SUM(a.points_awarded) AS total_pontos,
  
  -- Primeira e Última Venda
  MIN(DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo')) AS primeira_venda,
  MAX(DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo')) AS ultima_venda,
  
  -- Dias com Vendas
  COUNT(DISTINCT DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo')) AS dias_com_vendas

FROM actions a
INNER JOIN players p ON a.player_id = p.id
WHERE a.action_id = 'sell_product'
GROUP BY p.player_code, p.name
ORDER BY valor_total_vendido DESC;


-- ============================================================================
-- OPÇÃO 4: Vendas de um Período Específico
-- ============================================================================
-- Substitua as datas conforme necessário

SELECT 
  a.created_at AT TIME ZONE 'America/Sao_Paulo' AS data_hora_venda,
  TO_CHAR(a.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') AS data_hora_formatada,
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
  AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') >= '2026-06-01'  -- DATA INICIAL
  AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') <= '2026-06-30'  -- DATA FINAL
ORDER BY a.created_at DESC;


-- ============================================================================
-- OPÇÃO 5: Vendas do Mês Atual
-- ============================================================================
-- Automaticamente pega o mês atual

SELECT 
  a.created_at AT TIME ZONE 'America/Sao_Paulo' AS data_hora_venda,
  TO_CHAR(a.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') AS data_hora_formatada,
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
  AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') >= DATE_TRUNC('month', CURRENT_DATE)
  AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
ORDER BY a.created_at DESC;


-- ============================================================================
-- OPÇÃO 6: Vendas de Hoje
-- ============================================================================

SELECT 
  TO_CHAR(a.created_at AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI:SS') AS hora_venda,
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
  AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') = CURRENT_DATE
ORDER BY a.created_at DESC;


-- ============================================================================
-- OPÇÃO 7: Vendas por Dia da Semana (Análise de Padrão)
-- ============================================================================

SELECT 
  TO_CHAR(DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo'), 'Day') AS dia_semana,
  EXTRACT(DOW FROM DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo')) AS numero_dia, -- 0=Domingo, 6=Sábado
  
  -- Totais
  COUNT(*) AS total_vendas,
  SUM((a.attributes->>'price')::NUMERIC) AS valor_total,
  ROUND(AVG((a.attributes->>'price')::NUMERIC), 2) AS ticket_medio,
  
  -- Vendas por Dia da Semana
  COUNT(DISTINCT DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo')) AS qtd_dias

FROM actions a
WHERE a.action_id = 'sell_product'
GROUP BY 
  TO_CHAR(DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo'), 'Day'),
  EXTRACT(DOW FROM DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo'))
ORDER BY numero_dia;


-- ============================================================================
-- OPÇÃO 8: Top Produtos/Entregas mais Vendidos
-- ============================================================================

SELECT 
  (a.attributes->>'delivery_title')::TEXT AS titulo_entrega,
  COUNT(*) AS quantidade_vendas,
  SUM((a.attributes->>'price')::NUMERIC) AS valor_total,
  ROUND(AVG((a.attributes->>'price')::NUMERIC), 2) AS preco_medio,
  SUM(a.points_awarded) AS total_pontos

FROM actions a
WHERE a.action_id = 'sell_product'
  AND (a.attributes->>'delivery_title') IS NOT NULL
GROUP BY (a.attributes->>'delivery_title')::TEXT
ORDER BY quantidade_vendas DESC
LIMIT 20;


-- ============================================================================
-- COMO USAR NO SUPABASE STUDIO:
-- ============================================================================
-- 1. Abra o Supabase Studio SQL Editor
-- 2. Copie e cole UMA das queries acima
-- 3. Execute a query (Run)
-- 4. Clique em "Export" no canto superior direito dos resultados
-- 5. Escolha o formato: CSV, JSON, ou copie para Excel
--
-- DICA: Para CSV que abre bem no Excel, use a OPÇÃO 1 (mais completa)
-- ============================================================================

