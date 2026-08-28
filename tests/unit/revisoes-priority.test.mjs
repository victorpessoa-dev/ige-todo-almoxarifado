import test from 'node:test'
import assert from 'node:assert/strict'
import { importSourceModule } from './source-module-loader.mjs'

const { calculateNextReviewExecution, getStockReviewPriority, sortReviewItems } = await importSourceModule('lib/revisoes/priority.js')

test('prioriza produto em falta antes de estoque baixo e normal', () => {
  const items = sortReviewItems([
    { nome_snapshot: 'Normal', produtos: { estoque: 8, min: 2 }, revisado_em: '2026-01-01' },
    { nome_snapshot: 'Baixo', produtos: { estoque: 2, min: 2 } },
    { nome_snapshot: 'Falta', produtos: { estoque: 0, min: 2 } }
  ])
  assert.deepEqual(items.map((item) => item.nome_snapshot), ['Falta', 'Baixo', 'Normal'])
  assert.equal(getStockReviewPriority(items[0]), 1)
})

test('pula domingos e demais dias bloqueados no proximo agendamento', () => {
  const next = calculateNextReviewExecution({
    base: new Date('2026-08-29T12:00:00'),
    horario: '10:00',
    intervaloDias: 1,
    diasBloqueados: [0]
  })
  assert.equal(next.getDay(), 1)
  assert.equal(next.getHours(), 10)
})

test('respeita intervalo de dois dias', () => {
  const next = calculateNextReviewExecution({ base: new Date('2026-08-24T12:00:00'), horario: '10:00', intervaloDias: 2 })
  assert.equal(next.getDate(), 26)
})