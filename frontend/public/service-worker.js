/* Me v2 service worker — instant shell loads, network-first for everything
 * dynamic. API calls are never cached (the offline log queue in the app
 * handles writes); static assets are cached for offline shell startup. */

const CACHE_NAME = 'mev2-shell-v1';
const SHELL_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Same-origin static only; API (different origin / non-static) passes through.
  if (url.origin !== self.location.origin) return;

  const isStatic = url.pathname.startsWith('/static/') ||
    /\.(js|css|png|jpg|svg|ico|woff2?)$/.test(url.pathname);

  if (isStatic) {
    // Cache-first for fingerprinted assets.
    event.respondWith(
      caches.match(request).then((cached) => cached ||
        fetch(request).then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        }))
    );
  } else {
    // Navigation: network-first, fall back to cached shell when offline.
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
  }
});
