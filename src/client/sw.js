const CACHE_NAME = 'ludo-game-pwa-v1';

const PRECACHE_ASSETS = [
    './',
    './index.html',
    './main.js',
    './manifest.json',
    './ludo/style.css',
    './ludo/Ludo.js',
    './ludo/NetworkClient.js',
    './ludo/UI.js',
    './ludo/constants.js',
    './ludo/AudioManager.js',
    './assets/dice.png',
    './assets/create-room.png',
    './assets/join-room.png',
    './assets/join.png',
    './assets/leave-room.png',
    './assets/back.png',
    './assets/roll.png',
    './assets/undo.png',
    './assets/reset.png',
    './assets/leaderboard.png',
    './assets/new-board.png',
    './assets/space-board.png',
    './assets/Frame 1.png',
    './assets/audio/dice-roll.mp3',
    './assets/audio/piece-move.mp3',
    './assets/audio/turn-swap.mp3',
    './assets/icon-192.png',
    './assets/icon-512.png',
    './assets/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[ServiceWorker] Pre-caching app shell');
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('[ServiceWorker] Partial cache install fallback', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[ServiceWorker] Removing old cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and non-http(s) requests (e.g. WebSockets, browser extensions)
    if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
        return;
    }

    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached version & update cache in background (Stale-while-revalidate)
                fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, networkResponse);
                        });
                    }
                }).catch(() => {/* Offline fallback ignore */});
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // If offline and requesting document, return root index.html from cache
                if (request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
