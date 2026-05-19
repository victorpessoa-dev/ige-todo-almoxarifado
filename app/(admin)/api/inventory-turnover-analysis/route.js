import { callAI } from '@/lib/server/ai-providers'

const MAX_TURNOVER_ANALYSIS_PRODUCTS = 5

function createUserError(message, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function POST(req) {
  try {
    const body = await req.json()

    const products = Array.isArray(body?.products)
      ? body.products.slice(0, MAX_TURNOVER_ANALYSIS_PRODUCTS)
      : []

    if (products.length === 0) {
      return createUserError('Sem dados para análise.')
    }

    const prompt = `
      Analise o giro de estoque.

      Considere:
      - consumo 30, 60 e 90 dias
      - estoque atual vs mínimo/máximo

      Responda JSON:
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
      recommendations: Array.isArray(data?.recommendations)
        ? data.recommendations
        : []
    })
  } catch (error) {
    console.error('Erro turnover:', error)

    return createUserError(
      'Nao foi possivel analisar o giro agora.',
      500
    )
  }
}
