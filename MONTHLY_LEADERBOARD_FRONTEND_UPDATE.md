# Frontend Update - Monthly Leaderboards

## Changes Made

### 1. SupabaseApiService (`src/services/supabaseApi.ts`)

Added three new methods:

#### `getCurrentMonthLeaderboard(year?, month?)`
- Fetches the current month's leaderboard (or specific year/month if provided)
- Calls the `get_monthly_leaderboard` PostgreSQL function
- Returns data in the same format as `getLeaderboardData()`
- Includes extra fields: `presence_days` and `sales_count`

#### `listMonthlyLeaderboards()`
- Lists all available monthly leaderboards
- Returns array with: id, title, year, month, playerCount
- Useful for building a month selector UI

#### `getMonthName(month)`
- Private helper method
- Returns month name in Portuguese (Janeiro, Fevereiro, etc.)

### 2. useChickenRaceManager Hook (`src/hooks/useChickenRaceManager.ts`)

Updated two functions:

#### `initializeRace()`
**Before:** Fetched all leaderboards, then selected first or "EVeTmET"
**After:** Directly fetches current month's leaderboard using `getCurrentMonthLeaderboard()`

#### `refreshData()`
**Before:** Refreshed data for `currentLeaderboardId`
**After:** Always refreshes current month's leaderboard

### 3. Behavior Changes

**Old Behavior:**
- App loaded "Ranking Geral" or first available leaderboard
- Showed all-time rankings

**New Behavior:**
- App automatically loads current month's leaderboard (June 2026)
- Rankings are monthly, reset each month
- Title: "Ranking Junho 2026" (auto-generated)
- Description: "Rankings do mês de Junho de 2026"

## Database Requirements

The frontend now expects these PostgreSQL functions to exist:

1. `get_monthly_leaderboard(p_year INTEGER, p_month INTEGER)`
   - Returns: player_id, player_name, position, total_points, presence_days, sales_count, previous_position, previous_total, player_image

2. `list_monthly_leaderboards()`
   - Returns: id, title, year, month, player_count

These functions are already created in `SUPABASE_MONTHLY_LEADERBOARDS.sql`.

## Next Steps

1. ✅ Run `FIX_RECALCULATE_FUNCTION.sql` to fix the ambiguous column error
2. ✅ Run `POPULATE_MONTHLY_LEADERBOARDS.sql` to populate May & June 2026
3. ✅ Build and test the frontend

## Future Enhancements

To add a month selector in the UI:

```typescript
// Add to App.tsx or create a MonthSelector component
const [selectedYear, setSelectedYear] = useState(2026);
const [selectedMonth, setSelectedMonth] = useState(6);

// Fetch specific month
const monthData = await apiService.getCurrentMonthLeaderboard(selectedYear, selectedMonth);

// Get available months
const availableMonths = await apiService.listMonthlyLeaderboards();
```

## Testing

After deploying:

1. Open the app - should automatically show "Ranking Junho 2026"
2. Check console logs for: "🚀 Fetching current month leaderboard from API..."
3. Verify rankings match June 2026 data from database
4. Check that presence_days and sales_count appear in player extra data

---

**Status:** Frontend code updated and ready to use monthly leaderboards!
