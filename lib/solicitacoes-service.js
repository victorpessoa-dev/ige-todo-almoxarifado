import { supabase } from '@/lib/supabaseClient'
import {
  SOLICITACAO_PRIORIDADE_OPTIONS,
  SOLICITACAO_STATUS_COTACAO_OPTIONS,
  SOLICITACAO_STATUS_GERAL_OPTIONS,
  SOLICITACAO_STATUS_PEDIDO_OPTIONS,
  SOLICITACAO_STATUS_TRANSPORTE_OPTIONS
} from '@/constants/solicitacoes-config'

const SOLICITACOES_TABLE = 'solicitacoes_compra'
const SOLICITANTES_TABLE = 'solicitantes_compra'
const CENTROS_CUSTO_TABLE = 'centros_custo'

const TEXT_LIMITS = {
  descricao: 500,
  aplicacoes: 1000,
  link_referencia: 500,
  fornecedor_nome: 160,
  fornecedor_contato: 200,
  solicitante: 160,
  centro_custo: 180,
  codigo: 32,
  nome: 160
}

const VALID_OPTIONS = {
  prioridade: new Set(SOLICITACAO_PRIORIDADE_OPTIONS.map((option) => option.value)),
  status_geral: new Set(SOLICITACAO_STATUS_GERAL_OPTIONS.map((option) => option.value)),
  status_cotacao: new Set(SOLICITACAO_STATUS_COTACAO_OPTIONS.map((option) => option.value)),
  status_pedido: new Set(SOLICITACAO_STATUS_PEDIDO_OPTIONS.map((option) => option.value)),
  status_transporte: new Set(SOLICITACAO_STATUS_TRANSPORTE_OPTIONS.map((option) => option.value))
}

