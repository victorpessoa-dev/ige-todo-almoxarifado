import assert from 'node:assert/strict'

const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000'
const expectProductionCsp = process.env.APP_EXPECT_PRODUCTION_CSP === 'true'

const ROUTES = [
  '/',
  '/login',
  '/solicitar',
  '/catalogo-publico',
  '/manifest.json',
  '/sw.js',
  '/offline.html'
]

async function fetchRoute(path) {
  const response = await fetch(new URL(path, baseUrl), {
    redirect: 'manual'
  })

  assert.ok(
    [200, 307, 308].includes(response.status),
    `${path} returned unexpected status ${response.status}`
  )

  const csp = response.headers.get('content-security-policy')
  if (!path.startsWith('/_next') && path !== '/manifest.json' && path !== '/sw.js') {
    assert.ok(csp, `${path} should include Content-Security-Policy`)
    assert.match(csp, /worker-src 'self' blob:/)
    assert.match(csp, /manifest-src 'self'/)
    if (expectProductionCsp) {
      assert.doesNotMatch(csp, /unsafe-eval/)
    }
  }

  if (path === '/sw.js') {
    assert.match(response.headers.get('cache-control') || '', /no-store/)
  }

  return response
}

for (const route of ROUTES) {
  await fetchRoute(route)
  console.log(`ok - ${route}`)
}

console.log('app smoke audit passed')
