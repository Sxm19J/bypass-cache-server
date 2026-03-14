import { createClient } from '@vercel/kv';

// Initialize KV client
const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CACHE_PREFIX = 'bypass:';
const STATS_KEY = 'bypass:stats';
const RECENT_KEY = 'bypass:recent';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET request
  if (req.method === 'GET') {
    const { url, action } = req.query;

    // Stats endpoint
    if (action === 'stats') {
      try {
        // Get stats
        const stats = await kv.hgetall(STATS_KEY) || { hits: 0, misses: 0, total: 0 };
        
        // Get recent entries (last 50)
        const recentRaw = await kv.lrange(RECENT_KEY, 0, 49);
        const recent = recentRaw.map(item => JSON.parse(item));
        
        // Get total entries count
        const keys = await kv.keys(`${CACHE_PREFIX}*`);
        
        return res.status(200).json({
          hits: Number(stats.hits || 0),
          misses: Number(stats.misses || 0),
          total: Number(stats.total || 0),
          recent: recent,
          totalEntries: keys.length
        });
      } catch (error) {
        console.error('Error getting stats:', error);
        return res.status(500).json({ error: 'Failed to get stats' });
      }
    }

    // Cache lookup
    if (url) {
      const decodedUrl = decodeURIComponent(url);
      
      try {
        const key = CACHE_PREFIX + decodedUrl;
        const cached = await kv.get(key);
        
        if (cached) {
          // Increment hits
          await kv.hincrby(STATS_KEY, 'hits', 1);
          
          return res.status(200).json({ 
            success: true, 
            url: cached
          });
        } else {
          // Increment misses
          await kv.hincrby(STATS_KEY, 'misses', 1);
          
          return res.status(404).json({ 
            success: false, 
            message: 'Not in cache' 
          });
        }
      } catch (error) {
        console.error('Error looking up cache:', error);
        return res.status(500).json({ error: 'Failed to lookup cache' });
      }
    }

    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // POST request - save to cache
  if (req.method === 'POST') {
    const { original, bypassed } = req.body;

    if (!original || !bypassed) {
      return res.status(400).json({ error: 'Missing original or bypassed url' });
    }

    try {
      const key = CACHE_PREFIX + original;
      
      // Save to cache PERMANENTLY (no expiration)
      await kv.set(key, bypassed);
      
      // Increment total count
      await kv.hincrby(STATS_KEY, 'total', 1);
      
      // Add to recent list
      const recentEntry = {
        original: original,
        bypassed: bypassed,
        timestamp: Date.now()
      };
      
      await kv.lpush(RECENT_KEY, JSON.stringify(recentEntry));
      await kv.ltrim(RECENT_KEY, 0, 99); // Keep last 100
      
      console.log(`✅ PERMANENTLY SAVED: ${original} -> ${bypassed}`);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Permanently saved to cache'
      });
    } catch (error) {
      console.error('Error saving to cache:', error);
      return res.status(500).json({ error: 'Failed to save to cache' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
