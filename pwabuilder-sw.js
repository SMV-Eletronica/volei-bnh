importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.6.0/workbox-sw.js');

const MEDIA_CACHE = 'volei-media-online-only-v1';
const OFFLINE_PAGE = 'offline.html';

// ===== INSTALAÇÃO ===== //
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('offline-cache').then((cache) => {
      return cache.addAll([OFFLINE_PAGE]);
    })
  );
  console.log('Service Worker instalado!');
});

// ===== ESTRATÉGIA DE MÍDIA (cache só para online) ===== //
workbox.routing.registerRoute(
  ({ url }) => 
    url.hostname.includes('firebasestorage.googleapis.com') || 
    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov'].includes(url.pathname.split('.').pop()?.toLowerCase()),
  new workbox.strategies.CacheFirst({
    cacheName: MEDIA_CACHE,
    plugins: [
      new workbox.cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  })
);

// ===== PÁGINAS (redireciona para offline se desconectado) ===== //
workbox.routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new workbox.strategies.NetworkOnly({
    plugins: [
      {
        handlerDidError: async () => {
          return await caches.match(OFFLINE_PAGE);
        }
      }
    ]
  })
);

// ===== DADOS DINÂMICOS (Firebase - sem cache) ===== //
workbox.routing.registerRoute(
  ({ url }) => url.hostname.includes('firebaseio.com'),
  new workbox.strategies.NetworkOnly()
);

// ===== NOTIFICAÇÕES PUSH ===== //
self.addEventListener('push', (event) => {
  const payload = event.data?.json() || {};
  const title = payload.notification?.title || 'Vôlei BNH';
  const options = {
    body: payload.notification?.body || 'Novas atualizações disponíveis!',
    icon: payload.notification?.icon || '/android/android-launchericon-192-192.png',
    data: { url: payload.notification?.url || '/' },
    vibrate: [200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      const client = windowClients.find(c => c.url === urlToOpen);
      return client ? client.focus() : clients.openWindow(urlToOpen);
    })
  );
});

// ===== LIMPEZA DE CACHE ===== //
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!['offline-cache', MEDIA_CACHE].includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  console.log('Service Worker ativado e caches antigos removidos!');
});

// ===== ATUALIZAÇÃO ===== //
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    console.log('Service Worker atualizado!');
  }
});
