import test from 'node:test'
import assert from 'node:assert/strict'
import { importSourceModule } from './source-module-loader.mjs'

function moduleUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
}

const form = await importSourceModule('lib/solicitacoes/details-form.js', {
  '@/components/solicitacoes/SolicitacaoForm': moduleUrl(
    'export const defaultSolicitacaoForm = {}'
  ),
  '@/lib/solicitacoes/format': moduleUrl(`
    export const getSolicitacaoCentroCusto = value => value?.centro_custo || ''
    export const getSolicitacaoSolicitante = value => value?.solicitante || ''
  `),
  '@/lib/date/date-utils': moduleUrl(
    "export const toDateInputValue = value => value ? String(value).slice(0, 10) : ''"
  )
})

test('valor unitario atualiza total conforme quantidade', () => {
  const result = form.completeSolicitacaoMoneyFields({
    quantidade: 3,
    valor_unitario: '10,00',
    valor_total: ''
  }, 'valor_unitario')

  assert.equal(result.valor_total, '30,00')
})

test('payload converte campos opcionais vazios para null', () => {
  const result = form.buildSolicitacaoDetailsPayload({
    nome_item: 'Rolamento',
    descricao: '',
    quantidade: 2,
    prioridade: 'media',
    status_geral: 'nova',
    valor_unitario: '5,00',
    valor_total: ''
  })

  assert.equal(result.quantidade, 2)
  assert.equal(result.valor_unitario, 5)
  assert.equal(result.valor_total, 10)
  assert.equal(result.centro_custo_id, null)
})
