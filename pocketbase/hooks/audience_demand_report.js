// Backend Hook for Audience Demand Reports & Metrics Aggregation
// Aggregates signals, recurring questions, objections, desires, trend classifications (7, 30, 90 days)

routerAdd(
  'POST',
  '/backend/v1/audience/demand-report',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const periodDays = parseInt(body.period_days, 10) || 30
    const category = (body.category || '').trim()

    let filter = ''
    if (category && category !== 'Todas') {
      filter = `category = "${category.replace(/"/g, '\\"')}"`
    }

    try {
      const signals = $app.findRecordsByFilter('audience_signals', filter, '-created', 100, 0) || []
      const opportunities =
        $app.findRecordsByFilter(
          'audience_opportunities',
          filter ? `product_title ~ "${category.replace(/"/g, '\\"')}"` : '',
          '-created',
          100,
          0,
        ) || []
      const leads = $app.findRecordsByFilter('inbound_leads', '', '-created', 100, 0) || []
      const terms =
        $app.findRecordsByFilter('audience_terms_bank', filter, '-created', 100, 0) || []

      // Métricas agregadas
      const totalSignals = signals.length
      let highIntentCount = 0
      let mediumIntentCount = 0
      let lowIntentCount = 0

      const communityCounts = {}
      const questionsGroup = {}
      const objectionsGroup = {}
      const desiresGroup = {}

      for (let i = 0; i < signals.length; i++) {
        const s = signals[i]
        const intentScore = s.getInt('intent_score') || 0
        if (intentScore >= 80) highIntentCount++
        else if (intentScore >= 60) mediumIntentCount++
        else lowIntentCount++

        const comm = s.getString('community') || 'Outros'
        communityCounts[comm] = (communityCounts[comm] || 0) + 1

        const q = s.getString('question_detected')
        if (q) {
          questionsGroup[q] = (questionsGroup[q] || 0) + 1
        }

        const obj = s.getString('objection_detected')
        if (obj) {
          objectionsGroup[obj] = (objectionsGroup[obj] || 0) + 1
        }

        const des = s.getString('desire_detected')
        if (des) {
          desiresGroup[des] = (desiresGroup[des] || 0) + 1
        }
      }

      // Top Comunidades
      const topCommunities = Object.entries(communityCounts)
        .map(([name, count]) => ({ community: name, signals_count: count, source: 'Reddit' }))
        .sort((a, b) => b.signals_count - a.signals_count)
        .slice(0, 5)

      // Top Perguntas
      const topQuestions = Object.entries(questionsGroup)
        .map(([q, count]) => ({ question: q, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)

      // Top Objeções
      const topObjections = Object.entries(objectionsGroup)
        .map(([obj, count]) => ({ objection: obj, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

      // Leads inbound métricas
      const activeLeads = leads.filter((l) => l.getString('consent_status') === 'active')
      const hotLeads = activeLeads.filter((l) => (l.getInt('lead_score') || 0) >= 80)

      // Tendências com verificação de amostra
      let trendStatus = 'stable'
      if (signals.length < 5) {
        trendStatus = 'insufficient_data'
      } else if (highIntentCount / (signals.length || 1) > 0.4) {
        trendStatus = 'growing'
      }

      return e.json(200, {
        success: true,
        period_days: periodDays,
        sample_size: signals.length,
        metrics: {
          total_signals: totalSignals,
          high_intent_signals: highIntentCount,
          medium_intent_signals: mediumIntentCount,
          low_intent_signals: lowIntentCount,
          total_opportunities: opportunities.length,
          active_inbound_leads: activeLeads.length,
          hot_leads: hotLeads.length,
          trend_classification: trendStatus,
        },
        top_communities: topCommunities,
        top_questions: topQuestions,
        top_objections: topObjections,
        top_opportunities: opportunities.slice(0, 8),
      })
    } catch (err) {
      return e.badRequestError('Erro ao gerar relatório de demanda: ' + err.message)
    }
  },
  $apis.requireAuth(),
)
