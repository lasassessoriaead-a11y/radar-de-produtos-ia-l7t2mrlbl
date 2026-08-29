migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let adminUser = null
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'luka2510@hotmail.com')
    } catch (_) {}

    const signalsCol = app.findCollectionByNameOrId('audience_signals')
    const oppsCol = app.findCollectionByNameOrId('audience_opportunities')
    const termsCol = app.findCollectionByNameOrId('audience_terms_bank')
    const leadsCol = app.findCollectionByNameOrId('inbound_leads')

    // 1. Seed Termos de Intenção
    const sampleTerms = [
      {
        term: 'qual aspirador portátil comprar para carro',
        type: 'buying_intent',
        stage: 'high',
        reason: 'Busca por recomendação direta de produto com intenção iminente.',
        cat: 'Automotivo',
      },
      {
        term: 'melhor aspirador automotivo custo benefício',
        type: 'comparison',
        stage: 'high',
        reason: 'Comparação para decisão de compra.',
        cat: 'Automotivo',
      },
      {
        term: 'como tirar pelos de cachorro do banco do carro',
        type: 'problem',
        stage: 'medium',
        reason: 'Dor específica buscando método ou equipamento.',
        cat: 'Automotivo',
      },
      {
        term: 'mini aspirador sem fio potente',
        type: 'solution',
        stage: 'high',
        reason: 'Busca por especificação de solução.',
        cat: 'Automotivo',
      },
      {
        term: 'aspirador portátil a bateria vale a pena',
        type: 'recommendation',
        stage: 'high',
        reason: 'Validação final de qualidade.',
        cat: 'Automotivo',
      },
      {
        term: 'bateria do aspirador de carro dura quanto',
        type: 'objection',
        stage: 'medium',
        reason: 'Dúvida técnica de autonomia.',
        cat: 'Automotivo',
      },
      {
        term: 'dicas para manter estofado limpo',
        type: 'usage_context',
        stage: 'low',
        reason: 'Conteúdo genérico informativo.',
        cat: 'Automotivo',
      },
      {
        term: 'escova secadora titanium é boa',
        type: 'recommendation',
        stage: 'high',
        reason: 'Interesse de compra e avaliação.',
        cat: 'Beleza & Cabelos',
      },
      {
        term: 'como alisar cabelo curto rápido',
        type: 'problem',
        stage: 'medium',
        reason: 'Problema diário procurando solução.',
        cat: 'Beleza & Cabelos',
      },
      {
        term: 'mini projetor led para quarto vale a pena',
        type: 'recommendation',
        stage: 'high',
        reason: 'Validação pré-compra de eletrônico.',
        cat: 'Tecnologia',
      },
    ]

    for (let i = 0; i < sampleTerms.length; i++) {
      const t = sampleTerms[i]
      try {
        const rec = new Record(termsCol)
        if (adminUser) rec.set('user_id', adminUser.id)
        rec.set('term', t.term)
        rec.set('term_type', t.type)
        rec.set('intent_stage', t.stage)
        rec.set('stage_reason', t.reason)
        rec.set('category', t.cat)
        rec.set('signal_count', Math.floor(Math.random() * 40) + 10)
        rec.set('trend_status', i % 2 === 0 ? 'growing' : 'stable')
        rec.set('is_active', true)
        rec.set('last_queried_at', new Date().toISOString())
        app.save(rec)
      } catch (_) {}
    }

    // 2. Seed Sinais Públicos do Reddit
    const sampleSignals = [
      {
        ext_id: 'reddit_post_car_1',
        title:
          'Alguém tem recomendação de aspirador portátil para carro que realmente puxe areia e pelos?',
        snippet:
          'Comprei um de 30 reais na feira e não puxava nem poeira. Quero algo prático sem fio que caiba no porta-luvas e tenha boa sucção para limpar o banco depois que levo meu golden.',
        community: 'r/carros',
        url: 'https://www.reddit.com/r/carros/comments/sample_1',
        author: 'u/pedro_motor',
        cat: 'Automotivo',
        intent_score: 94,
        intent_level: 'high',
        intent_reason:
          'Pergunta direta de recomendação para compra imediata após experiência ruim.',
        relevance_score: 96,
        relevance_reason: 'Encaixe perfeito com aspirador portátil 120W sem fio com bico escova.',
        classification: 'content_opportunity',
        match_exp:
          'Match: 96/100 — O usuário busca exatamente sucção forte para areia e pelos de animais em formato portátil.',
        opp: 'Vídeo TikTok/Reels: "Testando se aspirador portátil aguenta puxar pelos de cachorro no carpete".',
        reply:
          'Olá! Para pelos em estofado, o segredo é pegar modelos com bico escova e pelo menos 8000Pa de sucção. Os modelos recarregáveis USB-C atuais dão conta em 10 minutos sem descarregar.',
        q: 'Qual aspirador portátil tem força real para pelos de cachorro?',
        obj: 'Medo de comprar produto fraco que não puxa areia',
        des: 'Limpar o carro rápido sem precisar de extensão ou lava-rápido',
      },
      {
        ext_id: 'reddit_post_car_2',
        title: 'Qual a melhor forma de tirar areia do carpete do carro sem gastar no lava rápido?',
        snippet:
          'Vou muito à praia nos finais de semana e o assoalho fica cheio de areia fina. Queria dicas de ferramentas práticas e acessíveis para resolver em 5 minutos.',
        community: 'r/brasil',
        url: 'https://www.reddit.com/r/brasil/comments/sample_2',
        author: 'u/marcos_praia',
        cat: 'Automotivo',
        intent_score: 82,
        intent_level: 'high',
        intent_reason: 'Problema recorrente com busca ativa por ferramenta acessível.',
        relevance_score: 90,
        relevance_reason:
          'Aspirador automotivo com bico fino resolve a areia acumulada no carpete.',
        classification: 'potential_interaction',
        match_exp: 'Match: 90/100 — Demanda por economia e agilidade ao limpar areia do carro.',
        opp: 'Criar anúncio focado no ângulo "Economize R$ 200 por mês em estética automotiva".',
        reply:
          'Uma dica que funciona muito: passe uma escova de cerdas médias para soltar a areia do tecido e use um mini aspirador com bico concentrador direto no trilho.',
        q: 'Como tirar areia do carpete rápido?',
        obj: 'Custo de lava-rápido frequente',
        des: 'Manter o carro limpo sozinho gastando pouco',
      },
      {
        ext_id: 'reddit_post_beauty_1',
        title: 'Escova secadora realmente substitui secador e chapinha ou estraga as pontas?',
        snippet:
          'Tenho muito cabelo e demoro 40 minutos para secar de manhã. Vale a pena investir numa escova com revestimento de titânio para o dia a dia?',
        community: 'r/conversas',
        url: 'https://www.reddit.com/r/conversas/comments/sample_3',
        author: 'u/julia_hair',
        cat: 'Beleza & Cabelos',
        intent_score: 91,
        intent_level: 'high',
        intent_reason: 'Dúvida comparativa em momento de decisão de compra.',
        relevance_score: 94,
        relevance_reason: 'Produto corresponde exatamente à Escova Titanium 3 em 1 do catálogo.',
        classification: 'content_opportunity',
        match_exp:
          'Match: 94/100 — Usuária busca economizar tempo matinal sem danificar as pontas do cabelo.',
        opp: 'Roteiro de 30s mostrando a rotina matinal: de 40min para 12min.',
        reply:
          'Para cabelos volumosos, os modelos ovais com cerdas mistas e controle de temperatura reduzem pela metade o tempo sem queimar os fios se usar protetor térmico antes.',
        q: 'Escova secadora substitui secador comum?',
        obj: 'Medo de ressecar ou quebrar as pontas',
        des: 'Arrumar o cabelo em menos de 15 minutos',
      },
    ]

    for (let i = 0; i < sampleSignals.length; i++) {
      const s = sampleSignals[i]
      try {
        const sigRec = new Record(signalsCol)
        if (adminUser) sigRec.set('user_id', adminUser.id)
        sigRec.set('external_id', s.ext_id)
        sigRec.set('source', 'reddit')
        sigRec.set('source_url', s.url)
        sigRec.set('title', s.title)
        sigRec.set('snippet', s.snippet)
        sigRec.set('author_display', s.author)
        sigRec.set('community', s.community)
        sigRec.set('published_at', new Date(Date.now() - 86400000 * (i + 1)).toISOString())
        sigRec.set('matched_keyword', s.cat)
        sigRec.set('category', s.cat)
        sigRec.set('intent_level', s.intent_level)
        sigRec.set('intent_score', s.intent_score)
        sigRec.set('intent_reason', s.intent_reason)
        sigRec.set('relevance_score', s.relevance_score)
        sigRec.set('relevance_reason', s.relevance_reason)
        sigRec.set('signal_classification', s.classification)
        sigRec.set('match_explanation', s.match_exp)
        sigRec.set('suggested_opportunity', s.opp)
        sigRec.set('suggested_reply', s.reply)
        sigRec.set('question_detected', s.q)
        sigRec.set('objection_detected', s.obj)
        sigRec.set('desire_detected', s.des)
        sigRec.set('raw_metadata', { upvotes: 45 + i * 20, comments_count: 15 + i * 5 })
        app.save(sigRec)

        // Criar Oportunidade
        const oppRec = new Record(oppsCol)
        if (adminUser) oppRec.set('user_id', adminUser.id)
        oppRec.set('title', s.title.slice(0, 80))
        oppRec.set('opportunity_type', 'question')
        oppRec.set('description', s.snippet)
        oppRec.set('action_suggested', 'create_content')
        oppRec.set('suggested_content_angle', s.opp)
        oppRec.set(
          'suggested_copy_hook',
          `Está cansado de perder tempo limpando o carro? Veja essa solução portátil!`,
        )
        oppRec.set('suggested_reply_text', s.reply)
        oppRec.set('source', 'reddit')
        oppRec.set('source_url', s.url)
        oppRec.set('community', s.community)
        oppRec.set('intent_score', s.intent_score)
        oppRec.set('relevance_score', s.relevance_score)
        oppRec.set('priority_level', 'hot')
        oppRec.set('status', 'new')
        oppRec.set('signal_id', sigRec.id)
        app.save(oppRec)
      } catch (_) {}
    }

    // 3. Seed Leads Inbound com Consentimento Rastreável
    const sampleLeads = [
      {
        identifier: 'rodrigo.moraes@gmail.com',
        name: 'Rodrigo Moraes',
        channel: 'landing_page',
        origin: 'https://meuachado.com/aspirador-carro',
        interest: 'Aspirador Portátil Automotivo 120W',
        intent: 'Solicitou aviso de cupom de 20% e frete grátis',
        score: 88,
        tier: 'hot',
        status: 'interested',
        consent_status: 'active',
        purpose: 'Receber ofertas e cupons de produtos automotivos',
        version: 'v1.0-termos-lgpd',
      },
      {
        identifier: 'mariana.silva@outlook.com',
        name: 'Mariana Silva',
        channel: 'form',
        origin: 'Formulário Quiz Beleza & Cabelos',
        interest: 'Escova Secadora Titanium 3 em 1',
        intent: 'Quer saber se funciona em cabelo crespo',
        score: 75,
        tier: 'interested',
        status: 'engaged',
        consent_status: 'active',
        purpose: 'Receber dicas de cuidados capilares e promoções',
        version: 'v1.0-termos-lgpd',
      },
      {
        identifier: '@carlos_tech_sp',
        name: 'Carlos Mendes',
        channel: 'telegram',
        origin: 'Canal VIP de Achadinhos Telegram',
        interest: 'Mini Projetor LED Portátil',
        intent: 'Entrou pelo link de pré-venda com cupom',
        score: 92,
        tier: 'hot',
        status: 'qualified',
        consent_status: 'active',
        purpose: 'Notificações de lançamentos de tecnologia e cupons',
        version: 'v1.0-termos-telegram',
      },
    ]

    for (let i = 0; i < sampleLeads.length; i++) {
      const l = sampleLeads[i]
      try {
        const leadRec = new Record(leadsCol)
        if (adminUser) leadRec.set('user_id', adminUser.id)
        leadRec.set('identifier', l.identifier)
        leadRec.set('name', l.name)
        leadRec.set('channel', l.channel)
        leadRec.set('origin_source', l.origin)
        leadRec.set('product_interest', l.interest)
        leadRec.set('declared_intent', l.intent)
        leadRec.set('lead_score', l.score)
        leadRec.set('score_tier', l.tier)
        leadRec.set('status', l.status)
        leadRec.set('consent_status', l.consent_status)
        leadRec.set('consent_date', new Date(Date.now() - 86400000 * (i + 2)).toISOString())
        leadRec.set('authorized_purpose', l.purpose)
        leadRec.set('consent_text_version', l.version)
        leadRec.set('clicks_count', 3 + i)
        leadRec.set('interactions_count', 2)
        leadRec.set('timeline', [
          {
            event_type: 'consent_granted',
            date: new Date(Date.now() - 86400000 * (i + 2)).toISOString(),
            details: `Consentimento ativo registrado (${l.version}) via ${l.channel}.`,
          },
          {
            event_type: 'lead_captured',
            date: new Date(Date.now() - 86400000 * (i + 2)).toISOString(),
            details: `Inbound registrado com interesse em ${l.interest}.`,
          },
        ])
        app.save(leadRec)
      } catch (_) {}
    }
  },
  (app) => {},
)
