export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // API configuration
    const API_URL = 'https://api.bypass.tools/api/v1/bypass/direct';
    const API_KEY = 'bt_e3c57954e8be9b2d0f0a85abcc58e0f32ef787444b396b60';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'x-api-key': API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                url: url,
                refresh: false
            })
        });

        const data = await response.json();

        if (data.status === 'success' && data.result) {
            return res.status(200).json({
                status: 'success',
                result: data.result,
                cached: data.cached || false,
                processTime: data.processTime
            });
        } else {
            return res.status(400).json({
                status: 'error',
                error: 'Failed to bypass link'
            });
        }
    } catch (error) {
        console.error('Bypass error:', error);
        return res.status(500).json({
            status: 'error',
            error: 'Server error'
        });
    }
}
