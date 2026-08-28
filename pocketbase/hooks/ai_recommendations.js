// Route to get or regenerate global AI recommendations for the Dashboard

routerAdd(
  'POST',
  '/backend/v1/radar/ai-recommendations',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    try {
      const products = $app.findRecordsByFilter('products', '', '-opportunity_score', 15, 0)
      if (!products || products.length === 0) {
        return e.json(200, {
          recommendations:
            'Cadastre ou importe seus primeiros produtos para que a IA gere recomendações de mercado.',
          top_picks: [],
        })
      }

      const prodsSummary = products
        .map((p, idx) => {
          return `${idx + 1}. ${p.getString('title')} (Score: ${p.getFloat('opportunity_score')}/100, Nível: ${p.getString('opportunity_level')}, Preço: R$ ${p.getFloat('price')}, Comissão: R$ ${p.getFloat('commission_amount')}, Vendas: ${p.getFloat('sales_count')}, Categoria: ${p.getString('category')})`
        })
        .join('\n')

      const prompt =
        `Você é o Analista do Radar de Produtos. Baseado nos seguintes produtos catalogados no banco de dados do afiliado:\n\n${prodsSummary}\n\n` +
        `Gere a seção de RECOMENDAÇÕES DA IA com uma frase do tipo: 'Entre os produtos analisados, estes são os X que eu testaria primeiro.' explicando resumidamente os motivos estratégicos (ex: equilíbrio entre comissão em R$, apelo para vídeo e demanda validada).\n` +
        `Selecione os 3 a 5 melhores produtos com base em probabilidade de lucro real. Retorne em formato JSON válido com as chaves: { "recommendation_text": "...", "top_picks": [ { "id": "...", "title": "...", "score": 90, "reason": "..." } ] }`

      const chatRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é o Analista do Radar. Retorne APENAS um JSON válido sem markdown ou backticks com as chaves recommendation_text e top_picks.',
          },
          {
            role: 'user',
            content: prompt,
          },
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
      } catch (_) {
        parsed = {
          recommendation_text: raw,
          top_picks: products.slice(0, 3).map((p) => ({
            id: p.id,
            title: p.getString('title'),
            score: p.getFloat('opportunity_score'),
            reason: p.getString('ai_summary') || 'Alto score de conversão',
          })),
        }
      }

      // Save into ai_insights
      try {
        const insights = $app.findRecordsByFilter('ai_insights', '', '-created', 1, 0)
        let insightRec
        if (insights && insights.length > 0) {
          insightRec = insights[0]
        } else {
          const col = $app.findCollectionByNameOrId('ai_insights')
          insightRec = new Record(col)
        }
        insightRec.set('global_recommendations', parsed.recommendation_text || '')
        insightRec.set('top_picks', parsed.top_picks || [])
        $app.save(insightRec)
      } catch (saveErr) {
        console.log('Error saving ai_insights: ' + saveErr)
      }

      return e.json(200, {
        recommendation_text: parsed.recommendation_text,
        top_picks: parsed.top_picks,
      })
    } catch (err) {
      console.log('Error in ai-recommendations endpoint: ' + err)
      return e.json(500, { error: 'Erro ao gerar recomendações de IA' })
    }
  },
  $apis.requireAuth(),
)
