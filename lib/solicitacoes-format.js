export function formatSolicitacaoItem(solicitacao) {
  return String(solicitacao?.nome_item || '').trim()
}
