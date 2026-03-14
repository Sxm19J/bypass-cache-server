export default function handler(req, res) {
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Bypass Cache</title>
            <style>
                body { background: #0b0e14; color: white; font-family: sans-serif; padding: 20px; }
                .container { max-width: 1200px; margin: 0 auto; }
                .stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; margin: 20px 0; }
                .card { background: #1a1f2e; padding: 20px; border-radius: 10px; }
                .value { font-size: 2em; color: #3b82f6; }
                .recent { background: #1a1f2e; padding: 20px; border-radius: 10px; }
                .entry { padding: 10px; border-bottom: 1px solid #333; word-break: break-all; }
                .original { color: #94a3b8; font-size: 0.9em; }
                .bypassed { color: #10b981; font-size: 1em; margin: 5px 0; }
                .time { color: #64748b; font-size: 0.8em; }
                button { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🚀 Bypass Cache</h1>
                <button onclick="loadStats()">Refresh</button>
                <div class="stats" id="stats"></div>
                <div class="recent" id="recent"></div>
            </div>
            <script>
                async function loadStats() {
                    const res = await fetch('/api/cache.js?action=stats');
                    const data = await res.json();
                    
                    document.getElementById('stats').innerHTML = \`
                        <div class="card"><div class="value">\${data.totalEntries}</div><div>Total Cached</div></div>
                    \`;
                    
                    if (data.recent && data.recent.length) {
                        document.getElementById('recent').innerHTML = '<h3>Recent Mappings</h3>' + 
                            data.recent.map(item => \`
                                <div class="entry">
                                    <div class="original">🔗 \${item.original}</div>
                                    <div class="bypassed">✅ \${item.bypassed}</div>
                                    <div class="time">\${new Date(item.timestamp).toLocaleString()}</div>
                                </div>
                            \`).join('');
                    } else {
                        document.getElementById('recent').innerHTML = '<h3>Recent Mappings</h3><div class="entry">No mappings yet</div>';
                    }
                }
                loadStats();
                setInterval(loadStats, 5000);
            </script>
        </body>
        </html>
    `);
}
