import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import test from 'node:test'

const source = await readFile(new URL('../../public/sw.js', import.meta.url), 'utf8')
function worker({ offline = false } = {}) {
  const handlers = {}
  const stored = new Map([['/offline.html', new Response('offline')]])
  const deleted = []
  let requests = 0
  const key = (request) => typeof request === 'string' ? request : request.url
  const cache = {
    match: async (request) => stored.get(key(request))?.clone(),
    put: async (request, response) => { stored.set(key(request), response) },
    addAll: async () => {}
  }
  vm.runInNewContext(source, {
    URL, Response,
    self: {
      location: { origin: 'https://app.test' },
      addEventListener: (name, handler) => { handlers[name] = handler },
      clients: { claim: async () => {} }, skipWaiting: async () => {}
    },
    caches: {
      open: async () => cache, match: cache.match,
      keys: async () => ['ige-pwa-v2', 'ige-pwa-v3', 'another-app'],
      delete: async (name) => { deleted.push(name) }
    },
    fetch: async () => {
      requests++
      if (offline) throw new Error('offline')
      const response = new Response('network')
      Object.defineProperty(response, 'type', { value: 'basic' })
      return response
    }
  })
  return {
    stored, deleted, get requests() { return requests },
    async fetch(path, options = {}) {
      let result
      handlers.fetch({
        request: { url: `https://app.test${path}`, method: 'GET', mode: 'cors', headers: new Headers(), ...options },
        respondWith: (response) => { result = response }
      })
      return result
    },
    async activate() {
      let done
      handlers.activate({ waitUntil: (promise) => { done = promise } })
      await done
    }
  }
}

test('navigations do not cache administrative HTML', async () => {
  const sw = worker()
  assert.equal(await (await sw.fetch('/inventario', { mode: 'navigate' })).text(), 'network')
  assert.equal(sw.stored.size, 1)
})

test('offline navigation shows neutral fallback instead of old administrative data', async () => {
  const sw = worker({ offline: true })
  sw.stored.set('https://app.test/inventario', new Response('private'))
  assert.equal(await (await sw.fetch('/inventario', { mode: 'navigate' })).text(), 'offline')
})

test('Next.js chunks bypass the service worker cache', async () => {
  const sw = worker()
  assert.equal(await sw.fetch('/_next/static/chunk-123.js'), undefined)
  assert.equal(sw.requests, 0)
})

test('API and React navigation payloads bypass the cache', async () => {
  const sw = worker()
  assert.equal(await sw.fetch('/api/analyze'), undefined)
  assert.equal(await sw.fetch('/inventario?_rsc=123'), undefined)
  assert.equal(await sw.fetch('/_next/static/test.js', { headers: new Headers({ rsc: '1' }) }), undefined)
  assert.equal(sw.requests, 0)
})

test('activation removes only obsolete caches owned by this app', async () => {
  const sw = worker()
  await sw.activate()
  assert.deepEqual(sw.deleted, ['ige-pwa-v2', 'ige-pwa-v3'])
})
