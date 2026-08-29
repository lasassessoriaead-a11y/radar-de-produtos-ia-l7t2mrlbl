migrate(
  (app) => {
    // 1. Configuração padrão do Orquestrador (NÍVEL 1 — RECOMENDAR por padrão, Kill switch inativo, Modo sombra ativo)
    try {
      app.findFirstRecordByData('orchestrator_config', 'config_key', 'global_orchestrator')
    } catch (_) {
      const configCol = app.findCollectionByNameOrId('orchestrator_config')
      const cfg = new Record(configCol)
      cfg.set('config_key', 'global_orchestrator')
      cfg.set('autonomy_level', 1) // NÍVEL 1 — RECOMENDAR por padrão
      cfg.set('shadow_mode_active', true)
      cfg.set('kill_switch_active', false)
      cfg.set('kill_switch_reason', '')
      cfg.set('primary_objective', 'maximize_commission')
      cfg.set('paused_modules', [])
      cfg.set('guardrails', {
        max_campaigns_per_day: 10,
        max_creatives_per_day: 20,
        max_publications_per_day: 5,
        max_repurchase_recs_per_day: 15,
        max_actions_per_module: 25,
        max_daily_generation_cost: 50.0,
        max_actions_per_contact_week: 2,
        min_score_threshold: 75,
        max_acceptable_risk: 70,
      })
      cfg.set('financial_limits', {
        limit_per_action: 0,
        daily_limit: 0,
        weekly_limit: 0,
        monthly_limit: 0,
        paid_traffic_autonomous_enabled: false,
      })
      cfg.set('allowed_channels', ['telegram', 'instagram', 'tiktok', 'whatsapp'])
      cfg.set('blocked_categories', [])
      cfg.set('allowed_categories', [
        'Eletrônicos & Áudio',
        'Beleza & Cuidados Pessoais',
        'Cozinha & Casa',
        'Casa Inteligente & Tech',
        'Fitness & Saúde',
      ])
      cfg.set('operating_hours', { start: '08:00', end: '22:00', enforce: false })
      cfg.set('consecutive_failures_count', 0)
      app.save(cfg)
    }

    // 2. Políticas Globais e do Usuário
    const defaultPolicies = [
      {
        policy_code: 'POL_HARD_CONSENT_REQUIRED',
        title: 'Consentimento Ativo Obrigatório (LGPD Hard Block)',
        description:
          'Bloqueia categoricamente qualquer contato ou recomendação se não houver consentimento explícito e ativo para o canal e finalidade.',
        category: 'crm_contact',
        rule_type: 'hard_block',
        condition_json: { check: 'consent_status == "active"', target: 'all_direct_contacts' },
        is_active: true,
        priority_order: 1,
        is_system_immutable: true,
      },
      {
        policy_code: 'POL_HARD_OPTOUT_RESPECT',
        title: 'Respeito Absoluto a Opt-Out',
        description:
          'Bloqueia qualquer ação comercial ou mensagem para contatos ou leads que solicitaram cancelamento ou opt-out.',
        category: 'crm_contact',
        rule_type: 'hard_block',
        condition_json: { check: 'status != "opt_out"', target: 'all_contacts' },
        is_active: true,
        priority_order: 2,
        is_system_immutable: true,
      },
      {
        policy_code: 'POL_NO_UNAPPROVED_EXTERNAL_PUB',
        title: 'Aprovação Obrigatória para Publicação Externa',
        description:
          'Nunca publicar em canais sociais ou mensageria sem aprovação explícita humana do criativo e do copy.',
        category: 'publishing',
        rule_type: 'require_approval',
        condition_json: { action: 'PREPARE_PUBLICATION', require_human_approval: true },
        is_active: true,
        priority_order: 3,
        is_system_immutable: false,
      },
      {
        policy_code: 'POL_NO_AUTONOMOUS_PAID_SPEND',
        title: 'Bloqueio de Gestão Autônoma de Mídia Paga',
        description:
          'Não permite gastos financeiros ou ativação de campanhas de tráfego pago sem ordem manual explícita.',
        category: 'budget',
        rule_type: 'hard_block',
        condition_json: { max_autonomous_budget: 0 },
        is_active: true,
        priority_order: 4,
        is_system_immutable: false,
      },
      {
        policy_code: 'POL_MIN_OPPORTUNITY_SCORE',
        title: 'Filtro de Score Mínimo para Campanhas',
        description:
          'Não gerar campanhas ou despender recursos para produtos com Score de Oportunidade inferior a 75 pts.',
        category: 'content_quality',
        rule_type: 'threshold_check',
        condition_json: { min_score: 75 },
        is_active: true,
        priority_order: 5,
        is_system_immutable: false,
      },
      {
        policy_code: 'POL_CADENCE_MAX_2_COMMUNICATIONS',
        title: 'Trava de Saturação de Contatos (Máx 2 comunicações/semana)',
        description:
          'Impede o envio de mais de 2 recomendações ou mensagens comerciais para o mesmo lead/cliente por semana.',
        category: 'crm_contact',
        rule_type: 'cadence_cap',
        condition_json: { max_per_week: 2, min_days_interval: 3 },
        is_active: true,
        priority_order: 6,
        is_system_immutable: false,
      },
      {
        policy_code: 'POL_NO_PUBLIC_SIGNAL_COLD_CONTACT',
        title: 'Proibição de Cold Outreach em Sinais Públicos',
        description:
          'Sinais detectados em redes sociais e fóruns públicos nunca devem ser usados como permissão para abordagem privada direta.',
        category: 'safety',
        rule_type: 'hard_block',
        condition_json: { target: 'public_signals', direct_messaging: false },
        is_active: true,
        priority_order: 7,
        is_system_immutable: true,
      },
    ]

    const policyCol = app.findCollectionByNameOrId('orchestrator_policies')
    for (const p of defaultPolicies) {
      try {
        app.findFirstRecordByData('orchestrator_policies', 'policy_code', p.policy_code)
      } catch (_) {
        const r = new Record(policyCol)
        r.set('policy_code', p.policy_code)
        r.set('title', p.title)
        r.set('description', p.description)
        r.set('category', p.category)
        r.set('rule_type', p.rule_type)
        r.set('condition_json', p.condition_json)
        r.set('is_active', p.is_active)
        r.set('priority_order', p.priority_order)
        r.set('is_system_immutable', p.is_system_immutable)
        app.save(r)
      }
    }

    // 3. Ações Iniciais para a Caixa de Aprovações / Plano do Dia (Demonstrando Coordenação Multi-módulos e Rastreadores)
    const initialActions = [
      {
        idempotency_key: 'ACT_CACADOR_WATCHLIST_001',
        action_type: 'ADD_TO_WATCHLIST',
        target_module: 'hunter',
        title: 'Adicionar Mini Projetor Portátil Smart LED à Watchlist',
        summary:
          'Produto identificado no Caçador com Score 94, alta tração de busca (+28%) e comissão de R$ 38,90.',
        reasoning:
          'O Caçador identificou crescimento súbito de buscas com baixa concorrência qualificada na Shopee. Score de Oportunidade 94 pts com forte margem unitária.',
        evidence_summary:
          '28% de aumento de demanda nos últimos 7 dias, 8 reviews recentes com média 4.8 e comissão líquida de R$ 38,90 por venda.',
        evidence_data: {
          search_growth: '+28%',
          current_score: 94,
          reviews_sample: 8,
          avg_rating: 4.8,
          commission_brl: 38.9,
        },
        evidence_strength: 'strong',
        is_experiment_hypothesis: false,
        confidence_score: 88,
        confidence_tier: 'high',
        risk_score: 15,
        risk_tier: 'low',
        priority_score: 92,
        is_external_action: false,
        is_financial_action: false,
        estimated_cost: 0,
        expected_impact:
          'Monitoramento contínuo de oscilações de preço e estoque no radar do afiliado.',
        is_reversible: true,
        reversal_instructions: 'Pode ser removido da watchlist a qualquer momento com 1 clique.',
        status: 'pending_approval',
        block_reason_type: 'none',
        block_message: '',
        integration_status: 'native_internal',
        pending_integration_name: '',
        entity_id: 'disc_proj_smart_01',
        entity_type: 'discovered_product',
        entity_title: 'Mini Projetor Portátil Smart LED WiFi',
        payload_data: {
          external_id: 'SHOPEE_PROJ_992',
          title: 'Mini Projetor Portátil Smart LED WiFi',
          category: 'Eletrônicos & Áudio',
        },
        simulation_snapshot: {
          will_affect_table: 'watchlist',
          creates_record: true,
          sends_external_request: false,
          cost: 'R$ 0,00',
        },
        is_test_data: true,
        test_data_note: 'Dado de demonstração de fluxo inicial do Orquestrador',
      },
      {
        idempotency_key: 'ACT_LAB_CREATE_DRAFT_002',
        action_type: 'CREATE_CAMPAIGN_DRAFT',
        target_module: 'lab',
        title: 'Preparar Rascunho de Campanha: Escova Secadora Titanium Oval',
        summary:
          'Criar estrutura de campanha com 3 ângulos (Praticidade Matinal, Brilho de Salão e Anti-Frizz).',
        reasoning:
          'O Radar de Público detectou 14 menções a "cabelo com frizz no inverno" e a Inteligência de Vendas comprovou que formatos de Demonstração 15s têm CTR 4.1% na categoria Beleza.',
        evidence_summary:
          'Insight de Vendas validado com 32 campanhas históricas da categoria Beleza (CTR médio 4.1% vs 2.6% benchmark).',
        evidence_data: {
          historical_campaigns: 32,
          category_ctr: '4.1%',
          benchmark_ctr: '2.6%',
          audience_signals_count: 14,
        },
        evidence_strength: 'strong',
        is_experiment_hypothesis: false,
        confidence_score: 85,
        confidence_tier: 'high',
        risk_score: 22,
        risk_tier: 'low',
        priority_score: 89,
        is_external_action: false,
        is_financial_action: false,
        estimated_cost: 0,
        expected_impact:
          'Geração do rascunho com 3 variações de hooks e copies no Laboratório para revisão.',
        is_reversible: true,
        reversal_instructions:
          'Campanha é criada em status rascunho (draft) e pode ser excluída sem impacto.',
        status: 'pending_approval',
        block_reason_type: 'none',
        block_message: '',
        integration_status: 'native_internal',
        pending_integration_name: '',
        entity_id: 'prod_escova_titanium',
        entity_type: 'product',
        entity_title: 'Escova Secadora Titanium Oval 1200W',
        payload_data: {
          product_title: 'Escova Secadora Titanium Oval 1200W',
          format: 'video_15s',
          primary_angle: 'Praticidade Matinal',
        },
        simulation_snapshot: {
          will_affect_table: 'campaigns',
          creates_record: true,
          sends_external_request: false,
          cost: 'R$ 0,00',
        },
        is_test_data: true,
        test_data_note: 'Demonstração de integração Lab + Vendas',
      },
      {
        idempotency_key: 'ACT_STUDIO_CREATIVE_003',
        action_type: 'CREATE_CREATIVE_DRAFT',
        target_module: 'studio',
        title: 'Gerar Conceito Visual e Storyboard de 15s para Suporte Veicular MagSafe',
        summary: 'Estruturar storyboard cena a cena com foco em estabilidade em ruas esburacadas.',
        reasoning:
          'Pergunta recorrente no Radar de Público: "O ímã aguenta buraco e lombada sem cair?". Storyboard direcionado a quebra dessa objeção com demonstração prática.',
        evidence_summary:
          'Sinal de público com alta intenção (Score 88). Vendas passadas mostram taxa de conversão 3.8% quando objeção de fixação é tratada nos primeiros 3s.',
        evidence_data: {
          objection_signals: 9,
          retention_correlation: '+42%',
          estimated_conversion: '3.8%',
        },
        evidence_strength: 'moderate',
        is_experiment_hypothesis: false,
        confidence_score: 78,
        confidence_tier: 'moderate',
        risk_score: 20,
        risk_tier: 'low',
        priority_score: 81,
        is_external_action: false,
        is_financial_action: false,
        estimated_cost: 0,
        expected_impact: 'Criação do storyboard no Estúdio Criativo pronto para aprovação visual.',
        is_reversible: true,
        reversal_instructions: 'Rascunho descartável no Estúdio Criativo.',
        status: 'pending_approval',
        block_reason_type: 'none',
        block_message: '',
        integration_status: 'native_internal',
        pending_integration_name: '',
        entity_id: 'prod_suporte_magsafe',
        entity_type: 'product',
        entity_title: 'Suporte Veicular Magnético MagSafe 15W',
        payload_data: { format: '9:16', duration: 15, theme: 'demonstracao_resistencia' },
        simulation_snapshot: {
          will_affect_table: 'creatives',
          creates_record: true,
          sends_external_request: false,
          cost: 'R$ 0,00',
        },
        is_test_data: true,
        test_data_note: 'Demonstração de Estúdio Criativo',
      },
      {
        idempotency_key: 'ACT_CRM_REPURCHASE_004',
        action_type: 'CREATE_REPURCHASE_RECOMMENDATION',
        target_module: 'repurchase',
        title: 'Sugerir Almofadas de Veludo para Mariana Souza (Compradora de Fone ANC)',
        summary:
          'Recommendation Score 92 pts. Contato com consentimento ativo e tempo de recompra ideal (38 dias).',
        reasoning:
          'Contato Mariana Souza comprou Headphone ANC há 38 dias. Análise de co-ocorrência indica que 24% dos compradores de áudio premium compram almofadas ou estojos em até 45 dias.',
        evidence_summary:
          'LTV atual de Mariana: R$ 48,20 de comissão. Consentimento newsletter/e-mail ativo. Cadência semanal respeitada (0 msgs nos últimos 7 dias).',
        evidence_data: {
          days_since_last_purchase: 38,
          contact_relationship_score: 88,
          consent_status: 'active',
          channel: 'newsletter',
        },
        evidence_strength: 'strong',
        is_experiment_hypothesis: false,
        confidence_score: 91,
        confidence_tier: 'high',
        risk_score: 35,
        risk_tier: 'medium',
        priority_score: 87,
        is_external_action: false,
        is_financial_action: false,
        estimated_cost: 0,
        expected_impact:
          'Cria rascunho de recomendação personalizada com link de afiliado rastreado no CRM.',
        is_reversible: true,
        reversal_instructions: 'Sugestão pode ser descartada ou editada antes de qualquer disparo.',
        status: 'pending_approval',
        block_reason_type: 'none',
        block_message: '',
        integration_status: 'native_internal',
        pending_integration_name: '',
        entity_id: 'cont_mariana_01',
        entity_type: 'crm_contact',
        entity_title: 'Mariana Souza (mariana.souza@gmail.com)',
        payload_data: {
          contact_identifier: 'mariana.souza@gmail.com',
          target_product: 'Almofadas de Veludo Substitutas',
          rec_type: 'complementar',
        },
        simulation_snapshot: {
          will_affect_table: 'crm_recommendations',
          creates_record: true,
          sends_external_request: false,
          cost: 'R$ 0,00',
        },
        is_test_data: true,
        test_data_note: 'Demonstração de CRM & Recompra consentida',
      },
      {
        idempotency_key: 'ACT_PUB_TELEGRAM_EXTERNAL_005',
        action_type: 'PREPARE_PUBLICATION',
        target_module: 'publishing',
        title: 'Publicar Oferta no Canal Telegram VIP (Exige Aprovação Humana)',
        summary: 'Publicação de copy testado e link rastreado no canal Telegram de Ofertas Tech.',
        reasoning:
          'Variação A da Campanha Fone Bluetooth bateu CTR 5.2% no teste preliminar. Política POL_NO_UNAPPROVED_EXTERNAL_PUB exige aprovação explícita do usuário.',
        evidence_summary:
          'Link rastreado gerado com sub_id específico. Canal conectado e ativo. Testado em ambiente fechado.',
        evidence_data: {
          channel: 'telegram',
          click_target: 'Canal VIP Promoções',
          preliminary_ctr: '5.2%',
        },
        evidence_strength: 'strong',
        is_experiment_hypothesis: false,
        confidence_score: 84,
        confidence_tier: 'high',
        risk_score: 72,
        risk_tier: 'high',
        priority_score: 86,
        is_external_action: true,
        is_financial_action: false,
        estimated_cost: 0,
        expected_impact: 'Disparo externo de mensagem via Telegram Bot API com link afiliado.',
        is_reversible: false,
        reversal_instructions:
          'Ação externa: mensagens enviadas não podem ser desfeitas automaticamente após leitura.',
        status: 'pending_approval',
        block_reason_type: 'none',
        block_message: '',
        integration_status: 'connected',
        pending_integration_name: 'Telegram Bot API',
        entity_id: 'camp_fone_01',
        entity_type: 'campaign',
        entity_title: 'Campanha Fone ANC Q30',
        payload_data: {
          channel: 'telegram',
          destination: 'Canal Ofertas VIP',
          copy_preview: '🔥 Menor preço histórico do Fone Q30!',
        },
        simulation_snapshot: {
          will_affect_table: 'publications',
          calls_external_api: true,
          external_service: 'Telegram Bot API',
          irreversible: true,
        },
        is_test_data: true,
        test_data_note: 'Ação externa com alto risco - exige aprovação humana',
      },
      {
        idempotency_key: 'ACT_BLOCKED_OPTOUT_006',
        action_type: 'CREATE_CRM_RECOMMENDATION',
        target_module: 'crm',
        title: 'Recomendação para Ricardo Mendes [BLOQUEADA - OPT-OUT]',
        summary: 'Ação bloqueada de forma estrita devido a pedido de Opt-out do contato.',
        reasoning:
          'O contato Ricardo Mendes revogou consentimento em 12/05/2024. A política POL_HARD_OPTOUT_RESPECT e a trava de segurança bloqueiam qualquer emissão de mensagem.',
        evidence_summary:
          'Registro crm_consent_logs indica status "revoked" com opt-out formal registrado.',
        evidence_data: {
          consent_status: 'revoked',
          opt_out_date: '2024-05-12',
          block_type: 'HARD_SECURITY_LOCK',
        },
        evidence_strength: 'strong',
        is_experiment_hypothesis: false,
        confidence_score: 0,
        confidence_tier: 'insufficient',
        risk_score: 100,
        risk_tier: 'high',
        priority_score: 10,
        is_external_action: true,
        is_financial_action: false,
        estimated_cost: 0,
        expected_impact: 'Nenhum efeito externo permitido.',
        is_reversible: false,
        reversal_instructions:
          'Inviolável a menos que o contato conceda novo consentimento voluntário.',
        status: 'blocked',
        block_reason_type: 'opt_out',
        block_message:
          'AÇÃO BLOQUEADA — OPT-OUT: O contato solicitou expressamente a revogação de comunicações.',
        integration_status: 'native_internal',
        pending_integration_name: '',
        entity_id: 'cont_ricardo_optout',
        entity_type: 'crm_contact',
        entity_title: 'Ricardo Mendes (ricardo.m@outlook.com)',
        payload_data: { contact_identifier: 'ricardo.m@outlook.com', reason: 'Blocked by opt-out' },
        simulation_snapshot: { blocked: true, reason: 'OPT_OUT_VIOLATION' },
        is_test_data: true,
        test_data_note: 'Exemplo de Hard Block de Segurança LGPD',
      },
      {
        idempotency_key: 'ACT_TEST_EXP_WEAK_DATA_007',
        action_type: 'CREATE_TEST_VARIATION',
        target_module: 'sales_intelligence',
        title: 'Criar Experimento Exploratório: Comparação Direta vs Unboxing Curto',
        summary:
          'Dados insuficientes para afirmar vencedor; sistema prioriza criação de teste A/B.',
        reasoning:
          'Apenas 3 campanhas utilizaram o formato Comparação Direta. A evidência é insuficiente para recomendação operacional direta, gerando assim uma hipótese controlada de aprendizado.',
        evidence_summary:
          'Amostra de 3 campanhas (necessário mínimo de 15 para significância estatística).',
        evidence_data: { sample_size: 3, minimum_sample: 15, stat_significance: false },
        evidence_strength: 'insufficient',
        is_experiment_hypothesis: true,
        confidence_score: 32,
        confidence_tier: 'low',
        risk_score: 18,
        risk_tier: 'low',
        priority_score: 65,
        is_external_action: false,
        is_financial_action: false,
        estimated_cost: 0,
        expected_impact:
          'Cria experimento no módulo de Inteligência de Vendas para coletar 500 cliques.',
        is_reversible: true,
        reversal_instructions: 'Experimento pode ser encerrado a qualquer momento.',
        status: 'pending_approval',
        block_reason_type: 'none',
        block_message: '',
        integration_status: 'native_internal',
        pending_integration_name: '',
        entity_id: 'exp_hypo_01',
        entity_type: 'learning_experiment',
        entity_title: 'Hipótese: Comparação Direta tem +15% retenção',
        payload_data: {
          baseline: 'Unboxing 15s',
          challenger: 'Comparação 15s',
          primary_metric: 'ctr',
        },
        simulation_snapshot: { will_affect_table: 'learning_experiments', creates_record: true },
        is_test_data: true,
        test_data_note: 'Exemplo de tratamento de dados fracos gerando hipótese de teste',
      },
      {
        idempotency_key: 'ACT_ADS_PAID_PENDING_008',
        action_type: 'PREPARE_PUBLICATION',
        target_module: 'publishing',
        title: 'Criar Conjunto de Anúncios Meta Ads [INTEGRAÇÃO PENDENTE]',
        summary: 'Ação externa em rede de mídia paga com integração de API não configurada.',
        reasoning:
          'O Orquestrador preparou a estrutura de anúncio, mas a API de Marketing do Meta Ads ainda não está configurada neste ambiente.',
        evidence_summary: 'Sem chaves de API conectadas para Meta Ads Business API.',
        evidence_data: { api_target: 'Meta Marketing Graph API', credentials_connected: false },
        evidence_strength: 'weak',
        is_experiment_hypothesis: false,
        confidence_score: 60,
        confidence_tier: 'moderate',
        risk_score: 95,
        risk_tier: 'high',
        priority_score: 40,
        is_external_action: true,
        is_financial_action: true,
        estimated_cost: 25.0,
        expected_impact: 'Publicação direta de tráfego pago.',
        is_reversible: false,
        reversal_instructions: 'Requer gerenciador de anúncios externo.',
        status: 'blocked',
        block_reason_type: 'integration_pending',
        block_message:
          'INTEGRAÇÃO PENDENTE: A API de Mídia Paga Meta Ads não está conectada. Nenhuma chamada fictícia é realizada.',
        integration_status: 'pending_integration',
        pending_integration_name: 'Meta Ads Marketing API',
        entity_id: 'camp_meta_01',
        entity_type: 'campaign',
        entity_title: 'Campanha Teclado Mecânico RGB',
        payload_data: { daily_budget: 25.0, target_platform: 'Meta Ads' },
        simulation_snapshot: { blocked: true, reason: 'INTEGRATION_NOT_CONNECTED' },
        is_test_data: true,
        test_data_note: 'Exemplo de integração pendente e bloqueio de mídia paga',
      },
    ]

    const actCol = app.findCollectionByNameOrId('orchestrator_actions')
    for (const a of initialActions) {
      try {
        app.findFirstRecordByData('orchestrator_actions', 'idempotency_key', a.idempotency_key)
      } catch (_) {
        const r = new Record(actCol)
        r.set('idempotency_key', a.idempotency_key)
        r.set('action_type', a.action_type)
        r.set('target_module', a.target_module)
        r.set('title', a.title)
        r.set('summary', a.summary)
        r.set('reasoning', a.reasoning)
        r.set('evidence_summary', a.evidence_summary)
        r.set('evidence_data', a.evidence_data)
        r.set('evidence_strength', a.evidence_strength)
        r.set('is_experiment_hypothesis', a.is_experiment_hypothesis)
        r.set('confidence_score', a.confidence_score)
        r.set('confidence_tier', a.confidence_tier)
        r.set('risk_score', a.risk_score)
        r.set('risk_tier', a.risk_tier)
        r.set('priority_score', a.priority_score)
        r.set('is_external_action', a.is_external_action)
        r.set('is_financial_action', a.is_financial_action)
        r.set('estimated_cost', a.estimated_cost)
        r.set('expected_impact', a.expected_impact)
        r.set('is_reversible', a.is_reversible)
        r.set('reversal_instructions', a.reversal_instructions)
        r.set('status', a.status)
        r.set('block_reason_type', a.block_reason_type)
        r.set('block_message', a.block_message)
        r.set('integration_status', a.integration_status)
        r.set('pending_integration_name', a.pending_integration_name)
        r.set('entity_id', a.entity_id)
        r.set('entity_type', a.entity_type)
        r.set('entity_title', a.entity_title)
        r.set('payload_data', a.payload_data)
        r.set('simulation_snapshot', a.simulation_snapshot)
        r.set('is_test_data', a.is_test_data)
        r.set('test_data_note', a.test_data_note)
        app.save(r)
      }
    }

    // 4. Modo Sombra Inicial ("O QUE A IA TERIA FEITO")
    const shadowEntries = [
      {
        hypothetical_action:
          'Teria criado variação de Hook de Pergunta ("Ainda sofrendo com frizz?") para a Escova Secadora',
        action_type: 'CREATE_CAMPAIGN_DRAFT',
        target_module: 'lab',
        target_entity_id: 'prod_escova_titanium',
        target_entity_title: 'Escova Secadora Titanium',
        reasoning:
          'Padrão histórico comprovou que hooks interrogativos aumentam engajamento em 31% para produtos de cuidado pessoal.',
        evidence_data: { sample_size: 18, observed_ctr: '3.9%', benchmark: '2.8%' },
        confidence_score: 86,
        risk_score: 18,
        expected_outcome: 'CTR estimado de 3.9% e geração de 24 cliques qualificados.',
        user_actual_action: 'Usuário optou por hook de Demonstração Visual direta',
        actual_outcome: 'CTR real alcançado foi de 3.7%',
        comparison_status: 'ai_diverged_user',
        comparison_analysis:
          'Ação do usuário teve performance similar (3.7% vs 3.9% estimado pela IA). Ambos os formatos validaram tração positiva.',
        is_test_data: true,
      },
      {
        hypothetical_action:
          'Teria adicionado o Mini Projetor Portátil à Watchlist 3 dias antes do pico de vendas',
        action_type: 'ADD_TO_WATCHLIST',
        target_module: 'hunter',
        target_entity_id: 'disc_proj_smart_01',
        target_entity_title: 'Mini Projetor Portátil Smart',
        reasoning:
          'Detecção antecipada de tendência de buscas no Google Trends e Shopee Search com margem de R$ 38,90.',
        evidence_data: { search_volume_spike: '+45%', competitor_count: 3 },
        confidence_score: 92,
        risk_score: 10,
        expected_outcome: 'Alerta prévio antes do produto esgotar no fornecedor.',
        user_actual_action: 'Usuário adicionou manualmente após 4 dias',
        actual_outcome: 'Preço subiu R$ 12,00 no fornecedor no 4º dia',
        comparison_status: 'user_inaction_positive',
        comparison_analysis:
          'Detecção hipotética do Orquestrador teria antecipado a subida de preço do fornecedor em 72 horas.',
        is_test_data: true,
      },
      {
        hypothetical_action:
          'Teria recomendado Suporte Veicular MagSafe ao contato Carlos Eduardo no 30º dia pós-compra',
        action_type: 'CREATE_REPURCHASE_RECOMMENDATION',
        target_module: 'repurchase',
        target_entity_id: 'cont_carlos_02',
        target_entity_title: 'Carlos Eduardo (carlos.ed@techmail.com)',
        reasoning:
          'Comprador de Carregador por Indução; alta afinidade identificada com acessórios veiculares compatíveis.',
        evidence_data: { contact_score: 82, affinity_score: 89, consent_active: true },
        confidence_score: 84,
        risk_score: 25,
        expected_outcome:
          'Conversão complementar com ticket médio de R$ 69,90 e comissão de R$ 10,48.',
        user_actual_action: 'Aguardando decisão operacional',
        actual_outcome: 'Em monitoramento de cadência',
        comparison_status: 'pending_outcome',
        comparison_analysis: 'Comparação em andamento após validação do ciclo de recompra.',
        is_test_data: true,
      },
    ]

    const shadowCol = app.findCollectionByNameOrId('orchestrator_shadow_log')
    for (const s of shadowEntries) {
      try {
        app.findFirstRecordByData(
          'orchestrator_shadow_log',
          'hypothetical_action',
          s.hypothetical_action,
        )
      } catch (_) {
        const r = new Record(shadowCol)
        r.set('hypothetical_action', s.hypothetical_action)
        r.set('action_type', s.action_type)
        r.set('target_module', s.target_module)
        r.set('target_entity_id', s.target_entity_id)
        r.set('target_entity_title', s.target_entity_title)
        r.set('reasoning', s.reasoning)
        r.set('evidence_data', s.evidence_data)
        r.set('confidence_score', s.confidence_score)
        r.set('risk_score', s.risk_score)
        r.set('expected_outcome', s.expected_outcome)
        r.set('user_actual_action', s.user_actual_action)
        r.set('actual_outcome', s.actual_outcome)
        r.set('comparison_status', s.comparison_status)
        r.set('comparison_analysis', s.comparison_analysis)
        r.set('is_test_data', s.is_test_data)
        app.save(r)
      }
    }

    // 5. Decision Log Histórico Inicial
    const logCol = app.findCollectionByNameOrId('orchestrator_decision_log')
    try {
      app.findFirstRecordByData('orchestrator_decision_log', 'action_id', 'ACT_LOG_INIT_001')
    } catch (_) {
      const r = new Record(logCol)
      r.set('action_id', 'ACT_LOG_INIT_001')
      r.set('action_type', 'RECALCULATE_SCORE')
      r.set('target_module', 'radar')
      r.set(
        'situation_observed',
        'Atualização diária de métricas de vendas e ratings para 12 produtos monitorados.',
      )
      r.set(
        'proposed_decision',
        'Recalcular Opportunity Score com novos fatores de volatilidade de concorrência.',
      )
      r.set('evidence_used', 'Sincronização de reviews e variações de preço dos últimos 3 dias.')
      r.set('sample_size', 12)
      r.set('confidence_score', 95)
      r.set('risk_score', 5)
      r.set('priority_score', 90)
      r.set('applied_policies', ['POL_MIN_OPPORTUNITY_SCORE'])
      r.set('autonomy_level_at_time', 1)
      r.set('decision_outcome', 'approved_by_user')
      r.set('executed_by', 'system_auto')
      r.set('execution_status', 'success')
      r.set('execution_details', { recalculation_duration_ms: 120, items_updated: 12 })
      r.set('feedback_notes', 'Scores atualizados com sucesso.')
      r.set('is_shadow_mode', false)
      r.set('is_test_data', true)
      app.save(r)
    }
  },
  (app) => {
    // Teardown handled by schema rollback
  },
)
