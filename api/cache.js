// Simple in-memory cache - no KV dependencies
let cache = {};
let stats = {
  hits: 0,
  misses: 0,
  total: 0,
  recent: []
};

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET request - retrieve from cache or get stats
  if (req.method === 'GET') {
    const { url, action } = req.query;

    // Stats endpoint
    if (action === 'stats') {
      return res.status(200).json({
        hits: stats.hits,
        misses: stats.misses,
        total: stats.total,
        recent: stats.recent.slice(0, 20),
        totalEntries: Object.keys(cache).length
      });
    }

    // Cache lookup
    if (url) {
      const decodedUrl = decodeURIComponent(url);
      console.log(`🔍 Looking up: ${decodedUrl}`);
      
      if (cache[decodedUrl]) {
        stats.hits++;
        console.log(`✅ Cache HIT for: ${decodedUrl} -> ${cache[decodedUrl]}`);
        return res.status(200).json({ 
          success: true, 
          url: cache[decodedUrl],
          source: 'cache'
        });
      } else {
        stats.misses++;
        console.log(`❌ Cache MISS for: ${decodedUrl}`);
        return res.status(404).json({ 
          success: false, 
          message: 'Not in cache' 
        });
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

    // Save to cache
    cache[original] = bypassed;
    stats.total++;
    
    // Log the mapping
    console.log(`💾 Caching: ${original} -> ${bypassed}`);
    
    // Add to recent list
    stats.recent.unshift({
      original: original,
      bypassed: bypassed,
      timestamp: Date.now()
    });
    
    // Keep only last 50 entries
    stats.recent = stats.recent.slice(0, 50);

    return res.status(200).json({ 
      success: true, 
      message: 'Saved to cache',
      mapping: {
        original,
        bypassed
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
