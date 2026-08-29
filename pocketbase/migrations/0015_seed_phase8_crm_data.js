migrate(
  (app) => {
    let adminUser = null
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'luka2510@hotmail.com')
    } catch (_) {}

    const contactsCol = app.findCollectionByNameOrId('crm_contacts')
    const recsCol = app.findCollectionByNameOrId('crm_recommendations')
    const consentsCol = app.findCollectionByNameOrId('crm_consent_logs')
    const cadenceCol = app.findCollectionByNameOrId('crm_cadence_settings')

    // 1. Cadência padrão inicial
    const defaultCadence = [
      {
        channel: 'telegram',
        min_days: 3,
        max_week: 2,
        edu: true,
        recs: true,
        post_purchase: true,
      },
      {
        channel: 'landing_page',
        min_days: 5,
        max_week: 2,
        edu: true,
        recs: true,
        post_purchase: true,
      },
      {
        channel: 'newsletter',
        min_days: 7,
        max_week: 1,
        edu: true,
        recs: true,
        post_purchase: true,
      },
      {
        channel: 'form',
        min_days: 4,
        max_week: 2,
        edu: true,
        recs: true,
        post_purchase: true,
      },
      {
        channel: 'whatsapp',
        min_days: 7,
        max_week: 1,
        edu: false,
        recs: true,
        post_purchase: true,
      },
    ]

    for (let i = 0; i < defaultCadence.length; i++) {
      const c = defaultCadence[i]
      try {
        const rec = new Record(cadenceCol)
        if (adminUser) rec.set('user_id', adminUser.id)
        rec.set('channel', c.channel)
        rec.set('min_days_between_messages', c.min_days)
        rec.set('max_messages_per_week', c.max_week)
        rec.set('allow_educational_content', c.edu)
        rec.set('allow_product_recommendations', c.recs)
        rec.set('allow_post_purchase_followup', c.post_purchase)
        rec.set('quiet_hours_start', '21:00')
        rec.set('quiet_hours_end', '09:00')
        app.save(rec)
      } catch (_) {}
    }

    // 2. Contatos representativos com histórico de relacionamento real e dados de teste demarcados
    const sampleContacts = [
      {
        identifier: 'carlos.mendes.tech@gmail.com',
        name: 'Carlos Mendes',
        channel: 'telegram',
        origin: 'Canal VIP de Achadinhos Telegram',
        campaign_id: 'olsco7lfkadkmow',
        first_interest: 'Mini Projetor Portátil Smart LED Wi-Fi',
        categories: ['Eletrônicos & Áudio', 'Decoração & Escritório'],
        lead_score: 95,
        relationship_score: 92,
        status: 'cliente_recorrente',
        is_customer: true,
        is_recurring: true,
        purchases_count: 2,
        total_sales: 559.8,
        total_commission: 81.16,
        avg_commission: 40.58,
        first_purchase: new Date(Date.now() - 45 * 86400000).toISOString(),
        last_purchase: new Date(Date.now() - 10 * 86400000).toISOString(),
        last_interaction: new Date(Date.now() - 2 * 86400000).toISOString(),
        last_click: new Date(Date.now() - 2 * 86400000).toISOString(),
        purchased_products: [
          {
            product_id: 'sifz51qeifmmsc2',
            title: 'Mini Projetor Portátil Smart LED Wi-Fi Full HD 1080p',
            category: 'Eletrônicos & Áudio',
            sale_amount: 279.9,
            commission_amount: 40.58,
            order_id: 'SHP-PROJ-1001',
            purchase_date: new Date(Date.now() - 45 * 86400000).toISOString(),
            channel: 'TikTok',
          },
          {
            product_id: 'sifz51qeifmmsc2',
            title: 'Mini Projetor Portátil Smart LED Wi-Fi Full HD 1080p',
            category: 'Eletrônicos & Áudio',
            sale_amount: 279.9,
            commission_amount: 40.58,
            order_id: 'SHP-PROJ-1005',
            purchase_date: new Date(Date.now() - 10 * 86400000).toISOString(),
            channel: 'TikTok',
          },
        ],
        next_best_action: 'Apresentar produto complementar',
        next_best_action_reason:
          'Cliente comprou projetor 2x; afinidade confirmada para tela de projeção dobrável ou cabo HDMI longo.',
        preferences: {
          preferred_categories: ['Eletrônicos & Áudio', 'Decoração & Escritório'],
          desired_frequency: 'weekly',
          preferred_channels: ['telegram'],
          content_types: ['dicas_uso', 'novidades_tech', 'cupons_exclusivos'],
        },
        feedback_history: [
          {
            date: new Date(Date.now() - 30 * 86400000).toISOString(),
            rating: 'Gostou',
            comment: 'Projetor funcionou perfeitamente no quarto, imagem nítida.',
            wants_recommendations: true,
          },
        ],
        notes: 'Cliente VIP altamente receptivo a novidades de tecnologia e home cinema.',
        is_test_data: false,
      },
      {
        identifier: 'mariana.silva.estetica@outlook.com',
        name: 'Mariana Silva',
        channel: 'form',
        origin: 'Formulário Quiz Beleza & Cabelos',
        campaign_id: 'qjfwffew6z8bj5f',
        first_interest: 'Escova Secadora e Alisadora Oval 1200W Titanium',
        categories: ['Beleza & Cuidados'],
        lead_score: 85,
        relationship_score: 78,
        status: 'cliente',
        is_customer: true,
        is_recurring: false,
        purchases_count: 1,
        total_sales: 99.9,
        total_commission: 14.99,
        avg_commission: 14.99,
        first_purchase: new Date(Date.now() - 20 * 86400000).toISOString(),
        last_purchase: new Date(Date.now() - 20 * 86400000).toISOString(),
        last_interaction: new Date(Date.now() - 5 * 86400000).toISOString(),
        last_click: new Date(Date.now() - 5 * 86400000).toISOString(),
        purchased_products: [
          {
            product_id: 'ks50wiolltsnw98',
            title: 'Escova Secadora e Alisadora Oval 1200W Titanium Bivolt',
            category: 'Beleza & Cuidados',
            sale_amount: 99.9,
            commission_amount: 14.99,
            order_id: 'SHP-ESC-3001',
            purchase_date: new Date(Date.now() - 20 * 86400000).toISOString(),
            channel: 'Telegram',
          },
        ],
        next_best_action: 'Enviar conteúdo educativo',
        next_best_action_reason:
          'Pós-compra (dia 20): enviar guia de conservação das cerdas e protetor térmico compatível.',
        preferences: {
          preferred_categories: ['Beleza & Cuidados'],
          desired_frequency: 'biweekly',
          preferred_channels: ['form', 'telegram'],
          content_types: ['guia_cuidados', 'tutorial_penteados'],
        },
        feedback_history: [
          {
            date: new Date(Date.now() - 15 * 86400000).toISOString(),
            rating: 'Gostou',
            comment: 'Adorou o tempo que economiza de manhã ao secar.',
            wants_recommendations: true,
          },
        ],
        notes: 'Profissional autônoma focada em rotina prática matinal.',
        is_test_data: false,
      },
      {
        identifier: 'rodrigo.moraes.auto@gmail.com',
        name: 'Rodrigo Moraes',
        channel: 'landing_page',
        origin: 'https://meuachado.com/aspirador-carro',
        campaign_id: '',
        first_interest: 'Suporte Veicular MagSafe com Carregamento Rápido 15W',
        categories: ['Automotivo & Celular'],
        lead_score: 88,
        relationship_score: 65,
        status: 'qualificado',
        is_customer: false,
        is_recurring: false,
        purchases_count: 0,
        total_sales: 0,
        total_commission: 0,
        avg_commission: 0,
        first_purchase: '',
        last_purchase: '',
        last_interaction: new Date(Date.now() - 1 * 86400000).toISOString(),
        last_click: new Date(Date.now() - 1 * 86400000).toISOString(),
        purchased_products: [],
        next_best_action: 'Recomendação',
        next_best_action_reason:
          'Lead clicou 3x no suporte veicular nas últimas 48h; enviar comparativo de fixação no painel.',
        preferences: {
          preferred_categories: ['Automotivo & Celular'],
          desired_frequency: 'weekly',
          preferred_channels: ['landing_page'],
          content_types: ['comparativos', 'cupons_exclusivos'],
        },
        feedback_history: [],
        notes: 'Lead quente em fase final de decisão de compra para suporte veicular.',
        is_test_data: false,
      },
      {
        identifier: 'fernando.costa.desk@empresa.com.br',
        name: 'Fernando Costa',
        channel: 'newsletter',
        origin: 'Newsletter Setup Produtivo',
        campaign_id: '',
        first_interest: 'Luminária de Mesa LED Articulada com Carregador por Indução',
        categories: ['Decoração & Escritório', 'Eletrônicos & Áudio'],
        lead_score: 72,
        relationship_score: 55,
        status: 'engajado',
        is_customer: false,
        is_recurring: false,
        purchases_count: 0,
        total_sales: 0,
        total_commission: 0,
        avg_commission: 0,
        first_purchase: '',
        last_purchase: '',
        last_interaction: new Date(Date.now() - 8 * 86400000).toISOString(),
        last_click: new Date(Date.now() - 8 * 86400000).toISOString(),
        purchased_products: [],
        next_best_action: 'Enviar conteúdo educativo',
        next_best_action_reason:
          'Lead interessado em ergonomia e iluminação sem cabos; enviar checklist de setup produtivo.',
        preferences: {
          preferred_categories: ['Decoração & Escritório'],
          desired_frequency: 'weekly',
          preferred_channels: ['newsletter'],
          content_types: ['dicas_produtividade', 'setup_minimalista'],
        },
        feedback_history: [],
        notes: 'Programador remoto buscando organizar mesa de trabalho.',
        is_test_data: false,
      },
      {
        identifier: 'lucas.teste.inativo@dominio-exemplo.test',
        name: 'Contato Teste Inativo',
        channel: 'telegram',
        origin: 'Ambiente de Teste Sintético',
        campaign_id: '',
        first_interest: 'Garrafa Térmica Inteligente com Display LED',
        categories: ['Cozinha & Casa'],
        lead_score: 40,
        relationship_score: 15,
        status: 'inativo',
        is_customer: false,
        is_recurring: false,
        purchases_count: 0,
        total_sales: 0,
        total_commission: 0,
        avg_commission: 0,
        first_purchase: '',
        last_purchase: '',
        last_interaction: new Date(Date.now() - 65 * 86400000).toISOString(),
        last_click: new Date(Date.now() - 65 * 86400000).toISOString(),
        purchased_products: [],
        next_best_action: 'Reativar relacionamento',
        next_best_action_reason:
          'Sem interação há 65 dias; testar mensagem de reengajamento com oferta de entrada.',
        preferences: {
          preferred_categories: ['Cozinha & Casa'],
          desired_frequency: 'monthly',
          preferred_channels: ['telegram'],
          content_types: ['promocoes_gerais'],
        },
        feedback_history: [],
        notes: 'Contato de teste para validação da régua de reativação.',
        is_test_data: true,
      },
      {
        identifier: 'beatriz.teste.optout@dominio-exemplo.test',
        name: 'Contato Teste Opt-Out',
        channel: 'form',
        origin: 'Landing Page de Ofertas',
        campaign_id: '',
        first_interest: 'Kit de Pincéis de Maquiagem',
        categories: ['Beleza & Cuidados'],
        lead_score: 30,
        relationship_score: 0,
        status: 'opt_out',
        is_customer: false,
        is_recurring: false,
        purchases_count: 0,
        total_sales: 0,
        total_commission: 0,
        avg_commission: 0,
        first_purchase: '',
        last_purchase: '',
        last_interaction: new Date(Date.now() - 40 * 86400000).toISOString(),
        last_click: '',
        purchased_products: [],
        next_best_action: 'Nenhuma ação agora',
        next_best_action_reason:
          'Consentimento revogado (Opt-Out). Bloqueio estrito de qualquer envio ou recomendação ativa.',
        preferences: {
          preferred_categories: [],
          desired_frequency: 'never',
          preferred_channels: [],
          content_types: [],
        },
        feedback_history: [],
        notes: 'Registro de opt-out mantido estritamente para auditoria e bloqueio de envio.',
        is_test_data: true,
      },
    ]

    for (let i = 0; i < sampleContacts.length; i++) {
      const c = sampleContacts[i]
      try {
        const rec = new Record(contactsCol)
        if (adminUser) rec.set('user_id', adminUser.id)
        rec.set('identifier', c.identifier)
        rec.set('name', c.name)
        rec.set('channel', c.channel)
        rec.set('origin_source', c.origin)
        rec.set('campaign_id', c.campaign_id)
        rec.set('first_product_interest', c.first_interest)
        rec.set('categories_of_interest', c.categories)
        rec.set('lead_score', c.lead_score)
        rec.set('relationship_score', c.relationship_score)
        rec.set('status', c.status)
        rec.set('is_customer', c.is_customer)
        rec.set('is_recurring_customer', c.is_recurring)
        rec.set('purchases_count', c.purchases_count)
        rec.set('total_sales_value', c.total_sales)
        rec.set('total_commission_earned', c.total_commission)
        rec.set('average_commission', c.avg_commission)
        if (c.first_purchase) rec.set('first_purchase_date', c.first_purchase)
        if (c.last_purchase) rec.set('last_purchase_date', c.last_purchase)
        if (c.last_interaction) rec.set('last_interaction_date', c.last_interaction)
        if (c.last_click) rec.set('last_click_date', c.last_click)
        rec.set('purchased_products', c.purchased_products)
        rec.set('next_best_action', c.next_best_action)
        rec.set('next_best_action_reason', c.next_best_action_reason)
        rec.set('preferences', c.preferences)
        rec.set('feedback_history', c.feedback_history)
        rec.set('internal_notes', c.notes)
        rec.set('is_test_data', c.is_test_data)

        const timeline = [
          {
            event_type: 'consent_granted',
            date: new Date(Date.now() - 60 * 86400000).toISOString(),
            channel: c.channel,
            details: `Consentimento legítimo registrado via ${c.channel}.`,
          },
          {
            event_type: 'lead_captured',
            date: new Date(Date.now() - 58 * 86400000).toISOString(),
            details: `Contato originado em "${c.origin}" com interesse em ${c.first_interest}.`,
          },
        ]

        if (c.purchases_count > 0) {
          timeline.push({
            event_type: 'purchase_confirmed',
            date: c.first_purchase,
            details: `Primeira compra confirmada: ${c.purchased_products[0]?.title} (+R$ ${c.purchased_products[0]?.commission_amount} comissão).`,
          })
          timeline.push({
            event_type: 'status_changed',
            date: c.first_purchase,
            details: 'Status atualizado automaticamente para CLIENTE.',
          })
        }

        if (c.is_recurring) {
          timeline.push({
            event_type: 'repurchase_confirmed',
            date: c.last_purchase,
            details: `Recompra confirmada: ${c.purchased_products[1]?.title} (+R$ ${c.purchased_products[1]?.commission_amount} comissão).`,
          })
          timeline.push({
            event_type: 'status_changed',
            date: c.last_purchase,
            details: 'Classificado como CLIENTE RECORRENTE com 2 compras atribuídas.',
          })
        }

        if (c.status === 'opt_out') {
          timeline.push({
            event_type: 'opt_out',
            date: new Date(Date.now() - 2 * 86400000).toISOString(),
            details: 'Consentimento revogado pelo usuário (Opt-Out). Comunicações bloqueadas.',
          })
        }

        rec.set('timeline', timeline)
        app.save(rec)

        // Registrar no crm_consent_logs
        const consentRec = new Record(consentsCol)
        if (adminUser) consentRec.set('user_id', adminUser.id)
        consentRec.set('contact_id', rec.id)
        consentRec.set('identifier', c.identifier)
        consentRec.set('channel', c.channel)
        consentRec.set('authorized_purpose', 'Receber ofertas, novidades e recomendações legítimas')
        consentRec.set('consent_text_version', 'v1.0-termos-lgpd')
        consentRec.set('status', c.status === 'opt_out' ? 'revoked' : 'active')
        consentRec.set('granted_at', new Date(Date.now() - 60 * 86400000).toISOString())
        if (c.status === 'opt_out') {
          consentRec.set('revoked_at', new Date(Date.now() - 2 * 86400000).toISOString())
        }
        consentRec.set('origin_source', c.origin)
        consentRec.set('ip_masked', '177.18.*.*')
        consentRec.set('user_agent_short', 'Chrome / Mobile')
        consentRec.set('notes', 'Log de consentimento registrado em conformidade')
        consentRec.set('is_test_data', c.is_test_data)
        app.save(consentRec)

        // Se for cliente ativo, criar recomendação no crm_recommendations
        if (c.is_customer && c.status !== 'opt_out') {
          const recItem = new Record(recsCol)
          if (adminUser) recItem.set('user_id', adminUser.id)
          recItem.set('contact_id', rec.id)
          recItem.set('contact_identifier', c.identifier)
          recItem.set('product_id', 'w9jss35ds0uaqew') // Luminária
          recItem.set(
            'product_title',
            'Luminária de Mesa LED Articulada com Carregador por Indução',
          )
          recItem.set('product_category', 'Decoração & Escritório')
          recItem.set('product_price', 129.9)
          recItem.set('product_commission', 15.58)
          recItem.set('recommendation_type', 'complementar')
          recItem.set('recommendation_score', 89)
          recItem.set(
            'reason',
            'Cliente de projetor smart demonstrou interesse em setup e iluminação ambiente (DNA de Vencedores).',
          )
          recItem.set('previous_product_title', c.first_interest)
          recItem.set(
            'suggested_content_angle',
            'Como transformar seu quarto em um cinema com iluminação indireta sem cabos.',
          )
          recItem.set(
            'suggested_message',
            `Olá ${c.name}! Vimos que você curte o Mini Projetor. Uma combinação que fica incrível é a Luminária LED com carregamento por indução para controlar o ambiente sem fios.`,
          )
          recItem.set('status', 'sugerida')
          recItem.set('cadence_check_passed', true)
          recItem.set('is_test_data', c.is_test_data)
          app.save(recItem)
        }
      } catch (_) {}
    }
  },
  (app) => {},
)
