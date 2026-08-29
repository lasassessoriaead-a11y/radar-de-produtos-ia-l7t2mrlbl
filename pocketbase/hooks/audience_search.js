// Backend Hook for Audience Search Provider Architecture & Analytics Engine
// FASE 7 - RADAR DE PÚBLICO & DEMANDA
// Arquitetura Modular:
// 1. Providers Registry (Reddit = 1º provedor, YouTube, Google Search, Fóruns/Outros preparados)
// 2. Coleta vs Análise estritamente separadas
// 3. Status 'pending_integration' (Integração pendente) enquanto não houver conexão externa real
// 4. Sem dados fictícios simulando conexão real. Suporte explícito a dados legítimos de teste identificados com 'is_test_data = true'.

// Endpoint 1: Obter Status e Metadados dos Provedores de Audiência
routerAdd(
  'GET',
  '/backend/v1/audience/providers',
  (e) => {
    const providers = [
      {
        id: 'reddit',
        name: 'Reddit',
        category: 'social_discussion',
        status: 'pending_integration',
        status_label: 'Integração pendente',
        is_primary: true,
        order: 1,
        description:
          'Primeiro Audience Source Provider. Adaptador e pipeline analítico estruturados para busca de discussões públicas, subreddits, comentários e intenção transacional.',
        supported_features: [
          'Busca por termo / produto',
          'Filtro por subreddit (ex: r/carros, r/brasil)',
          'Intent Score Engine',
          'Relevance Score Engine',
          'Match Engine Produto × Dor',
        ],
        required_credentials: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET', 'REDDIT_USER_AGENT'],
        is_configured: false,
      },
      {
        id: 'youtube',
        name: 'YouTube',
        category: 'video_search',
        status: 'pending_integration',
        status_label: 'Preparado na arquitetura (futuro)',
        is_primary: false,
        order: 2,
        description:
          'Provider preparado na arquitetura para captura de comentários públicos, dúvidas de reviews e tendências de busca em vídeo.',
        supported_features: [
          'Análise de comentários',
          'Dúvidas em reviews',
          'Transcrições públicas',
        ],
        required_credentials: ['YOUTUBE_API_KEY'],
        is_configured: false,
      },
      {
        id: 'google_search',
        name: 'Google Search & Trends',
        category: 'search_intent',
        status: 'pending_integration',
        status_label: 'Preparado na arquitetura (futuro)',
        is_primary: false,
        order: 3,
        description:
          'Provider preparado para termos de busca de alta intenção transacional, perguntas do Google "As pessoas também perguntam" e volumes de busca.',
        supported_features: ['People Also Ask', 'Search Autocomplete', 'Intenção transacional'],
        required_credentials: ['GOOGLE_SEARCH_API_KEY', 'GOOGLE_SEARCH_CX'],
        is_configured: false,
      },
      {
        id: 'forums_reviews',
        name: 'Fóruns & Reviews Públicos',
        category: 'community_reviews',
        status: 'pending_integration',
        status_label: 'Preparado na arquitetura (futuro)',
        is_primary: false,
        order: 4,
        description:
          'Provider preparado para agregação de avaliações públicas, queixas e discussões abertas em fóruns de nicho.',
        supported_features: ['Mapeamento de objeções', 'Dor de consumo recorrente'],
        required_credentials: [],
        is_configured: false,
      },
    ]

    return e.json(200, {
      success: true,
      providers,
    })
  },
  $apis.requireAuth(),
)

