// Route: POST /backend/v1/orchestrator/toggle-module-pause
// Pauses or resumes an individual module (hunter, products, lab, studio, publishing, performance, audience, crm, repurchase)

routerAdd(
  'POST',
  '/backend/v1/orchestrator/toggle-module-pause',
  (e) => {
    let body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (_) {
      body = {}
    }

    const targetModule = body.module || ''
    const pause = body.pause === true

    if (!targetModule) {
      return e.json(400, { error: 'module é obrigatório.' })
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

    let pausedModules = configRecord.get('paused_modules') || []
    if (!Array.isArray(pausedModules)) pausedModules = []

    if (pause) {
      if (!pausedModules.includes(targetModule)) {
        pausedModules.push(targetModule)
      }
    } else {
      pausedModules = pausedModules.filter((m) => m !== targetModule)
    }

    configRecord.set('paused_modules', pausedModules)
    $app.save(configRecord)

    return e.json(200, {
      success: true,
      target_module: targetModule,
      is_paused: pause,
      all_paused_modules: pausedModules,
    })
  },
  $apis.requireAuth(),
)
