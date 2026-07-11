import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const ENV_FILES = ['.env.local', '.env']
const EXPECTED_DENIED_STATUS = new Set([401, 403, 404])

async function loadEnv() {
  const values = {}

  for (const file of ENV_FILES) {
    try {
      const content = await readFile(new URL(`../../${file}`, import.meta.url), 'utf8')
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue

        const separatorIndex = trimmed.indexOf('=')
        if (separatorIndex === -1) continue

        const key = trimmed.slice(0, separatorIndex).trim()
        const value = trimmed.slice(separatorIndex + 1).trim()
        if (key && value && !(key in values)) values[key] = value
      }
    } catch {
      // Env files are optional because CI can provide the same values as variables.
    }
  }

  return values
}

function createClient({ supabaseUrl, anonKey }) {
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`
  }

  async function request(path, options = {}) {
    const response = await fetch(`${supabaseUrl}${path}`, {
      ...options,
      headers: {
        ...headers,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    })

    const text = await response.text()
    let body = null

    if (text) {
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
    }

    return { response, body }
  }

  return { request }
}

function assertDeniedOrEmpty({ response, body }, label) {
  if (EXPECTED_DENIED_STATUS.has(response.status)) return

  if (response.ok && Array.isArray(body) && body.length === 0) return

  assert.fail(`${label} exposed data or returned unexpected status ${response.status}`)
}

function assertOkArray({ response, body }, label) {
  assert.equal(response.ok, true, `${label} should be public`)
  assert.equal(Array.isArray(body), true, `${label} should return an array`)
}

function assertNoKeys(items, forbiddenKeys, label) {
  for (const item of items) {
    for (const key of forbiddenKeys) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(item, key),
        false,
        `${label} exposes forbidden key ${key}`
      )
    }
  }
}

async function main() {
  const env = await loadEnv()
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  assert.ok(supabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL is required')
  assert.ok(anonKey, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required')

  const client = createClient({ supabaseUrl, anonKey })
  const checks = []

  checks.push(['produtos direct select denied or empty', async () => {
    // Direct table reads must stay closed; public catalog access goes through the RPC.
    const result = await client.request('/rest/v1/produtos?select=id,cod,nome,estoque&limit=1')
    assertDeniedOrEmpty(result, 'produtos direct select')
  }])

  checks.push(['solicitacoes_compra direct select denied or empty', async () => {
    // Direct request reads expose operational fields, so the public UI must use the limited RPC.
    const result = await client.request('/rest/v1/solicitacoes_compra?select=id,codigo,descricao&limit=1')
    assertDeniedOrEmpty(result, 'solicitacoes_compra direct select')
  }])

  checks.push(['public requesters readable', async () => {
    const result = await client.request('/rest/v1/solicitantes_compra?select=id,nome,centro_custo_id&ativo=eq.true&limit=5')
    assertOkArray(result, 'solicitantes_compra active select')
  }])

  checks.push(['public cost centers readable', async () => {
    const result = await client.request('/rest/v1/centros_custo?select=id,nome,codigo&ativo=eq.true&limit=5')
    assertOkArray(result, 'centros_custo active select')
  }])

  checks.push(['public catalog RPC hides stock', async () => {
    const result = await client.request('/rest/v1/rpc/listar_produtos_catalogo_publico', {
      method: 'POST',
      body: '{}'
    })
    assertOkArray(result, 'listar_produtos_catalogo_publico')
    assertNoKeys(result.body, ['estoque', 'user_id'], 'listar_produtos_catalogo_publico')
  }])

  checks.push(['public purchase list RPC hides sensitive fields', async () => {
    const result = await client.request('/rest/v1/rpc/listar_solicitacoes_compra_publica', {
      method: 'POST',
      body: '{}'
    })
    assertOkArray(result, 'listar_solicitacoes_compra_publica')
    assertNoKeys(result.body, ['user_id', 'produto_id', 'valor_unitario', 'valor_total'], 'listar_solicitacoes_compra_publica')
  }])

  checks.push(['storage buckets are not publicly enumerable', async () => {
    // Bucket enumeration should remain blocked even if a future feature starts using Storage.
    const result = await client.request('/storage/v1/bucket')
    assertDeniedOrEmpty(result, 'storage bucket list')
  }])

  for (const [label, run] of checks) {
    await run()
    console.log(`ok - ${label}`)
  }

  console.log('supabase public audit passed')
}

main().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
