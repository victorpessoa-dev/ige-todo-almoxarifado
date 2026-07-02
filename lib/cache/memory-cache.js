/**
 * Cache em memoria para dados publicos de curta duracao.
 *
 * A decisao evita dependencia externa neste porte de uso; em ambiente com
 * multiplas instancias, trocar por cache distribuido.
 */
const cache = new Map()

/**
 * Recupera um valor ainda valido do cache.
 */
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

/**
 * Armazena valor com TTL em milissegundos.
 */
export function setMemoryCache(key, value, ttlMs) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  })

  return value
}

/**
 * Remove uma chave quando alguma operacao altera o dado de origem.
 */
export function deleteMemoryCache(key) {
  cache.delete(key)
}