// Endpoint 2: Busca / Consulta de Provedor de Audiência
routerAdd(
  'POST',
  '/backend/v1/audience/search',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const query = (body.query || '').trim()
    const productTitle = (body.product_title || '').trim()
    const productId = (body.product_id || '').trim()
    const category = (body.category || 'Geral').trim()
    const provider = (body.provider || 'reddit').trim().toLowerCase()
    const subreddit = (body.subreddit || '').trim()

    if (!query && !productTitle) {
      return e.badRequestError('Informe um termo de busca ou produto.')
    }

    const searchTerm = query || productTitle

    // CAMADA 1: ADAPTER DE COLETA (REDDIT & PROVIDERS FUTUROS)
    // Reddit é o 1º Audience Source Provider.
    // Enquanto a conexão externa ao Reddit oficial não estiver configurada com credenciais no ambiente,
    // o status é "Integração pendente". NÃO inventamos dados fictícios nem posts simulados como se fossem reais.
    if (provider === 'reddit') {
      return e.json(200, {
        success: true,
        provider: 'reddit',
        provider_name: 'Reddit',
        status: 'pending_integration',
        status_label: 'Integração pendente',
        is_connected: false,
        message:
          'O provider Reddit está com status "Integração pendente". Toda a arquitetura analítica (Intent Score, Relevance Score, Match Engine e Oportunidades) está pronta para processar dados reais assim que a conexão de integração for estabelecida neste ambiente. Para validar a interface e os módulos, utilize a importação de dados de teste claramente sinalizados.',
        signals: [],
        total_found: 0,
        architecture_ready: true,
        query: searchTerm,
        subreddit: subreddit || 'all',
      })
    }

    // Providers futuros (YouTube, Google Search, Fóruns)
    return e.json(200, {
      success: true,
      provider: provider,
      provider_name:
        provider === 'youtube'
          ? 'YouTube'
          : provider === 'google_search'
            ? 'Google Search'
            : 'Fóruns & Reviews',
      status: 'pending_integration',
      status_label: 'Preparado na arquitetura (futuro)',
      is_connected: false,
      message: `O provider "${provider}" está preparado na arquitetura de provedores da Fase 7. A integração será ativada futuramente após a validação do pipeline do Reddit.`,
      signals: [],
      total_found: 0,
      architecture_ready: true,
      query: searchTerm,
    })
  },
  $apis.requireAuth(),
)

