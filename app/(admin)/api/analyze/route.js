import { checkGeminiRateLimit } from '@/lib/server/gemini-rate-limit'

const MAX_IMAGES = 10
const MAX_TOTAL_SIZE = 10 * 1024 * 1024

function createUserError(message, status = 400) {
  return Response.json({ error: message }, { status })
}

function getProviderErrorMessage(status) {
  if (status === 400) {
    return 'Nao foi possivel analisar estas imagens. Tente fotos mais nítidas.'
  }

  if (status === 401 || status === 403) {
    return 'A analise de imagens esta indisponivel no momento.'
  }

  if (status === 429) {
    return 'Muitas analises foram solicitadas agora. Aguarde um pouco e tente novamente.'
  }

  if (status >= 500) {
    return 'O servico de analise esta instavel no momento. Tente novamente em instantes.'
  }

  return 'Nao foi possivel concluir a analise das imagens.'
}

function validateBase64Image(image) {
  if (typeof image !== 'string') {
    return { valid: false, error: 'Imagem invalida' }
  }

  if (!image.startsWith('data:image/')) {
    return { valid: false, error: 'Formato de imagem invalido' }
  }

  const base64Data = image.split(',')[1] || ''
  const estimatedSize = (base64Data.length * 3) / 4

  if (estimatedSize > 5 * 1024 * 1024) {
    return { valid: false, error: 'Imagem muito grande (max 5MB)' }
  }

  return { valid: true }
}

function getOutputText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text
  }

  const parts = []

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') {
        parts.push(content.text)
      }
    }
  }

  return parts.join('\n').trim()
}

export async function POST(req) {
  try {
    const geminiApiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''

    if (!geminiApiKey) {
      console.error('Gemini API key nao configurada.')
      return createUserError('A analise de imagens esta indisponivel no momento.', 500)
    }

    const rateLimit = checkGeminiRateLimit()
    if (!rateLimit.allowed) {
      return createUserError(rateLimit.message, rateLimit.status)
    }

    let body

    try {
      body = await req.json()
    } catch {
      return createUserError('Nao foi possivel ler as imagens enviadas.', 400)
    }

    const { images } = body

    if (!images || !Array.isArray(images)) {
      return createUserError('Envie ao menos uma imagem valida para analise.', 400)
    }

    if (images.length === 0) {
      return createUserError('Adicione pelo menos uma imagem para analisar.', 400)
    }

    if (images.length > MAX_IMAGES) {
      return createUserError(`Envie no maximo ${MAX_IMAGES} imagens por vez.`, 400)
    }

    let totalSize = 0

    for (let index = 0; index < images.length; index += 1) {
      const validation = validateBase64Image(images[index])

      if (!validation.valid) {
        return createUserError(
          `A imagem ${index + 1} nao pode ser analisada. Verifique o arquivo e tente novamente.`,
          400
        )
      }

      totalSize += images[index].length
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return createUserError('As imagens enviadas ficaram muito pesadas. Tente menos fotos por vez.', 400)
    }

    const prompt = [
      `Analise todas as ${images.length} imagens e retorne uma unica lista consolidada de produtos visiveis.`,
      'Some as quantidades quando o mesmo produto aparecer em mais de uma imagem.',
      'Padronize nomes muito parecidos em um unico nome simples.',
      'Considere apenas produtos que estejam realmente visiveis.',
      'Se nao conseguir identificar produtos com confianca, retorne uma lista vazia.',
      'Responda apenas no formato JSON solicitado.'
    ].join(' ')

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiApiKey
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              ...images.map((image) => {
                const [meta, data] = image.split(',')
                const mimeType = meta.match(/^data:(.*?);base64$/)?.[1] || 'image/jpeg'

                return {
                  inlineData: {
                    mimeType,
                    data
                  }
                }
              })
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object',
            properties: {
              products: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    quantity: { type: 'number' }
                  },
                  required: ['name', 'quantity']
                }
              }
            }
          }
        }
      })
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Erro Gemini analyze:', response.status, data)
      return createUserError(getProviderErrorMessage(response.status), response.status)
    }

    const outputText =
      data?.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')
        ?.text || getOutputText(data)

    if (!outputText) {
      return Response.json({ products: [] })
    }

    let parsed

    try {
      parsed = JSON.parse(outputText)
    } catch {
      console.error('Resposta Gemini invalida:', outputText)
      return createUserError('Nao foi possivel interpretar o resultado da analise. Tente novamente.', 502)
    }

    const products = Array.isArray(parsed?.products) ? parsed.products : []
    const validProducts = products.filter(
      (product) =>
        typeof product?.name === 'string' &&
        product.name.trim().length > 0 &&
        typeof product?.quantity === 'number' &&
        product.quantity > 0
    )

    return Response.json({ products: validProducts })
  } catch (error) {
    console.error('Erro ao analisar imagens:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido'

    if (errorMessage.includes('rate') || errorMessage.includes('quota')) {
      return createUserError('Muitas analises foram solicitadas agora. Aguarde um pouco e tente novamente.', 429)
    }

    if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      return createUserError('A analise demorou demais. Tente novamente com menos imagens.', 504)
    }

    return createUserError('Nao foi possivel concluir a analise agora. Tente novamente em instantes.', 500)
  }
}
