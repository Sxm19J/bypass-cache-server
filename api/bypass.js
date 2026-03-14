export default async function handler(req, res) {
    // 1. Setup CORS (allows your webpage to talk to this API)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // 3. Get the URL from the request body
    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // 4. API configuration - THIS IS THE EXTERNAL API
    const EXTERNAL_API_URL = 'https://api.bypass.tools/api/v1/bypass/direct';
    const API_KEY = 'bt_e3c57954e8be9b2d0f0a85abcc58e0f32ef787444b396b60';

    try {
        console.log(`Sending request to external API for: ${url}`);

        // 5. Make the request to the EXTERNAL bypass.tools API
        const externalResponse = await fetch(EXTERNAL_API_URL, {
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

        // 6. Get the response from the external API
        const data = await externalResponse.json();
        console.log('External API response:', data);

        // 7. Send that response back to your webpage
        if (data.status === 'success' && data.result) {
            return res.status(200).json(data);
        } else {
            // Forward the error from the external API
            return res.status(400).json({
                status: 'error',
                error: data.message || 'External API failed to bypass link',
                details: data
            });
        }
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({
            status: 'error',
            error: 'Server error: ' + error.message
        });
    }
}
