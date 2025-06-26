const CACHE_NAME = 'volei-bnh-cache-v1';
const urlsToCache = [
  '/',
  '/volei-bnh/',
  '/lista.html',
  '/favicon-192x192.png',
  '/favicon-512x512.png',
  '/favicon.ico',
  '/style.css',
  '/main.js'
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
