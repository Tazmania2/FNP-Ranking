# 📅 Monthly Leaderboards Guide

## Overview

Your ranking system now works with **automatic monthly leaderboards**. Every month gets its own leaderboard, and the system automatically creates and manages them.

## 🎯 How It Works

### Automatic Monthly Creation
```
May 2024    → "Ranking Maio 2024"
June 2024   → "Ranking Junho 2024"
July 2024   → "Ranking Julho 2024"
...and so on
```

### Auto-Update System
```
Employee registers presence → Points awarded → Monthly leaderboard updated
Employee makes a sale → Points awarded → Monthly leaderboard updated
```

Everything happens automatically! 🎉

## 🚀 Setup Instructions

### Step 1: Run Monthly Leaderboards SQL (5 minutes)

1. Open Supabase Studio: https://fnp.centralsupernova.com.br
2. Go to **SQL Editor** → **New Query**
3. Copy and paste **`SUPABASE_MONTHLY_LEADERBOARDS.sql`**
4. Click **Run**

This creates:
- ✅ `get_or_create_monthly_leaderboard()` - Auto-creates leaderboards
- ✅ `update_monthly_leaderboard()` - Updates rankings
- ✅ `recalculate_monthly_leaderboard()` - Recalculates entire month
- ✅ `get_monthly_leaderboard()` - Gets monthly ranking data
- ✅ `list_monthly_leaderboards()` - Lists all months
- ✅ Auto-update trigger - Updates on every action

### Step 2: Import May 2024 Data (10 minutes)

Run the import script to fetch May data from Funifier:

```bash
npm run tsx scripts/import-may-data-from-funifier.ts
```

This will:
1. Fetch all players from Funifier
2. Fetch all May 2024 actions (presença + sales)
3. Import players to Supabase
4. Import actions to Supabase
5. Recalculate May 2024 leaderboard
6. Generate import report

**Report saved to**: `may-import-report.json`

## 📊 Database Functions

### Get Current Month Leaderboard

```sql
-- Get June 2024 leaderboard
SELECT * FROM get_monthly_leaderboard(2024, 6);

-- Get current month automatically
SELECT * FROM get_monthly_leaderboard(
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
);
```

**Returns**:
- Player info (ID, code, name, image)
- Position and total points
- Previous position and movement (up/down/same)
- Presence days count
- Sales count

### List All Monthly Leaderboards

```sql
SELECT * FROM list_monthly_leaderboards();
```

**Returns**:
- All monthly leaderboards
- Year and month
- Player count per month
- Creation date

### Recalculate a Month

```sql
-- Recalculate May 2024
SELECT * FROM recalculate_monthly_leaderboard(2024, 5);

-- Recalculate current month
SELECT * FROM recalculate_monthly_leaderboard(
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
);
```

Use this when:
- You imported old data
- You fixed some actions
- You want to correct rankings

### Manual Update for a Player

```sql
-- Update João's position in current month
SELECT update_monthly_leaderboard(
  'player-uuid-here',
  CURRENT_DATE
);
```

## 🔍 Query Examples

### Top 10 Players This Month

```sql
SELECT 
  player_name,
  position,
  total_points,
  presence_days,
  sales_count
FROM get_monthly_leaderboard(
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
)
LIMIT 10;
```

### Compare Two Months

```sql
-- May vs June 2024
WITH may AS (
  SELECT player_id, player_name, position, total_points
  FROM get_monthly_leaderboard(2024, 5)
),
june AS (
  SELECT player_id, player_name, position, total_points
  FROM get_monthly_leaderboard(2024, 6)
)
SELECT 
  COALESCE(may.player_name, june.player_name) as player_name,
  may.position as may_position,
  may.total_points as may_points,
  june.position as june_position,
  june.total_points as june_points,
  (june.total_points - COALESCE(may.total_points, 0)) as points_diff
FROM may
FULL OUTER JOIN june ON may.player_id = june.player_id
ORDER BY june.position NULLS LAST;
```

### Player Performance Across Months

```sql
SELECT 
  l.title as month,
  le.position,
  le.total as total_points
FROM leaderboard_entries le
JOIN leaderboards l ON le.leaderboard_id = l.id
WHERE le.player_id = 'player-uuid-here'
  AND l.title ~ '^Ranking .* 2024$'
ORDER BY l.created_at DESC;
```

### Monthly Statistics

```sql
SELECT 
  EXTRACT(MONTH FROM l.created_at) as month,
  COUNT(DISTINCT le.player_id) as active_players,
  SUM(le.total) as total_points_awarded,
  AVG(le.total) as avg_points_per_player,
  MAX(le.total) as highest_score
FROM leaderboards l
JOIN leaderboard_entries le ON l.id = le.leaderboard_id
WHERE EXTRACT(YEAR FROM l.created_at) = 2024
GROUP BY EXTRACT(MONTH FROM l.created_at)
ORDER BY month;
```

## 🎮 Frontend Integration

### Update `SupabaseApiService`

Your existing `getLeaderboardData()` function already works! Just make sure it's called with the right leaderboard ID.

To get the current month's leaderboard ID:

```typescript
async getCurrentMonthLeaderboard() {
  const { data, error } = await this.supabase
    .rpc('get_or_create_monthly_leaderboard', {
      p_date: new Date().toISOString().split('T')[0]
    });
  
  if (error) throw error;
  return data; // Returns UUID of current month's leaderboard
}
```

