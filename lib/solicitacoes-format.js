export function formatSolicitacaoItem(solicitacao) {
  return String(solicitacao?.nome_item || '').trim()
}

export function formatCentroCustoLabel(centroCusto) {
  if (!centroCusto) return ''

  return [centroCusto.codigo, centroCusto.nome].filter(Boolean).join(' - ')
}

export function getSolicitacaoSolicitante(solicitacao) {
  return (
    solicitacao?.solicitantes_compra?.nome ||
    solicitacao?.solicitante ||
    ''
  )
}

export function getSolicitacaoCentroCusto(solicitacao) {
  return (
    formatCentroCustoLabel(solicitacao?.centros_custo) ||
    solicitacao?.centro_custo ||
    ''
  )
}
