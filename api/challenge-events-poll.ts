import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from 'redis';

/**
 * Simple polling endpoint for challenge events
 * Frontend polls this every 2 seconds to check for new events
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Last-Timestamp');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let redis;
  try {
    // Get the last timestamp the client has seen
    const lastTimestamp = parseInt(req.headers['x-last-timestamp'] as string) || 0;
    
    redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();
    
    // Check if there are new events
    const latestTimestamp = await redis.get('challenge-events:latest');
    const latestTs = latestTimestamp ? parseInt(latestTimestamp) : 0;
    
    if (latestTs > lastTimestamp) {
      // Fetch recent events
      const recentEvents = await redis.lRange('challenge-events:recent', 0, 9);
      
      // Filter to only events newer than lastTimestamp
      const newEvents = recentEvents
        .map(eventJson => {
          try {
            return JSON.parse(eventJson);
          } catch {
            return null;
          }
        })
        .filter(event => {
          if (!event) return false;
          const eventTs = new Date(event.timestamp).getTime();
          return eventTs > lastTimestamp;
        });
      
      await redis.disconnect();
      
      return res.status(200).json({
        hasNewEvents: newEvents.length > 0,
        events: newEvents,
        latestTimestamp: latestTs
      });
    }
    
    await redis.disconnect();
    
    return res.status(200).json({
      hasNewEvents: false,
      events: [],
      latestTimestamp: latestTs
    });
    
  } catch (error) {
    console.error('Error polling events:', error);
    if (redis) {
      try { await redis.disconnect(); } catch {}
    }
    return res.status(500).json({ error: 'Failed to poll events' });
  }
}
