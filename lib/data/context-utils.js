const MAX_RETRIES = 3
const RETRY_DELAY = 1000

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function withRetry(operation, retries = MAX_RETRIES) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === retries - 1) throw error
      await delay(RETRY_DELAY * Math.pow(2, attempt))
    }
  }
}

export function sortByCreatedAtDesc(items = []) {
  return [...items].sort((a, b) => {
    const aDate = a?.created_at ? new Date(a.created_at).getTime() : 0
    const bDate = b?.created_at ? new Date(b.created_at).getTime() : 0
    return bDate - aDate
  })
}

export function sortProdutosByNomeAsc(items = []) {
  return [...items].sort((a, b) =>
    (a?.nome || '').localeCompare(b?.nome || '', 'pt-BR', { sensitivity: 'base' })
  )
}

export function upsertSorted(items = [], nextItem, sortFn) {
  const nextItems = items.filter((item) => item.id !== nextItem.id)
  nextItems.push(nextItem)
  return sortFn(nextItems)
}

export function removeSorted(items = [], id, sortFn) {
  return sortFn(items.filter((item) => item.id !== id))
}

export function normalizeMovimentacao(movimentacao, produtosBase = []) {
  if (!movimentacao) return movimentacao

  const produtoRelacionado =
    movimentacao.produtos ||
    produtosBase.find((produto) => produto.id === movimentacao.produto_id) ||
    null

  return {
    ...movimentacao,
    produtos: produtoRelacionado
      ? {
          nome: produtoRelacionado.nome ?? null,
          cod: produtoRelacionado.cod ?? null
        }
      : null
  }
}

export function normalizeSolicitacao(solicitacao, produtosBase = []) {
  if (!solicitacao) return solicitacao

  const produtoRelacionado =
    solicitacao.produtos ||
    produtosBase.find((produto) => produto.id === solicitacao.produto_id) ||
    null

  return {
    ...solicitacao,
    produtos: produtoRelacionado
      ? {
          id: produtoRelacionado.id ?? solicitacao.produto_id,
          nome: produtoRelacionado.nome ?? null,
          cod: produtoRelacionado.cod ?? null
        }
      : null
  }
}
