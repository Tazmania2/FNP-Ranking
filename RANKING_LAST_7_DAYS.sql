SELECT 
  ROW_NUMBER() OVER (ORDER BY SUM(a.points_awarded) DESC, p.name ASC) AS posicao,
  p.name AS nome,
  p.player_code AS codigo,
  SUM(a.points_awarded)::INTEGER AS pontos_total,
  COUNT(DISTINCT CASE WHEN a.action_id = 'presenca' THEN DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') END)::INTEGER AS dias_presenca,
  COUNT(CASE WHEN a.action_id = 'sell_product' THEN 1 END)::INTEGER AS total_vendas,
  COALESCE(SUM(CASE WHEN a.action_id = 'sell_product' THEN (a.attributes->>'price')::NUMERIC END), 0) AS valor_vendas
FROM players p
INNER JOIN actions a ON p.id = a.player_id
WHERE 
  p.is_active = true
  AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY p.id, p.name, p.player_code
HAVING SUM(a.points_awarded) > 0
ORDER BY pontos_total DESC, nome ASC;
