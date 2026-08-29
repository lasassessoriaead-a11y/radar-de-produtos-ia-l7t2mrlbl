migrate(
  (app) => {
    // 1. channel_connections
    const channelConnections = new Collection({
      name: 'channel_connections',
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
        {
          name: 'channel_type',
          type: 'select',
          required: true,
          values: [
            'telegram',
            'instagram',
            'tiktok',
            'youtube',
            'facebook',
            'pinterest',
            'whatsapp',
          ],
          maxSelect: 1,
        },
        { name: 'display_name', type: 'text', required: true },
        { name: 'is_active', type: 'bool' },
        { name: 'is_connected', type: 'bool' },
        { name: 'credentials_masked', type: 'json' }, // e.g. { bot_username: "@mybot", chat_id: "-100..." }
        { name: 'credentials_encrypted', type: 'text' }, // encrypted token
        { name: 'settings', type: 'json' },
        { name: 'last_tested_at', type: 'date' },
        { name: 'status_message', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_conn_user_channel ON channel_connections (user_id, channel_type)',
      ],
    })
    app.save(channelConnections)

    // 2. publications
    const publications = new Collection({
      name: 'publications',
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
        {
          name: 'campaign_id',
          type: 'relation',
          required: true,
          collectionId: app.findCollectionByNameOrId('campaigns').id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'variation_id', type: 'text' },
        { name: 'creative_id', type: 'text' },
        { name: 'product_id', type: 'text' },
        { name: 'discovered_id', type: 'text' },
        { name: 'channel', type: 'text', required: true },
        {
          name: 'channel_type',
          type: 'select',
          required: true,
          values: [
            'telegram',
            'instagram',
            'tiktok',
            'youtube',
            'facebook',
            'pinterest',
            'whatsapp',
            'other',
          ],
          maxSelect: 1,
        },
        {
          name: 'publication_mode',
          type: 'select',
          required: true,
          values: ['telegram_bot', 'manual_tracked'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'draft',
            'ready_to_publish',
            'scheduled',
            'publishing',
            'published',
            'paused',
            'failed',
            'archived',
          ],
          maxSelect: 1,
        },
        { name: 'published_at', type: 'date' },
        { name: 'scheduled_for', type: 'date' },
        { name: 'external_post_url', type: 'text' },
        { name: 'external_message_id', type: 'text' },
        { name: 'copy_used', type: 'text' },
        { name: 'cta_used', type: 'text' },
        { name: 'creative_image_url', type: 'text' },
        { name: 'tracking_link_id', type: 'text' },
        { name: 'tracking_slug', type: 'text' },
        { name: 'tracking_full_url', type: 'text' },
        { name: 'destination_url', type: 'text' },
        { name: 'checklist_snapshot', type: 'json' },
        { name: 'price_at_publish', type: 'number' },
        { name: 'impressions_count', type: 'number' },
        { name: 'views_count', type: 'number' },
        { name: 'raw_clicks_count', type: 'number' },
        { name: 'valid_clicks_count', type: 'number' },
        { name: 'conversions_count', type: 'number' },
        { name: 'commission_total', type: 'number' },
        { name: 'costs_total', type: 'number' },
        { name: 'error_log', type: 'text' },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pub_camp ON publications (campaign_id)',
        'CREATE INDEX idx_pub_status ON publications (status)',
        'CREATE INDEX idx_pub_user_created ON publications (user_id, created DESC)',
      ],
    })
    app.save(publications)

    // 3. tracking_links
    const trackingLinks = new Collection({
      name: 'tracking_links',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: '', // Public read for tracker resolving
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
        { name: 'slug', type: 'text', required: true },
        { name: 'title', type: 'text' },
        { name: 'campaign_id', type: 'text' },
        { name: 'variation_id', type: 'text' },
        { name: 'creative_id', type: 'text' },
        { name: 'product_id', type: 'text' },
        { name: 'publication_id', type: 'text' },
        { name: 'channel', type: 'text' },
        { name: 'sub_id', type: 'text' },
        { name: 'destination_url', type: 'text', required: true },
        { name: 'utm_source', type: 'text' },
        { name: 'utm_medium', type: 'text' },
        { name: 'utm_campaign', type: 'text' },
        { name: 'utm_content', type: 'text' },
        { name: 'utm_term', type: 'text' },
        { name: 'is_active', type: 'bool' },
        { name: 'raw_clicks_count', type: 'number' },
        { name: 'valid_clicks_count', type: 'number' },
        { name: 'conversions_count', type: 'number' },
        { name: 'commission_earned', type: 'number' },
        { name: 'last_click_at', type: 'date' },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_track_slug ON tracking_links (slug)',
        'CREATE INDEX idx_track_camp ON tracking_links (campaign_id)',
        'CREATE INDEX idx_track_subid ON tracking_links (sub_id)',
      ],
    })
    app.save(trackingLinks)

    // 4. click_events
    const clickEvents = new Collection({
      name: 'click_events',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: '', // Public create for tracking endpoint
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        { name: 'user_id', type: 'text' },
        { name: 'tracking_link_id', type: 'text', required: true },
        { name: 'slug', type: 'text' },
        { name: 'campaign_id', type: 'text' },
        { name: 'variation_id', type: 'text' },
        { name: 'creative_id', type: 'text' },
        { name: 'publication_id', type: 'text' },
        { name: 'product_id', type: 'text' },
        { name: 'channel', type: 'text' },
        { name: 'sub_id', type: 'text' },
        { name: 'is_valid', type: 'bool' },
        { name: 'invalid_reason', type: 'text' }, // "bot_crawler", "social_preview", "rapid_repeat", "empty_ua"
        { name: 'referrer_host', type: 'text' },
        { name: 'user_agent_short', type: 'text' },
        {
          name: 'device_type',
          type: 'select',
          values: ['mobile', 'desktop', 'tablet', 'bot', 'unknown'],
          maxSelect: 1,
        },
        { name: 'client_dedup_hash', type: 'text' }, // Privacy-friendly non-invasive technical hash
        { name: 'ip_masked', type: 'text' }, // e.g. "189.45.*.*"
        { name: 'country_code', type: 'text' },
        { name: 'has_converted', type: 'bool' },
        { name: 'conversion_id', type: 'text' },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_click_track ON click_events (tracking_link_id)',
        'CREATE INDEX idx_click_camp ON click_events (campaign_id)',
        'CREATE INDEX idx_click_created ON click_events (created DESC)',
        'CREATE INDEX idx_click_valid ON click_events (is_valid)',
      ],
    })
    app.save(clickEvents)

    // 5. conversions
    const conversions = new Collection({
      name: 'conversions',
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
        { name: 'product_id', type: 'text' },
        { name: 'campaign_id', type: 'text' },
        { name: 'variation_id', type: 'text' },
        { name: 'creative_id', type: 'text' },
        { name: 'publication_id', type: 'text' },
        { name: 'tracking_link_id', type: 'text' },
        { name: 'sub_id', type: 'text' },
        { name: 'external_order_id', type: 'text' },
        { name: 'channel', type: 'text' },
        { name: 'sale_amount', type: 'number', required: true },
        { name: 'commission_amount', type: 'number', required: true },
        { name: 'currency', type: 'text' }, // "BRL", "USD"
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pending', 'confirmed', 'canceled', 'refunded'],
          maxSelect: 1,
        },
        {
          name: 'source_type',
          type: 'select',
          required: true,
          values: ['csv_import', 'manual_entry', 'webhook', 'api_postback'],
          maxSelect: 1,
        },
        {
          name: 'attribution_confidence',
          type: 'select',
          required: true,
          values: ['confirmed', 'probable', 'unattributed'],
          maxSelect: 1,
        },
        { name: 'attribution_method', type: 'text' }, // "exact_sub_id", "product_and_time_match", "manual"
        { name: 'conversion_date', type: 'date' },
        { name: 'raw_payload', type: 'json' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_conv_user ON conversions (user_id)',
        'CREATE INDEX idx_conv_camp ON conversions (campaign_id)',
        'CREATE INDEX idx_conv_status ON conversions (status)',
        'CREATE INDEX idx_conv_date ON conversions (conversion_date DESC)',
        'CREATE INDEX idx_conv_subid ON conversions (sub_id)',
      ],
    })
    app.save(conversions)

    // 6. campaign_costs
    const campaignCosts = new Collection({
      name: 'campaign_costs',
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
        { name: 'campaign_id', type: 'text' },
        { name: 'variation_id', type: 'text' },
        { name: 'publication_id', type: 'text' },
        {
          name: 'cost_type',
          type: 'select',
          required: true,
          values: [
            'paid_traffic',
            'ai_generation',
            'tools_subscription',
            'creative_outsourcing',
            'other',
          ],
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'amount', type: 'number', required: true },
        { name: 'date', type: 'date' },
        { name: 'channel', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_cost_user ON campaign_costs (user_id)',
        'CREATE INDEX idx_cost_camp ON campaign_costs (campaign_id)',
      ],
    })
    app.save(campaignCosts)

    // 7. audit_logs
    const auditLogs = new Collection({
      name: 'audit_logs',
      type: 'base',
      listRule: "@request.auth.id != '' && user_id = @request.auth.id",
      viewRule: "@request.auth.id != '' && user_id = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user_id = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user_id = @request.auth.id",
      fields: [
        { name: 'user_id', type: 'text', required: true },
        {
          name: 'entity_type',
          type: 'select',
          required: true,
          values: [
            'campaign',
            'creative',
            'publication',
            'tracking_link',
            'conversion',
            'channel',
            'cost',
          ],
          maxSelect: 1,
        },
        { name: 'entity_id', type: 'text' },
        { name: 'action', type: 'text', required: true }, // e.g. "campaign_created", "published_telegram", "manual_marked", "conversion_imported"
        { name: 'title', type: 'text', required: true },
        { name: 'details', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_audit_user ON audit_logs (user_id)',
        'CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id)',
        'CREATE INDEX idx_audit_created ON audit_logs (created DESC)',
      ],
    })
    app.save(auditLogs)
  },
  (app) => {
    const tables = [
      'audit_logs',
      'campaign_costs',
      'conversions',
      'click_events',
      'tracking_links',
      'publications',
      'channel_connections',
    ]
    for (const name of tables) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
