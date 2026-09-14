import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

async function readText(path) {
  return readFile(new URL(`../../${path}`, import.meta.url), 'utf8')
}

test('paginacao de planilhas comeca em 50 itens ou mais', async () => {
  const pagination = await readText('components/ui/table-pagination.js')
  const paginatedSources = await Promise.all([
    readText('components/inventory/ProductTable.js'),
    readText('components/solicitacoes/SolicitacaoTable.js'),
    readText('app/solicitar/page.js'),
    readText('app/(admin)/analise-giro/page.js'),
    readText('app/(admin)/revisoes/page.js')
  ])

  assert.match(pagination, /const PAGE_SIZE_OPTIONS = \[50, 100, 200\]/)
  assert.doesNotMatch(pagination, /\b25\b/)

  for (const source of paginatedSources) {
    assert.match(source, /const DEFAULT_PAGE_SIZE = 50/)
    assert.doesNotMatch(source, /const DEFAULT_PAGE_SIZE = 25/)
  }
})

test('cards base respeitam largura disponivel no mobile', async () => {
  const card = await readText('components/ui/card.tsx')

  assert.match(card, /flex w-full min-w-0 max-w-full flex-col/)
  assert.match(card, /grid min-w-0 auto-rows-min/)
  assert.match(card, /grid-cols-\[minmax\(0,1fr\)_auto\]/)
  assert.match(card, /data-slot="card-content"[\s\S]*?min-w-0 px-6/)
})

test('cards mobile criticos contem textos longos sem estourar a tela', async () => {
  const productTable = await readText('components/inventory/ProductTable.js')
  const solicitacaoTable = await readText('components/solicitacoes/SolicitacaoTable.js')
  const giroPage = await readText('app/(admin)/analise-giro/page.js')

  assert.match(productTable, /w-full min-w-0 overflow-hidden rounded-xl border bg-card/)
  assert.match(productTable, /grid-cols-\[repeat\(3,minmax\(0,1fr\)\)\]/)

  assert.match(solicitacaoTable, /w-full min-w-0 overflow-hidden rounded-xl border bg-card/)
  assert.match(solicitacaoTable, /min-\[360px\]:grid-cols-\[auto_minmax\(0,1fr\)\]/)

  assert.match(giroPage, /w-full min-w-0 flex-col gap-2 overflow-hidden rounded-xl border/)
  assert.match(giroPage, /break-words text-xs text-muted-foreground/)
})
