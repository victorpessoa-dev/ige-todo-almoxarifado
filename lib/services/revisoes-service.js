import { supabase } from '@/lib/supabase/client'
import { authenticatedFetch } from '@/lib/api/authenticated-fetch'
import { createSolicitacaoCompra } from '@/lib/services/solicitacoes-service'
import { deleteMemoryCache, getMemoryCache, setMemoryCache } from '@/lib/cache/memory-cache'
import { getCompraQuantidade, makeReposicaoBlocks, makeReposicaoTitle } from '@/lib/inventory/replenishment'
import { normalizeReviewCategories } from '@/lib/revisoes/categories'
import { calculateNextReviewExecution, calculateNextReviewDay } from '@/lib/revisoes/priority'

const REVISOES_TABLE = 'revisoes_estoque'
const ITEMS_TABLE = 'revisoes_estoque_itens'
const REVIEW_CACHE_TTL = 45 * 1000
const ROTINAS_CACHE_KEY = 'revisoes-rotinas'
const ABERTAS_CACHE_KEY = 'revisoes-abertas'
const PENDENCIAS_CACHE_KEY = 'revisoes-pendencias-reposicao'

function clearReviewCaches() {
  deleteMemoryCache(ROTINAS_CACHE_KEY)
  deleteMemoryCache(ABERTAS_CACHE_KEY)
  deleteMemoryCache(PENDENCIAS_CACHE_KEY)
}

function nextExecution({ horario, intervalo_dias = 1, dias_bloqueados = [] }) {
  return calculateNextReviewExecution({
    horario: String(horario || '09:00'),
    intervaloDias: intervalo_dias,
    diasBloqueados: dias_bloqueados || []
  }).toISOString()
}

function getReviewNextDay(review) {
  const scheduled = review?.agendada_para ? new Date(review.agendada_para) : new Date()
  const base = Number.isNaN(scheduled.getTime()) ? new Date() : scheduled
  const horario = review?.rotinas_revisao?.horario || `${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}`
  return calculateNextReviewDay({
    base,
    horario,
    diasBloqueados: review?.rotinas_revisao?.dias_bloqueados || []
  }).toISOString()
}

function getPendenciaProduto(item) {
  return item.produtos || {
    id: item.produto_id || null,
    cod: '',
    nome: item.nome_snapshot,
    categoria: 'Sem categoria',
    estoque: 0,
    min: 0,
    max: 1
  }
}

async function withCurrentProducts(items) {
  const productIds = [...new Set(items.map((item) => item.produto_id || item.produtos?.id).filter(Boolean))]
  if (!productIds.length) return items

  const { data, error } = await supabase.from('produtos').select('id, cod, nome, categoria, estoque, min, max').in('id', productIds)
  if (error) throw error
  const productsById = new Map((data || []).map((product) => [product.id, product]))
  return items.map((item) => ({
    ...item,
    produtos: productsById.get(item.produto_id || item.produtos?.id) || item.produtos
  }))
}


async function currentUserId() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('Usuário não autenticado.')
  return user.id
}

export async function listRotinasRevisao() {
  const cached = getMemoryCache(ROTINAS_CACHE_KEY)
  if (cached) return cached

  const { data, error } = await supabase
    .from('rotinas_revisao')
    .select('*, itens_checklist_revisao (*)')
    .order('proxima_execucao')
  if (error) throw error
  return setMemoryCache(ROTINAS_CACHE_KEY, data || [], REVIEW_CACHE_TTL)
}

export async function saveRotinaRevisao(form, id = null) {
  const userId = await currentUserId()
  const payload = {
    nome: String(form.nome || '').trim(),
    tipo: form.tipo,
    categorias: form.tipo === 'produtos' ? normalizeReviewCategories(form.categorias?.length ? form.categorias : form.categoria) : [],
    categoria: null,
    horario: form.horario || '09:00',
    frequencia: form.frequencia || 'diaria',
    intervalo_dias: form.frequencia === 'semanal' ? 7 : Math.max(1, Number(form.intervalo_dias) || 1),
    dias_bloqueados: (form.dias_bloqueados || []).map(Number),
    foco: form.foco || 'inteligente',
    repetir_notificacao_minutos: Math.max(5, Number(form.repetir_notificacao_minutos) || 10),
    janela_revisao: Math.max(30, Number(form.janela_revisao) || 480),
    ativo: form.ativo !== false
  }
  if (payload.tipo === 'produtos') payload.categoria = payload.categorias[0] || null
  if (!payload.nome) throw new Error('Informe o nome da rotina.')
  if (payload.tipo === 'produtos' && !payload.categoria) throw new Error('Selecione ao menos uma categoria existente.')

  if (id) {
    const { data, error } = await supabase.from('rotinas_revisao').update(payload).eq('id', id).select().single()
    if (error) throw error
    clearReviewCaches()
    return data
  }

  const { data, error } = await supabase.from('rotinas_revisao').insert({
    ...payload,
    user_id: userId,
    proxima_execucao: nextExecution(payload)
  }).select().single()
  if (error) throw error
  clearReviewCaches()
  return data
}

