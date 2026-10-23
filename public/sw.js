/* WorldEye service worker — conservative by design (F17).
 *
 * What it does:
 * - Precaches ONLY the offline fallback page and the essential app icons.
 * - Navigations are network-first; on network failure the offline page is
 *   served. The offline page says plainly that WorldEye is live data — it
 *   never pretends cached content is current.
 * - Immutable build assets (/_next/static/*) and the precached icons are
 *   cache-first (they are content-hashed / versioned with this worker).
 *
 * What it NEVER touches (the fetch is not intercepted at all):
 * - Non-GET requests.
 * - Cross-origin requests: Stripe, camera streams/media, map tiles,
 *   realtime/data endpoints.
 * - /api/* (including /api/auth session routes), /settings/*, /admin/*,
 *   /checkout/*, /billing/* — authenticated, account, billing and admin
 *   surfaces always go straight to the network.
 *
 * Updates: caches are versioned (bump SW_VERSION with any change here).
 * Activation deletes every older cache. The page-side registrar
 * (ServiceWorkerRegister) messages SKIP_WAITING to a newly installed
 * worker when an old one controls the page, then reloads once on
 * controllerchange — a deploy can never strand visitors on stale code.
 */

const SW_VERSION = "v1";
const STATIC_CACHE = `worldeye-static-${SW_VERSION}`;

const PRECACHE_URLS = [
  "/offline",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
  "/favicon.ico",
];

const BYPASS_PREFIXES = [
  "/api",
  "/settings",
  "/admin",
  "/checkout",
  "/billing",
];

function isBypassed(pathname) {
  return BYPASS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin (Stripe, camera media, tiles, realtime): hands off.
  if (url.origin !== self.location.origin) return;

  // Authenticated / account / billing / API surfaces: hands off.
  if (isBypassed(url.pathname)) return;

  // Documents: network-first, offline fallback page on failure.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/offline", { ignoreSearch: true }),
      ),
    );
    return;
  }

  // Immutable build assets + app icons: cache-first, fill from network.
  if (
    url.pathname.startsWith("/_next/static/") ||
    PRECACHE_URLS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(request, { ignoreSearch: true }).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches
                .open(STATIC_CACHE)
                .then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Everything else (pages' data, imagery, misc): network only.
});
