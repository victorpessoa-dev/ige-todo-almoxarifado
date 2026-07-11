/**
 * Servico de solicitacoes de compra.
 *
 * Centraliza normalizacao, validacao e acesso ao Supabase para o fluxo publico
 * e para o fluxo administrativo de compras, solicitantes e centros de custo.
 */
import { supabase } from '@/lib/supabase/client'
import { getTodayDateInputValue } from '@/lib/date/date-utils'
import {
  deleteMemoryCache,
  getMemoryCache,
  setMemoryCache
} from '@/lib/cache/memory-cache'
import {
  SOLICITACAO_PRIORIDADE_OPTIONS,
  SOLICITACAO_STATUS_GERAL_OPTIONS
} from '@/constants/solicitacoes-config'

const SOLICITACOES_TABLE = 'solicitacoes_compra'
const SOLICITANTES_TABLE = 'solicitantes_compra'
const CENTROS_CUSTO_TABLE = 'centros_custo'

const PUBLIC_SOLICITACOES_CACHE_KEY = 'public-solicitacoes-status'
const PUBLIC_SOLICITANTES_CACHE_KEY = 'public-solicitantes-compra'
const PUBLIC_CENTROS_CUSTO_CACHE_KEY = 'public-centros-custo'
const PUBLIC_LIST_CACHE_TTL = 60_000
const PUBLIC_REFERENCE_CACHE_TTL = 5 * 60_000

const TEXT_LIMITS = {
  nome_item: 160,
  descricao: 500,
  aplicacoes: 1000,
  link_referencia: 500,
  fornecedor_nome: 160,
  fornecedor_contato: 200,
  codigo: 32,
  nome: 160
}

const VALID_OPTIONS = {
  prioridade: new Set(SOLICITACAO_PRIORIDADE_OPTIONS.map((option) => option.value)),
  status_geral: new Set(SOLICITACAO_STATUS_GERAL_OPTIONS.map((option) => option.value))
}

/**
 * Normaliza texto livre removendo caracteres de controle e limitando tamanho.
 *
 * Essa barreira evita payloads com quebras invisiveis ou textos maiores que o
 * banco e as telas esperam receber.
 */
