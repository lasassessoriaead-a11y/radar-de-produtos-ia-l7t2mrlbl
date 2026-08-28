migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Idempotent admin user
    let adminUser
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'luka2510@hotmail.com')
    } catch (_) {
      adminUser = new Record(users)
      adminUser.setEmail('luka2510@hotmail.com')
      adminUser.setPassword('Skip@Pass')
      adminUser.setVerified(true)
      adminUser.set('name', 'Luka (Afiliado Pro)')
      app.save(adminUser)
    }

    const productsCol = app.findCollectionByNameOrId('products')

    const sampleProducts = [
      {
        title: 'Mini Projetor Portátil Smart LED Wi-Fi Full HD 1080p',
        image_url: 'https://img.usecurling.com/p/600/600?q=mini+projector',
        platform: 'Shopee',
        category: 'Eletrônicos & Áudio',
        niche: 'Home Cinema & Games',
        price: 349.9,
        promo_price: 279.9,
        commission_rate: 14.5,
        commission_amount: 40.58,
        sales_count: 3420,
        reviews_count: 890,
        rating: 4.8,
        seller: 'TechVibe Oficial',
        product_url: 'https://shopee.com.br/mini-projetor-smart-led',
        affiliate_url: 'https://shopee.com.br/afiliado/link-projetor-123',
        competition_level: 5,
        trends_score: 9,
        demand_score: 9,
        opportunity_score: 92,
        opportunity_level: 'hot',
        ai_summary:
          '🔥 Altíssimo apelo visual no TikTok/Reels. Excelente comissão de R$ 40,58 por venda com alta taxa de conversão e nota 4.8.',
        ai_analysis:
          "1) Por que vale a pena vender: Apelo visual brutal para vídeos de 'unboxing' e 'quarto gamer'. Ótimo valor percebido com preço promocional abaixo de R$ 300.\n2) Quem provavelmente compraria: Jovens de 18 a 34 anos, amantes de cinema em casa, gamers e estudantes.\n3) Principal benefício: Cinema em qualquer parede ou teto com conexão direta ao celular e Netflix/YouTube.\n4) Possível dificuldade: Dúvidas sobre o brilho (lúmens) em ambientes iluminados.\n5) Potencial de conversão: Altíssimo com tráfego orgânico no TikTok/Instagram mostrando projeção no teto.",
        source: 'manual',
        metadata: { free_shipping: true, fast_delivery: true },
      },
      {
        title: 'Garrafa Térmica Inteligente com Display Digital LED 500ml',
        image_url: 'https://img.usecurling.com/p/600/600?q=smart+water+bottle',
        platform: 'Mercado Livre',
        category: 'Cozinha & Casa',
        niche: 'Fitness & Dia a Dia',
        price: 69.9,
        promo_price: 49.9,
        commission_rate: 18.0,
        commission_amount: 8.98,
        sales_count: 5120,
        reviews_count: 1420,
        rating: 4.6,
        seller: 'ShopFit Brasil',
        product_url: 'https://mercadolivre.com.br/garrafa-termica-led',
        affiliate_url: 'https://mercadolivre.com.br/afiliado/garrafa-fit',
        competition_level: 6,
        trends_score: 8,
        demand_score: 8,
        opportunity_score: 75,
        opportunity_level: 'good',
        ai_summary:
          '🟢 Produto de entrada fácil com ticket acessível, ideal para ofertas em massa e compradores de impulso.',
        ai_analysis:
          "1) Por que vale a pena vender: Ticket baixo facilita compra por impulso (R$ 49,90). Mais de 5 mil vendas provam demanda consolidada.\n2) Quem provavelmente compraria: Praticantes de academia, profissionais de escritório e estudantes.\n3) Principal benefício: Mostra a temperatura exata da bebida em tempo real na tampa.\n4) Possível dificuldade: Ticket médio gera comissão unitária menor (R$ 8,98), exigindo escala de volume.\n5) Potencial de conversão: Muito alto em campanhas de 'achadinhos' e listas de presentes úteis.",
        source: 'manual',
        metadata: { color_options: ['Preto', 'Azul', 'Rosa', 'Inox'] },
      },
      {
        title: 'Luminária de Mesa LED Articulada com Carregador por Indução',
        image_url: 'https://img.usecurling.com/p/600/600?q=desk+lamp+led',
        platform: 'Amazon',
        category: 'Decoração & Escritório',
        niche: 'Home Office & Setup',
        price: 159.0,
        promo_price: 129.9,
        commission_rate: 12.0,
        commission_amount: 15.58,
        sales_count: 1280,
        reviews_count: 310,
        rating: 4.5,
        seller: 'Lumina Home Tech',
        product_url: 'https://amazon.com.br/dp/B09XYZ123',
        affiliate_url: 'https://amzn.to/3afiliado-luminaria',
        competition_level: 4,
        trends_score: 7,
        demand_score: 7,
        opportunity_score: 68,
        opportunity_level: 'good',
        ai_summary:
          "🟢 Forte apelo no nicho de Home Office e 'Setup minimalista' com comissão equilibrada de R$ 15,58.",
        ai_analysis:
          '1) Por que vale a pena vender: Soluciona iluminação de trabalho e elimina cabos na mesa com base carregadora wireless.\n2) Quem provavelmente compraria: Trabalhadores remotos, designers, programadores e concurseiros.\n3) Principal benefício: Iluminação dimerizável com proteção ocular + carregador por indução integrado.\n4) Possível dificuldade: Necessidade do celular do cliente suportar carregamento Qi (indução).\n5) Potencial de conversão: Bom potencial no Pinterest e canais do YouTube focados em produtividade e organização.',
        source: 'manual',
        metadata: { prime_eligible: true },
      },
      {
        title: 'Kit de Pincéis de Maquiagem Profissional 14 Peças com Estojo',
        image_url: 'https://img.usecurling.com/p/600/600?q=makeup+brushes',
        platform: 'TikTok Shop',
        category: 'Beleza & Cuidados',
        niche: 'Maquiagem & Estética',
        price: 89.9,
        promo_price: 59.9,
        commission_rate: 10.0,
        commission_amount: 5.99,
        sales_count: 850,
        reviews_count: 95,
        rating: 4.1,
        seller: 'Glamour Makeup Express',
        product_url: 'https://tiktok.com/@glamour/kit-pinceis',
        affiliate_url: 'https://vt.tiktok.com/ZS_afiliado_kit',
        competition_level: 8,
        trends_score: 5,
        demand_score: 6,
        opportunity_score: 45,
        opportunity_level: 'test',
        ai_summary:
          "🟡 Nicho saturado com alta concorrência. Vale testar com tutoriais específicos em lives e vídeos 'Arrume-se Comigo'.",
        ai_analysis:
          '1) Por que vale a pena vender: Nicho de beleza tem público recorrente e engajado.\n2) Quem provavelmente compraria: Mulheres de 16 a 30 anos iniciantes ou intermediárias em maquiagem.\n3) Principal benefício: Kit completo com estojo de viagem e cerdas sintéticas macias a preço popular.\n4) Possível dificuldade: Mercado altamente saturado com dezenas de kits idênticos na Shopee e Shein.\n5) Potencial de conversão: Médio. Exige demonstração em vídeo (GRWM / tutoriais) para se destacar da concorrência.',
        source: 'manual',
        metadata: { bristles: 'Sintéticas Premium' },
      },
      {
        title: 'Fone de Ouvido Bluetooth XY-50 Sem Fio Básico',
        image_url: 'https://img.usecurling.com/p/600/600?q=wireless+earbuds',
        platform: 'Shopee',
        category: 'Eletrônicos & Áudio',
        niche: 'Acessórios para Celular',
        price: 29.9,
        promo_price: 19.9,
        commission_rate: 6.0,
        commission_amount: 1.19,
        sales_count: 9400,
        reviews_count: 1800,
        rating: 3.4,
        seller: 'Import Express Global',
        product_url: 'https://shopee.com.br/fone-xy-50-bluetooth',
        affiliate_url: 'https://shopee.com.br/afiliado/fone-xy50',
        competition_level: 10,
        trends_score: 3,
        demand_score: 7,
        opportunity_score: 20,
        opportunity_level: 'low',
        ai_summary:
          '🔴 Baixa oportunidade. Margem irrisória (R$ 1,19), nota fraca (3.4) e risco alto de reclamações de clientes.',
        ai_analysis:
          '1) Por que NÃO vale a pena vender: Margem ínfima de apenas R$ 1,19 por venda não paga nenhum esforço de divulgação.\n2) Quem compraria: Consumidores ultra sensíveis a preço buscando o fone mais barato possível.\n3) Principal benefício: Preço extremamente baixo.\n4) Principal dificuldade: Nota 3.4 indica taxa alta de defeitos e insatisfação, o que queima a credibilidade do afiliado.\n5) Potencial de conversão: Desaconselhado. Foque em fones de melhor qualidade e ticket sustentável.',
        source: 'manual',
        metadata: { bluetooth_version: '5.0' },
      },
    ]

    sampleProducts.forEach((prod) => {
      try {
        app.findFirstRecordByData('products', 'title', prod.title)
        // Already exists
      } catch (_) {
        const rec = new Record(productsCol)
        for (const [key, val] of Object.entries(prod)) {
          rec.set(key, val)
        }
        app.save(rec)
      }
    })

    // Seed AI insights
    const aiInsightsCol = app.findCollectionByNameOrId('ai_insights')
    try {
      const existing = app.findRecordsByFilter('ai_insights', '', '-created', 1, 0)
      if (existing.length === 0) {
        const insight = new Record(aiInsightsCol)
        insight.set(
          'global_recommendations',
          'Entre os produtos analisados no momento, os 3 primeiros que eu testaria em campanhas orgânicas ou tráfego pago são: 1. Mini Projetor Smart (Score 92 🔥) pelo apelo audiovisual em vídeos curtos; 2. Garrafa Térmica Inteligente (Score 75 🟢) pela facilidade de compra impulsiva; 3. Luminária LED Home Office (Score 68 🟢) pela excelente taxa de ticket médio e baixa devolução.',
        )
        insight.set('top_picks', [
          {
            title: 'Mini Projetor Portátil Smart LED',
            score: 92,
            reason: 'Altíssimo apelo visual e comissão de R$ 40,58',
          },
          {
            title: 'Garrafa Térmica Inteligente',
            score: 75,
            reason: 'Ticket de impulso ideal para escala',
          },
          {
            title: 'Luminária de Mesa LED Articulada',
            score: 68,
            reason: 'Público qualificado de Home Office',
          },
        ])
        app.save(insight)
      }
    } catch (_) {}
  },
  (app) => {
    // rollback
  },
)
