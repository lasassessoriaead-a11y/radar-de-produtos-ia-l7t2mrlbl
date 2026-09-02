import pb from '@/lib/pocketbase/client'
import type {
  DiscoveredProductRecord,
  ProductSnapshotRecord,
  WatchlistItemRecord,
  HunterSearchFilters,
  HunterSearchResult,
  HunterWhyAiPickedResult,
  InterpretedFiltersResult,
  ProductRecord,
} from '@/types/product'

const BASE_URL =
  import.meta.env.VITE_BACKEND_URL ||
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`

export const hunterService = {
  /**
   * Search real products on Mercado Livre API or other future marketplace adapters
   */
  async searchMarketplace(filters: HunterSearchFilters): Promise<HunterSearchResult> {
    const isMercadoLivre = !filters.marketplace || filters.marketplace === 'Mercado Livre'
    const url = isMercadoLivre
      ? '/api/mercadolivre/search'
      : `${BASE_URL}/backend/v1/hunter/search`

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pb.authStore.token}`,
      },
      body: JSON.stringify(filters),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok && data?.status !== 'token_required') {
      throw new Error(data.error || data.message || `Erro ao buscar produtos (${res.status})`)
    }

    return data as HunterSearchResult
  },

  async importMercadoLivreProduct(product: DiscoveredProductRecord): Promise<{
    success: boolean
    message: string
    product: ProductRecord
  }> {
    const res = await fetch('/api/mercadolivre/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pb.authStore.token}`,
      },
      body: JSON.stringify(product),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data?.success) {
      throw new Error(data?.error || 'Não foi possível adicionar o produto ao Radar.')
    }
    return data
  },

  /**
   * Natural language parse of search intent into structured search filters
   */
  async findForMe(prompt: string): Promise<InterpretedFiltersResult> {
    const res = await fetch(`${BASE_URL}/backend/v1/hunter/find-for-me`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pb.authStore.token}`,
      },
      body: JSON.stringify({ prompt }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Erro ao interpretar intenção em linguagem natural')
    }

    const data = await res.json()
    return data.interpreted_filters
  },

  /**
   * Explains why AI picked/recommended the product with structured SWOT / Audience / Angle
   */
  async whyAiPicked(productId: string, isDiscovered = true): Promise<HunterWhyAiPickedResult> {
    const res = await fetch(`${BASE_URL}/backend/v1/hunter/why-ai-picked`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pb.authStore.token}`,
      },
      body: JSON.stringify({ id: productId, is_discovered: isDiscovered }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Erro ao carregar análise detalhada da IA')
    }

    return await res.json()
  },

  /**
   * Approve a discovered product and promote it to the main Radar
   */
  async approveProduct(
    discoveredId: string,
  ): Promise<{ success: boolean; message: string; product: ProductRecord }> {
    const res = await fetch(`${BASE_URL}/backend/v1/hunter/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pb.authStore.token}`,
      },
      body: JSON.stringify({ id: discoveredId }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Erro ao aprovar produto para o Radar')
    }

    return await res.json()
  },

  /**
   * Discard a discovered product
   */
  async discardProduct(discoveredId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${BASE_URL}/backend/v1/hunter/discard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pb.authStore.token}`,
      },
      body: JSON.stringify({ id: discoveredId }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Erro ao descartar produto')
    }

    return await res.json()
  },

  /**
   * Get all discovered products from collection
   */
  async getDiscoveredProducts(
    status: 'pending' | 'approved' | 'discarded' | 'all' = 'pending',
    limit = 50,
  ): Promise<DiscoveredProductRecord[]> {
    const filter = status === 'all' ? '' : `status = '${status}'`
    const res = await pb
      .collection<DiscoveredProductRecord>('discovered_products')
      .getList(1, limit, {
        filter,
        sort: '-opportunity_score,-created',
      })
    return res.items
  },

  /**
   * Get top opportunities found today
   */
  async getTopOpportunitiesToday(limit = 5): Promise<DiscoveredProductRecord[]> {
    const res = await pb
      .collection<DiscoveredProductRecord>('discovered_products')
      .getList(1, limit, {
        sort: '-opportunity_score',
      })
    return res.items
  },
}

export const watchlistService = {
  /**
   * Get all watchlist items for the authenticated user with computed trend signals
   */
  async getWatchlist(): Promise<WatchlistItemRecord[]> {
    const res = await fetch(`${BASE_URL}/backend/v1/watchlist/items`, {
      headers: {
        Authorization: `Bearer ${pb.authStore.token}`,
      },
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Erro ao carregar itens da Watchlist')
    }

    const data = await res.json()
    return data.items || []
  },

  /**
   * Toggle item in/out of watchlist
   */
  async toggleWatchlist(item: {
    external_id: string
    platform?: string
    title: string
    image_url?: string
    product_url?: string
    category?: string
    price?: number
    commission_rate?: number
    commission_amount?: number
    sales_count?: number
    rating?: number
    opportunity_score?: number
    discovered_id?: string
    product_id?: string
  }): Promise<{ success: boolean; action: 'added' | 'removed'; message: string }> {
    const res = await fetch(`${BASE_URL}/backend/v1/watchlist/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pb.authStore.token}`,
      },
      body: JSON.stringify(item),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Erro ao atualizar Watchlist')
    }

    return await res.json()
  },

  /**
   * Fetch snapshots history for an external_id or product_id
   */
  async getSnapshots(externalId: string): Promise<ProductSnapshotRecord[]> {
    const res = await pb.collection<ProductSnapshotRecord>('product_snapshots').getList(1, 20, {
      filter: `external_id = '${externalId}'`,
      sort: '-created',
    })
    return res.items
  },
}
