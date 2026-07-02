import { callAI } from '@/lib/server/ai-providers'
import { checkRateLimit, createRateLimitResponse } from '@/lib/server/rate-limit'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_CATALOG_ITEMS = 300
const MAX_TEXT_LENGTH = 120
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

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

function cleanText(value, maxLength = MAX_TEXT_LENGTH) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

export async function POST(req) {
  try {
    const rateLimit = checkRateLimit(req, {
      keyPrefix: 'api:inventory-scan-assist',
      limit: 20,
      windowMs: 60_000
    })

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.retryAfter)
    }

    const body = await req.json()
    const image = body?.image
    const produtos = Array.isArray(body?.produtos)
      ? body.produtos.slice(0, MAX_CATALOG_ITEMS)
      : []

    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return createUserError('Envie uma imagem valida.')
    }

    const [meta, base64] = image.split(',')
    const mimeType = meta.match(/^data:(.*?);base64$/)?.[1]

    if (!ALLOWED_IMAGE_TYPES.has(mimeType) || !base64 || /[^a-zA-Z0-9+/=]/.test(base64)) {
      return createUserError('Envie uma imagem valida.')
    }

    if ((base64.length * 3) / 4 > MAX_IMAGE_SIZE) {
      return createUserError('Imagem muito pesada.')
    }

    const catalogText = produtos
      .map((produto) => {
        const codes = [produto.cod, produto.cod_barra]
          .filter(Boolean)
          .map((code) => cleanText(code, 64))
          .filter(Boolean)

        return `codigos: ${[...new Set(codes)].join(', ')} | nome: ${cleanText(produto.nome)}`
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
        produtos.find((produto) => String(produto.cod_barra || '') === code) ||
        produtos.find((produto) => String(produto.cod || '') === code) ||
        null
    }

    if (!match && productName) {
      const normalized = normalizeText(productName)

      match =
        produtos.find((produto) => normalizeText(produto.nome) === normalized) ||
        produtos.find((produto) => {
          const productNameNormalized = normalizeText(produto.nome)
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
