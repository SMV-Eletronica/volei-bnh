// Carrega a biblioteca Workbox para simplificar o uso do Service Worker
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

// Define o nome do cache e a página de fallback para modo offline
const CACHE = "pwabuilder-page-v3";
const offlineFallbackPage = "offline.html";

// --------------------------------------------------
// EVENTO: MESSAGE (Para atualizações do Service Worker)
// --------------------------------------------------
self.addEventListener("message", (event) => {
  // Verifica se a mensagem recebida é do tipo SKIP_WAITING
  if (event.data && event.data.type === "SKIP_WAITING") {
    // Força o Service Worker a se tornar ativo imediatamente (sem esperar)
    self.skipWaiting();
  }
});

// --------------------------------------------------
// EVENTO: INSTALL (Instalação do Service Worker)
// --------------------------------------------------
self.addEventListener('install', async (event) => {
  // event.waitUntil garante que o Service Worker não complete a instalação até que o cache seja criado
  event.waitUntil(
    // Abre o cache com o nome definido
    caches.open(CACHE).then((cache) => {
      // Adiciona os recursos essenciais ao cache
      return cache.addAll([
        offlineFallbackPage,          // Página offline      
        'windows11/Square44x44Logo.altform-unplated_targetsize-16.png',
        'windows11/Square44x44Logo.altform-unplated_targetsize-32.png',
        'android/android-launchericon-192-192.png',
        'android/android-launchericon-512-512.png',
        'ios/192.png',
        // CSS do Font Awesome
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
      ]);
    })
  );
});

// --------------------------------------------------
// CONFIGURAÇÃO: NAVIGATION PRELOAD (Para melhor performance)
// --------------------------------------------------
// Verifica se o navegador suporta navigation preload
if (workbox.navigationPreload.isSupported()) {
  // Habilita o navigation preload
  workbox.navigationPreload.enable();
}

// --------------------------------------------------
// EVENTO: FETCH (Intercepta requisições de rede)
// --------------------------------------------------
self.addEventListener('fetch', (event) => {
  // Só trata requisições de navegação (páginas HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        // Tenta usar a resposta preload se disponível
        const preloadResp = await event.preloadResponse;
        if (preloadResp) return preloadResp;
        
        // Se não houver preload, tenta buscar na rede
        const networkResp = await fetch(event.request);
        return networkResp;
      } catch (error) {
        // Se a rede falhar, retorna a página offline do cache
        const cache = await caches.open(CACHE);
        return await cache.match(offlineFallbackPage);
      }
    })());
  }
});

// --------------------------------------------------
// NOTIFICAÇÕES PUSH
// --------------------------------------------------

// EVENTO: PUSH (Recebimento de notificação push)
self.addEventListener('push', (event) => {
  // Extrai os dados da notificação ou usa valores padrão
  const payload = event.data?.json() || {};
  const title = payload.notification?.title || 'Novo alerta!';
  
  // Configurações da notificação
  const options = {
    body: payload.notification?.body || 'Mensagem importante.',
    icon: payload.notification?.icon || '/icon-192x192.png', // Ícone
    badge: '/badge.png',                                     // Ícone pequeno
    vibrate: [200, 100, 200],                                // Padrão de vibração
    data: { url: payload.notification?.url || '/' },         // URL para redirecionar
    requireInteraction: true,                                // Exige interação do usuário
  };
  
  // Exibe a notificação
  event.waitUntil(self.registration.showNotification(title, options));
});

// EVENTO: NOTIFICATIONCLICK (Clique na notificação)
self.addEventListener('notificationclick', (event) => {
  // Fecha a notificação
  event.notification.close();
  
  // Obtém a URL da notificação ou usa a raiz como padrão
  const urlToOpen = event.notification.data.url || '/';
  
  // Manipula o clique na notificação
  event.waitUntil(
    // Procura por janelas/tabs abertas
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Verifica se já existe uma janela com a URL da notificação
      const client = windowClients.find((c) => c.url === urlToOpen && 'focus' in c);
      
      // Se existir, traz para o foco, senão abre nova janela
      return client ? client.focus() : clients.openWindow(urlToOpen);
    })
  );
});
