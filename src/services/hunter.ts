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

const BASE_URL = import.meta.env.VITE_BACKEND_URL || `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/radar-api`

async function importOfficialProduct(url: string, product: DiscoveredProductRecord, fallback: string) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` }, body: JSON.stringify(product) })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.success) throw new Error(data?.error || fallback)
  return data as { success: boolean; message: string; product: ProductRecord }
}

export const hunterService = {
  async searchMarketplace(filters: HunterSearchFilters): Promise<HunterSearchResult> {
    const isMercadoLivre = !filters.marketplace || filters.marketplace === 'Mercado Livre'
    const isShopee = filters.marketplace === 'Shopee'
    const isTikTok = filters.marketplace === 'TikTok Shop'
    const url = isMercadoLivre ? '/api/mercadolivre/search' : isShopee ? '/api/shopee/search' : isTikTok ? '/api/tiktok/search' : `${BASE_URL}/backend/v1/hunter/search`
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` }, body: JSON.stringify(filters) })
    const raw = await res.text(); let data: any = {}
    try { data = raw ? JSON.parse(raw) : {} } catch { data = { message: raw || `Resposta inválida do servidor (HTTP ${res.status}).` } }
    if (!res.ok) throw new Error(data.message || data.error || `Erro ao buscar produtos (${res.status})`)
    return data as HunterSearchResult
  },

  async importMercadoLivreProduct(product: DiscoveredProductRecord) { return importOfficialProduct('/api/mercadolivre/import', product, 'Não foi possível adicionar o produto ao Radar.') },
  async importShopeeProduct(product: DiscoveredProductRecord) { return importOfficialProduct('/api/shopee/import', product, 'Não foi possível adicionar o produto Shopee ao Radar.') },
  async importTikTokShopProduct(product: DiscoveredProductRecord) { return importOfficialProduct('/api/tiktok/import', product, 'Não foi possível adicionar o produto TikTok Shop ao Radar.') },

  async findForMe(prompt: string): Promise<InterpretedFiltersResult> {
    const fallback = (): InterpretedFiltersResult => {
      const text = prompt.trim(); const lower = text.toLowerCase()
      const maxPriceMatch = lower.match(/(?:até|ate|max(?:imo)?|menos de)\s*r?\$?\s*(\d+[\d.,]*)/) || lower.match(/r?\$?\s*(\d+[\d.,]*)\s*(?:ou menos|no máximo|no maximo)/)
      const minPriceMatch = lower.match(/(?:acima de|mais de|mínimo|minimo|a partir de)\s*r?\$?\s*(\d+[\d.,]*)/)
      const minSalesMatch = lower.match(/(?:pelo menos|mínimo|minimo|mais de)\s*(\d+)\s*(?:vendas?|vendidos?)/)
      const ratingMatch = lower.match(/(?:nota|avaliação|avaliacao)\s*(?:mínima|minima|acima de|de)?\s*(\d(?:[.,]\d)?)/)
      const toNumber = (raw?: string) => raw ? Number(raw.replace(/\./g, '').replace(',', '.')) : undefined
      const cleaned = text.replace(/(?:até|ate|max(?:imo)?|menos de|acima de|mais de|mínimo|minimo|a partir de)\s*r?\$?\s*\d+[\d.,]*/gi, ' ').replace(/(?:pelo menos|mínimo|minimo|mais de)\s*\d+\s*(?:vendas?|vendidos?)/gi, ' ').replace(/(?:nota|avaliação|avaliacao)\s*(?:mínima|minima|acima de|de)?\s*\d(?:[.,]\d)?/gi, ' ').replace(/\s+/g, ' ').trim()
      return { query: cleaned || text, category: '', min_price: toNumber(minPriceMatch?.[1]), max_price: toNumber(maxPriceMatch?.[1]), min_sales: minSalesMatch ? Number(minSalesMatch[1]) : undefined, min_rating: ratingMatch ? Number(ratingMatch[1].replace(',', '.')) : undefined, estimated_commission_rate: undefined, ai_intent_summary: 'Busca interpretada localmente e enviada para a API oficial do marketplace.' }
    }
    try {
      const res = await fetch(`${BASE_URL}/backend/v1/hunter/find-for-me`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` }, body: JSON.stringify({ prompt }) })
      if (!res.ok) { const err = await res.json().catch(() => ({})); const msg = String(err?.error || err?.message || ''); if (res.status === 404 || /rota não encontrada|route not found|not found/i.test(msg)) return fallback(); throw new Error(msg || 'Erro ao interpretar intenção em linguagem natural') }
      const data = await res.json(); return data.interpreted_filters || fallback()
    } catch (err: any) { const msg = String(err?.message || ''); if (/rota não encontrada|route not found|failed to fetch|not found/i.test(msg)) return fallback(); throw err }
  },

  async whyAiPicked(productId: string, isDiscovered = true): Promise<HunterWhyAiPickedResult> {
    const res = await fetch(`${BASE_URL}/backend/v1/hunter/why-ai-picked`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` }, body: JSON.stringify({ id: productId, is_discovered: isDiscovered }) })
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Erro ao carregar análise detalhada da IA') }
    return await res.json()
  },
  async approveProduct(discoveredId: string): Promise<{ success: boolean; message: string; product: ProductRecord }> {
    const res = await fetch(`${BASE_URL}/backend/v1/hunter/approve`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pb.authStore.token}` }, body: JSON.stringify({ id: discoveredId }) })
    if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Erro ao aprovar produto para o Radar') }
    return await res.json()
  },
  async discardProduct(discoveredId: string) { const res=await fetch(`${BASE_URL}/backend/v1/hunter/discard`, { method:'POST', headers:{'Content-Type':'application/json',Authorization:`Bearer ${pb.authStore.token}`}, body:JSON.stringify({id:discoveredId}) }); if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.error||'Erro ao descartar produto')} return await res.json() },
  async getDiscoveredProducts(status: 'pending' | 'approved' | 'discarded' | 'all' = 'pending', limit = 50) { const filter=status==='all'?'':`status = '${status}'`; const res=await pb.collection<DiscoveredProductRecord>('discovered_products').getList(1,limit,{filter,sort:'-opportunity_score,-created'}); return res.items },
  async getTopOpportunitiesToday(limit = 5) { const res=await pb.collection<DiscoveredProductRecord>('discovered_products').getList(1,limit,{sort:'-opportunity_score'}); return res.items },
}

export const watchlistService = {
  async getWatchlist(): Promise<WatchlistItemRecord[]> { const res=await fetch(`${BASE_URL}/backend/v1/watchlist/items`,{headers:{Authorization:`Bearer ${pb.authStore.token}`}}); if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.error||'Erro ao carregar itens da Watchlist')} const data=await res.json(); return data.items||[] },
  async toggleWatchlist(item: { external_id:string; platform?:string; title:string; image_url?:string; product_url?:string; category?:string; price?:number; commission_rate?:number; commission_amount?:number; sales_count?:number; rating?:number; opportunity_score?:number; discovered_id?:string; product_id?:string }) { const res=await fetch(`${BASE_URL}/backend/v1/watchlist/toggle`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${pb.authStore.token}`},body:JSON.stringify(item)}); if(!res.ok){const err=await res.json().catch(()=>({}));throw new Error(err.error||'Erro ao atualizar Watchlist')} return await res.json() },
  async getSnapshots(externalId:string) { const res=await pb.collection<ProductSnapshotRecord>('product_snapshots').getList(1,20,{filter:`external_id = '${externalId}'`,sort:'-created'}); return res.items },
}
