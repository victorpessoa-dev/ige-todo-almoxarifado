/**
 * Utilitarios de data usados por formularios e exibicao.
 *
 * Mantem datas "YYYY-MM-DD" em horario local para evitar deslocamento de dia
 * causado por conversao UTC no browser.
 */
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Garante dois digitos em partes de data.
 */
function padDatePart(value) {
  return String(value).padStart(2, '0')
}

/**
 * Verifica se o valor ja esta no formato de data sem horario.
 */
export function isDateOnly(value) {
  return typeof value === 'string' && DATE_ONLY_RE.test(value)
}

/**
 * Converte datas sem horario para Date local.
 */
export function dateOnlyToLocalDate(value) {
  if (!value) return null

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const match = String(value).match(DATE_ONLY_RE)
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Formata valor para inputs HTML do tipo date.
 */
export function toDateInputValue(value) {
  if (!value) return ''

  if (isDateOnly(value)) {
    return value.slice(0, 10)
  }

  const date = dateOnlyToLocalDate(value)
  if (!date) return ''

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate())
  ].join('-')
}

/**
 * Retorna a data local de hoje no formato aceito por input date.
 */
export function getTodayDateInputValue() {
  return toDateInputValue(new Date())
}

/**
 * Exibe data no padrao brasileiro.
 */
export function formatDateBR(value, fallback = '-') {
  if (!value) return fallback

  const match = typeof value === 'string' ? value.match(DATE_ONLY_RE) : null
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`
  }

  const date = dateOnlyToLocalDate(value)
  return date ? date.toLocaleDateString('pt-BR') : fallback
}

/**
 * Converte data para timestamp local zerado.
 *
 * Usado em filtros por dia para comparar datas sem depender de timezone.
 */
export function getLocalDateTime(value) {
  const date = dateOnlyToLocalDate(value)
  if (!date) return null

  const localDate = new Date(date)
  localDate.setHours(0, 0, 0, 0)
  return localDate.getTime()
}
