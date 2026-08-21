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
function getClientIp(req) {
  return req.headers.get('x-real-ip') || req.headers.get('cf-connecting-ip') || 'local'
}

/**
 * Verifica se a requisicao ainda esta dentro da janela permitida.
 */
export async function checkRateLimit(req, {
  keyPrefix,
  limit = 20,
  windowMs = 60_000
}) {
  const now = Date.now()
  const key = `${keyPrefix}:${getClientIp(req)}`
  const current = buckets.get(key)

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
