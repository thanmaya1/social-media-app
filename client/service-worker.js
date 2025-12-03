const CACHE_NAME = 'smapp-shell-v2';
const PRECACHE_URLS = ['/', '/index.html', '/offline.html', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png', '/src/styles.css'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// Support a message from the page to skip waiting and activate new SW immediately
self.addEventListener('message', (event) => {
  try {
    const data = event.data || {};
    if (data && data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  } catch (e) {
    // ignore
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  // For images and static assets, try cache-first then network
  if (request.destination === 'image' || request.url.includes('/uploads/') || request.url.includes('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        return res;
      }).catch(() => caches.match('/icons/icon-192.png')))
    );
    return;
  }

  // Default: network-first for API and navigation, fallback to cache
  event.respondWith(
    fetch(request)
      .then((resp) => {
        // put a copy in cache for navigation fallback
        if (request.destination === '' || request.mode === 'navigate') {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy)).catch(() => {});
        }
        return resp;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // for navigation requests fallback to offline page
          if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/offline.html');
          }
          return caches.match('/');
        })
      )
  );
});
