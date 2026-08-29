import pb from '@/lib/pocketbase/client'
import type {
  AudienceSignalRecord,
  AudienceTermsBankRecord,
  AudienceOpportunityRecord,
  InboundLeadRecord,
  IntentMapResponse,
  DemandReportResponse,
} from '@/types/audience'

export const audienceService = {
  // 1. Gerar Mapa de Intenção e Banco de Termos via IA
  async generateIntentMap(params: {
    product_title?: string
    product_id?: string
    category?: string
    problem?: string
    desire?: string
    target_public?: string
  }): Promise<IntentMapResponse> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/audience/generate-intent-map`,
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

  // 2. Busca Real de Conteúdos Públicos (Reddit Oficial / Arquitetura de Providers)
  async searchSignals(params: {
    query?: string
    product_title?: string
    product_id?: string
    category?: string
    provider?: string // 'reddit' | 'youtube' | 'search_engines' | etc.
    subreddit?: string
    limit?: number
  }): Promise<{
    provider: string
    status: string
    is_connected: boolean
    message: string
    total_found: number
    signals: AudienceSignalRecord[]
  }> {
    const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/audience/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify(params),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || 'Erro ao buscar sinais públicos na audiência')
    }

    return await res.json()
  },

  // 3. Obter Sinais Salvos
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

  // 4. Obter Termos de Intenção do Banco
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

  // 5. Obter Fila de Oportunidades de Público
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

  // 6. Mini CRM de Leads Inbound
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
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/audience/inbound-lead/capture`,
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
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/audience/inbound-lead/revoke-consent`,
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

  // 7. Obter Relatório de Demanda Agregado
  async getDemandReport(periodDays = 30, category = ''): Promise<DemandReportResponse> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/audience/demand-report`,
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
