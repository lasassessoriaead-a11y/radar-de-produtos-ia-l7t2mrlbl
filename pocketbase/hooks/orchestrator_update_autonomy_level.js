// Route: POST /backend/v1/orchestrator/update-autonomy-level
// Rule: The orchestrator CAN NEVER raise its own autonomy level. Only explicit user action can change it.
// Level 5 is protected and cannot be activated without explicit confirmation.

routerAdd(
  'POST',
  '/backend/v1/orchestrator/update-autonomy-level',
  (e) => {
    let body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (_) {
      body = {}
    }

    const newLevel = typeof body.level === 'number' ? body.level : -1
    const userConfirmedLevel5 = !!body.confirm_advanced_level_5

    if (newLevel < 0 || newLevel > 5) {
      return e.json(400, { error: 'Nível de autonomia inválido (deve ser entre 0 e 5).' })
    }

    if (newLevel === 5 && !userConfirmedLevel5) {
      return e.json(403, {
        error: 'Nível 5 (Autonomia Avançada) é experimental e exige confirmação explícita.',
        requires_explicit_confirmation: true,
      })
    }

    let configRecord
    try {
      configRecord = $app.findFirstRecordByData(
        'orchestrator_config',
        'config_key',
        'global_orchestrator',
      )
    } catch (_) {
      return e.json(404, { error: 'Configuração do Orquestrador não encontrada.' })
    }

    const previousLevel = configRecord.getInt('autonomy_level')
    configRecord.set('autonomy_level', newLevel)
    $app.save(configRecord)

    // Decision log
    try {
      const logCol = $app.findCollectionByNameOrId('orchestrator_decision_log')
      const log = new Record(logCol)
      log.set('action_id', 'AUTONOMY_CHANGE_' + Date.now())
      log.set('action_type', 'REQUEST_REVIEW')
      log.set('target_module', 'radar')
      log.set(
        'situation_observed',
        'Usuário alterou o nível de autonomia de ' + previousLevel + ' para ' + newLevel,
      )
      log.set('proposed_decision', 'Nível de autonomia atualizado por autorização humana.')
      log.set('autonomy_level_at_time', newLevel)
      log.set('decision_outcome', 'approved_by_user')
      log.set('executed_by', 'user_manual')
      log.set('execution_status', 'success')
      log.set('feedback_notes', 'Nível alterado manualmente.')
      log.set('is_test_data', false)
      $app.save(log)
    } catch (_) {}

    return e.json(200, {
      success: true,
      previous_level: previousLevel,
      current_level: newLevel,
      updated_at: new Date().toISOString(),
    })
  },
  $apis.requireAuth(),
)
