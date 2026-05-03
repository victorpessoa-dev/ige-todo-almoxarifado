import { callAI } from '@/lib/server/ai-providers'

function createUserError(message, status = 400) {
  return Response.json({ error: message }, { status })
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export async function POST(req) {
  try {
    const body = await req.json()

    const image = body?.image
    const produtos = Array.isArray(body?.produtos) ? body.produtos.slice(0, 300) : []

    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return createUserError('Envie uma imagem válida.')
    }

    const [meta, base64] = image.split(',')
    const mimeType = meta.match(/^data:(.*?);base64$/)?.[1] || 'image/jpeg'

    const catalogText = produtos
      .map((p) => `codigo: ${p.cod || ''} | nome: ${p.nome || ''}`)
      .join('\n')

    const prompt = `
      Analise a imagem e tente identificar um produto.

      Prioridade:
      1 - Código numérico
      2 - Nome do produto

      Responda JSON:
      {
        "code": "string",
        "productName": "string"
      }

      Catálogo:
      ${catalogText || 'vazio'}
`

    const data = await callAI({
      prompt,
      images: [{ mimeType, data: base64 }]
    })

    const code = String(data?.code || '').trim()
    const productName = String(data?.productName || '').trim()

    let match = null

    if (code) {
      match =
        produtos.find((p) => String(p.cod_barra || '') === code) ||
        produtos.find((p) => String(p.cod || '') === code) ||
        null
    }

    if (!match && productName) {
      const normalized = normalizeText(productName)

      match =
        produtos.find((p) => normalizeText(p.nome) === normalized) ||
        produtos.find((p) => normalizeText(p.nome).includes(normalized)) ||
        null
    }

    return Response.json({
      match,
      suggestion: { code, productName }
    })
  } catch (error) {
    console.error('Erro scanner:', error)

    return createUserError(
      'Nao foi possivel analisar a imagem agora.',
      500
    )
  }
}