/**
 * Formatadores compartilhados de solicitacoes.
 *
 * Centralizam nomes exibidos no publico, admin e exportacoes para evitar
 * divergencia entre telas.
 */
/**
 * Retorna o nome principal da solicitacao.
 */
export function formatSolicitacaoItem(solicitacao) {
  return String(solicitacao?.nome_item || '').trim()
}

/**
 * Monta rotulo de centro de custo com codigo quando disponivel.
 */
export function formatCentroCustoLabel(centroCusto) {
  if (!centroCusto) return ''

  return [centroCusto.codigo, centroCusto.nome].filter(Boolean).join(' - ')
}

/**
 * Resolve o solicitante independente da origem do dado.
 */
export function getSolicitacaoSolicitante(solicitacao) {
  return (
    solicitacao?.solicitantes_compra?.nome ||
    solicitacao?.solicitante ||
    ''
  )
}

/**
 * Resolve o centro de custo independente da origem do dado.
 */
export function getSolicitacaoCentroCusto(solicitacao) {
  return (
    formatCentroCustoLabel(solicitacao?.centros_custo) ||
    solicitacao?.centro_custo ||
    ''
  )
}
