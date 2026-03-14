// SIMPLE CACHE - NO COMPLICATED STUFF
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
      return res.status(200).json({
        hits: stats.hits,
        misses: stats.misses,
        total: stats.total,
        recent: stats.recent.slice(0, 50),
        totalEntries: Object.keys(cache).length
      });
    }

    // Cache lookup
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

  // POST request
  if (req.method === 'POST') {
    const { original, bypassed } = req.body;

    if (!original || !bypassed) {
      return res.status(400).json({ error: 'Missing fields' });
    }

    // Save to cache
    cache[original] = bypassed;
    stats.total++;
    
    // Add to recent
    stats.recent.unshift({
      original: original,
      bypassed: bypassed,
      timestamp: Date.now()
    });
    
    // Keep only last 100
    stats.recent = stats.recent.slice(0, 100);

    console.log(`✅ Saved: ${original} -> ${bypassed}`);

    return res.status(200).json({ 
      success: true, 
      message: 'Saved!'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