export async function replaceChecklistItems(rotinaId, items) {
  const { error: deleteError } = await supabase.from('itens_checklist_revisao').delete().eq('rotina_id', rotinaId)
  if (deleteError) throw deleteError
  const payload = items
    .map((item, ordem) => ({ rotina_id: rotinaId, nome: String(item.nome || '').trim(), descricao: String(item.descricao || '').trim() || null, ordem, ativo: item.ativo !== false }))
    .filter((item) => item.nome)
  if (!payload.length) return []
  const { data, error } = await supabase.from('itens_checklist_revisao').insert(payload).select()
  if (error) throw error
  clearReviewCaches()
  return data || []
}

export async function deleteRotinaRevisao(id) {
  const { error } = await supabase.from('rotinas_revisao').delete().eq('id', id)
  if (error) throw error
  clearReviewCaches()
}

export async function processarRotinasRevisao() {
  const response = await authenticatedFetch('/api/revisoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'processar' }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Não foi possível processar as rotinas.')
  clearReviewCaches()
}

export async function listRevisoesCalendario() {
  const [{ data: reviews, error: reviewsError }, { data: routines, error: routinesError }] = await Promise.all([
    supabase.from(REVISOES_TABLE).select('id, rotina_id, agendada_para, status, rotinas_revisao (nome, tipo), revisoes_estoque_itens (status)').order('agendada_para', { ascending: true }),
    supabase.from('rotinas_revisao').select('id, nome, tipo, proxima_execucao').eq('ativo', true).order('proxima_execucao', { ascending: true })
  ])
  if (reviewsError) throw reviewsError
  if (routinesError) throw routinesError
  const openRoutineIds = new Set((reviews || []).filter((review) => ['pendente', 'em_andamento', 'atrasada'].includes(review.status)).map((review) => review.rotina_id))
  const scheduled = (routines || []).filter((routine) => routine.proxima_execucao && !openRoutineIds.has(routine.id)).map((routine) => ({
    id: 'rotina-' + routine.id,
    rotina_id: routine.id,
    agendada_para: routine.proxima_execucao,
    status: 'agendada',
    rotinas_revisao: { nome: routine.nome, tipo: routine.tipo },
    revisoes_estoque_itens: []
  }))
  return [...(reviews || []), ...scheduled].sort((a, b) => new Date(a.agendada_para) - new Date(b.agendada_para))
}
export async function listRevisoesAbertas() {
  const cached = getMemoryCache(ABERTAS_CACHE_KEY)
  if (cached) return cached

  const { data, error } = await supabase
    .from(REVISOES_TABLE)
    .select('*, rotinas_revisao (*), revisoes_estoque_itens (*, produtos (id, cod, nome, estoque, min, max))')
    .in('status', ['pendente', 'em_andamento', 'atrasada'])
    .order('agendada_para')
  if (error) throw error
  return setMemoryCache(ABERTAS_CACHE_KEY, data || [], REVIEW_CACHE_TTL)
}

export async function updateReviewItem(itemId, status, observacao = '', quantidadeContada = null) {
  const userId = await currentUserId()
  const { data: item, error: itemError } = await supabase.from(ITEMS_TABLE).select('revisao_id, produto_id').eq('id', itemId).single()
  if (itemError) throw itemError
  const { error: reviewError } = await supabase.from(REVISOES_TABLE).update({ status: 'em_andamento', iniciada_em: new Date().toISOString() }).eq('id', item.revisao_id).eq('status', 'pendente')
  if (reviewError) throw reviewError
  const quantidade = quantidadeContada === null || quantidadeContada === '' ? null : Math.max(0, Number(quantidadeContada) || 0)
  const { error } = await supabase.from(ITEMS_TABLE).update({ status, observacao: String(observacao || '').trim() || null, quantidade_contada: quantidade, revisado_em: new Date().toISOString(), revisado_por: userId }).eq('id', itemId)
  if (error) throw error
  clearReviewCaches()
}

