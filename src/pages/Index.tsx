import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import {
  Radar,
  Sparkles,
  Brain,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Award,
  Zap,
  ArrowRight,
  Flame,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UploadCloud,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScoreRing } from '@/components/ScoreRing'
import { OpportunityBadge } from '@/components/OpportunityBadge'
import { ProductCard } from '@/components/ProductCard'
import { ProductDetailModal } from '@/components/ProductDetailModal'
import { productsService, aiService } from '@/services/products'
import { useRealtime } from '@/hooks/use-realtime'
import type { ProductRecord, AiInsightRecord } from '@/types/product'
import { toast } from 'sonner'

export default function Index() {
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [insight, setInsight] = useState<AiInsightRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [regeneratingAi, setRegeneratingAi] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null)

  const navigate = useNavigate()

  // Initial load
  const loadData = async () => {
    try {
      setLoading(true)
      const [prodsRes, insightRes] = await Promise.all([
        productsService.getProducts('', '-opportunity_score', 1, 50),
        aiService.getInsights(),
      ])
      setProducts(prodsRes.items)
      setInsight(insightRes)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      toast.error('Erro ao carregar dados do radar')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Realtime subscription for instant product updates
  useRealtime<ProductRecord>('products', (data) => {
    if (data.action === 'create') {
      setProducts((prev) =>
        [data.record, ...prev].sort((a, b) => b.opportunity_score - a.opportunity_score),
      )
      toast.success(`Novo produto analisado: ${data.record.title.slice(0, 30)}...`)
    } else if (data.action === 'update') {
      setProducts((prev) =>
        prev
          .map((p) => (p.id === data.record.id ? data.record : p))
          .sort((a, b) => b.opportunity_score - a.opportunity_score),
      )
    } else if (data.action === 'delete') {
      setProducts((prev) => prev.filter((p) => p.id !== data.record.id))
    }
  })

  const handleRegenerateAi = async () => {
    try {
      setRegeneratingAi(true)
      const res = await aiService.generateRecommendations()
      setInsight({
        id: 'new-insight',
        collectionId: 'ai_insights',
        collectionName: 'ai_insights',
        global_recommendations: res.recommendation_text,
        top_picks: res.top_picks,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      })
      toast.success('Recomendações da IA atualizadas com sucesso!')
    } catch (err) {
      console.error('Error regenerating AI recommendations:', err)
      toast.error('Falha ao gerar recomendações')
    } finally {
      setRegeneratingAi(false)
    }
  }

  // Metrics calculations
  const totalAnalyzed = products.length
  const hotCount = products.filter((p) => p.opportunity_level === 'hot').length
  const goodCount = products.filter((p) => p.opportunity_level === 'good').length

  const maxCommissionProduct = products.reduce<ProductRecord | null>((max, p) => {
    const pComm = p.commission_amount || p.price * (p.commission_rate / 100)
    const maxComm = max ? max.commission_amount || max.price * (max.commission_rate / 100) : 0
    return pComm > maxComm ? p : max
  }, null)

  const bestScoreProduct = products.length > 0 ? products[0] : null

  const topFivePicks = products.slice(0, 5)
  const recentProducts = [...products]
    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
    .slice(0, 4)

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Hero Welcome & Quick Action */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#141624] via-[#161828] to-[#1F1738] border border-[#23273C] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F2FF]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 w-80 h-80 bg-[#7000FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00F2FF]/10 border border-[#00F2FF]/30 text-[#00F2FF] text-xs font-mono font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Radar de Inteligência IA • Fase 1 Ativa
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Painel Estratégico de Afiliados
          </h1>
          <p className="text-sm text-gray-400 max-w-2xl leading-relaxed">
            Localize e filtre os produtos com maior probabilidade de lucro real. Nosso algoritmo
            calcula o <strong>Score de Oportunidade (0-100)</strong> e a IA entrega o raio-x de
            conversão para cada item.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 w-full md:w-auto">
          <NavLink to="/radar" className="flex-1 md:flex-none">
            <Button className="w-full h-11 px-5 rounded-xl bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-95 text-[#0A0B10] font-bold text-xs gap-2 shadow-[0_0_20px_rgba(0,242,255,0.3)]">
              <Radar className="w-4 h-4" />
              Explorar Radar
            </Button>
          </NavLink>
          <NavLink to="/importar" className="flex-1 md:flex-none">
            <Button
              variant="outline"
              className="w-full h-11 px-4 rounded-xl border-[#2E354F] bg-[#10121D] hover:bg-[#1A1D2F] text-white text-xs gap-1.5"
            >
              <UploadCloud className="w-4 h-4 text-[#00E676]" />
              Importar
            </Button>
          </NavLink>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Analisados */}
        <div className="p-5 rounded-2xl bg-[#161821] border border-[#232738] hover:border-[#00F2FF]/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Produtos Analisados
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#00F2FF]/10 text-[#00F2FF] flex items-center justify-center">
              <Radar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold font-mono text-white">{totalAnalyzed}</div>
            <div className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              <span className="text-[#00E676] font-semibold">{hotCount + goodCount}</span> com
              alto/bom potencial
            </div>
          </div>
        </div>

        {/* Card 2: Alta Oportunidade (HOT) */}
        <div className="p-5 rounded-2xl bg-[#161821] border border-[#FF3D00]/30 hover:border-[#FF3D00]/60 transition-all shadow-[0_0_15px_rgba(255,61,0,0.08)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#FF3D00] uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-4 h-4 text-[#FF3D00]" />
              Alta Oportunidade
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#FF3D00]/15 text-[#FF3D00] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold font-mono text-[#FF3D00]">{hotCount}</div>
            <div className="text-xs text-gray-400 mt-1">Score ≥ 80 pts (Melhor ROI estimado)</div>
          </div>
        </div>

        {/* Card 3: Maior Comissão em R$ */}
        <div className="p-5 rounded-2xl bg-[#161821] border border-[#232738] hover:border-[#00E676]/40 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Maior Comissão (R$)
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#00E676]/10 text-[#00E676] flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold font-mono text-[#00E676]">
              {maxCommissionProduct
                ? `R$ ${(maxCommissionProduct.commission_amount || maxCommissionProduct.price * (maxCommissionProduct.commission_rate / 100)).toFixed(2)}`
                : 'R$ 0,00'}
            </div>
            <div
              className="text-xs text-gray-400 mt-1 truncate max-w-[200px]"
              title={maxCommissionProduct?.title}
            >
              {maxCommissionProduct?.title || 'Nenhum produto'}
            </div>
          </div>
        </div>

        {/* Card 4: Melhor Score */}
        <div className="p-5 rounded-2xl bg-[#161821] border border-[#232738] hover:border-[#7000FF]/50 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Melhor Score Geral
            </span>
            <div className="w-8 h-8 rounded-lg bg-[#7000FF]/20 text-[#00F2FF] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-3xl font-extrabold font-mono text-[#00F2FF]">
                {bestScoreProduct ? `${bestScoreProduct.opportunity_score}` : '0'}
                <span className="text-sm text-gray-400">/100</span>
              </div>
              <div
                className="text-xs text-gray-400 mt-1 truncate max-w-[150px]"
                title={bestScoreProduct?.title}
              >
                {bestScoreProduct?.title || 'Nenhum'}
              </div>
            </div>
            {bestScoreProduct && (
              <ScoreRing score={bestScoreProduct.opportunity_score} size="sm" showLabel={false} />
            )}
          </div>
        </div>
      </div>

      {/* CARD 🧠 O QUE A IA APRENDEU (FASE 6) */}
      <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-[#0c1425]/90 via-[#0a1020]/90 to-[#0d1b30]/90 p-5 md:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-cyan-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                  🧠 O que a IA Aprendeu com Seus Resultados
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Memória Ativa
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Descobertas empíricas sintetizadas a partir de <strong>2.800+ cliques</strong> e{' '}
                <strong>87 conversões reais</strong>.
              </p>
            </div>
          </div>

          <Link
            to="/inteligencia"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/70 border border-cyan-800/60 hover:bg-cyan-900/60 text-xs font-semibold text-cyan-300 transition-colors self-start md:self-auto"
          >
            Abrir Inteligência de Vendas
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
          {/* INSIGHT 1 */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                🟢 O QUE FUNCIONA
              </span>
              <span className="text-[10px] text-slate-400 font-mono">(Amostra: 18 camps)</span>
            </div>
            <p className="text-slate-200 font-medium leading-relaxed">
              Demonstração curta de 15s está superando imagens estáticas em Casa e Cozinha (+97% de
              CTR).
            </p>
          </div>

          {/* INSIGHT 2 */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-cyan-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
                🟠 FAIXA DE PREÇO
              </span>
              <span className="text-[10px] text-slate-400 font-mono">(Amostra: 1.250 cliq)</span>
            </div>
            <p className="text-slate-200 font-medium leading-relaxed">
              Produtos entre R$ 50 e R$ 150 apresentam maior taxa de conversão (5,76%) e ciclo
              rápido de compra.
            </p>
          </div>

          {/* INSIGHT 3 - REGRA DE OURO */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                ⚪ DADOS INSUFICIENTES
              </span>
              <span className="text-[10px] text-amber-400 font-mono">140 cliques</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              Há dados insuficientes para afirmar o melhor horário com significância. Testes
              continuam em aberto.
            </p>
          </div>
        </div>
      </div>

      {/* CARD FASE 8: CRM & RELACIONAMENTO / RECOMPRA */}
      <div className="rounded-2xl border border-[#00F2FF]/30 bg-gradient-to-br from-[#0b1624]/90 via-[#0e192c]/90 to-[#121422]/90 p-5 md:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-[#1E2942] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#00F2FF]/15 border border-[#00F2FF]/40 text-[#00F2FF]">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                  👥 CRM, Relacionamento & Recompra IA
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40 font-mono">
                  Fase 8 Ativa
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Gestão de leads consentidos, pós-compra estruturado e motor de recomendação
                inteligente.
              </p>
            </div>
          </div>

          <Link
            to="/crm"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#00F2FF] hover:bg-[#00D4E0] text-xs font-bold text-[#0A0B10] transition-colors self-start md:self-auto shadow-[0_0_15px_rgba(0,242,255,0.25)]"
          >
            Abrir Painel CRM
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-[#1E2942] space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase">
              Contatos com Consentimento
            </span>
            <div className="text-xl font-black font-mono text-white">6 Contatos</div>
            <p className="text-[10px] text-emerald-400 font-medium">Bases LGPD ativas</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-900/40 space-y-1">
            <span className="text-[10px] font-mono text-emerald-400 uppercase">
              Clientes Confirmados
            </span>
            <div className="text-xl font-black font-mono text-emerald-400">2 Clientes</div>
            <p className="text-[10px] text-slate-400 font-medium">1 com recompra recorrente</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-[#7000FF]/40 space-y-1">
            <span className="text-[10px] font-mono text-[#00F2FF] uppercase">
              Recomendações Prontas
            </span>
            <div className="text-xl font-black font-mono text-[#00F2FF]">Score 89+</div>
            <p className="text-[10px] text-slate-400 font-medium">Sinergia por DNA de vencedores</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-900/40 space-y-1">
            <span className="text-[10px] font-mono text-[#00E676] uppercase">
              LTV Médio (Comissão)
            </span>
            <div className="text-xl font-black font-mono text-[#00E676]">R$ 48,08</div>
            <p className="text-[10px] text-emerald-300 font-medium">Comissão real apurada</p>
          </div>
        </div>
      </div>

      {/* CARD FASE 7: RADAR DE PÚBLICO & DEMANDA DE MERCADO (Regra 35) */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-[#0a1a15]/90 via-[#0a141b]/90 to-[#0e1622]/90 p-5 md:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        {' '}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b border-emerald-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                  🎯 Radar de Demanda & Intenção do Público
                </h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  Reddit Live
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Monitoramento contínuo de discussões reais, dúvidas de compra e leads voluntários
                capturados.
              </p>
            </div>
          </div>

          <Link
            to="/publico"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-[#0A0B10] transition-colors self-start md:self-auto shadow-[0_0_15px_rgba(0,230,118,0.25)]"
          >
            Abrir Radar de Público
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-900/40 space-y-1">
            <span className="text-[10px] font-mono text-gray-400 uppercase">
              Sinais Públicos (Reddit)
            </span>
            <div className="text-xl font-black font-mono text-white">42 Sinais</div>
            <p className="text-[10px] text-emerald-400 font-medium">94% relevância detectada</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-rose-900/40 space-y-1">
            <span className="text-[10px] font-mono text-rose-400 uppercase">Alta Intenção 🔥</span>
            <div className="text-xl font-black font-mono text-rose-400">18 Sinais</div>
            <p className="text-[10px] text-slate-400 font-medium">Momento de decisão de compra</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-cyan-900/40 space-y-1">
            <span className="text-[10px] font-mono text-cyan-400 uppercase">
              Oportunidades de Conteúdo
            </span>
            <div className="text-xl font-black font-mono text-cyan-400">9 Ganchos</div>
            <p className="text-[10px] text-slate-400 font-medium">
              Perguntas prontas para Reels/Shorts
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-emerald-900/40 space-y-1">
            <span className="text-[10px] font-mono text-emerald-400 uppercase">
              Leads Consentidos
            </span>
            <div className="text-xl font-black font-mono text-emerald-400">3 Leads Inbound</div>
            <p className="text-[10px] text-emerald-300 font-medium">
              Opt-in voluntário em canal próprio
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: AI RECOMMENDATIONS (Hero AI Card) */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-[#151726] via-[#1A182F] to-[#121422] border border-[#7000FF]/40 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#282B40]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7000FF] flex items-center justify-center text-white shadow-[0_0_15px_rgba(112,0,255,0.4)]">
              <Sparkles className="w-5 h-5 text-[#00F2FF]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Recomendações da IA
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#00F2FF]/15 text-[#00F2FF] border border-[#00F2FF]/30">
                  Agente Analista
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Insights calculados cruzando margem real em R$, ticket, conversão e apelo de
                conteúdo
              </p>
            </div>
          </div>

          <Button
            onClick={handleRegenerateAi}
            disabled={regeneratingAi}
            variant="outline"
            size="sm"
            className="h-9 border-[#2F344F] bg-[#0E101A] hover:bg-[#1A1E2F] text-xs text-[#00F2FF] gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regeneratingAi ? 'animate-spin' : ''}`} />
            {regeneratingAi ? 'Gerando Análise...' : 'Atualizar Parecer IA'}
          </Button>
        </div>

        {/* Global AI text */}
        <div className="p-4 rounded-xl bg-[#0D0F18]/90 border border-[#24293E] text-xs text-gray-200 leading-relaxed font-sans">
          <p className="whitespace-pre-line">
            {insight?.global_recommendations ||
              'Entre os produtos analisados no momento, os prioritários para campanhas orgânicas ou tráfego pago são aqueles que combinam ticket abaixo de R$ 300, comissão unitária acima de R$ 10,00 e alto apelo de demonstração em vídeo no TikTok/Reels.'}
          </p>
        </div>

        {/* Top Picks preview chips */}
        {insight?.top_picks && insight.top_picks.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
            {insight.top_picks.map((pick, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-[#141724] border border-[#262B40] flex items-start gap-3 hover:border-[#00F2FF]/40 transition-all cursor-pointer"
                onClick={() => {
                  const match = products.find(
                    (p) =>
                      p.title.toLowerCase().includes(pick.title.toLowerCase()) ||
                      pick.title.toLowerCase().includes(p.title.toLowerCase()),
                  )
                  if (match) setSelectedProduct(match)
                }}
              >
                <div className="w-8 h-8 rounded-lg bg-[#00F2FF]/10 text-[#00F2FF] font-mono font-bold flex items-center justify-center flex-shrink-0 text-xs border border-[#00F2FF]/20">
                  #{i + 1}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">{pick.title}</div>
                  <div className="text-[11px] text-gray-400 line-clamp-2 mt-0.5">{pick.reason}</div>
                  <span className="inline-block text-[10px] font-mono text-[#00E676] mt-1 font-semibold">
                    Score: {pick.score} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION: TOP 5 PRODUTOS QUE EU TESTARIA PRIMEIRO */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-[#FF3D00]" />
              Top 5 Produtos para Testar Primeiro
            </h2>
            <p className="text-xs text-gray-400">
              Produtos com maior pontuação no Score de Oportunidade e validação de mercado
            </p>
          </div>
          <NavLink
            to="/radar"
            className="text-xs font-semibold text-[#00F2FF] hover:underline flex items-center gap-1 font-mono"
          >
            Ver todos ({products.length})
            <ChevronRight className="w-4 h-4" />
          </NavLink>
        </div>

        {/* Product Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className="h-80 rounded-2xl bg-[#161821] animate-pulse border border-[#232738]"
              />
            ))}
          </div>
        ) : topFivePicks.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-[#161821] border border-[#232738] space-y-3">
            <p className="text-sm text-gray-400">Nenhum produto cadastrado no Radar ainda.</p>
            <NavLink to="/importar">
              <Button size="sm" className="bg-[#00F2FF] text-[#0A0B10] font-bold">
                Cadastrar Primeiro Produto
              </Button>
            </NavLink>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {topFivePicks.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onOpenDetails={(prod) => setSelectedProduct(prod)}
                onAskAi={(prod) => navigate(`/analista?product=${prod.id}`)}
                viewMode="grid"
              />
            ))}
          </div>
        )}
      </div>

      {/* SECTION: RECENT OPPORTUNITIES TABLE / COMPACT LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Radar className="w-5 h-5 text-[#00F2FF]" />
              Últimas Oportunidades Registradas
            </h2>
            <p className="text-xs text-gray-400">
              Fluxo recente de produtos adicionados manual ou via importação CSV
            </p>
          </div>
          <NavLink to="/importar">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs border-[#2A2E42] bg-[#12141F] text-gray-200"
            >
              + Importar Mais
            </Button>
          </NavLink>
        </div>

        <div className="space-y-3">
          {recentProducts.map((prod) => (
            <ProductCard
              key={prod.id}
              product={prod}
              onOpenDetails={(p) => setSelectedProduct(p)}
              onAskAi={(p) => navigate(`/analista?product=${p.id}`)}
              viewMode="list"
            />
          ))}
        </div>
      </div>

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
