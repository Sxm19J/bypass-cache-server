export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Ensure body exists
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { url } = body || {};

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    const EXTERNAL_API_URL = "https://api.bypass.tools/api/v1/bypass/direct";
    const API_KEY = "bt_e3c57954e8be9b2d0f0a85abcc58e0f32ef787444b396b60";

    const externalResponse = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        refresh: false,
      }),
    });

    // Safely parse response
    let data;
    try {
      data = await externalResponse.json();
    } catch {
      const text = await externalResponse.text();
      return res.status(500).json({
        error: "Invalid JSON returned from external API",
        raw: text,
      });
    }

    if (!externalResponse.ok) {
      return res.status(externalResponse.status).json({
        error: "External API error",
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      error: "Server error",
      message: error.message,
    });
  }
}
