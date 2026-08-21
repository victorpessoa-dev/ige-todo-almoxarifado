/**
 * Servico do catalogo publico.
 *
 * Mantem o acesso ao catalogo passando pela RPC publica, que retorna somente
 * campos seguros e nao expoe estoque atual.
 */
import { supabase } from '@/lib/supabase/client'
import { deleteMemoryCache, getMemoryCache, setMemoryCache } from '@/lib/cache/memory-cache'

const PUBLIC_CATALOG_CACHE_KEY = 'public-catalog-products'
const PUBLIC_CATALOG_CACHE_TTL = 60_000

/** Invalida o catalogo publico apos mutacoes de produtos. */
export function invalidatePublicCatalogCache() {
  deleteMemoryCache(PUBLIC_CATALOG_CACHE_KEY)
}

/**
 * Lista produtos visiveis no catalogo publico com cache curto.
 */
export async function listPublicCatalogProducts() {
  const cachedProducts = getMemoryCache(PUBLIC_CATALOG_CACHE_KEY)
  if (cachedProducts) return cachedProducts

  const { data, error } = await supabase.rpc('listar_produtos_catalogo_publico')

  if (error) throw error

  return setMemoryCache(PUBLIC_CATALOG_CACHE_KEY, data || [], PUBLIC_CATALOG_CACHE_TTL)
}
