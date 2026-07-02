import { toDateInputValue } from '@/lib/date/date-utils'

export function getSolicitacaoFilterDate(solicitacao) {
  // Os filtros publico e administrativo usam a data de criacao para manter a mesma leitura operacional.
  return toDateInputValue(solicitacao?.created_at)
}

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

export function getSolicitacaoFilterYears(solicitacoes = []) {
  const years = solicitacoes
    .map((solicitacao) => getSolicitacaoFilterDate(solicitacao)?.slice(0, 4))
    .filter(Boolean)

  return [...new Set(years)].sort((a, b) => Number(b) - Number(a))
}
