import { supabase } from '@/lib/supabase/client'

/**
 * Chama uma API administrativa enviando a sessao Supabase atual.
 */
export async function authenticatedFetch(input, init = {}) {
  const {
    data: { session },
    error
  } = await supabase.auth.getSession()

  if (error || !session?.access_token) {
    throw new Error('Sua sessao expirou. Entre novamente para continuar.')
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${session.access_token}`)

  return fetch(input, {
    ...init,
    headers
  })
}