function normalizeText(value, maxLength) {
  if (value === null || value === undefined) return ''

  return String(value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

/**
 * Normaliza texto opcional retornando null quando o campo fica vazio.
 */
function normalizeOptionalText(value, maxLength) {
  const text = normalizeText(value, maxLength)
  return text || null
}

/**
 * Normaliza campos longos preservando quebras de linha uteis.
 *
 * Usado em descricao e aplicacoes para manter leitura humana sem permitir
 * caracteres de controle.
 */
function normalizeMultilineText(value, maxLength) {
  if (value === null || value === undefined) return ''

  return String(value)
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength)
}

/**
 * Normaliza texto multiline opcional.
 */
function normalizeOptionalMultilineText(value, maxLength) {
  const text = normalizeMultilineText(value, maxLength)
  return text || null
}

/**
 * Valida links informados pelo usuario.
 *
 * Apenas HTTP/HTTPS e permitido para evitar protocolos inseguros em links de
 * referencia.
 */
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

/**
 * Garante que valores de select pertencam as opcoes de negocio conhecidas.
 */
function normalizeOption(value, options, fallback) {
  const normalizedValue = normalizeText(value, 80)
  return options.has(normalizedValue) ? normalizedValue : fallback
}

/**
 * Valida quantidade operacional aceita pelos fluxos de compra.
 */
function normalizeQuantidade(value) {
  const quantidade = Number(value || 0)
  if (!Number.isFinite(quantidade) || quantidade <= 0 || quantidade > 999999) {
    return 0
  }

  return quantidade
}

/**
 * Converte valores monetarios digitados com ponto ou virgula para numero.
 */
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

/**
 * Completa valor unitario ou total quando apenas um dos dois foi informado.
 *
 * @param {Object} payload Dados da solicitacao em preparacao.
 * @returns {Object} O mesmo payload com campos monetarios coerentes.
 */
function completeMoneyPayload(payload) {
  // Mantem valor unitario e total coerentes quando o usuario informa apenas um deles.
  const quantidade = Number(payload.quantidade || 0)
  const valorUnitario = parseDecimalValue(payload.valor_unitario)
  const valorTotal = parseDecimalValue(payload.valor_total)

  if (quantidade > 0 && valorUnitario > 0 && !valorTotal) {
    payload.valor_total = quantidade * valorUnitario
  }

  if (quantidade > 0 && valorTotal > 0 && !valorUnitario) {
    payload.valor_unitario = valorTotal / quantidade
  }

  return payload
}

/**
 * Interpreta o campo legado de visibilidade publica.
 */
function isPublicVisible(value) {
  return value === true || value === 1 || value === '1'
}

/**
 * Monta o payload permitido para criacao publica de solicitacao.
 *
 * @param {Object} form Dados do formulario publico.
 * @returns {Object} Payload normalizado para a RPC publica.
 */
export function buildPublicSolicitacaoPayload(form) {
  return {
    nome_item: normalizeText(form.nome_item, TEXT_LIMITS.nome_item),
    descricao: normalizeOptionalMultilineText(form.descricao, TEXT_LIMITS.descricao),
    quantidade: normalizeQuantidade(form.quantidade || 1),
    prioridade: normalizeOption(form.prioridade, VALID_OPTIONS.prioridade, 'media'),
    previsao_desejada: form.previsao_desejada || null,
    centro_custo_id: form.centro_custo_id || null,
    aplicacoes: normalizeOptionalMultilineText(form.aplicacoes, TEXT_LIMITS.aplicacoes),
    link_referencia: normalizeSafeUrl(form.link_referencia),
    fornecedor_nome: normalizeOptionalText(form.fornecedor_nome, TEXT_LIMITS.fornecedor_nome),
    fornecedor_contato: normalizeOptionalText(form.fornecedor_contato, TEXT_LIMITS.fornecedor_contato),
    solicitante_id: form.solicitante_id || null,
    status_geral: 'nova'
  }
}

/**
 * Cria uma solicitacao pelo fluxo publico.
 *
 * O publico nao recebe permissao direta de INSERT na tabela; a criacao passa
 * por RPC com validacoes e RLS controlados no Supabase.
 */
export async function createPublicSolicitacao(form) {
  // Fluxo publico deve passar pela RPC para respeitar validacoes e RLS do banco.
  const payload = buildPublicSolicitacaoPayload(form)

  if (!payload.nome_item) {
    throw new Error('Nome do item e obrigatorio.')
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

  const { data: rpcData, error: rpcError } = await supabase
    .rpc('criar_solicitacao_compra_publica', {
      p_nome_item: payload.nome_item,
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

    deleteMemoryCache(PUBLIC_SOLICITACOES_CACHE_KEY)
    return result
  }

  throw rpcError
}

/**
 * Consulta o status publico de uma solicitacao pelo codigo.
 *
 * A RPC retorna apenas campos seguros para acompanhamento externo.
 */
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

/**
 * Lista solicitacoes visiveis ao publico.
 *
 * Usa cache curto para reduzir consultas repetidas sem comprometer a percepcao
 * de atualizacao do usuario.
 */
export async function listPublicSolicitacoesStatus() {
  // Lista publica usa cache curto porque e consultada com frequencia e nao exige tempo real absoluto.
  const cachedSolicitacoes = getMemoryCache(PUBLIC_SOLICITACOES_CACHE_KEY)
  if (cachedSolicitacoes) return cachedSolicitacoes

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
    return setMemoryCache(
      PUBLIC_SOLICITACOES_CACHE_KEY,
      solicitacoes,
      PUBLIC_LIST_CACHE_TTL
    )
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

  return setMemoryCache(
    PUBLIC_SOLICITACOES_CACHE_KEY,
    detalhes,
    PUBLIC_LIST_CACHE_TTL
  )
}

/**
 * Lista solicitacoes completas para a area administrativa.
 */
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

/**
 * Cria solicitacao pelo fluxo administrativo.
 *
 * Aplica as mesmas normalizacoes do fluxo publico, mas permite campos internos
 * como status, fornecedor, valores e produto vinculado.
 */
export async function createSolicitacaoCompra(form) {
  const payload = {
    nome_item: normalizeText(form.nome_item, TEXT_LIMITS.nome_item),
    descricao: normalizeOptionalMultilineText(form.descricao, TEXT_LIMITS.descricao),
    quantidade: normalizeQuantidade(form.quantidade),
    prioridade: normalizeOption(form.prioridade, VALID_OPTIONS.prioridade, 'media'),
    previsao_desejada: form.previsao_desejada || null,
    centro_custo_id: form.centro_custo_id || null,
    aplicacoes: normalizeOptionalMultilineText(form.aplicacoes, TEXT_LIMITS.aplicacoes),
    link_referencia: normalizeSafeUrl(form.link_referencia),
    fornecedor_nome: normalizeOptionalText(form.fornecedor_nome, TEXT_LIMITS.fornecedor_nome),
    fornecedor_contato: normalizeOptionalText(form.fornecedor_contato, TEXT_LIMITS.fornecedor_contato),
    solicitante_id: form.solicitante_id || null,
    status_geral: normalizeOption(form.status_geral, VALID_OPTIONS.status_geral, 'nova'),
    valor_unitario: parseDecimalValue(form.valor_unitario),
    valor_total: parseDecimalValue(form.valor_total),
    previsao_entrega: form.previsao_entrega || null,
    produto_id: form.produto_id || null
  }

  if (payload.status_geral === 'concluida' && !payload.previsao_entrega) {
    payload.previsao_entrega = getTodayDateInputValue()
  }
  completeMoneyPayload(payload)

  if (!payload.nome_item) {
    throw new Error('Nome do item e obrigatorio.')
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

/**
 * Atualiza uma solicitacao administrativa.
 *
 * Remove campos derivados da interface e normaliza apenas campos presentes no
 * payload para evitar sobrescrever dados sem intencao.
 */
export async function updateSolicitacaoCompra(id, updates) {
  if (!id) throw new Error('ID e obrigatorio.')

  const normalizedUpdates = {
    ...updates,
    nome_item: updates.nome_item === undefined ? updates.nome_item : normalizeText(updates.nome_item, TEXT_LIMITS.nome_item),
    descricao: updates.descricao === undefined ? updates.descricao : normalizeOptionalMultilineText(updates.descricao, TEXT_LIMITS.descricao),
    aplicacoes: updates.aplicacoes === undefined ? updates.aplicacoes : normalizeOptionalMultilineText(updates.aplicacoes, TEXT_LIMITS.aplicacoes),
    link_referencia: updates.link_referencia === undefined ? updates.link_referencia : normalizeSafeUrl(updates.link_referencia)
  }

  delete normalizedUpdates.solicitante_nome
  delete normalizedUpdates.centro_custo_nome

  Object.keys(normalizedUpdates).forEach((key) => {
    if (normalizedUpdates[key] === undefined) {
      delete normalizedUpdates[key]
    }
  })

  if ('nome_item' in normalizedUpdates && !normalizedUpdates.nome_item) {
    throw new Error('Nome do item e obrigatorio.')
  }

  if ('solicitante_id' in normalizedUpdates && !normalizedUpdates.solicitante_id) {
    throw new Error('Selecione o solicitante.')
  }

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

  if ('valor_unitario' in normalizedUpdates) {
    normalizedUpdates.valor_unitario = parseDecimalValue(normalizedUpdates.valor_unitario)
  }

  if ('quantidade' in normalizedUpdates) {
    normalizedUpdates.quantidade = normalizeQuantidade(normalizedUpdates.quantidade)
  }

  if ('valor_total' in normalizedUpdates) {
    normalizedUpdates.valor_total = parseDecimalValue(normalizedUpdates.valor_total)
  }

  completeMoneyPayload(normalizedUpdates)

  if (normalizedUpdates.status_geral === 'concluida' && !normalizedUpdates.previsao_entrega) {
    const { data: currentSolicitacao, error: currentError } = await supabase
      .from(SOLICITACOES_TABLE)
      .select('previsao_entrega')
      .eq('id', id)
      .single()

    if (currentError) throw currentError

    if (!currentSolicitacao?.previsao_entrega) {
      normalizedUpdates.previsao_entrega = getTodayDateInputValue()
    }
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

/**
 * Remove uma solicitacao de compra.
 */
export async function deleteSolicitacaoCompra(id) {
  if (!id) throw new Error('ID e obrigatorio.')

  const { error } = await supabase
    .from(SOLICITACOES_TABLE)
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Lista solicitantes ativos usados no formulario publico.
 */
export async function listPublicSolicitantesCompra() {
  const cachedSolicitantes = getMemoryCache(PUBLIC_SOLICITANTES_CACHE_KEY)
  if (cachedSolicitantes) return cachedSolicitantes

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
  return setMemoryCache(
    PUBLIC_SOLICITANTES_CACHE_KEY,
    data || [],
    PUBLIC_REFERENCE_CACHE_TTL
  )
}

/**
 * Lista centros de custo ativos usados no formulario publico.
 */
export async function listPublicCentrosCusto() {
  const cachedCentrosCusto = getMemoryCache(PUBLIC_CENTROS_CUSTO_CACHE_KEY)
  if (cachedCentrosCusto) return cachedCentrosCusto

  const { data, error } = await supabase
    .from(CENTROS_CUSTO_TABLE)
    .select('id, nome, codigo')
    .eq('ativo', true)
    .order('nome', { ascending: true })

  if (error) throw error
  return setMemoryCache(
    PUBLIC_CENTROS_CUSTO_CACHE_KEY,
    data || [],
    PUBLIC_REFERENCE_CACHE_TTL
  )
}

/**
 * Lista todos os solicitantes para administracao.
 */
export async function listSolicitantesCompra() {
  const { data, error } = await supabase
    .from(SOLICITANTES_TABLE)
    .select('*')
    .order('nome', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Lista todos os centros de custo para administracao.
 */
export async function listCentrosCusto() {
  const { data, error } = await supabase
    .from(CENTROS_CUSTO_TABLE)
    .select('*')
    .order('nome', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Cria solicitante de compra.
 */
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

/**
 * Atualiza solicitante de compra.
 */
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

/**
 * Remove solicitante de compra.
 */
export async function deleteSolicitanteCompra(id) {
  const { error } = await supabase
    .from(SOLICITANTES_TABLE)
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * Cria centro de custo.
 */
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

/**
 * Atualiza centro de custo.
 */
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

/**
 * Remove centro de custo.
 */
export async function deleteCentroCusto(id) {
  const { error } = await supabase
    .from(CENTROS_CUSTO_TABLE)
    .delete()
    .eq('id', id)

  if (error) throw error
}
