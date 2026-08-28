import test from 'node:test'
import assert from 'node:assert/strict'
import { importSourceModule } from './source-module-loader.mjs'

const { getReviewCategories, normalizeReviewCategories } = await importSourceModule('lib/revisoes/categories.js')

test('normaliza categorias removendo espaços, vazios e duplicadas', () => {
  assert.deepEqual(
    normalizeReviewCategories([' Ferragens ', '', 'Elétrica', 'Ferragens', null]),
    ['Ferragens', 'Elétrica']
  )
})

test('aceita uma única categoria legada', () => {
  assert.deepEqual(getReviewCategories({ categoria: 'Pintura' }), ['Pintura'])
})

test('prioriza categorias múltiplas da rotina e ignora a categoria legada', () => {
  assert.deepEqual(
    getReviewCategories({ categoria: 'Legada', categorias: ['Hidráulica', 'Elétrica', 'Hidráulica'] }),
    ['Hidráulica', 'Elétrica']
  )
})