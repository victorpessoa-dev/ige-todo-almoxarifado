import { supabase } from '@/lib/supabase/client'
import { authenticatedFetch } from '@/lib/api/authenticated-fetch'
import { createSolicitacaoCompra } from '@/lib/services/solicitacoes-service'

const REVISOES_TABLE = 'revisoes_estoque'
const ITEMS_TABLE = 'revisoes_estoque_itens'

function nextExecution({ horario, intervalo_dias = 1, dias_bloqueados = [] }) {
  const [hours, minutes] = String(horario || '09:00').split(':').map(Number)
  const next = new Date()
  next.setSeconds(0, 0)
  next.setHours(hours || 0, minutes || 0, 0, 0)
  if (next <= new Date()) next.setDate(next.getDate() + Math.max(1, Number(intervalo_dias) || 1))
  const blocked = new Set((dias_bloqueados || []).map(Number))
  while (blocked.has(next.getDay())) next.setDate(next.getDate() + 1)
  return next.toISOString()
}

function normalizeCategories(value) {
  const values = Array.isArray(value) ? value : [value]
  return [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))]
}

async function currentUserId() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!user) throw new Error('Usuário não autenticado.')
  return user.id
}

export async function listRotinasRevisao() {
  const { data, error } = await supabase
    .from('rotinas_revisao')
    .select('*, itens_checklist_revisao (*)')
    .order('proxima_execucao')
  if (error) throw error
  return data || []
}

export async function saveRotinaRevisao(form, id = null) {
  const userId = await currentUserId()
  const payload = {
    nome: String(form.nome || '').trim(),
    tipo: form.tipo,
    categorias: form.tipo === 'produtos' ? normalizeCategories(form.categorias?.length ? form.categorias : form.categoria) : [],
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
    return data
  }

  const { data, error } = await supabase.from('rotinas_revisao').insert({
    ...payload,
    user_id: userId,
    proxima_execucao: nextExecution(payload)
  }).select().single()
  if (error) throw error
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
  return data || []
}

export async function deleteRotinaRevisao(id) {
  const { error } = await supabase.from('rotinas_revisao').delete().eq('id', id)
  if (error) throw error
}

export async function processarRotinasRevisao() {
  const response = await authenticatedFetch('/api/revisoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'processar' }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Não foi possível processar as rotinas.')
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
  const { data, error } = await supabase
    .from(REVISOES_TABLE)
    .select('*, rotinas_revisao (*), revisoes_estoque_itens (*, produtos (id, cod, nome, estoque, min, max))')
    .in('status', ['pendente', 'em_andamento', 'atrasada'])
    .order('agendada_para')
  if (error) throw error
  return data || []
}

export async function updateReviewItem(itemId, status, observacao = '') {
  const userId = await currentUserId()
  const { data: item, error: itemError } = await supabase.from(ITEMS_TABLE).select('revisao_id').eq('id', itemId).single()
  if (itemError) throw itemError
  const { error: reviewError } = await supabase.from(REVISOES_TABLE).update({ status: 'em_andamento', iniciada_em: new Date().toISOString() }).eq('id', item.revisao_id).eq('status', 'pendente')
  if (reviewError) throw reviewError
  const { error } = await supabase.from(ITEMS_TABLE).update({ status, observacao: String(observacao || '').trim() || null, revisado_em: new Date().toISOString(), revisado_por: userId }).eq('id', itemId)
  if (error) throw error
}

export async function concluirRevisao(id) {
  const response = await authenticatedFetch('/api/revisoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'concluir', revisaoId: id }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir a revisão.')
}

export async function adiarRevisao(id, minutes) {
  const response = await authenticatedFetch('/api/revisoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'adiar', revisaoId: id, minutos: minutes }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Não foi possível adiar a revisão.')
}

export async function registrarNotificacaoRevisao(id, repeatMinutes = 10) {
  const response = await authenticatedFetch('/api/revisoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'notificar', revisaoId: id, minutos: repeatMinutes }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Não foi possível registrar a notificação.')
}
export async function listPendenciasReposicao() {
  const { data, error } = await supabase.from(ITEMS_TABLE)
    .select('*, revisoes_estoque!inner (id, user_id, status, rotinas_revisao (nome)), produtos (id, nome, estoque, min, max)')
    .in('status', ['repor', 'em_falta'])
    .is('solicitacao_item_id', null)
  if (error) throw error
  return data || []
}

async function limparRevisoesConcluidas() {
  const response = await authenticatedFetch('/api/revisoes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'limpar' }) })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Não foi possível limpar as revisões concluídas.')
}
export async function addPendenciasToSolicitacao(solicitacaoId, pendencias) {
  for (const item of pendencias) {
    const { data: exists, error: existsError } = await supabase.from('solicitacoes_compra_itens')
      .select('id').eq('solicitacao_id', solicitacaoId)
      .eq(item.produto_id ? 'produto_id' : 'nome_item', item.produto_id || item.nome_snapshot).maybeSingle()
    if (existsError) throw existsError
    if (exists) throw new Error(`${item.nome_snapshot} já pertence a esta solicitação.`)
    const { data: inserted, error } = await supabase.from('solicitacoes_compra_itens').insert({
      solicitacao_id: solicitacaoId,
      produto_id: item.produto_id || null,
      nome_item: item.nome_snapshot,
      quantidade: 1,
      prioridade: item.status === 'em_falta' ? 'urgente' : 'alta'
    }).select('id').single()
    if (error) throw error
    const { error: linkError } = await supabase.from(ITEMS_TABLE).update({ solicitacao_item_id: inserted.id }).eq('id', item.id)
    if (linkError) throw linkError
  }
  await limparRevisoesConcluidas()
}

export async function createSolicitacaoFromPendencias(form, pendencias) {
  if (!pendencias.length) throw new Error('Selecione ao menos um item.')
  const first = pendencias[0]
  const solicitacao = await createSolicitacaoCompra({
    ...form,
    nome_item: form.nome_item || form.nome_lista || `Reposição: ${first.nome_snapshot}`,
    quantidade: 1,
    produto_id: null,
    prioridade: pendencias.some((item) => item.status === 'em_falta') ? 'urgente' : (form.prioridade || 'alta')
  })
  await addPendenciasToSolicitacao(solicitacao.id, pendencias)
  return solicitacao
}