import { checkGeminiRateLimit } from '@/lib/server/gemini-rate-limit'

function createUserError(message, status = 400) {
  return Response.json({ error: message }, { status })
}

export async function POST(req) {
  try {
    const geminiApiKey =
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''

    if (!geminiApiKey) {
      console.error('Gemini API key nao configurada para analise de giro.')
      return createUserError('A analise de giro esta indisponivel no momento.', 500)
    }

    const rateLimit = checkGeminiRateLimit()
    if (!rateLimit.allowed) {
      return createUserError(rateLimit.message, rateLimit.status)
    }

    let body

    try {
      body = await req.json()
    } catch {
      return createUserError('Nao foi possivel ler os dados da analise.', 400)
    }

    const products = Array.isArray(body?.products) ? body.products.slice(0, 80) : []

    if (products.length === 0) {
      return createUserError('Nao ha dados suficientes para analisar o giro agora.', 400)
    }

    const prompt = [
      'Voce esta ajudando um almoxarifado a revisar o giro de estoque.',
      'Recebera uma lista resumida de produtos com estoque atual, min, max e movimentacoes recentes.',
      'Analise o giro de forma utilitaria e objetiva.',
      'Considere especialmente as saidas dos ultimos 30 e 90 dias.',
      'Quando o estoque fisico estiver muito acima do consumo, sugira reduzir max e talvez min.',
      'Quando o consumo estiver alto e o estoque atual ou minimo parecer baixo, sugira aumentar min e max.',
      'Evite linguagem tecnica. Seja direto e curto.',
      'Responda somente no JSON pedido.'
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
                { text: JSON.stringify({ products }) }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                recommendations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      productId: { type: 'string' },
                      name: { type: 'string' },
                      turnoverLabel: { type: 'string' },
                      minSuggestion: { type: 'number' },
                      maxSuggestion: { type: 'number' },
                      recommendation: { type: 'string' },
                      reason: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        })
      }
    )

    const result = await response.json()

    if (!response.ok) {
      console.error('Erro Gemini turnover analysis:', response.status, result)
      return createUserError('Nao foi possivel analisar o giro agora. Tente novamente.', response.status)
    }

    const outputText =
      result?.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === 'string')
        ?.text || ''

    if (!outputText) {
      return Response.json({
        summary: 'Nao foi possivel gerar uma leitura do giro agora.',
        recommendations: []
      })
    }

    try {
      const parsed = JSON.parse(outputText)
      return Response.json({
        summary:
          typeof parsed?.summary === 'string'
            ? parsed.summary
            : 'A leitura de giro foi concluida.',
        recommendations: Array.isArray(parsed?.recommendations)
          ? parsed.recommendations
          : []
      })
    } catch (error) {
      console.error('Resposta invalida na analise de giro:', outputText, error)
      return Response.json({
        summary: 'A leitura de giro foi concluida, mas sem recomendacoes detalhadas.',
        recommendations: []
      })
    }
  } catch (error) {
    console.error('Erro geral na analise de giro:', error)
    return createUserError('Nao foi possivel analisar o giro agora. Tente novamente.', 500)
  }
}
