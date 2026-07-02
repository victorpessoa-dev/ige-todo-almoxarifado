import { logger } from '@/lib/logging/logger'

const GEMINI_KEYS = (
  process.env.GEMINI_API_KEYS ||
  `${process.env.GEMINI_API_KEY_1 || ''},${process.env.GEMINI_API_KEY_2 || ''}`
)
  .split(',')
  .map((key) => key.trim())
  .filter(Boolean)

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY
const CACHE_TTL = 1000 * 60 * 5
const cache = new Map()

let geminiIndex = 0

function getCacheKey({ prompt, images }) {
  return JSON.stringify({ prompt, images })
}

function getCache(key) {
  const item = cache.get(key)
  if (!item) return null

  if (Date.now() > item.expireAt) {
    cache.delete(key)
    return null
  }

  return item.value
}

function setCache(key, value) {
  cache.set(key, {
    value,
    expireAt: Date.now() + CACHE_TTL
  })
}

function extractJSON(text = '') {
  try {
    return JSON.parse(text)
  } catch {}

  const markdownJson = text.match(/```json([\s\S]*?)```/)
  if (markdownJson) {
    try {
      return JSON.parse(markdownJson[1])
    } catch {}
  }

  const inlineJson = text.match(/\{[\s\S]*\}/)
  if (inlineJson) {
    try {
      return JSON.parse(inlineJson[0])
    } catch {}
  }

  return null
}

function isLimitError(message = '') {
  const normalizedMessage = message.toLowerCase()
  return (
    normalizedMessage.includes('429') ||
    normalizedMessage.includes('quota') ||
    normalizedMessage.includes('limit')
  )
}

function isRetryableError(error) {
  const message = (error?.message || '').toLowerCase()
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('500') ||
    message.includes('fetch')
  )
}

async function withTimeout(promise, ms = 15_000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    )
  ])
}

async function retry(operation, attempts = 2) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (!isRetryableError(error) || attempt === attempts - 1) {
        throw error
      }

      logger.warn(`AI retry ${attempt + 1}`, error)
    }
  }
}

function isBadResponse(response) {
  if (!response) return true

  if (typeof response === 'string') {
    if (response.length < 10) return true

    const blockedTerms = ['nao posso', 'n\u00e3o posso', 'cannot', 'error', 'undefined']
    return blockedTerms.some((term) => response.toLowerCase().includes(term))
  }

  if (typeof response === 'object') {
    return Object.keys(response).length === 0
  }

  return false
}

async function callGemini({ prompt, images }) {
  const totalKeys = GEMINI_KEYS.length

  if (!totalKeys) {
    throw new Error('Sem keys do Gemini')
  }

  let attempts = 0

  while (attempts < totalKeys) {
    const key = GEMINI_KEYS[geminiIndex]

    try {
      const result = await retry(async () => {
        const response = await withTimeout(
          fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': key
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `
Voce e um sistema de reconhecimento de produtos.

REGRAS:
- Prioridade: codigo de barras
- Depois: nome do produto
- Seja especifico (marca, tipo)
- NAO invente informacoes
- Se nao souber, retorne vazio

Responda JSON:
{
  "code": "string",
  "productName": "string",
  "confidence": number
}

${prompt}
`
                      },
                      ...images.map((image) => ({
                        inlineData: {
                          mimeType: image.mimeType,
                          data: image.data
                        }
                      }))
                    ]
                  }
                ]
              })
            }
          )
        )

        if (!response.ok) {
          const text = await response.text()
          throw new Error(`gemini_${response.status}_${text}`)
        }

        const json = await response.json()
        const text =
          json?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text || ''

        return extractJSON(text) || text
      })

      geminiIndex = (geminiIndex + 1) % totalKeys
      return result
    } catch (error) {
      logger.warn(`Gemini key ${geminiIndex} falhou`, error)

      geminiIndex = (geminiIndex + 1) % totalKeys
      attempts++

      if (!isLimitError(error?.message)) {
        throw error
      }
    }
  }

  throw new Error('Todas as keys do Gemini falharam')
}

async function callMistral({ prompt }) {
  if (!MISTRAL_API_KEY) {
    throw new Error('Sem Mistral API Key')
  }

  return retry(async () => {
    const response = await withTimeout(
      fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify({
          model: 'mistral-small',
          messages: [{ role: 'user', content: prompt }]
        })
      })
    )

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`mistral_${response.status}_${text}`)
    }

    const json = await response.json()
    const text = json?.choices?.[0]?.message?.content || ''

    return extractJSON(text) || text
  })
}

export async function callAI({ prompt, images = [] }) {
  const cacheKey = getCacheKey({ prompt, images })
  const cached = getCache(cacheKey)

  if (cached) {
    logger.info('AI cache hit')
    return cached
  }

  const isImage = images.length > 0
  let result

  if (isImage) {
    try {
      result = await callGemini({ prompt, images })
    } catch (error) {
      logger.warn('Fallback Gemini para Mistral', error)

      result = await callMistral({
        prompt: `Descreva detalhadamente o produto na imagem: ${prompt}`
      })
    }
  } else {
    result = await callMistral({ prompt })
  }

  if (isBadResponse(result)) {
    throw new Error('Resposta invalida')
  }

  setCache(cacheKey, result)
  return result
}

export const callAIWithFallback = callAI
