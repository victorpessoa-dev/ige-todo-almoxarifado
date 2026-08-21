export function normalizeImportedNumber(value) {
  if (value === null || value === undefined || String(value).trim() === '') return 0
  const normalized = Number(String(value).replace(',', '.'))
  return Number.isFinite(normalized) ? normalized : 0
}

export function normalizeImportedStockLimits(item) {
  const estoque = normalizeImportedNumber(item?.estoque)
  const min = normalizeImportedNumber(item?.min)
  const rawMax = normalizeImportedNumber(item?.max)
  return { estoque, min, max: rawMax < min ? min : rawMax }
}

export function formatImportError(error) {
  if (!error) return 'Erro desconhecido.'
  const parts = [
    error.message,
    error.details,
    error.hint,
    error.code ? `Codigo: ${error.code}` : ''
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : 'Erro desconhecido.'
}

export function makeProductImportPayload(item, userId) {
  const { estoque, min, max } = normalizeImportedStockLimits(item)
  return {
    user_id: userId,
    cod: String(item.code || '').trim(),
    nome: String(item.nome || '').trim(),
    ...(item.categoria ? { categoria: item.categoria } : {}),
    ...(item.aplicacao ? { aplicacao: item.aplicacao } : {}),
    ...(item.medidas ? { medidas: item.medidas } : {}),
    ...(item.marcas ? { marcas: item.marcas } : {}),
    ...(item.img_url ? { img_url: item.img_url } : {}),
    estoque,
    max,
    min,
    cod_barra: String(item.code || '').trim()
  }
}

export function normalizeImportedProducts(rows) {
  return rows.reduce((acc, item, index) => {
    const cod = String(item?.cod ?? '').trim()
    const nome = String(item?.nome ?? '').trim()
    const { estoque, min, max } = normalizeImportedStockLimits(item)
    if (!cod || !nome) return acc

    acc.push({
      id: `${cod}-${index}`,
      originalCode: cod,
      code: cod,
      nome,
      categoria: String(item.categoria || '').trim(),
      aplicacao: String(item.aplicacao || '').trim(),
      medidas: String(item.medidas || '').trim(),
      marcas: String(item.marcas || '').trim(),
      img_url: String(item.img_url || '').trim(),
      estoque,
      max,
      min,
      action: 'create'
    })
    return acc
  }, [])
}
