migrate(
  (app) => {
    // Define/upsert the agent under slug 'analista-radar' as specified in prompt
    $ai.agents.define(app, {
      slug: 'analista-radar',
      name: 'Analista de Radar IA',
      description:
        'Analista de mercado de e-commerce e afiliados com acesso à base de produtos e inteligência de conversão.',
      systemPrompt:
        'Você é o Analista do Radar de Produtos IA, um especialista sênior em e-commerce e marketing de afiliados no Brasil. Sua missão é avaliar dados reais de produtos (preço, preço promocional, comissão %, comissão R$, vendas, avaliações, nota do vendedor, concorrência, procura e tendência) e responder com precisão estratégica sobre viabilidade comercial, público-alvo, benefícios, objeções de compra e táticas de tráfego/conteúdo (TikTok, Reels, Google, Shopee Ads). Seja profissional, analítico, objetivo e direto em português do Brasil (pt-BR).',
      tier: 'fast',
      tools: [
        {
          collection: 'products',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'ai_insights',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ],
      memory: [
        {
          type: 'text',
          payload: {
            text: 'Metodologia dos 9 Fatores do Radar de Produtos IA:\n1. Lucratividade de Comissão (Retorno real em R$)\n2. Preço e Ticket Promocional (Atratividade vs Barreira de compra)\n3. Volume de Vendas Validadas no Mercado\n4. Qualidade de Avaliação e Nota do Vendedor (> 4.3 ideal)\n5. Demanda do Nicho e Volume de Buscas\n6. Nível de Concorrência e Saturação\n7. Tendência e Crescimento de Interesse\n8. Potencial de Conteúdo Viral (Vídeos Curtos / Reels / TikTok)\n9. Facilidade de Conversão e Baixa Devolução.',
          },
        },
      ],
    })

    // Also seed additional sample products to reach 10 diverse products for high/good/test/low UI levels
    const productsCol = app.findCollectionByNameOrId('products')

    const extraProducts = [
      {
        title: 'Escova Secadora e Alisadora Oval 1200W Titanium Bivolt',
        image_url: 'https://img.usecurling.com/p/600/600?q=hair+dryer+brush',
        platform: 'Shopee',
        category: 'Beleza & Cuidados',
        niche: 'Cabelos & Estética',
        price: 139.9,
        promo_price: 99.9,
        commission_rate: 15.0,
        commission_amount: 14.99,
        sales_count: 8900,
        reviews_count: 3200,
        rating: 4.7,
        seller: 'Beleza Prime Brasil',
        product_url: 'https://shopee.com.br/escova-secadora-titanium',
        affiliate_url: 'https://shopee.com.br/afiliado/escova-titanium',
        competition_level: 6,
        trends_score: 9,
        demand_score: 9,
        opportunity_score: 86,
        opportunity_level: 'hot',
        ai_summary:
          '🔥 Produto campeão de busca feminina. Demonstrações em vídeo têm taxa de retenção altíssima com comissão de R$ 14,99.',
        ai_analysis:
          '1) Por que vale a pena vender: Apelo de antes/depois instantâneo para tráfego orgânico no Instagram e TikTok.\n2) Quem provavelmente compraria: Mulheres de 20 a 45 anos que desejam praticidade para secar e modelar o cabelo em casa.\n3) Principal benefício: Seca, alisa e dá volume simultaneamente com tecnologia cerâmica protetora.\n4) Possível dificuldade: Diversas marcas similares competindo, exige criativos demonstrando durabilidade.\n5) Potencial de conversão: Altíssimo em formato de vídeo acelerado (30 segundos mostrando o resultado no cabelo).',
        source: 'manual',
        metadata: { voltage: 'Bivolt', power: '1200W' },
      },
      {
        title: 'Suporte Veicular MagSafe com Carregamento Rápido 15W por Indução',
        image_url: 'https://img.usecurling.com/p/600/600?q=car+phone+mount',
        platform: 'Amazon',
        category: 'Automotivo & Celular',
        niche: 'Acessórios Veiculares',
        price: 119.0,
        promo_price: 89.9,
        commission_rate: 13.0,
        commission_amount: 11.69,
        sales_count: 2150,
        reviews_count: 480,
        rating: 4.6,
        seller: 'AutoTech Soluções',
        product_url: 'https://amazon.com.br/dp/B0CXMAG15W',
        affiliate_url: 'https://amzn.to/3magsafe-car-mount',
        competition_level: 4,
        trends_score: 8,
        demand_score: 8,
        opportunity_score: 78,
        opportunity_level: 'good',
        ai_summary:
          '🟢 Forte demanda entre motoristas de aplicativo e proprietários de iPhone buscando praticidade no painel.',
        ai_analysis:
          '1) Por que vale a pena vender: Solução premium que substitui suportes mecânicos que quebram com facilidade.\n2) Quem provavelmente compraria: Motoristas de aplicativo, viajantes e usuários de iPhone 12 ao 16.\n3) Principal benefício: Fixação magnética ultra forte que não cai em buracos + carregamento rápido sem fios pendurados.\n4) Possível dificuldade: Restrito a aparelhos compatíveis com anel magnético/MagSafe.\n5) Potencial de conversão: Alto com vídeos curtos gravados dentro do carro mostrando a trava magnética e o app de GPS ligando.',
        source: 'manual',
        metadata: { magsafe_compatible: true, fast_charge: '15W' },
      },
      {
        title: 'Mini Processador de Alimentos Elétrico USB Portátil 250ml',
        image_url: 'https://img.usecurling.com/p/600/600?q=mini+food+processor',
        platform: 'Mercado Livre',
        category: 'Cozinha & Casa',
        niche: 'Utensílios Práticos',
        price: 45.9,
        promo_price: 34.9,
        commission_rate: 16.0,
        commission_amount: 5.58,
        sales_count: 14200,
        reviews_count: 4100,
        rating: 4.4,
        seller: 'Utilidades Casa Fácil',
        product_url: 'https://mercadolivre.com.br/mini-processador-alho',
        affiliate_url: 'https://mercadolivre.com.br/afiliado/processador-alho',
        competition_level: 7,
        trends_score: 7,
        demand_score: 8,
        opportunity_score: 64,
        opportunity_level: 'good',
        ai_summary:
          "🟢 Campeão de volume e compra por impulso ('achadinho de cozinha'). Fácil de divulgar em grupos de WhatsApp e canais de promoções.",
        ai_analysis:
          "1) Por que vale a pena vender: Extremamente fácil de demonstrar o benefício (triturar alho/cebola sem cheiro nas mãos em 5s).\n2) Quem provavelmente compraria: Donas e donos de casa, cozinheiros casuais e quem mora sozinho.\n3) Principal benefício: Tritura temperos em segundos sem precisar de tomada ou lavar liquidificador grande.\n4) Possível dificuldade: Comissão unitária de R$ 5,58 exige volume alto para faturamento significativo.\n5) Potencial de conversão: Muito alto em canais de cupons e reels de 'Achados da Shopee / Mercado Livre'.",
        source: 'manual',
        metadata: { blades_count: 3, capacity_ml: 250 },
      },
      {
        title: 'Microfone Lapela Sem Fio Duplo Plug & Play Tipo-C / Lightning',
        image_url: 'https://img.usecurling.com/p/600/600?q=wireless+lavalier+mic',
        platform: 'TikTok Shop',
        category: 'Eletrônicos & Áudio',
        niche: 'Criação de Conteúdo',
        price: 99.0,
        promo_price: 69.9,
        commission_rate: 15.0,
        commission_amount: 10.49,
        sales_count: 4300,
        reviews_count: 920,
        rating: 4.3,
        seller: 'CreatorGear Brasil',
        product_url: 'https://tiktok.com/@creatorgear/lapela-duplo',
        affiliate_url: 'https://vt.tiktok.com/ZS_lapela_duplo',
        competition_level: 6,
        trends_score: 8,
        demand_score: 7,
        opportunity_score: 72,
        opportunity_level: 'good',
        ai_summary:
          '🟢 Nicho aquecido de criadores iniciantes e influenciadores buscando melhorar a qualidade do áudio com baixo custo.',
        ai_analysis:
          '1) Por que vale a pena vender: O mercado de criadores de conteúdo está explodindo e o áudio é a principal barreira técnica.\n2) Quem provavelmente compraria: Influenciadores iniciantes, professores online, corretores e tiktokers.\n3) Principal benefício: Captação limpa com cancelamento de ruído sem fios e emparelhamento instantâneo.\n4) Possível dificuldade: Conectores específicos (alguns modelos necessitam de adaptador OTG).\n5) Potencial de conversão: Excelente usando áudio gravado com e sem o microfone em ambientes com vento ou trânsito.',
        source: 'manual',
        metadata: { dual_mic: true, noise_reduction: true },
      },
      {
        title: 'Smartwatch Fitness Tracker Ultra Relógio Inteligente com Chamadas',
        image_url: 'https://img.usecurling.com/p/600/600?q=smartwatch+fitness',
        platform: 'Shopee',
        category: 'Eletrônicos & Áudio',
        niche: 'Wearables & Saúde',
        price: 129.9,
        promo_price: 89.9,
        commission_rate: 11.0,
        commission_amount: 9.89,
        sales_count: 1200,
        reviews_count: 210,
        rating: 3.9,
        seller: 'Global Smart Store',
        product_url: 'https://shopee.com.br/smartwatch-ultra-chamadas',
        affiliate_url: 'https://shopee.com.br/afiliado/smartwatch-ultra',
        competition_level: 9,
        trends_score: 6,
        demand_score: 7,
        opportunity_score: 48,
        opportunity_level: 'test',
        ai_summary:
          '🟡 Concorrência brutal e nota abaixo de 4.0 (3.9) geram devoluções frequentes por expectativa não atendida.',
        ai_analysis:
          '1) Por que vale a pena testar com cautela: O design clone atrai muito clique de curiosos.\n2) Quem compraria: Jovens que buscam a estética de relógio premium por menos de R$ 100.\n3) Principal benefício: Notificações do celular, monitor cardíaco e design moderno no pulso.\n4) Possível dificuldade: Bateria dura pouco e app com bugs ocasionais geram notas baixas e devoluções.\n5) Potencial de conversão: Médio. Recomendável alinhar expectativas no anúncio para não frustrar o cliente.',
        source: 'manual',
        metadata: { water_resistant: 'IP67' },
      },
    ]

    extraProducts.forEach((prod) => {
      try {
        app.findFirstRecordByData('products', 'title', prod.title)
      } catch (_) {
        const rec = new Record(productsCol)
        for (const [key, val] of Object.entries(prod)) {
          rec.set(key, val)
        }
        app.save(rec)
      }
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'analista-radar')
    } catch (_) {}
  },
)
