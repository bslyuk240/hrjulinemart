const CACHE_NAME = 'julinemart-hr-v5';
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

// ── Push Notifications ─────────────────────────────────────────────────────
// Handles FCM Web Push payloads when the app is in the background / closed.
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (_) {
    payload = { notification: { title: 'JulineMart HR', body: event.data.text() } };
  }

  const title   = payload.notification?.title || 'JulineMart HR';
  const body    = payload.notification?.body  || '';
  const data    = payload.data || {};
  const options = {
    body,
    icon:               '/icon-192x192.png',
    badge:              '/icon-192x192.png',
    tag:                data.type || 'hr-notification',
    data,
    requireInteraction: false,
    vibrate:            [150, 50, 150],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Open / focus the app when the user taps a notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow(link);
      })
  );
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
