migrate(
  (app) => {
    // 1. audience_signals: Armazenamento deduplicado de sinais públicos reais (Reddit) e futuros providers
    const audienceSignals = new Collection({
      name: 'audience_signals',
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
        { name: 'external_id', type: 'text', required: true }, // id no reddit/fonte
        { name: 'source', type: 'text', required: true }, // 'reddit', 'youtube', 'forums', etc.
        { name: 'source_url', type: 'text' },
        { name: 'title', type: 'text', required: true },
        { name: 'snippet', type: 'text' },
        { name: 'author_display', type: 'text' }, // Apenas nome público/handle, nada privado
        { name: 'community', type: 'text' }, // Ex: r/carros, r/brasil, r/shopee
        { name: 'published_at', type: 'date' },
        { name: 'matched_keyword', type: 'text' },
        { name: 'category', type: 'text' },
        { name: 'product_id', type: 'text' },
        { name: 'campaign_id', type: 'text' },
        {
          name: 'intent_level',
          type: 'select',
          values: ['high', 'medium', 'low', 'none'],
          maxSelect: 1,
        },
        { name: 'intent_score', type: 'number', min: 0, max: 100 },
        { name: 'intent_reason', type: 'text' },
        { name: 'relevance_score', type: 'number', min: 0, max: 100 },
        { name: 'relevance_reason', type: 'text' },
        {
          name: 'signal_classification',
          type: 'select',
          values: [
            'market_signal',
            'audience_context',
            'content_opportunity',
            'potential_interaction',
          ],
          maxSelect: 1,
        },
        { name: 'match_explanation', type: 'text' },
        { name: 'suggested_opportunity', type: 'text' },
        { name: 'suggested_reply', type: 'text' },
        { name: 'question_detected', type: 'text' },
        { name: 'objection_detected', type: 'text' },
        { name: 'desire_detected', type: 'text' },
        { name: 'raw_metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_signal_source_ext ON audience_signals (source, external_id)',
        'CREATE INDEX idx_signal_intent ON audience_signals (intent_score DESC)',
        'CREATE INDEX idx_signal_relevance ON audience_signals (relevance_score DESC)',
        'CREATE INDEX idx_signal_product ON audience_signals (product_id)',
        'CREATE INDEX idx_signal_category ON audience_signals (category)',
      ],
    })
    app.save(audienceSignals)

    // 2. audience_terms_bank: Banco de termos de intenção gerados ou monitorados por produto/categoria
    const termsBank = new Collection({
      name: 'audience_terms_bank',
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
        { name: 'product_id', type: 'text' },
        { name: 'product_title', type: 'text' },
        { name: 'category', type: 'text' },
        { name: 'term', type: 'text', required: true },
        {
          name: 'term_type',
          type: 'select',
          values: [
            'problem',
            'desire',
            'solution',
            'comparison',
            'recommendation',
            'buying_intent',
            'doubt',
            'objection',
            'complaint',
            'alternative',
            'usage_context',
          ],
          maxSelect: 1,
        },
        { name: 'intent_stage', type: 'select', values: ['high', 'medium', 'low'], maxSelect: 1 },
        { name: 'stage_reason', type: 'text' },
        { name: 'signal_count', type: 'number' },
        {
          name: 'trend_status',
          type: 'select',
          values: ['growing', 'stable', 'falling', 'insufficient_data'],
          maxSelect: 1,
        },
        { name: 'last_queried_at', type: 'date' },
        { name: 'is_active', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_terms_prod ON audience_terms_bank (product_id)',
        'CREATE INDEX idx_terms_category ON audience_terms_bank (category)',
        'CREATE INDEX idx_terms_type ON audience_terms_bank (term_type)',
      ],
    })
    app.save(termsBank)

    // 3. audience_opportunities: Fila de oportunidades acionáveis de público e conteúdo
    const oppsCol = new Collection({
      name: 'audience_opportunities',
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
        { name: 'title', type: 'text', required: true },
        {
          name: 'opportunity_type',
          type: 'select',
          values: [
            'question',
            'discussion',
            'trend',
            'objection',
            'community',
            'theme',
            'inbound_lead',
          ],
          maxSelect: 1,
        },
        { name: 'description', type: 'text' },
        { name: 'action_suggested', type: 'text' }, // 'create_content', 'create_campaign', 'manual_reply', 'save_insight', 'ignore'
        { name: 'suggested_content_angle', type: 'text' },
        { name: 'suggested_copy_hook', type: 'text' },
        { name: 'suggested_reply_text', type: 'text' }, // Resposta útil (ajudar sem spam)
        { name: 'source', type: 'text' },
        { name: 'source_url', type: 'text' },
        { name: 'community', type: 'text' },
        { name: 'product_id', type: 'text' },
        { name: 'product_title', type: 'text' },
        { name: 'campaign_id', type: 'text' },
        { name: 'intent_score', type: 'number', min: 0, max: 100 },
        { name: 'relevance_score', type: 'number', min: 0, max: 100 },
        {
          name: 'priority_level',
          type: 'select',
          values: ['hot', 'high', 'medium', 'low'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: [
            'new',
            'in_progress',
            'used_in_lab',
            'used_in_studio',
            'replied_manually',
            'ignored',
            'archived',
          ],
          maxSelect: 1,
        },
        { name: 'signal_id', type: 'text' },
        { name: 'lead_id', type: 'text' },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_opps_type ON audience_opportunities (opportunity_type)',
        'CREATE INDEX idx_opps_status ON audience_opportunities (status)',
        'CREATE INDEX idx_opps_priority ON audience_opportunities (priority_level)',
        'CREATE INDEX idx_opps_prod ON audience_opportunities (product_id)',
      ],
    })
    app.save(oppsCol)

    // 4. inbound_leads: Mini CRM de leads voluntários/consentidos em canais próprios
    const leadsCol = new Collection({
      name: 'inbound_leads',
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
        { name: 'identifier', type: 'text', required: true }, // e-mail, telegram username ou ref do canal próprio
        { name: 'name', type: 'text' },
        {
          name: 'channel',
          type: 'select',
          values: [
            'landing_page',
            'form',
            'telegram',
            'newsletter',
            'campaign_page',
            'own_channel',
            'other',
          ],
          maxSelect: 1,
        },
        { name: 'origin_source', type: 'text' }, // URL da página própria, formulário X
        { name: 'campaign_id', type: 'text' },
        { name: 'product_id', type: 'text' },
        { name: 'product_interest', type: 'text' },
        { name: 'declared_intent', type: 'text' },
        { name: 'lead_score', type: 'number', min: 0, max: 100 },
        {
          name: 'score_tier',
          type: 'select',
          values: ['hot', 'interested', 'potential', 'cold'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: [
            'new',
            'interested',
            'engaged',
            'qualified',
            'customer',
            'uninterested',
            'opt_out',
          ],
          maxSelect: 1,
        },
        {
          name: 'consent_status',
          type: 'select',
          values: ['active', 'revoked', 'expired'],
          maxSelect: 1,
        },
        { name: 'consent_date', type: 'date' },
        { name: 'consent_revoked_at', type: 'date' },
        { name: 'authorized_purpose', type: 'text' },
        { name: 'consent_text_version', type: 'text' },
        { name: 'clicks_count', type: 'number' },
        { name: 'interactions_count', type: 'number' },
        { name: 'has_converted', type: 'bool' },
        { name: 'conversion_amount', type: 'number' },
        { name: 'notes', type: 'text' },
        { name: 'timeline', type: 'json' }, // Array de eventos do lead
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_leads_channel ON inbound_leads (channel)',
        'CREATE INDEX idx_leads_status ON inbound_leads (status)',
        'CREATE INDEX idx_leads_score ON inbound_leads (lead_score DESC)',
        'CREATE INDEX idx_leads_consent ON inbound_leads (consent_status)',
      ],
    })
    app.save(leadsCol)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('inbound_leads'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('audience_opportunities'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('audience_terms_bank'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('audience_signals'))
    } catch (_) {}
  },
)
