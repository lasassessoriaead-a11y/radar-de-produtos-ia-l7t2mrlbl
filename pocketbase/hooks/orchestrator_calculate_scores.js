// Route: POST /backend/v1/orchestrator/calculate-scores
// Calculates deterministically: Decision Confidence (0-100), Action Risk (0-100), and Priority Score (0-100)

routerAdd(
  'POST',
  '/backend/v1/orchestrator/calculate-scores',
  (e) => {
    let body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (_) {
      body = {}
    }

    const {
      action_type = 'ANALYZE_PRODUCT',
      target_module = 'radar',
      sample_size = 0,
      data_recency_days = 1,
      historical_conversions = 0,
      historical_similarity_matches = 0,
      is_external_action = false,
      is_financial_action = false,
      estimated_cost = 0,
      is_reversible = true,
      involves_direct_contact = false,
      has_valid_consent = true,
      has_opt_out = false,
      involves_public_publishing = false,
      reputational_risk_level = 'low', // low, medium, high
      primary_objective = 'maximize_commission', // maximize_commission, maximize_net_profit, increase_conversion, find_winner_products, increase_repurchase, build_audience
      potential_financial_impact = 0, // estimated profit / revenue
      urgency_level = 'normal', // normal, high, critical
      effort_level = 'low', // low, medium, high
    } = body

    // 1. DETERMINISTIC CALCULATION OF DECISION CONFIDENCE (0-100)
    // Formula components:
    // C1: Sample Size Weight (max 30 pts) -> min 20 samples for max
    // C2: Historical Consistency & Conversions (max 25 pts)
    // C3: Similarity match in past campaigns/decisions (max 20 pts)
    // C4: Recency (max 15 pts) -> decays if data is older than 30 days
    // C5: Data Quality / Completeness (max 10 pts)

    let confSample = Math.min(30, Math.floor((sample_size / 20) * 30))
    if (sample_size === 0) confSample = 5 // Base minimal

    let confHistory = Math.min(25, Math.floor((historical_conversions / 10) * 25))
    if (historical_conversions === 0) confHistory = 4

    let confSimilarity = Math.min(20, Math.floor((historical_similarity_matches / 5) * 20))
    if (historical_similarity_matches === 0) confSimilarity = 3

    let confRecency = 15
    if (data_recency_days > 30) confRecency = 4
    else if (data_recency_days > 14) confRecency = 8
    else if (data_recency_days > 7) confRecency = 12

    let confQuality = 10
    if (sample_size < 3) confQuality = 3

    let totalConfidence = confSample + confHistory + confSimilarity + confRecency + confQuality
    if (totalConfidence > 100) totalConfidence = 100
    if (totalConfidence < 0) totalConfidence = 0

    // Force 0 if critical blocks
    if (has_opt_out) totalConfidence = 0

    let confidenceTier = 'insufficient'
    if (totalConfidence >= 80) confidenceTier = 'high'
    else if (totalConfidence >= 60) confidenceTier = 'moderate'
    else if (totalConfidence >= 35) confidenceTier = 'low'

    // 2. DETERMINISTIC CALCULATION OF ACTION RISK (0-100)
    // Formula components:
    // R1: External vs Internal (max 30 pts) -> Internal is 0-5 pts, External is 25-30 pts
    // R2: Financial Cost & Autonomous Spend (max 25 pts)
    // R3: Reversibility (max 20 pts) -> Irreversible adds 20 pts
    // R4: Direct Person Contact & Consent Safety (max 15 pts)
    // R5: Public Publishing & Reputational Impact (max 10 pts)

    let riskExternal = is_external_action ? 28 : 5
    let riskFinancial = 0
    if (is_financial_action || estimated_cost > 0) {
      riskFinancial = Math.min(25, Math.floor(10 + estimated_cost / 10))
    }
    let riskReversible = is_reversible ? 2 : 20
    let riskContact = 0
    if (involves_direct_contact) {
      riskContact = 10
      if (!has_valid_consent) riskContact = 15
    }
    let riskPublishing = involves_public_publishing ? 10 : 2
    if (reputational_risk_level === 'high') riskPublishing += 5

    let totalRisk = riskExternal + riskFinancial + riskReversible + riskContact + riskPublishing
    if (has_opt_out || !has_valid_consent) totalRisk = 100
    if (totalRisk > 100) totalRisk = 100
    if (totalRisk < 0) totalRisk = 0

    let riskTier = 'low'
    if (totalRisk >= 70) riskTier = 'high'
    else if (totalRisk >= 35) riskTier = 'medium'

    // 3. DETERMINISTIC CALCULATION OF PRIORITY SCORE (0-100)
    // Formula: (Confidence * 0.35) + (ImpactWeight * 0.35) + (Urgency * 0.15) - (Risk * 0.15)
    // Weighted by primary objective:
    let objectiveMultiplier = 1.0
    if (
      (primary_objective === 'find_winner_products' && target_module === 'hunter') ||
      (primary_objective === 'increase_repurchase' && target_module === 'repurchase') ||
      (primary_objective === 'increase_conversion' && target_module === 'lab') ||
      (primary_objective === 'build_audience' && target_module === 'audience')
    ) {
      objectiveMultiplier = 1.15
    }

    let impactComponent = Math.min(35, Math.floor(15 + potential_financial_impact / 10))
    let urgencyComponent = urgency_level === 'critical' ? 15 : urgency_level === 'high' ? 10 : 5
    let effortPenalty = effort_level === 'high' ? 8 : effort_level === 'medium' ? 4 : 0

    let rawPriority =
      totalConfidence * 0.35 +
      impactComponent * 0.35 +
      urgencyComponent -
      totalRisk * 0.15 -
      effortPenalty

    rawPriority = rawPriority * objectiveMultiplier

    let totalPriority = Math.round(Math.max(5, Math.min(100, rawPriority)))
    if (has_opt_out) totalPriority = 0

    return e.json(200, {
      confidence_score: totalConfidence,
      confidence_tier: confidenceTier,
      confidence_breakdown: {
        sample_size_pts: confSample,
        historical_conversions_pts: confHistory,
        similarity_pts: confSimilarity,
        recency_pts: confRecency,
        data_quality_pts: confQuality,
      },
      risk_score: totalRisk,
      risk_tier: riskTier,
      risk_breakdown: {
        external_action_pts: riskExternal,
        financial_risk_pts: riskFinancial,
        irreversibility_pts: riskReversible,
        contact_consent_pts: riskContact,
        public_publishing_pts: riskPublishing,
      },
      priority_score: totalPriority,
      objective_alignment_applied: objectiveMultiplier,
    })
  },
  $apis.requireAuth(),
)
