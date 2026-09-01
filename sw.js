/**
 * Flowscribe Service Worker
 * Version: 2.2.0
 * Provides offline caching and fast startup for Flowscribe PWA
 */

const CACHE_NAME = 'flowscribe-v2.2.0';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './skrivemaskine.html',
  './terminal.html',
  './styles.css',
  './focus-timer.css',
  './typewriter.css',
  './terminal.css',
  './app.js',
  './focus-timer.js',
  './typewriter.js',
  './terminal.js',
  './js/sounds-data.js',
  './js/pwa.js',
  './js/core/export.js',
  './js/core/formatter.js',
  './js/core/markdown.js',
  './js/core/stats.js',
  './js/core/storage.js',
  './vendor/feather.min.js',
  './vendor/marked.min.js',
  './vendor/mermaid.min.js',
  './vendor/purify.min.js',
  './sounds/backspace.wav',
  './sounds/enter.wav',
  './sounds/key1.wav',
  './sounds/key2.wav',
  './sounds/space.wav',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icons/apple-touch-icon.png',
  './favicon.ico',
  './manifest.json'
];

// Install: Cache all core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Stale-While-Revalidate strategy for offline reliability
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Ignore cross-origin non-cacheable schemes (like chrome-extension://)
  if (!url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Fetch fresh version in background and update cache
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and requesting navigation, fallback to cached index.html if match fails
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });

      // Return cached response immediately if found, else wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
