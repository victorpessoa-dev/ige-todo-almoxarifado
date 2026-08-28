import { requireApiAuth } from '@/lib/server/api-auth'
import { sendPush } from '@/lib/server/push'

export async function POST(req) {
  try {
    const auth = await requireApiAuth(req)
    if (auth.response) return auth.response

    const body = await req.json()
    const { subscription } = body || {}
    if (!body?.title || !body?.body || !subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return Response.json({ error: 'Notificação ou inscrição inválida.' }, { status: 400 })
    }

    const result = await sendPush(subscription, {
      title: String(body.title).slice(0, 120),
      body: String(body.body).slice(0, 500),
      url: typeof body.url === 'string' ? body.url : '/'
    })

    return Response.json({ ok: true, ...result })
  } catch (error) {
    return Response.json({ error: error.message || 'Não foi possível enviar a notificação.' }, { status: 400 })
  }
}