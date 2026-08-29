routerAdd(
  'POST',
  '/backend/v1/intelligence/analysis',
  (e) => {
    // 1. Fetch campaigns, variations, products, tracking links, conversions, costs
    let campaigns = []
    let variations = []
    let products = []
    let conversions = []
    let costs = []
    let insights = []
    let experiments = []
    let calibrations = []

    try {
      campaigns = $app.findRecordsByFilter('campaigns', '', '-created', 100, 0)
    } catch (_) {}
    try {
      variations = $app.findRecordsByFilter('campaign_variations', '', '-created', 200, 0)
    } catch (_) {}
    try {
      products = $app.findRecordsByFilter('products', '', '-opportunity_score', 100, 0)
    } catch (_) {}
    try {
      conversions = $app.findRecordsByFilter(
        'conversions',
        'is_test_data != true',
        '-conversion_date',
        300,
        0,
      )
    } catch (_) {}
    try {
      costs = $app.findRecordsByFilter('campaign_costs', '', '-date', 100, 0)
    } catch (_) {}
    try {
      insights = $app.findRecordsByFilter('sales_insights', '', '-created', 50, 0)
    } catch (_) {}
    try {
      experiments = $app.findRecordsByFilter('learning_experiments', '', 'priority_level', 50, 0)
    } catch (_) {}
    try {
      calibrations = $app.findRecordsByFilter('score_calibrations', '', '-created', 20, 0)
    } catch (_) {}

    // Calculate aggregated metrics
    let totalClicks = 0
    let totalImpressions = 0
    let totalConversions = conversions.length
    let totalSales = 0
    let totalCommission = 0
    let totalCostsAmount = 0

    for (let i = 0; i < conversions.length; i++) {
      const c = conversions[i]
      totalSales += c.getFloat('sale_amount') || 0
      totalCommission += c.getFloat('commission_amount') || 0
    }

    for (let i = 0; i < costs.length; i++) {
      totalCostsAmount += costs[i].getFloat('amount') || 0
    }

    for (let i = 0; i < variations.length; i++) {
      const v = variations[i]
      totalClicks += v.getInt('clicks') || 0
      totalImpressions += v.getInt('impressions') || 0
    }

    // If totalClicks is 0 but conversions exist, assign baseline
    if (totalClicks === 0 && totalConversions > 0) {
      totalClicks = totalConversions * 15
    }

    const overallConversionRate =
      totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(2) : '0.00'
    const overallCtr =
      totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00'
    const netProfit = totalCommission - totalCostsAmount
    const overallRoi =
      totalCostsAmount > 0
        ? ((netProfit / totalCostsAmount) * 100).toFixed(1)
        : totalCommission > 0
          ? '100.0'
          : '0.0'

    // Format response
    const formattedInsights = insights.map((ins) => ({
      id: ins.id,
      key: ins.getString('insight_key'),
      title: ins.getString('title'),
      category_type: ins.getString('category_type'),
      confidence_level: ins.getString('confidence_level'),
      sample_summary: ins.getString('sample_summary'),
      sample_campaigns_count: ins.getInt('sample_campaigns_count'),
      sample_clicks_count: ins.getInt('sample_clicks_count'),
      sample_conversions_count: ins.getInt('sample_conversions_count'),
      sample_impressions_count: ins.getInt('sample_impressions_count'),
      primary_metric_label: ins.getString('primary_metric_label'),
      primary_metric_value: ins.getFloat('primary_metric_value'),
      benchmark_comparison: ins.getString('benchmark_comparison'),
      conclusion_text: ins.getString('conclusion_text'),
      recommendation_text: ins.getString('recommendation_text'),
      status: ins.getString('status'),
      evidence_data: ins.get('evidence_data'),
      target_module: ins.getString('target_module'),
      created: ins.getString('created'),
      updated: ins.getString('updated'),
    }))

    const formattedExperiments = experiments.map((exp) => ({
      id: exp.id,
      hypothesis_title: exp.getString('hypothesis_title'),
      hypothesis_detail: exp.getString('hypothesis_detail'),
      version_a_baseline: exp.getString('version_a_baseline'),
      version_b_challenger: exp.getString('version_b_challenger'),
      primary_metric: exp.getString('primary_metric'),
      secondary_metric: exp.getString('secondary_metric'),
      rationale: exp.getString('rationale'),
      potential_impact: exp.getString('potential_impact'),
      confidence: exp.getString('confidence'),
      effort: exp.getString('effort'),
      priority_level: exp.getString('priority_level'),
      experiment_type: exp.getString('experiment_type'),
      status: exp.getString('status'),
      sample_current: exp.getInt('sample_current'),
      sample_needed: exp.getInt('sample_needed'),
      p_value_observed: exp.getFloat('p_value_observed'),
      stat_significance_reached: exp.getBool('stat_significance_reached'),
      winner_version: exp.getString('winner_version'),
      outcome_notes: exp.getString('outcome_notes'),
      created: exp.getString('created'),
    }))

    const formattedCalibrations = calibrations.map((cal) => ({
      id: cal.id,
      title: cal.getString('title'),
      score_type: cal.getString('score_type'),
      diagnosis: cal.getString('diagnosis'),
      evidence_summary: cal.getString('evidence_summary'),
      proposed_weights: cal.get('proposed_weights'),
      current_weights: cal.get('current_weights'),
      status: cal.getString('status'),
      user_decision_note: cal.getString('user_decision_note'),
      decided_at: cal.getString('decided_at'),
      created: cal.getString('created'),
    }))

    return e.json(200, {
      success: true,
      summary: {
        campaigns_count: campaigns.length,
        variations_count: variations.length,
        conversions_count: totalConversions,
        total_clicks: totalClicks,
        total_impressions: totalImpressions,
        total_sales: totalSales,
        total_commission: totalCommission,
        total_costs: totalCostsAmount,
        net_profit: netProfit,
        roi_percentage: parseFloat(overallRoi),
        conversion_rate: parseFloat(overallConversionRate),
        ctr_percentage: parseFloat(overallCtr),
      },
      insights: formattedInsights,
      experiments: formattedExperiments,
      calibrations: formattedCalibrations,
    })
  },
  $apis.requireAuth(),
)
