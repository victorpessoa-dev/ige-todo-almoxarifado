const CACHE_NAME = 'ige-pwa-v2'
const PRECACHE_URLS = [
  '/',
  '/solicitar',
  '/login',
  '/manifest.json',
  '/ige-supergesso.svg'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' }))
          )
        )
      )
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  )
})

function isCacheableAsset(request, url) {
  if (request.method !== 'GET') return false
  if (url.origin !== self.location.origin) return false
  if (url.pathname.startsWith('/api/')) return false
  if (url.pathname.startsWith('/_next/webpack-hmr')) return false
  if (request.headers.get('rsc')) return false
  if (request.headers.get('next-router-prefetch')) return false
  if (url.searchParams.has('_rsc')) return false

  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.match(/\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|woff2?)$/)
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
          }

          return response
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    )
    return
  }

  if (!isCacheableAsset(request, url)) {
    event.respondWith(fetch(request))
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone))
        }

        return response
      })

      return cached || fetchPromise
    })
  )
})

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data?.text() || '' } }
  const title = data.title || 'IGE Almoxarifado'
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || 'Você possui uma revisão de estoque pendente.',
    icon: '/ige-supergesso.svg',
    badge: '/ige-supergesso.svg',
    tag: data.reviewId ? `revisao-${data.reviewId}` : 'revisao-estoque',
    data: { url: data.url || '/revisoes' },
    renotify: true
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/revisoes', self.location.origin).href
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const current = windows.find((window) => window.url.startsWith(self.location.origin))
    if (current) { current.focus(); return current.navigate(target) }
    return clients.openWindow(target)
  }))
})