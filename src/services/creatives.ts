import pb from '@/lib/pocketbase/client'
import type {
  CreativeRecord,
  CreativeVersionRecord,
  CreativeAssetRecord,
  BrandKitRecord,
  VisualConcept,
  StoryboardScene,
  CreativeReviewReport,
  CommercialValidation,
  ProviderStatusResponse,
  CreativeFormatType,
} from '@/types/creative'

const BASE_URL = import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`

export const creativeService = {
  /**
   * Checks real API provider status (OpenAI image config, video status)
   */
  async getProviderStatus(): Promise<ProviderStatusResponse> {
    try {
      const token = pb.authStore.token
      const res = await fetch(`${BASE_URL}/backend/v1/creatives/provider-status`, {
        headers: {
          ...(token ? { Authorization: token } : {}),
        },
      })
      if (!res.ok) {
        return {
          active_provider: 'none',
          openai_configured: false,
          supported_providers: [
            {
              id: 'openai',
              name: 'OpenAI (DALL-E 3 / gpt-image-1)',
              configured: false,
              description: 'Geração real de imagens e cenários publicitários em alta resolução.',
            },
          ],
          video_generation: {
            configured: false,
            provider: 'none',
            message: 'Geração automática de vídeo ainda não configurada.',
          },
          narration_generation: {
            configured: false,
            provider: 'none',
            message: 'Geração automática de voz por IA não configurada.',
          },
        }
      }
      return await res.json()
    } catch (_) {
      return {
        active_provider: 'none',
        openai_configured: false,
        supported_providers: [],
        video_generation: {
          configured: false,
          provider: 'none',
          message: 'Geração automática de vídeo ainda não configurada.',
        },
        narration_generation: {
          configured: false,
          provider: 'none',
          message: 'Geração automática de voz por IA não configurada.',
        },
      }
    }
  },

  /**
   * Generates strategic visual concept before image generation
   */
  async generateVisualConcept(params: {
    product_title: string
    product_category?: string
    target_audience?: string
    angle_title?: string
    hook_text?: string
    copy_text?: string
    cta_text?: string
    variation_letter: 'A' | 'B' | 'C'
    hypothesis_type: string
    format?: string
    brand_style?: string
  }): Promise<VisualConcept> {
    const token = pb.authStore.token
    const res = await fetch(`${BASE_URL}/backend/v1/creatives/generate-concept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(params),
    })

    const payload = await res.json()
    if (!res.ok) {
      throw new Error(payload?.error || 'Erro ao gerar conceito visual')
    }

    return payload as VisualConcept
  },

  /**
   * Generates REAL Image with OpenAI API.
   * If OPENAI_API_KEY is missing, fails clearly without simulation.
   */
  async generateOpenAiImage(params: {
    prompt: string
    size?: string // 1024x1024, 1024x1792, 1792x1024
    quality?: 'standard' | 'hd'
    style?: 'natural' | 'vivid'
    generation_type?: string
  }): Promise<{
    success: boolean
    image_url: string
    revised_prompt: string
    provider: string
    model: string
    is_ai_generated: boolean
    fidelity_disclaimer_required: boolean
  }> {
    const token = pb.authStore.token
    const res = await fetch(`${BASE_URL}/backend/v1/creatives/generate-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(params),
    })

    const payload = await res.json()
    if (!res.ok) {
      throw new Error(payload?.error || 'Erro ao gerar imagem na OpenAI')
    }

    return payload
  },

  /**
   * Audits creative visual hierarchy, text density, fidelity and ethics
   */
  async reviewQuality(params: {
    product_title: string
    product_price?: number
    promo_price?: number
    angle_title?: string
    hook_text?: string
    headline?: string
    subheadline?: string
    benefit?: string
    cta_text?: string
    price_text?: string
    format?: string
    is_ai_generated?: boolean
    has_original_image?: boolean
  }): Promise<CreativeReviewReport> {
    const token = pb.authStore.token
    const res = await fetch(`${BASE_URL}/backend/v1/creatives/review-quality`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(params),
    })

    const payload = await res.json()
    if (!res.ok) {
      throw new Error(payload?.error || 'Erro ao auditar criativo')
    }

    return payload as CreativeReviewReport
  },

  /**
   * Revalidates commercial criteria before "Pronto para Publicar"
   */
  async revalidateCommercial(params: {
    product_id?: string
    discovered_id?: string
    campaign_id?: string
  }): Promise<CommercialValidation> {
    const token = pb.authStore.token
    const res = await fetch(`${BASE_URL}/backend/v1/creatives/revalidate-commercial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(params),
    })

    const payload = await res.json()
    if (!res.ok) {
      throw new Error(payload?.error || 'Erro ao revalidar comercialmente')
    }

    return payload as CommercialValidation
  },

  /**
   * Generates structured video storyboard and subtitles
   */
  async generateStoryboard(params: {
    product_title: string
    product_category?: string
    target_audience?: string
    angle_title?: string
    hook_text?: string
    cta_text?: string
    duration?: number
    channel?: string
  }): Promise<{
    total_duration_sec: number
    narrative_arc: string
    scenes: StoryboardScene[]
    full_narration_script: string
    full_auto_subtitles: string
    retention_tips: string
  }> {
    const token = pb.authStore.token
    const res = await fetch(`${BASE_URL}/backend/v1/creatives/generate-storyboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(params),
    })

    const payload = await res.json()
    if (!res.ok) {
      throw new Error(payload?.error || 'Erro ao gerar storyboard de vídeo')
    }

    return payload
  },

  /**
   * Saves or updates a creative project in PocketBase
   */
  async saveCreative(creativeData: Partial<CreativeRecord>): Promise<{
    success: boolean
    creative_id: string
    message: string
  }> {
    const token = pb.authStore.token
    const res = await fetch(`${BASE_URL}/backend/v1/creatives/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(creativeData),
    })

    const payload = await res.json()
    if (!res.ok) {
      throw new Error(payload?.error || 'Erro ao salvar projeto criativo')
    }

    return payload
  },

  /**
   * Creates a new version (V2, V3...) without overwriting previous history
   */
  async createNewVersion(params: {
    creative_id: string
    change_summary: string
    image_url?: string
    image_prompt?: string
    text_layers?: Record<string, unknown>
    video_storyboard?: unknown[]
    creative_score?: number
    review_status?: string
  }): Promise<{
    success: boolean
    version_number: number
    version_id: string
  }> {
    const token = pb.authStore.token
    const res = await fetch(`${BASE_URL}/backend/v1/creatives/create-version`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify(params),
    })

    const payload = await res.json()
    if (!res.ok) {
      throw new Error(payload?.error || 'Erro ao salvar nova versão')
    }

    return payload
  },

  /**
   * Lists all creatives with optional filter
   */
  async getCreatives(
    filter?: string,
    sort = '-created',
    page = 1,
    perPage = 50,
  ): Promise<{ items: CreativeRecord[]; totalItems: number; totalPages: number }> {
    try {
      const res = await pb.collection('creatives').getList<CreativeRecord>(page, perPage, {
        filter: filter || '',
        sort: sort,
      })
      return {
        items: res.items,
        totalItems: res.totalItems,
        totalPages: res.totalPages,
      }
    } catch (err) {
      console.error('Error fetching creatives list:', err)
      return { items: [], totalItems: 0, totalPages: 0 }
    }
  },

  /**
   * Fetches single creative by ID with versions history
   */
  async getCreativeById(id: string): Promise<CreativeRecord | null> {
    try {
      const creative = await pb.collection('creatives').getOne<CreativeRecord>(id)
      const versions = await pb.collection('creative_versions').getFullList<CreativeVersionRecord>({
        filter: `creative_id = "${id}"`,
        sort: '-version_number',
      })
      return {
        ...creative,
        versions,
      }
    } catch (err) {
      console.error('Error fetching creative by ID:', err)
      return null
    }
  },

  /**
   * Deletes a creative and cascade versions
   */
  async deleteCreative(id: string): Promise<boolean> {
    try {
      await pb.collection('creatives').delete(id)
      return true
    } catch (err) {
      console.error('Error deleting creative:', err)
      throw err
    }
  },

  // ---------------- BRAND KIT OPERATIONS ----------------

  async getBrandKit(): Promise<BrandKitRecord | null> {
    try {
      const records = await pb.collection('brand_kits').getList<BrandKitRecord>(1, 1, {
        sort: '-updated',
      })
      return records.items[0] || null
    } catch (_) {
      return null
    }
  },

  async saveBrandKit(data: Partial<BrandKitRecord>): Promise<BrandKitRecord> {
    const userId = pb.authStore.record?.id
    if (data.id) {
      return await pb.collection('brand_kits').update<BrandKitRecord>(data.id, data)
    } else {
      return await pb.collection('brand_kits').create<BrandKitRecord>({
        ...data,
        user_id: userId,
      })
    }
  },

  // ---------------- ASSETS LIBRARY OPERATIONS ----------------

  async getAssets(filter?: string): Promise<CreativeAssetRecord[]> {
    try {
      const res = await pb.collection('creative_assets').getFullList<CreativeAssetRecord>({
        filter: filter || '',
        sort: '-created',
      })
      return res
    } catch (_) {
      return []
    }
  },

  async saveAsset(data: Partial<CreativeAssetRecord>): Promise<CreativeAssetRecord> {
    const userId = pb.authStore.record?.id
    return await pb.collection('creative_assets').create<CreativeAssetRecord>({
      ...data,
      user_id: userId,
    })
  },

  async deleteAsset(id: string): Promise<boolean> {
    try {
      await pb.collection('creative_assets').delete(id)
      return true
    } catch (err) {
      console.error('Error deleting asset:', err)
      throw err
    }
  },
}
