import React, { useEffect, useState } from 'react'
import { Compass, Search, Sparkles, SlidersHorizontal, RefreshCw, ShieldCheck, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DiscoveredProductCard } from '@/components/DiscoveredProductCard'
import { hunterService, watchlistService } from '@/services/hunter'
import type { DiscoveredProductRecord, HunterSearchFilters } from '@/types/product'
import { toast } from 'sonner'

const RADAR_PRODUCTION_ORIGIN = 'https://radar-de-produtos-ia-l7t2mrlbl.vercel.app'

function ensureProductionOrigin() {
  if (typeof window === 'undefined') return true
  const host = window.location.hostname
  if (host.endsWith('.vercel.app') && window.location.origin !== RADAR_PRODUCTION_ORIGIN) {
    window.location.replace(RADAR_PRODUCTION_ORIGIN + window.location.pathname + window.location.search + window.location.hash)
    return false
  }
  return true
}

export default function HunterPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const [minPrice, setMinPrice] = useState<number | ''>('')
  const [maxPrice, setMaxPrice] = useState<number | ''>('')
  const [minSales, setMinSales] = useState<number | ''>('')
  const [minRating, setMinRating] = useState<number | ''>('')
  const [estimatedCommissionRate, setEstimatedCommissionRate] = useState<number | ''>('')
  const [marketplace, setMarketplace] = useState('Mercado Livre')
  const [limit, setLimit] = useState(30)
  const [nextOffset, setNextOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [searching, setSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [results, setResults] = useState<DiscoveredProductRecord[]>([])
  const [naturalPrompt, setNaturalPrompt] = useState('')
  const [parsing, setParsing] = useState(false)
  const [watchlistKeys, setWatchlistKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!ensureProductionOrigin()) return
    watchlistService.getWatchlist().then((items) => {
      const keys = new Set<string>()
      items.forEach((x) => { if (x.external_id) keys.add(x.external_id); if (x.title) keys.add(x.title) })
      setWatchlistKeys(keys)
    }).catch(() => {})
  }, [])

  const filters = (offset = 0): HunterSearchFilters => ({
    query, category, marketplace, limit, offset,
    min_price: typeof minPrice === 'number' ? minPrice : undefined,
    max_price: typeof maxPrice === 'number' ? maxPrice : undefined,
    min_sales: typeof minSales === 'number' ? minSales : undefined,
    min_rating: typeof minRating === 'number' ? minRating : undefined,
    estimated_commission_rate: typeof estimatedCommissionRate === 'number' ? estimatedCommissionRate : undefined,
  })

  const search = async (override?: Partial<HunterSearchFilters>) => {
    if (!query.trim() && category === 'Todas' && !override?.query) return toast.error('Informe uma palavra-chave para buscar.')
    setSearching(true)
    try {
      const res = await hunterService.searchMarketplace({ ...filters(0), ...override, offset: 0 })
      if (!res.success) return toast.error(res.message || `Falha na busca da ${marketplace}.`)
      setResults(res.products || [])
      setNextOffset(res.next_offset || res.products?.length || 0)
      setHasMore(Boolean(res.has_more))
      toast.success(`${res.products?.length || 0} produtos encontrados na ${marketplace}.`)
    } catch (e: any) { toast.error(e.message || 'Falha ao buscar produtos.') }
    finally { setSearching(false) }
  }

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const res = await hunterService.searchMarketplace(filters(nextOffset))
      if (!res.success) return toast.error(res.message || 'Não foi possível carregar mais.')
      setResults((prev) => {
        const seen = new Set(prev.map((p) => p.external_id || p.id))
        return [...prev, ...(res.products || []).filter((p) => !seen.has(p.external_id || p.id))]
      })
      setNextOffset(res.next_offset || nextOffset + (res.products?.length || 0))
      setHasMore(Boolean(res.has_more))
    } catch (e: any) { toast.error(e.message || 'Erro ao carregar mais produtos.') }
    finally { setLoadingMore(false) }
  }

  const findWithAi = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!naturalPrompt.trim()) return
    setParsing(true)
    try {
      const parsed = await hunterService.findForMe(naturalPrompt)
      setQuery(parsed.query || naturalPrompt)
      if (parsed.category) setCategory(parsed.category)
      await search({ query: parsed.query || naturalPrompt, category: parsed.category || category })
    } catch (e: any) { toast.error(e.message || 'Erro ao interpretar a busca.') }
    finally { setParsing(false) }
  }

  const approve = async (p: DiscoveredProductRecord) => {
    try {
      if (p.source === 'mercadolivre_api' || p.source === 'mercadolivre_catalog_api') await hunterService.importMercadoLivreProduct(p)
      else await hunterService.approveProduct(p.id)
      setResults((xs) => xs.map((x) => x.id === p.id ? { ...x, status: 'approved' } : x))
      toast.success('Produto salvo no Radar.')
    } catch (e: any) { toast.error(e.message || 'Erro ao salvar produto.') }
  }

  const discard = (p: DiscoveredProductRecord) => setResults((xs) => xs.filter((x) => x.id !== p.id))
  const why = () => toast.info('Análise detalhada disponível após salvar o produto no Radar.')
  const toggleWatch = async (p: DiscoveredProductRecord) => {
    try {
      const key = p.external_id || p.title
      const r = await watchlistService.toggleWatchlist({ external_id: key, platform: p.platform, title: p.title, image_url: p.image_url, product_url: p.product_url, category: p.category, price: p.promo_price || p.price, commission_rate: p.commission_rate, commission_amount: p.commission_amount, sales_count: p.sales_count, rating: p.rating, opportunity_score: p.opportunity_score })
      setWatchlistKeys((prev) => { const n = new Set(prev); r.action === 'added' ? n.add(key) : n.delete(key); return n })
    } catch { toast.error('Erro ao atualizar Watchlist.') }
  }

  const marketLabel = marketplace === 'Shopee' ? 'Shopee Affiliate Open API' : 'Mercado Livre API oficial'

  return <div className="space-y-6 max-w-7xl mx-auto pb-16">
    <div className="pb-4 border-b border-[#1E2232]">
      <div className="flex items-center gap-2 mb-1 text-[10px] font-mono uppercase text-[#00F2FF]"><ShieldCheck className="w-3 h-3"/> APIs oficiais conectadas</div>
      <h1 className="text-3xl font-extrabold text-white flex items-center gap-2"><Compass className="w-7 h-7 text-[#00F2FF]"/>Caçador de Oportunidades</h1>
      <p className="text-sm text-gray-400 mt-1">Busque produtos reais no Mercado Livre e na Shopee usando as integrações oficiais.</p>
    </div>

    <form onSubmit={findWithAi} className="p-5 rounded-2xl bg-[#141624] border border-[#7000FF]/40 flex gap-3">
      <input value={naturalPrompt} onChange={(e) => setNaturalPrompt(e.target.value)} placeholder="Ex: Quero secadores de cabelo com boa comissão na Shopee" className="flex-1 h-11 px-4 rounded-xl bg-[#0B0D14] border border-[#2B3047] text-xs text-white"/>
      <Button disabled={parsing || searching} className="h-11 bg-gradient-to-r from-[#7000FF] to-[#9333EA] text-white font-bold"><Sparkles className="w-4 h-4 mr-2"/>{parsing ? 'Interpretando...' : 'Caçar com IA'}</Button>
    </form>

    <div className="p-5 rounded-2xl bg-[#141622] border border-[#232738] space-y-4">
      <div className="flex items-center justify-between border-b border-[#1E2232] pb-3"><h3 className="text-xs font-bold text-white uppercase flex items-center gap-2"><SlidersHorizontal className="w-4 h-4 text-[#00F2FF]"/>Critérios avançados do Caçador</h3><span className="text-[10px] text-gray-400 font-mono">30 por página • {marketLabel}</span></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Field label="Palavra-Chave / Termo"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex: secador, projetor..." className="field"/></Field>
        <Field label="Categoria"><select value={category} onChange={(e) => setCategory(e.target.value)} className="field"><option>Todas</option><option>Casa e Cozinha</option><option>Eletrônicos & Áudio</option><option>Beleza & Cuidados</option><option>Moda & Acessórios</option><option>Geral</option></select></Field>
        <Field label="Preço Mínimo"><input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value ? +e.target.value : '')} className="field"/></Field>
        <Field label="Preço Máximo"><input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value ? +e.target.value : '')} className="field"/></Field>
        <Field label="Vendas Mínimas"><input type="number" value={minSales} onChange={(e) => setMinSales(e.target.value ? +e.target.value : '')} className="field"/></Field>
        <Field label="Avaliação Mínima"><input type="number" step="0.1" value={minRating} onChange={(e) => setMinRating(e.target.value ? +e.target.value : '')} className="field"/></Field>
        <Field label="Comissão Mínima (%)"><input type="number" value={estimatedCommissionRate} onChange={(e) => setEstimatedCommissionRate(e.target.value ? +e.target.value : '')} className="field" placeholder={marketplace === 'Shopee' ? 'Ex: 10%' : 'Não fornecida pelo ML'}/></Field>
        <Field label="Marketplace"><select value={marketplace} onChange={(e) => { setMarketplace(e.target.value); setResults([]) }} className="field"><option value="Mercado Livre">Mercado Livre (Conectado)</option><option value="Shopee">Shopee (API Conectada)</option><option value="Amazon" disabled>Amazon (Em Breve)</option><option value="TikTok Shop" disabled>TikTok Shop (Em Breve)</option></select></Field>
        <Field label="Quantidade"><select value={limit} onChange={(e) => setLimit(+e.target.value)} className="field"><option value={10}>10 produtos</option><option value={20}>20 produtos</option><option value={30}>30 produtos</option></select></Field>
      </div>
      <div className="flex justify-end"><Button onClick={() => search()} disabled={searching} className="bg-[#00F2FF] text-[#0A0B10] font-bold"><Search className="w-4 h-4 mr-2"/>{searching ? 'Consultando API...' : `Executar Busca na ${marketplace}`}</Button></div>
    </div>

    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white">Resultados da Busca na {marketplace} ({results.length})</h3>
      {searching ? <div className="text-center py-16 text-gray-400"><RefreshCw className="w-7 h-7 animate-spin mx-auto mb-3"/>Consultando {marketLabel}...</div> : results.length === 0 ? <div className="p-12 text-center rounded-2xl bg-[#141622] border border-[#232738] text-gray-400">Digite um produto, escolha o marketplace e execute a busca.</div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{results.map((p, i) => <DiscoveredProductCard key={p.id} product={p} rank={i + 1} onApprove={approve} onDiscard={discard} onWhyPicked={why} onToggleWatchlist={toggleWatch} isWatchlisted={watchlistKeys.has(p.external_id || p.title)}/>)}</div>}
      {results.length > 0 && hasMore && <div className="flex justify-center"><Button onClick={loadMore} disabled={loadingMore} variant="outline" className="border-[#00F2FF]/40 text-[#00F2FF]"><Layers className="w-4 h-4 mr-2"/>{loadingMore ? 'Carregando...' : 'Carregar mais produtos'}</Button></div>}
    </div>
    <style>{`.field{width:100%;height:36px;padding:0 12px;border-radius:8px;background:#0B0D14;border:1px solid #24293D;color:#e5e7eb;font-size:12px;outline:none}.field:focus{border-color:#00F2FF}`}</style>
  </div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-[11px] font-semibold text-gray-300">{label}</label>{children}</div>
}
