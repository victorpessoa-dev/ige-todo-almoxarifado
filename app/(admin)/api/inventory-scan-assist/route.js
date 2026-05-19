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
      return createUserError('Envie uma imagem valida.')
    }

    const [meta, base64] = image.split(',')
    const mimeType = meta.match(/^data:(.*?);base64$/)?.[1] || 'image/jpeg'

    const catalogText = produtos
      .map((p) => {
        const codes = [p.cod, p.cod_barra]
          .filter(Boolean)
          .map((code) => String(code).trim())
          .filter(Boolean)

        return `codigos: ${[...new Set(codes)].join(', ')} | nome: ${p.nome || ''}`
      })
      .join('\n')

    const prompt = `
      Analise a imagem do scanner de estoque e tente identificar o codigo ou o nome do produto.
      A imagem pode conter uma etiqueta pequena, entao leia numeros pequenos com cuidado.

      Prioridade:
      1 - Codigo numerico visivel na etiqueta ou codigo de barras
      2 - Nome do produto

      Regras:
      - Nao invente codigo.
      - Se houver duvida, deixe o campo vazio e reduza a confianca.
      - Use o catalogo apenas para confirmar nomes/codigos proximos.
      - Retorne somente JSON valido.

      Responda:
      {
        "code": "string",
        "productName": "string",
        "confidence": number
      }

      Catalogo:
      ${catalogText || 'vazio'}
`

    const data = await callAI({
      prompt,
      images: [{ mimeType, data: base64 }]
    })

    const code = String(data?.code || '').trim()
    const productName = String(data?.productName || '').trim()
    const confidence = Number(data?.confidence)
    const hasConfidence = Number.isFinite(confidence)

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
        produtos.find((p) => {
          const productNameNormalized = normalizeText(p.nome)
          return (
            normalized.length >= 4 &&
            (productNameNormalized.includes(normalized) ||
              normalized.includes(productNameNormalized))
          )
        }) ||
        null
    }

    return Response.json({
      match: !hasConfidence || confidence >= 0.55 ? match : null,
      suggestion: {
        code,
        productName,
        confidence: hasConfidence ? confidence : null
      }
    })
  } catch (error) {
    console.error('Erro scanner:', error)

    return createUserError(
      'Nao foi possivel analisar a imagem agora.',
      500
    )
  }
}
