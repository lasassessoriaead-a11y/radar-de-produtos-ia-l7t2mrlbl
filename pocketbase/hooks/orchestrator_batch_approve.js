// Route: POST /backend/v1/orchestrator/batch-approve
// Allows approving in batch ONLY for actions classified as LOW RISK.
// High or Medium risk actions are strictly rejected from batch execution.

routerAdd(
  'POST',
  '/backend/v1/orchestrator/batch-approve',
  (e) => {
    let body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (_) {
      body = {}
    }

    const actionIds = Array.isArray(body.action_ids) ? body.action_ids : []
    if (actionIds.length === 0) {
      return e.json(400, { error: 'Nenhum action_id fornecido para aprovação em lote.' })
    }

    const results = []
    let approvedCount = 0
    let rejectedCount = 0

    for (let i = 0; i < actionIds.length; i++) {
      const actId = actionIds[i]
      try {
        const actionRecord = $app.findFirstRecordByData('orchestrator_actions', 'id', actId)
        const riskTier = actionRecord.getString('risk_tier')
        const riskScore = actionRecord.getInt('risk_score')
        const isExternal = actionRecord.getBool('is_external_action')
        const blockReason = actionRecord.getString('block_reason_type')

        // HARD RULE: Batch approval ONLY allowed for LOW RISK (risk_score < 35 && !isExternal)
        if (
          riskTier === 'high' ||
          riskScore >= 35 ||
          isExternal ||
          (blockReason && blockReason !== 'none')
        ) {
          results.push({
            action_id: actId,
            status: 'rejected_from_batch',
            reason:
              'Aprovação em lote é estritamente proibida para ações de médio/alto risco, externas ou bloqueadas.',
          })
          rejectedCount++
          continue
        }

        // Safe to execute internal low risk action
        actionRecord.set('status', 'completed')
        actionRecord.set('approved_by', 'batch_approval_user')
        actionRecord.set('approved_at', new Date().toISOString())
        actionRecord.set('execution_result', {
          batch_approved: true,
          executed_at: new Date().toISOString(),
          note: 'Aprovado em lote de baixo risco com sucesso.',
        })
        $app.save(actionRecord)

        approvedCount++
        results.push({
          action_id: actId,
          status: 'completed',
        })
      } catch (err) {
        results.push({
          action_id: actId,
          status: 'error',
          error: String(err),
        })
        rejectedCount++
      }
    }

    return e.json(200, {
      success: true,
      total_requested: actionIds.length,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
      results,
    })
  },
  $apis.requireAuth(),
)
