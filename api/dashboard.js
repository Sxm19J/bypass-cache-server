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
    async function loadStats() {
      const el = document.getElementById('stats');
      try {
        const response = await fetch('/api/cache?action=stats');
        const contentType = response.headers.get('content-type') || '';
        const raw = await response.text();

        if (!response.ok) {
          el.textContent = 'Stats request failed (' + response.status + ')\\n\\n' + raw;
          return;
        }

        if (!contentType.includes('application/json')) {
          el.textContent = 'Expected JSON but got: ' + contentType + '\\n\\n' + raw;
          return;
        }

        const data = JSON.parse(raw);
        el.textContent = JSON.stringify(data, null, 2);
      } catch (e) {
        el.textContent = 'Error loading stats: ' + String(e);
      }
    }

    loadStats();
  </script>
</body>
</html>`);
}
