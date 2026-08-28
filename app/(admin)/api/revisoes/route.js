import { createClient } from '@supabase/supabase-js'
import { requireApiAuth } from '@/lib/server/api-auth'
import { getReviewCategories } from '@/lib/revisoes/categories'

function createUserClient(token) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  })
}

function nextExecution(routine) {
  const [hour, minute] = String(routine.horario || '09:00').split(':').map(Number)
  const date = new Date(routine.proxima_execucao)
  date.setSeconds(0, 0)
  date.setHours(hour || 0, minute || 0, 0, 0)
  const days = routine.frequencia === 'semanal' ? 7 : Math.max(1, Number(routine.intervalo_dias) || 1)
  date.setDate(date.getDate() + days)
  const blocked = new Set((routine.dias_bloqueados || []).map(Number))
  while (blocked.has(date.getDay())) date.setDate(date.getDate() + 1)
  return date.toISOString()
}

async function processReviews(client, userId) {
  const now = new Date().toISOString()
  const { data: routines, error } = await client.from('rotinas_revisao').select('*, itens_checklist_revisao (*)').eq('ativo', true).lte('proxima_execucao', now)
  if (error) throw error
  const { data: purchaseItems, error: purchaseError } = await client
    .from('solicitacoes_compra_itens')
    .select('produto_id, solicitacoes_compra (status_geral)')
  if (purchaseError) throw purchaseError
  const terminalPurchaseStatuses = new Set(['concluida', 'cancelada'])
  const productsInActivePurchase = new Set((purchaseItems || [])
    .filter((item) => item.produto_id && !terminalPurchaseStatuses.has(item.solicitacoes_compra?.status_geral))
    .map((item) => item.produto_id))
  for (const routine of routines || []) {
    const { data: openReview, error: openError } = await client.from('revisoes_estoque').select('id').eq('rotina_id', routine.id).in('status', ['pendente', 'em_andamento', 'atrasada']).maybeSingle()
    if (openError) throw openError
    if (!openReview) {
      const { data: review, error: reviewError } = await client.from('revisoes_estoque').insert({ user_id: userId, rotina_id: routine.id, agendada_para: routine.proxima_execucao, status: 'pendente', notificar_em: now }).select().single()
      if (reviewError) throw reviewError
      let items = []
      if (routine.tipo === 'produtos') {
        const categories = getReviewCategories(routine)
        const { data: products, error: productsError } = await client.from('produtos').select('id, nome, estoque, min').in('categoria', categories)
        if (productsError) throw productsError
        items = (products || [])
          .filter((product) => !productsInActivePurchase.has(product.id))
          .filter((product) => routine.foco !== 'estoque_baixo' || Number(product.estoque) <= Number(product.min))
          .map((product) => ({ revisao_id: review.id, produto_id: product.id, nome_snapshot: product.nome }))
      } else {
        items = (routine.itens_checklist_revisao || []).filter((item) => item.ativo).sort((a, b) => a.ordem - b.ordem).map((item) => ({ revisao_id: review.id, checklist_item_id: item.id, nome_snapshot: item.nome }))
      }
      if (items.length) {
        const { error: itemsError } = await client.from('revisoes_estoque_itens').insert(items)
        if (itemsError) throw itemsError
      } else {
        const { error: emptyReviewError } = await client.from('revisoes_estoque').delete().eq('id', review.id)
        if (emptyReviewError) throw emptyReviewError
      }
    }
    const { error: updateError } = await client.from('rotinas_revisao').update({ ultima_execucao: routine.proxima_execucao, proxima_execucao: nextExecution(routine) }).eq('id', routine.id)
    if (updateError) throw updateError
  }
  const { data: overdue, error: overdueError } = await client.from('revisoes_estoque').select('id, agendada_para, rotinas_revisao (janela_revisao)').in('status', ['pendente', 'em_andamento'])
  if (overdueError) throw overdueError
  for (const review of overdue || []) {
    const limit = new Date(review.agendada_para).getTime() + Number(review.rotinas_revisao?.janela_revisao || 480) * 60_000
    if (limit < Date.now()) await client.from('revisoes_estoque').update({ status: 'atrasada' }).eq('id', review.id)
  }
}

async function concludeReview(client, userId, reviewId) {
  const { data: items, error } = await client.from('revisoes_estoque_itens').select('id, status, solicitacao_item_id').eq('revisao_id', reviewId)
  if (error) throw error
  if ((items || []).some((item) => item.status === 'pendente')) throw new Error('Todos os itens devem ser tratados antes de concluir.')
  const { error: updateError } = await client.from('revisoes_estoque').update({ status: 'concluida', concluida_em: new Date().toISOString() }).eq('id', reviewId).eq('user_id', userId)
  if (updateError) throw updateError
  if (!(items || []).some((item) => ['repor', 'em_falta'].includes(item.status) && !item.solicitacao_item_id)) {
    const { error: deleteError } = await client.from('revisoes_estoque').delete().eq('id', reviewId).eq('user_id', userId)
    if (deleteError) throw deleteError
  }
}

async function cleanupConcludedReviews(client) {
  const { data: reviews, error } = await client.from('revisoes_estoque').select('id, revisoes_estoque_itens (status, solicitacao_item_id)').eq('status', 'concluida')
  if (error) throw error
  for (const review of reviews || []) {
    const pendingPurchase = (review.revisoes_estoque_itens || []).some((item) => ['repor', 'em_falta'].includes(item.status) && !item.solicitacao_item_id)
    if (!pendingPurchase) {
      const { error: deleteError } = await client.from('revisoes_estoque').delete().eq('id', review.id)
      if (deleteError) throw deleteError
    }
  }
}
export async function POST(req) {
  try {
    const auth = await requireApiAuth(req)
    if (auth.response) return auth.response
    const token = req.headers.get('authorization').replace(/^Bearer\s+/i, '')
    const client = createUserClient(token)
    const body = await req.json()
    if (body.action === 'processar') {
      await processReviews(client, auth.user.id)
      await cleanupConcludedReviews(client)
    }
    else if (body.action === 'concluir') await concludeReview(client, auth.user.id, body.revisaoId)
    else if (body.action === 'limpar') await cleanupConcludedReviews(client)
    else if (body.action === 'notificar' || body.action === 'adiar') {
      const minutes = Math.max(5, Number(body.minutos) || 10)
      const next = new Date(Date.now() + minutes * 60_000).toISOString()
      const payload = { ultima_notificacao_em: new Date().toISOString(), notificar_em: next }
      if (body.action === 'adiar') payload.adiada_ate = next
      const { error } = await client.from('revisoes_estoque').update(payload).eq('id', body.revisaoId).eq('user_id', auth.user.id)
      if (error) throw error
    } else return Response.json({ error: 'Ação inválida.' }, { status: 400 })
    return Response.json({ ok: true })
  } catch (error) {
    return Response.json({ error: error.message || 'Não foi possível processar a revisão.' }, { status: 400 })
  }
}

