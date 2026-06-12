# 📅 Monthly Leaderboards - Quick Summary

## What Changed

Your ranking system now automatically creates a new leaderboard every month:
- ✅ **May 2024** → "Ranking Maio 2024"
- ✅ **June 2024** → "Ranking Junho 2024"  
- ✅ **July 2024** → "Ranking Julho 2024"
- And so on...

## 🚀 Quick Setup (15 minutes)

### Step 1: Run SQL (5 min)
```bash
# In Supabase Studio SQL Editor:
# Copy/paste: SUPABASE_MONTHLY_LEADERBOARDS.sql
# Click Run
```

Creates:
- Monthly leaderboard auto-creation
- Auto-update trigger (updates on every action)
- Query functions for frontend
- Recalculation functions

### Step 2: Import May 2024 Data (10 min)
```bash
npm run migrate:may
```

This imports:
- All players from Funifier
- All May 2024 presença actions
- All May 2024 sales actions
- Recalculates May 2024 leaderboard

## 📊 How It Works

### Automatic Flow
```
Action happens → Points awarded → Monthly leaderboard auto-updates
```

**Example**:
1. João registers presence (June 15, 2024)
2. Gets 5 points
3. System finds/creates "Ranking Junho 2024"
4. Updates João's position automatically
5. Frontend updates in real-time

### Monthly Cycle
```
May ends → June starts → First action creates "Ranking Junho 2024"
```

No manual intervention needed!

## 🎯 Key Features

### Auto-Creation
- First action of a new month creates that month's leaderboard
- No manual setup required

### Auto-Update
- Every action (presença or sale) updates the monthly ranking
- Positions recalculated automatically
- Previous position tracked for movement indicators

### Historical Data
- All monthly leaderboards preserved
- Can query any past month
- Can compare months

## 📱 Frontend Changes Needed

### Get Current Month Leaderboard
```typescript
// In SupabaseApiService
async getCurrentMonthLeaderboard() {
  const { data } = await this.supabase
    .rpc('get_monthly_leaderboard', {
      p_year: new Date().getFullYear(),
      p_month: new Date().getMonth() + 1
    });
  return data;
}
```

### List Available Months
```typescript
async listMonths() {
  const { data } = await this.supabase
    .rpc('list_monthly_leaderboards');
  return data; // [{title: "Ranking Maio 2024", year: 2024, month: 5}, ...]
}
```

### UI: Month Selector
```tsx
<select onChange={(e) => loadMonth(e.target.value)}>
  <option value="2024-06">Junho 2024 (Atual)</option>
  <option value="2024-05">Maio 2024</option>
</select>
```

## 📊 Useful Queries

### Current Month Rankings
```sql
SELECT * FROM get_monthly_leaderboard(
  EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
  EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER
);
```

### All Available Months
```sql
SELECT * FROM list_monthly_leaderboards();
```

### Recalculate a Month
```sql
SELECT * FROM recalculate_monthly_leaderboard(2024, 5);
```

### May 2024 Top 10
```sql
SELECT 
  player_name,
  position,
  total_points,
  presence_days,
  sales_count
FROM get_monthly_leaderboard(2024, 5)
ORDER BY position
LIMIT 10;
```

## 🎯 May 2024 Data Analysis

After importing, you can analyze:

### Overall Stats
```sql
SELECT 
  COUNT(DISTINCT player_id) as active_players,
  SUM(CASE WHEN action_id = 'presenca' THEN 1 END) as presences,
  SUM(CASE WHEN action_id = 'sell_product' THEN 1 END) as sales,
  SUM(points_awarded) as total_points
FROM actions
WHERE DATE(created_at AT TIME ZONE 'America/Sao_Paulo') 
  BETWEEN '2024-05-01' AND '2024-05-31';
```

### Presence Rate
```sql
SELECT 
  p.name,
  COUNT(DISTINCT DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo')) as days,
  ROUND(COUNT(DISTINCT DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo'))::NUMERIC / 31 * 100, 2) as rate
FROM players p
JOIN actions a ON p.id = a.player_id
WHERE a.action_id = 'presenca'
  AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') 
    BETWEEN '2024-05-01' AND '2024-05-31'
GROUP BY p.id, p.name
ORDER BY days DESC
LIMIT 10;
```

### Top Sellers
```sql
SELECT 
  p.name,
  COUNT(*) as sales,
  SUM((a.attributes->>'price')::NUMERIC) as revenue,
  SUM(a.points_awarded) as points
FROM players p
JOIN actions a ON p.id = a.player_id
WHERE a.action_id = 'sell_product'
  AND DATE(a.created_at AT TIME ZONE 'America/Sao_Paulo') 
    BETWEEN '2024-05-01' AND '2024-05-31'
GROUP BY p.id, p.name
ORDER BY sales DESC
LIMIT 10;
```

## ✅ Checklist

- [ ] Run `SUPABASE_MONTHLY_LEADERBOARDS.sql`
- [ ] Run `npm run migrate:may`
- [ ] Check May 2024 rankings
- [ ] Verify trigger is active
- [ ] Test: register a presence and check leaderboard updates
- [ ] Update frontend to fetch monthly data
- [ ] Add month selector to UI
- [ ] Show presence days and sales count

## 🎉 Benefits

### Before (Single Leaderboard)
- One leaderboard for all time
- Can't see monthly winners
- Can't reset rankings
- Can't analyze trends

### After (Monthly Leaderboards)
- ✅ Automatic monthly rankings
- ✅ Monthly winners
- ✅ Fresh start each month
- ✅ Historical data preserved
- ✅ Monthly analysis and trends
- ✅ Fair competition every month

## 📄 Files Created

1. **`SUPABASE_MONTHLY_LEADERBOARDS.sql`** - Database functions and triggers
2. **`scripts/import-may-data-from-funifier.ts`** - May data import script
3. **`MONTHLY_LEADERBOARDS_GUIDE.md`** - Complete guide with examples
4. **`MONTHLY_LEADERBOARDS_SUMMARY.md`** - This file (quick reference)

## 🚀 Ready to Go!

1. Run the SQL
2. Import May data
3. Enjoy automatic monthly rankings!

That's it! Your system now handles monthly leaderboards automatically. 🎉

---

**Questions?** Check `MONTHLY_LEADERBOARDS_GUIDE.md` for detailed documentation.
