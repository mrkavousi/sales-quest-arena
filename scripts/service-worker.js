/* Built into dist/sw.js with a content-derived revision and asset list. */
const CACHE_PREFIX = 'sales-quest-arena-pwa-v1-';
const CACHE_REVISION = '__SQA_REVISION__';
const CACHE_NAME = CACHE_PREFIX + CACHE_REVISION;
const PRECACHE_PATHS = /*__SQA_PRECACHE__*/ [];
const scope = new URL(self.registration.scope);
const shellUrl = new URL('index.html', scope).href;

// A new version waits until the player chooses to update or closes the old app.
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(PRECACHE_PATHS.map((path) => new Request(new URL(path, scope), { cache: 'reload' })));
    } catch (error) {
      // A partial/offline installation must not replace a working version.
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const owned = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX));
    // Retain two older versions for other open tabs still using their old hashed assets.
    const previous = owned.filter((name) => name !== CACHE_NAME);
    await Promise.all(previous.slice(0, -2).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function matchAppAsset(request) {
  const current = await caches.open(CACHE_NAME);
  // These are public, same-origin build files. Some static hosts send `Vary: Origin`,
  // while module/font requests and precache requests use different Origin headers.
  const match = await current.match(request, { ignoreSearch: true, ignoreVary: true });
  if (match) return match;

  // An older open tab can still request its matching version of a hashed asset.
  const oldCaches = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).reverse();
  for (const name of oldCaches) {
    const oldMatch = await (await caches.open(name)).match(request, { ignoreSearch: true, ignoreVary: true });
    if (oldMatch) return oldMatch;
  }
  return fetch(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  // Session and personalized BFF responses are always network-only, never in Cache Storage.
  if (url.pathname.startsWith('/api/') || url.pathname === '/login' || url.pathname === '/demo-login' || url.pathname === '/logout') return;

  if (request.mode === 'navigate') {
    // The game uses hash routes. Don't hijack other paths on the same origin.
    if (url.pathname !== scope.pathname && url.pathname !== new URL('index.html', scope).pathname) return;
    event.respondWith((async () => (await (await caches.open(CACHE_NAME)).match(shellUrl, { ignoreVary: true })) || fetch(request))());
    return;
  }

  // Only previously built assets are cached; unknown requests always go to the network.
  event.respondWith(matchAppAsset(request));
});
