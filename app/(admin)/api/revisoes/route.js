import { createClient } from '@supabase/supabase-js'
import { requireApiAuth } from '@/lib/server/api-auth'
import { getReviewCategories } from '@/lib/revisoes/categories'
import { calculateNextReviewExecution, calculateNextReviewDay } from '@/lib/revisoes/priority'

const OPEN_REVIEW_STATUSES = ['pendente', 'em_andamento', 'atrasada']
const REPLENISHMENT_STATUSES = ['repor', 'em_falta']
const TERMINAL_PURCHASE_STATUSES = new Set(['concluida', 'cancelada'])

function createUserClient(token) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
}

function createServiceClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

function nextExecution(routine) {
  return calculateNextReviewExecution({
    base: new Date(routine.proxima_execucao),
    horario: String(routine.horario || '09:00'),
    intervaloDias: routine.frequencia === 'semanal' ? 7 : Math.max(1, Number(routine.intervalo_dias) || 1),
    diasBloqueados: routine.dias_bloqueados || []
  }).toISOString()
}

function nextReviewDay(review) {
  const scheduled = review?.agendada_para ? new Date(review.agendada_para) : new Date()
  const base = Number.isNaN(scheduled.getTime()) ? new Date() : scheduled
  const horario = review?.rotinas_revisao?.horario || `${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}`
  return calculateNextReviewDay({
    base,
    horario,
    diasBloqueados: review?.rotinas_revisao?.dias_bloqueados || []
  }).toISOString()
}

async function listProductsBlockedForReview(client) {
  const { data: purchaseItems, error: purchaseError } = await client
    .from('solicitacoes_compra_itens')
    .select('produto_id, solicitacoes_compra (status_geral)')
  if (purchaseError) throw purchaseError

  const blocked = new Set((purchaseItems || [])
    .filter((item) => item.produto_id && !TERMINAL_PURCHASE_STATUSES.has(item.solicitacoes_compra?.status_geral))
    .map((item) => item.produto_id))

  const { data: pendingReviewItems, error: pendingError } = await client
    .from('revisoes_estoque_itens')
    .select('produto_id')
    .in('status', REPLENISHMENT_STATUSES)
    .is('solicitacao_item_id', null)
  if (pendingError) throw pendingError

  for (const item of pendingReviewItems || []) {
    if (item.produto_id) blocked.add(item.produto_id)
  }

  return blocked
}

async function createReviewForRoutine(client, routine, productsBlockedForReview) {
  const userId = routine.user_id
  const now = new Date().toISOString()
  const { data: openReview, error: openError } = await client
    .from('revisoes_estoque')
    .select('id')
    .eq('rotina_id', routine.id)
    .in('status', OPEN_REVIEW_STATUSES)
    .maybeSingle()
  if (openError) throw openError
  if (openReview) return false

  const { data: review, error: reviewError } = await client
    .from('revisoes_estoque')
    .insert({ user_id: userId, rotina_id: routine.id, agendada_para: routine.proxima_execucao, status: 'pendente', notificar_em: now })
    .select()
    .single()
  if (reviewError) {
    if (reviewError.code === '23505') return false
    throw reviewError
  }

  let items = []
  if (routine.tipo === 'produtos') {
    const categories = getReviewCategories(routine)
    const { data: products, error: productsError } = await client.from('produtos').select('id, nome, estoque, min').in('categoria', categories)
    if (productsError) throw productsError
    items = (products || [])
      .filter((product) => !productsBlockedForReview.has(product.id))
      .filter((product) => routine.foco !== 'estoque_baixo' || Number(product.estoque) <= Number(product.min))
      .map((product) => ({ revisao_id: review.id, produto_id: product.id, nome_snapshot: product.nome }))
  } else {
    items = (routine.itens_checklist_revisao || [])
      .filter((item) => item.ativo)
      .sort((a, b) => a.ordem - b.ordem)
      .map((item) => ({ revisao_id: review.id, checklist_item_id: item.id, nome_snapshot: item.nome }))
  }

  if (items.length) {
    const { error: itemsError } = await client.from('revisoes_estoque_itens').insert(items)
    if (itemsError) throw itemsError
    return true
  }

  const { error: emptyReviewError } = await client.from('revisoes_estoque').delete().eq('id', review.id)
  if (emptyReviewError) throw emptyReviewError
  return false
}

async function processReviews(client) {
  const now = new Date().toISOString()
  const { data: routines, error } = await client
    .from('rotinas_revisao')
    .select('*, itens_checklist_revisao (*)')
    .eq('ativo', true)
    .lte('proxima_execucao', now)
  if (error) throw error

  const productsBlockedForReview = await listProductsBlockedForReview(client)
  let created = 0

  for (const routine of routines || []) {
    if (await createReviewForRoutine(client, routine, productsBlockedForReview)) created += 1
    const { error: updateError } = await client
      .from('rotinas_revisao')
      .update({ ultima_execucao: routine.proxima_execucao, proxima_execucao: nextExecution(routine) })
      .eq('id', routine.id)
    if (updateError) throw updateError
  }

  const { data: overdue, error: overdueError } = await client
    .from('revisoes_estoque')
    .select('id, agendada_para, rotinas_revisao (janela_revisao)')
    .in('status', ['pendente', 'em_andamento'])
  if (overdueError) throw overdueError
  for (const review of overdue || []) {
    const limit = new Date(review.agendada_para).getTime() + Number(review.rotinas_revisao?.janela_revisao || 480) * 60_000
    if (limit < Date.now()) await client.from('revisoes_estoque').update({ status: 'atrasada' }).eq('id', review.id)
  }

  return { created }
}

