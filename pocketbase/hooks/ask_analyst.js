// Hook to chat with the native Skip Cloud agent (analista-radar) with streaming support or synchronous fallback
// Handles /backend/v1/radar/ask-analyst and /backend/v1/radar/ask-analyst-stream

routerAdd(
  'POST',
  '/backend/v1/radar/ask-analyst',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const question = (body.question || body.message || '').trim()
    const productId = (body.product_id || '').trim()
    const conversationId = body.conversation_id || null

    if (!question && !productId) {
      return e.badRequestError('Pergunta ou ID de produto obrigatório')
    }

    try {
      let finalMessage = question
      if (productId) {
        try {
          const prod = $app.findFirstRecordByData('products', 'id', productId)
          const prodContext = `[Contexto do Produto Selecionado: "${prod.getString('title')}" | Plataforma: ${prod.getString('platform')} | Preço: R$ ${prod.getFloat('price')} (Promo: R$ ${prod.getFloat('promo_price')}) | Comissão: ${prod.getFloat('commission_rate')}% (~R$ ${prod.getFloat('commission_amount')}) | Vendas: ${prod.getFloat('sales_count')} | Nota: ${prod.getFloat('rating')}/5.0 | Score: ${prod.getFloat('opportunity_score')}/100 (${prod.getString('opportunity_level')})]`
          finalMessage = `${prodContext}\n\nPergunta: ${question || 'Analise a viabilidade e me dê o melhor plano de vendas para este produto.'}`
        } catch (_) {}
      }

      // Call the native agent
      const result = $ai.agent('analista-radar').chat({
        user_id: userId,
        conversation_id: conversationId,
        message: finalMessage,
      })

      return e.json(200, {
        conversation_id: result.conversation_id,
        message_id: result.message_id,
        answer: result.content,
        content: result.content,
        citations: result.citations,
      })
    } catch (err) {
      console.log('Error in ask-analyst agent chat: ' + err)
      // Fallback if agent error
      try {
        const fallbackChat = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content:
                'Você é o Analista do Radar de Produtos IA, especialista sênior em e-commerce e afiliados no Brasil. Responda de forma estratégica, prática e direta em português do Brasil (pt-BR).',
            },
            {
              role: 'user',
              content: question || 'Analise as melhores oportunidades de produtos para afiliados.',
            },
          ],
        })
        return e.json(200, {
          conversation_id: conversationId || 'fallback-conv',
          message_id: 'fb-' + Date.now(),
          answer: fallbackChat.choices?.[0]?.message?.content || 'Análise concluída com sucesso.',
          content: fallbackChat.choices?.[0]?.message?.content || 'Análise concluída com sucesso.',
        })
      } catch (fbErr) {
        return e.json(500, { error: 'Erro ao consultar o Analista IA: ' + err.message })
      }
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/radar/ask-analyst-stream',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const question = (body.question || body.message || '').trim()
    const productId = (body.product_id || '').trim()

    if (!question && !productId) {
      return e.badRequestError('Pergunta ou ID de produto obrigatório')
    }

    let finalMessage = question
    if (productId) {
      try {
        const prod = $app.findFirstRecordByData('products', 'id', productId)
        const prodContext = `[Contexto do Produto Selecionado: "${prod.getString('title')}" | Plataforma: ${prod.getString('platform')} | Preço: R$ ${prod.getFloat('price')} | Promo: R$ ${prod.getFloat('promo_price')} | Comissão: ${prod.getFloat('commission_rate')}% (~R$ ${prod.getFloat('commission_amount')}) | Vendas: ${prod.getFloat('sales_count')} | Nota: ${prod.getFloat('rating')}/5.0 | Score: ${prod.getFloat('opportunity_score')}/100 (${prod.getString('opportunity_level')})]`
        finalMessage = `${prodContext}\n\nPergunta: ${question || 'Analise a viabilidade e me dê o melhor plano de vendas para este produto.'}`
      } catch (_) {}
    }

    const conv = $ai.agent('analista-radar').getOrCreateConversation({
      user_id: userId,
      id: body.conversation_id || null,
    })

    const iter = $ai.agent('analista-radar').chat({
      user_id: userId,
      conversation_id: conv.id,
      message: finalMessage,
      stream: true,
    })

    e.response.header().set('Content-Type', 'text/event-stream')
    e.response.header().set('Cache-Control', 'no-cache')
    e.response.header().set('X-Conversation-Id', conv.id)
    $response.stream(e, iter)
  },
  $apis.requireAuth(),
)
