-- Check what data we already have in Supabase

-- 1. Check players
SELECT 'Players' as table_name, COUNT(*) as count FROM players;

-- 2. Check actions by month
SELECT 
  'Actions by month' as info,
  TO_CHAR(DATE(created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM') as month,
  COUNT(*) as total_actions,
  SUM(CASE WHEN action_id = 'presenca' THEN 1 ELSE 0 END) as presenca_count,
  SUM(CASE WHEN action_id = 'sell_product' THEN 1 ELSE 0 END) as sales_count,
  SUM(points_awarded) as total_points
FROM actions
GROUP BY TO_CHAR(DATE(created_at AT TIME ZONE 'America/Sao_Paulo'), 'YYYY-MM')
ORDER BY month DESC;

-- 3. Check daily presence
SELECT 
  'Daily presence by month' as info,
  TO_CHAR(presence_date, 'YYYY-MM') as month,
  COUNT(*) as presence_records,
  COUNT(DISTINCT player_id) as unique_players
FROM daily_presence
GROUP BY TO_CHAR(presence_date, 'YYYY-MM')
ORDER BY month DESC;

-- 4. Check existing leaderboards
SELECT 
  'Leaderboards' as info,
  title,
  (SELECT COUNT(*) FROM leaderboard_entries WHERE leaderboard_id = l.id) as entry_count,
  created_at
FROM leaderboards l
ORDER BY created_at DESC;

-- 5. Check date range of data
SELECT 
  'Data date range' as info,
  MIN(DATE(created_at AT TIME ZONE 'America/Sao_Paulo')) as first_date,
  MAX(DATE(created_at AT TIME ZONE 'America/Sao_Paulo')) as last_date,
  COUNT(*) as total_records
FROM actions;
