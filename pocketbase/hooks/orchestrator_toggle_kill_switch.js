// Route: POST /backend/v1/orchestrator/toggle-kill-switch
// Global safety freeze or unfreeze.

routerAdd(
  'POST',
  '/backend/v1/orchestrator/toggle-kill-switch',
  (e) => {
    let body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (_) {
      body = {}
    }

    const active = !!body.active
    const reason =
      body.reason ||
      (active ? 'Pausa total acionada manualmente pelo usuário' : 'Operação retomada')

    let configRecord
    try {
      configRecord = $app.findFirstRecordByData(
        'orchestrator_config',
        'config_key',
        'global_orchestrator',
      )
    } catch (_) {
      const configCol = $app.findCollectionByNameOrId('orchestrator_config')
      configRecord = new Record(configCol)
      configRecord.set('config_key', 'global_orchestrator')
      configRecord.set('autonomy_level', 1)
    }

    configRecord.set('kill_switch_active', active)
    configRecord.set('kill_switch_reason', reason)
    configRecord.set('kill_switch_activated_at', active ? new Date().toISOString() : null)
    $app.save(configRecord)

    // Log this critical event in Decision Log
    try {
      const logCol = $app.findCollectionByNameOrId('orchestrator_decision_log')
      const log = new Record(logCol)
      log.set('action_id', 'KILL_SWITCH_' + Date.now())
      log.set('action_type', 'REQUEST_REVIEW')
      log.set('target_module', 'radar')
      log.set(
        'situation_observed',
        active
          ? 'KILL SWITCH ACIONADO: Todas as automações suspensas.'
          : 'KILL SWITCH DESATIVADO: Operação normal restabelecida.',
      )
      log.set('proposed_decision', reason)
      log.set('autonomy_level_at_time', configRecord.getInt('autonomy_level'))
      log.set('decision_outcome', active ? 'blocked_guardrail' : 'approved_by_user')
      log.set('executed_by', 'user_manual')
      log.set('execution_status', 'success')
      log.set('feedback_notes', 'Segurança operacional mantida.')
      log.set('is_test_data', false)
      $app.save(log)
    } catch (_) {}

    return e.json(200, {
      success: true,
      kill_switch_active: active,
      kill_switch_reason: reason,
      updated_at: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)
