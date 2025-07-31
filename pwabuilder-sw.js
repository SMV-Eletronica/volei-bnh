importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const CACHE = 'volei-bnh-offline-v4';
const offlineFallbackPage = 'offline.html';

// Cache de imagens e vídeos
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'video',
  new workbox.strategies.CacheFirst({
    cacheName: CACHE,
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100, // Limite de itens no cache
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  })
);

// Cache de thumbnails do YouTube
workbox.routing.registerRoute(
  /https:\/\/img\.youtube\.com\/vi\/.*\/mqdefault\.jpg/,
  new workbox.strategies.CacheFirst({
    cacheName: CACHE,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);

// Cache de navegação
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: CACHE,
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// Fallback para offline
workbox.routing.setCatchHandler(({ event }) => {
  if (event.request.mode === 'navigate') {
    return caches.match(offlineFallbackPage);
  }
  return Response.error();
});

// Restante do seu Service Worker (eventos push, notificationclick, etc.)
self.addEventListener('install', async (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll([
        offlineFallbackPage,
        'windows11/Square44x44Logo.altform-unplated_targetsize-16.png',
        'windows11/Square44x44Logo.altform-unplated_targetsize-32.png',
        'android/android-launchericon-192-192.png',
        'android/android-launchericon-512-512.png',
        'ios/192.png',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
        '/history.css',
        'https://moment.github.io/luxon/global/luxon.min.js',
        'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.js'
      ]);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  const payload = event.data?.json() || {};
  const title = payload.notification?.title || 'Novo alerta!';
  const options = {
    body: payload.notification?.body || 'Mensagem importante.',
    icon: payload.notification?.icon || '/icon-192x192.png',
    badge: '/badge.png',
    vibrate: [200, 100, 200],
    data: { url: payload.notification?.url || '/' },
    requireInteraction: true
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const client = windowClients.find((c) => c.url === urlToOpen && 'focus' in c);
      return client ? client.focus() : clients.openWindow(urlToOpen);
    })
  );
});
