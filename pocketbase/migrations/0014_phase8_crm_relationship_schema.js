migrate(
  (app) => {
    // 1. crm_contacts: Perfil de Contato Legítimo & Consentido
    const crmContacts = new Collection({
      name: 'crm_contacts',
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
        { name: 'identifier', type: 'text', required: true }, // e-mail, id telegram voluntário, etc
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
            'whatsapp',
            'other',
          ],
          maxSelect: 1,
        },
        { name: 'origin_source', type: 'text' },
        { name: 'campaign_id', type: 'text' },
        { name: 'lead_id', type: 'text' }, // Vínculo com inbound_leads quando originado de lead
        { name: 'first_product_interest', type: 'text' },
        { name: 'categories_of_interest', type: 'json' }, // Array de strings, ex: ["Eletrônicos & Áudio", "Home Office"]
        { name: 'lead_score', type: 'number', min: 0, max: 100 },
        { name: 'relationship_score', type: 'number', min: 0, max: 100 }, // 0-100 nível de relacionamento e prioridade operacional
        {
          name: 'status',
          type: 'select',
          values: [
            'novo',
            'interessado',
            'engajado',
            'qualificado',
            'em_decisao',
            'cliente',
            'cliente_recorrente',
            'sem_interesse',
            'opt_out',
            'inativo',
          ],
          maxSelect: 1,
        },
        { name: 'is_customer', type: 'bool' },
        { name: 'is_recurring_customer', type: 'bool' },
        { name: 'purchases_count', type: 'number', min: 0 },
        { name: 'total_sales_value', type: 'number', min: 0 }, // Soma do valor bruto das vendas
        { name: 'total_commission_earned', type: 'number', min: 0 }, // LTV real de comissão
        { name: 'average_commission', type: 'number', min: 0 },
        { name: 'first_purchase_date', type: 'date' },
        { name: 'last_purchase_date', type: 'date' },
        { name: 'last_interaction_date', type: 'date' },
        { name: 'last_click_date', type: 'date' },
        { name: 'purchased_products', type: 'json' }, // Histórico legítimo de compras atribuídas
        { name: 'next_best_action', type: 'text' },
        { name: 'next_best_action_reason', type: 'text' },
        { name: 'preferences', type: 'json' }, // { preferred_categories: [], desired_frequency: "weekly", preferred_channels: [], content_types: [] }
        { name: 'feedback_history', type: 'json' }, // Array com feedbacks legítimos informados
        { name: 'timeline', type: 'json' }, // Timeline unificada de eventos com timestamp
        { name: 'internal_notes', type: 'text' },
        { name: 'is_test_data', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_crm_ident ON crm_contacts (identifier)',
        'CREATE INDEX idx_crm_status ON crm_contacts (status)',
        'CREATE INDEX idx_crm_rel_score ON crm_contacts (relationship_score DESC)',
        'CREATE INDEX idx_crm_cust ON crm_contacts (is_customer)',
        'CREATE INDEX idx_crm_rec_cust ON crm_contacts (is_recurring_customer)',
      ],
    })
    app.save(crmContacts)

    // 2. crm_recommendations: Sugestões geradas pelo Motor de Recomendação e Recompra
    const crmRecs = new Collection({
      name: 'crm_recommendations',
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
        { name: 'contact_id', type: 'text', required: true },
        { name: 'contact_identifier', type: 'text' },
        { name: 'product_id', type: 'text', required: true },
        { name: 'product_title', type: 'text', required: true },
        { name: 'product_image_url', type: 'text' },
        { name: 'product_category', type: 'text' },
        { name: 'product_price', type: 'number' },
        { name: 'product_commission', type: 'number' },
        {
          name: 'recommendation_type',
          type: 'select',
          values: ['complementar', 'reposicao', 'upsell', 'cross_sell', 'novo_interesse'],
          maxSelect: 1,
        },
        { name: 'recommendation_score', type: 'number', min: 0, max: 100 },
        { name: 'reason', type: 'text' },
        { name: 'previous_product_title', type: 'text' },
        { name: 'suggested_content_angle', type: 'text' },
        { name: 'suggested_message', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: [
            'sugerida',
            'aprovada',
            'utilizada_em_campanha',
            'enviada_manualmente',
            'descartada',
            'convertida',
          ],
          maxSelect: 1,
        },
        { name: 'cadence_check_passed', type: 'bool' },
        { name: 'cadence_block_reason', type: 'text' },
        { name: 'is_test_data', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_recs_contact ON crm_recommendations (contact_id)',
        'CREATE INDEX idx_recs_prod ON crm_recommendations (product_id)',
        'CREATE INDEX idx_recs_score ON crm_recommendations (recommendation_score DESC)',
        'CREATE INDEX idx_recs_status ON crm_recommendations (status)',
      ],
    })
    app.save(crmRecs)

    // 3. crm_consent_logs: Centro de Consentimentos e Auditoria LGPD
    const crmConsents = new Collection({
      name: 'crm_consent_logs',
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
        { name: 'contact_id', type: 'text' },
        { name: 'identifier', type: 'text', required: true },
        { name: 'channel', type: 'text', required: true },
        { name: 'authorized_purpose', type: 'text', required: true },
        { name: 'consent_text_version', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['active', 'revoked', 'updated', 'expired'],
          maxSelect: 1,
        },
        { name: 'granted_at', type: 'date' },
        { name: 'revoked_at', type: 'date' },
        { name: 'origin_source', type: 'text' },
        { name: 'ip_masked', type: 'text' },
        { name: 'user_agent_short', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'is_test_data', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_cons_ident ON crm_consent_logs (identifier)',
        'CREATE INDEX idx_cons_status ON crm_consent_logs (status)',
        'CREATE INDEX idx_cons_contact ON crm_consent_logs (contact_id)',
      ],
    })
    app.save(crmConsents)

    // 4. crm_cadence_settings: Regras de Frequência e Saturação por Canal
    const crmCadence = new Collection({
      name: 'crm_cadence_settings',
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
        { name: 'channel', type: 'text', required: true },
        { name: 'min_days_between_messages', type: 'number', min: 1 },
        { name: 'max_messages_per_week', type: 'number', min: 1 },
        { name: 'allow_educational_content', type: 'bool' },
        { name: 'allow_product_recommendations', type: 'bool' },
        { name: 'allow_post_purchase_followup', type: 'bool' },
        { name: 'quiet_hours_start', type: 'text' }, // ex: "21:00"
        { name: 'quiet_hours_end', type: 'text' }, // ex: "09:00"
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_cad_user_channel ON crm_cadence_settings (channel)'],
    })
    app.save(crmCadence)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('crm_cadence_settings'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('crm_consent_logs'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('crm_recommendations'))
    } catch (_) {}
    try {
      app.delete(app.findCollectionByNameOrId('crm_contacts'))
    } catch (_) {}
  },
)
