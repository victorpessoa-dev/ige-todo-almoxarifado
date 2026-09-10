import { isSolicitacaoEncerrada } from '@/constants/solicitacoes-config'

export function normalizeCategory(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export function getInventoryCategory(produto) {
  return String(produto?.categoria || '').trim() || 'Sem categoria'
}

export function isSolicitacaoAberta(solicitacao) {
  return !isSolicitacaoEncerrada(solicitacao)
}

export function getCompraQuantidade(produto) {
  return Math.max(0, Number(produto?.max || 0) - Number(produto?.estoque || 0))
}

export function makeReposicaoLine({ produto, quantidade }) {
  const amount = Number(quantidade || 0)
  const formattedAmount = Number.isInteger(amount) ? String(amount) : String(amount).replace('.', ',')
  return [
    String(produto.cod || '').trim() || 'SEM COD',
    String(produto.nome || '').trim().toLocaleUpperCase('pt-BR'),
    `${formattedAmount} UND`
  ].join(' - ')
}

export function makeReposicaoTitle(category) {
  return `REPOSIÇÃO (${category || 'SEM CATEGORIA'})`.toLocaleUpperCase('pt-BR')
}

export function makeReposicaoBlocks(items, maxLength = 500) {
  const categoryGroups = new Map()
  items.forEach((item) => {
    const category = getInventoryCategory(item.produto)
    if (!categoryGroups.has(category)) categoryGroups.set(category, [])
    categoryGroups.get(category).push({ ...item, line: makeReposicaoLine(item) })
  })

  const blocks = []
  categoryGroups.forEach((groupItems, category) => {
    let currentItems = []
    let currentDescription = ''

    groupItems
      .sort((a, b) => String(a.produto.nome || '').localeCompare(String(b.produto.nome || ''), 'pt-BR'))
      .forEach((item) => {
        const line = item.line.slice(0, maxLength)
        const candidate = currentDescription ? `${currentDescription}\n${line}` : line
        if (candidate.length > maxLength && currentItems.length > 0) {
          blocks.push({ category, items: currentItems, descricao: currentDescription })
          currentItems = [item]
          currentDescription = line
          return
        }
        currentItems.push(item)
        currentDescription = candidate.slice(0, maxLength)
      })

    if (currentItems.length > 0) {
      blocks.push({ category, items: currentItems, descricao: currentDescription })
    }
  })
  return blocks
}

export function hasProdutoInSolicitacao(solicitacao, produto) {
  if (solicitacao.produto_id === produto.id) return true

  const normalizedCode = normalizeCategory(produto.cod)
  const normalizedName = normalizeCategory(produto.nome)
  const requestLines = normalizeCategory([
    solicitacao.descricao,
    solicitacao.aplicacoes
  ].filter(Boolean).join('\n')).split('\n')

  return requestLines.some((line) => {
    if (normalizedCode) {
      return line.startsWith(`${normalizedCode} -`) || line.includes(`${normalizedCode} - ${normalizedName}`)
    }
    return normalizedName && line.startsWith(`${normalizedName} -`)
  })
}
