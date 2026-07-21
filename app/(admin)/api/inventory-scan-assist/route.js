import { callAI } from '@/lib/server/ai-providers'
import { checkRateLimit, createRateLimitResponse } from '@/lib/server/rate-limit'
import { authenticateApiRequest, createUnauthorizedResponse } from '@/lib/server/api-auth'

/**
 * Endpoint de assistencia ao scanner de inventario.
 *
 * Tenta identificar codigo ou nome a partir de uma imagem e cruza o resultado
 * com uma amostra limitada do catalogo enviada pelo cliente.
 */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_CATALOG_ITEMS = 300
const MAX_TEXT_LENGTH = 120
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

/**
 * Cria respostas padronizadas para falhas esperadas de validacao.
 *
 * @param {string} message Mensagem segura para exibicao ao usuario.
 * @param {number} status Codigo HTTP da resposta.
 * @returns {Response}
 */
function createUserError(message, status = 400) {
  return Response.json({ error: message }, { status })
}

/**
 * Normaliza textos para comparacoes tolerantes a acentos e caixa.
 *
 * Essa normalizacao ajuda a IA a sugerir nomes aproximados sem exigir
 * correspondencia visual perfeita com o cadastro.
 */
function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/**
 * Limpa textos enviados ao prompt para manter tamanho previsivel.
 *
 * @param {unknown} value Valor informado pelo cliente.
 * @param {number} maxLength Limite maximo de caracteres.
 * @returns {string}
 */
function cleanText(value, maxLength = MAX_TEXT_LENGTH) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength)
}

/**
 * Identifica um produto a partir de uma imagem de etiqueta ou codigo.
 *
 * A rota nao grava dados; ela apenas valida o payload, consulta a IA e aplica
 * uma correspondencia local para retornar um produto existente quando houver
 * confianca suficiente.
 */
export async function POST(req) {
  try {
    const { user, accessToken } = await authenticateApiRequest(req)
    if (!user) return createUnauthorizedResponse()

    const rateLimit = await checkRateLimit({
      accessToken,
      keyPrefix: 'api:inventory-scan-assist'
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

    // Envia somente dados essenciais do catalogo ao prompt para reduzir custo,
    // vazamento de contexto e risco de exceder limites do provedor.
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

    // Codigo exato tem prioridade sobre nome, pois evita escolher produtos
    // visualmente parecidos quando a etiqueta contem identificador confiavel.
    if (code) {
      match =
        produtos.find((produto) => String(produto.cod_barra || '') === code) ||
        produtos.find((produto) => String(produto.cod || '') === code) ||
        null
    }

    // O fallback por nome e propositalmente conservador: nomes muito curtos
    // aumentam falsos positivos em catalogos com itens semelhantes.
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
