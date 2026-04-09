const CACHE_NAME = 'live-score-v1';
const urlsToCache = ['./', './index.html', './style.css', './script.js', './api.js', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('football-data.org')) return;
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
