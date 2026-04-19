const CACHE_NAME = "subway-runner-v5-" + new Date().toISOString().slice(0, 10);

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api/") || url.hostname.includes("clerk")) return;

  const isHTML =
    event.request.mode === "navigate" ||
    (event.request.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(
      fetch(event.request).catch(
        () =>
          new Response(
            "<!doctype html><meta http-equiv='refresh' content='2'><body style='background:#060614;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh'>Loading…</body>",
            { headers: { "content-type": "text/html" } }
          )
      )
    );
  }
});
