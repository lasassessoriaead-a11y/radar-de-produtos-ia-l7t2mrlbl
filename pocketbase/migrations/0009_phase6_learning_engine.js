migrate(
  (app) => {
    // 1. sales_insights (Registro estruturado de descobertas e insights da IA)
    const salesInsights = new Collection({
      name: 'sales_insights',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'insight_key', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        {
          name: 'category_type',
          type: 'select',
          required: true,
          values: [
            'what_works',
            'what_fails',
            'emerging_pattern',
            'pattern_shift',
            'recommended_test',
            'insufficient_data',
            'score_calibration',
          ],
          maxSelect: 1,
        },
        {
          name: 'confidence_level',
          type: 'select',
          required: true,
          values: ['insufficient', 'low', 'moderate', 'high'],
          maxSelect: 1,
        },
        { name: 'sample_summary', type: 'text' }, // e.g. "18 campanhas, 9.430 impressões, 627 cliques, 31 conversões"
        { name: 'sample_campaigns_count', type: 'number' },
        { name: 'sample_clicks_count', type: 'number' },
        { name: 'sample_conversions_count', type: 'number' },
        { name: 'sample_impressions_count', type: 'number' },
        { name: 'primary_metric_label', type: 'text' }, // e.g. "Taxa de Conversão"
        { name: 'primary_metric_value', type: 'number' },
        { name: 'benchmark_comparison', type: 'text' }, // e.g. "+68% acima da média interna"
        { name: 'conclusion_text', type: 'text', required: true },
        { name: 'recommendation_text', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['novo', 'revisado', 'aceito', 'descartado', 'em_teste', 'validado', 'refutado'],
          maxSelect: 1,
        },
        { name: 'evidence_data', type: 'json' },
        { name: 'target_module', type: 'text' }, // "hunter", "lab", "studio", "publishing", "global"
        { name: 'tested_hypothesis_id', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_sins_user ON sales_insights (user_id)',
        'CREATE INDEX idx_sins_type ON sales_insights (category_type)',
        'CREATE INDEX idx_sins_status ON sales_insights (status)',
        'CREATE INDEX idx_sins_conf ON sales_insights (confidence_level)',
      ],
    })
    app.save(salesInsights)

    // 2. learning_experiments (Testes recomendados e priorizados)
    const learningExperiments = new Collection({
      name: 'learning_experiments',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'hypothesis_title', type: 'text', required: true },
        { name: 'hypothesis_detail', type: 'text', required: true },
        { name: 'version_a_baseline', type: 'text', required: true },
        { name: 'version_b_challenger', type: 'text', required: true },
        { name: 'primary_metric', type: 'text', required: true }, // "Taxa de Conversão"
        { name: 'secondary_metric', type: 'text' }, // "CTR"
        { name: 'rationale', type: 'text', required: true },
        {
          name: 'potential_impact',
          type: 'select',
          required: true,
          values: ['baixo', 'medio', 'alto'],
          maxSelect: 1,
        },
        {
          name: 'confidence',
          type: 'select',
          required: true,
          values: ['baixa', 'moderada', 'alta'],
          maxSelect: 1,
        },
        {
          name: 'effort',
          type: 'select',
          required: true,
          values: ['baixo', 'medio', 'alto'],
          maxSelect: 1,
        },
        {
          name: 'priority_level',
          type: 'select',
          required: true,
          values: ['p1_urgente', 'p2_alta', 'p3_media', 'p4_exploratoria'],
          maxSelect: 1,
        },
        {
          name: 'experiment_type',
          type: 'select',
          required: true,
          values: ['exploit', 'explore'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['recomendado', 'em_execucao', 'concluido', 'descartado'],
          maxSelect: 1,
        },
        { name: 'sample_current', type: 'number' },
        { name: 'sample_needed', type: 'number' },
        { name: 'p_value_observed', type: 'number' },
        { name: 'stat_significance_reached', type: 'bool' },
        { name: 'winner_version', type: 'text' },
        { name: 'outcome_notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_lexp_user ON learning_experiments (user_id)',
        'CREATE INDEX idx_lexp_priority ON learning_experiments (priority_level)',
        'CREATE INDEX idx_lexp_status ON learning_experiments (status)',
      ],
    })
    app.save(learningExperiments)

    // 3. score_calibration_proposals (Propostas de calibração que exigem aprovação humana)
    const scoreCalibrations = new Collection({
      name: 'score_calibrations',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        {
          name: 'user_id',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'title', type: 'text', required: true },
        { name: 'score_type', type: 'text', required: true }, // "opportunity_score", "campaign_score", "creative_score"
        { name: 'diagnosis', type: 'text', required: true },
        { name: 'evidence_summary', type: 'text', required: true },
        { name: 'proposed_weights', type: 'json', required: true },
        { name: 'current_weights', type: 'json' },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending_review', 'approved_by_user', 'rejected_by_user'],
          maxSelect: 1,
        },
        { name: 'user_decision_note', type: 'text' },
        { name: 'decided_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_scal_user ON score_calibrations (user_id)',
        'CREATE INDEX idx_scal_status ON score_calibrations (status)',
      ],
    })
    app.save(scoreCalibrations)
  },
  (app) => {
    const tables = ['score_calibrations', 'learning_experiments', 'sales_insights']
    for (const name of tables) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
