import pb from '@/lib/pocketbase/client'
import type {
  AudienceSignalRecord,
  AudienceTermsBankRecord,
  AudienceOpportunityRecord,
  InboundLeadRecord,
  IntentMapResponse,
  DemandReportResponse,
  AudienceProviderMeta,
} from '@/types/audience'

export const audienceService = {
  // 1. Obter Lista de Provedores de Audiência e Status
  async getProviders(): Promise<{ success: boolean; providers: AudienceProviderMeta[] }> {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`}/backend/v1/audience/providers`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
      },
    )

    if (!res.ok) {
      // Fallback local caso haja falha de rota
      return {
        success: true,
        providers: [
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
            required_credentials: [
              'REDDIT_CLIENT_ID',
              'REDDIT_CLIENT_SECRET',
              'REDDIT_USER_AGENT',
              'REDDIT_COMMERCIAL_APPROVED',
            ],
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
        ],
      }
    }

    return await res.json()
  },

  // 2. Gerar Mapa de Intenção e Banco de Termos via IA
  async generateIntentMap(params: {
    product_title?: string
    product_id?: string
    category?: string
    problem?: string
    desire?: string
    target_public?: string
  }): Promise<IntentMapResponse> {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`}/backend/v1/audience/generate-intent-map`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify(params),
      },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Falha ao gerar mapa de intenção da audiência')
    }

    const data = await res.json()
    return data.data
  },

  // 3. Consulta de Provedor de Audiência (Reddit / Futuros)
  async searchSignals(params: {
    query?: string
    product_title?: string
    product_id?: string
    category?: string
    provider?: string // 'reddit' | 'youtube' | 'google_search' | 'forums_reviews'
    subreddit?: string
    limit?: number
  }): Promise<{
    provider: string
    provider_name: string
    status: string
    status_label: string
    is_connected: boolean
    message: string
    total_found: number
    signals: AudienceSignalRecord[]
    architecture_ready?: boolean
  }> {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`}/backend/v1/audience/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify(params),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Erro ao consultar provedor de audiência')
    }

    return await res.json()
  },

  // 4. Analisar Sinais (Camada Analítica Pura: Intent Score + Relevance Score + Match Engine + Oportunidades)
  // Utilizada tanto para dados reais quanto para lotes de teste identificados
  async analyzeSignals(params: {
    signals: Array<{
      external_id?: string
      title: string
      snippet?: string
      community?: string
      author_display?: string
      source_url?: string
      published_at?: string
      upvotes?: number
      comments_count?: number
    }>
    product_title?: string
    product_id?: string
    category?: string
    provider?: string
    is_test_data?: boolean
  }): Promise<{
    success: boolean
    provider: string
    is_test_data: boolean
    message: string
    total_analyzed: number
    signals: AudienceSignalRecord[]
  }> {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`}/backend/v1/audience/analyze-signals`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          ...params,
          is_test_data: params.is_test_data !== false,
        }),
      },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Erro ao analisar sinais na camada analítica')
    }

    return await res.json()
  },

  // 5. Obter Sinais Salvos no PocketBase
  async getSignals(
    filter = '',
    sort = '-intent_score',
    page = 1,
    perPage = 50,
  ): Promise<{ items: AudienceSignalRecord[]; totalItems: number }> {
    const res = await pb
      .collection<AudienceSignalRecord>('audience_signals')
      .getList(page, perPage, {
        filter,
        sort,
      })
    return { items: res.items, totalItems: res.totalItems }
  },

  // 6. Obter Termos de Intenção do Banco
  async getTermsBank(
    filter = '',
    sort = '-signal_count',
    page = 1,
    perPage = 100,
  ): Promise<{ items: AudienceTermsBankRecord[]; totalItems: number }> {
    const res = await pb
      .collection<AudienceTermsBankRecord>('audience_terms_bank')
      .getList(page, perPage, {
        filter,
        sort,
      })
    return { items: res.items, totalItems: res.totalItems }
  },

  // 7. Obter Fila de Oportunidades de Público
  async getOpportunities(
    filter = '',
    sort = '-intent_score',
    page = 1,
    perPage = 50,
  ): Promise<{ items: AudienceOpportunityRecord[]; totalItems: number }> {
    const res = await pb
      .collection<AudienceOpportunityRecord>('audience_opportunities')
      .getList(page, perPage, {
        filter,
        sort,
      })
    return { items: res.items, totalItems: res.totalItems }
  },

  // Atualizar Status da Oportunidade
  async updateOpportunityStatus(
    id: string,
    status: AudienceOpportunityRecord['status'],
  ): Promise<AudienceOpportunityRecord> {
    return await pb
      .collection<AudienceOpportunityRecord>('audience_opportunities')
      .update(id, { status })
  },

  // 8. Mini CRM de Leads Inbound
  async getInboundLeads(
    filter = '',
    sort = '-created',
    page = 1,
    perPage = 50,
  ): Promise<{ items: InboundLeadRecord[]; totalItems: number }> {
    const res = await pb.collection<InboundLeadRecord>('inbound_leads').getList(page, perPage, {
      filter,
      sort,
    })
    return { items: res.items, totalItems: res.totalItems }
  },

  // Capturar Lead Inbound com Consentimento Rastreável
  async captureInboundLead(data: {
    identifier: string
    name?: string
    channel?: string
    origin_source?: string
    product_id?: string
    product_interest?: string
    campaign_id?: string
    declared_intent?: string
    consent_status?: 'active' | 'revoked'
    authorized_purpose?: string
    consent_text_version?: string
    notes?: string
  }): Promise<{
    success: boolean
    lead_id: string
    lead_score: number
    score_tier: string
    message: string
  }> {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`}/backend/v1/audience/inbound-lead/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify(data),
      },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Erro ao registrar lead inbound')
    }

    return await res.json()
  },

  // Revogar Consentimento (Opt-Out)
  async revokeConsent(leadId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`}/backend/v1/audience/inbound-lead/revoke-consent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({ lead_id: leadId }),
      },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Erro ao revogar consentimento')
    }

    return await res.json()
  },

  // Atualizar Lead (Status CRM)
  async updateLeadStatus(
    id: string,
    status: InboundLeadRecord['status'],
    notes?: string,
  ): Promise<InboundLeadRecord> {
    return await pb.collection<InboundLeadRecord>('inbound_leads').update(id, {
      status,
      ...(notes ? { notes } : {}),
    })
  },

  // 9. Obter Relatório de Demanda Agregado
  async getDemandReport(periodDays = 30, category = ''): Promise<DemandReportResponse> {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`}/backend/v1/audience/demand-report`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({ period_days: periodDays, category }),
      },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Erro ao carregar relatório de demanda')
    }

    return await res.json()
  },
}
