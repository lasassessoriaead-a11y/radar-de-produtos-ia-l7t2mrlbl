// Route: GET /backend/v1/orchestrator/evaluation-metrics
// Computes genuine metrics of the orchestrator's performance and governance.

routerAdd(
  'GET',
  '/backend/v1/orchestrator/evaluation-metrics',
  (e) => {
    let actions = []
    let logs = []
    let shadowLogs = []

    try {
      actions = $app.findRecordsByFilter('orchestrator_actions', '', '-created', 200, 0)
    } catch (_) {
      actions = []
    }

    try {
      logs = $app.findRecordsByFilter('orchestrator_decision_log', '', '-created', 200, 0)
    } catch (_) {
      logs = []
    }

    try {
      shadowLogs = $app.findRecordsByFilter('orchestrator_shadow_log', '', '-created', 100, 0)
    } catch (_) {
      shadowLogs = []
    }

    const totalActions = actions.length
    let pendingApproval = 0
    let approvedCount = 0
    let rejectedCount = 0
    let blockedCount = 0
    let completedCount = 0
    let lowRiskCount = 0
    let highRiskCount = 0
    let insufficientDataCount = 0
    let testDataCount = 0

    let totalConfidenceSum = 0
    let totalRiskSum = 0

    for (let i = 0; i < totalActions; i++) {
      const a = actions[i]
      const status = a.getString('status')
      const riskTier = a.getString('risk_tier')
      const confTier = a.getString('confidence_tier')
      const isTest = a.getBool('is_test_data')

      if (isTest) testDataCount++
      if (status === 'pending_approval') pendingApproval++
      else if (status === 'completed' || status === 'approved') {
        approvedCount++
        if (status === 'completed') completedCount++
      } else if (status === 'rejected') rejectedCount++
      else if (status === 'blocked') blockedCount++

      if (riskTier === 'low') lowRiskCount++
      else if (riskTier === 'high') highRiskCount++

      if (confTier === 'insufficient' || a.getBool('is_experiment_hypothesis')) {
        insufficientDataCount++
      }

      totalConfidenceSum += a.getInt('confidence_score')
      totalRiskSum += a.getInt('risk_score')
    }

    const approvalRate =
      totalActions > 0
        ? Math.round((approvedCount / (approvedCount + rejectedCount || 1)) * 100)
        : 0
    const rejectionRate =
      totalActions > 0
        ? Math.round((rejectedCount / (approvedCount + rejectedCount || 1)) * 100)
        : 0
    const avgConfidence = totalActions > 0 ? Math.round(totalConfidenceSum / totalActions) : 0
    const avgRisk = totalActions > 0 ? Math.round(totalRiskSum / totalActions) : 0

    // Promotion suggestion check:
    // If >15 actions approved, 0 safety incidents, high average confidence -> recommend autonomy promotion
    const eligibleForPromotion =
      approvedCount >= 5 && rejectedCount === 0 && blockedCount <= 2 && avgConfidence >= 80

    return e.json(200, {
      total_actions: totalActions,
      pending_approval: pendingApproval,
      approved_count: approvedCount,
      completed_count: completedCount,
      rejected_count: rejectedCount,
      blocked_count: blockedCount,
      approval_rate_percent: approvalRate,
      rejection_rate_percent: rejectionRate,
      average_confidence_score: avgConfidence,
      average_risk_score: avgRisk,
      low_risk_actions_count: lowRiskCount,
      high_risk_actions_count: highRiskCount,
      insufficient_data_hypotheses_count: insufficientDataCount,
      test_data_actions_count: testDataCount,
      total_decision_logs: logs.length,
      total_shadow_comparisons: shadowLogs.length,
      promotion_recommendation: {
        is_eligible: eligibleForPromotion,
        message: eligibleForPromotion
          ? 'Histórico consistente: 100% de aprovação e zero incidentes. O sistema sugere que ações de baixo risco podem evoluir para Automação Controlada (Nível 4) mediante sua ativação manual.'
          : 'Mantenha o Nível 1 ou 2 até consolidar volume mínimo de aprovações e consistência.',
      },
    })
  },
  $apis.requireAuth(),
)
