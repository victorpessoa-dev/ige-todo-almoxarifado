const buckets = new Map()

function getClientIp(req) {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'local'
  )
}

export function checkRateLimit(req, {
  keyPrefix,
  limit = 20,
  windowMs = 60_000
}) {
  const now = Date.now()
  const key = `${keyPrefix}:${getClientIp(req)}`
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, {
      count: 1,
      resetAt: now + windowMs
    })

    return { allowed: true, remaining: limit - 1, retryAfter: 0 }
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((current.resetAt - now) / 1000)
    }
  }

  current.count += 1
  buckets.set(key, current)

  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfter: 0
  }
}

export function createRateLimitResponse(retryAfter) {
  return Response.json(
    { error: 'Muitas tentativas. Aguarde um instante e tente novamente.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter)
      }
    }
  )
}
