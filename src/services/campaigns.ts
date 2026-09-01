import pb from '@/lib/pocketbase/client'
import type {
  CampaignRecord,
  CampaignVariation,
  GenerateFullCampaignResponse,
  ComplianceReviewReport,
  CampaignHookItem,
} from '@/types/campaign'

const BASE_URL = import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`

export const campaignService = {
  /**
   * Generates a 1-click comprehensive campaign using the Skip Cloud AI fast tier
   */
  async generateFullCampaign(productData: {
    product_id?: string
    discovered_id?: string
    title: string
    category?: string
    platform?: string
    price?: number
    promo_price?: number
    commission_rate?: number
    commission_amount?: number
    product_url?: string
    affiliate_url?: string
    image_url?: string
    sales_count?: number
    reviews_count?: number
    rating?: number
    seller?: string
    opportunity_score?: number
    opportunity_level?: string
    ai_analysis?: string
    ai_summary?: string
  }): Promise<GenerateFullCampaignResponse> {
    const genericTitle = !productData.title?.trim() || /^produto\s+(shopee|mercado livre|amazon)?$/i.test(productData.title.trim())
    const missingImage = !productData.image_url?.trim()
    const missingPrice = !((productData.price || 0) > 0 || (productData.promo_price || 0) > 0)
    const missingLink = !(productData.affiliate_url || productData.product_url)
    if (genericTitle || missingImage || missingPrice || missingLink) {
      throw new Error('Produto não validado: confirme título, foto, preço e link antes de gerar campanha.')
    }

    const token = pb.authStore.token
    const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/campaign-generate`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(productData),
    })

    const payload = await res.json()
    if (!res.ok) {
      throw new Error(payload?.error || 'Erro ao gerar campanha completa')
    }

    return payload as GenerateFullCampaignResponse
  },

  /**
   * Audits campaign copy / hook / CTA with the Campaign Compliance Auditor
   */
  async reviewCompliance(data: {
    content?: string
    copy_text?: string
    product_title?: string
    product_price?: number
    hook_text?: string
    cta_text?: string
  }): Promise<ComplianceReviewReport> {
    const token = pb.authStore.token
    const res = await fetch(`${BASE_URL}/backend/v1/campaigns/review-compliance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(data),
    })

    const payload = await res.json()
    if (!res.ok) {
      throw new Error(payload?.error || 'Erro ao auditar conformidade da campanha')
    }

    return payload as ComplianceReviewReport
  },

  /**
   * Generates custom channel/format copies or scripts
   */
  async generateFormatCopy(data: {
    product_title: string
    product_price?: number
    category?: string
    angle_title?: string
    target_audience?: string
    channel: string
    format: string
    custom_instruction?: string
  }): Promise<{
    channel: string
    format: string
    headline: string
    hook: string
    body: string
    cta: string
    video_scenes?: Array<{
      scene_number: number
      time_range: string
      visual_action: string
      on_screen_text: string
      narration: string
      duration_sec: number
    }>
    estimated_score: number
    tips?: string
  }> {
    const token = pb.authStore.token
    const res = await fetch(`${BASE_URL}/backend/v1/campaigns/generate-format`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(data),
    })

    const payload = await res.json()
    if (!res.ok) {
      throw new Error(payload?.error || 'Erro ao gerar copy do formato')
    }

    return payload
  },

  /**
   * Generates 10 distinct creative hooks bank
   */
  async generateHooksBank(data: {
    product_title: string
    product_price?: number
    category?: string
    target_audience?: string
  }): Promise<CampaignHookItem[]> {
    const token = pb.authStore.token
    const res = await fetch(`${BASE_URL}/backend/v1/campaigns/generate-hooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(data),
    })

    const payload = await res.json()
    if (!res.ok) {
      throw new Error(payload?.error || 'Erro ao gerar banco de ganchos')
    }

    return payload.hooks || []
  },

  /**
   * Saves or updates a campaign in the database
   */
  async saveCampaign(
    campaignData: Partial<CampaignRecord> & { variations?: CampaignVariation[] },
  ): Promise<{
    success: boolean
    campaign_id: string
    message: string
  }> {
    const variations = campaignData.variations || []
    const campaignPayload = { ...campaignData } as Record<string, any>
    delete campaignPayload.variations
    delete campaignPayload.id
    delete campaignPayload.created
    delete campaignPayload.updated
    delete campaignPayload.collectionId
    delete campaignPayload.collectionName

    const existingId = campaignData.id
    const campaign = existingId
      ? await pb.collection('campaigns').update<CampaignRecord>(existingId, campaignPayload)
      : await pb.collection('campaigns').create<CampaignRecord>(campaignPayload)

    if (variations.length > 0) {
      const current = await pb.collection('campaign_variations').getFullList<CampaignVariation>({
        filter: `campaign_id = "${campaign.id}"`,
      })
      for (const old of current) {
        if (old.id) await pb.collection('campaign_variations').delete(old.id)
      }
      for (const variation of variations) {
        const payload = { ...variation, campaign_id: campaign.id } as Record<string, any>
        delete payload.id
        delete payload.created
        delete payload.updated
        await pb.collection('campaign_variations').create(payload)
      }
    }

    return {
      success: true,
      campaign_id: campaign.id,
      message: existingId ? 'Campanha atualizada com sucesso' : 'Campanha salva com sucesso',
    }
  },

  /**
   * Fetches all user campaigns with filtering & sorting
   */
  async getCampaigns(
    filter?: string,
    sort = '-created',
    page = 1,
    perPage = 50,
  ): Promise<{
    items: CampaignRecord[]
    totalItems: number
    totalPages: number
  }> {
    try {
      const res = await pb.collection('campaigns').getList<CampaignRecord>(page, perPage, {
        filter: filter || '',
        sort: sort,
      })

      // Fetch variations for each campaign if needed
      return {
        items: res.items,
        totalItems: res.totalItems,
        totalPages: res.totalPages,
      }
    } catch (err) {
      console.error('Error fetching campaigns list:', err)
      return { items: [], totalItems: 0, totalPages: 0 }
    }
  },

  /**
   * Fetches a single campaign by ID with all its variations
   */
  async getCampaignById(id: string): Promise<CampaignRecord | null> {
    try {
      const campaign = await pb.collection('campaigns').getOne<CampaignRecord>(id)
      const variations = await pb.collection('campaign_variations').getFullList<CampaignVariation>({
        filter: `campaign_id = "${id}"`,
        sort: 'version_letter',
      })
      return {
        ...campaign,
        variations,
      }
    } catch (err) {
      console.error('Error fetching campaign by ID:', err)
      return null
    }
  },

  /**
   * Deletes a campaign and its associated variations (cascade)
   */
  async deleteCampaign(id: string): Promise<boolean> {
    try {
      await pb.collection('campaigns').delete(id)
      return true
    } catch (err) {
      console.error('Error deleting campaign:', err)
      throw err
    }
  },

  /**
   * Fetches count and best pre-test score of campaigns for a specific product
   */
  async getProductCampaignStats(
    productId?: string,
    discoveredId?: string,
  ): Promise<{
    count: number
    best_score: number
  }> {
    if (!productId && !discoveredId) return { count: 0, best_score: 0 }
    try {
      const token = pb.authStore.token
      const params = new URLSearchParams()
      if (productId) params.set('product_id', productId)
      if (discoveredId) params.set('discovered_id', discoveredId)

      const res = await fetch(
        `${BASE_URL}/backend/v1/campaigns/stats-by-product?${params.toString()}`,
        {
          headers: {
            ...(token ? { Authorization: token } : {}),
          },
        },
      )
      if (!res.ok) return { count: 0, best_score: 0 }
      return await res.json()
    } catch (_) {
      return { count: 0, best_score: 0 }
    }
  },
}
