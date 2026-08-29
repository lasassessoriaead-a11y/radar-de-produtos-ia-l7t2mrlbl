migrate(
  (app) => {
    // 1. orchestrator_config: Configurações Globais de Governança, Autonomia, Kill Switch e Objetivos
    const orchestratorConfig = new Collection({
      name: 'orchestrator_config',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: false,
          maxSelect: 1,
        },
        { name: 'config_key', type: 'text', required: true },
        { name: 'autonomy_level', type: 'number', min: 0, max: 5 }, // 0=Observe, 1=Recommend (default), 2=Draft, 3=Approval, 4=Controlled, 5=Advanced (locked)
        { name: 'shadow_mode_active', type: 'bool' }, // Default true or configurable
        { name: 'kill_switch_active', type: 'bool' }, // Global freeze if true
        { name: 'kill_switch_reason', type: 'text' },
        { name: 'kill_switch_activated_at', type: 'date' },
        {
          name: 'primary_objective',
          type: 'select',
          values: [
            'maximize_commission',
            'maximize_net_profit',
            'increase_conversion',
            'find_winner_products',
            'increase_repurchase',
            'build_audience',
          ],
          maxSelect: 1,
        },
        { name: 'paused_modules', type: 'json' }, // ["hunter", "products", "lab", "studio", "publishing", "performance", "audience", "crm", "repurchase"]
        { name: 'guardrails', type: 'json' }, // { max_campaigns_per_day: 10, max_creatives_per_day: 20, max_publications_per_day: 5, max_repurchase_recs_per_day: 15, max_actions_per_module: 25, max_daily_generation_cost: 50.0, max_actions_per_contact_week: 2, min_score_threshold: 75, max_acceptable_risk: 70 }
        { name: 'financial_limits', type: 'json' }, // { limit_per_action: 0, daily_limit: 0, weekly_limit: 0, monthly_limit: 0, paid_traffic_autonomous_enabled: false }
        { name: 'allowed_channels', type: 'json' }, // ["telegram", "instagram", "tiktok", "whatsapp"]
        { name: 'blocked_categories', type: 'json' },
        { name: 'allowed_categories', type: 'json' },
        { name: 'operating_hours', type: 'json' }, // { start: "08:00", end: "22:00", enforce: false }
        { name: 'consecutive_failures_count', type: 'number', min: 0 },
        { name: 'auto_demoted_at', type: 'date' },
        { name: 'auto_demote_reason', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_orch_config_key ON orchestrator_config (config_key)'],
    })
    app.save(orchestratorConfig)

    // 2. orchestrator_policies: Políticas do Usuário com Prioridade Absoluta sobre a IA
    const orchestratorPolicies = new Collection({
      name: 'orchestrator_policies',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: false,
          maxSelect: 1,
        },
        { name: 'policy_code', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'description', type: 'text' },
        {
          name: 'category',
          type: 'select',
          values: [
            'safety',
            'budget',
            'publishing',
            'crm_contact',
            'content_quality',
            'compliance',
            'channel',
          ],
          maxSelect: 1,
        },
        {
          name: 'rule_type',
          type: 'select',
          values: [
            'hard_block',
            'require_approval',
            'threshold_check',
            'channel_block',
            'cadence_cap',
          ],
          maxSelect: 1,
        },
        { name: 'condition_json', type: 'json' }, // Parâmetros da regra
        { name: 'is_active', type: 'bool' },
        { name: 'priority_order', type: 'number' },
        { name: 'is_system_immutable', type: 'bool' }, // Regras de consentimento/LGPD são imutáveis
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_orch_policy_code ON orchestrator_policies (policy_code)',
        'CREATE INDEX idx_orch_policy_cat ON orchestrator_policies (category)',
        'CREATE INDEX idx_orch_policy_active ON orchestrator_policies (is_active)',
      ],
    })
    app.save(orchestratorPolicies)

    // 3. orchestrator_actions: Caixa de Ações / Fila Operacional com Rastreabilidade e Idempotência
    const orchestratorActions = new Collection({
      name: 'orchestrator_actions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: false,
          maxSelect: 1,
        },
        { name: 'idempotency_key', type: 'text', required: true }, // Hash único para evitar duplicações
        {
          name: 'action_type',
          type: 'select',
          values: [
            'ANALYZE_PRODUCT',
            'ADD_TO_WATCHLIST',
            'CREATE_CAMPAIGN_DRAFT',
            'CREATE_CREATIVE_DRAFT',
            'CREATE_TEST_VARIATION',
            'PREPARE_PUBLICATION',
            'SUGGEST_PUBLICATION',
            'CREATE_CONTENT_OPPORTUNITY',
            'CREATE_CRM_RECOMMENDATION',
            'CREATE_REPURCHASE_RECOMMENDATION',
            'PREPARE_FOLLOWUP',
            'REQUEST_REVIEW',
            'GENERATE_REPORT',
            'RECALCULATE_SCORE',
          ],
          maxSelect: 1,
        },
        {
          name: 'target_module',
          type: 'select',
          values: [
            'radar',
            'hunter',
            'lab',
            'studio',
            'publishing',
            'performance',
            'sales_intelligence',
            'audience',
            'crm',
            'repurchase',
          ],
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'summary', type: 'text' },
        { name: 'reasoning', type: 'text', required: true }, // "POR QUE A IA QUER FAZER ISSO?"
        { name: 'evidence_summary', type: 'text' },
        { name: 'evidence_data', type: 'json' }, // Amostra, CTR histórico, métricas comparáveis
        {
          name: 'evidence_strength',
          type: 'select',
          values: ['insufficient', 'weak', 'moderate', 'strong'],
          maxSelect: 1,
        },
        { name: 'is_experiment_hypothesis', type: 'bool' }, // Priorizar experimento quando evidência for fraca
        { name: 'confidence_score', type: 'number', min: 0, max: 100 }, // 0-100 Decision Confidence
        {
          name: 'confidence_tier',
          type: 'select',
          values: ['insufficient', 'low', 'moderate', 'high'],
          maxSelect: 1,
        },
        { name: 'risk_score', type: 'number', min: 0, max: 100 }, // 0-100 Action Risk
        { name: 'risk_tier', type: 'select', values: ['low', 'medium', 'high'], maxSelect: 1 },
        { name: 'priority_score', type: 'number', min: 0, max: 100 }, // 0-100 Priority Score (Plano do Dia)
        { name: 'is_external_action', type: 'bool' },
        { name: 'is_financial_action', type: 'bool' },
        { name: 'estimated_cost', type: 'number', min: 0 },
        { name: 'expected_impact', type: 'text' },
        { name: 'is_reversible', type: 'bool' },
        { name: 'reversal_instructions', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: [
            'pending_approval',
            'approved',
            'rejected',
            'postponed',
            'in_progress',
            'completed',
            'blocked',
            'failed',
            'shadow_logged',
          ],
          maxSelect: 1,
        },
        {
          name: 'block_reason_type',
          type: 'select',
          values: [
            'consent_missing',
            'opt_out',
            'policy_violation',
            'guardrail_cap',
            'module_paused',
            'kill_switch',
            'integration_pending',
            'none',
          ],
          maxSelect: 1,
        },
        { name: 'block_message', type: 'text' },
        {
          name: 'integration_status',
          type: 'select',
          values: ['native_internal', 'pending_integration', 'connected'],
          maxSelect: 1,
        },
        { name: 'pending_integration_name', type: 'text' }, // Ex: "Meta Ads API", "TikTok Marketing API"
        { name: 'entity_id', type: 'text' }, // Id do produto, campanha, lead, contato, etc
        { name: 'entity_type', type: 'text' },
        { name: 'entity_title', type: 'text' },
        { name: 'payload_data', type: 'json' }, // Parâmetros exatos da ação
        { name: 'simulation_snapshot', type: 'json' }, // Resultado prévio da simulação
        { name: 'execution_result', type: 'json' }, // Resultado pós execução
        { name: 'post_execution_metrics', type: 'json' }, // Métricas observadas após execução
        { name: 'approved_by', type: 'text' },
        { name: 'approved_at', type: 'date' },
        { name: 'rejected_reason', type: 'text' },
        { name: 'postponed_until', type: 'date' },
        { name: 'execution_attempts', type: 'number', min: 0 },
        { name: 'max_retries', type: 'number', min: 0 },
        { name: 'last_retry_at', type: 'date' },
        { name: 'is_test_data', type: 'bool' },
        { name: 'test_data_note', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_orch_act_idemp ON orchestrator_actions (idempotency_key)',
        'CREATE INDEX idx_orch_act_status ON orchestrator_actions (status)',
        'CREATE INDEX idx_orch_act_prio ON orchestrator_actions (priority_score DESC)',
        'CREATE INDEX idx_orch_act_type ON orchestrator_actions (action_type)',
        'CREATE INDEX idx_orch_act_mod ON orchestrator_actions (target_module)',
      ],
    })
    app.save(orchestratorActions)

    // 4. orchestrator_decision_log: Log Permanente e Auditável de Decisões
    const orchestratorDecisionLog = new Collection({
      name: 'orchestrator_decision_log',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: false,
          maxSelect: 1,
        },
        { name: 'action_id', type: 'text', required: true },
        { name: 'action_type', type: 'text', required: true },
        { name: 'target_module', type: 'text', required: true },
        { name: 'situation_observed', type: 'text', required: true },
        { name: 'proposed_decision', type: 'text', required: true },
        { name: 'evidence_used', type: 'text' },
        { name: 'sample_size', type: 'number', min: 0 },
        { name: 'confidence_score', type: 'number', min: 0, max: 100 },
        { name: 'risk_score', type: 'number', min: 0, max: 100 },
        { name: 'priority_score', type: 'number', min: 0, max: 100 },
        { name: 'applied_policies', type: 'json' },
        { name: 'autonomy_level_at_time', type: 'number', min: 0, max: 5 },
        {
          name: 'decision_outcome',
          type: 'select',
          values: [
            'executed_auto',
            'approved_by_user',
            'rejected_by_user',
            'postponed',
            'blocked_consent',
            'blocked_optout',
            'blocked_policy',
            'blocked_guardrail',
            'shadow_logged',
            'failed',
          ],
          maxSelect: 1,
        },
        { name: 'executed_by', type: 'text' }, // "system_auto", "user_manual"
        {
          name: 'execution_status',
          type: 'select',
          values: ['success', 'failure', 'partial', 'cancelled', 'blocked', 'none'],
          maxSelect: 1,
        },
        { name: 'execution_details', type: 'json' },
        { name: 'feedback_notes', type: 'text' },
        { name: 'is_shadow_mode', type: 'bool' },
        { name: 'is_test_data', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_orch_log_act ON orchestrator_decision_log (action_id)',
        'CREATE INDEX idx_orch_log_out ON orchestrator_decision_log (decision_outcome)',
        'CREATE INDEX idx_orch_log_created ON orchestrator_decision_log (created DESC)',
        'CREATE INDEX idx_orch_log_mod ON orchestrator_decision_log (target_module)',
      ],
    })
    app.save(orchestratorDecisionLog)

    // 5. orchestrator_shadow_log: Modo Sombra - Registro de Ações Hipotéticas vs Reais
    const orchestratorShadowLog = new Collection({
      name: 'orchestrator_shadow_log',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          required: false,
          maxSelect: 1,
        },
        { name: 'hypothetical_action', type: 'text', required: true }, // "Eu teria criado uma nova variação..."
        { name: 'action_type', type: 'text', required: true },
        { name: 'target_module', type: 'text', required: true },
        { name: 'target_entity_id', type: 'text' },
        { name: 'target_entity_title', type: 'text' },
        { name: 'reasoning', type: 'text' },
        { name: 'evidence_data', type: 'json' },
        { name: 'confidence_score', type: 'number', min: 0, max: 100 },
        { name: 'risk_score', type: 'number', min: 0, max: 100 },
        { name: 'expected_outcome', type: 'text' },
        { name: 'user_actual_action', type: 'text' }, // O que o usuário realmente fez (se fez)
        { name: 'actual_outcome', type: 'text' }, // Resultado real observado
        {
          name: 'comparison_status',
          type: 'select',
          values: [
            'pending_outcome',
            'ai_matched_user',
            'ai_diverged_user',
            'user_inaction_positive',
            'user_inaction_negative',
          ],
          maxSelect: 1,
        },
        { name: 'comparison_analysis', type: 'text' },
        { name: 'is_test_data', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_orch_shad_mod ON orchestrator_shadow_log (target_module)',
        'CREATE INDEX idx_orch_shad_status ON orchestrator_shadow_log (comparison_status)',
        'CREATE INDEX idx_orch_shad_created ON orchestrator_shadow_log (created DESC)',
      ],
    })
    app.save(orchestratorShadowLog)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('orchestrator_shadow_log'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('orchestrator_decision_log'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('orchestrator_actions'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('orchestrator_policies'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('orchestrator_config'))
    } catch (_) {}
  },
)
