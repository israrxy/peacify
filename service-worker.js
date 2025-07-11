const CACHE_NAME = 'peacify-music-v1.0';

// A list of essential files to cache on first visit.
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/saved.html',
  '/playlist.html',
  '/history.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/webfonts/fa-solid-900.woff2'
];

// The install event runs when the service worker is first installed.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      // Use addAll() which is atomic: if one file fails, the whole operation fails.
      return cache.addAll(APP_SHELL_FILES);
    }).catch(error => {
      console.error('[Service Worker] Caching failed:', error);
    })
  );
});

// The fetch event intercepts all network requests.
self.addEventListener('fetch', (event) => {
  // For navigation requests (loading HTML pages), use a Network First strategy.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If the fetch is successful, clone the response and cache it.
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If the network fails, serve the cached page from the service worker.
          return caches.match(event.request);
        })
    );
  } else {
    // For all other requests (CSS, fonts, etc.), use a "Cache First" strategy.
    // This is faster as it serves from cache immediately if available.
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});

// The activate event is used to clean up old caches.
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});