// Endpoint 3: CAMADA DE ANÁLISE SEPARADA DA COLETA (Pipeline Analítico Puro)
// Recebe qualquer lote de sinais brutos (seja de fonte externa quando conectada, seja de dados legítimos de teste)
// e executa: Intent Score -> Relevance Score -> Match Engine Natural -> Geração de Oportunidades
routerAdd(
  'POST',
  '/backend/v1/audience/analyze-signals',
  (e) => {
    const userId = e.auth?.id
    if (!userId) return e.unauthorizedError('auth required')

    const body = e.requestInfo().body || {}
    const rawSignals = Array.isArray(body.signals) ? body.signals : []
    const productTitle = (body.product_title || '').trim()
    const productId = (body.product_id || '').trim()
    const category = (body.category || 'Geral').trim()
    const isTestData = body.is_test_data !== false // Padrão seguro: marca como dado de teste quando enviado via import/teste
    const sourceProvider = (body.provider || 'reddit').trim()

    if (rawSignals.length === 0) {
      return e.badRequestError('Nenhum sinal bruto fornecido para análise.')
    }

    const highIntentWords = [
      'comprar',
      'qual comprar',
      'onde comprar',
      'qual melhor',
      'vale a pena',
      'preço',
      'recomenda',
      'melhor marca',
      'alguém indica',
      'quanto custa',
      'promoção',
      'cupom',
      'review',
      'indicação',
      'loja confiável',
    ]
    const mediumIntentWords = [
      'como fazer',
      'como limpar',
      'como usar',
      'dúvida',
      'ajuda',
      'problema',
      'defeito',
      'dica',
      'funciona',
      'tutorial',
      'método',
    ]
    const complaintWords = [
      'fraco',
      'ruim',
      'bateria',
      'estragou',
      'não comprem',
      'devolvi',
      'reclamação',
      'garantia',
      'defeito',
      'barulhento',
      'caro',
    ]

    const signalsCol = $app.findCollectionByNameOrId('audience_signals')
    const oppsCol = $app.findCollectionByNameOrId('audience_opportunities')
    const analyzedSignals = []

    for (let i = 0; i < rawSignals.length; i++) {
      const s = rawSignals[i]
      if (!s.title && !s.snippet) continue

      const title = (s.title || '').trim()
      const snippet = (s.snippet || title).trim()
      const extId = s.external_id || `test_sig_${Date.now()}_${i}`
      const community = s.community || 'r/discussao'
      const author = s.author_display || 'u/autor_publico'
      const sourceUrl = s.source_url || ''
      const publishedAt = s.published_at || new Date().toISOString()
      const upvotes = parseInt(s.upvotes, 10) || 0
      const commentsCount = parseInt(s.comments_count, 10) || 0

      const textToAnalyze = `${title}\n${snippet}`.toLowerCase()

      // 1. CÁLCULO DO INTENT SCORE (0 a 100)
      let intentScore = 50
      let intentReason =
        'Discussão informativa geral sobre a categoria sem urgência transacional expressa.'
      let intentLevel = 'medium'

      let hasHighTrigger = false
      for (let h = 0; h < highIntentWords.length; h++) {
        if (textToAnalyze.includes(highIntentWords[h])) {
          intentScore += 25
          hasHighTrigger = true
          break
        }
      }

      for (let m = 0; m < mediumIntentWords.length; m++) {
        if (textToAnalyze.includes(mediumIntentWords[m])) {
          intentScore += 15
          break
        }
      }

      if (textToAnalyze.includes('?')) intentScore += 10
      if (commentsCount > 10) intentScore += 5
      intentScore = Math.min(98, Math.max(15, intentScore))

      if (intentScore >= 80) {
        intentLevel = 'high'
        intentReason =
          'Contexto contém pergunta direta de recomendação, comparação pré-compra ou busca explícita por solução.'
      } else if (intentScore >= 60) {
        intentLevel = 'medium'
        intentReason =
          'Contexto relata dor real ou pergunta de método com interesse evidente em produtos da categoria.'
      } else {
        intentLevel = 'low'
        intentReason = 'Conteúdo opinativo ou amplo sobre o tema sem intenção de compra imediata.'
      }

      // 2. CÁLCULO DO RELEVANCE SCORE (0 a 100)
      let relevanceScore = 65
      let relevanceReason = 'O produto atende à categoria geral mencionada no sinal.'
      const referenceTerm = (productTitle || category).toLowerCase()
      const termTokens = referenceTerm.split(/\s+/).filter((t) => t.length > 3)
      let matches = 0
      for (let tk = 0; tk < termTokens.length; tk++) {
        if (textToAnalyze.includes(termTokens[tk])) {
          matches++
        }
      }

      if (matches >= 2) {
        relevanceScore = 93
        relevanceReason = `A necessidade descrita possui correspondência direta com os benefícios centrais de "${productTitle || category}".`
      } else if (matches === 1) {
        relevanceScore = 78
        relevanceReason =
          'Correspondência moderada com a categoria ou tipo de uso do produto analisado.'
      } else {
        relevanceScore = 55
        relevanceReason =
          'O sinal trata de tema correlato, mas pode requerer uma variação específica do produto.'
      }

      // 3. MATCH ENGINE (Explicação em Linguagem Natural)
      const matchExplanation = `Match Produto × Necessidade: ${relevanceScore}/100. O contexto em ${community} descreve uma dor de "${title.slice(0, 50)}...", que a função principal do produto soluciona de forma prática.`

      // 4. CLASSIFICAÇÃO RÍGIDA (Sem confundir sinal com lead)
      let classification = 'market_signal'
      if (textToAnalyze.includes('?')) {
        classification = 'content_opportunity'
      } else if (intentScore >= 80) {
        classification = 'potential_interaction'
      } else {
        classification = 'audience_context'
      }

      // 5. DETECÇÃO DE PERGUNTAS, OBJEÇÕES E DESEJOS
      let questionDetected = textToAnalyze.includes('?') ? title : ''
      let objectionDetected = ''
      for (let o = 0; o < complaintWords.length; o++) {
        if (textToAnalyze.includes(complaintWords[o])) {
          objectionDetected = `Receio ou queixa sobre "${complaintWords[o]}" observada no contexto`
          break
        }
      }
      let desireDetected =
        intentScore >= 75 ? 'Resolver de forma rápida e com bom custo-benefício' : ''

      const suggestedOpp = `Vídeo curto ou criativo abordando: "${title.slice(0, 60)}" demonstrando o produto na prática.`
      const suggestedReply = `Olá! Se você busca praticidade no dia a dia, recomendo observar os diferenciais funcionais. No caso deste item, ele atende essa necessidade sem complicação.`

      // 6. PERSISTÊNCIA DEDUPLICADA NO POCKETBASE
      let signalRecord
      let isNew = false
      try {
        const found = $app.findRecordsByFilter(
          'audience_signals',
          `source = "${sourceProvider.replace(/"/g, '\\"')}" && external_id = "${extId.replace(/"/g, '\\"')}"`,
          '-created',
          1,
          0,
        )
        if (found && found.length > 0) {
          signalRecord = found[0]
        } else {
          signalRecord = new Record(signalsCol)
          isNew = true
        }
      } catch (_) {
        signalRecord = new Record(signalsCol)
        isNew = true
      }

      signalRecord.set('user_id', userId)
      signalRecord.set('external_id', extId)
      signalRecord.set('source', sourceProvider)
      signalRecord.set('provider', sourceProvider)
      signalRecord.set('is_test_data', isTestData)
      signalRecord.set('source_url', sourceUrl)
      signalRecord.set('title', title)
      signalRecord.set('snippet', snippet)
      signalRecord.set('author_display', author)
      signalRecord.set('community', community)
      signalRecord.set('published_at', publishedAt)
      signalRecord.set('matched_keyword', productTitle || category)
      signalRecord.set('category', category)
      signalRecord.set('product_id', productId)
      signalRecord.set('intent_level', intentLevel)
      signalRecord.set('intent_score', intentScore)
      signalRecord.set('intent_reason', intentReason)
      signalRecord.set('relevance_score', relevanceScore)
      signalRecord.set('relevance_reason', relevanceReason)
      signalRecord.set('signal_classification', classification)
      signalRecord.set('match_explanation', matchExplanation)
      signalRecord.set('suggested_opportunity', suggestedOpp)
      signalRecord.set('suggested_reply', suggestedReply)
      signalRecord.set('question_detected', questionDetected)
      signalRecord.set('objection_detected', objectionDetected)
      signalRecord.set('desire_detected', desireDetected)
      signalRecord.set('raw_metadata', {
        upvotes,
        comments_count: commentsCount,
        is_test_data: isTestData,
      })

      try {
        $app.save(signalRecord)
      } catch (errSave) {
        console.log('Error saving analyzed signal: ' + errSave)
      }

      // 7. CRIAÇÃO AUTOMÁTICA DE OPORTUNIDADE SE INTENT SCORE >= 65
      if (intentScore >= 65 && isNew) {
        try {
          const oppRec = new Record(oppsCol)
          oppRec.set('user_id', userId)
          oppRec.set('title', title.slice(0, 90))
          oppRec.set('opportunity_type', questionDetected ? 'question' : 'discussion')
          oppRec.set('description', snippet)
          oppRec.set('action_suggested', 'create_content')
          oppRec.set(
            'suggested_content_angle',
            `Resposta para dúvida em ${community}: "${title.slice(0, 50)}"`,
          )
          oppRec.set(
            'suggested_copy_hook',
            `Muita gente tem dúvida se ${productTitle || category} realmente resolve. Veja a demonstração real!`,
          )
          oppRec.set('suggested_reply_text', suggestedReply)
          oppRec.set('source', sourceProvider)
          oppRec.set('provider', sourceProvider)
          oppRec.set('is_test_data', isTestData)
          oppRec.set('source_url', sourceUrl)
          oppRec.set('community', community)
          oppRec.set('product_id', productId)
          oppRec.set('product_title', productTitle || category)
          oppRec.set('intent_score', intentScore)
          oppRec.set('relevance_score', relevanceScore)
          oppRec.set('priority_level', intentScore >= 80 ? 'hot' : 'high')
          oppRec.set('status', 'new')
          oppRec.set('signal_id', signalRecord.id)
          $app.save(oppRec)
        } catch (oppErr) {
          console.log('Error creating opportunity: ' + oppErr)
        }
      }

      analyzedSignals.push({
        id: signalRecord.id,
        external_id: extId,
        source: sourceProvider,
        provider: sourceProvider,
        is_test_data: isTestData,
        source_url: sourceUrl,
        title: title,
        snippet: snippet,
        author_display: author,
        community: community,
        published_at: publishedAt,
        matched_keyword: productTitle || category,
        intent_level: intentLevel,
        intent_score: intentScore,
        intent_reason: intentReason,
        relevance_score: relevanceScore,
        relevance_reason: relevanceReason,
        signal_classification: classification,
        match_explanation: matchExplanation,
        suggested_opportunity: suggestedOpp,
        suggested_reply: suggestedReply,
        question_detected: questionDetected,
        objection_detected: objectionDetected,
        desire_detected: desireDetected,
        upvotes: upvotes,
        comments_count: commentsCount,
      })
    }

    return e.json(200, {
      success: true,
      provider: sourceProvider,
      is_test_data: isTestData,
      message: `${analyzedSignals.length} sinais processados pelo pipeline analítico com sucesso (${isTestData ? 'Dados de Teste' : 'Dados Reais'}).`,
      total_analyzed: analyzedSignals.length,
      signals: analyzedSignals,
    })
  },
  $apis.requireAuth(),
)
