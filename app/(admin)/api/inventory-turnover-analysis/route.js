import { callAI } from '@/lib/server/ai-providers'

const MAX_TURNOVER_ANALYSIS_PRODUCTS = 5

function createUserError(message, status = 400) {
  return Response.json({ error: message }, { status })
}

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
    `No período, houve ${totalOut} saída(s) e ${totalIn} entrada(s).`
  ]

  if (lowStockItems.length > 0) {
    summaryParts.push(`${lowStockItems.length} produto(s) estão no mínimo ou abaixo dele.`)
  }

  if (stoppedItems.length > 0) {
    summaryParts.push(`${stoppedItems.length} produto(s) merecem atenção por baixa ou nenhuma saída recente.`)
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
      let recommendation = 'Manter os parâmetros atuais e acompanhar o próximo período.'
      let reason = 'O giro recente não indica necessidade clara de ajuste.'

      if (saida30 > 0 || avgMonthlyOut > 0) {
        minSuggestion = Math.max(1, Math.ceil(avgMonthlyOut * 0.5))
        maxSuggestion = Math.max(minSuggestion + 1, Math.ceil(avgMonthlyOut * 1.5))
        recommendation = 'Ajustar mínimo e máximo com base na média mensal de saída.'
        reason = `Média mensal aproximada de saída: ${avgMonthlyOut}.`
      }

      if (currentStock <= currentMin) {
        maxSuggestion = Math.max(maxSuggestion, currentMax, currentStock + Math.ceil(avgMonthlyOut || 1))
        recommendation = 'Priorizar reposicao deste produto.'
        reason = `Estoque atual (${currentStock}) está no mínimo ou abaixo do mínimo (${currentMin}).`
      }

      if ((daysWithoutSales == null || daysWithoutSales >= 60) && saida30 === 0) {
        minSuggestion = 0
        maxSuggestion = Math.max(1, Math.min(currentMax || 1, currentStock || 1))
        recommendation = 'Evitar compra até voltar a ter saída.'
        reason =
          daysWithoutSales == null
            ? 'Não há registro de saída para este produto.'
            : `Produto está há ${daysWithoutSales} dias sem saída.`
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

export async function POST(req) {
  let products = []

  try {
    const body = await req.json()

    products = Array.isArray(body?.products)
      ? body.products.slice(0, MAX_TURNOVER_ANALYSIS_PRODUCTS)
      : []

    if (products.length === 0) {
      return createUserError('Sem dados para análise.')
    }

    const prompt = `
      Analise o giro de estoque.

      Considere:
      - saídas e entradas no período selecionado
      - estoque atual vs mínimo/máximo
      - média mensal de saída
      - dias sem saída

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
      summary: data?.summary || 'Análise concluída.',
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

    return createUserError('Não foi possível analisar o giro agora.', 500)
  }
}
