// Carrega a biblioteca Workbox (versão atualizada para 6.5.4)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

// Define o nome do cache e a página de fallback para modo offline
const CACHE = 'volei-bnh-offline-v4';
const offlineFallbackPage = 'offline.html';

// --------------------------------------------------
// EVENTO: MESSAGE (Para atualizações do Service Worker)
// --------------------------------------------------
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// --------------------------------------------------
// EVENTO: INSTALL (Instalação do Service Worker)
// --------------------------------------------------
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
        'icon-192x192.png' // Para notificações push
        
      ]);
    })
  );
});

// --------------------------------------------------
// EVENTO: FETCH (Intercepta requisições de navegação)
// --------------------------------------------------
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Tenta buscar a requisição da rede
        return await fetch(event.request);
      } catch (error) {
        // Se a rede falhar (offline), retorna a página offline do cache
        const cache = await caches.open(CACHE);
        return await cache.match(offlineFallbackPage);
      }
    })());
  }
});

// --------------------------------------------------
// NOTIFICAÇÕES PUSH
// --------------------------------------------------
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

// EVENTO: NOTIFICATIONCLICK (Clique na notificação)
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
