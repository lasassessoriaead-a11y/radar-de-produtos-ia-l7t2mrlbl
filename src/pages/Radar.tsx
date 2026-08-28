import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Radar,
  Search,
  Filter,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Flame,
  ArrowUpDown,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  DollarSign,
  Star,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProductCard } from '@/components/ProductCard'
import { ProductDetailModal } from '@/components/ProductDetailModal'
import { OpportunityBadge } from '@/components/OpportunityBadge'
import { productsService } from '@/services/products'
import { useRealtime } from '@/hooks/use-realtime'
import type { ProductRecord, OpportunityLevel } from '@/types/product'
import { toast } from 'sonner'

export default function RadarPage() {
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null)

  // Filters state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [sortBy, setSortBy] = useState<
    'score' | 'commission' | 'sales' | 'price_asc' | 'price_desc'
  >('score')

  const navigate = useNavigate()

  // Load products
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const res = await productsService.getProducts('', '-opportunity_score', 1, 200)
      setProducts(res.items)
    } catch (err) {
      console.error('Error fetching radar products:', err)
      toast.error('Erro ao buscar produtos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Realtime updates
  useRealtime<ProductRecord>('products', (data) => {
    if (data.action === 'create') {
      setProducts((prev) => [data.record, ...prev])
    } else if (data.action === 'update') {
      setProducts((prev) => prev.map((p) => (p.id === data.record.id ? data.record : p)))
    } else if (data.action === 'delete') {
      setProducts((prev) => prev.filter((p) => p.id !== data.record.id))
    }
  })

  // Unique categories and platforms for filter select
  const categories = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.category) set.add(p.category)
    })
    return Array.from(set)
  }, [products])

  const platforms = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => {
      if (p.platform) set.add(p.platform)
    })
    return Array.from(set)
  }, [products])

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (searchTerm.trim()) {
          const matchTitle = p.title.toLowerCase().includes(searchTerm.toLowerCase())
          const matchNiche = p.niche?.toLowerCase().includes(searchTerm.toLowerCase())
          const matchCat = p.category?.toLowerCase().includes(searchTerm.toLowerCase())
          const matchSeller = p.seller?.toLowerCase().includes(searchTerm.toLowerCase())
          if (!matchTitle && !matchNiche && !matchCat && !matchSeller) return false
        }

        if (selectedCategory !== 'all' && p.category !== selectedCategory) {
          return false
        }

        if (selectedPlatform !== 'all' && p.platform !== selectedPlatform) {
          return false
        }

        if (selectedLevel !== 'all' && p.opportunity_level !== selectedLevel) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'score') {
          return (b.opportunity_score || 0) - (a.opportunity_score || 0)
        }
        if (sortBy === 'commission') {
          const commA = a.commission_amount || a.price * (a.commission_rate / 100)
          const commB = b.commission_amount || b.price * (b.commission_rate / 100)
          return commB - commA
        }
        if (sortBy === 'sales') {
          return (b.sales_count || 0) - (a.sales_count || 0)
        }
        if (sortBy === 'price_asc') {
          const priceA = a.promo_price || a.price
          const priceB = b.promo_price || b.price
          return priceA - priceB
        }
        if (sortBy === 'price_desc') {
          const priceA = a.promo_price || a.price
          const priceB = b.promo_price || b.price
          return priceB - priceA
        }
        return 0
      })
  }, [products, searchTerm, selectedCategory, selectedPlatform, selectedLevel, sortBy])

  // Level counts
  const hotCount = products.filter((p) => p.opportunity_level === 'hot').length
  const goodCount = products.filter((p) => p.opportunity_level === 'good').length
  const testCount = products.filter((p) => p.opportunity_level === 'test').length
  const lowCount = products.filter((p) => p.opportunity_level === 'low').length

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-[#1E2232]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-[#00F2FF]/10 text-[#00F2FF] border border-[#00F2FF]/30 font-bold">
              Inteligência de Mercado
            </span>
            <span className="text-xs text-gray-400 font-mono">
              {products.length} produtos monitorados
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Radar className="w-7 h-7 text-[#00F2FF]" />
            Radar de Produtos
          </h1>
          <p className="text-xs md:text-sm text-gray-400 mt-1 max-w-3xl leading-relaxed">
            Catálogo completo de oportunidades analisadas com cálculo de Score 0-100 (balanceando
            margem real em R$, ticket, reputação, demanda e probabilidade de conversão).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={fetchProducts}
            variant="outline"
            size="sm"
            className="h-9 border-[#2A2F45] bg-[#12141F] text-xs text-gray-300 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={() => navigate('/importar')}
            size="sm"
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] text-[#0A0B10] font-bold text-xs gap-1.5 shadow-[0_0_15px_rgba(0,242,255,0.25)]"
          >
            <UploadCloud className="w-4 h-4" />
            Adicionar Produto
          </Button>
        </div>
      </div>

      {/* Level Quick Filter Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <button
          type="button"
          onClick={() => setSelectedLevel('all')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedLevel === 'all'
              ? 'bg-[#1D2030] border-[#00F2FF] shadow-[0_0_15px_rgba(0,242,255,0.15)]'
              : 'bg-[#141622] border-[#22273A] hover:bg-[#181B2A]'
          }`}
        >
          <div className="text-[11px] text-gray-400 font-medium">Todos os Níveis</div>
          <div className="text-lg font-bold font-mono text-white mt-0.5">{products.length}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedLevel('hot')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedLevel === 'hot'
              ? 'bg-[#FF3D00]/15 border-[#FF3D00] shadow-[0_0_15px_rgba(255,61,0,0.25)]'
              : 'bg-[#141622] border-[#22273A] hover:bg-[#181B2A]'
          }`}
        >
          <div className="text-[11px] text-[#FF3D00] font-semibold flex items-center gap-1">
            🔥 Alta Oportunidade
          </div>
          <div className="text-lg font-bold font-mono text-[#FF3D00] mt-0.5">{hotCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedLevel('good')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedLevel === 'good'
              ? 'bg-[#00E676]/15 border-[#00E676] shadow-[0_0_15px_rgba(0,230,118,0.2)]'
              : 'bg-[#141622] border-[#22273A] hover:bg-[#181B2A]'
          }`}
        >
          <div className="text-[11px] text-[#00E676] font-semibold flex items-center gap-1">
            🟢 Bom Potencial
          </div>
          <div className="text-lg font-bold font-mono text-[#00E676] mt-0.5">{goodCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedLevel('test')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedLevel === 'test'
              ? 'bg-[#FFD600]/15 border-[#FFD600] shadow-[0_0_15px_rgba(255,214,0,0.2)]'
              : 'bg-[#141622] border-[#22273A] hover:bg-[#181B2A]'
          }`}
        >
          <div className="text-[11px] text-[#FFD600] font-semibold flex items-center gap-1">
            🟡 Testar
          </div>
          <div className="text-lg font-bold font-mono text-[#FFD600] mt-0.5">{testCount}</div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedLevel('low')}
          className={`p-3 rounded-xl border text-left transition-all col-span-2 sm:col-span-1 ${
            selectedLevel === 'low'
              ? 'bg-[#9E9E9E]/15 border-[#9E9E9E]'
              : 'bg-[#141622] border-[#22273A] hover:bg-[#181B2A]'
          }`}
        >
          <div className="text-[11px] text-[#9E9E9E] font-semibold flex items-center gap-1">
            🔴 Baixa Oportunidade
          </div>
          <div className="text-lg font-bold font-mono text-[#9E9E9E] mt-0.5">{lowCount}</div>
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-4 rounded-2xl bg-[#141622] border border-[#232738] space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por nome, nicho, loja ou palavras-chave..."
              className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#0D0F18] border border-[#252A3E] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F2FF]"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#0D0F18] border border-[#252A3E] text-xs text-gray-200 focus:outline-none focus:border-[#00F2FF]"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Platform Dropdown */}
            <select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              className="h-10 px-3 rounded-xl bg-[#0D0F18] border border-[#252A3E] text-xs text-gray-200 focus:outline-none focus:border-[#00F2FF]"
            >
              <option value="all">Todas as Plataformas</option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-[#0D0F18] border border-[#252A3E] rounded-xl px-2.5 h-10">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#00F2FF]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="bg-transparent text-xs text-gray-200 focus:outline-none"
              >
                <option value="score">Score de Oportunidade (Maior)</option>
                <option value="commission">Comissão em R$ (Maior)</option>
                <option value="sales">Volume de Vendas (Maior)</option>
                <option value="price_asc">Preço (Menor para Maior)</option>
                <option value="price_desc">Preço (Maior para Menor)</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-[#0D0F18] border border-[#252A3E] rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#1E2335] text-[#00F2FF]'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Visualização em Grade"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#1E2335] text-[#00F2FF]'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Visualização em Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter summary */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-[#1C2030]">
          <span>
            Mostrando <strong>{filteredProducts.length}</strong> de {products.length} produtos
          </span>
          {(searchTerm ||
            selectedCategory !== 'all' ||
            selectedPlatform !== 'all' ||
            selectedLevel !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('all')
                setSelectedPlatform('all')
                setSelectedLevel('all')
              }}
              className="text-[#00F2FF] hover:underline font-mono text-[11px]"
            >
              Limpar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Product List/Grid View */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div
              key={n}
              className="h-80 rounded-2xl bg-[#161821] animate-pulse border border-[#232738]"
            />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#141622] border border-[#232738] space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#1E2335] text-gray-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Nenhum produto encontrado</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
              Tente alterar os termos da busca ou redefinir os filtros para visualizar mais itens.
            </p>
          </div>
          <Button
            onClick={() => {
              setSearchTerm('')
              setSelectedCategory('all')
              setSelectedPlatform('all')
              setSelectedLevel('all')
            }}
            variant="outline"
            size="sm"
            className="text-xs border-[#2A2F45]"
          >
            Redefinir Filtros
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpenDetails={(prod) => setSelectedProduct(prod)}
              onAskAi={(prod) => navigate(`/analista?product=${prod.id}`)}
              viewMode="grid"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onOpenDetails={(prod) => setSelectedProduct(prod)}
              onAskAi={(prod) => navigate(`/analista?product=${prod.id}`)}
              viewMode="list"
            />
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAskChatNavigate={(prod) => navigate(`/analista?product=${prod.id}`)}
      />
    </div>
  )
}
