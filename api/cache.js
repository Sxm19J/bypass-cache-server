// ULTRA SIMPLE CACHE - NO IMPORTS, NO COMPLEXITY
let cache = {};
let stats = {
  hits: 0,
  misses: 0,
  total: 0,
  recent: []
};

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Handle GET request
  if (req.method === 'GET') {
    const { url, action } = req.query;

    // Return stats
    if (action === 'stats') {
      return res.status(200).json({
        hits: stats.hits,
        misses: stats.misses,
        total: stats.total,
        recent: stats.recent.slice(0, 20),
        totalEntries: Object.keys(cache).length
      });
    }

    // Look up a URL
    if (url) {
      const decodedUrl = decodeURIComponent(url);
      
      if (cache[decodedUrl]) {
        stats.hits++;
        return res.status(200).json({
          success: true,
          url: cache[decodedUrl]
        });
      } else {
        stats.misses++;
        return res.status(404).json({
          success: false,
          message: 'Not in cache'
        });
      }
    }

    return res.status(400).json({ error: 'Missing url parameter' });
  }

  // Handle POST request
  if (req.method === 'POST') {
    const { original, bypassed } = req.body;

    if (!original || !bypassed) {
      return res.status(400).json({ error: 'Missing original or bypassed url' });
    }

    // Store in cache
    cache[original] = bypassed;
    stats.total++;

    // Add to recent list
    stats.recent.unshift({
      original: original,
      bypassed: bypassed,
      timestamp: Date.now()
    });
    stats.recent = stats.recent.slice(0, 50);

    console.log(`✅ Cached: ${original} -> ${bypassed}`);

    return res.status(200).json({
      success: true,
      message: 'Saved to cache'
    });
  }

  // Handle other methods
  return res.status(405).json({ error: 'Method not allowed' });
}
