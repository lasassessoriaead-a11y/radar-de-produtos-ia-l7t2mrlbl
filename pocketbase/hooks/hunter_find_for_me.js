// Hook to parse natural language intent into structured search filters
// Then executes the search or returns structured filters to frontend

routerAdd(
  'POST',
  '/backend/v1/hunter/find-for-me',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const prompt = (body.prompt || body.intent || '').trim()

    if (!prompt) {
      return e.badRequestError('Informe o que você deseja encontrar em linguagem natural.')
    }

    try {
      // Use $ai.chat fast to extract structured JSON filters
      const systemPrompt =
        'Você é o motor de interpretação de busca do Radar de Produtos IA. Seu trabalho é transformar a intenção do usuário em linguagem natural para um conjunto de filtros estruturados para busca em APIs de marketplace (Mercado Livre).\n' +
        'Retorne APENAS um JSON válido sem markdown ou crases no formato:\n' +
        '{\n' +
        '  "query": "termo de busca otimizado",\n' +
        '  "category": "Casa e Cozinha | Eletrônicos & Áudio | Beleza & Cuidados | Saúde & Fitness | Automotivo | Geral",\n' +
        '  "min_price": 0,\n' +
        '  "max_price": 200,\n' +
        '  "min_sales": 50,\n' +
        '  "min_rating": 4.0,\n' +
        '  "estimated_commission_rate": 10,\n' +
        '  "marketplace": "Mercado Livre",\n' +
        '  "ai_intent_summary": "resumo de 1 frase do que foi interpretado"\n' +
        '}'

      const chatRes = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Intenção do usuário: "${prompt}"` },
        ],
      })

      let raw = chatRes.choices?.[0]?.message?.content || '{}'
      raw = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim()

      let parsed = {}
      try {
        parsed = JSON.parse(raw)
      } catch (pErr) {
        parsed = {
          query: prompt,
          category: 'Geral',
          min_price: 0,
          max_price: 300,
          min_sales: 10,
          min_rating: 4.0,
          estimated_commission_rate: 10,
          marketplace: 'Mercado Livre',
          ai_intent_summary: 'Busca direta por: ' + prompt,
        }
      }

      return e.json(200, {
        success: true,
        interpreted_filters: parsed,
      })
    } catch (err) {
      console.log('Error in find-for-me: ' + err)
      return e.json(500, { error: 'Erro ao interpretar intenção: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
