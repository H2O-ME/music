const CACHE_NAME = 'music-lyrics-cache-v2';
const urlsToCache = [
  './index.html',
  './js/app.js',
  './js/config.js',
  './js/lyrics.js',
  './js/player.js',
  './js/playlist.js',
  './js/search.js',
  './js/ui.js',
  './js/utils.js',
  './js/wallpaper.js',
  './css/main.css',
  './css/mobile.css',
  './css/player.css',
  './css/playlist.css',
  './css/variables.css',
  './css/wallpaper.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
     .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
     .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => cacheName.startsWith('music-lyrics-cache-') && cacheName!== CACHE_NAME)
         .map(cacheName => caches.delete(cacheName))
      );
    })
  );
});

// 处理推送通知
self.addEventListener('push', function(event) {
  const options = {
    body: '您有新的通知！',
    icon: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '2'
    }
  };
  event.waitUntil(
    self.registration.showNotification('新通知', options)
  );
});

// 处理后台同步
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // 这里添加同步数据的逻辑
      console.log('开始后台同步数据')
    );
  }
});