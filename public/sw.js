const CACHE_NAME = 'ige-pwa-v3'
const PRECACHE_URLS = ['/offline.html', '/manifest.json', '/ige-supergesso.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(
      names.filter((name) => name.startsWith('ige-pwa-') && name !== CACHE_NAME)
        .map((name) => caches.delete(name))
    )).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  // HTML and authenticated data must never survive in the offline cache.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () =>
      (await caches.match('/offline.html')) || new Response('Sem conexão.', {
        status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    ))
    return
  }

  if (request.headers.get('rsc') || request.headers.get('next-router-prefetch') || url.searchParams.has('_rsc')) return
  const immutable = url.pathname.startsWith('/_next/static/')
  if (!immutable && !PRECACHE_URLS.includes(url.pathname)) return

  // Hashed build assets never change: avoid fetching them again on every hit.
  const response = caches.open(CACHE_NAME).then(async (cache) => {
    const cached = await cache.match(request)
    if (cached && immutable) return cached
    try {
      const fresh = await fetch(request)
      if (fresh.ok && fresh.type === 'basic') {
        try { await cache.put(request, fresh.clone()) } catch { /* Storage may be full. */ }
      }
      return fresh
    } catch (error) {
      if (cached) return cached
      throw error
    }
  })
  event.respondWith(response)
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