async function concludeReview(client, userId, reviewId) {
  const { data: items, error } = await client.from('revisoes_estoque_itens').select('id, status, solicitacao_item_id').eq('revisao_id', reviewId)
  if (error) throw error
  if ((items || []).some((item) => item.status === 'pendente')) throw new Error('Todos os itens devem ser tratados antes de concluir.')
  const { error: updateError } = await client.from('revisoes_estoque').update({ status: 'concluida', concluida_em: new Date().toISOString() }).eq('id', reviewId).eq('user_id', userId)
  if (updateError) throw updateError
  if (!(items || []).some((item) => REPLENISHMENT_STATUSES.includes(item.status) && !item.solicitacao_item_id)) {
    const { error: deleteError } = await client.from('revisoes_estoque').delete().eq('id', reviewId).eq('user_id', userId)
    if (deleteError) throw deleteError
  }
}

async function moveReviewToNextDay(client, userId, reviewId) {
  const { data: review, error: reviewError } = await client
    .from('revisoes_estoque')
    .select('agendada_para, adiada_count, rotinas_revisao (horario, dias_bloqueados)')
    .eq('id', reviewId)
    .eq('user_id', userId)
    .single()
  if (reviewError) throw reviewError

  const next = nextReviewDay(review)
  const adiadaCount = Number(review.adiada_count || 0) + 1
  const { error } = await client
    .from('revisoes_estoque')
    .update({ agendada_para: next, notificar_em: next, adiada_ate: next, adiada_count: adiadaCount, status: 'pendente' })
    .eq('id', reviewId)
    .eq('user_id', userId)
  if (error) throw error
  return { next, adiadaCount }
}

async function cleanupConcludedReviews(client) {
  const { data: reviews, error } = await client.from('revisoes_estoque').select('id, revisoes_estoque_itens (status, solicitacao_item_id)').eq('status', 'concluida')
  if (error) throw error
  for (const review of reviews || []) {
    const pendingPurchase = (review.revisoes_estoque_itens || []).some((item) => REPLENISHMENT_STATUSES.includes(item.status) && !item.solicitacao_item_id)
    if (!pendingPurchase) {
      const { error: deleteError } = await client.from('revisoes_estoque').delete().eq('id', review.id)
      if (deleteError) throw deleteError
    }
  }
}

async function postponeReview(client, userId, reviewId, minutes) {
  const { data: review, error: reviewError } = await client.from('revisoes_estoque').select('adiada_count').eq('id', reviewId).eq('user_id', userId).single()
  if (reviewError) throw reviewError
  const next = new Date(Date.now() + minutes * 60_000).toISOString()
  const adiadaCount = Number(review.adiada_count || 0) + 1
  const { error } = await client
    .from('revisoes_estoque')
    .update({ ultima_notificacao_em: new Date().toISOString(), notificar_em: next, adiada_ate: next, adiada_count: adiadaCount })
    .eq('id', reviewId)
    .eq('user_id', userId)
  if (error) throw error
  return { next, adiadaCount }
}

async function notifyReview(client, userId, reviewId, minutes) {
  const next = new Date(Date.now() + minutes * 60_000).toISOString()
  const { error } = await client
    .from('revisoes_estoque')
    .update({ ultima_notificacao_em: new Date().toISOString(), notificar_em: next })
    .eq('id', reviewId)
    .eq('user_id', userId)
  if (error) throw error
  return { next }
}

export async function GET(req) {
  try {
    const configuredSecret = process.env.CRON_SECRET
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || new URL(req.url).searchParams.get('secret')
    if (!configuredSecret || token !== configuredSecret) return Response.json({ error: 'Cron nao autorizado.' }, { status: 401 })

    const client = createServiceClient()
    if (!client) return Response.json({ error: 'Cliente de servico nao configurado.' }, { status: 500 })

    const result = await processReviews(client)
    await cleanupConcludedReviews(client)
    return Response.json({ ok: true, ...result })
  } catch (error) {
    return Response.json({ error: error.message || 'Nao foi possivel processar as revisoes.' }, { status: 400 })
  }
}

export async function POST(req) {
  try {
    const auth = await requireApiAuth(req)
    if (auth.response) return auth.response
    const token = req.headers.get('authorization').replace(/^Bearer\s+/i, '')
    const client = createUserClient(token)
    const body = await req.json()
    let result = {}

    if (body.action === 'processar') {
      result = await processReviews(client)
      await cleanupConcludedReviews(client)
    } else if (body.action === 'concluir') {
      await concludeReview(client, auth.user.id, body.revisaoId)
    } else if (body.action === 'limpar') {
      await cleanupConcludedReviews(client)
    } else if (body.action === 'proximo_dia') {
      result = await moveReviewToNextDay(client, auth.user.id, body.revisaoId)
    } else if (body.action === 'notificar') {
      const minutes = Math.max(5, Number(body.minutos) || 10)
      result = await notifyReview(client, auth.user.id, body.revisaoId, minutes)
    } else if (body.action === 'adiar') {
      const minutes = Math.max(5, Number(body.minutos) || 10)
      result = await postponeReview(client, auth.user.id, body.revisaoId, minutes)
    } else {
      return Response.json({ error: 'Acao invalida.' }, { status: 400 })
    }

    return Response.json({ ok: true, ...result })
  } catch (error) {
    return Response.json({ error: error.message || 'Nao foi possivel processar a revisao.' }, { status: 400 })
  }
}