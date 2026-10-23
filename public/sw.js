// Minimal service worker: makes CabSy installable and shows a friendly page
// when a navigation fails offline. It deliberately caches nothing — all data
// is per-user and session-gated, so stale copies would be wrong.

const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CabSy · Offline</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#131319;color:#ececf4;text-align:center;padding:24px}
button{margin-top:16px;padding:10px 22px;border:0;border-radius:999px;background:#8f88ff;color:#14121f;font-weight:600;font-size:15px}</style>
</head><body><div><h1 style="font-size:20px">You're offline</h1>
<p style="color:#a3a3ba">CabSy needs a connection. Check your network and try again.</p>
<button onclick="location.reload()">Retry</button></div></body></html>`;

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html" } })
    )
  );
});
