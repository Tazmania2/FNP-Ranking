import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

/**
 * Import May 2026 data from Funifier to Supabase
 * This will help analyze and study the data before migrating completely
 */

// Funifier credentials
const FUNIFIER_API_BASE = 'https://service2.funifier.com/v3';
const FUNIFIER_CREDENTIALS = Buffer.from(
  '68a6752b6e1d0e2196db1b53:67ec4e4a2327f74f3a2f96f5'
).toString('base64');

// Supabase credentials
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://fnp.centralsupernova.com.br';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment');
  console.log('Make sure .env.local file exists with the service role key');
  process.exit(1);
}

interface FunifierPlayer {
  _id: string;
  player: string;
  name: string;
  extra?: {
    uid?: string;
    [key: string]: any;
  };
}

interface FunifierAction {
  _id: string;
  actionId: string;
  userId: string;
  attributes: {
    uid?: string;
    hora?: string;
    delivery_title?: string;
    price?: number;
    [key: string]: any;
  };
  created: {
    $date: string;
  };
}

interface ImportStats {
  players: {
    total: number;
    imported: number;
    skipped: number;
    errors: number;
  };
  actions: {
    presenca: {
      total: number;
      imported: number;
    };
    sales: {
      total: number;
      imported: number;
    };
    errors: number;
  };
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchFunifierPlayers(): Promise<FunifierPlayer[]> {
  console.log('📥 Fetching players from Funifier...');
  
  try {
    const response = await axios.get(`${FUNIFIER_API_BASE}/player`, {
      headers: {
        'Authorization': `Basic ${FUNIFIER_CREDENTIALS}`
      }
    });
    
    console.log(`✅ Fetched ${response.data.length} players`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching players:', error.message);
    throw error;
  }
}

async function fetchFunifierActions(startDate: Date, endDate: Date): Promise<FunifierAction[]> {
  console.log(`📥 Fetching actions from ${startDate.toISOString()} to ${endDate.toISOString()}...`);
  
  try {
    // Funifier doesn't have a direct date filter in the API
    // We'll fetch all actions and filter locally
    const response = await axios.post(
      `${FUNIFIER_API_BASE}/database/action/aggregate`,
      [
        {
          $match: {
            'created.$date': {
              $gte: startDate.toISOString(),
              $lte: endDate.toISOString()
            }
          }
        }
      ],
      {
        headers: {
          'Authorization': `Basic ${FUNIFIER_CREDENTIALS}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log(`✅ Fetched ${response.data.length} actions`);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching actions:', error.message);
    // If aggregate fails, try to get recent actions
    try {
      const response = await axios.get(`${FUNIFIER_API_BASE}/action`, {
        headers: {
          'Authorization': `Basic ${FUNIFIER_CREDENTIALS}`
        }
      });
      
      // Filter by date locally
      const filteredActions = response.data.filter((action: FunifierAction) => {
        const actionDate = new Date(action.created.$date);
        return actionDate >= startDate && actionDate <= endDate;
      });
      
      console.log(`✅ Fetched and filtered ${filteredActions.length} actions from May`);
      return filteredActions;
    } catch (fallbackError: any) {
      console.error('❌ Fallback also failed:', fallbackError.message);
      throw error;
    }
  }
}

async function importPlayers(funifierPlayers: FunifierPlayer[], stats: ImportStats): Promise<Map<string, string>> {
  console.log('\n👥 Importing players...');
  
  const playerIdMap = new Map<string, string>(); // Funifier ID -> Supabase ID
  
  for (const funifierPlayer of funifierPlayers) {
    try {
      // Use player field as player_code, or fallback to name if player is empty
      const playerCode = funifierPlayer.player || funifierPlayer.name.toLowerCase().replace(/\s+/g, '_');
      
      // Check if player already exists by player_code
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .eq('player_code', playerCode)
        .single();
      
      if (existingPlayer) {
        playerIdMap.set(funifierPlayer._id, existingPlayer.id);
        stats.players.skipped++;
        continue;
      }
      
      // Insert new player
      const { data: newPlayer, error } = await supabase
        .from('players')
        .insert({
          player_code: playerCode,
          name: funifierPlayer.name,
          extra: funifierPlayer.extra || {},
          is_active: true
        })
        .select('id')
        .single();
      
      if (error) {
        console.error(`❌ Error importing player ${funifierPlayer.name}:`, error.message);
        stats.players.errors++;
        continue;
      }
      
      playerIdMap.set(funifierPlayer._id, newPlayer.id);
      stats.players.imported++;
      
    } catch (error: any) {
      console.error(`❌ Exception importing player ${funifierPlayer.name}:`, error.message);
      stats.players.errors++;
    }
  }
  
  console.log(`✅ Players imported: ${stats.players.imported}, skipped: ${stats.players.skipped}, errors: ${stats.players.errors}`);
  return playerIdMap;
}

async function importActions(
  funifierActions: FunifierAction[],
  playerIdMap: Map<string, string>,
  stats: ImportStats
): Promise<void> {
  console.log('\n📊 Importing actions...');
  
  for (const action of funifierActions) {
    try {
      const supabasePlayerId = playerIdMap.get(action.userId);
      
      if (!supabasePlayerId) {
        console.warn(`⚠️  Player not found for action: ${action.userId}`);
        stats.actions.errors++;
        continue;
      }
      
      const createdAt = new Date(action.created.$date);
      
      if (action.actionId === 'presenca') {
        // Import presença action
        const { error } = await supabase.rpc('log_presenca', {
          p_uid: action.attributes.uid || '',
          p_station: null,
          p_timestamp: createdAt.toISOString()
        });
        
        if (error) {
          console.error(`❌ Error importing presença:`, error.message);
          stats.actions.errors++;
        } else {
          stats.actions.presenca.imported++;
        }
        
      } else if (action.actionId === 'sell_product') {
        // Import sale action
        const { data: player } = await supabase
          .from('players')
          .select('player_code')
          .eq('id', supabasePlayerId)
          .single();
        
        if (!player) {
          stats.actions.errors++;
          continue;
        }
        
        const { error } = await supabase.rpc('log_sale', {
          p_player_email: player.player_code,
          p_delivery_title: action.attributes.delivery_title || 'Unknown',
          p_price: action.attributes.price || 0,
          p_sale_timestamp: createdAt.toISOString()
        });
        
        if (error) {
          console.error(`❌ Error importing sale:`, error.message);
          stats.actions.errors++;
        } else {
          stats.actions.sales.imported++;
        }
      }
      
    } catch (error: any) {
      console.error(`❌ Exception importing action:`, error.message);
      stats.actions.errors++;
    }
  }
  
  console.log(`✅ Actions imported:`);
  console.log(`   - Presença: ${stats.actions.presenca.imported}`);
  console.log(`   - Sales: ${stats.actions.sales.imported}`);
  console.log(`   - Errors: ${stats.actions.errors}`);
}

async function recalculateMayLeaderboard(): Promise<void> {
  console.log('\n📊 Recalculating May 2026 leaderboard...');
  
  try {
    const { data, error } = await supabase.rpc('recalculate_monthly_leaderboard', {
      p_year: 2026,
      p_month: 5
    });
    
    if (error) {
      console.error('❌ Error recalculating leaderboard:', error.message);
      return;
    }
    
    console.log(`✅ Leaderboard recalculated with ${data?.length || 0} players`);
    
    // Show top 10
    if (data && data.length > 0) {
      console.log('\n🏆 Top 10 Players (May 2026):');
      data.slice(0, 10).forEach((player: any, index: number) => {
        console.log(`   ${index + 1}. ${player.player_name}: ${player.total_points} pts (${player.presence_days} days, ${player.sales_count} sales)`);
      });
    }
  } catch (error: any) {
    console.error('❌ Exception recalculating leaderboard:', error.message);
  }
}

async function saveReport(stats: ImportStats): Promise<void> {
  const reportPath = path.join(process.cwd(), 'may-import-report.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    stats,
    summary: {
      totalPlayers: stats.players.total,
      importedPlayers: stats.players.imported,
      totalActions: stats.actions.presenca.total + stats.actions.sales.total,
      importedActions: stats.actions.presenca.imported + stats.actions.sales.imported,
      successRate: {
        players: stats.players.total > 0 
          ? ((stats.players.imported / stats.players.total) * 100).toFixed(2) + '%'
          : '0%',
        actions: (stats.actions.presenca.total + stats.actions.sales.total) > 0
          ? (((stats.actions.presenca.imported + stats.actions.sales.imported) / 
              (stats.actions.presenca.total + stats.actions.sales.total)) * 100).toFixed(2) + '%'
          : '0%'
      }
    }
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

async function main() {
  console.log('🚀 Starting May 2026 data import from Funifier to Supabase\n');
  
  const stats: ImportStats = {
    players: { total: 0, imported: 0, skipped: 0, errors: 0 },
    actions: {
      presenca: { total: 0, imported: 0 },
      sales: { total: 0, imported: 0 },
      errors: 0
    }
  };
  
  try {
    // Step 1: Fetch players
    const funifierPlayers = await fetchFunifierPlayers();
    stats.players.total = funifierPlayers.length;
    
    // Step 2: Fetch May 2026 actions
    const mayStart = new Date('2026-05-01T00:00:00-03:00'); // BRT timezone
    const mayEnd = new Date('2026-05-31T23:59:59-03:00');
    const funifierActions = await fetchFunifierActions(mayStart, mayEnd);
    
    // Count actions by type
    funifierActions.forEach(action => {
      if (action.actionId === 'presenca') {
        stats.actions.presenca.total++;
      } else if (action.actionId === 'sell_product') {
        stats.actions.sales.total++;
      }
    });
    
    console.log(`\n📊 Data to import:`);
    console.log(`   - Players: ${stats.players.total}`);
    console.log(`   - Presença actions: ${stats.actions.presenca.total}`);
    console.log(`   - Sales actions: ${stats.actions.sales.total}`);
    
    // Step 3: Import players
    const playerIdMap = await importPlayers(funifierPlayers, stats);
    
    // Step 4: Import actions
    await importActions(funifierActions, playerIdMap, stats);
    
    // Step 5: Recalculate May leaderboard
    await recalculateMayLeaderboard();
    
    // Step 6: Save report
    await saveReport(stats);
    
    console.log('\n✅ Import completed successfully!\n');
    
  } catch (error: any) {
    console.error('\n❌ Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
main().catch(console.error);