function normalizeText(value, maxLength) {
  if (value === null || value === undefined) return ''

  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

function normalizeOptionalText(value, maxLength) {
  const text = normalizeText(value, maxLength)
  return text || null
}

function normalizeSafeUrl(value) {
  const text = normalizeOptionalText(value, TEXT_LIMITS.link_referencia)
  if (!text) return null

  let url

  try {
    url = new URL(text)
  } catch {
    throw new Error('Informe um link de referência válido.')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('O link deve começar com http:// ou https://.')
  }

  return url.toString().slice(0, TEXT_LIMITS.link_referencia)
}

function normalizeOption(value, options, fallback) {
  const normalizedValue = normalizeText(value, 80)
  return options.has(normalizedValue) ? normalizedValue : fallback
}

function normalizeQuantidade(value) {
  const quantidade = Number(value || 0)
  if (!Number.isFinite(quantidade) || quantidade <= 0 || quantidade > 999999) {
    return 0
  }

  return quantidade
}

function parseDecimalValue(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value

  const cleanValue = String(value).trim().replace(/[^\d,.-]/g, '')
  const normalizedValue = cleanValue.includes(',')
    ? cleanValue.replace(/\./g, '').replace(',', '.')
    : cleanValue
  const number = Number(normalizedValue)

  return Number.isFinite(number) ? number : null
}

function isPublicVisible(value) {
  return value === true || value === 1 || value === '1'
}

export function buildPublicSolicitacaoPayload(form) {
  return {
    descricao: normalizeText(form.descricao, TEXT_LIMITS.descricao),
    quantidade: normalizeQuantidade(form.quantidade || 1),
    prioridade: normalizeOption(form.prioridade, VALID_OPTIONS.prioridade, 'media'),
    previsao_desejada: form.previsao_desejada || null,
    centro_custo_id: form.centro_custo_id || null,
    centro_custo: normalizeOptionalText(form.centro_custo_nome, TEXT_LIMITS.centro_custo),
    aplicacoes: normalizeOptionalText(form.aplicacoes, TEXT_LIMITS.aplicacoes),
    link_referencia: normalizeSafeUrl(form.link_referencia),
    fornecedor_nome: normalizeOptionalText(form.fornecedor_nome, TEXT_LIMITS.fornecedor_nome),
    fornecedor_contato: normalizeOptionalText(form.fornecedor_contato, TEXT_LIMITS.fornecedor_contato),
    solicitante_id: form.solicitante_id || null,
    solicitante: normalizeOptionalText(form.solicitante_nome, TEXT_LIMITS.solicitante),
    status_geral: 'nova',
    status_cotacao: 'nao_iniciado',
    status_pedido: 'nao_digitado',
    status_transporte: 'producao_separacao',
    data_solicitacao: new Date().toISOString()
  }
}

export async function createPublicSolicitacao(form) {
  const payload = buildPublicSolicitacaoPayload(form)

  if (!payload.descricao) {
    throw new Error('Descrição do item é obrigatória.')
  }

  if (!payload.solicitante_id) {
    throw new Error('Selecione o solicitante.')
  }

  if (!payload.centro_custo_id) {
    throw new Error('Selecione o centro de custo.')
  }

  if (!payload.quantidade || payload.quantidade <= 0) {
    throw new Error('Quantidade deve ser maior que zero.')
  }

  const { data: rpcData, error: rpcError } = await supabase
    .rpc('criar_solicitacao_compra_publica', {
      p_descricao: payload.descricao,
      p_quantidade: payload.quantidade,
      p_prioridade: payload.prioridade,
      p_previsao_desejada: payload.previsao_desejada,
      p_centro_custo_id: payload.centro_custo_id,
      p_aplicacoes: payload.aplicacoes,
      p_link_referencia: payload.link_referencia,
      p_fornecedor_nome: payload.fornecedor_nome,
      p_fornecedor_contato: payload.fornecedor_contato,
      p_solicitante_id: payload.solicitante_id
    })

  if (!rpcError) {
    const result = Array.isArray(rpcData) ? rpcData[0] : rpcData

    if (!result?.codigo) {
      throw new Error('Não foi possível gerar o código da solicitação.')
    }

    return result
  }

  throw rpcError
}

export async function getPublicSolicitacaoStatus(codigo) {
  const normalizedCode = normalizeText(codigo, TEXT_LIMITS.codigo).replace(/\D/g, '')
  if (!normalizedCode) {
    throw new Error('Informe o código da solicitação.')
  }

  const { data, error } = await supabase
    .rpc('buscar_solicitacao_compra_publica', {
      p_codigo: normalizedCode
    })

  if (error) throw error

  const result = Array.isArray(data) ? data[0] : data

  if (!result) {
    throw new Error('Solicitação não encontrada.')
  }

  return result
}

export async function listPublicSolicitacoesStatus() {
  const { data, error } = await supabase
    .rpc('listar_solicitacoes_compra_publica')

  if (error) {
    if (String(error.message || '').includes('listar_solicitacoes_compra_publica')) {
      return []
    }

    throw error
  }

  const solicitacoes = (data || []).filter(
    (item) => !('visivel_publico' in item) || isPublicVisible(item.visivel_publico)
  )
  const precisaCompletarDados = solicitacoes.some(
    (item) => !item.solicitante || !item.centro_custo || !('previsao_desejada' in item)
  )

  if (!precisaCompletarDados) {
    return solicitacoes
  }

  const detalhes = await Promise.all(
    solicitacoes.map(async (item) => {
      try {
        const detalhe = await getPublicSolicitacaoStatus(item.codigo)
        return { ...item, ...detalhe }
      } catch {
        return item
      }
    })
  )

  return detalhes
}

export async function listSolicitacoesCompra() {
  const { data, error } = await supabase
    .from(SOLICITACOES_TABLE)
    .select(`
      *,
      produtos (
        id,
        cod,
        nome
      ),
      solicitantes_compra (
        id,
        nome,
        centro_custo_id
      ),
      centros_custo (
        id,
        nome,
        codigo
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createSolicitacaoCompra(form) {
  const payload = {
    descricao: normalizeText(form.descricao, TEXT_LIMITS.descricao),
    quantidade: normalizeQuantidade(form.quantidade),
    prioridade: normalizeOption(form.prioridade, VALID_OPTIONS.prioridade, 'media'),
    previsao_desejada: form.previsao_desejada || null,
    centro_custo_id: form.centro_custo_id || null,
    aplicacoes: normalizeOptionalText(form.aplicacoes, TEXT_LIMITS.aplicacoes),
    link_referencia: normalizeSafeUrl(form.link_referencia),
    fornecedor_nome: normalizeOptionalText(form.fornecedor_nome, TEXT_LIMITS.fornecedor_nome),
    fornecedor_contato: normalizeOptionalText(form.fornecedor_contato, TEXT_LIMITS.fornecedor_contato),
    solicitante_id: form.solicitante_id || null,
    status_geral: normalizeOption(form.status_geral, VALID_OPTIONS.status_geral, 'nova'),
    status_cotacao: normalizeOption(form.status_cotacao, VALID_OPTIONS.status_cotacao, 'nao_iniciado'),
    status_pedido: normalizeOption(form.status_pedido, VALID_OPTIONS.status_pedido, 'nao_digitado'),
    status_transporte: normalizeOption(form.status_transporte, VALID_OPTIONS.status_transporte, 'producao_separacao'),
    produto_id: form.produto_id || null,
    data_solicitacao: new Date().toISOString()
  }

  if (!payload.descricao) {
    throw new Error('Descrição do item é obrigatória.')
  }

  if (!payload.solicitante_id) {
    throw new Error('Selecione o solicitante.')
  }

  if (!payload.centro_custo_id) {
    throw new Error('Selecione o centro de custo.')
  }

  if (!payload.quantidade || payload.quantidade <= 0) {
    throw new Error('Quantidade deve ser maior que zero.')
  }

  const { data, error } = await supabase
    .from(SOLICITACOES_TABLE)
    .insert(payload)
    .select(`
      *,
      produtos (
        id,
        cod,
        nome
      ),
      solicitantes_compra (
        id,
        nome,
        centro_custo_id
      ),
      centros_custo (
        id,
        nome,
        codigo
      )
    `)
    .single()

  if (error) throw error
  return data
}

export async function updateSolicitacaoCompra(id, updates) {
  if (!id) throw new Error('ID e obrigatorio.')

  const normalizedUpdates = {
    ...updates,
    descricao: updates.descricao === undefined ? updates.descricao : normalizeText(updates.descricao, TEXT_LIMITS.descricao),
    solicitante: updates.solicitante_nome !== undefined
      ? normalizeOptionalText(updates.solicitante_nome, TEXT_LIMITS.solicitante)
      : updates.solicitante === undefined
        ? updates.solicitante
        : normalizeOptionalText(updates.solicitante, TEXT_LIMITS.solicitante),
    centro_custo: updates.centro_custo_nome !== undefined
      ? normalizeOptionalText(updates.centro_custo_nome, TEXT_LIMITS.centro_custo)
      : updates.centro_custo === undefined
        ? updates.centro_custo
        : normalizeOptionalText(updates.centro_custo, TEXT_LIMITS.centro_custo),
    aplicacoes: updates.aplicacoes === undefined ? updates.aplicacoes : normalizeOptionalText(updates.aplicacoes, TEXT_LIMITS.aplicacoes),
    link_referencia: updates.link_referencia === undefined ? updates.link_referencia : normalizeSafeUrl(updates.link_referencia)
  }

  delete normalizedUpdates.solicitante_nome
  delete normalizedUpdates.centro_custo_nome

  if ('fornecedor_nome' in normalizedUpdates) {
    normalizedUpdates.fornecedor_nome = normalizeOptionalText(normalizedUpdates.fornecedor_nome, TEXT_LIMITS.fornecedor_nome)
  }

  if ('fornecedor_contato' in normalizedUpdates) {
    normalizedUpdates.fornecedor_contato = normalizeOptionalText(normalizedUpdates.fornecedor_contato, TEXT_LIMITS.fornecedor_contato)
  }

  if ('prioridade' in normalizedUpdates) {
    normalizedUpdates.prioridade = normalizeOption(normalizedUpdates.prioridade, VALID_OPTIONS.prioridade, 'media')
  }

  if ('status_geral' in normalizedUpdates) {
    normalizedUpdates.status_geral = normalizeOption(normalizedUpdates.status_geral, VALID_OPTIONS.status_geral, 'nova')
  }

  if ('status_cotacao' in normalizedUpdates) {
    normalizedUpdates.status_cotacao = normalizeOption(normalizedUpdates.status_cotacao, VALID_OPTIONS.status_cotacao, 'nao_iniciado')
  }

  if ('status_pedido' in normalizedUpdates) {
    normalizedUpdates.status_pedido = normalizeOption(normalizedUpdates.status_pedido, VALID_OPTIONS.status_pedido, 'nao_digitado')
  }

  if ('status_transporte' in normalizedUpdates) {
    normalizedUpdates.status_transporte = normalizeOption(normalizedUpdates.status_transporte, VALID_OPTIONS.status_transporte, 'producao_separacao')
  }

  if ('valor_unitario' in normalizedUpdates) {
    normalizedUpdates.valor_unitario = parseDecimalValue(normalizedUpdates.valor_unitario)
  }

  if ('quantidade' in normalizedUpdates) {
    normalizedUpdates.quantidade = normalizeQuantidade(normalizedUpdates.quantidade)
  }

  if ('valor_total' in normalizedUpdates) {
    normalizedUpdates.valor_total = parseDecimalValue(normalizedUpdates.valor_total)
  }

  const { data, error } = await supabase
    .from(SOLICITACOES_TABLE)
    .update(normalizedUpdates)
    .eq('id', id)
    .select(`
      *,
      produtos (
        id,
        cod,
        nome
      ),
      solicitantes_compra (
        id,
        nome,
        centro_custo_id
      ),
      centros_custo (
        id,
        nome,
        codigo
      )
    `)
    .single()

  if (error) throw error
  return data
}

export async function deleteSolicitacaoCompra(id) {
  if (!id) throw new Error('ID e obrigatorio.')

  const { error } = await supabase
    .from(SOLICITACOES_TABLE)
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function listPublicSolicitantesCompra() {
  const { data, error } = await supabase
    .from(SOLICITANTES_TABLE)
    .select(`
      id,
      nome,
      centro_custo_id,
      centros_custo (
        id,
        nome,
        codigo
      )
    `)
    .eq('ativo', true)
    .order('nome', { ascending: true })

  if (error) throw error
  return data || []
}

export async function listPublicCentrosCusto() {
  const { data, error } = await supabase
    .from(CENTROS_CUSTO_TABLE)
    .select('id, nome, codigo')
    .eq('ativo', true)
    .order('nome', { ascending: true })

  if (error) throw error
  return data || []
}

export async function listSolicitantesCompra() {
  const { data, error } = await supabase
    .from(SOLICITANTES_TABLE)
    .select('*')
    .order('nome', { ascending: true })

  if (error) throw error
  return data || []
}

export async function listCentrosCusto() {
  const { data, error } = await supabase
    .from(CENTROS_CUSTO_TABLE)
    .select('*')
    .order('nome', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createSolicitanteCompra(form) {
  const { data, error } = await supabase
    .from(SOLICITANTES_TABLE)
    .insert({
      nome: normalizeText(form.nome, TEXT_LIMITS.nome),
      centro_custo_id: form.centro_custo_id || null,
      ativo: form.ativo ?? true
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSolicitanteCompra(id, updates) {
  const { data, error } = await supabase
    .from(SOLICITANTES_TABLE)
    .update({
      ...updates,
      nome: updates.nome === undefined ? updates.nome : normalizeText(updates.nome, TEXT_LIMITS.nome),
      centro_custo_id: updates.centro_custo_id || null
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteSolicitanteCompra(id) {
  const { error } = await supabase
    .from(SOLICITANTES_TABLE)
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function createCentroCusto(form) {
  const { data, error } = await supabase
    .from(CENTROS_CUSTO_TABLE)
    .insert({
      nome: normalizeText(form.nome, TEXT_LIMITS.nome),
      codigo: normalizeOptionalText(form.codigo, TEXT_LIMITS.codigo),
      ativo: form.ativo ?? true
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateCentroCusto(id, updates) {
  const { data, error } = await supabase
    .from(CENTROS_CUSTO_TABLE)
    .update({
      ...updates,
      nome: updates.nome === undefined ? updates.nome : normalizeText(updates.nome, TEXT_LIMITS.nome),
      codigo: updates.codigo === undefined ? updates.codigo : normalizeOptionalText(updates.codigo, TEXT_LIMITS.codigo)
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteCentroCusto(id) {
  const { error } = await supabase
    .from(CENTROS_CUSTO_TABLE)
    .delete()
    .eq('id', id)

  if (error) throw error
}
