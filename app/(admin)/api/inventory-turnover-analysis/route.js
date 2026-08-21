import { callAI } from '@/lib/server/ai-providers'
import { checkRateLimit, createRateLimitResponse } from '@/lib/server/rate-limit'
import { requireApiAuth } from '@/lib/server/api-auth'

/**
 * Endpoint de analise de giro de estoque.
 *
 * Combina dados recentes de movimentacao com sugestoes de IA e mantem um
 * fallback local para nao deixar a tela sem resposta quando a integracao falha.
 */
const MAX_TURNOVER_ANALYSIS_PRODUCTS = 5
const MAX_TEXT_LENGTH = 140

/**
 * Cria respostas padronizadas para falhas esperadas de validacao.
 *
 * @param {string} message Mensagem segura para exibicao na interface.
 * @param {number} status Codigo HTTP da resposta.
 * @returns {Response}
 */
function createUserError(message, status = 400) {
  return Response.json({ error: message }, { status })
}

/**
 * Limpa textos antes de inclui-los no prompt da IA.
 *
 * @param {unknown} value Valor recebido do cliente.
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
 * Converte valores numericos recebidos do cliente com fallback seguro.
 *
 * @param {unknown} value Valor a normalizar.
 * @param {number|null} fallback Valor usado quando a conversao falha.
 * @returns {number|null}
 */
function cleanNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

/**
 * Normaliza o produto usado na analise para limitar tamanho e tipos do prompt.
 *
 * @param {Object} product Produto calculado na interface.
 * @returns {Object}
 */
function normalizeProduct(product = {}) {
  return {
    productId: cleanText(product.productId, 80),
    name: cleanText(product.name),
    turnoverLabel: cleanText(product.turnoverLabel, 80),
    currentStock: cleanNumber(product.currentStock),
    min: cleanNumber(product.min),
    max: cleanNumber(product.max),
    avgMonthlyOut: cleanNumber(product.avgMonthlyOut),
    saida30: cleanNumber(product.saida30),
    entrada30: cleanNumber(product.entrada30),
    daysWithoutSales:
      product.daysWithoutSales === null || product.daysWithoutSales === undefined
        ? null
        : cleanNumber(product.daysWithoutSales, null)
  }
}

/**
 * Gera uma recomendacao local quando a IA esta indisponivel.
 *
 * A regra privilegia estabilidade operacional: sugere reposicao para estoque
 * baixo e evita compra de itens sem saida recente.
 */
function buildLocalTurnoverAnalysis(products) {
  const totalOut = products.reduce((acc, product) => acc + Number(product.saida30 || 0), 0)
  const totalIn = products.reduce((acc, product) => acc + Number(product.entrada30 || 0), 0)
  const lowStockItems = products.filter(
    (product) => Number(product.currentStock || 0) <= Number(product.min || 0)
  )
  const stoppedItems = products.filter(
    (product) => product.daysWithoutSales == null || Number(product.daysWithoutSales) >= 60
  )

  const summaryParts = [
    `Foram avaliados ${products.length} produto(s).`,
    `No periodo, houve ${totalOut} saida(s) e ${totalIn} entrada(s).`
  ]

  if (lowStockItems.length > 0) {
    summaryParts.push(`${lowStockItems.length} produto(s) estao no minimo ou abaixo dele.`)
  }

  if (stoppedItems.length > 0) {
    summaryParts.push(`${stoppedItems.length} produto(s) merecem atencao por baixa ou nenhuma saida recente.`)
  }

  return {
    summary: summaryParts.join(' '),
    source: 'local',
    recommendations: products.map((product) => {
      const currentStock = Number(product.currentStock || 0)
      const currentMin = Number(product.min || 0)
      const currentMax = Number(product.max || 0)
      const avgMonthlyOut = Number(product.avgMonthlyOut || 0)
      const saida30 = Number(product.saida30 || 0)
      const daysWithoutSales = product.daysWithoutSales

      let minSuggestion = currentMin
      let maxSuggestion = currentMax
      let recommendation = 'Manter os parametros atuais e acompanhar o proximo periodo.'
      let reason = 'O giro recente nao indica necessidade clara de ajuste.'

      if (saida30 > 0 || avgMonthlyOut > 0) {
        minSuggestion = Math.max(1, Math.ceil(avgMonthlyOut * 0.5))
        maxSuggestion = Math.max(minSuggestion + 1, Math.ceil(avgMonthlyOut * 1.5))
        recommendation = 'Ajustar minimo e maximo com base na media mensal de saida.'
        reason = `Media mensal aproximada de saida: ${avgMonthlyOut}.`
      }

      if (currentStock <= currentMin) {
        maxSuggestion = Math.max(maxSuggestion, currentMax, currentStock + Math.ceil(avgMonthlyOut || 1))
        recommendation = 'Priorizar reposicao deste produto.'
        reason = `Estoque atual (${currentStock}) esta no minimo ou abaixo do minimo (${currentMin}).`
      }

      if ((daysWithoutSales == null || daysWithoutSales >= 60) && saida30 === 0) {
        minSuggestion = 0
        maxSuggestion = Math.max(1, Math.min(currentMax || 1, currentStock || 1))
        recommendation = 'Evitar compra ate voltar a ter saida.'
        reason =
          daysWithoutSales == null
            ? 'Nao ha registro de saida para este produto.'
            : `Produto esta ha ${daysWithoutSales} dias sem saida.`
      }

      return {
        productId: product.productId,
        name: product.name,
        turnoverLabel: product.turnoverLabel,
        minSuggestion,
        maxSuggestion,
        recommendation,
        reason
      }
    })
  }
}

/**
 * Analisa produtos selecionados e retorna recomendacoes de minimo/maximo.
 *
 * O limite de itens mantem o prompt pequeno e previsivel para uma analise
 * pontual, feita sob demanda pelo usuario.
 */
export async function POST(req) {
  let products = []

  try {
    const auth = await requireApiAuth(req)
    if (auth.response) return auth.response
    const rateLimit = checkRateLimit(req, {
      keyPrefix: 'api:inventory-turnover-analysis',
      limit: 15,
      windowMs: 60_000
    })

    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.retryAfter)
    }

    const body = await req.json()

    products = Array.isArray(body?.products)
      ? body.products.slice(0, MAX_TURNOVER_ANALYSIS_PRODUCTS).map(normalizeProduct)
      : []

    if (products.length === 0) {
      return createUserError('Sem dados para analise.')
    }

    const prompt = `
      Analise o giro de estoque.

      Considere:
      - saidas e entradas no periodo selecionado
      - estoque atual vs minimo/maximo
      - media mensal de saida
      - dias sem saida

      Retorne somente JSON valido:
      {
        "summary": "string",
        "recommendations": [
          {
            "productId": "string",
            "name": "string",
            "turnoverLabel": "string",
            "minSuggestion": number,
            "maxSuggestion": number,
            "recommendation": "string",
            "reason": "string"
          }
        ]
      }

      Dados:
      ${JSON.stringify(products)}
`

    const data = await callAI({
      prompt,
      images: []
    })

    return Response.json({
      summary: data?.summary || 'Analise concluida.',
      source: 'ai',
      recommendations: Array.isArray(data?.recommendations)
        ? data.recommendations
        : []
    })
  } catch (error) {
    console.error('Erro turnover:', error)

    if (products.length > 0) {
      return Response.json(buildLocalTurnoverAnalysis(products))
    }

    return createUserError('Nao foi possivel analisar o giro agora.', 500)
  }
}
