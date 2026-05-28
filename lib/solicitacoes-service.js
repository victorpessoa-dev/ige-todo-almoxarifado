import { supabase } from '@/lib/supabaseClient'

const SOLICITACOES_TABLE = 'solicitacoes_compra'
const SOLICITANTES_TABLE = 'solicitantes_compra'
const CENTROS_CUSTO_TABLE = 'centros_custo'

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
    descricao: form.descricao?.trim(),
    quantidade: Number(form.quantidade || 1),
    prioridade: form.prioridade || 'media',
    previsao_desejada: form.previsao_desejada || null,
    centro_custo_id: form.centro_custo_id || null,
    centro_custo: form.centro_custo_nome?.trim() || null,
    aplicacoes: form.aplicacoes?.trim() || null,
    link_referencia: form.link_referencia?.trim() || null,
    solicitante_id: form.solicitante_id || null,
    solicitante: form.solicitante_nome?.trim() || null,
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
  const normalizedCode = String(codigo || '').replace(/\D/g, '')
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
    descricao: form.descricao?.trim(),
    quantidade: Number(form.quantidade || 0),
    prioridade: form.prioridade || 'media',
    previsao_desejada: form.previsao_desejada || null,
    centro_custo_id: form.centro_custo_id || null,
    aplicacoes: form.aplicacoes?.trim?.() || null,
    link_referencia: form.link_referencia?.trim?.() || null,
    solicitante_id: form.solicitante_id || null,
    status_geral: form.status_geral || 'nova',
    status_cotacao: form.status_cotacao || 'nao_iniciado',
    status_pedido: form.status_pedido || 'nao_digitado',
    status_transporte: form.status_transporte || 'producao_separacao',
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
    descricao: updates.descricao?.trim?.() ?? updates.descricao,
    solicitante: updates.solicitante_nome?.trim?.() ?? updates.solicitante?.trim?.() ?? updates.solicitante,
    centro_custo: updates.centro_custo_nome?.trim?.() ?? updates.centro_custo?.trim?.() ?? updates.centro_custo,
    aplicacoes: updates.aplicacoes?.trim?.() ?? updates.aplicacoes,
    link_referencia: updates.link_referencia?.trim?.() ?? updates.link_referencia
  }

  delete normalizedUpdates.solicitante_nome
  delete normalizedUpdates.centro_custo_nome

  if ('valor_unitario' in normalizedUpdates) {
    normalizedUpdates.valor_unitario = parseDecimalValue(normalizedUpdates.valor_unitario)
  }

  if ('quantidade' in normalizedUpdates) {
    normalizedUpdates.quantidade = Number(normalizedUpdates.quantidade || 0)
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
      nome: form.nome?.trim(),
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
      nome: updates.nome?.trim?.() ?? updates.nome,
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
      nome: form.nome?.trim(),
      codigo: form.codigo?.trim() || null,
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
      nome: updates.nome?.trim?.() ?? updates.nome,
      codigo: updates.codigo?.trim?.() ?? updates.codigo
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
