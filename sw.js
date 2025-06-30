const CACHE_NAME = 'volei-bnh-cache-v7';
const urlsToCache = [
  '/volei-bnh/index.html',
  '/volei-bnh/lista.html',
  '/volei-bnh/transparencia.html',
  '/volei-bnh/enquete.html',
  '/volei-bnh/splash.png',
  '/volei-bnh/android-chrome-192x192.png',
  '/volei-bnh/android-chrome-512x512.png',
  '/volei-bnh/favicon.ico',
  '/volei-bnh/styles.css',
  '/volei-bnh/main.js',
  '/volei-bnh/offline.html'
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
    fetch(event.request)
      .then(response => {
        // Se a resposta for 404, mostra offline.html
        if (response.status === 404) {
          return caches.match('/volei-bnh/offline.html');
        }
        return response;
      })
      .catch(() => {
        // Em caso de erro de rede, mostra offline.html
        return caches.match('/volei-bnh/offline.html');
      })
  );
});
