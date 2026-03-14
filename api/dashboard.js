export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Bypass Cache Stats</title>
</head>
<body style="font-family: sans-serif; padding: 24px; background:#0b0e14; color:#fff;">
  <h1>Bypass Cache Stats</h1>
  <pre id="stats">Loading...</pre>
  <script>
    const statsEndpoints = ['/api/cache.js?action=stats', '/api/cache?action=stats'];

    async function loadStats() {
      const el = document.getElementById('stats');

      for (const endpoint of statsEndpoints) {
        try {
          const response = await fetch(endpoint);
          const raw = await response.text();
          const contentType = response.headers.get('content-type') || '';

          if (!response.ok) {
            continue;
          }

          if (!contentType.includes('application/json')) {
            continue;
          }

          const data = JSON.parse(raw);
          el.textContent = JSON.stringify({ endpoint, ...data }, null, 2);
          return;
        } catch (error) {
          // Try the next endpoint.
        }
      }

      el.textContent = 'Stats request failed on both /api/cache.js and /api/cache';
    }

    loadStats();
  </script>
</body>
</html>`);
}
