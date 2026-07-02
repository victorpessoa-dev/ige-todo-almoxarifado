import { callAI } from '@/lib/server/ai-providers'
import { checkRateLimit, createRateLimitResponse } from '@/lib/server/rate-limit'

const MAX_IMAGES = 3
const MAX_TOTAL_SIZE = 10 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function createUserError(message, status = 400) {
  return Response.json({ error: message }, { status })
}

function validateBase64Image(image) {
  if (typeof image !== 'string') {
    return { valid: false }
  }

  if (!image.startsWith('data:image/')) {
    return { valid: false }
  }

  const [meta, base64Data = ''] = image.split(',')
  const mimeType = meta.match(/^data:(.*?);base64$/)?.[1]

  if (!ALLOWED_IMAGE_TYPES.has(mimeType) || !base64Data || /[^a-zA-Z0-9+/=]/.test(base64Data)) {
    return { valid: false }
  }

  const estimatedSize = (base64Data.length * 3) / 4

  if (estimatedSize > 5 * 1024 * 1024) {
    return { valid: false }
  }

  return { valid: true }
}

export async function POST(req) {
  try {
    const rateLimit = checkRateLimit(req, {
      keyPrefix: 'api:analyze',
      limit: 12,
      windowMs: 60_000
    })

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.retryAfter)
    }

    const body = await req.json()
    const { images } = body

    if (!images || !Array.isArray(images)) {
      return createUserError('Envie imagens validas.')
    }

    if (images.length === 0) {
      return createUserError('Adicione ao menos uma imagem.')
    }

    if (images.length > MAX_IMAGES) {
      return createUserError(`Maximo de ${MAX_IMAGES} imagens.`)
    }

    let totalSize = 0

    for (let i = 0; i < images.length; i++) {
      const validation = validateBase64Image(images[i])

      if (!validation.valid) {
        return createUserError(`Imagem ${i + 1} invalida.`)
      }

      totalSize += images[i].length
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return createUserError('Imagens muito pesadas.')
    }

    const formattedImages = images.map((image) => {
      const [meta, base64] = image.split(',')
      const mimeType = meta.match(/^data:(.*?);base64$/)?.[1] || 'image/jpeg'

      return { mimeType, data: base64 }
    })

    const prompt = `
      Analise todas as imagens e retorne uma lista consolidada de produtos.
      Some quantidades repetidas.
      Padronize nomes.
      Responda apenas JSON:
      {
        "products": [
          { "name": "string", "quantity": number }
        ]
      }`

    const data = await callAI({
      prompt,
      images: formattedImages
    })

    const products = Array.isArray(data?.products) ? data.products : []

    return Response.json({ products })
  } catch (error) {
    console.error('Erro analyze:', error)

    return createUserError(
      'Nao foi possivel analisar as imagens agora.',
      500
    )
  }
}
