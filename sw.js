const CACHE_NAME = 'Test-cache-v2.5';
const urlsToCache = [
  'index.html?v=2.5',
  'edit.html?v=2.5',
  'privacy-policy.html?v=2.5',
  'cookie-policy.html?v=2.5',
  'info.html?v=2.5',
  'informazioni.html?v=2.5',
  'download.html?v=2.5',
  'scarica.html?v=2.5',
  'css/style.css?v=2.5',
  'css/policy.css?v=2.5',
  '/Test/js/crypto.js?v=2.5',
  '/Test/js/edit.js?v=2.5',
  '/Test/js/home.js?v=2.5',
  '/Test/js/info.js?v=2.5',
  '/Test/js/app.js?v=2.5',
  '/Test/js/utils.js?v=2.5',
  '/Test/assets/apple-touch-icon.png',
  '/Test/assets/Test-logo.png',
  '/Test/assets/favicon-96x96.png',
  '/Test/assets/favicon.ico',
  '/Test/assets/favicon.svg',
  '/Test/assets/web-app-manifest-192x192.png',
  '/Test/assets/web-app-manifest-512x512.png',
  'manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-brands-400.woff2'
];

// Install event: Cache resources and skip waiting
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(error => console.error('Service Worker: Cache failed:', error))
  );
  self.skipWaiting();
});

// Activate event: Clean up old caches and claim clients
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: Serve from cache or fetch from network if online
self.addEventListener('fetch', event => {
  console.log('Service Worker: Fetching', event.request.url);
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If resource is in cache, return it immediately
        if (cachedResponse) {
          // If online, try to fetch a fresh version in the background
          if (navigator.onLine) {
            fetchAndUpdateCache(event.request);
          }
          return cachedResponse;
        }
        // If not in cache and online, fetch from network and cache
        if (navigator.onLine) {
          return fetchAndUpdateCache(event.request);
        }
        // If offline and not in cache, return fallback
        return caches.match('index.html?v=2.5');
      })
      .catch(error => {
        console.error('Fetch failed:', error);
        return caches.match('index.html?v=2.5');
      })
  );
});

// Function to fetch from network and update cache
async function fetchAndUpdateCache(request) {
  try {
    const networkResponse = await fetch(request);
    // Only cache valid responses (status 200) for GET requests
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
      console.log('Service Worker: Updated cache for', request.url);
    }
    return networkResponse;
  } catch (error) {
    console.error('Network fetch failed:', error);
    throw error;
  }
}

self.addEventListener('controllerchange', () => {
  console.log('Service Worker: New controller activated');
  showMessage('Test™ update!', 'success');
});