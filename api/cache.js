// Simple cache that works
let cache = {};
let recent = [];

export default function handler(req, res) {
    // Enable CORS
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

        // Stats
        if (action === 'stats') {
            return res.status(200).json({
                totalEntries: Object.keys(cache).length,
                recent: recent.slice(0, 20)
            });
        }

        // Lookup URL
        if (url) {
            const decoded = decodeURIComponent(url);
            if (cache[decoded]) {
                return res.status(200).json({ success: true, url: cache[decoded] });
            }
            return res.status(404).json({ success: false });
        }
    }

    // POST request
    if (req.method === 'POST') {
        const { original, bypassed } = req.body;
        
        if (original && bypassed) {
            cache[original] = bypassed;
            recent.unshift({ original, bypassed, timestamp: Date.now() });
            recent = recent.slice(0, 100);
            console.log('Cached:', original, '->', bypassed);
            return res.status(200).json({ success: true });
        }
    }

    res.status(400).json({ error: 'Invalid request' });
}
