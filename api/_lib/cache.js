import Cors from 'cors';

// Simple in-memory cache (since you're not using KV)
let cache = {};
let stats = { hits: 0, misses: 0, total: 0, recent: [] };

// Initialize CORS
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  origin: '*',
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  await runMiddleware(req, res, cors);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET request - retrieve from cache or get stats
  if (req.method === 'GET') {
    const { url, action } = req.query;

    if (action === 'stats') {
      return res.status(200).json({
        hits: stats.hits,
        misses: stats.misses,
        total: stats.total,
        recent: stats.recent.slice(0, 10),
        totalEntries: Object.keys(cache).length
      });
    }

    if (url) {
      const decodedUrl = decodeURIComponent(url);
      if (cache[decodedUrl]) {
        stats.hits++;
        return res.status(200).json({ 
          success: true, 
          url: cache[decodedUrl],
          source: 'cache'
        });
      } else {
        stats.misses++;
        return res.status(404).json({ 
          success: false, 
          message: 'Not in cache' 
        });
      }
    }
  }

  // POST request - save to cache
  if (req.method === 'POST') {
    const { original, bypassed } = req.body;

    if (!original || !bypassed) {
      return res.status(400).json({ error: 'Missing original or bypassed url' });
    }

    cache[original] = bypassed;
    stats.total++;
    stats.recent.unshift({
      original: original,
      bypassed: bypassed,
      timestamp: Date.now()
    });
    stats.recent = stats.recent.slice(0, 50);

    return res.status(200).json({ success: true, message: 'Saved to cache' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
