let kvClientPromise;

async function getKvClient() {
  if (kvClientPromise) return kvClientPromise;

  kvClientPromise = (async () => {
    const hasEnv = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN;
    if (!hasEnv) return null;

    try {
      const { createClient } = await import('@vercel/kv');
      return createClient({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
      });
    } catch (error) {
      console.warn('Vercel KV package is not available. Using fallback cache only.');
      return null;
    }
  })();

  return kvClientPromise;
}

const CACHE_PREFIX = 'bypass:';
const STATS_KEY = 'bypass:stats';
const RECENT_KEY = 'bypass:recent';
const CACHE_TTL_SECONDS = 60 * 60;

export async function getCachedUrl(originalUrl) {
  const kv = await getKvClient();
  if (!kv) return null;

  try {
    const key = CACHE_PREFIX + originalUrl;
    const data = await kv.get(key);

    if (data) {
      await kv.hincrby(STATS_KEY, 'hits', 1);
      return data;
    }

    await kv.hincrby(STATS_KEY, 'misses', 1);
    return null;
  } catch (error) {
    console.error('Error getting from KV cache:', error);
    return null;
  }
}

export async function saveToCache(originalUrl, bypassedUrl) {
  const kv = await getKvClient();
  if (!kv) return false;

  try {
    const key = CACHE_PREFIX + originalUrl;
    await kv.set(key, bypassedUrl, { ex: CACHE_TTL_SECONDS });

    await kv.lpush(
      RECENT_KEY,
      JSON.stringify({
        original: originalUrl,
        bypassed: bypassedUrl,
        timestamp: Date.now(),
      }),
    );
    await kv.ltrim(RECENT_KEY, 0, 99);

    await kv.hincrby(STATS_KEY, 'total', 1);
    return true;
  } catch (error) {
    console.error('Error saving to KV cache:', error);
    return false;
  }
}

export async function getStats() {
  const kv = await getKvClient();
  if (!kv) {
    return { hits: 0, misses: 0, total: 0, recent: [], totalEntries: 0 };
  }

  try {
    const stats = (await kv.hgetall(STATS_KEY)) || { hits: 0, misses: 0, total: 0 };
    const recent = await kv.lrange(RECENT_KEY, 0, 9);

    return {
      ...stats,
      recent: recent.map((item) => JSON.parse(item)),
      totalEntries: Number(stats.total || 0),
    };
  } catch (error) {
    console.error('Error getting KV stats:', error);
    return { hits: 0, misses: 0, total: 0, recent: [], totalEntries: 0 };
  }
}
