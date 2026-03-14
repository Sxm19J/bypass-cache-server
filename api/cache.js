import { getCachedUrl as getKvCachedUrl, saveToCache as saveKvToCache, getStats as getKvStats } from './_lib/db.js';

let memoryCache = {};
let memoryStats = { hits: 0, misses: 0, total: 0, recent: [] };

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function normalizeUrl(value) {
  try {
    return decodeURIComponent(String(value || '').trim());
  } catch {
    return String(value || '').trim();
  }
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    const { url, action } = req.query || {};

    if (action === 'stats') {
      const kvStats = await getKvStats();
      return res.status(200).json({
        success: true,
        hits: Number(kvStats.hits || 0) + memoryStats.hits,
        misses: Number(kvStats.misses || 0) + memoryStats.misses,
        total: Number(kvStats.total || 0) + memoryStats.total,
        recent: [...(kvStats.recent || []), ...memoryStats.recent].slice(0, 10),
        totalEntries: Number(kvStats.totalEntries || 0) + Object.keys(memoryCache).length,
      });
    }

    if (!url) {
      return res.status(400).json({ success: false, message: 'Missing url query param' });
    }

    const decodedUrl = normalizeUrl(url);
    const kvHit = await getKvCachedUrl(decodedUrl);
    if (kvHit) {
      return res.status(200).json({ success: true, url: kvHit, source: 'vercel-kv' });
    }

    const memoryHit = memoryCache[decodedUrl];
    if (memoryHit) {
      memoryStats.hits += 1;
      return res.status(200).json({ success: true, url: memoryHit, source: 'memory' });
    }

    memoryStats.misses += 1;
    return res.status(404).json({ success: false, message: 'Not in cache' });
  }

  if (req.method === 'POST') {
    const { original, bypassed } = req.body || {};

    if (!original || !bypassed) {
      return res.status(400).json({ success: false, error: 'Missing original or bypassed URL' });
    }

    const normalizedOriginal = String(original).trim();
    const normalizedBypassed = String(bypassed).trim();

    const kvSaved = await saveKvToCache(normalizedOriginal, normalizedBypassed);

    if (!kvSaved) {
      memoryCache[normalizedOriginal] = normalizedBypassed;
      memoryStats.total += 1;
      memoryStats.recent.unshift({
        original: normalizedOriginal,
        bypassed: normalizedBypassed,
        timestamp: Date.now(),
      });
      memoryStats.recent = memoryStats.recent.slice(0, 50);
    }

    return res.status(200).json({
      success: true,
      message: kvSaved ? 'Saved to Vercel KV cache' : 'Saved to in-memory fallback cache',
      backend: kvSaved ? 'vercel-kv' : 'memory',
    });
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
}
