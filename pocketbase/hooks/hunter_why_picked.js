// Hook for "Por que a IA escolheu?" explanation modal
// Returns: Pontos Fortes, Pontos Fracos, Público Provável, Ângulo de Venda, Nível de Risco, Resumo de Decisão

routerAdd(
  'POST',
  '/backend/v1/hunter/why-ai-picked',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const productId = (body.id || body.product_id || '').trim()
    const isDiscovered = body.is_discovered !== false // default true

    if (!productId) {
      return e.badRequestError('ID do produto obrigatório')
    }

    try {
      const collectionName = isDiscovered ? 'discovered_products' : 'products'
      let record
      try {
        record = $app.findFirstRecordByData(collectionName, 'id', productId)
      } catch (_) {
        // Try fallback to the other collection if not found
        const altCol = isDiscovered ? 'products' : 'discovered_products'
        record = $app.findFirstRecordByData(altCol, 'id', productId)
      }

      if (!record) {
        return e.notFoundError('Produto não encontrado')
      }

      // Check if already enriched with structured AI points
      const cachedStrengths = record.get('ai_strengths')
      const cachedReason = record.getString('ai_analysis')
      if (
        cachedStrengths &&
        Array.isArray(cachedStrengths) &&
        cachedStrengths.length > 0 &&
        record.getString('ai_target_audience')
      ) {
        return e.json(200, {
          title: record.getString('title'),
          score: record.getFloat('opportunity_score'),
          level: record.getString('opportunity_level'),
          explanation:
            record.getString('ai_summary') ||
            'Boa oportunidade de afiliação com equilíbrio consistente de mercado.',
          full_analysis: record.getString('ai_analysis'),
          strengths: record.get('ai_strengths') || [],
          weaknesses: record.get('ai_weaknesses') || [],
          target_audience:
            record.getString('ai_target_audience') || 'Público geral interessado no nicho',
          selling_angle:
            record.getString('ai_selling_angle') || 'Demonstração de benefício prático imediato',
          risk_level: record.getString('ai_risk_level') || 'Médio',
        })
      }

      // Generate structured explanation using Skip AI
      const title = record.getString('title')
      const platform = record.getString('platform')
      const price = record.getFloat('price')
      const promoPrice = record.getFloat('promo_price')
      const effectivePrice = promoPrice > 0 ? promoPrice : price
      const commRate = record.getFloat('commission_rate')
      const commAmount = record.getFloat('commission_amount')
      const sales = record.getFloat('sales_count')
      const rating = record.getFloat('rating')
      const score = record.getFloat('opportunity_score')

      const prompt =
        `Avalie estrategicamente o produto abaixo para o Caçador de Oportunidades do Radar de Produtos IA:\n\n` +
        `Produto: ${title}\n` +
        `Plataforma: ${platform}\n` +
        `Preço: R$ ${effectivePrice.toFixed(2)}\n` +
        `Comissão estimada/informada: ${commRate}% (~R$ ${commAmount.toFixed(2)})\n` +
        `Vendas registradas: ${sales}\n` +
        `Nota: ${rating.toFixed(1)}/5.0\n` +
        `Score de Oportunidade: ${score}/100\n\n` +
        `Retorne APENAS um JSON válido sem markdown com a estrutura exata:\n` +
        `{\n` +
        `  "explanation": "Texto curto e direto (2-3 linhas) explicando por que a IA recomenda testar este produto.",\n` +
        `  "strengths": ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3"],\n` +
        `  "weaknesses": ["Ponto de atenção / fraqueza 1", "Ponto de atenção 2"],\n` +
        `  "target_audience": "Quem compra esse produto (perfil detalhado)",\n` +
        `  "selling_angle": "Melhor gancho de venda para vídeo curto (Reels/TikTok/Shorts)",\n` +
        `  "risk_level": "Baixo | Médio | Alto"\n` +
        `}`

      const chatRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é o Analista do Radar de Produtos IA. Forneça respostas estratégicas e rigorosas para afiliados em pt-BR. Retorne somente JSON.',
          },
          { role: 'user', content: prompt },
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
          explanation:
            'Boa oportunidade porque combina ticket acessível, volume consistente de validação e facilidade de demonstração em vídeo.',
          strengths: ['Ticket atrativo para conversão rápida', 'Validação no marketplace'],
          weaknesses: ['Concorrência no nicho requer bom criativo'],
          target_audience: 'Compradores casuais em busca de praticidade',
          selling_angle: 'Demonstração de solução rápida em 15 segundos',
          risk_level: 'Médio',
        }
      }

      // Persist enriched data into record if discovered_products
      try {
        record.set('ai_summary', parsed.explanation || '')
        record.set('ai_strengths', parsed.strengths || [])
        record.set('ai_weaknesses', parsed.weaknesses || [])
        record.set('ai_target_audience', parsed.target_audience || '')
        record.set('ai_selling_angle', parsed.selling_angle || '')
        record.set('ai_risk_level', parsed.risk_level || 'Médio')
        $app.save(record)
      } catch (saveErr) {
        console.log('Error updating record with why-picked details: ' + saveErr)
      }

      return e.json(200, {
        title,
        score,
        level: record.getString('opportunity_level'),
        explanation: parsed.explanation,
        strengths: parsed.strengths,
        weaknesses: parsed.weaknesses,
        target_audience: parsed.target_audience,
        selling_angle: parsed.selling_angle,
        risk_level: parsed.risk_level,
      })
    } catch (err) {
      console.log('Error in why-ai-picked: ' + err)
      return e.json(500, { error: 'Erro ao analisar decisão da IA: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
