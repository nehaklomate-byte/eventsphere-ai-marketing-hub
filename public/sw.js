// Minimal service worker for PWA installability + basic offline resilience.
// Deliberately simple: cache-first for same-origin static assets (images,
// fonts, css/js chunks), always network-first for everything else
// (HTML pages, API/Supabase calls) so users never see stale data.
const CACHE_NAME = "eventorbit-static-v1";
const STATIC_EXTENSIONS = [".png", ".jpg", ".jpeg", ".svg", ".webp", ".css", ".js", ".woff", ".woff2"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticAsset = isSameOrigin && STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));

  if (!isStaticAsset) return; // let the browser handle everything else normally (network-first by default)

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req);
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
  );
});
