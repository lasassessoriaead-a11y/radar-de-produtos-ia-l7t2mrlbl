migrate(
  (app) => {
    // 1. Create discovered_products collection (intermediate discovery stage before Radar)
    const discovered = new Collection({
      name: 'discovered_products',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'external_id', type: 'text', required: true },
        { name: 'platform', type: 'text', required: true }, // e.g. "Mercado Livre", "Shopee", "Amazon", "TikTok Shop"
        { name: 'title', type: 'text', required: true },
        { name: 'image_url', type: 'text' },
        { name: 'category', type: 'text' },
        { name: 'niche', type: 'text' },
        { name: 'price', type: 'number' },
        { name: 'promo_price', type: 'number' },
        { name: 'commission_rate', type: 'number' }, // % (or estimated)
        { name: 'commission_amount', type: 'number' }, // R$ (or estimated)
        { name: 'commission_is_estimated', type: 'bool' }, // true if user/default estimate, false if marketplace provided
        { name: 'sales_count', type: 'number' },
        { name: 'reviews_count', type: 'number' },
        { name: 'rating', type: 'number' },
        { name: 'seller', type: 'text' },
        { name: 'product_url', type: 'text' },
        { name: 'affiliate_url', type: 'text' },
        { name: 'competition_level', type: 'number' },
        { name: 'trends_score', type: 'number' },
        { name: 'demand_score', type: 'number' },
        { name: 'opportunity_score', type: 'number' },
        {
          name: 'opportunity_level',
          type: 'select',
          values: ['hot', 'good', 'test', 'low'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['pending', 'approved', 'discarded'],
          maxSelect: 1,
        },
        { name: 'ai_analysis', type: 'text' },
        { name: 'ai_summary', type: 'text' },
        { name: 'ai_strengths', type: 'json' }, // Pontos fortes (array of strings)
        { name: 'ai_weaknesses', type: 'json' }, // Pontos fracos (array of strings)
        { name: 'ai_target_audience', type: 'text' }, // Público provável
        { name: 'ai_selling_angle', type: 'text' }, // Ângulo de venda
        { name: 'ai_risk_level', type: 'text' }, // Risco (baixo/médio/alto)
        { name: 'source', type: 'text' }, // 'api' | 'manual'
        { name: 'radar_product_id', type: 'text' }, // ID in products table if approved
        { name: 'raw_data', type: 'json' }, // Original payload from API
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_disc_ext_plat ON discovered_products (platform, external_id)',
        'CREATE INDEX idx_disc_status ON discovered_products (status)',
        'CREATE INDEX idx_disc_score ON discovered_products (opportunity_score DESC)',
        'CREATE INDEX idx_disc_category ON discovered_products (category)',
      ],
    })
    app.save(discovered)

    // 2. Create product_snapshots collection (Historical tracking for trends)
    const snapshots = new Collection({
      name: 'product_snapshots',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'product_id', type: 'text' }, // ID in products table (if exists)
        { name: 'discovered_id', type: 'text' }, // ID in discovered_products (if exists)
        { name: 'external_id', type: 'text' }, // External ID (e.g. MLB123456)
        { name: 'platform', type: 'text' },
        { name: 'price', type: 'number' },
        { name: 'promo_price', type: 'number' },
        { name: 'commission_rate', type: 'number' },
        { name: 'commission_amount', type: 'number' },
        { name: 'sales_count', type: 'number' },
        { name: 'reviews_count', type: 'number' },
        { name: 'rating', type: 'number' },
        { name: 'opportunity_score', type: 'number' },
        { name: 'ranking_position', type: 'number' },
        { name: 'snapshot_date', type: 'date' },
        { name: 'metadata', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_snap_prod_id ON product_snapshots (product_id)',
        'CREATE INDEX idx_snap_disc_id ON product_snapshots (discovered_id)',
        'CREATE INDEX idx_snap_ext_id ON product_snapshots (external_id)',
        'CREATE INDEX idx_snap_created ON product_snapshots (created DESC)',
      ],
    })
    app.save(snapshots)

    // 3. Create watchlist collection (Acompanhamento / Favoritos)
    const watchlist = new Collection({
      name: 'watchlist',
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
        { name: 'external_id', type: 'text', required: true },
        { name: 'platform', type: 'text', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'image_url', type: 'text' },
        { name: 'product_url', type: 'text' },
        { name: 'category', type: 'text' },
        { name: 'initial_price', type: 'number' },
        { name: 'current_price', type: 'number' },
        { name: 'initial_commission_rate', type: 'number' },
        { name: 'current_commission_rate', type: 'number' },
        { name: 'initial_commission_amount', type: 'number' },
        { name: 'current_commission_amount', type: 'number' },
        { name: 'initial_sales_count', type: 'number' },
        { name: 'current_sales_count', type: 'number' },
        { name: 'initial_rating', type: 'number' },
        { name: 'current_rating', type: 'number' },
        { name: 'initial_score', type: 'number' },
        { name: 'current_score', type: 'number' },
        { name: 'trend_signal', type: 'text' }, // 'rising' (📈) | 'trending_hot' (🔥) | 'stable' (➡️) | 'falling' (📉) | 'insufficient_data'
        { name: 'last_alert_reason', type: 'text' },
        { name: 'notes', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_watch_user ON watchlist (user_id)',
        'CREATE INDEX idx_watch_ext ON watchlist (platform, external_id)',
        'CREATE INDEX idx_watch_score ON watchlist (current_score DESC)',
      ],
    })
    app.save(watchlist)

    // 4. Update the analista-radar agent tools to include discovered_products, product_snapshots, watchlist
    try {
      $ai.agents.putTools(app, 'analista-radar', [
        { collection: 'discovered_products', perms: { read: true, list: true }, actAs: 'admin' },
        { collection: 'product_snapshots', perms: { read: true, list: true }, actAs: 'admin' },
        { collection: 'watchlist', perms: { read: true, list: true }, actAs: 'admin' },
      ])
    } catch (agentErr) {
      console.log('Note: agent tools update:', agentErr)
    }
  },
  (app) => {
    try {
      const watchlist = app.findCollectionByNameOrId('watchlist')
      app.delete(watchlist)
    } catch (_) {}
    try {
      const snapshots = app.findCollectionByNameOrId('product_snapshots')
      app.delete(snapshots)
    } catch (_) {}
    try {
      const discovered = app.findCollectionByNameOrId('discovered_products')
      app.delete(discovered)
    } catch (_) {}
  },
)
