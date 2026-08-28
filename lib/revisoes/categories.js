export function normalizeReviewCategories(value) {
  const values = Array.isArray(value) ? value : [value]
  return [...new Set(values.map((item) => String(item || '').trim()).filter(Boolean))]
}

export function getReviewCategories(routine = {}) {
  const categories = normalizeReviewCategories(routine.categorias)
  return categories.length ? categories : normalizeReviewCategories(routine.categoria)
}