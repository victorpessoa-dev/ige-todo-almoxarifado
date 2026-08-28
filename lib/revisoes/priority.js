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

export function calculateNextReviewExecution({ base = new Date(), horario = '09:00', intervaloDias = 1, diasBloqueados = [] }) {
  const [hour, minute] = horario.split(':').map(Number)
  const date = new Date(base)
  date.setSeconds(0, 0)
  date.setHours(hour || 0, minute || 0, 0, 0)
  if (date <= base) date.setDate(date.getDate() + Math.max(1, Number(intervaloDias) || 1))
  const blocked = new Set(diasBloqueados.map(Number))
  while (blocked.has(date.getDay())) date.setDate(date.getDate() + 1)
  return date
}