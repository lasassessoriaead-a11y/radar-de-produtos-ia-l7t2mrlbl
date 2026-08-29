import React, { useState, useEffect, useMemo } from 'react'
import {
  Compass,
  Search,
  Sparkles,
  Filter,
  SlidersHorizontal,
  Flame,
  Bookmark,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  Bot,
  RefreshCw,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ListFilter,
  Layers,
  ArrowRight,
  Database,
  Key,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DiscoveredProductCard } from '@/components/DiscoveredProductCard'
import { WhyAiPickedModal } from '@/components/WhyAiPickedModal'
import { WatchlistTab } from '@/components/WatchlistTab'
import { hunterService, watchlistService } from '@/services/hunter'
import { useRealtime } from '@/hooks/use-realtime'
import type {
  DiscoveredProductRecord,
  HunterSearchFilters,
  HunterWhyAiPickedResult,
  WatchlistItemRecord,
} from '@/types/product'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function HunterPage() {
  const [activeTab, setActiveTab] = useState<'search' | 'watchlist' | 'pending'>('search')

  // Search & Filters State
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Todas')
  const [minPrice, setMinPrice] = useState<number | ''>('')
  const [maxPrice, setMaxPrice] = useState<number | ''>('')
  const [minSales, setMinSales] = useState<number | ''>('')
  const [minRating, setMinRating] = useState<number | ''>('')
  const [estimatedCommissionRate, setEstimatedCommissionRate] = useState<number | ''>('')
  const [marketplace, setMarketplace] = useState('Mercado Livre')
  const [limit, setLimit] = useState(15)

  // Natural Language Intent Mode ("Encontre para mim")
  const [naturalPrompt, setNaturalPrompt] = useState('')
  const [isParsingIntent, setIsParsingIntent] = useState(false)
  const [intentSummary, setIntentSummary] = useState('')

  // Results & Pending List
  const [searchResults, setSearchResults] = useState<DiscoveredProductRecord[]>([])
  const [pendingProducts, setPendingProducts] = useState<DiscoveredProductRecord[]>([])
  const [topOpportunities, setTopOpportunities] = useState<DiscoveredProductRecord[]>([])
  const [watchlistKeys, setWatchlistKeys] = useState<Set<string>>(new Set())

  // Loading & State
  const [searching, setSearching] = useState(false)
  const [loadingPending, setLoadingPending] = useState(false)
  const [tokenRequiredMessage, setTokenRequiredMessage] = useState<string | null>(null)

  // "Why AI Picked" Modal State
  const [selectedWhyProduct, setSelectedWhyProduct] = useState<DiscoveredProductRecord | null>(null)
  const [whyAnalysis, setWhyAnalysis] = useState<HunterWhyAiPickedResult | null>(null)
  const [loadingWhy, setLoadingWhy] = useState(false)

  // Discarding & Approving IDs
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set())
  const [discardingIds, setDiscardingIds] = useState<Set<string>>(new Set())

  const categoryOptions = [
    'Todas',
    'Casa e Cozinha',
    'Eletrônicos & Áudio',
    'Beleza & Cuidados',
    'Saúde & Fitness',
    'Automotivo',
    'Ferramentas',
    'Brinquedos & Games',
    'Moda & Acessórios',
    'Geral',
  ]

  // Load Initial Pending Products & Top Today
  const loadInitialData = async () => {
    setLoadingPending(true)
    try {
      const [pending, top, watchItems] = await Promise.all([
        hunterService.getDiscoveredProducts('pending', 30),
        hunterService.getTopOpportunitiesToday(5),
        watchlistService.getWatchlist().catch(() => []),
      ])
      setPendingProducts(pending)
      setTopOpportunities(top)
      const keys = new Set<string>()
      watchItems.forEach((w) => {
        if (w.external_id) keys.add(w.external_id)
        if (w.title) keys.add(w.title)
      })
      setWatchlistKeys(keys)
    } catch (err) {
      console.error('Error loading hunter initial data:', err)
    } finally {
      setLoadingPending(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Realtime updates for discovered products
  useRealtime<DiscoveredProductRecord>('discovered_products', (data) => {
    if (data.action === 'create') {
      setPendingProducts((prev) => [data.record, ...prev.filter((p) => p.id !== data.record.id)])
    } else if (data.action === 'update') {
      if (data.record.status === 'pending') {
        setPendingProducts((prev) => prev.map((p) => (p.id === data.record.id ? data.record : p)))
      } else {
        // Removed from pending
        setPendingProducts((prev) => prev.filter((p) => p.id !== data.record.id))
      }
    } else if (data.action === 'delete') {
      setPendingProducts((prev) => prev.filter((p) => p.id !== data.record.id))
    }
  })

  // Execute Search on Real ML API
  const handleSearch = async (overrideFilters?: Partial<HunterSearchFilters>) => {
    const q = overrideFilters?.query !== undefined ? overrideFilters.query : query
    const cat = overrideFilters?.category !== undefined ? overrideFilters.category : category

    if (!q.trim() && (!cat || cat === 'Todas')) {
      toast.error('Informe uma palavra-chave ou categoria para buscar.')
      return
    }

    setSearching(true)
    setTokenRequiredMessage(null)

    try {
      const filters: HunterSearchFilters = {
        query: q,
        category: cat,
        min_price: typeof minPrice === 'number' ? minPrice : undefined,
        max_price: typeof maxPrice === 'number' ? maxPrice : undefined,
        min_sales: typeof minSales === 'number' ? minSales : undefined,
        min_rating: typeof minRating === 'number' ? minRating : undefined,
        estimated_commission_rate:
          typeof estimatedCommissionRate === 'number' ? estimatedCommissionRate : undefined,
        marketplace,
        limit,
        ...overrideFilters,
      }

      const res = await hunterService.searchMarketplace(filters)

      if (res.status === 'token_required') {
        setTokenRequiredMessage(res.message || 'Token de acesso do Mercado Livre necessário.')
        setSearchResults([])
        toast.info('Mercado Livre: configure seu token de acesso nas Configurações.')
      } else if (!res.success) {
        toast.error(res.message || 'Erro na resposta do conector do marketplace')
        setSearchResults([])
      } else {
        setSearchResults(res.products || [])
        toast.success(`${res.total_found} produtos encontrados no Mercado Livre!`)
        // Refresh pending products list
        loadInitialData()
      }
    } catch (err: any) {
      console.error('Search error:', err)
      toast.error(err.message || 'Falha ao buscar produtos.')
    } finally {
      setSearching(false)
    }
  }

  // Handle Natural Language Parse ("Encontre produtos para mim")
  const handleFindForMe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!naturalPrompt.trim()) {
      toast.error('Digite o que procura em linguagem natural.')
      return
    }

    setIsParsingIntent(true)
    setTokenRequiredMessage(null)

    try {
      const parsed = await hunterService.findForMe(naturalPrompt)

      setIntentSummary(parsed.ai_intent_summary || 'Filtros extraídos com sucesso')
      setQuery(parsed.query || '')
      if (parsed.category) setCategory(parsed.category)
      if (parsed.min_price) setMinPrice(parsed.min_price)
      if (parsed.max_price) setMaxPrice(parsed.max_price)
      if (parsed.min_sales) setMinSales(parsed.min_sales)
      if (parsed.min_rating) setMinRating(parsed.min_rating)
      if (parsed.estimated_commission_rate)
        setEstimatedCommissionRate(parsed.estimated_commission_rate)

      toast.success('Intenção interpretada pela IA! Executando busca real...')

      // Trigger search with interpreted filters
      await handleSearch({
        query: parsed.query,
        category: parsed.category,
        min_price: parsed.min_price,
        max_price: parsed.max_price,
        min_sales: parsed.min_sales,
        min_rating: parsed.min_rating,
        estimated_commission_rate: parsed.estimated_commission_rate,
      })
    } catch (err: any) {
      console.error('Find for me error:', err)
      toast.error(err.message || 'Erro ao interpretar busca')
    } finally {
      setIsParsingIntent(false)
    }
  }

  // Approve a discovered product -> moves to main Radar
  const handleApprove = async (product: DiscoveredProductRecord) => {
    setApprovingIds((prev) => new Set(prev).add(product.id))
    try {
      await hunterService.approveProduct(product.id)
      toast.success(`"${product.title.slice(0, 30)}..." aprovado e salvo no Radar!`)
      setPendingProducts((prev) => prev.filter((p) => p.id !== product.id))
      setSearchResults((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, status: 'approved' } : p)),
      )
    } catch (err: any) {
      console.error('Approve error:', err)
      toast.error(err.message || 'Erro ao aprovar produto')
    } finally {
      setApprovingIds((prev) => {
        const next = new Set(prev)
        next.delete(product.id)
        return next
      })
    }
  }

  // Discard a discovered product -> drops from pending
  const handleDiscard = async (product: DiscoveredProductRecord) => {
    setDiscardingIds((prev) => new Set(prev).add(product.id))
    try {
      await hunterService.discardProduct(product.id)
      toast.info('Produto descartado.')
      setPendingProducts((prev) => prev.filter((p) => p.id !== product.id))
      setSearchResults((prev) => prev.filter((p) => p.id !== product.id))
    } catch (err: any) {
      console.error('Discard error:', err)
      toast.error(err.message || 'Erro ao descartar produto')
    } finally {
      setDiscardingIds((prev) => {
        const next = new Set(prev)
        next.delete(product.id)
        return next
      })
    }
  }

  // Open "Why AI Picked" modal with deep SWOT explanation
  const handleOpenWhyPicked = async (product: DiscoveredProductRecord) => {
    setSelectedWhyProduct(product)
    setWhyAnalysis(null)
    setLoadingWhy(true)
    try {
      const res = await hunterService.whyAiPicked(product.id, true)
      setWhyAnalysis(res)
    } catch (err: any) {
      console.error('Why picked error:', err)
      toast.error('Erro ao gerar análise do Analista IA')
    } finally {
      setLoadingWhy(false)
    }
  }

  // Toggle watchlist
  const handleToggleWatchlist = async (product: DiscoveredProductRecord) => {
    const key = product.external_id || product.title
    try {
      const res = await watchlistService.toggleWatchlist({
        external_id: key,
        platform: product.platform,
        title: product.title,
        image_url: product.image_url,
        product_url: product.product_url,
        category: product.category,
        price: product.promo_price && product.promo_price > 0 ? product.promo_price : product.price,
        commission_rate: product.commission_rate,
        commission_amount: product.commission_amount,
        sales_count: product.sales_count,
        rating: product.rating,
        opportunity_score: product.opportunity_score,
        discovered_id: product.id,
      })

      if (res.action === 'added') {
        setWatchlistKeys((prev) => new Set(prev).add(key))
        toast.success('Produto adicionado à Watchlist!')
      } else {
        setWatchlistKeys((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
        toast.info('Produto removido da Watchlist')
      }
    } catch (err: any) {
      console.error('Watchlist toggle error:', err)
      toast.error('Erro ao atualizar Watchlist')
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#1E2232]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-[#FF3D00]/15 text-[#FF3D00] border border-[#FF3D00]/30 font-bold flex items-center gap-1">
              <Compass className="w-3 h-3 text-[#FF3D00]" />
              Fase 2 • Descoberta Automática
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Conexão Real com Mercado Livre (MLB)
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Compass className="w-7 h-7 text-[#00F2FF]" />
            Caçador de Oportunidades
          </h1>
          <p className="text-xs md:text-sm text-gray-400 mt-1 max-w-3xl leading-relaxed">
            Busque produtos reais em marketplaces, filtre por critérios avançados de validação e use
            a IA para interpretar intenções de busca e explicar os melhores produtos.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-[#141624] p-1 rounded-xl border border-[#232738]">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
              activeTab === 'search'
                ? 'bg-[#1F2436] text-[#00F2FF] shadow-sm'
                : 'text-gray-400 hover:text-white',
            )}
          >
            <Search className="w-3.5 h-3.5" />
            Caçador de Busca
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
              activeTab === 'pending'
                ? 'bg-[#1F2436] text-[#00F2FF] shadow-sm'
                : 'text-gray-400 hover:text-white',
            )}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Pendentes ({pendingProducts.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('watchlist')}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
              activeTab === 'watchlist'
                ? 'bg-[#1F2436] text-[#00F2FF] shadow-sm'
                : 'text-gray-400 hover:text-white',
            )}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Watchlist & Tendências
          </button>
        </div>
      </div>

      {activeTab === 'watchlist' ? (
        <WatchlistTab />
      ) : activeTab === 'pending' ? (
        /* Pending Review Section */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#141622] border border-[#232738] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ListFilter className="w-4 h-4 text-[#00F2FF]" />
                Produtos Descobertos Pendentes de Aprovação ({pendingProducts.length})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Os produtos caçados ficam nesta etapa intermediária. Aprove para incluir no Radar
                definitivo ou descarte.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadInitialData}
              className="text-xs border-[#2A2F45] text-gray-300 gap-1"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loadingPending && 'animate-spin')} />
              Atualizar
            </Button>
          </div>

          {loadingPending ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-80 rounded-2xl bg-[#141622] animate-pulse border border-[#232738]"
                />
              ))}
            </div>
          ) : pendingProducts.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#141622] border border-[#232738] space-y-3">
              <CheckCircle2 className="w-8 h-8 text-[#00E676] mx-auto" />
              <h3 className="text-sm font-bold text-white">Nenhum produto pendente</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Faça uma nova busca na aba <strong>"Caçador de Busca"</strong> para descobrir novos
                produtos e avaliar aqui.
              </p>
              <Button
                size="sm"
                onClick={() => setActiveTab('search')}
                className="bg-[#00F2FF] text-[#0A0B10] font-bold text-xs"
              >
                Ir para o Caçador de Busca
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pendingProducts.map((product) => (
                <DiscoveredProductCard
                  key={product.id}
                  product={product}
                  onApprove={handleApprove}
                  onDiscard={handleDiscard}
                  onWhyPicked={handleOpenWhyPicked}
                  onToggleWatchlist={handleToggleWatchlist}
                  isWatchlisted={
                    watchlistKeys.has(product.external_id) || watchlistKeys.has(product.title)
                  }
                  isApproving={approvingIds.has(product.id)}
                  isDiscarding={discardingIds.has(product.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Search Tab */
        <div className="space-y-6">
          {/* Natural Language Intent Bar ("Encontre produtos para mim") */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-[#141624] via-[#161928] to-[#121422] border border-[#7000FF]/40 shadow-[0_0_25px_rgba(112,0,255,0.15)] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#7000FF] flex items-center justify-center shadow-[0_0_10px_rgba(112,0,255,0.5)]">
                  <Bot className="w-3.5 h-3.5 text-[#00F2FF]" />
                </div>
                <span className="text-xs font-bold font-mono uppercase tracking-wider text-white flex items-center gap-1.5">
                  Modo "Encontre Produtos Para Mim"
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/30">
                    IA Skip Cloud
                  </span>
                </span>
              </div>
              <span className="text-[10px] font-mono text-gray-400">
                Linguagem Natural → Filtros Estruturados → API Real
              </span>
            </div>

            <form onSubmit={handleFindForMe} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={naturalPrompt}
                  onChange={(e) => setNaturalPrompt(e.target.value)}
                  placeholder="Ex: 'Quero produtos de cozinha até 150 reais com boa nota e muitas vendas no Mercado Livre'"
                  className="w-full h-11 px-4 rounded-xl bg-[#0B0D14] border border-[#2B3047] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F2FF] transition-all"
                />
              </div>

              <Button
                type="submit"
                disabled={isParsingIntent || searching}
                className="h-11 px-5 rounded-xl bg-gradient-to-r from-[#7000FF] to-[#9333EA] hover:opacity-90 text-white font-bold text-xs gap-2 shadow-[0_0_15px_rgba(112,0,255,0.3)] flex-shrink-0"
              >
                {isParsingIntent ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00F2FF]" />
                    Interpretando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#00F2FF]" />
                    Caçar com IA
                  </>
                )}
              </Button>
            </form>

            {intentSummary && (
              <div className="p-2.5 rounded-xl bg-[#0E101A] border border-[#232738] text-[11px] text-gray-300 font-mono flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#00F2FF] flex-shrink-0" />
                <span>
                  <strong>Interpretação da IA:</strong> {intentSummary}
                </span>
              </div>
            )}
          </div>

          {/* Advanced Search & Filtering Form */}
          <div className="p-5 rounded-2xl bg-[#141622] border border-[#232738] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E2232]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#00F2FF]" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Critérios Avançados do Caçador
                </h3>
              </div>
              <span className="text-[10px] font-mono text-gray-400">
                Parâmetros aplicados sobre a API do Mercado Livre
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Keyword Query */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">
                  Palavra-Chave / Termo
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ex: mini projetor, escova..."
                    className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#0B0D14] border border-[#24293D] text-xs text-white focus:outline-none focus:border-[#00F2FF]"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#0B0D14] border border-[#24293D] text-xs text-gray-200 focus:outline-none focus:border-[#00F2FF]"
                >
                  {categoryOptions.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">
                  Faixa de Preço (R$)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="Mín"
                    className="w-1/2 h-9 px-2.5 rounded-lg bg-[#0B0D14] border border-[#24293D] text-xs text-white focus:outline-none focus:border-[#00F2FF] font-mono"
                  />
                  <span className="text-gray-500 text-xs">-</span>
                  <input
                    type="number"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="Máx"
                    className="w-1/2 h-9 px-2.5 rounded-lg bg-[#0B0D14] border border-[#24293D] text-xs text-white focus:outline-none focus:border-[#00F2FF] font-mono"
                  />
                </div>
              </div>

              {/* Min Sales */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Vendas Mínimas</label>
                <input
                  type="number"
                  value={minSales}
                  onChange={(e) => setMinSales(e.target.value ? parseInt(e.target.value, 10) : '')}
                  placeholder="Ex: 50 vendas"
                  className="w-full h-9 px-3 rounded-lg bg-[#0B0D14] border border-[#24293D] text-xs text-white focus:outline-none focus:border-[#00F2FF] font-mono"
                />
              </div>

              {/* Min Rating */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">
                  Avaliação Mínima (0-5)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={minRating}
                  onChange={(e) => setMinRating(e.target.value ? parseFloat(e.target.value) : '')}
                  placeholder="Ex: 4.2"
                  className="w-full h-9 px-3 rounded-lg bg-[#0B0D14] border border-[#24293D] text-xs text-white focus:outline-none focus:border-[#00F2FF] font-mono"
                />
              </div>

              {/* Commission Rate Estimate */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">
                  Comissão Mínima Estimada (%)
                </label>
                <input
                  type="number"
                  value={estimatedCommissionRate}
                  onChange={(e) =>
                    setEstimatedCommissionRate(e.target.value ? parseFloat(e.target.value) : '')
                  }
                  placeholder="Ex: 10% (Indisponível no ML)"
                  className="w-full h-9 px-3 rounded-lg bg-[#0B0D14] border border-[#24293D] text-xs text-white focus:outline-none focus:border-[#00F2FF] font-mono"
                />
              </div>

              {/* Marketplace Selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">Marketplace</label>
                <select
                  value={marketplace}
                  onChange={(e) => setMarketplace(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-[#0B0D14] border border-[#24293D] text-xs text-gray-200 focus:outline-none focus:border-[#00F2FF]"
                >
                  <option value="Mercado Livre">Mercado Livre (Conectado)</option>
                  <option value="Shopee">Shopee (Em Breve)</option>
                  <option value="Amazon">Amazon (Em Breve)</option>
                  <option value="TikTok Shop">TikTok Shop (Em Breve)</option>
                </select>
              </div>

              {/* Search Limit */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-300">
                  Quantidade de Resultados
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value, 10))}
                  className="w-full h-9 px-3 rounded-lg bg-[#0B0D14] border border-[#24293D] text-xs text-gray-200 focus:outline-none focus:border-[#00F2FF]"
                >
                  <option value={10}>10 produtos</option>
                  <option value={15}>15 produtos</option>
                  <option value={20}>20 produtos</option>
                  <option value={30}>30 produtos</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1C2030]">
              <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#FFE600]" />
                Os dados de preço e vendas são obtidos diretamente da API oficial do Mercado Livre.
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery('')
                    setCategory('Todas')
                    setMinPrice('')
                    setMaxPrice('')
                    setMinSales('')
                    setMinRating('')
                    setEstimatedCommissionRate('')
                  }}
                  className="h-9 text-xs border-[#2A2F45] text-gray-400 hover:text-white"
                >
                  Limpar
                </Button>

                <Button
                  type="button"
                  onClick={() => handleSearch()}
                  disabled={searching}
                  className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] font-bold text-xs gap-1.5 shadow-[0_0_15px_rgba(0,242,255,0.25)]"
                >
                  {searching ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Consultando API...
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      Executar Busca no Mercado Livre
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Token Required / Instruction Alert */}
          {tokenRequiredMessage && (
            <div className="p-4 rounded-2xl bg-[#1F1612] border border-[#FF3D00]/40 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#FF3D00] uppercase font-mono">
                <Key className="w-4 h-4 text-[#FF3D00]" />
                Conecte seu Token do Mercado Livre
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">{tokenRequiredMessage}</p>
              <div className="pt-2 flex items-center gap-3">
                <a
                  href="/configuracoes"
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#00F2FF] hover:underline"
                >
                  Ir para Configurações &gt; Token Mercado Livre
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Top Opportunities Found Today Section */}
          {topOpportunities.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#121420] border border-[#232738] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#FF3D00]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    🔥 Oportunidades Encontradas Hoje (Ranking de Score)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-gray-400">
                  Melhores notas após filtros e deduplicação
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {topOpportunities.map((top, idx) => (
                  <div
                    key={top.id}
                    className="p-3 rounded-xl bg-[#0D0F18] border border-[#1E2235] hover:border-[#00F2FF]/40 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-[#FF3D00]">#{idx + 1}</span>
                      <span className="text-xs font-mono font-extrabold text-[#00F2FF]">
                        {top.opportunity_score} pts
                      </span>
                    </div>
                    <img
                      src={top.image_url || 'https://img.usecurling.com/p/100/100?q=product'}
                      alt={top.title}
                      className="w-full h-24 rounded-lg object-cover bg-[#05060A]"
                    />
                    <div className="text-xs font-bold text-white line-clamp-1">{top.title}</div>
                    <div className="text-[11px] text-gray-400 flex items-center justify-between font-mono">
                      <span>R$ {(top.promo_price || top.price).toFixed(2)}</span>
                      <span className="text-gray-500">{top.sales_count} vds</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenWhyPicked(top)}
                      className="w-full h-7 text-[10px] font-semibold border-[#7000FF]/40 text-[#C084FC] hover:bg-[#7000FF]/20"
                    >
                      Ver Análise IA
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search Results List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#00F2FF]" />
                Resultados da Busca no Mercado Livre ({searchResults.length})
              </h3>
              {searchResults.length > 0 && (
                <span className="text-xs font-mono text-gray-400">
                  Ordenado por Score de Oportunidade
                </span>
              )}
            </div>

            {searching ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div
                    key={n}
                    className="h-80 rounded-2xl bg-[#141622] animate-pulse border border-[#232738]"
                  />
                ))}
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-[#141622] border border-[#232738] space-y-3">
                <Search className="w-8 h-8 text-gray-500 mx-auto" />
                <h4 className="text-sm font-bold text-white">Nenhum resultado de busca ativo</h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  Utilize a barra de busca acima ou informe sua intenção no modo{' '}
                  <strong>"Encontre Produtos Para Mim"</strong> para disparar o caçador na API do
                  Mercado Livre.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {searchResults.map((product, idx) => (
                  <DiscoveredProductCard
                    key={product.id}
                    product={product}
                    rank={idx + 1}
                    onApprove={handleApprove}
                    onDiscard={handleDiscard}
                    onWhyPicked={handleOpenWhyPicked}
                    onToggleWatchlist={handleToggleWatchlist}
                    isWatchlisted={
                      watchlistKeys.has(product.external_id) || watchlistKeys.has(product.title)
                    }
                    isApproving={approvingIds.has(product.id)}
                    isDiscarding={discardingIds.has(product.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* "Why AI Picked" Modal */}
      <WhyAiPickedModal
        isOpen={!!selectedWhyProduct}
        onClose={() => setSelectedWhyProduct(null)}
        product={selectedWhyProduct}
        analysis={whyAnalysis}
        loading={loadingWhy}
        onApprove={handleApprove}
      />
    </div>
  )
}
