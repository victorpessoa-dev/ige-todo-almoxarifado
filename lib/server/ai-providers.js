// =========================
// CONFIG
// =========================
const GEMINI_KEYS = (
  process.env.GEMINI_API_KEYS ||
  `${process.env.GEMINI_API_KEY_1 || ''},${process.env.GEMINI_API_KEY_2 || ''}`
)
  .split(',')
  .map(k => k.trim())
  .filter(Boolean)

let geminiIndex = 0

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY

// =========================
// CACHE (TTL)
// =========================
const cache = new Map()
const CACHE_TTL = 1000 * 60 * 5

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

// =========================
// HELPERS
// =========================
function extractJSON(text = '') {
  try {
    return JSON.parse(text)
  } catch { }

  const match = text.match(/```json([\s\S]*?)```/)
  if (match) {
    try {
      return JSON.parse(match[1])
    } catch { }
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch { }
  }

  return null
}

function isLimitError(msg = '') {
  const m = msg.toLowerCase()
  return (
    m.includes('429') ||
    m.includes('quota') ||
    m.includes('limit')
  )
}

function isRetryableError(err) {
  const msg = (err.message || '').toLowerCase()
  return (
    msg.includes('timeout') ||
    msg.includes('network') ||
    msg.includes('500') ||
    msg.includes('fetch')
  )
}

async function withTimeout(promise, ms = 15000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    )
  ])
}

async function retry(fn, attempts = 2) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (!isRetryableError(err) || i === attempts - 1) {
        throw err
      }
      console.warn(`🔁 retry ${i + 1}`)
    }
  }
}

function isBadResponse(res) {
  if (!res) return true

  if (typeof res === 'string') {
    if (res.length < 10) return true

    const blocked = ['não posso', 'cannot', 'error', 'undefined']
    return blocked.some(w => res.toLowerCase().includes(w))
  }

  if (typeof res === 'object') {
    return Object.keys(res).length === 0
  }

  return false
}

// =========================
// GEMINI (IMAGEM - OTIMIZADO)
// =========================
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
        const res = await withTimeout(
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
Você é um sistema de reconhecimento de produtos.

REGRAS:
- Prioridade: código de barras
- Depois: nome do produto
- Seja específico (marca, tipo)
- NÃO invente informações
- Se não souber, retorne vazio

Responda JSON:
{
  "code": "string",
  "productName": "string",
  "confidence": number
}

${prompt}
`
                      },
                      ...images.map(img => ({
                        inlineData: {
                          mimeType: img.mimeType,
                          data: img.data
                        }
                      }))
                    ]
                  }
                ]
              })
            }
          )
        )

        if (!res.ok) {
          const text = await res.text()
          throw new Error(`gemini_${res.status}_${text}`)
        }

        const json = await res.json()

        const text =
          json?.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || ''

        return extractJSON(text) || text
      })

      geminiIndex = (geminiIndex + 1) % totalKeys

      return result
    } catch (err) {
      console.warn(`❌ Gemini key ${geminiIndex} falhou:`, err.message)

      geminiIndex = (geminiIndex + 1) % totalKeys
      attempts++

      if (!isLimitError(err.message)) {
        throw err
      }
    }
  }

  throw new Error('Todas as keys do Gemini falharam')
}

// =========================
// MISTRAL (TEXTO)
// =========================
async function callMistral({ prompt }) {
  if (!MISTRAL_API_KEY) {
    throw new Error('Sem Mistral API Key')
  }

  return retry(async () => {
    const res = await withTimeout(
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

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`mistral_${res.status}_${text}`)
    }

    const json = await res.json()
    const text = json?.choices?.[0]?.message?.content || ''

    return extractJSON(text) || text
  })
}

// =========================
// ORQUESTRADOR FINAL
// =========================
export async function callAI({ prompt, images = [] }) {
  const cacheKey = getCacheKey({ prompt, images })

  const cached = getCache(cacheKey)
  if (cached) {
    console.log('⚡ cache hit')
    return cached
  }

  const isImage = images.length > 0
  let result

  if (isImage) {
    try {
      result = await callGemini({ prompt, images })
    } catch (err) {
      console.warn('⚠️ fallback Gemini → Mistral')

      result = await callMistral({
        prompt: `Descreva detalhadamente o produto na imagem: ${prompt}`
      })
    }
  } else {
    result = await callMistral({ prompt })
  }

  if (isBadResponse(result)) {
    throw new Error('Resposta inválida')
  }

  setCache(cacheKey, result)

  return result
}

export const callAIWithFallback = callAI