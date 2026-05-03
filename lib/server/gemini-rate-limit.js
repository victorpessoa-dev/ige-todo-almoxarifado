const DEFAULT_MAX_REQUESTS_PER_MINUTE = 6
const DEFAULT_MAX_REQUESTS_PER_DAY = 120

function getStore() {
  if (!globalThis.__geminiRateLimitStore) {
    globalThis.__geminiRateLimitStore = {
      minuteWindowStartedAt: 0,
      minuteCount: 0,
      dayKey: '',
      dayCount: 0
    }
  }

  return globalThis.__geminiRateLimitStore
}

function getTodayPacificKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date())
}

export function checkGeminiRateLimit() {
  const store = getStore()
  const now = Date.now()
  const dayKey = getTodayPacificKey()

  const maxRequestsPerMinute = Number(
    process.env.GEMINI_MAX_REQUESTS_PER_MINUTE || DEFAULT_MAX_REQUESTS_PER_MINUTE
  )
  const maxRequestsPerDay = Number(
    process.env.GEMINI_MAX_REQUESTS_PER_DAY || DEFAULT_MAX_REQUESTS_PER_DAY
  )

  if (store.dayKey !== dayKey) {
    store.dayKey = dayKey
    store.dayCount = 0
  }

  if (!store.minuteWindowStartedAt || now - store.minuteWindowStartedAt >= 60_000) {
    store.minuteWindowStartedAt = now
    store.minuteCount = 0
  }

  if (store.dayCount >= maxRequestsPerDay) {
    return {
      allowed: false,
      status: 429,
      message: 'O limite diario de analises foi atingido. Tente novamente amanha.'
    }
  }

  if (store.minuteCount >= maxRequestsPerMinute) {
    return {
      allowed: false,
      status: 429,
      message: 'Muitas analises foram solicitadas agora. Aguarde um pouco e tente novamente.'
    }
  }

  store.minuteCount += 1
  store.dayCount += 1

  return { allowed: true }
}
