import { checkGeminiRateLimit } from '@/lib/server/gemini-rate-limit'

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
    const geminiApiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''

    if (!geminiApiKey) {
      console.error('Gemini API key nao configurada para ajuda do scanner.')
      return createUserError('A ajuda por imagem esta indisponivel no momento.', 500)
    }

    const rateLimit = checkGeminiRateLimit()
    if (!rateLimit.allowed) {
      return createUserError(rateLimit.message, rateLimit.status)
    }

    let body

    try {
      body = await req.json()
    } catch {
      return createUserError('Nao foi possivel ler a imagem enviada.', 400)
    }

    const image = body?.image
    const produtos = Array.isArray(body?.produtos) ? body.produtos.slice(0, 300) : []

    if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
      return createUserError('Envie uma imagem valida para a ajuda por IA.', 400)
    }

    const [meta, data] = image.split(',')
    const mimeType = meta.match(/^data:(.*?);base64$/)?.[1] || 'image/jpeg'

    const catalogText = produtos
      .map((produto) => `- codigo: ${produto.cod || ''} | nome: ${produto.nome || ''}`)
      .join('\n')

    const prompt = [
      'Analise a imagem de uma etiqueta ou produto e tente ajudar a localizar um item no catalogo.',
      'Prioridade 1: identificar um codigo numerico visivel.',
      'Prioridade 2: identificar o nome do produto.',
      'Se nao tiver confianca, retorne os campos vazios.',
      'Use somente JSON no formato pedido.',
      'Catalogo disponivel:',
      catalogText || '- catalogo vazio'
    ].join('\n')

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
                {
                  inlineData: {
                    mimeType,
                    data
                  }
                }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                productName: { type: 'string' }
              }
            }
          }
        })
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('Erro Gemini scanner assist:', response.status, result)
      return createUserError('Nao foi possivel analisar a imagem agora. Tente novamente.', response.status)
    }

    const outputText =
      result?.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')
        ?.text || ''

    if (!outputText) {
      return Response.json({ match: null })
    }

    let parsed

    try {
      parsed = JSON.parse(outputText)
    } catch {
      console.error('Resposta invalida no scanner assist:', outputText)
      return Response.json({ match: null })
    }

    const code = String(parsed?.code || '').trim()
    const productName = String(parsed?.productName || '').trim()

    let match = null

    if (code) {
      match =
        produtos.find((produto) => String(produto.cod_barra || '') === code) ||
        produtos.find((produto) => String(produto.cod || '') === code) ||
        null
    }

    if (!match && productName) {
      const normalizedName = normalizeText(productName)
      match =
        produtos.find((produto) => normalizeText(produto.nome) === normalizedName) ||
        produtos.find((produto) => normalizeText(produto.nome).includes(normalizedName)) ||
        null
    }

    return Response.json({
      match: match || null,
      suggestion: {
        code,
        productName
      }
    })
  } catch (error) {
    console.error('Erro geral no scanner assist:', error)
    return createUserError('Nao foi possivel usar a ajuda por imagem agora.', 500)
  }
}
