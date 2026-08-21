import test from 'node:test'
import assert from 'node:assert/strict'
import { importSourceModule, sourceModuleUrl } from './source-module-loader.mjs'

const dateUtilsUrl = await sourceModuleUrl('lib/date/date-utils.js')
const filters = await importSourceModule('lib/solicitacoes/filters.js', {
  "@/lib/date/date-utils": dateUtilsUrl
})

const requests = [
  { id: 1, created_at: '2026-07-21T12:00:00-03:00' },
  { id: 2, created_at: '2025-01-10T12:00:00-03:00' },
  { id: 3, created_at: null }
]

test('filtra solicitacoes por mes e ano', () => {
  assert.equal(filters.matchesSolicitacaoDateFilters(requests[0], {
    meses: ['07'],
    anos: ['2026']
  }), true)
  assert.equal(filters.matchesSolicitacaoDateFilters(requests[1], {
    meses: ['07'],
    anos: ['2026']
  }), false)
})

test('lista anos unicos em ordem decrescente', () => {
  assert.deepEqual(filters.getSolicitacaoFilterYears(requests), ['2026', '2025'])
})
