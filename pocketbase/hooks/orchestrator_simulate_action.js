// Route: POST /backend/v1/orchestrator/simulate-action
// Returns simulated projection of what the action would do without modifying live data.

routerAdd(
  'POST',
  '/backend/v1/orchestrator/simulate-action',
  (e) => {
    let body = {}
    try {
      body = e.requestInfo().body || {}
    } catch (_) {
      body = {}
    }

    const actionId = body.action_id || ''
    if (!actionId) {
      return e.json(400, { error: 'action_id é obrigatório.' })
    }

    let actionRecord
    try {
      actionRecord = $app.findFirstRecordByData('orchestrator_actions', 'id', actionId)
    } catch (_) {
      return e.json(404, { error: 'Ação não encontrada.' })
    }

    const actionType = actionRecord.getString('action_type')
    const targetModule = actionRecord.getString('target_module')
    const entityTitle = actionRecord.getString('entity_title')
    const isExternal = actionRecord.getBool('is_external_action')
    const isFinancial = actionRecord.getBool('is_financial_action')
    const estimatedCost = actionRecord.getInt('estimated_cost')
    const isReversible = actionRecord.getBool('is_reversible')
    const reversInstructions = actionRecord.getString('reversal_instructions')
    const blockReason = actionRecord.getString('block_reason_type')
    const blockMessage = actionRecord.getString('block_message')
    const integrationStatus = actionRecord.getString('integration_status')

    // Prepare thorough simulation snapshot
    const simulation = {
      action_id: actionId,
      action_type: actionType,
      target_module: targetModule,
      target_entity: entityTitle,
      affected_tables: [],
      external_api_calls: [],
      estimated_financial_cost_brl: estimatedCost,
      is_reversible: isReversible,
      how_to_undo:
        reversInstructions || 'Ação de criação interna pode ser removida no respectivo módulo.',
      blocked: blockReason !== 'none' && blockReason !== '',
      block_reason: blockReason,
      block_message: blockMessage,
      risk_factors: [],
      confidence_statement:
        'Previsão matemática baseada em parâmetros observados (sem garantia de resultado financeiro).',
      expected_effects: [],
    }

    if (actionType === 'ADD_TO_WATCHLIST') {
      simulation.affected_tables = ['watchlist']
      simulation.expected_effects = [
        'Criação de registro de monitoramento contínuo em watchlist.',
        'Ativação de checagem diária de flutuação de preço e estoque.',
      ]
    } else if (actionType === 'CREATE_CAMPAIGN_DRAFT') {
      simulation.affected_tables = ['campaigns']
      simulation.expected_effects = [
        'Criação de campanha com status "draft" no Laboratório de Campanhas.',
        'Geração de 3 variações de hooks e copies recomendados.',
      ]
    } else if (actionType === 'CREATE_CREATIVE_DRAFT') {
      simulation.affected_tables = ['creatives', 'creative_versions']
      simulation.expected_effects = [
        'Criação de storyboard visual e conceitos no Estúdio Criativo.',
        'Nenhum consumo de créditos de geração externa sem consentimento do usuário.',
      ]
    } else if (actionType === 'CREATE_REPURCHASE_RECOMMENDATION') {
      simulation.affected_tables = ['crm_recommendations']
      simulation.expected_effects = [
        'Inserção da oportunidade de recomendação na fila de Recompra.',
        'Verificação estrita de cadência (máx 2 mensagens por semana).',
      ]
    } else if (actionType === 'PREPARE_PUBLICATION') {
      simulation.affected_tables = ['publications', 'tracking_links']
      if (integrationStatus === 'connected') {
        simulation.external_api_calls = ['Telegram Bot API (/sendMessage)']
        simulation.expected_effects = [
          'Envio da mensagem com link rastreado para o canal Telegram conectado.',
        ]
      } else {
        simulation.external_api_calls = ['[PENDENTE] Nenhuma chamada efetuada']
      }
    }

    if (isExternal) {
      simulation.risk_factors.push(
        'Ação Externa: Efeito atinge usuários ou plataformas fora do app.',
      )
    }
    if (isFinancial) {
      simulation.risk_factors.push('Ação Financeira: Consome orçamento.')
    }
    if (!isReversible) {
      simulation.risk_factors.push(
        'Ação Irreversível: Uma vez executada, não há rollback automático.',
      )
    }

    return e.json(200, {
      success: true,
      simulation,
    })
  },
  $apis.requireAuth(),
)
