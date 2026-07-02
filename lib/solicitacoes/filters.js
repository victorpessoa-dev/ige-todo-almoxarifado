import { toDateInputValue } from '@/lib/date/date-utils'

/**
 * Utilitarios de filtro para solicitacoes de compra.
 *
 * Centralizam a leitura de datas para manter o mesmo comportamento entre
 * listagens publicas e administrativas.
 */

/**
 * Retorna a data usada pelos filtros de mes e ano.
 *
 * @param {Object} solicitacao Solicitacao de compra.
 * @returns {string}
 */
export function getSolicitacaoFilterDate(solicitacao) {
  // Os filtros publico e administrativo usam a data de criacao para manter a mesma leitura operacional.
  return toDateInputValue(solicitacao?.created_at)
}

/**
 * Verifica se uma solicitacao atende aos filtros de periodo selecionados.
 *
 * @param {Object} solicitacao Solicitacao avaliada.
 * @param {Object} filters Filtros de mes e ano.
 * @returns {boolean}
 */
export function matchesSolicitacaoDateFilters(solicitacao, {
  meses = [],
  anos = []
} = {}) {
  const filterDate = getSolicitacaoFilterDate(solicitacao)
  const [filterYear, filterMonth] = filterDate ? filterDate.split('-') : []

  const matchesMonth = meses.length === 0 || meses.includes(filterMonth)
  const matchesYear = anos.length === 0 || anos.includes(filterYear)

  return matchesMonth && matchesYear
}

/**
 * Extrai os anos disponiveis para montar filtros dinamicos da listagem.
 *
 * @param {Object[]} solicitacoes Lista de solicitacoes.
 * @returns {string[]}
 */
export function getSolicitacaoFilterYears(solicitacoes = []) {
  const years = solicitacoes
    .map((solicitacao) => getSolicitacaoFilterDate(solicitacao)?.slice(0, 4))
    .filter(Boolean)

  return [...new Set(years)].sort((a, b) => Number(b) - Number(a))
}
