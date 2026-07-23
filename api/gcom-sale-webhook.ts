import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * GCOM Sale Webhook
 * Receives store-wide sale data from GCOM via N8N
 * Awards points to ALL players who had presence today
 *
 * Expected payload (new n8n format):
 * {
 *   "ID_EMP_GCOM": 90127,
 *   "ID_ETB_GCOM": 6822,
 *   "ID_VND_WEB": 19290,
 *   "delivery_id": "90127-6822-19290",
 *   "delivery_title": "FNP CHURRAS - KAUA FERNANDES",
 *   "created_at": "2026-07-23 14:32:35",
 *   "finished_at": "2026-07-23 14:36:08",
 *   "integration_id": 19290,
 *   "price": "19.04",
 *   "cliente_nome": "KAUA FERNANDES"
 * }
 */

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { delivery_id, delivery_title, price, created_at } = req.body;

    // Validate required fields
    if (!delivery_id || !delivery_title || price === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: delivery_id, delivery_title, price',
      });
    }

    // Validate price is a number
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid price value',
      });
    }

    // Use created_at from payload or fallback to now
    const saleTimestamp = created_at
      ? new Date(created_at).toISOString()
      : new Date().toISOString();

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call the log_store_sale function with delivery_id for deduplication
    const { data, error } = await supabase.rpc('log_store_sale', {
      p_delivery_id: delivery_id,
      p_delivery_title: delivery_title,
      p_price: priceNum,
      p_sale_timestamp: saleTimestamp,
    });

    if (error) {
      console.error('Error logging store sale:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to log store sale',
        details: error.message,
      });
    }

    // If sale was a duplicate, return 200 but signal it
    if (data?.duplicate) {
      console.log('Duplicate sale ignored:', { delivery_id, delivery_title });
      return res.status(200).json(data);
    }

    console.log('Store sale logged successfully:', {
      delivery_id,
      delivery_title,
      price: priceNum,
      created_at: saleTimestamp,
      players_awarded: data?.players_awarded,
      total_points_awarded: data?.total_points_awarded,
      points_per_player: data?.points_per_player,
    });

    return res.status(200).json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unexpected error in GCOM sale webhook:', message);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message,
    });
  }
}
