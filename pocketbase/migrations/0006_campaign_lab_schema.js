migrate(
  (app) => {
    // 1. Create campaigns collection
    const campaigns = new Collection({
      name: 'campaigns',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'user_id', type: 'relation', collectionId: '_pb_users_auth_', maxSelect: 1 },
        { name: 'product_id', type: 'text' }, // ID in products table (optional)
        { name: 'discovered_id', type: 'text' }, // ID in discovered_products (optional)
        { name: 'product_title', type: 'text', required: true },
        { name: 'product_image', type: 'text' },
        { name: 'product_category', type: 'text' },
        { name: 'platform', type: 'text' },
        { name: 'product_url', type: 'text' },
        { name: 'affiliate_url', type: 'text' }, // Manual or synced
        { name: 'affiliate_is_configured', type: 'bool' }, // true if validated affiliate link
        { name: 'price_at_creation', type: 'number' },
        { name: 'promo_price_at_creation', type: 'number' },
        { name: 'commission_rate_at_creation', type: 'number' },
        { name: 'commission_amount_at_creation', type: 'number' },
        { name: 'campaign_name', type: 'text', required: true },
        { name: 'selected_angle_id', type: 'text' },
        { name: 'selected_angle_title', type: 'text' },
        { name: 'target_audience', type: 'text' },
        { name: 'recommended_channels', type: 'json' }, // Array of strings e.g. ["TikTok", "Instagram"]
        { name: 'primary_channel', type: 'text' },
        { name: 'primary_format', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: [
            'draft',
            'in_review',
            'approved',
            'needs_revision',
            'archived',
            'published',
            'paused',
            'winner',
            'loser',
          ],
          maxSelect: 1,
        },
        // Pre-campaign intelligence & confidence level
        { name: 'product_intelligence', type: 'json' }, // { what_is, solves_problem, audiences, motivations, benefits, objections, differentials, use_situations, confidence_levels: { confirmed, inferred, unavailable } }
        { name: 'selling_angles', type: 'json' }, // Array of 5 angles { id, title, public, pain_desire, hook, argument, objection_to_beat, cta, recommended_channel, recommended_format }
        { name: 'hooks_bank', type: 'json' }, // Array of hooks { id, type, text, score, confidence }
        { name: 'generated_copies', type: 'json' }, // Map or array of copies by channel & format
        { name: 'video_scripts', type: 'json' }, // Scripts { 15s, 30s, 60s } with scenes
        { name: 'estimated_score', type: 'number' }, // 0 to 100
        { name: 'score_breakdown', type: 'json' }, // { hook_strength, clarity, audience_fit, benefit_strength, cta_quality, channel_fit, argument_depth, exaggerated_claim_risk, notes }
        {
          name: 'compliance_status',
          type: 'select',
          values: ['approved', 'needs_revision', 'blocked'],
          maxSelect: 1,
        },
        { name: 'compliance_report', type: 'json' }, // { status, flags: [], unverified_claims: [], false_urgency_found: bool, suggestions: [] }
        { name: 'conversation_id', type: 'text' }, // Associated agent conversation ID
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_camp_user ON campaigns (user_id)',
        'CREATE INDEX idx_camp_prod_id ON campaigns (product_id)',
        'CREATE INDEX idx_camp_status ON campaigns (status)',
        'CREATE INDEX idx_camp_score ON campaigns (estimated_score DESC)',
        'CREATE INDEX idx_camp_created ON campaigns (created DESC)',
      ],
    })
    app.save(campaigns)

    // 2. Create campaign_variations collection (A/B/C testing versions)
    const variations = new Collection({
      name: 'campaign_variations',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'campaign_id',
          type: 'relation',
          collectionId: campaigns.id,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        { name: 'version_letter', type: 'text', required: true }, // 'A' | 'B' | 'C' | 'D'
        { name: 'hypothesis_name', type: 'text', required: true }, // e.g. "Hipótese A: Dor/Problema cotidiano", "Hipótese B: Demonstração visual de impacto"
        { name: 'hypothesis_details', type: 'text' },
        { name: 'angle_title', type: 'text' },
        { name: 'hook_text', type: 'text', required: true },
        { name: 'hook_type', type: 'text' }, // 'problem', 'curiosity', 'demonstration', 'comparison', 'question', 'benefit', 'discovery', 'identification'
        { name: 'copy_text', type: 'text', required: true },
        { name: 'cta_text', type: 'text', required: true },
        { name: 'cta_objective', type: 'text' }, // 'conhecer', 'conferir', 'comparar', 'detalhes', 'oferta_real', 'comprar'
        { name: 'channel', type: 'text' }, // 'Instagram', 'TikTok', 'YouTube Shorts', 'Facebook', 'WhatsApp', 'Telegram', 'Pinterest', 'Landing Page'
        { name: 'format', type: 'text' }, // 'short_ad', 'caption', 'script_15s', 'script_30s', 'script_60s', 'story', 'carousel', 'product_description', 'promo_message', 'demo_script'
        { name: 'video_scenes', type: 'json' }, // Array of scenes [{ scene_number, time_range, visual_action, on_screen_text, narration, duration_sec }]
        { name: 'estimated_score', type: 'number' },
        { name: 'score_breakdown', type: 'json' },
        {
          name: 'compliance_status',
          type: 'select',
          values: ['approved', 'needs_revision', 'blocked'],
          maxSelect: 1,
        },
        { name: 'compliance_notes', type: 'text' },
        // Future metrics structure (prepared for Phase 4 & analytics)
        { name: 'impressions', type: 'number' },
        { name: 'views', type: 'number' },
        { name: 'retention_rate', type: 'number' }, // %
        { name: 'clicks', type: 'number' },
        { name: 'ctr', type: 'number' }, // %
        { name: 'conversions', type: 'number' },
        { name: 'sales_count', type: 'number' },
        { name: 'total_commission', type: 'number' }, // R$
        { name: 'ad_spend', type: 'number' }, // R$
        { name: 'roi', type: 'number' }, // %
        { name: 'is_winner', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_var_camp ON campaign_variations (campaign_id)',
        'CREATE INDEX idx_var_letter ON campaign_variations (campaign_id, version_letter)',
      ],
    })
    app.save(variations)

    // 3. Create campaign_hooks collection (Hooks bank and variations)
    const hooksCol = new Collection({
      name: 'campaign_hooks',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'campaign_id', type: 'text' },
        { name: 'product_id', type: 'text' },
        { name: 'hook_text', type: 'text', required: true },
        {
          name: 'hook_type',
          type: 'select',
          values: [
            'curiosity',
            'problem',
            'demonstration',
            'question',
            'discovery',
            'comparison',
            'benefit',
            'identification',
          ],
          maxSelect: 1,
        },
        { name: 'target_audience', type: 'text' },
        { name: 'strength_score', type: 'number' }, // 0 to 100
        { name: 'confidence_level', type: 'text' }, // 'confirmed' | 'inferred'
        { name: 'tags', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_hook_camp ON campaign_hooks (campaign_id)',
        'CREATE INDEX idx_hook_type ON campaign_hooks (hook_type)',
      ],
    })
    app.save(hooksCol)

    // 4. Update the analista-radar agent tools to include campaigns, campaign_variations, campaign_hooks
    try {
      $ai.agents.putTools(app, 'analista-radar', [
        {
          collection: 'campaigns',
          perms: { read: true, list: true, create: true, update: true },
          actAs: 'admin',
        },
        {
          collection: 'campaign_variations',
          perms: { read: true, list: true, create: true, update: true },
          actAs: 'admin',
        },
        {
          collection: 'campaign_hooks',
          perms: { read: true, list: true, create: true },
          actAs: 'admin',
        },
      ])
    } catch (agentErr) {
      console.log('Note: agent tools update for campaigns:', agentErr)
    }
  },
  (app) => {
    try {
      const hooksCol = app.findCollectionByNameOrId('campaign_hooks')
      app.delete(hooksCol)
    } catch (_) {}
    try {
      const variations = app.findCollectionByNameOrId('campaign_variations')
      app.delete(variations)
    } catch (_) {}
    try {
      const campaigns = app.findCollectionByNameOrId('campaigns')
      app.delete(campaigns)
    } catch (_) {}
  },
)
