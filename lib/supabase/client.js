/**
 * Cliente Supabase usado no browser.
 *
 * A chave anonima e publica por definicao; a protecao real fica nas policies,
 * grants e RPCs do Supabase.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('A aplicacao nao esta disponivel no momento.')
}

// Cliente publico: toda protecao de dados depende das policies/RPCs do Supabase.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
