const CACHE_NAME = 'communityguard-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json'
];

// Install event - caching the static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell...');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - cache-first with network fallback for static shell, network-only for APIs
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Exclude Firebase, API routes, and Firestore WebSocket/HTTP channels from being cached
  if (
    url.pathname.startsWith('/api') || 
    url.hostname.includes('firestore.googleapis.com') || 
    url.hostname.includes('firebase')
  ) {
    return; // Let the browser handle standard API requests directly
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // 1. If we have a cached response, return it immediately, but update it in the background if online
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
        }).catch(() => { /* Ignore background network errors */ });
        
        return cachedResponse;
      }

      // 2. If it is not in cache, fetch it from the network and dynamically cache it
      return fetch(event.request).then((networkResponse) => {
        // Only cache valid successful GET responses
        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // 3. Fallback when network is completely offline and asset is not in cache
        if (event.request.mode === 'navigate') {
          return caches.match('/').then((fallbackResponse) => {
            return fallbackResponse || caches.match('/index.html');
          });
        }
        
        // Return a proper offline Response object instead of undefined to prevent TypeError: Failed to convert value to 'Response'
        return new Response('Offline resource not cached', {
          status: 503,
          statusText: 'Service Unavailable (Offline)'
        });
      });
    })
  );
});
