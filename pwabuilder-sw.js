importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE = "pwabuilder-page-v1";
const offlineFallbackPage = "offline.html";

// Evento para pular espera (usado em atualizações)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Instalação do Service Worker (cache offline)
self.addEventListener('install', async (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => {
      return cache.addAll([
        offlineFallbackPage,
        'lista.html',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
      ]);
    })
  );
});


// Ativa navigationPreload para performance
if (workbox.navigationPreload.isSupported()) {
  workbox.navigationPreload.enable();
}

// Tratamento de fetch para navegação offline
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp) return preloadResp;
        const networkResp = await fetch(event.request);
        return networkResp;
      } catch (error) {
        const cache = await caches.open(CACHE);
        return await cache.match(offlineFallbackPage);
      }
    })());
  }
});

// --- NOTIFICAÇÕES PUSH ---
self.addEventListener('push', (event) => {
  const payload = event.data?.json() || {};
  const title = payload.notification?.title || 'Novo alerta!';
  const options = {
    body: payload.notification?.body || 'Mensagem importante.',
    icon: payload.notification?.icon || '/icon-192x192.png',
    badge: '/badge.png',
    vibrate: [200, 100, 200],
    data: { url: payload.notification?.url || '/' },
    requireInteraction: true,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Redirecionamento ao clicar na notificação
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
