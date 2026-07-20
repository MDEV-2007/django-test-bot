/* Service worker — offline fallback only.
 *
 * Why it exists: the in-page offline overlay in base.html can only react once a page is
 * already loaded. If the connection is already gone when the user taps a link, the
 * browser never reaches the site at all and shows its own "This site can't be reached"
 * error — our JavaScript never runs. A service worker is the only thing that can answer
 * a failed navigation, because the browser keeps it installed and runs it offline.
 *
 * Deliberately conservative: this is NETWORK-FIRST and caches no HTML pages. Caching real
 * pages is how a service worker starts serving stale content after a deploy — a much
 * worse bug than the one being fixed. The only cached document is the offline fallback.
 */
const VERSION = 'ilmmevasi-offline-v1';
const OFFLINE_URL = '/offline/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: 'reload' })))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  // Drop caches from older versions so a deploy can never resurrect stale content.
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only page navigations. Everything else (API calls, assets) is left completely alone
  // so nothing is served from a stale cache.
  if (request.mode !== 'navigate') return;

  event.respondWith(
    fetch(request).catch(() =>
      caches.open(VERSION).then((cache) => cache.match(OFFLINE_URL))
    )
  );
});

// Lets the page trigger an immediate update instead of waiting for the next navigation.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
