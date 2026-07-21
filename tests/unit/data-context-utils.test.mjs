import test from 'node:test'
import assert from 'node:assert/strict'
import { importSourceModule } from './source-module-loader.mjs'

const utils = await importSourceModule('lib/data/context-utils.js')

test('ordena registros recentes sem alterar a lista original', () => {
  const input = [
    { id: 1, created_at: '2025-01-01T00:00:00Z' },
    { id: 2, created_at: '2026-01-01T00:00:00Z' }
  ]
  const sorted = utils.sortByCreatedAtDesc(input)

  assert.deepEqual(sorted.map((item) => item.id), [2, 1])
  assert.deepEqual(input.map((item) => item.id), [1, 2])
})

test('normaliza relacionamento de movimentacao usando produtos em cache', () => {
  const result = utils.normalizeMovimentacao(
    { id: 1, produto_id: 'produto-1' },
    [{ id: 'produto-1', nome: 'Rolamento', cod: '10' }]
  )

  assert.deepEqual(result.produtos, { nome: 'Rolamento', cod: '10' })
})

test('upsert substitui registro sem duplicar identificador', () => {
  const result = utils.upsertSorted(
    [{ id: 1, created_at: '2025-01-01' }],
    { id: 1, created_at: '2026-01-01' },
    utils.sortByCreatedAtDesc
  )

  assert.equal(result.length, 1)
  assert.equal(result[0].created_at, '2026-01-01')
})
