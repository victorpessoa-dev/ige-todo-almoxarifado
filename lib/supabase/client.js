import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('A aplicacao nao esta disponivel no momento.')
}

// Cliente publico: toda protecao de dados depende das policies/RPCs do Supabase.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
