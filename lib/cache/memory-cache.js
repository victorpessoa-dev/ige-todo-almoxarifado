const cache = new Map()

export function getMemoryCache(key) {
  // Cache local reduz consultas repetidas sem criar dependencia externa para este porte de uso.
  const item = cache.get(key)

  if (!item) return null

  if (item.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }

  return item.value
}

export function setMemoryCache(key, value, ttlMs) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  })

  return value
}

export function deleteMemoryCache(key) {
  cache.delete(key)
}
