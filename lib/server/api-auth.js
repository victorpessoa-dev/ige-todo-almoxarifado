import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function getBearerToken(req) {
  const authorization = req.headers.get('authorization') || ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || ''
}

/**
 * Valida no Supabase o token recebido por uma rota administrativa.
 *
 * getUser(token) consulta o servidor de autenticacao e nao confia apenas nos
 * dados locais da sessao enviados pelo navegador.
 */
export async function authenticateApiRequest(req) {
  const token = getBearerToken(req)

  if (!token || !supabaseUrl || !supabaseAnonKey) {
    return { user: null, accessToken: null }
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })

  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data?.user) {
    return { user: null, accessToken: null }
  }

  return { user: data.user, accessToken: token }
}

export function createUnauthorizedResponse() {
  return Response.json(
    { error: 'Sua sessao expirou. Entre novamente para continuar.' },
    { status: 401 }
  )
}
