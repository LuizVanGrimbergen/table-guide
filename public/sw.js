/*
 * The Collection service worker.
 * - Built assets (/build/*) and fonts: cache first (file names are hashed).
 * - His own screens: network first, falling back to the last copy, so the
 *   collection still opens with no signal. Page HTML and Inertia JSON are
 *   cached separately because they share URLs.
 * - Nothing else is cached: no POSTs, no login, no public pages.
 * - On logout the app asks us to wipe everything (private data).
 */
const VERSION = 'v1';
const ASSETS = `tc-assets-${VERSION}`;
const PAGES = `tc-pages-${VERSION}`;
const DATA = `tc-data-${VERSION}`;
const OFFLINE = '/offline.html';

const PAGE_PATHS = [
    /^\/$/,
    /^\/collection$/,
    /^\/map$/,
    /^\/tonight$/,
    /^\/friends$/,
    /^\/restaurants\/\d+$/,
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(ASSETS)
            .then((cache) =>
                cache.addAll([OFFLINE, '/icon-192.png', '/favicon.svg']),
            ),
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) =>
                Promise.all(
                    keys
                        .filter((k) => !k.endsWith(VERSION))
                        .map((k) => caches.delete(k)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

self.addEventListener('message', (event) => {
    if (event.data === 'clear-private') {
        event.waitUntil(
            Promise.all([caches.delete(PAGES), caches.delete(DATA)]),
        );
    }
});

async function cacheFirst(request) {
    const cached = await caches.match(request);

    if (cached) {
        return cached;
    }

    const response = await fetch(request);

    if (response.ok) {
        (await caches.open(ASSETS)).put(request, response.clone());
    }

    return response;
}

async function networkFirst(request, cacheName, fallback) {
    const cache = await caches.open(cacheName);

    try {
        const response = await fetch(request);

        // Only keep real pages, never login redirects.
        if (response.ok && !response.redirected) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        const cached = await cache.match(request, { ignoreVary: true });

        if (cached) {
            return cached;
        }

        if (fallback) {
            return (await caches.match(fallback)) ?? Response.error();
        }

        throw error;
    }
}

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        if (/fonts\.bunny\.net$/.test(url.hostname)) {
            event.respondWith(cacheFirst(request));
        }

        return;
    }

    if (url.pathname.startsWith('/build/')) {
        event.respondWith(cacheFirst(request));

        return;
    }

    if (!PAGE_PATHS.some((re) => re.test(url.pathname))) {
        return;
    }

    if (request.headers.get('X-Inertia')) {
        event.respondWith(networkFirst(request, DATA));
    } else if (request.mode === 'navigate') {
        event.respondWith(networkFirst(request, PAGES, OFFLINE));
    }
});
