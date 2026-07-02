import { supabase } from '@/lib/supabaseClient'
import { getMemoryCache, setMemoryCache } from '@/lib/memory-cache'

const PUBLIC_CATALOG_CACHE_KEY = 'public-catalog-products'
const PUBLIC_CATALOG_CACHE_TTL = 60_000

export async function listPublicCatalogProducts() {
  const cachedProducts = getMemoryCache(PUBLIC_CATALOG_CACHE_KEY)
  if (cachedProducts) return cachedProducts

  const { data, error } = await supabase.rpc('listar_produtos_catalogo_publico')

  if (error) throw error

  return setMemoryCache(PUBLIC_CATALOG_CACHE_KEY, data || [], PUBLIC_CATALOG_CACHE_TTL)
}
