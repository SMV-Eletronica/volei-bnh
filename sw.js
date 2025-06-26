const CACHE_NAME = 'volei-bnh-cache-v1';
const urlsToCache = [
  '/volei-bnh/index.html', // Página principal
  '/volei-bnh/lista.html',
  '/volei-bnh/android-chrome-192x192.png', // Corrigido
  '/volei-bnh/android-chrome-512x512.png', // Corrigido
  '/volei-bnh/favicon.ico',
  '/volei-bnh/styles.css',
  '/volei-bnh/main.js',
 // '/volei-bnh/offline.html' // Opcional: para suporte offline
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
