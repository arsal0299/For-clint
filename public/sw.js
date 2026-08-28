// Numera service worker — deliberately conservative:
//   - NEVER caches /api/* (wallet balances, OTPs, orders must always be fresh)
//   - Caches hashed build assets (/assets/*) cache-first (they're immutable per deploy)
//   - Navigations (page loads) go network-first, falling back to cache only when offline
const CACHE_NAME = "numera-static-v1";

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
  const { request } = event;
  const url = new URL(request.url);

  // Never touch API calls — always go straight to the network.
  if (url.pathname.startsWith("/api/")) return;

  // Only handle same-origin GET requests from here on.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Page navigations: network-first so a fresh deploy is always picked up;
  // fall back to a cached shell only when truly offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Hashed build assets and icons: cache-first (safe — filenames change per build).
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return res;
          })
      )
    );
  }
});
