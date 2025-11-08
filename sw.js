const CACHE_NAME = 'Test-v4.4.4-offline';
const VERSION = '4.4.4';

// Tutti i file LOCALI (zero dipendenze esterne tranne Font Awesome – ma cachiamo anche i font!)
const urlsToCache = [
  // Pagine principali
  '/Test/',
  '/Test/index.html',
  '/Test/edit.html',
  '/Test/info.html',
  '/Test/informazioni.html',
  '/Test/scarica.html',
  '/Test/download.html',
  '/Test/privacy-policy.html',
  '/Test/cookie-policy.html',

  // CSS
  '/Test/css/style.css',
  '/Test/css/policy.css',

  // JS (con Argon2id locale!)
  '/Test/js/crypto.js',
  '/Test/js/app.js',
  '/Test/js/edit.js',
  '/Test/js/home.js',
  '/Test/js/info.js',
  '/Test/js/utils.js',

  // Lib Argon2id (100% offline)
  '/Test/lib/argon2.min.js',
  '/Test/lib/argon2.wasm',

  // Assets
  '/Test/assets/Test-logo.png',
  '/Test/assets/favicon.ico',
  '/Test/assets/favicon.svg',
  '/Test/assets/apple-touch-icon.png',
  '/Test/assets/web-app-manifest-192x192.png',
  '/Test/assets/web-app-manifest-512x512.png',

  // Manifest + root files
  '/Test/manifest.json',
  '/Test/sw.js',

  // Font Awesome (caching totale – funziona offline per sempre)
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-brands-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/webfonts/fa-regular-400.woff2'
];

// Installazione – forza cache di tutto
self.addEventListener('install', event => {
  console.log('[SW] Installazione Test™ v' + VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache dei file locali + Font Awesome');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Cache fallita:', err))
  );
});

// Attivazione – elimina vecchie cache
self.addEventListener('activate', event => {
  console.log('[SW] Attivazione Test™ v' + VERSION);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminazione vecchia cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch – strategia "cache first, fallback index"
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignora richieste non GET o non HTTP/HTTPS
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // File in cache → restituisci subito
          return cachedResponse;
        }

        // Non in cache → prova rete (solo se online)
        return fetch(request)
          .then(networkResponse => {
            if (!networkResponse || !networkResponse.ok) {
              throw new Error('Network error');
            }

            // Cache solo risposte valide
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });

            return networkResponse;
          })
          .catch(() => {
            // Offline + non in cache → fallback alla home
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('/Test/index.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Aggiornamento automatico quando c'è nuova versione
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Notifica aggiornamento (opzionale – puoi usarla con toast)
self.addEventListener('controllerchange', () => {
  console.log('[SW] Test™ aggiornato alla v' + VERSION);
  // Puoi inviare messaggio al client per mostrare toast
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ type: 'UPDATE_READY' }));
  });
});