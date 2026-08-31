// Hook for AI Performance Insights & Diagnostics
// Route: POST /backend/v1/performance/ai-insights

routerAdd(
  'POST',
  '/backend/v1/performance/ai-insights',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('Autenticação necessária')

    const body = e.requestInfo().body || {}
    const statsData = body.stats || {}
    const variationsData = Array.isArray(body.variations) ? body.variations : []
    const productsData = Array.isArray(body.products) ? body.products : []

    const systemPrompt = `Você é o Diretor de Performance e Analista de Inteligência de Conversão do Radar de Produtos IA.
Sua missão é interpretar os resultados REAIS das campanhas publicadas e gerar diagnósticos estratégicos de alto valor.

PRINCÍPIOS OBRIGATÓRIOS:
1. NUNCA inventar dados ou certezas onde há correlação.
2. Distinguir claramente: "DADO REAL COMPROVADO" de "HIPÓTESE A SER TESTADA".
3. Se o volume de cliques/conversões for baixo (< 100 cliques ou < 3 conversões), avisar que os dados são preliminares.
4. Identificar discrepâncias: ex. produto com alto Opportunity Score previsto vs baixa conversão real (diagnosticar possível gargalo de preço, promessa ou página de destino).
5. Analisar o desempenho dos ângulos (Problema vs Demonstração vs Benefício).
6. Todas as respostas em português, tom cirúrgico, profissional e prático.`

    const userPrompt = `Analise os seguintes dados consolidados da operação:
KPIs Gerais:
- Publicações Ativas: ${statsData.publications || 0}
- Cliques Brutos: ${statsData.raw_clicks || 0}
- Cliques Válidos: ${statsData.valid_clicks || 0} (Filtro Anti-Bot removeu ${statsData.bot_clicks_filtered || 0} bots/crawlers)
- Conversões Confirmadas: ${statsData.conversions_count || 0}
- Total em Vendas: R$ ${statsData.total_sales || 0}
- Comissão Total: R$ ${statsData.total_commission || 0}
- Custos: R$ ${statsData.total_costs || 0}
- Lucro Líquido: R$ ${statsData.net_profit || 0}
- ROI: ${statsData.roi_percentage || 0}%

Variações A/B/C:
${JSON.stringify(variationsData.slice(0, 6), null, 2)}

Produtos no Radar:
${JSON.stringify(productsData.slice(0, 6), null, 2)}

Retorne um JSON exatamente no seguinte formato:
{
  "diagnostic_summary": "resumo executivo do que está acontecendo na operação",
  "data_reliability_level": "alto" | "medio" | "preliminar",
  "winner_variation_insight": "análise sobre a variação que está performando melhor e por quê",
  "prediction_vs_reality_insight": "comparativo entre os scores previstos pela IA e a conversão real das ofertas",
  "channel_efficiency_insight": "análise de eficácia dos canais utilizados (Telegram vs Manuais)",
  "recommended_actions": [
    "ação prática 1 recomendada para o usuário",
    "ação prática 2 recomendada para o usuário",
    "ação prática 3 recomendada para o usuário"
  ],
  "bot_traffic_warning": "observação sobre o tráfego filtrado e qualidade dos cliques"
}`

    try {
      const completion = $ai.chat({
        model: 'fast',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      })

      const raw = completion.choices?.[0]?.message?.content || '{}'
      let parsed = {}
      try {
        const match = raw.match(/\{[\s\S]*\}/)
        parsed = match ? JSON.parse(match[0]) : JSON.parse(raw)
      } catch (parseErr) {
        // Never fabricate performance findings when the AI response cannot be parsed.
        // Return a transparent, non-assertive fallback based only on the supplied KPIs.
        const validClicks = Number(statsData.valid_clicks || 0)
        const conversions = Number(statsData.conversions_count || 0)
        const rawClicks = Number(statsData.raw_clicks || 0)
        const filtered = Number(statsData.bot_clicks_filtered || 0)
        const hasEnoughData = validClicks >= 100 && conversions >= 3

        parsed = {
          diagnostic_summary:
            'Não foi possível interpretar a resposta analítica da IA com segurança. Os KPIs recebidos continuam disponíveis, mas nenhuma conclusão específica foi inferida.',
          data_reliability_level: hasEnoughData ? 'medio' : 'preliminar',
          winner_variation_insight:
            'Indisponível nesta execução: não há análise validada suficiente para declarar uma variação vencedora.',
          prediction_vs_reality_insight:
            'Indisponível nesta execução: nenhuma relação entre scores previstos e resultados reais foi validada.',
          channel_efficiency_insight:
            'Indisponível nesta execução: nenhuma superioridade entre canais foi validada.',
          recommended_actions: [
            'Reexecutar a análise de performance.',
            'Revisar os KPIs consolidados antes de tomar decisão operacional.',
            'Evitar declarar vencedor ou padrão até haver evidência validada.',
          ],
          bot_traffic_warning:
            rawClicks > 0
              ? `Foram informados ${filtered} cliques filtrados entre ${rawClicks} cliques brutos; isso é um dado técnico, não uma conclusão sobre qualidade de tráfego.`
              : 'Sem volume de cliques suficiente para avaliar tráfego filtrado.',
          analysis_status: 'parse_failed_no_fabrication',
        }
      }

      return e.json(200, parsed)
    } catch (err) {
      console.log('Error getting AI performance insights:', err)
      return e.json(500, { error: 'Erro ao gerar insights da IA: ' + err.message })
    }
  },
  $apis.requireAuth(),
)
