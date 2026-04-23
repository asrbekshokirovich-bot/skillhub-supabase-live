const CACHE_NAME = 'skillhub-cache-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      // Offline fallback can go here if fully implemented
      return new Response('Offline Content');
    })
  );
});
