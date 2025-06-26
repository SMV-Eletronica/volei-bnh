const CACHE_NAME = 'volei-bnh-cache-v3'; // Alterado para v2 para evitar conflitos com cache antigo
const urlsToCache = [
  '/volei-bnh/index.html', // Página principal
  '/volei-bnh/lista.html',
  '/volei-bnh/transparencia.html',
  '/volei-bnh/enquete.html',
  '/volei-bnh/android-chrome-192x192.png', // Corrigido
  '/volei-bnh/android-chrome-512x512.png', // Corrigido
   '/volei-bnh/splash.png', // Corrigido
  '/volei-bnh/favicon.ico',
  '/volei-bnh/styles.css',
  '/volei-bnh/main.js',
  '/volei-bnh/offline.html' // Opcional: para suporte offline
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto:', CACHE_NAME);
        return cache.addAll(urlsToCache).catch(error => {
          console.error('Falha ao adicionar recursos ao cache:', error);
          throw error;
        });
      })
      .catch(error => {
        console.error('Erro ao abrir o cache:', error);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).catch(() => {
          // Fallback para página offline
          return caches.match('/volei-bnh/offline.html');
        });
      })
  );
});
