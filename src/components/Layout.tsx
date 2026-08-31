import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Radar,
  Compass,
  FlaskConical,
  Layers,
  Sparkles,
  UploadCloud,
  Bot,
  Settings,
  Search,
  Bell,
  Menu,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  DollarSign,
  TrendingUp,
  LogOut,
  User,
  ShieldCheck,
  Zap,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import { productsService } from '@/services/products'
import type { ProductRecord } from '@/types/product'
import { ProductDetailModal } from '@/components/ProductDetailModal'
import LoginGate from '@/components/LoginGate'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ProductRecord[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null)

  const { user, logout, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Search autocomplete handler
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([])
      setShowSearchDropdown(false)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const filterStr = `title ~ "${searchQuery}" || category ~ "${searchQuery}" || platform ~ "${searchQuery}"`
        const res = await productsService.getProducts(filterStr, '-opportunity_score', 1, 6)
        setSearchResults(res.items)
        setShowSearchDropdown(true)
      } catch (e) {
        console.error('Search error:', e)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const navItems = [
    {
      to: '/',
      label: 'Painel',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      to: '/orquestrador',
      label: 'Orquestrador IA',
      icon: ShieldCheck,
      badge: 'FASE 9',
      badgeColor:
        'bg-[#7000FF]/25 text-[#00F2FF] border-[#7000FF]/50 shadow-[0_0_8px_rgba(0,242,255,0.3)]',
    },
    {
      to: '/cacador',
      label: 'Caçador de Oportunidades',
      icon: Compass,
      badge: 'NOVO',
      badgeColor: 'bg-[#FF3D00]/20 text-[#FF3D00] border-[#FF3D00]/30',
    },
    {
      to: '/radar',
      label: 'Radar de Produtos',
      icon: Radar,
      badge: 'PRO',
      badgeColor: 'bg-[#00F2FF]/20 text-[#00F2FF] border-[#00F2FF]/30',
    },
    {
      to: '/publico',
      label: 'Radar de Público',
      icon: Users,
      badge: 'FASE 7',
      badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
    },
    {
      to: '/crm',
      label: 'CRM & Recompra',
      icon: User,
      badge: 'FASE 8',
      badgeColor:
        'bg-[#00F2FF]/20 text-[#00F2FF] border-[#00F2FF]/40 shadow-[0_0_8px_rgba(0,242,255,0.2)]',
    },
    {
      to: '/laboratorio',
      label: 'Laboratório de Campanhas',
      icon: FlaskConical,
      badge: 'FASE 3',
      badgeColor: 'bg-[#7000FF]/20 text-[#00F2FF] border-[#7000FF]/40',
    },
    {
      to: '/campanhas',
      label: 'Minhas Campanhas',
      icon: Layers,
      badge: null,
    },
    {
      to: '/estudio',
      label: 'Estúdio Criativo',
      icon: Sparkles,
      badge: null,
    },
    {
      to: '/publicacao',
      label: 'Central de Publicação',
      icon: Zap,
      badge: 'FASE 5',
      badgeColor: 'bg-[#00F2FF]/20 text-[#00F2FF] border-[#00F2FF]/40',
    },
    {
      to: '/performance',
      label: 'Performance & ROI',
      icon: TrendingUp,
      badge: 'DADOS',
      badgeColor: 'bg-[#00E676]/20 text-[#00E676] border-[#00E676]/40',
    },
    {
      to: '/inteligencia',
      label: 'Inteligência de Vendas',
      icon: Sparkles,
      badge: 'FASE 6',
      badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    },
    {
      to: '/analista',
      label: 'Analista IA',
      icon: Bot,
      badge: 'IA',
      badgeColor: 'bg-[#7000FF]/20 text-[#00F2FF] border-[#7000FF]/40',
    },
    {
      to: '/importar',
      label: 'Importar Produtos',
      icon: UploadCloud,
      badge: 'CSV',
      badgeColor: 'bg-[#00E676]/20 text-[#00E676] border-[#00E676]/30',
    },
    {
      to: '/configuracoes',
      label: 'Configurações',
      icon: Settings,
      badge: null,
    },
  ]

  const handleSelectSearchResult = (prod: ProductRecord) => {
    setShowSearchDropdown(false)
    setSearchQuery('')
    setSelectedProduct(prod)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0B10] text-gray-300 flex items-center justify-center text-sm">
        Conectando ao Radar...
      </div>
    )
  }

  if (!isAuthenticated) return <LoginGate />

  return (
    <div className="flex h-screen w-full bg-[#0A0B10] text-[#F3F4F6] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'relative flex flex-col justify-between border-r border-[#1E2232] bg-[#0E1017] transition-all duration-300 z-30 select-none',
          collapsed ? 'w-20' : 'w-64',
        )}
      >
        {/* Brand Logo */}
        <div>
          <div className="flex items-center justify-between h-16 px-4 border-b border-[#1E2232]">
            {!collapsed ? (
              <NavLink to="/" className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00F2FF] to-[#7000FF] flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                  <Radar className="w-5 h-5 text-[#0A0B10]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1">
                    RADAR <span className="text-[#00F2FF]">IA</span>
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 -mt-1 tracking-wider uppercase">
                    Inteligência Afiliados
                  </span>
                </div>
              </NavLink>
            ) : (
              <NavLink to="/" className="mx-auto">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F2FF] to-[#7000FF] flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.4)]">
                  <Radar className="w-5 h-5 text-[#0A0B10]" />
                </div>
              </NavLink>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg bg-[#161924] hover:bg-[#202538] text-gray-400 hover:text-white transition-colors"
              title={collapsed ? 'Expandir Sidebar' : 'Recolher Sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Nav Links */}
          <nav className="p-3 space-y-1.5 mt-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.to
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={cn(
                    'group flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-[#00F2FF]/15 to-[#7000FF]/15 text-[#00F2FF] border border-[#00F2FF]/30 shadow-[0_0_15px_rgba(0,242,255,0.1)]'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-[#161924]',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn(
                      'w-4 h-4 flex-shrink-0 transition-colors',
                      isActive ? 'text-[#00F2FF]' : 'text-gray-400 group-hover:text-gray-200',
                    )}
                  />
                  {!collapsed && (
                    <div className="flex items-center justify-between flex-1">
                      <span>{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            'text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border',
                            item.badgeColor,
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* User Card & Skip Agent Status */}
        <div className="p-3 border-t border-[#1E2232] space-y-2">
          {!collapsed && (
            <div className="p-3 rounded-xl bg-[#131622] border border-[#212638] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-gray-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
                  Agente Ativo
                </span>
                <span className="text-[9px] font-mono text-[#00F2FF]">Fast Tier</span>
              </div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-[#7000FF]" />
                Analista Radar IA
              </div>
            </div>
          )}

          <div
            className={cn(
              'flex items-center gap-3 p-2 rounded-xl bg-[#161924] border border-[#22273A]',
              collapsed ? 'justify-center' : 'justify-between',
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#7000FF] to-[#00F2FF] flex items-center justify-center font-bold text-xs text-[#0A0B10]">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AF'}
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {user?.name || 'Afiliado Pro'}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate">
                    {user?.email || 'luka2510@hotmail.com'}
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                onClick={logout}
                className="p-1.5 rounded-lg hover:bg-[#202538] text-gray-400 hover:text-red-400 transition-colors"
                title="Sair"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Global Header */}
        <header className="h-16 border-b border-[#1E2232] bg-[#0E1017]/80 backdrop-blur-md px-6 flex items-center justify-between gap-4 z-20 flex-shrink-0">
          {/* Global Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
                placeholder="Buscar produtos por nome, categoria, nicho ou plataforma..."
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-[#131622] border border-[#232738] text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00F2FF] transition-all"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border-2 border-[#00F2FF] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showSearchDropdown && searchResults.length > 0 && (
              <div className="absolute top-12 left-0 right-0 bg-[#161824] border border-[#2B3047] rounded-xl shadow-2xl p-2 z-50 max-h-80 overflow-y-auto space-y-1">
                <div className="text-[10px] font-mono text-gray-400 px-2 py-1 uppercase tracking-wider">
                  Resultados Encontrados ({searchResults.length})
                </div>
                {searchResults.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => handleSelectSearchResult(prod)}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1E2335] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={prod.image_url || 'https://img.usecurling.com/p/100/100?q=product'}
                        alt={prod.title}
                        className="w-9 h-9 rounded object-cover flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{prod.title}</div>
                        <div className="text-[10px] text-gray-400 flex items-center gap-2">
                          <span>{prod.platform}</span>
                          <span>•</span>
                          <span>R$ {(prod.promo_price || prod.price).toFixed(2)}</span>
                          <span>•</span>
                          <span className="text-[#00E676]">
                            +R$ {prod.commission_amount?.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#00F2FF] bg-[#00F2FF]/10 px-2 py-0.5 rounded border border-[#00F2FF]/30 ml-2">
                      {prod.opportunity_score} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Header Quick Actions */}
          <div className="flex items-center gap-3">
            <NavLink to="/importar">
              <Button
                size="sm"
                className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] font-bold text-xs gap-1.5 shadow-[0_0_15px_rgba(0,242,255,0.25)]"
              >
                <UploadCloud className="w-4 h-4" />
                <span className="hidden sm:inline">Adicionar Produto</span>
              </Button>
            </NavLink>

            <NavLink to="/analista">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-xl border-[#2A2F45] bg-[#141724] hover:bg-[#1D2133] hover:border-[#7000FF] text-white text-xs gap-1.5"
              >
                <Bot className="w-4 h-4 text-[#7000FF]" />
                <span className="hidden sm:inline">Analista IA</span>
              </Button>
            </NavLink>
          </div>
        </header>

        {/* Real-time AI Trends Ticker Bar */}
        <div className="bg-[#11131C] border-b border-[#1E2232] h-7 flex items-center overflow-hidden px-4 select-none">
          <div className="flex items-center gap-2 text-[10px] font-mono text-[#00F2FF] font-bold uppercase tracking-wider flex-shrink-0 mr-4 border-r border-[#232738] pr-3">
            <Zap className="w-3 h-3 text-[#00F2FF] animate-pulse" />
            Radar Live
          </div>
          <div className="overflow-hidden whitespace-nowrap flex-1">
            <div className="animate-marquee inline-flex gap-8 text-[11px] text-gray-300 font-mono">
              <span className="flex items-center gap-1.5">
                <span className="text-[#FF3D00]">🔥 Tech & Projeção:</span> Mini Projetor LED em
                alta (+24% buscas na Shopee)
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#00E676]">🟢 Beleza & Cabelos:</span> Escova Titanium
                liderando conversão com margem de R$ 14,99
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#00F2FF]">⚡ Alerta de Nicho:</span> Acessórios MagSafe para
                carro com baixa concorrência na Amazon
              </span>
              <span className="text-gray-600">•</span>
              <span className="flex items-center gap-1.5">
                <span className="text-[#FFD600]">🟡 Smartwatches Genéricos:</span> Queda de margem e
                notas em alerta (3.4 a 3.9)
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Page Outlet */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#0A0B10]">
          <Outlet />
        </main>
      </div>

      {/* Global Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  )
}
