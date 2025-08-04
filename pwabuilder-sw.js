importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.6.0/workbox-sw.js');

const NAVIGATION_CACHE = 'volei-bnh-navigation-v5';
const MEDIA_CACHE = 'volei-bnh-media-v5';
const offlineFallbackPage = 'offline.html';

// Cache de imagens e vídeos
workbox.routing.registerRoute(
  ({ request }) => request.destination === 'image' || request.destination === 'video',
  new workbox.strategies.CacheFirst({
    cacheName: MEDIA_CACHE,
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 7 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Cache de navegação
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: NAVIGATION_CACHE,
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Excluir requisições de API do cache
workbox.routing.registerRoute(
  ({ url }) => url.pathname.includes('/api/'),
  new workbox.strategies.NetworkOnly()
);

// Fallback para offline
workbox.routing.setCatchHandler(({ event }) => {
  if (event.request.mode === 'navigate') {
    return caches.match(offlineFallbackPage);
  }
  return Response.error();
});

// Pré-cache de arquivos estáticos
self.addEventListener('install', async (event) => {
  event.waitUntil(
    caches.open(NAVIGATION_CACHE).then((cache) => {
      return cache.addAll([
        offlineFallbackPage,
        'windows11/Square44x44Logo.altform-unplated_targetsize-16.png',
        'windows11/Square44x44Logo.altform-unplated_targetsize-32.png',
        'android/android-launchericon-192-192.png',
        'android/android-launchericon-512-512.png',
        'ios/192.png',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.6.0/css/all.min.css',
        'history.css',
        'https://cdn.jsdelivr.net/npm/luxon@3.5.0/build/global/luxon.min.js',
        'https://cdn.jsdelivr.net/npm/sweetalert2@11.12.4/dist/sweetalert2.min.js'
      ]).catch((error) => {
        console.error('Pré-cache falhou:', error);
      });
    })
  );
});

// Limpar caches antigos
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [NAVIGATION_CACHE, MEDIA_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log(`Deletando cache antigo: ${cacheName}`);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      )
    )
  );
});

// Skip Waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('Service Worker: skipWaiting acionado');
    self.skipWaiting();
  }
});

// Notificações push
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.warn('Push recebido sem dados');
    return;
  }
  const payload = event.data.json() || {};
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

// Clique em notificações
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';
  console.log(`Abrindo URL: ${urlToOpen}`);
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const client = windowClients.find((c) => c.url === urlToOpen && 'focus' in c);
      return client ? client.focus() : clients.openWindow(urlToOpen);
    })
  );
});
