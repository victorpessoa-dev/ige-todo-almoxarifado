export function getStockReviewPriority(item = {}) {
  if (item.status === 'pendente') return 0
  const product = item.produtos || item.produto || {}
  const estoque = Number(product.estoque)
  const minimo = Number(product.min)
  if (Number.isFinite(estoque) && estoque === 0) return 1
  if (Number.isFinite(estoque) && Number.isFinite(minimo) && estoque <= minimo) return 2
  if (!item.revisado_em) return 3
  return 4
}

export function sortReviewItems(items = []) {
  return [...items].sort((a, b) => {
    const priorityDiff = getStockReviewPriority(a) - getStockReviewPriority(b)
    if (priorityDiff) return priorityDiff
    const stockDiff = Number(a.produtos?.estoque ?? Infinity) - Number(b.produtos?.estoque ?? Infinity)
    if (stockDiff) return stockDiff
    return String(a.nome_snapshot || '').localeCompare(String(b.nome_snapshot || ''), 'pt-BR')
  })
}

export function clampReviewDateToBusinessHours(date, { startHour = 8, endHour = 17 } = {}) {
  const next = new Date(date)
  if (Number.isNaN(next.getTime())) return next

  const minutes = next.getHours() * 60 + next.getMinutes()
  const startMinutes = startHour * 60
  const endMinutes = endHour * 60

  if (minutes < startMinutes) next.setHours(startHour, 0, 0, 0)
  if (minutes > endMinutes) next.setHours(endHour, 0, 0, 0)

  return next
}

export function calculateNextReviewExecution({ base = new Date(), horario = '09:00', intervaloDias = 1, diasBloqueados = [] }) {
  const [hour, minute] = horario.split(':').map(Number)
  let date = new Date(base)
  date.setSeconds(0, 0)
  date.setHours(hour || 0, minute || 0, 0, 0)
  date = clampReviewDateToBusinessHours(date)
  if (date <= base) date.setDate(date.getDate() + Math.max(1, Number(intervaloDias) || 1))
  return clampReviewDateToBusinessHours(skipBlockedReviewDays(date, diasBloqueados))
}

export function skipBlockedReviewDays(date, diasBloqueados = []) {
  const next = new Date(date)
  const blocked = new Set(diasBloqueados.map(Number))
  while (blocked.has(next.getDay())) next.setDate(next.getDate() + 1)
  return next
}

export function calculateNextReviewDay({ base = new Date(), horario = '09:00', diasBloqueados = [] }) {
  const [hour, minute] = horario.split(':').map(Number)
  const date = new Date(base)
  date.setSeconds(0, 0)
  date.setHours(hour || 0, minute || 0, 0, 0)
  date.setDate(date.getDate() + 1)
  return clampReviewDateToBusinessHours(skipBlockedReviewDays(date, diasBloqueados))
}
