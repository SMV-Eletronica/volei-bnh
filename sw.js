const CACHE_NAME = 'volei-bnh-cache-v2';
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

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.status === 404) {
          return caches.match('/volei-bnh/offline.html');
        }
        return response;
      })
      .catch(() => caches.match('/volei-bnh/offline.html'))
  );
});
