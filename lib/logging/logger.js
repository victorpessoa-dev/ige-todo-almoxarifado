/**
 * Logger central da aplicacao.
 *
 * Reduz vazamento acidental de tokens/chaves nos logs e limita mensagens
 * informativas ao ambiente de desenvolvimento.
 */

/**
 * Remove segredos comuns antes que erros sejam enviados ao console.
 *
 * @param {unknown} error Erro capturado durante a execucao.
 * @returns {string}
 */
function normalizeError(error) {
  if (!error) return ''

  if (typeof error === 'string') return error

  const message = error.message || String(error)

  return message
    .replace(/key=[^&\s]+/gi, 'key=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
}

export const logger = {
  /**
   * Registra informacoes apenas em desenvolvimento.
   *
   * @param {string} message Mensagem tecnica.
   * @param {unknown} data Dados auxiliares opcionais.
   */
  info(message, data) {
    if (process.env.NODE_ENV === 'development') {
      console.info(message, data ?? '')
    }
  },

  /**
   * Registra avisos sem expor segredos presentes no erro original.
   *
   * @param {string} message Mensagem tecnica.
   * @param {unknown} error Erro ou contexto do aviso.
   */
  warn(message, error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(message, normalizeError(error))
    }
  },

  /**
   * Registra erros relevantes tambem em producao, mantendo sanitizacao basica.
   *
   * @param {string} message Mensagem tecnica.
   * @param {unknown} error Erro capturado.
   */
  error(message, error) {
    console.error(message, normalizeError(error))
  }
}
