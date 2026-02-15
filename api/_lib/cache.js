import { getCachedUrl, saveToCache, getStats } from './_lib/db.js';
import Cors from 'cors';

// Initialize CORS middleware
const cors = Cors({
  methods: ['GET', 'POST', 'OPTIONS'],
  origin: '*', // In production, restrict this to your domains
  optionsSuccessStatus: 200
});

// Helper to run middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  // Run CORS middleware
  await runMiddleware(req, res, cors);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // GET request - retrieve from cache or get stats
    if (req.method === 'GET') {
      const { url, action } = req.query;

      // Stats endpoint
      if (action === 'stats') {
        const stats = await getStats();
        return res.status(200).json(stats);
      }

      // Cache lookup
      if (url) {
        const decodedUrl = decodeURIComponent(url);
        const cached = await getCachedUrl(decodedUrl);
        
        if (cached) {
          return res.status(200).json({ 
            success: true, 
            url: cached,
            source: 'cache'
          });
        } else {
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
        return res.status(400).json({ 
          error: 'Missing original or bypassed url' 
        });
      }

      const saved = await saveToCache(original, bypassed);
      
      if (saved) {
        return res.status(200).json({ 
          success: true, 
          message: 'Saved to cache' 
        });
      } else {
        return res.status(500).json({ 
          error: 'Failed to save to cache' 
        });
      }
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
}
