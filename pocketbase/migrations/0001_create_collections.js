migrate(
  (app) => {
    const products = new Collection({
      name: 'products',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'image_url', type: 'text' },
        { name: 'platform', type: 'text' }, // e.g. "Shopee", "Mercado Livre", "Amazon", "TikTok Shop", "Manual", "Hotmart", etc.
        { name: 'category', type: 'text' },
        { name: 'niche', type: 'text' },
        { name: 'price', type: 'number' },
        { name: 'promo_price', type: 'number' },
        { name: 'commission_rate', type: 'number' }, // %
        { name: 'commission_amount', type: 'number' }, // R$
        { name: 'sales_count', type: 'number' }, // Qtd de vendas
        { name: 'reviews_count', type: 'number' }, // Qtd avaliações
        { name: 'rating', type: 'number' }, // Nota 0-5
        { name: 'seller', type: 'text' }, // Vendedor / Loja
        { name: 'product_url', type: 'text' }, // Link do produto
        { name: 'affiliate_url', type: 'text' }, // Link de afiliado
        { name: 'competition_level', type: 'number' }, // 1-10
        { name: 'trends_score', type: 'number' }, // 1-10
        { name: 'demand_score', type: 'number' }, // 1-10
        { name: 'opportunity_score', type: 'number' }, // 0-100
        {
          name: 'opportunity_level',
          type: 'select',
          values: ['hot', 'good', 'test', 'low'],
          maxSelect: 1,
        }, // 🔥 Alta oportunidade, 🟢 Bom potencial, 🟡 Testar, 🔴 Baixa oportunidade
        { name: 'ai_analysis', type: 'text' },
        { name: 'ai_summary', type: 'text' },
        { name: 'source', type: 'text' }, // 'manual' | 'csv' | 'api'
        { name: 'metadata', type: 'json' }, // Extensível para metadados de plataformas parceiras (Shopee, Amazon, etc.)
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_products_category ON products (category)',
        'CREATE INDEX idx_products_score ON products (opportunity_score DESC)',
        'CREATE INDEX idx_products_level ON products (opportunity_level)',
        'CREATE INDEX idx_products_platform ON products (platform)',
      ],
    })
    app.save(products)

    const aiInsights = new Collection({
      name: 'ai_insights',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'global_recommendations', type: 'text' },
        { name: 'top_picks', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(aiInsights)
  },
  (app) => {
    try {
      const aiInsights = app.findCollectionByNameOrId('ai_insights')
      app.delete(aiInsights)
    } catch (_) {}
    try {
      const products = app.findCollectionByNameOrId('products')
      app.delete(products)
    } catch (_) {}
  },
)
