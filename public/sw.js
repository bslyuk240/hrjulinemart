const CACHE_NAME = 'julinemart-hr-v3';
const URLS_TO_CACHE = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Claim clients immediately so updated SW controls pages
      self.clients.claim(),
      // Clean up old caches
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  );
});

// Allow page to trigger immediate activation of a waiting worker
self.addEventListener('message', (event) => {
  if (event && event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Prefer network for navigation (index.html), fallback to cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Always try network for navigation requests (HTML shell)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy));
        return response;
      }).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Don’t cache cross‑origin API calls (e.g., Supabase). Use network-first, no cache write.
  const url = new URL(request.url);
  const isCrossOrigin = location.origin !== url.origin;
  const isSupabase = url.hostname.includes('supabase.co');
  const isApiLike = url.pathname.includes('/rest/v1') || url.pathname.includes('/storage/v1');
  if (request.method === 'GET' && (isCrossOrigin && (isSupabase || isApiLike))) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first for same-origin CSS/JS/fonts/images
  if (request.method === 'GET' && !isCrossOrigin) {
    const accept = request.headers.get('accept') || '';
    const isStatic =
      accept.includes('text/css') ||
      accept.includes('text/javascript') ||
      url.pathname.match(/\.(css|js|woff2?|ttf|eot|png|jpg|jpeg|gif|svg|ico)$/i);

    if (isStatic) {
      event.respondWith(
        caches.match(request).then((cached) =>
          cached || fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            return response;
          })
        )
      );
      return;
    }
  }

  // Default: pass-through
});
