import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Consulta o limitador atomico no Supabase.
 *
 * A funcao SQL identifica o usuario por auth.uid() e mantem limites fixos por
 * endpoint. Assim, todas as instancias da aplicacao compartilham o contador e
 * o cliente nao consegue aumentar seu proprio limite.
 */
export async function checkRateLimit({ accessToken, keyPrefix }) {
  if (!accessToken || !supabaseUrl || !supabaseAnonKey) {
    throw new Error('Rate limit indisponivel sem sessao autenticada.')
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })

  const { data, error } = await supabase.rpc('check_api_rate_limit', {
    p_key_prefix: keyPrefix
  })

  if (error) throw error

  const result = Array.isArray(data) ? data[0] : data
  if (!result || typeof result.allowed !== 'boolean') {
    throw new Error('Resposta invalida do rate limit distribuido.')
  }

  return {
    allowed: result.allowed,
    remaining: Number(result.remaining || 0),
    retryAfter: Number(result.retry_after || 0)
  }
}

/**
 * Resposta padronizada para chamadas bloqueadas por rate limit.
 */
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
