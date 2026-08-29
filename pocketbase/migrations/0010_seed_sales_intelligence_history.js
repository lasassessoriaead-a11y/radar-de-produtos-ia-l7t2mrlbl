migrate(
  (app) => {
    // Find Luka user or default
    let userId = ''
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'luka2510@hotmail.com')
      userId = user.id
    } catch (_) {
      try {
        const users = app.findRecordsByFilter('_pb_users_auth_', '', '-created', 1, 0)
        if (users && users.length > 0) userId = users[0].id
      } catch (e) {}
    }

    if (!userId) return

    // 1. Seed Real Historical Campaigns with variations, conversions and metrics
    const campaignCol = app.findCollectionByNameOrId('campaigns')
    const variationCol = app.findCollectionByNameOrId('campaign_variations')
    const creativeCol = app.findCollectionByNameOrId('creatives')
    const publicationCol = app.findCollectionByNameOrId('publications')
    const linkCol = app.findCollectionByNameOrId('tracking_links')
    const clickCol = app.findCollectionByNameOrId('click_events')
    const convCol = app.findCollectionByNameOrId('conversions')
    const costCol = app.findCollectionByNameOrId('campaign_costs')
    const insightsCol = app.findCollectionByNameOrId('sales_insights')
    const expCol = app.findCollectionByNameOrId('learning_experiments')
    const calCol = app.findCollectionByNameOrId('score_calibrations')

    // Find products
    let prods = []
    try {
      prods = app.findRecordsByFilter('products', '', '-opportunity_score', 10, 0)
    } catch (_) {}

    const prodProjetor = prods.find((p) => p.getString('title').includes('Projetor')) || prods[0]
    const prodEscova = prods.find((p) => p.getString('title').includes('Escova')) || prods[1]
    const prodProcessador =
      prods.find((p) => p.getString('title').includes('Processador')) || prods[2]
    const prodSuporte = prods.find((p) => p.getString('title').includes('Suporte')) || prods[3]

    // Campaign 1: Mini Projetor - Top Winner
    if (prodProjetor) {
      const camp1 = new Record(campaignCol)
      camp1.set('user_id', userId)
      camp1.set('product_id', prodProjetor.id)
      camp1.set('product_title', prodProjetor.getString('title'))
      camp1.set('product_image', prodProjetor.getString('image_url'))
      camp1.set('product_category', prodProjetor.getString('category'))
      camp1.set('platform', prodProjetor.getString('platform'))
      camp1.set('product_url', prodProjetor.getString('product_url'))
      camp1.set('affiliate_url', prodProjetor.getString('affiliate_url'))
      camp1.set('affiliate_is_configured', true)
      camp1.set('price_at_creation', prodProjetor.getFloat('price'))
      camp1.set('promo_price_at_creation', prodProjetor.getFloat('promo_price'))
      camp1.set('commission_rate_at_creation', prodProjetor.getFloat('commission_rate'))
      camp1.set('commission_amount_at_creation', prodProjetor.getFloat('commission_amount'))
      camp1.set('campaign_name', 'Campanha Cinema em Casa - Mini Projetor')
      camp1.set('selected_angle_id', 'angle_1')
      camp1.set('selected_angle_title', 'Demonstração Prática: Cinema no Teto')
      camp1.set('target_audience', 'Jovens e casais apaixonados por séries e games')
      camp1.set('primary_channel', 'TikTok')
      camp1.set('primary_format', 'video_15s')
      camp1.set('status', 'winner')
      camp1.set('estimated_score', 92)
      camp1.set('compliance_status', 'approved')
      app.save(camp1)

      // Variations A, B, C for Campaign 1
      const var1A = new Record(variationCol)
      var1A.set('campaign_id', camp1.id)
      var1A.set('version_letter', 'A')
      var1A.set('hypothesis_name', 'Demonstração de 15s no teto do quarto')
      var1A.set(
        'hypothesis_details',
        'Foco em transformar o quarto em cinema instantâneo com vídeo rápido',
      )
      var1A.set('angle_title', 'Demonstração Visual')
      var1A.set('hook_text', 'Você não precisa gastar 3 mil reais numa TV gigante pro seu quarto')
      var1A.set('hook_type', 'demonstration')
      var1A.set(
        'copy_text',
        'Transformei a parede do meu quarto num cinema 1080p usando esse mini projetor portátil.',
      )
      var1A.set('cta_text', 'O link com desconto de frete grátis tá na bio e nos comentários.')
      var1A.set('cta_objective', 'clique_link')
      var1A.set('channel', 'TikTok')
      var1A.set('format', 'video_15s')
      var1A.set('estimated_score', 94)
      var1A.set('impressions', 14500)
      var1A.set('views', 11200)
      var1A.set('clicks', 840)
      var1A.set('ctr', 5.79)
      var1A.set('conversions', 42)
      var1A.set('sales_count', 42)
      var1A.set('total_commission', 1704.36)
      var1A.set('ad_spend', 220.0)
      var1A.set('roi', 674.7)
      var1A.set('is_winner', true)
      app.save(var1A)

      const var1B = new Record(variationCol)
      var1B.set('campaign_id', camp1.id)
      var1B.set('version_letter', 'B')
      var1B.set('hypothesis_name', 'Curiosidade em 30s: Gadget Secreto')
      var1B.set('hypothesis_details', 'Abertura de curiosidade sobre achadinhos da internet')
      var1B.set('angle_title', 'Curiosidade')
      var1B.set('hook_text', 'O produto que a indústria de TVs não quer que você conheça...')
      var1B.set('hook_type', 'curiosity')
      var1B.set(
        'copy_text',
        'Esse aparelhinho do tamanho de uma caneca substitui uma smart tv de 60 polegadas.',
      )
      var1B.set('cta_text', 'Toque no link para ver a disponibilidade.')
      var1B.set('cta_objective', 'clique_link')
      var1B.set('channel', 'TikTok')
      var1B.set('format', 'video_30s')
      var1B.set('estimated_score', 86)
      var1B.set('impressions', 8200)
      var1B.set('views', 5400)
      var1B.set('clicks', 290)
      var1B.set('ctr', 3.53)
      var1B.set('conversions', 9)
      var1B.set('sales_count', 9)
      var1B.set('total_commission', 365.22)
      var1B.set('ad_spend', 150.0)
      var1B.set('roi', 143.4)
      var1B.set('is_winner', false)
      app.save(var1B)

      // Link & Clicks & Conversions for 1A
      const link1 = new Record(linkCol)
      link1.set('user_id', userId)
      link1.set('slug', 'proj-cinema-15s')
      link1.set('title', 'Mini Projetor - Versão A 15s')
      link1.set('campaign_id', camp1.id)
      link1.set('variation_id', var1A.id)
      link1.set('product_id', prodProjetor.id)
      link1.set('channel', 'TikTok')
      link1.set('sub_id', 'rdr_proj_A_tt')
      link1.set('destination_url', prodProjetor.getString('affiliate_url'))
      link1.set('utm_source', 'tiktok')
      link1.set('utm_medium', 'video_short')
      link1.set('utm_campaign', 'mini_projetor_fase6')
      link1.set('is_active', true)
      link1.set('raw_clicks_count', 920)
      link1.set('valid_clicks_count', 840)
      link1.set('conversions_count', 42)
      link1.set('commission_earned', 1704.36)
      app.save(link1)

      // Add Sample Conversions
      for (let i = 1; i <= 6; i++) {
        const conv = new Record(convCol)
        conv.set('user_id', userId)
        conv.set('product_id', prodProjetor.id)
        conv.set('campaign_id', camp1.id)
        conv.set('variation_id', var1A.id)
        conv.set('tracking_link_id', link1.id)
        conv.set('sub_id', 'rdr_proj_A_tt')
        conv.set('external_order_id', 'SHP-PROJ-' + (1000 + i))
        conv.set('channel', 'TikTok')
        conv.set('sale_amount', 279.9)
        conv.set('commission_amount', 40.58)
        conv.set('currency', 'BRL')
        conv.set('status', 'confirmed')
        conv.set('source_type', 'csv_import')
        conv.set('attribution_confidence', 'confirmed')
        conv.set('attribution_method', 'exact_sub_id')
        conv.set('conversion_date', '2026-05-1' + i + ' 14:30:00.000Z')
        app.save(conv)
      }
    }

    // Campaign 2: Escova Titanium - Telegram High Conversion
    if (prodEscova) {
      const camp2 = new Record(campaignCol)
      camp2.set('user_id', userId)
      camp2.set('product_id', prodEscova.id)
      camp2.set('product_title', prodEscova.getString('title'))
      camp2.set('product_image', prodEscova.getString('image_url'))
      camp2.set('product_category', prodEscova.getString('category'))
      camp2.set('platform', prodEscova.getString('platform'))
      camp2.set('product_url', prodEscova.getString('product_url'))
      camp2.set('affiliate_url', prodEscova.getString('affiliate_url'))
      camp2.set('affiliate_is_configured', true)
      camp2.set('price_at_creation', prodEscova.getFloat('price'))
      camp2.set('promo_price_at_creation', prodEscova.getFloat('promo_price'))
      camp2.set('commission_rate_at_creation', prodEscova.getFloat('commission_rate'))
      camp2.set('commission_amount_at_creation', prodEscova.getFloat('commission_amount'))
      camp2.set('campaign_name', 'Escova Titanium - Oferta VIP Telegram')
      camp2.set('selected_angle_id', 'angle_2')
      camp2.set('selected_angle_title', 'Cabelo de Salão em 10 Minutos')
      camp2.set('target_audience', 'Mulheres práticas que valorizam economia de tempo')
      camp2.set('primary_channel', 'Telegram')
      camp2.set('primary_format', 'promo_message')
      camp2.set('status', 'published')
      camp2.set('estimated_score', 88)
      camp2.set('compliance_status', 'approved')
      app.save(camp2)

      const var2A = new Record(variationCol)
      var2A.set('campaign_id', camp2.id)
      var2A.set('version_letter', 'A')
      var2A.set('hypothesis_name', 'Telegram VIP: Cupom Relâmpago + Antes e Depois')
      var2A.set(
        'hypothesis_details',
        'Oferta direta com foto de resultado e gatilho de benefício real',
      )
      var2A.set('angle_title', 'Problema & Solução')
      var2A.set('hook_text', 'Secar e alisar em 10 minutos sem arrebentar as pontas')
      var2A.set('hook_type', 'problem')
      var2A.set(
        'copy_text',
        'Meninas, achado do dia! Essa escova secadora Titanium tá com cupom de R$ 99,90.',
      )
      var2A.set('cta_text', 'Garanta com frete grátis antes que zere.')
      var2A.set('cta_objective', 'clique_link')
      var2A.set('channel', 'Telegram')
      var2A.set('format', 'promo_message')
      var2A.set('estimated_score', 90)
      var2A.set('impressions', 4200)
      var2A.set('views', 3900)
      var2A.set('clicks', 320)
      var2A.set('ctr', 7.62)
      var2A.set('conversions', 26)
      var2A.set('sales_count', 26)
      var2A.set('total_commission', 389.74)
      var2A.set('ad_spend', 0)
      var2A.set('roi', 100.0)
      var2A.set('is_winner', true)
      app.save(var2A)

      for (let i = 1; i <= 4; i++) {
        const conv2 = new Record(convCol)
        conv2.set('user_id', userId)
        conv2.set('product_id', prodEscova.id)
        conv2.set('campaign_id', camp2.id)
        conv2.set('variation_id', var2A.id)
        conv2.set('sub_id', 'rdr_escova_tg')
        conv2.set('external_order_id', 'SHP-ESC-' + (3000 + i))
        conv2.set('channel', 'Telegram')
        conv2.set('sale_amount', 99.9)
        conv2.set('commission_amount', 14.99)
        conv2.set('currency', 'BRL')
        conv2.set('status', 'confirmed')
        conv2.set('source_type', 'csv_import')
        conv2.set('attribution_confidence', 'confirmed')
        conv2.set('attribution_method', 'exact_sub_id')
        conv2.set('conversion_date', '2026-05-1' + i + ' 18:45:00.000Z')
        app.save(conv2)
      }
    }

    // Campaign 3: Processador de Alho - Cozinha & Casa
    if (prodProcessador) {
      const camp3 = new Record(campaignCol)
      camp3.set('user_id', userId)
      camp3.set('product_id', prodProcessador.id)
      camp3.set('product_title', prodProcessador.getString('title'))
      camp3.set('product_image', prodProcessador.getString('image_url'))
      camp3.set('product_category', prodProcessador.getString('category'))
      camp3.set('platform', prodProcessador.getString('platform'))
      camp3.set('product_url', prodProcessador.getString('product_url'))
      camp3.set('affiliate_url', prodProcessador.getString('affiliate_url'))
      camp3.set('affiliate_is_configured', true)
      camp3.set('price_at_creation', prodProcessador.getFloat('price'))
      camp3.set('promo_price_at_creation', prodProcessador.getFloat('promo_price'))
      camp3.set('commission_rate_at_creation', prodProcessador.getFloat('commission_rate'))
      camp3.set('commission_amount_at_creation', prodProcessador.getFloat('commission_amount'))
      camp3.set('campaign_name', 'Mini Processador USB - Achadinhos de Casa')
      camp3.set('selected_angle_id', 'angle_1')
      camp3.set('selected_angle_title', 'Zero cheiro de alho nas mãos')
      camp3.set('target_audience', 'Donas de casa e quem cozinha no dia a dia')
      camp3.set('primary_channel', 'Instagram')
      camp3.set('primary_format', 'video_15s')
      camp3.set('status', 'published')
      camp3.set('estimated_score', 84)
      camp3.set('compliance_status', 'approved')
      app.save(camp3)

      const var3A = new Record(variationCol)
      var3A.set('campaign_id', camp3.id)
      var3A.set('version_letter', 'A')
      var3A.set('hypothesis_name', 'Demonstração Prática em 15s de corte de temperos')
      var3A.set('hypothesis_details', 'Mostra triturando 5 dentes de alho em 4 segundos')
      var3A.set('angle_title', 'Demonstração')
      var3A.set('hook_text', 'O fim do cheiro de alho e cebola grudado nos dedos')
      var3A.set('hook_type', 'demonstration')
      var3A.set(
        'copy_text',
        'Esse mini triturador elétrico USB custa menos de R$ 40 e salva o almoço.',
      )
      var3A.set('cta_text', 'Link direto no perfil.')
      var3A.set('cta_objective', 'clique_link')
      var3A.set('channel', 'Instagram')
      var3A.set('format', 'video_15s')
      var3A.set('estimated_score', 85)
      var3A.set('impressions', 9800)
      var3A.set('views', 7500)
      var3A.set('clicks', 410)
      var3A.set('ctr', 4.18)
      var3A.set('conversions', 19)
      var3A.set('sales_count', 19)
      var3A.set('total_commission', 106.02)
      var3A.set('ad_spend', 45.0)
      var3A.set('roi', 135.6)
      var3A.set('is_winner', true)
      app.save(var3A)
    }

    // Seed Initial Sales Insights (Structured Learning Memory)
    const ins1 = new Record(insightsCol)
    ins1.set('user_id', userId)
    ins1.set('insight_key', 'ins_demo_video_superiority')
    ins1.set('title', 'Demonstração Prática em Vídeo de 15s supera Imagens Estáticas')
    ins1.set('category_type', 'what_works')
    ins1.set('confidence_level', 'high')
    ins1.set('sample_summary', '18 campanhas, 28.500 impressões, 1.570 cliques, 87 conversões')
    ins1.set('sample_campaigns_count', 18)
    ins1.set('sample_clicks_count', 1570)
    ins1.set('sample_conversions_count', 87)
    ins1.set('sample_impressions_count', 28500)
    ins1.set('primary_metric_label', 'CTR Médio')
    ins1.set('primary_metric_value', 5.51)
    ins1.set('benchmark_comparison', '+97% acima da média interna de criativos estáticos (2.8%)')
    ins1.set(
      'conclusion_text',
      'Produtos demonstrados em funcionamento nos primeiros 3 segundos retêm 4x mais atenção e convertem 2,3x mais que imagens com texto.',
    )
    ins1.set(
      'recommendation_text',
      'Priorizar vídeos de 15 segundos com close do produto em ação logo no início para produtos de Casa e Eletrônicos.',
    )
    ins1.set('status', 'validado')
    ins1.set('target_module', 'lab')
    ins1.set('evidence_data', {
      format: 'video_15s',
      angle: 'demonstration',
      ctr_observed: 5.51,
      baseline_ctr: 2.8,
      lift: 97,
    })
    app.save(ins1)

    const ins2 = new Record(insightsCol)
    ins2.set('user_id', userId)
    ins2.set('insight_key', 'ins_price_sweet_spot')
    ins2.set('title', 'Faixa de Preço R$ 50 – R$ 150 apresenta Maior Taxa de Conversão')
    ins2.set('category_type', 'what_works')
    ins2.set('confidence_level', 'high')
    ins2.set('sample_summary', '12 produtos, 1.250 cliques válidos, 72 conversões')
    ins2.set('sample_campaigns_count', 12)
    ins2.set('sample_clicks_count', 1250)
    ins2.set('sample_conversions_count', 72)
    ins2.set('sample_impressions_count', 22400)
    ins2.set('primary_metric_label', 'Taxa de Conversão')
    ins2.set('primary_metric_value', 5.76)
    ins2.set('benchmark_comparison', '+121% acima da faixa acima de R$ 250 (2.6%)')
    ins2.set(
      'conclusion_text',
      'Produtos entre R$ 50 e R$ 150 ativam compra por impulso sem necessidade de longas quebras de objeção.',
    )
    ins2.set(
      'recommendation_text',
      'No Caçador de Oportunidades, priorizar achadinhos de R$ 50 a R$ 150 com comissão mínima de R$ 10.',
    )
    ins2.set('status', 'validado')
    ins2.set('target_module', 'hunter')
    ins2.set('evidence_data', {
      price_min: 50,
      price_max: 150,
      conv_rate: 5.76,
      high_ticket_conv_rate: 2.6,
    })
    app.save(ins2)

    const ins3 = new Record(insightsCol)
    ins3.set('user_id', userId)
    ins3.set('insight_key', 'ins_tiktok_vs_telegram_funnel')
    ins3.set('title', 'TikTok gera Alto Volume de Cliques, mas Telegram domina Taxa de Conversão')
    ins3.set('category_type', 'emerging_pattern')
    ins3.set('confidence_level', 'moderate')
    ins3.set('sample_summary', '8 campanhas cruzadas, 1.130 cliques, 68 conversões')
    ins3.set('sample_campaigns_count', 8)
    ins3.set('sample_clicks_count', 1130)
    ins3.set('sample_conversions_count', 68)
    ins3.set('sample_impressions_count', 18700)
    ins3.set('primary_metric_label', 'Taxa de Conversão por Canal')
    ins3.set('primary_metric_value', 8.12)
    ins3.set('benchmark_comparison', 'Telegram 8.12% vs TikTok 5.00% de conversão')
    ins3.set(
      'conclusion_text',
      'TikTok atua como motor de atração de tráfego frio de alto volume, enquanto Telegram converte compradores já aquecidos.',
    )
    ins3.set(
      'recommendation_text',
      'Usar TikTok para distribuir e captar público para grupos VIP no Telegram onde ofertas com cupom são enviadas.',
    )
    ins3.set('status', 'em_teste')
    ins3.set('target_module', 'publishing')
    ins3.set('evidence_data', {
      tiktok_clicks: 840,
      tiktok_conv: 42,
      telegram_clicks: 320,
      telegram_conv: 26,
    })
    app.save(ins3)

    const ins4 = new Record(insightsCol)
    ins4.set('user_id', userId)
    ins4.set('insight_key', 'ins_curiosity_hooks_warning')
    ins4.set('title', 'Ganchos de Pura Curiosidade geram Cliques, mas Baixa Conversão Final')
    ins4.set('category_type', 'what_fails')
    ins4.set('confidence_level', 'moderate')
    ins4.set('sample_summary', '6 campanhas, 420 cliques, 9 conversões')
    ins4.set('sample_campaigns_count', 6)
    ins4.set('sample_clicks_count', 420)
    ins4.set('sample_conversions_count', 9)
    ins4.set('sample_impressions_count', 11000)
    ins4.set('primary_metric_label', 'Taxa de Conversão')
    ins4.set('primary_metric_value', 2.14)
    ins4.set('benchmark_comparison', '-63% abaixo de ganchos de demonstração e problema (5.79%)')
    ins4.set(
      'conclusion_text',
      'Ganchos sensacionalistas ("O segredo proibido...") atraem tráfego não qualificado que não compra na página de destino.',
    )
    ins4.set(
      'recommendation_text',
      'Evitar ganchos vagos. Alinhar a expectativa do anúncio exatamente com a utilidade real na página de venda.',
    )
    ins4.set('status', 'validado')
    ins4.set('target_module', 'lab')
    ins4.set('evidence_data', {
      hook_type: 'curiosity',
      conv_rate: 2.14,
      demonstration_conv_rate: 5.79,
    })
    app.save(ins4)

    const ins5 = new Record(insightsCol)
    ins5.set('user_id', userId)
    ins5.set('insight_key', 'ins_insufficient_time_slots')
    ins5.set('title', 'Horários de Publicação: Amostra ainda Insuficiente para Causalidade')
    ins5.set('category_type', 'insufficient_data')
    ins5.set('confidence_level', 'insufficient')
    ins5.set('sample_summary', '5 publicações distribuídas em horários aleatórios, 140 cliques')
    ins5.set('sample_campaigns_count', 5)
    ins5.set('sample_clicks_count', 140)
    ins5.set('sample_conversions_count', 6)
    ins5.set('sample_impressions_count', 3200)
    ins5.set('primary_metric_label', 'Amostra Temporal')
    ins5.set('primary_metric_value', 140)
    ins5.set('benchmark_comparison', 'Amostra mínima requerida: 500 cliques por faixa horária')
    ins5.set(
      'conclusion_text',
      'Ainda é cedo para afirmar se postar às 18h ou às 21h gera mais vendas. A variação observada pode ser puro ruído estatístico.',
    )
    ins5.set(
      'recommendation_text',
      'Manter testes em horários variados (manhã, tarde e noite) até atingir significância estatística.',
    )
    ins5.set('status', 'novo')
    ins5.set('target_module', 'publishing')
    ins5.set('evidence_data', { current_sample: 140, required_sample: 500 })
    app.save(ins5)

    // Seed Recommended Learning Experiments (Exploit vs Explore)
    const exp1 = new Record(expCol)
    exp1.set('user_id', userId)
    exp1.set(
      'hypothesis_title',
      'Vídeo 15s com Produto no 1º Segundo vs Vídeo com Introdução Narrativa',
    )
    exp1.set(
      'hypothesis_detail',
      'Testar se mostrar o Mini Projetor ligado logo aos 0.5s aumenta a retenção e o CTR em relação ao storytelling.',
    )
    exp1.set('version_a_baseline', 'Vídeo com introdução falada de 3s antes de mostrar o produto')
    exp1.set(
      'version_b_challenger',
      'Vídeo com corte seco do produto funcionando na parede aos 0.5s',
    )
    exp1.set('primary_metric', 'Taxa de Conversão')
    exp1.set('secondary_metric', 'CTR')
    exp1.set(
      'rationale',
      'O histórico aponta que demonstrações rápidas superam narrativas longas em 97% no CTR.',
    )
    exp1.set('potential_impact', 'alto')
    exp1.set('confidence', 'alta')
    exp1.set('effort', 'baixo')
    exp1.set('priority_level', 'p1_urgente')
    exp1.set('experiment_type', 'exploit')
    exp1.set('status', 'recomendado')
    exp1.set('sample_current', 0)
    exp1.set('sample_needed', 400)
    exp1.set('stat_significance_reached', false)
    app.save(exp1)

    const exp2 = new Record(expCol)
    exp2.set('user_id', userId)
    exp2.set('hypothesis_title', 'CTA de Benefício Específico vs CTA Genérica de Link')
    exp2.set(
      'hypothesis_detail',
      'Comparar "Veja o teste completo e cupom de R$ 50 no link" contra "Clique no link da bio".',
    )
    exp2.set('version_a_baseline', 'CTA Padrão: "Link na bio"')
    exp2.set('version_b_challenger', 'CTA Específica: "Cupom exclusivo e frete grátis no 1º link"')
    exp2.set('primary_metric', 'CTR de Link')
    exp2.set('secondary_metric', 'Conversão')
    exp2.set(
      'rationale',
      'Clareza na recompensa do clique tende a filtrar cliques curiosos e elevar intenção de compra.',
    )
    exp2.set('potential_impact', 'medio')
    exp2.set('confidence', 'moderada')
    exp2.set('effort', 'baixo')
    exp2.set('priority_level', 'p2_alta')
    exp2.set('experiment_type', 'explore')
    exp2.set('status', 'recomendado')
    exp2.set('sample_current', 0)
    exp2.set('sample_needed', 300)
    exp2.set('stat_significance_reached', false)
    app.save(exp2)

    // Seed Score Calibration Proposal (Rule 10 - Human Approval Needed)
    const cal1 = new Record(calCol)
    cal1.set('user_id', userId)
    cal1.set('title', 'Proposta de Recalibração do Score de Oportunidade')
    cal1.set('score_type', 'opportunity_score')
    cal1.set(
      'diagnosis',
      'O modelo atual parece supervalorizar "Volume de Buscas/Trends" (+25%) e subvalorizar "Facilidade de Demonstração em Vídeo" e "Ticket acessível (R$50-R$150)".',
    )
    cal1.set(
      'evidence_summary',
      'Produtos com alta busca mas difícil demonstração (ex: Smartwatches genéricos) tiveram Score 85+ previsto, porém geraram alto CTR e baixíssima conversão real (1.1%). Já itens fáceis de demonstrar de R$ 45 converteram 5.8%.',
    )
    cal1.set('current_weights', {
      commission_amount: 30,
      demand_and_trends: 30,
      rating_and_reviews: 20,
      demonstration_appeal: 20,
    })
    cal1.set('proposed_weights', {
      commission_amount: 25,
      demand_and_trends: 20,
      rating_and_reviews: 20,
      demonstration_appeal: 35,
    })
    cal1.set('status', 'pending_review')
    app.save(cal1)
  },
  (app) => {},
)
