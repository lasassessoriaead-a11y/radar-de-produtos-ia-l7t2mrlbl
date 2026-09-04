import pb from '@/lib/pocketbase/client'
import type { ProductRecord, AiInsightRecord } from '@/types/product'

function authHeaders() {
  return { Authorization: `Bearer ${pb.authStore.token}` }
}

export const getProductById = async (id: string): Promise<ProductRecord> => {
  return await productsService.getProductById(id)
}

export const deleteProduct = async (id: string): Promise<boolean> => {
  return await productsService.deleteProduct(id)
}

export const askAiAnalyst = async (question: string, productId?: string) => {
  return await aiService.askAnalyst(question, productId)
}

export const productsService = {
  async getProducts(filter = '', sort = '-opportunity_score', page = 1, perPage = 100): Promise<{ items: ProductRecord[]; totalItems: number }> {
    const params = new URLSearchParams({ sort, page: String(page), perPage: String(perPage) })
    const res = await fetch(`/api/products?${params.toString()}`, { headers: authHeaders() })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.error || 'Erro ao carregar produtos do Radar')
    return { items: data.items || [], totalItems: Number(data.totalItems || 0) }
  },

  async getProductById(id: string): Promise<ProductRecord> {
    const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, { headers: authHeaders() })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.error || 'Produto não encontrado')
    return data.product as ProductRecord
  },

  async createShopeeTrackingLink(productId: string, channel = 'radar') {
    const res = await fetch('/api/shopee/tracking-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ product_id: productId, channel }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) throw new Error(data?.error || 'Não foi possível gerar o link rastreável da Shopee')
    return data as { success: boolean; short_link: string; sub_ids: string[]; tracking_link: any; message: string }
  },

  async createProduct(data: Partial<ProductRecord>): Promise<ProductRecord> {
    return await pb.collection<ProductRecord>('products').create(data)
  },
  async updateProduct(id: string, data: Partial<ProductRecord>): Promise<ProductRecord> {
    return await pb.collection<ProductRecord>('products').update(id, data)
  },
  async deleteProduct(id: string): Promise<boolean> {
    return await pb.collection('products').delete(id)
  },
  async batchCreateProducts(items: Array<Partial<ProductRecord>>): Promise<{ created: number; errors: number }> {
    let created = 0
    let errors = 0
    for (const item of items) {
      try { await pb.collection('products').create(item); created++ }
      catch (err) { console.error('Failed to create product in batch:', err); errors++ }
    }
    return { created, errors }
  },
}

export const aiService = {
  async getInsights(): Promise<AiInsightRecord | null> {
    try {
      const records = await pb.collection<AiInsightRecord>('ai_insights').getList(1, 1, { sort: '-created' })
      return records.items[0] || null
    } catch { return null }
  },
  async generateRecommendations(): Promise<{ recommendation_text: string; top_picks: Array<{ id?: string; title: string; score: number; reason: string }> }> {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`}/backend/v1/radar/ai-recommendations`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
    })
    if (!res.ok) throw new Error(`Falha ao gerar recomendações: ${res.status}`)
    return await res.json()
  },
  async askAnalyst(question: string, productId?: string, conversationId?: string | null): Promise<{ answer: string; conversation_id: string }> {
    const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`}/backend/v1/radar/ask-analyst`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: pb.authStore.token },
      body: JSON.stringify({ question, product_id: productId, conversation_id: conversationId }),
    })
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Erro ao consultar o analista IA') }
    return await res.json()
  },
}
