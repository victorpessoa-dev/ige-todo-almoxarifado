import { getVapidPublicKey } from '@/lib/server/push'

export async function GET() {
  const publicKey = getVapidPublicKey()
  return Response.json({ publicKey, enabled: Boolean(publicKey) })
}

// A inscrição é mantida exclusivamente pelo navegador. Estas rotas evitam
// persistência em banco e permanecem para compatibilidade com clientes antigos.
export async function POST() { return Response.json({ ok: true, storage: 'browser-only' }) }
export async function DELETE() { return Response.json({ ok: true, storage: 'browser-only' }) }