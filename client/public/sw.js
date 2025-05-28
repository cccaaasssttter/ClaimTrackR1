const CACHE_NAME = 'claimspro-v1';
const STATIC_CACHE = 'claimspro-static-v1';
const DATA_CACHE = 'claimspro-data-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/static/js/bundle.js',
  '/static/css/main.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto+Mono:wght@400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\//
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static files');
      return cache.addAll(STATIC_FILES.map(url => new Request(url, { credentials: 'same-origin' })));
    }).catch((error) => {
      console.error('[SW] Failed to cache static files:', error);
    })
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DATA_CACHE && cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // API requests - Network First with Cache Fallback
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(
      networkFirstWithCacheFallback(request, DATA_CACHE)
    );
    return;
  }
  
  // Static assets - Cache First with Network Fallback
  if (isStaticAsset(url)) {
    event.respondWith(
      cacheFirstWithNetworkFallback(request, STATIC_CACHE)
    );
    return;
  }
  
  // App shell - Cache First with Network Fallback
  if (url.origin === location.origin) {
    event.respondWith(
      cacheFirstWithNetworkFallback(request, STATIC_CACHE)
    );
    return;
  }
  
  // External resources - Network First
  event.respondWith(
    networkFirstWithCacheFallback(request, CACHE_NAME)
  );
});

// Strategy: Network First with Cache Fallback
async function networkFirstWithCacheFallback(request, cacheName) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // If successful, update cache and return response
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's an API request and both network and cache failed, return offline response
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(new URL(request.url).pathname))) {
      return new Response(
        JSON.stringify({ 
          error: 'Offline', 
          message: 'This feature requires an internet connection' 
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // For navigation requests, return cached app shell
    if (request.mode === 'navigate') {
      return caches.match('/');
    }
    
    throw error;
  }
}

// Strategy: Cache First with Network Fallback
async function cacheFirstWithNetworkFallback(request, cacheName) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    // Cache miss, try network
    const networkResponse = await fetch(request);
    
    // Update cache for future requests
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Both cache and network failed for:', request.url);
    
    // For navigation requests, return a basic offline page
    if (request.mode === 'navigate') {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>ClaimsPro - Offline</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                text-align: center; 
                padding: 50px; 
                background: #f5f7fa;
                color: #333;
              }
              .offline-content {
                max-width: 400px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              .icon { font-size: 48px; margin-bottom: 20px; color: #2196F3; }
              h1 { margin-bottom: 10px; }
              p { color: #666; line-height: 1.5; }
              button { 
                background: #2196F3; 
                color: white; 
                border: none; 
                padding: 12px 24px; 
                border-radius: 4px; 
                cursor: pointer;
                margin-top: 20px;
              }
              button:hover { background: #1976D2; }
            </style>
          </head>
          <body>
            <div class="offline-content">
              <div class="icon">📱</div>
              <h1>You're Offline</h1>
              <p>ClaimsPro is a Progressive Web App that works offline. However, some features may be limited without an internet connection.</p>
              <button onclick="location.reload()">Try Again</button>
            </div>
          </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    throw error;
  }
}

// Helper function to determine if a URL is a static asset
function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.woff', '.woff2', '.ttf'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-claims') {
    event.waitUntil(syncClaims());
  }
});

// Sync offline changes when connection is restored
async function syncClaims() {
  try {
    // This would sync any pending changes stored in IndexedDB
    console.log('[SW] Syncing offline claims...');
    
    // Implementation would depend on how offline changes are tracked
    // For now, just log that sync is happening
    
    // Notify all clients that sync is complete
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'SYNC_COMPLETE' });
    });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Handle push notifications (if implemented in the future)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || []
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Navigate to the app
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker registered successfully');
