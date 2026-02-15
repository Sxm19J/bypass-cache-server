// Using Vercel KV (Redis) for persistent storage
import { createClient } from '@vercel/kv';

// Initialize KV client
const kv = createClient({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const CACHE_PREFIX = 'bypass:';
const STATS_KEY = 'bypass:stats';

export async function getCachedUrl(originalUrl) {
  try {
    const key = CACHE_PREFIX + originalUrl;
    const data = await kv.get(key);
    
    if (data) {
      // Update stats
      await kv.hincrby(STATS_KEY, 'hits', 1);
      return data;
    }
    
    await kv.hincrby(STATS_KEY, 'misses', 1);
    return null;
  } catch (error) {
    console.error('Error getting from cache:', error);
    return null;
  }
}

export async function saveToCache(originalUrl, bypassedUrl) {
  try {
    const key = CACHE_PREFIX + originalUrl;
    await kv.set(key, bypassedUrl);
    
    // Add to recent list
    await kv.lpush('bypass:recent', JSON.stringify({
      original: originalUrl,
      bypassed: bypassedUrl,
      timestamp: Date.now()
    }));
    await kv.ltrim('bypass:recent', 0, 99); // Keep only last 100
    
    // Update total count
    await kv.hincrby(STATS_KEY, 'total', 1);
    
    return true;
  } catch (error) {
    console.error('Error saving to cache:', error);
    return false;
  }
}

export async function getStats() {
  try {
    const stats = await kv.hgetall(STATS_KEY) || { hits: 0, misses: 0, total: 0 };
    const recent = await kv.lrange('bypass:recent', 0, 9);
    const totalKeys = await kv.dbsize();
    
    return {
      ...stats,
      recent: recent.map(item => JSON.parse(item)),
      totalEntries: totalKeys
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return { hits: 0, misses: 0, total: 0, recent: [] };
  }
}
