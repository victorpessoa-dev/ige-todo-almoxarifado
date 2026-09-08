import assert from 'node:assert/strict'
import test from 'node:test'
import { importSourceModule, sourceModuleUrl } from './source-module-loader.mjs'

const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`
const clientUrl = moduleUrl(`
  export const state = { payload: null, details: [], items: [] }
  const query = {
    update(payload) { state.payload = JSON.parse(JSON.stringify(payload)); return this },
    eq() { return this }, select() { return this },
    async single() { return { data: state.payload, error: null } }
  }
  export const supabase = {
    from() { return query },
    async rpc(name, args) {
      if (name === 'listar_solicitacoes_compra_publica') return { data: state.items, error: null }
      state.details.push(args.p_codigo)
      return { data: { codigo: args.p_codigo, solicitante: 'Maria', centro_custo: 'Obra' }, error: null }
    }
  }
`)
const { state } = await import(clientUrl)
const service = await importSourceModule('lib/services/solicitacoes-service.js', {
  '@/lib/supabase/client': clientUrl,
  '@/lib/date/date-utils': await sourceModuleUrl('lib/date/date-utils.js'),
  '@/lib/cache/memory-cache': await sourceModuleUrl('lib/cache/memory-cache.js'),
  '@/constants/solicitacoes-config': moduleUrl('export const SOLICITACAO_PRIORIDADE_OPTIONS = []; export const SOLICITACAO_STATUS_GERAL_OPTIONS = [{ value: \"em_cotacao\" }, { value: \"transporte\" }, { value: \"concluida\" }]')
})

test('partial requester updates preserve the existing cost center', async () => {
  await service.updateSolicitanteCompra('1', { nome: ' Maria ' })
  assert.deepEqual(state.payload, { nome: 'Maria' })
  await service.updateSolicitanteCompra('1', { centro_custo_id: null })
  assert.deepEqual(state.payload, { centro_custo_id: null })
  await service.updateSolicitanteCompra('1', { centro_custo_id: '2' })
  assert.deepEqual(state.payload, { centro_custo_id: '2' })
})

test('public list fetches details only for incomplete items and reuses its cache', async () => {
  service.invalidatePublicSolicitacaoCaches()
  state.items = [
    { codigo: '1', solicitante: 'Maria', centro_custo: 'Obra', previsao_desejada: null },
    { codigo: '2' }
  ]
  const result = await service.listPublicSolicitacoesStatus()
  assert.deepEqual(state.details, ['2'])
  assert.equal(result.length, 2)
  assert.equal(result[1].solicitante, 'Maria')
  assert.deepEqual(await service.listPublicSolicitacoesStatus(), result)
  assert.deepEqual(state.details, ['2'])
})


test('inline status changes send only status and preserve completion date rules', async () => {
  await service.updateSolicitacaoCompra('1', { status_geral: 'transporte' })
  assert.deepEqual(state.payload, { status_geral: 'transporte' })
  state.payload = { previsao_entrega: '2026-09-01' }
  await service.updateSolicitacaoCompra('1', { status_geral: 'concluida' })
  assert.deepEqual(state.payload, { status_geral: 'concluida' })
  state.payload = {}
  await service.updateSolicitacaoCompra('1', { status_geral: 'concluida' })
  assert.equal(state.payload.status_geral, 'concluida')
  assert.match(state.payload.previsao_entrega, /^\d{4}-\d{2}-\d{2}$/)
})
