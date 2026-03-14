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
    fetch('/api/cache?action=stats')
      .then((r) => r.json())
      .then((data) => {
        document.getElementById('stats').textContent = JSON.stringify(data, null, 2);
      })
      .catch((e) => {
        document.getElementById('stats').textContent = String(e);
      });
  </script>
</body>
</html>`);
}
