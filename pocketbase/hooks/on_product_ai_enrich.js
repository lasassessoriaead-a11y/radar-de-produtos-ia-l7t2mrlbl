// Hook for generating/enriching AI analysis for a product after it is saved if missing
// Executes after DB transaction commits

onRecordAfterCreateSuccess((e) => {
  const record = e.record
  const currentAnalysis = record.getString('ai_analysis')
  const title = record.getString('title')

  // If already has analysis (e.g. from seed), skip
  if (currentAnalysis && currentAnalysis.length > 30) {
    e.next()
    return
  }

  try {
    const platform = record.getString('platform') || 'E-commerce'
    const category = record.getString('category') || 'Geral'
    const price = record.getFloat('price') || 0
    const promoPrice = record.getFloat('promo_price') || price
    const commRate = record.getFloat('commission_rate') || 0
    const commAmount = record.getFloat('commission_amount') || 0
    const sales = record.getFloat('sales_count') || 0
    const rating = record.getFloat('rating') || 0
    const score = record.getFloat('opportunity_score') || 50

    // Use $ai.agent("radar-analyst") or $ai.chat fast
    const prompt =
      `Analise este produto para um afiliado profissional:\n` +
      `Produto: ${title}\n` +
      `Plataforma: ${platform}\n` +
      `Categoria: ${category}\n` +
      `Preço: R$ ${price.toFixed(2)} (Promocional: R$ ${promoPrice.toFixed(2)})\n` +
      `Comissão: ${commRate}% (~R$ ${commAmount.toFixed(2)})\n` +
      `Vendas registradas: ${sales}\n` +
      `Nota/Avaliação: ${rating.toFixed(1)} / 5.0\n` +
      `Score calculado: ${score}/100\n\n` +
      `Forneça uma análise objetiva e prática em pt-BR com os 5 pontos:\n` +
      `1) Por que vale a pena vender;\n` +
      `2) Quem provavelmente compraria (público);\n` +
      `3) Principal benefício;\n` +
      `4) Possível dificuldade para vender;\n` +
      `5) Potencial de conversão e dica de conteúdo.\n\n` +
      `E no final, uma linha iniciando com 'RESUMO: ' com uma frase de impacto para listagem.`

    const chatRes = $ai.chat({
      model: 'fast',
      messages: [
        {
          role: 'system',
          content:
            'Você é o Analista do Radar, consultor sênior de marketing de afiliados e e-commerce. Seja direto, prático, sem rodeios e em português do Brasil.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const fullContent = chatRes.choices?.[0]?.message?.content || ''
    if (fullContent) {
      let summary = ''
      const lines = fullContent.split('\n')
      const summaryLine = lines.find((l) => l.toUpperCase().startsWith('RESUMO:'))
      if (summaryLine) {
        summary = summaryLine.replace(/^[Rr][Ee][Ss][Uu][Mm][Oo]:?\s*/i, '').trim()
      } else {
        summary = lines.find((l) => l.trim().length > 20) || fullContent.slice(0, 120)
      }

      record.set('ai_analysis', fullContent)
      record.set('ai_summary', summary)
      $app.save(record)
    }
  } catch (err) {
    console.log('Error generating AI analysis for product ' + title + ': ' + err)
  }

  e.next()
}, 'products')
