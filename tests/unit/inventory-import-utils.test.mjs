import test from 'node:test'
import assert from 'node:assert/strict'
import { importSourceModule } from './source-module-loader.mjs'

const imports = await importSourceModule('lib/inventory/import-utils.js')

test('normaliza limites e impede maximo menor que minimo', () => {
  assert.deepEqual(imports.normalizeImportedStockLimits({
    estoque: '2,5',
    min: '5',
    max: '3'
  }), { estoque: 2.5, min: 5, max: 5 })
})

test('ignora linhas sem codigo ou nome', () => {
  const result = imports.normalizeImportedProducts([
    { cod: '', nome: 'Sem codigo' },
    { cod: '10', nome: '' },
    { cod: '20', nome: 'Produto valido', min: 1, max: 2 }
  ])

  assert.equal(result.length, 1)
  assert.equal(result[0].code, '20')
})