### Get Monthly Data

```typescript
async getMonthlyLeaderboard(year: number, month: number) {
  const { data, error } = await this.supabase
    .rpc('get_monthly_leaderboard', {
      p_year: year,
      p_month: month
    });
  
  if (error) throw error;
  return data;
}
```

### List Available Months

```typescript
async listMonthlyLeaderboards() {
  const { data, error } = await this.supabase
    .rpc('list_monthly_leaderboards');
  
  if (error) throw error;
  return data;
}
```

## 📱 UI Suggestions

### Month Selector
```tsx
<select onChange={(e) => loadLeaderboard(e.target.value)}>
  <option value="2024-05">Maio 2024</option>
  <option value="2024-06">Junho 2024</option>
  <option value="2024-07">Julho 2024</option>
</select>
```

### Stats Display
```tsx
<div className="stats">
  <div>Posição: #{player.position}</div>
  <div>Pontos: {player.total_points}</div>
  <div>Presenças: {player.presence_days} dias</div>
  <div>Vendas: {player.sales_count}</div>
</div>
```

### Movement Indicator
```tsx
{player.move === 'up' && <span>↑ Subiu</span>}
{player.move === 'down' && <span>↓ Desceu</span>}
{player.move === 'same' && <span>→ Manteve</span>}
```

## 🔄 Automatic Workflow

### When an Action Happens

1. **Employee registers presence**
   ```
   Raspberry Pi → N8N → Vercel → log_presenca() → Trigger
   ```

2. **Trigger executes**
   ```
   INSERT on actions → trigger_update_monthly_leaderboard()
   ```

3. **Monthly leaderboard updates**
   ```
   update_monthly_leaderboard() → Recalculate position → Update leaderboard_entries
   ```

4. **Frontend updates (real-time)**
   ```
   Supabase real-time → Frontend subscription → UI updates
   ```

### At Month End

No action needed! The system automatically:
- Closes the current month's leaderboard
- Creates next month's leaderboard on first action
- Maintains historical data

## 📊 May 2024 Data Analysis

After importing May data, you can:

### See May Results
```sql
SELECT * FROM get_monthly_leaderboard(2024, 5)
ORDER BY position;
```

### Check Total Activity
```sql
SELECT 
  COUNT(DISTINCT player_id) as active_players,
  SUM(CASE WHEN action_id = 'presenca' THEN 1 ELSE 0 END) as total_presence,
  SUM(CASE WHEN action_id = 'sell_product' THEN 1 ELSE 0 END) as total_sales,
  SUM(points_awarded) as total_points
FROM actions
WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') >= '2024-05-01'
  AND DATE(created_at AT TIME ZONE 'America/Sao_Paulo') <= '2024-05-31';
```

### Presence Rate
```sql
SELECT 
  p.name,
  COUNT(DISTINCT DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo')) as days_present,
  (COUNT(DISTINCT DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo'))::FLOAT / 31 * 100) as presence_rate
FROM players p
JOIN actions a ON p.id = a.player_id
WHERE a.action_id = 'presenca'
  AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') >= '2024-05-01'
  AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') <= '2024-05-31'
GROUP BY p.id, p.name
ORDER BY days_present DESC;
```

### Sales Performance
```sql
SELECT 
  p.name,
  COUNT(*) as total_sales,
  SUM((a.attributes->>'price')::NUMERIC) as total_revenue,
  SUM(a.points_awarded) as points_from_sales
FROM players p
JOIN actions a ON p.id = a.player_id
WHERE a.action_id = 'sell_product'
  AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') >= '2024-05-01'
  AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') <= '2024-05-31'
GROUP BY p.id, p.name
ORDER BY total_sales DESC;
```

## 🎯 Next Steps

1. **Run the SQL**: `SUPABASE_MONTHLY_LEADERBOARDS.sql`
2. **Import May data**: `npm run tsx scripts/import-may-data-from-funifier.ts`
3. **Analyze May results**: Use the queries above
4. **Update frontend**: Add month selector and stats
5. **Test June**: Let it auto-create when first action happens

## ✅ Verification Checklist

After setup:

- [ ] SQL functions created
- [ ] Trigger created and active
- [ ] May 2024 data imported
- [ ] May leaderboard shows correct rankings
- [ ] Current month leaderboard auto-created
- [ ] Points are updating automatically
- [ ] Frontend can fetch monthly data
- [ ] Real-time updates working

## 📞 Support Queries

### Debug: Check if trigger is working
```sql
SELECT 
  trigger_name, 
  event_manipulation, 
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'auto_update_monthly_leaderboard';
```

### Debug: Check last updated leaderboard
```sql
SELECT 
  l.title,
  COUNT(le.id) as entries,
  MAX(le.updated_at) as last_update
FROM leaderboards l
LEFT JOIN leaderboard_entries le ON l.id = le.leaderboard_id
WHERE l.title ~ '^Ranking .* 2024$'
GROUP BY l.id, l.title
ORDER BY l.created_at DESC;
```

### Debug: Check recent actions
```sql
SELECT 
  a.action_id,
  p.name as player_name,
  a.points_awarded,
  a.created_at
FROM actions a
JOIN players p ON a.player_id = p.id
ORDER BY a.created_at DESC
LIMIT 10;
```

---

**Ready to go!** Your monthly leaderboard system is now set up and ready to use. 🎉
