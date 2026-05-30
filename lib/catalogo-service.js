import { supabase } from '@/lib/supabaseClient'

export async function listPublicCatalogProducts() {
  const { data, error } = await supabase.rpc('listar_produtos_catalogo_publico')

  if (error) throw error

  return data || []
}
