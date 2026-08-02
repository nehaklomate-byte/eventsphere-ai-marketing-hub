// Path: public/sw.js
//
// Kept deliberately minimal. Its only real job is to satisfy Chrome's
// "installable" requirement (manifest + HTTPS + a service worker with a
// fetch handler). It does NOT cache API calls, auth requests, or any
// per-user dashboard data — those must always hit the network, since
// every role (worker/vendor/venue owner/customer) sees different,
// frequently-changing data. Only a few static, public assets are
// cached, and only as a fallback if the network is unreachable.

const CACHE_NAME = "eventorbit-shell-v1";
const PRECACHE_URLS = ["/favicon.png", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
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
  const { request } = event;
  if (request.method !== "GET") return; // never touch POST/PUT/etc (auth, mutations)

  const url = new URL(request.url);
  if (!PRECACHE_URLS.includes(url.pathname)) return; // everything else: always network

  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
