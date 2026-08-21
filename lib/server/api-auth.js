import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function unauthorized() {
  return Response.json(
    { error: 'Sessao invalida ou ausente.' },
    { status: 401, headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function requireApiAuth(req) {
  const authorization = req.headers.get('authorization') || ''
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]

  if (!token || !supabaseUrl || !supabaseAnonKey) {
    return { user: null, response: unauthorized() }
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  })
  const { data, error } = await client.auth.getUser(token)

  if (error || !data?.user) return { user: null, response: unauthorized() }
  return { user: data.user, response: null }
}