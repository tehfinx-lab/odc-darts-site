// ODC Service Worker — enables installability + fast repeat loads.
// Simple, safe caching: app shell cached, data always fresh from network.

const CACHE = "odc-v1";
const SHELL = [
  "/",
  "/odc-logo.png",
  "/icon-192.png",
  "/icon-512.png",
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy:
//  - API / league-data: ALWAYS network (never serve stale scores/tables)
//  - everything else: network-first, fall back to cache when offline
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache the live data API
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request).catch(() => new Response("{}", { headers: { "Content-Type": "application/json" } })));
    return;
  }

  event.respondWith(
    fetch(request)
      .then((res) => {
        // stash a copy of successful navigations/assets
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  );
});
