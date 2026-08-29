import pb from '@/lib/pocketbase/client'
import type {
  PublicationRecord,
  TrackingLinkRecord,
  ChannelConnectionRecord,
  ConversionRecord,
  CampaignCostRecord,
  AuditLogRecord,
  PerformanceSummaryResponse,
  AiPerformanceInsightsResponse,
} from '@/types/publishing'

const BASE_URL = import.meta.env.VITE_POCKETBASE_URL || ''

export const publishingService = {
  // Publications
  async getPublications(filter = '', sort = '-created', page = 1, perPage = 30) {
    return await pb.collection('publications').getList<PublicationRecord>(page, perPage, {
      filter,
      sort,
      expand: 'campaign_id',
    })
  },

  async createPublication(data: Partial<PublicationRecord>) {
    return await pb.collection('publications').create<PublicationRecord>(data)
  },

  async updatePublication(id: string, data: Partial<PublicationRecord>) {
    return await pb.collection('publications').update<PublicationRecord>(id, data)
  },

  async deletePublication(id: string) {
    return await pb.collection('publications').delete(id)
  },

  // Channels
  async getChannelConnections() {
    return await pb.collection('channel_connections').getFullList<ChannelConnectionRecord>({
      sort: '-created',
    })
  },

  async testTelegramConnection(botToken: string, chatId: string) {
    const res = await fetch(`${BASE_URL}/backend/v1/channels/telegram/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify({
        bot_token: botToken,
        chat_id: chatId,
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Falha ao testar conexão com Telegram')
    return data
  },

  async saveTelegramConnection(
    botToken: string,
    chatId: string,
    botUsername?: string,
    displayName?: string,
  ) {
    const res = await fetch(`${BASE_URL}/backend/v1/channels/telegram/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify({
        bot_token: botToken,
        chat_id: chatId,
        bot_username: botUsername,
        display_name: displayName || 'Telegram Canal Oficial',
      }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Falha ao salvar conexão com Telegram')
    return data
  },

  // Telegram Direct Publication
  async publishToTelegram(payload: {
    campaign_id: string
    publication_id?: string
    variation_id?: string
    creative_id?: string
    product_id?: string
    image_url?: string
    copy_text: string
    cta_text?: string
    tracking_url: string
    destination_url?: string
    price?: number
    promo_price?: number
  }) {
    const res = await fetch(`${BASE_URL}/backend/v1/publish/telegram`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Falha ao publicar no Telegram')
    return data
  },

  // Manual Publication Mark
  async markManualPublication(payload: {
    campaign_id: string
    variation_id?: string
    creative_id?: string
    product_id?: string
    channel: string
    channel_type?: string
    post_url?: string
    copy_used?: string
    cta_used?: string
    creative_image_url?: string
    tracking_url?: string
    tracking_link_id?: string
    price_at_publish?: number
    published_at?: string
    checklist_snapshot?: Record<string, unknown>
  }) {
    const res = await fetch(`${BASE_URL}/backend/v1/publish/manual-mark`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Falha ao registrar publicação manual')
    return data
  },

  // Tracking Links & UTM Generator
  async createOrGetTrackingLink(payload: {
    campaign_id?: string
    variation_id?: string
    creative_id?: string
    product_id?: string
    publication_id?: string
    channel: string
    destination_url: string
    version_letter?: string
    title?: string
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_content?: string
    utm_term?: string
  }): Promise<{
    success: boolean
    tracking_link_id: string
    slug: string
    short_url: string
    sub_id: string
    destination_url: string
    raw_clicks: number
    valid_clicks: number
  }> {
    const res = await fetch(`${BASE_URL}/backend/v1/tracking/create-or-get`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Falha ao gerar link de tracking')
    return data
  },

  async getTrackingLinks(filter = '', sort = '-created') {
    return await pb.collection('tracking_links').getFullList<TrackingLinkRecord>({
      filter,
      sort,
    })
  },

  // Conversions Engine
  async importConversionsCsv(rows: Array<Record<string, unknown>>) {
    const res = await fetch(`${BASE_URL}/backend/v1/conversions/import-csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify({ rows }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Falha ao importar conversões do CSV')
    return data
  },

  async createManualConversion(payload: {
    sale_amount: number
    commission_amount: number
    product_id?: string
    campaign_id?: string
    variation_id?: string
    creative_id?: string
    publication_id?: string
    tracking_link_id?: string
    sub_id?: string
    external_order_id?: string
    channel?: string
    status?: string
    conversion_date?: string
    notes?: string
  }) {
    const res = await fetch(`${BASE_URL}/backend/v1/conversions/create-manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Falha ao criar conversão manual')
    return data
  },

  async getConversions(filter = '', sort = '-conversion_date', page = 1, perPage = 50) {
    return await pb.collection('conversions').getList<ConversionRecord>(page, perPage, {
      filter,
      sort,
    })
  },

  // Costs
  async getCosts(filter = '', sort = '-date') {
    return await pb.collection('campaign_costs').getFullList<CampaignCostRecord>({
      filter,
      sort,
    })
  },

  async createCost(data: Partial<CampaignCostRecord>) {
    return await pb.collection('campaign_costs').create<CampaignCostRecord>(data)
  },

  async deleteCost(id: string) {
    return await pb.collection('campaign_costs').delete(id)
  },

  // Performance Summary
  async getPerformanceSummary(): Promise<PerformanceSummaryResponse> {
    const res = await fetch(`${BASE_URL}/backend/v1/performance/summary`, {
      method: 'GET',
      headers: {
        Authorization: pb.authStore.token,
      },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Falha ao buscar resumo de performance')
    return data
  },

  // AI Performance Insights
  async getAiPerformanceInsights(payload: {
    stats: any
    variations: any[]
    products: any[]
  }): Promise<AiPerformanceInsightsResponse> {
    const res = await fetch(`${BASE_URL}/backend/v1/performance/ai-insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Falha ao gerar insights da IA')
    return data
  },

  // Audit Logs
  async getAuditLogs(limit = 40) {
    return await pb.collection('audit_logs').getList<AuditLogRecord>(1, limit, {
      sort: '-created',
    })
  },
}
