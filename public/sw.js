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
      .catch(async () => {
        // Bug fix: caches.match() can resolve to `undefined` (nothing was
        // ever cached for this URL, e.g. it failed during install, or this
        // is the very first load and the network just failed). Returning
        // `undefined` from respondWith() throws "Failed to convert value
        // to 'Response'" in the browser console — this always returns a
        // real Response now, even as a last-resort fallback.
        const cached = await caches.match(request);
        return cached || new Response("", { status: 504, statusText: "Offline" });
      })
  );
});

// ---------------------------------------------------------------
// Push notifications — shows a real OS-level notification even
// when the app/tab is closed (chat messages, task updates, admin
// broadcasts). The server (send-push edge function) sends a JSON
// payload: { title, body, url }.
// ---------------------------------------------------------------
self.addEventListener("push", (event) => {
  let data = { title: "EventOrbit Nova", body: "You have a new update.", url: "/" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // ignore malformed payloads, fall back to defaults
  }
  event.waitUntil(
    self.registration
      .showNotification(data.title, {
        body: data.body,
        icon: "/icon-192.png",
        badge: "/favicon.png",
        data: { url: data.url || "/" },
      })
      .catch(() => {})
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            try {
              if ("navigate" in client) await client.navigate(targetUrl);
            } catch {
              // some browsers don't support navigate() on an existing client — focusing is still fine
            }
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
      .catch(() => {})
  );
});
