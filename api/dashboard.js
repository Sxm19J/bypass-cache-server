export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <title>Bypass Cache</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0b0e14;
      color: #fff;
      margin: 0;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #3b82f6;
      margin-bottom: 30px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
    }
    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #3b82f6;
      margin: 10px 0;
    }
    .stat-label {
      color: #94a3b8;
    }
    .recent-list {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
    }
    .recent-item {
      padding: 15px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .recent-item:last-child {
      border-bottom: none;
    }
    .original {
      color: #94a3b8;
      font-size: 0.8rem;
      word-break: break-all;
    }
    .bypassed {
      color: #10b981;
      font-size: 0.9rem;
      font-weight: 500;
      word-break: break-all;
      margin: 5px 0;
    }
    .timestamp {
      color: #64748b;
      font-size: 0.75rem;
    }
    .refresh-btn {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      margin-bottom: 20px;
    }
    .refresh-btn:hover {
      background: #2563eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚀 Bypass Cache</h1>
    
    <button class="refresh-btn" onclick="loadStats()">🔄 Refresh</button>
    
    <div class="stats-grid" id="stats">
      <div class="stat-card">
        <div class="stat-label">Total Entries</div>
        <div class="stat-value" id="totalEntries">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Cache Hits</div>
        <div class="stat-value" id="hits">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Cache Misses</div>
        <div class="stat-value" id="misses">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Hit Rate</div>
        <div class="stat-value" id="hitRate">-</div>
      </div>
    </div>

    <div class="recent-list">
      <h3 style="margin-top: 0;">Recent Mappings</h3>
      <div id="recent"></div>
    </div>
  </div>

  <script>
    async function loadStats() {
      try {
        const response = await fetch('/api/cache.js?action=stats');
        const data = await response.json();
        
        document.getElementById('totalEntries').textContent = data.totalEntries || 0;
        document.getElementById('hits').textContent = data.hits || 0;
        document.getElementById('misses').textContent = data.misses || 0;
        
        const total = (data.hits + data.misses) || 1;
        const hitRate = ((data.hits / total) * 100).toFixed(1);
        document.getElementById('hitRate').textContent = hitRate + '%';
        
        const recentDiv = document.getElementById('recent');
        if (data.recent && data.recent.length > 0) {
          recentDiv.innerHTML = data.recent.map(item => {
            const date = new Date(item.timestamp);
            return \`
              <div class="recent-item">
                <div class="original">🔗 \${item.original}</div>
                <div class="bypassed">✅ \${item.bypassed}</div>
                <div class="timestamp">\${date.toLocaleString()}</div>
              </div>
            \`;
          }).join('');
        } else {
          recentDiv.innerHTML = '<div class="recent-item">No mappings yet</div>';
        }
      } catch (error) {
        console.error('Error:', error);
        document.getElementById('recent').innerHTML = '<div class="recent-item">Error loading stats</div>';
      }
    }

    loadStats();
    setInterval(loadStats, 5000);
  </script>
</body>
</html>`);
}
