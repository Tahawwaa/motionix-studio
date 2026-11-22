const endpoints = [
  ["Studio", "http://127.0.0.1:5173"],
  ["Backend", "http://127.0.0.1:8000/api/health"],
  ["Renderer", "http://127.0.0.1:8001/worker/health"],
];
for (const [label, url] of endpoints) {
  try {
    const r = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers:
        process.env.NOVA_API_TOKEN && label !== "Studio"
          ? { Authorization: `Bearer ${process.env.NOVA_API_TOKEN}` }
          : {},
    });
    console.log(`${label}: ${r.ok ? "ready" : "HTTP " + r.status}`);
    if (label === "Renderer" && r.ok) {
      const h = await r.json();
      console.log(JSON.stringify(h, null, 2));
    }
    if (!r.ok) process.exitCode = 1;
  } catch {
    console.log(`${label}: unavailable — run npm run dev`);
    process.exitCode = 1;
  }
}
export {};
