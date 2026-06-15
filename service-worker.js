const CACHE_NAME = 'bsf-biomanager-cache-v1.2';
const ASSETS_TO_CACHE = [
  './index.html',
  './style.css',
  './app.js',
  './components.js',
  './config.js',
  './google-api.js',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// Install Event - Precache App Shell
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Precaching static assets');
      // Use standard catch-all to prevent install failure if some resource is temporarily offline
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[Service Worker] Cache addAll warning: ', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate Event - Clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Serve static assets cache-first, allow API calls network-only
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Exclude third-party Google APIs, OAuth2, and Apps Script backend calls from SW caching
  const isDynamicApi = url.hostname.includes('script.google.com') || 
                       url.hostname.includes('googleapis.com') || 
                       url.hostname.includes('google.com') || 
                       url.pathname.includes('/macros/s/');
                       
  if (isDynamicApi || e.request.method !== 'GET') {
    return; // Pass through directly to network (Network-Only)
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache first, but fetch update in background (Stale-While-Revalidate)
        fetch(e.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, networkResponse);
            });
          }
        }).catch(() => { /* Silent fallback when offline */ });
        return cachedResponse;
      }
      
      return fetch(e.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, responseToCache);
        });
        
        return networkResponse;
      });
    })
  );
});