export async function concluirRevisao(id) {
  const response = await authenticatedFetch('/api/revisoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'concluir', revisaoId: id }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a revisão.')
  clearReviewCaches()
}

export async function adiarRevisao(id, minutes) {
  const response = await authenticatedFetch('/api/revisoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'adiar', revisaoId: id, minutos: minutes }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Não foi possível adiar a revisão.')
}

export async function moverRevisaoParaProximoDia(id) {
  const response = await authenticatedFetch('/api/revisoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'proximo_dia', revisaoId: id }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Não foi possível mover a revisão para o próximo dia.')
  clearReviewCaches()
  return data
}

export async function registrarNotificacaoRevisao(id, repeatMinutes = 10) {
  const response = await authenticatedFetch('/api/revisoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'notificar', revisaoId: id, minutos: repeatMinutes }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Não foi possível registrar a notificação.')
}
export async function listPendenciasReposicao() {
  const cached = getMemoryCache(PENDENCIAS_CACHE_KEY)
  if (cached) return cached

  const { data, error } = await supabase.from(ITEMS_TABLE)
    .select('*, revisoes_estoque!inner (id, user_id, status, rotinas_revisao (nome)), produtos (id, cod, nome, categoria, estoque, min, max)')
    .in('status', ['repor', 'em_falta'])
    .is('solicitacao_item_id', null)
  if (error) throw error
  return setMemoryCache(PENDENCIAS_CACHE_KEY, data || [], REVIEW_CACHE_TTL)
}

async function limparRevisoesConcluidas() {
  const response = await authenticatedFetch('/api/revisoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'limpar' }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Não foi possível limpar as revisões concluídas.')
}
export async function addPendenciasToSolicitacao(solicitacaoId, pendencias) {
  const currentPendencias = await withCurrentProducts(pendencias)
  for (const item of currentPendencias) {
    const { data: exists, error: existsError } = await supabase.from('solicitacoes_compra_itens')
      .select('id').eq('solicitacao_id', solicitacaoId)
      .eq(item.produto_id ? 'produto_id' : 'nome_item', item.produto_id || item.nome_snapshot).maybeSingle()
    if (existsError) throw existsError
    if (exists) throw new Error(`${item.nome_snapshot} já pertence a esta solicitação.`)
    const { data: inserted, error } = await supabase.from('solicitacoes_compra_itens').insert({
      solicitacao_id: solicitacaoId,
      produto_id: item.produto_id || null,
      nome_item: item.nome_snapshot,
      quantidade: Math.max(1, getCompraQuantidade(getPendenciaProduto(item)) || 1),
      prioridade: item.status === 'em_falta' ? 'urgente' : 'alta'
    }).select('id').single()
    if (error) throw error
    const { error: linkError } = await supabase.from(ITEMS_TABLE).update({ solicitacao_item_id: inserted.id }).eq('id', item.id)
    if (linkError) throw linkError
  }
  await limparRevisoesConcluidas()
  clearReviewCaches()
}

export async function createSolicitacaoFromPendencias(form, pendencias) {
  if (!pendencias.length) throw new Error('Selecione ao menos um item.')

  const currentPendencias = await withCurrentProducts(pendencias)
  const selectedItems = currentPendencias.map((item) => {
    const produto = item.produtos || {
      id: item.produto_id || null,
      cod: '',
      nome: item.nome_snapshot,
      categoria: 'Sem categoria',
      estoque: 0,
      min: 0,
      max: 1
    }

    return {
      ...item,
      produto,
      quantidade: Math.max(1, getCompraQuantidade(produto) || 1)
    }
  })
  const reposicaoBlocks = makeReposicaoBlocks(selectedItems, 500)
  const solicitacoes = []

  for (const block of reposicaoBlocks) {
    const quantidadeTotal = block.items.reduce((total, item) => total + item.quantidade, 0)
    const solicitacao = await createSolicitacaoCompra({
      ...form,
      nome_item: makeReposicaoTitle(block.category),
      descricao: block.descricao,
      quantidade: quantidadeTotal,
      produto_id: null,
      prioridade: block.items.some((item) => item.status === 'em_falta') ? 'urgente' : (form.prioridade || 'alta'),
      aplicacoes: 'Reposicao gerada pela revisao de estoque.'
    })

    await addPendenciasToSolicitacao(solicitacao.id, block.items)
    solicitacoes.push(solicitacao)
  }

  clearReviewCaches()
  return solicitacoes
}