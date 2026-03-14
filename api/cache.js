import { put, list, head, del } from '@vercel/blob';
import { createHash } from 'crypto';

// Simple in-memory cache for stats
let stats = {
  hits: 0,
  misses: 0,
  total: 0
};

// Blob paths
const STATS_FILE = 'stats.json';
const MAPPINGS_PREFIX = 'mappings/';
const RECENT_FILE = 'recent.json';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Helper to get stats from blob
async function getStats() {
  try {
    const { url } = await head(STATS_FILE);
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.log('No stats file yet, creating default');
    return { hits: 0, misses: 0, total: 0 };
  }
}

// Helper to save stats to blob
async function saveStats(newStats) {
  try {
    const statsBlob = new Blob([JSON.stringify(newStats, null, 2)], { type: 'application/json' });
    await put(STATS_FILE, statsBlob, { access: 'public', addRandomSuffix: false });
    console.log('Stats saved:', newStats);
  } catch (error) {
    console.error('Error saving stats:', error);
  }
}

// Helper to get recent mappings
async function getRecent() {
  try {
    const { url } = await head(RECENT_FILE);
    const response = await fetch(url);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.log('No recent file yet');
    return [];
  }
}

// Helper to save recent mappings
async function saveRecent(recent) {
  try {
    const recentBlob = new Blob([JSON.stringify(recent, null, 2)], { type: 'application/json' });
    await put(RECENT_FILE, recentBlob, { access: 'public', addRandomSuffix: false });
    console.log(`Recent saved: ${recent.length} entries`);
  } catch (error) {
    console.error('Error saving recent:', error);
  }
}

export default async function handler(req, res) {
  setCors(res);

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
        const currentStats = await getStats();
        
        // Get recent mappings
        const recent = await getRecent();
        
        // List all mapping files
        let totalEntries = 0;
        try {
          const { blobs } = await list({ prefix: MAPPINGS_PREFIX });
          totalEntries = blobs.length;
        } catch (e) {
          console.log('Error listing mappings:', e);
        }
        
        console.log('Stats response:', {
          hits: currentStats.hits,
          misses: currentStats.misses,
          total: currentStats.total,
          recentCount: recent.length,
          totalEntries
        });
        
        return res.status(200).json({
          hits: currentStats.hits || 0,
          misses: currentStats.misses || 0,
          total: currentStats.total || 0,
          recent: recent.slice(0, 50), // Return last 50
          totalEntries
        });
      } catch (error) {
        console.error('Error getting stats:', error);
        return res.status(200).json({
          hits: 0,
          misses: 0,
          total: 0,
          recent: [],
          totalEntries: 0
        });
      }
    }

    // Cache lookup
    if (url) {
      const decodedUrl = decodeURIComponent(url);
      console.log(`🔍 Looking up: ${decodedUrl}`);
      
      try {
        // Create a safe filename from the URL
        const hash = createHash('sha256').update(decodedUrl).digest('hex');
        const filename = `${MAPPINGS_PREFIX}${hash}.json`;
        
        // Check if mapping exists
        try {
          const { url: fileUrl } = await head(filename);
          const response = await fetch(fileUrl);
          
          if (response.ok) {
            const data = await response.json();
            
            // Update stats
            const currentStats = await getStats();
            currentStats.hits++;
            await saveStats(currentStats);
            
            console.log(`✅ Cache HIT: ${decodedUrl} -> ${data.bypassed}`);
            
            return res.status(200).json({ 
              success: true, 
              url: data.bypassed,
              source: 'blob'
            });
          }
        } catch (e) {
          // Not found, continue to miss
          console.log(`Not found in blob: ${filename}`);
        }
      } catch (error) {
        console.error('Error looking up:', error);
      }
      
      // Miss
      const currentStats = await getStats();
      currentStats.misses++;
      await saveStats(currentStats);
      
      console.log(`❌ Cache MISS: ${decodedUrl}`);
      
      return res.status(404).json({ 
        success: false, 
        message: 'Not in cache' 
      });
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
      // Create a safe filename from the original URL
      const hash = createHash('sha256').update(original).digest('hex');
      const filename = `${MAPPINGS_PREFIX}${hash}.json`;
      
      // Save mapping to blob
      const mappingData = {
        original,
        bypassed,
        timestamp: Date.now()
      };
      
      console.log('Saving mapping:', mappingData);
      
      const mappingBlob = new Blob([JSON.stringify(mappingData, null, 2)], { type: 'application/json' });
      await put(filename, mappingBlob, { access: 'public', addRandomSuffix: false });
      
      // Update stats
      const currentStats = await getStats();
      currentStats.total++;
      await saveStats(currentStats);
      
      // Update recent mappings
      const recent = await getRecent();
      recent.unshift(mappingData);
      const trimmedRecent = recent.slice(0, 100); // Keep last 100
      await saveRecent(trimmedRecent);
      
      console.log(`💾 PERMANENTLY SAVED TO BLOB: ${original} -> ${bypassed}`);
      console.log(`📁 Filename: ${filename}`);
      console.log(`📊 Recent count: ${trimmedRecent.length}`);
      
      return res.status(200).json({ 
        success: true, 
        message: 'Permanently saved to Blob storage',
        mapping: {
          original,
          bypassed
        }
      });
    } catch (error) {
      console.error('Error saving to blob:', error);
      return res.status(500).json({ error: 'Failed to save to cache' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
