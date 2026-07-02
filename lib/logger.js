function normalizeError(error) {
  if (!error) return ''

  if (typeof error === 'string') return error

  const message = error.message || String(error)

  return message
    .replace(/key=[^&\s]+/gi, 'key=[redacted]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
}

export const logger = {
  info(message, data) {
    if (process.env.NODE_ENV === 'development') {
      console.info(message, data ?? '')
    }
  },

  warn(message, error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(message, normalizeError(error))
    }
  },

  error(message, error) {
    console.error(message, normalizeError(error))
  }
}
