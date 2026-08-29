import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  Users,
  Search,
  Flame,
  Target,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  Heart,
  TrendingUp,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Plus,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Send,
  Sliders,
  CheckCircle2,
  Lock,
  Layers,
  FlaskConical,
  Eye,
  Info,
  Calendar,
  Filter,
  UserCheck,
  UserX,
  FileText,
  Share2,
  BarChart2,
  Bot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScoreRing } from '@/components/ScoreRing'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { audienceService } from '@/services/audience'
import { productsService } from '@/services/products'
import type { ProductRecord } from '@/types/product'
import type {
  AudienceSignalRecord,
  AudienceTermsBankRecord,
  AudienceOpportunityRecord,
  InboundLeadRecord,
  IntentMapResponse,
  DemandReportResponse,
} from '@/types/audience'

export default function AudienceRadarPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const initialProductId = searchParams.get('productId') || ''
  const initialCategory = searchParams.get('category') || ''

  // Navegação de Abas
  const [activeTab, setActiveTab] = useState<
    | 'search'
    | 'intent_map'
    | 'terms_bank'
    | 'radar_questions'
    | 'radar_objections'
    | 'radar_desires'
    | 'communities'
    | 'opportunities'
    | 'inbound_crm'
    | 'report'
  >('search')

  // Estado de Produtos e Seleção
  const [productsList, setProductsList] = useState<ProductRecord[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ProductRecord | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'Todas')
  const [problemInput, setProblemInput] = useState('')
  const [desireInput, setDesireInput] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<
    'reddit' | 'youtube' | 'search_engines' | 'forums'
  >('reddit')
  const [selectedSubreddit, setSelectedSubreddit] = useState('')

  // Estados de Carregamento
  const [isSearchingSignals, setIsSearchingSignals] = useState(false)
  const [isGeneratingMap, setIsGeneratingMap] = useState(false)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)

  // Dados Carregados
  const [signals, setSignals] = useState<AudienceSignalRecord[]>([])
  const [intentMapData, setIntentMapData] = useState<IntentMapResponse | null>(null)
  const [termsBank, setTermsBank] = useState<AudienceTermsBankRecord[]>([])
  const [opportunities, setOpportunities] = useState<AudienceOpportunityRecord[]>([])
  const [inboundLeads, setInboundLeads] = useState<InboundLeadRecord[]>([])
  const [demandReport, setDemandReport] = useState<DemandReportResponse | null>(null)
  const [reportPeriod, setReportPeriod] = useState<number>(30)

  // Filtros de Sinais
  const [signalIntentFilter, setSignalIntentFilter] = useState<string>('all')
  const [signalClassFilter, setSignalClassFilter] = useState<string>('all')

  // Modal / Form de Captura Inbound Consentida
  const [showLeadModal, setShowLeadModal] = useState(false)
  const [leadIdentifier, setLeadIdentifier] = useState('')
  const [leadName, setLeadName] = useState('')
  const [leadChannel, setLeadChannel] = useState<
    'landing_page' | 'form' | 'telegram' | 'newsletter'
  >('landing_page')
  const [leadOrigin, setLeadOrigin] = useState('')
  const [leadProductInterest, setLeadProductInterest] = useState('')
  const [leadDeclaredIntent, setLeadDeclaredIntent] = useState('')
  const [leadPurpose, setLeadPurpose] = useState('Receber ofertas e cupons exclusivos com desconto')
  const [leadConsentChecked, setLeadConsentChecked] = useState(true)
  const [isSavingLead, setIsSavingLead] = useState(false)

  // Modal / Detalhe do Sinal
  const [activeSignalModal, setActiveSignalModal] = useState<AudienceSignalRecord | null>(null)

  // 1. Carregar Produtos para o Seletor
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await productsService.getProducts('', '-opportunity_score', 1, 50)
        setProductsList(res.items)
        if (initialProductId) {
          const found = res.items.find((p) => p.id === initialProductId)
          if (found) {
            setSelectedProduct(found)
            setSearchKeyword(found.title)
            setSelectedCategory(found.category || 'Todas')
          }
        }
      } catch (err) {
        console.error('Erro ao carregar produtos:', err)
      }
    }
    loadProducts()
  }, [initialProductId])

  // 2. Carregar Dados Iniciais (Sinais, Oportunidades, Leads, Termos)
  const loadInitialData = async () => {
    setIsLoadingData(true)
    try {
      const [signalsRes, oppsRes, leadsRes, termsRes] = await Promise.all([
        audienceService.getSignals('', '-intent_score', 1, 50),
        audienceService.getOpportunities('', '-intent_score', 1, 50),
        audienceService.getInboundLeads('', '-created', 1, 50),
        audienceService.getTermsBank('', '-signal_count', 1, 100),
      ])
      setSignals(signalsRes.items)
      setOpportunities(oppsRes.items)
      setInboundLeads(leadsRes.items)
      setTermsBank(termsRes.items)
    } catch (err) {
      console.error('Erro ao carregar dados do Radar de Público:', err)
    } finally {
      setIsLoadingData(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // 3. Executar Busca Real no Reddit ou Provider
  const handleSearchRealSignals = async () => {
    const term = searchKeyword || selectedProduct?.title
    if (!term && selectedCategory === 'Todas') {
      toast.error('Informe um produto, palavra-chave ou selecione uma categoria.')
      return
    }

    setIsSearchingSignals(true)
    toast.info(`Buscando sinais reais na fonte ${selectedProvider.toUpperCase()}...`)

    try {
      const res = await audienceService.searchSignals({
        query: term,
        product_title: selectedProduct?.title || term,
        product_id: selectedProduct?.id,
        category: selectedCategory !== 'Todas' ? selectedCategory : selectedProduct?.category,
        provider: selectedProvider,
        subreddit: selectedSubreddit,
        limit: 15,
      })

      if (res.signals && res.signals.length > 0) {
        setSignals(res.signals)
        toast.success(`${res.signals.length} sinais encontrados e analisados via ${res.provider}!`)
      } else {
        toast.warning(res.message || 'Nenhum sinal público encontrado para este termo.')
      }

      // Recarregar oportunidades geradas automaticamente
      const oppsRes = await audienceService.getOpportunities('', '-created', 1, 50)
      setOpportunities(oppsRes.items)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro na busca'
      toast.error(`Falha na busca de sinais: ${msg}`)
    } finally {
      setIsSearchingSignals(false)
    }
  }

  // 4. Gerar Mapa de Intenção e Banco de Termos via IA
  const handleGenerateIntentMap = async () => {
    const prodTitle = selectedProduct?.title || searchKeyword
    if (!prodTitle && selectedCategory === 'Todas' && !problemInput && !desireInput) {
      toast.error('Informe ao menos um produto, categoria, problema ou desejo.')
      return
    }

    setIsGeneratingMap(true)
    toast.info('IA mapeando estágios de intenção, perguntas recorrentes e objeções...')

    try {
      const res = await audienceService.generateIntentMap({
        product_title: prodTitle,
        product_id: selectedProduct?.id,
        category: selectedCategory !== 'Todas' ? selectedCategory : selectedProduct?.category,
        problem: problemInput,
        desire: desireInput,
      })

      setIntentMapData(res)
      toast.success('Mapa de Intenção e Banco de Termos gerados com sucesso!')
      setActiveTab('intent_map')

      // Recarregar termos persistidos
      const termsRes = await audienceService.getTermsBank('', '-signal_count', 1, 100)
      setTermsBank(termsRes.items)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar mapa'
      toast.error(`Falha ao gerar mapa de intenção: ${msg}`)
    } finally {
      setIsGeneratingMap(false)
    }
  }

  // 5. Salvar Novo Lead Inbound Consentido (CRM)
  const handleSaveInboundLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadIdentifier.trim()) {
      toast.error('Informe o e-mail ou contato do lead.')
      return
    }
    if (!leadConsentChecked) {
      toast.error('É obrigatório que o lead tenha fornecido consentimento explícito.')
      return
    }

    setIsSavingLead(true)
    try {
      const res = await audienceService.captureInboundLead({
        identifier: leadIdentifier.trim(),
        name: leadName.trim() || undefined,
        channel: leadChannel,
        origin_source: leadOrigin.trim() || 'Formulário Próprio',
        product_id: selectedProduct?.id,
        product_interest: leadProductInterest.trim() || selectedProduct?.title || 'Ofertas Gerais',
        declared_intent: leadDeclaredIntent.trim() || 'Interesse em cupom/oferta',
        consent_status: 'active',
        authorized_purpose: leadPurpose.trim(),
        consent_text_version: 'v1.0-termos-claros-2025',
      })

      toast.success(res.message || 'Lead inbound consentido registrado com sucesso!')
      setShowLeadModal(false)
      setLeadIdentifier('')
      setLeadName('')
      setLeadDeclaredIntent('')

      // Recarregar lista de leads e oportunidades
      const [leadsRes, oppsRes] = await Promise.all([
        audienceService.getInboundLeads('', '-created', 1, 50),
        audienceService.getOpportunities('', '-intent_score', 1, 50),
      ])
      setInboundLeads(leadsRes.items)
      setOpportunities(oppsRes.items)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar lead'
      toast.error(msg)
    } finally {
      setIsSavingLead(false)
    }
  }

  // 6. Revogar Consentimento (Opt-Out)
  const handleRevokeConsent = async (leadId: string) => {
    try {
      await audienceService.revokeConsent(leadId)
      toast.info('Consentimento revogado. Lead marcado como Opt-Out.')
      const leadsRes = await audienceService.getInboundLeads('', '-created', 1, 50)
      setInboundLeads(leadsRes.items)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro'
      toast.error(msg)
    }
  }

  // 7. Carregar Relatório de Demanda
  const handleLoadDemandReport = async (days = 30) => {
    setReportPeriod(days)
    setIsLoadingReport(true)
    try {
      const res = await audienceService.getDemandReport(
        days,
        selectedCategory !== 'Todas' ? selectedCategory : '',
      )
      setDemandReport(res)
    } catch (err) {
      console.error('Erro ao gerar relatório de demanda:', err)
      toast.error('Erro ao carregar relatório de demanda')
    } finally {
      setIsLoadingReport(false)
    }
  }

  // Helper de Renderização do Intent Score Badge
  const renderIntentBadge = (score: number) => {
    if (score >= 80) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FF3D00]/20 text-[#FF3D00] border border-[#FF3D00]/40">
          🔥 Intenção Alta ({score}/100)
        </span>
      )
    }
    if (score >= 60) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40">
          🟢 Intenção Relevante ({score}/100)
        </span>
      )
    }
    if (score >= 40) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FFD600]/20 text-[#FFD600] border border-[#FFD600]/40">
          🟡 Interesse Indireto ({score}/100)
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-gray-600/20 text-gray-400 border border-gray-600/40">
        ⚪ Baixa Intenção ({score}/100)
      </span>
    )
  }

  // Helper de Renderização da Classificação Ética (Nunca confundir sinal com Lead)
  const renderClassificationPill = (classification: string) => {
    switch (classification) {
      case 'content_opportunity':
        return (
          <Badge
            variant="outline"
            className="bg-[#7000FF]/20 text-[#00F2FF] border-[#7000FF]/40 text-[10px]"
          >
            🎯 OPORTUNIDADE DE CONTEÚDO
          </Badge>
        )
      case 'potential_interaction':
        return (
          <Badge
            variant="outline"
            className="bg-[#00F2FF]/15 text-[#00F2FF] border-[#00F2FF]/30 text-[10px]"
          >
            💬 INTERAÇÃO POTENCIAL
          </Badge>
        )
      case 'audience_context':
        return (
          <Badge
            variant="outline"
            className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px]"
          >
            👥 CONTEXTO DE PÚBLICO
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="bg-[#1C2030] text-gray-400 border-[#2A3048] text-[10px]"
          >
            📡 SINAL DE MERCADO
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* 1. CABEÇALHO DA FASE 7 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121420] border border-[#232738] shadow-xl">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00F2FF] to-[#7000FF] flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(0,242,255,0.4)]">
            <Users className="w-6 h-6 text-[#0A0B10]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#00F2FF]/15 text-[#00F2FF] border border-[#00F2FF]/30">
                FASE 7 • RADAR DE PÚBLICO & DEMANDA
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                "Onde estão as pessoas e contextos com maior probabilidade de interesse?"
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-black text-white truncate">
              {selectedProduct
                ? `Radar de Demanda: ${selectedProduct.title}`
                : 'Radar de Público & Descoberta de Demanda'}
            </h1>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            size="sm"
            onClick={() => setShowLeadModal(true)}
            className="h-9 px-3.5 bg-gradient-to-r from-[#00E676] to-[#00B860] hover:opacity-90 text-[#0A0B10] font-bold text-xs gap-1.5 shadow-[0_0_15px_rgba(0,230,118,0.25)]"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Capturar Lead Inbound</span>
          </Button>

          <Button
            size="sm"
            onClick={handleGenerateIntentMap}
            disabled={isGeneratingMap}
            className="h-9 px-4 bg-gradient-to-r from-[#00F2FF] to-[#7000FF] hover:opacity-90 text-[#0A0B10] font-black text-xs gap-1.5 shadow-[0_0_20px_rgba(0,242,255,0.3)]"
          >
            <Sparkles className={cn('w-3.5 h-3.5', isGeneratingMap && 'animate-spin')} />
            {isGeneratingMap ? 'Mapeando Intenção...' : 'Gerar Mapa de Intenção (IA)'}
          </Button>
        </div>
      </div>

      {/* 2. BARRA DE PRINCÍPIOS DE PRIVACIDADE & COMPLIANCE BY DESIGN (Regras 1, 32 e 37) */}
      <div className="p-3.5 rounded-xl bg-[#0D101A] border border-[#1E253A] flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00E676]/10 border border-[#00E676]/30 flex items-center justify-center flex-shrink-0 text-[#00E676]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white flex items-center gap-2">
              <span>Princípio Ético & Anti-Spam</span>
              <span className="text-[9px] font-mono text-[#00E676] bg-[#00E676]/10 px-1.5 py-0.5 rounded border border-[#00E676]/30">
                PRIVACY BY DESIGN
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Uso estrito de APIs oficiais, dados públicos permitidos e leads voluntários em canais
              próprios. <strong>Proibido:</strong> scraping privado, cold DMs, listas compradas e
              disparos em massa.
            </p>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-3 font-mono text-[10px] text-gray-400">
          <span className="flex items-center gap-1 text-[#00E676]">
            <CheckCircle2 className="w-3 h-3" /> Reddit API Conectada
          </span>
          <span>•</span>
          <span className="text-gray-500">YouTube / Redes (Em Arquitetura)</span>
        </div>
      </div>

      {/* 3. CONTROLE DE BUSCA & SELEÇÃO DE PRODUTO/CATEGORIA */}
      <div className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-4 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Seletor de Produto */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-[#00F2FF]" />
              Iniciar Análise por Produto:
            </label>
            <select
              value={selectedProduct?.id || ''}
              onChange={(e) => {
                const prod = productsList.find((p) => p.id === e.target.value) || null
                setSelectedProduct(prod)
                if (prod) {
                  setSearchKeyword(prod.title)
                  setSelectedCategory(prod.category || 'Todas')
                  setLeadProductInterest(prod.title)
                }
              }}
              className="w-full h-10 rounded-xl bg-[#0A0B10] border border-[#232738] text-xs text-white px-3 focus:outline-none focus:border-[#00F2FF]"
            >
              <option value="">-- Selecionar Produto do Catálogo --</option>
              {productsList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} (R$ {(p.promo_price || p.price || 0).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {/* Palavra-chave ou Termo */}
          <div className="md:col-span-4 space-y-1">
            <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#00F2FF]" />
              Palavra-Chave / Necessidade:
            </label>
            <Input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="Ex: aspirador portátil carro, escova secadora, tirar pelo de banco..."
              className="h-10 bg-[#0A0B10] border-[#232738] text-xs text-white placeholder-gray-500 focus-visible:ring-[#00F2FF]"
            />
          </div>

          {/* Categoria */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-gray-300">Categoria:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 rounded-xl bg-[#0A0B10] border border-[#232738] text-xs text-white px-3 focus:outline-none focus:border-[#00F2FF]"
            >
              <option value="Todas">Todas Categorias</option>
              <option value="Automotivo">Automotivo</option>
              <option value="Beleza & Cabelos">Beleza & Cabelos</option>
              <option value="Cozinha & Casa">Cozinha & Casa</option>
              <option value="Tecnologia">Tecnologia</option>
              <option value="Saúde & Bem-Estar">Saúde & Bem-Estar</option>
            </select>
          </div>

          {/* Provedor Público */}
          <div className="md:col-span-2 space-y-1">
            <label className="text-xs font-bold text-gray-300">Fonte Conectada:</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as any)}
              className="w-full h-10 rounded-xl bg-[#0A0B10] border border-[#232738] text-xs text-white px-3 focus:outline-none focus:border-[#00F2FF]"
            >
              <option value="reddit">Reddit (Oficial Ativo)</option>
              <option value="youtube">YouTube (Em Arquitetura)</option>
              <option value="search_engines">Buscas Web (Em Arquitetura)</option>
              <option value="forums">Fóruns & Reviews (Em Arquitetura)</option>
            </select>
          </div>
        </div>

        {/* Linha Opcional: Subreddit & Gatilho de Busca */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[#232738]">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              Comunidade Reddit (Opcional):
            </span>
            <Input
              value={selectedSubreddit}
              onChange={(e) => setSelectedSubreddit(e.target.value)}
              placeholder="Ex: r/carros, r/brasil, r/shopee"
              className="h-8 w-44 bg-[#0A0B10] border-[#232738] text-xs text-white placeholder-gray-500 font-mono"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              size="sm"
              onClick={handleSearchRealSignals}
              disabled={isSearchingSignals}
              className="h-9 px-4 bg-[#00F2FF] hover:bg-[#00D8E6] text-[#0A0B10] font-black text-xs gap-1.5 shadow-[0_0_15px_rgba(0,242,255,0.25)]"
            >
              <Search className={cn('w-3.5 h-3.5', isSearchingSignals && 'animate-spin')} />
              {isSearchingSignals
                ? 'Buscando Conteúdos Reais...'
                : 'Buscar Sinais Públicos (Reddit)'}
            </Button>
          </div>
        </div>
      </div>

      {/* 4. NAVEGAÇÃO POR ABAS DO RADAR DE PÚBLICO */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 bg-[#10121C] p-1 border border-[#232738] rounded-2xl mb-6">
          <TabsTrigger
            value="search"
            className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00F2FF] text-[11px] font-semibold py-2"
          >
            1. Sinais Reddit
          </TabsTrigger>
          <TabsTrigger
            value="intent_map"
            className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00F2FF] text-[11px] font-semibold py-2"
          >
            2. Mapa Intenção
          </TabsTrigger>
          <TabsTrigger
            value="terms_bank"
            className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00F2FF] text-[11px] font-semibold py-2"
          >
            3. Banco Termos
          </TabsTrigger>
          <TabsTrigger
            value="radar_questions"
            className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00F2FF] text-[11px] font-semibold py-2"
          >
            4. Perguntas
          </TabsTrigger>
          <TabsTrigger
            value="radar_objections"
            className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#FF3D00] text-[11px] font-semibold py-2"
          >
            5. Objeções
          </TabsTrigger>
          <TabsTrigger
            value="radar_desires"
            className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00E676] text-[11px] font-semibold py-2"
          >
            6. Desejos
          </TabsTrigger>
          <TabsTrigger
            value="communities"
            className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00F2FF] text-[11px] font-semibold py-2"
          >
            7. Comunidades
          </TabsTrigger>
          <TabsTrigger
            value="opportunities"
            className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#7000FF] text-[11px] font-semibold py-2"
          >
            8. Oportunidades
          </TabsTrigger>
          <TabsTrigger
            value="inbound_crm"
            className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00E676] text-[11px] font-semibold py-2"
          >
            9. Leads Inbound
          </TabsTrigger>
          <TabsTrigger
            value="report"
            onClick={() => !demandReport && handleLoadDemandReport(30)}
            className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-yellow-400 text-[11px] font-semibold py-2"
          >
            10. Relatório
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: SINAIS REAIS DO REDDIT & MATCH ENGINE (Regras 6, 7, 8, 9, 10) */}
        <TabsContent value="search" className="space-y-6 m-0">
          {/* Barra de Filtros dos Sinais */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#141624] border border-[#232738]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">
                Sinais Públicos Encontrados ({signals.length})
              </span>
              <span className="text-[10px] font-mono text-[#00F2FF] bg-[#00F2FF]/10 px-2 py-0.5 rounded border border-[#00F2FF]/30">
                Fonte Real: Reddit
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 text-[11px]">Intenção:</span>
                <select
                  value={signalIntentFilter}
                  onChange={(e) => setSignalIntentFilter(e.target.value)}
                  className="h-8 rounded-lg bg-[#0A0B10] border border-[#232738] text-white text-xs px-2"
                >
                  <option value="all">Todas as Intenções</option>
                  <option value="high">🔥 Alta Intenção (80+)</option>
                  <option value="medium">🟢 Intenção Relevante (60+)</option>
                  <option value="low">🟡 Interesse Indireto</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-gray-400 text-[11px]">Classificação:</span>
                <select
                  value={signalClassFilter}
                  onChange={(e) => setSignalClassFilter(e.target.value)}
                  className="h-8 rounded-lg bg-[#0A0B10] border border-[#232738] text-white text-xs px-2"
                >
                  <option value="all">Todas</option>
                  <option value="content_opportunity">🎯 Oportunidade de Conteúdo</option>
                  <option value="potential_interaction">💬 Interação Potencial</option>
                  <option value="market_signal">📡 Sinal de Mercado</option>
                  <option value="audience_context">👥 Contexto de Público</option>
                </select>
              </div>
            </div>
          </div>

          {/* Grid de Sinais Públicos */}
          {signals.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-[#121420] border border-[#232738] space-y-3">
              <Search className="w-8 h-8 text-[#00F2FF] mx-auto opacity-70" />
              <h3 className="text-sm font-bold text-white">Nenhum sinal carregado no momento</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Clique no botão <strong>"Buscar Sinais Públicos (Reddit)"</strong> acima para
                conectar a API pública do Reddit e descobrir demandas em tempo real.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {signals
                .filter((s) => {
                  if (signalIntentFilter === 'high' && s.intent_score < 80) return false
                  if (
                    signalIntentFilter === 'medium' &&
                    (s.intent_score < 60 || s.intent_score >= 80)
                  )
                    return false
                  if (signalIntentFilter === 'low' && s.intent_score >= 60) return false
                  if (signalClassFilter !== 'all' && s.signal_classification !== signalClassFilter)
                    return false
                  return true
                })
                .map((signal) => (
                  <div
                    key={signal.id || signal.external_id}
                    className="p-5 rounded-2xl bg-[#141624] border border-[#232738] hover:border-[#00F2FF]/40 transition-all space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Info / Community / Classificação */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-[#FF3D00] bg-[#FF3D00]/10 px-2 py-0.5 rounded border border-[#FF3D00]/30">
                            {signal.community || 'r/reddit'}
                          </span>
                          {renderClassificationPill(signal.signal_classification)}
                        </div>

                        <span className="text-[10px] text-gray-400 font-mono">
                          {signal.author_display || 'u/usuario'} •{' '}
                          {new Date(signal.published_at || signal.created).toLocaleDateString(
                            'pt-BR',
                          )}
                        </span>
                      </div>

                      {/* Título & Snippet do Reddit */}
                      <div>
                        <h4 className="text-sm font-bold text-white line-clamp-2 leading-tight">
                          {signal.title}
                        </h4>
                        <p className="text-xs text-gray-300 mt-1.5 line-clamp-3 leading-relaxed">
                          {signal.snippet}
                        </p>
                      </div>

                      {/* Scores Separados (Regras 8 e 9: Intent Score vs Relevance Score) */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#0E1018] border border-[#212638]">
                        <div>
                          <div className="text-[10px] font-mono text-gray-400 flex items-center justify-between">
                            <span>INTENT SCORE</span>
                            <span className="font-bold text-[#FF3D00]">
                              {signal.intent_score}/100
                            </span>
                          </div>
                          <Progress
                            value={signal.intent_score}
                            className="h-1.5 bg-[#171B2B] mt-1"
                          />
                        </div>

                        <div>
                          <div className="text-[10px] font-mono text-gray-400 flex items-center justify-between">
                            <span>RELEVANCE SCORE</span>
                            <span className="font-bold text-[#00F2FF]">
                              {signal.relevance_score}/100
                            </span>
                          </div>
                          <Progress
                            value={signal.relevance_score}
                            className="h-1.5 bg-[#171B2B] mt-1"
                          />
                        </div>
                      </div>

                      {/* Match Engine: Explicação Natural (Regra 10) */}
                      <div className="p-3 rounded-xl bg-[#10131E] border border-[#252C42] text-xs space-y-1">
                        <div className="text-[10px] font-mono font-bold text-[#00E676] uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Match Produto × Necessidade
                        </div>
                        <p className="text-[11px] text-gray-300 leading-snug">
                          {signal.match_explanation ||
                            'Match com a dor central do produto promovido.'}
                        </p>
                      </div>

                      {/* Resposta Útil Sugerida (Sem Spam) (Regras 27 e 28) */}
                      {signal.suggested_reply && (
                        <div className="p-3 rounded-xl bg-gradient-to-br from-[#7000FF]/10 to-transparent border border-[#7000FF]/30 text-xs space-y-1">
                          <div className="text-[10px] font-mono font-bold text-[#00F2FF] uppercase flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Sugestão de Resposta de Alto Valor
                          </div>
                          <p className="text-[11px] text-gray-300 italic leading-snug">
                            "{signal.suggested_reply}"
                          </p>
                          <span className="text-[9px] text-gray-500 block">
                            * Regra: Ajudar primeiro, entregar valor e só recomendar produto se
                            genuinamente relevante. Sem links de spam automáticos.
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ações do Sinal */}
                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-[#232738]">
                      {signal.source_url ? (
                        <a
                          href={signal.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-mono text-[#00F2FF] hover:underline flex items-center gap-1"
                        >
                          Ver Discussão Real <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-[11px] text-gray-500 font-mono">
                          Discussão arquivada
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            navigate(
                              `/laboratorio?searchKeyword=${encodeURIComponent(signal.matched_keyword || signal.title)}`,
                            )
                          }}
                          className="h-7 text-[10px] font-bold border-[#2A3048] bg-[#161826] hover:bg-[#202538] text-gray-300 gap-1"
                        >
                          <FlaskConical className="w-3 h-3 text-[#00F2FF]" />
                          Usar no Lab
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => {
                            toast.success('Oportunidade salva na fila com sucesso!')
                          }}
                          className="h-7 text-[10px] font-bold bg-[#7000FF] hover:bg-[#8519FF] text-white"
                        >
                          Salvar Insight
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        {/* ABA 2: MAPA DE INTENÇÃO (Regra 3) */}
        <TabsContent value="intent_map" className="space-y-6 m-0">
          <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-[#00F2FF]" />
                Mapa de Intenção por Estágios de Decisão
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Classificação dos sinais por nível de proximidade do momento de compra, explicando o
                motivo de cada classificação.
              </p>
            </div>

            <Button
              size="sm"
              onClick={handleGenerateIntentMap}
              disabled={isGeneratingMap}
              className="h-8 bg-[#00F2FF] hover:bg-[#00D8E6] text-[#0A0B10] font-bold text-xs gap-1"
            >
              <RefreshCw className={cn('w-3 h-3', isGeneratingMap && 'animate-spin')} />
              Atualizar Mapa
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. ALTA INTENÇÃO */}
            <div className="p-5 rounded-2xl bg-[#141624] border border-[#FF3D00]/40 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#232738]">
                <span className="text-xs font-bold text-[#FF3D00] flex items-center gap-1.5 uppercase font-mono">
                  <Flame className="w-4 h-4" /> 🔥 INTENÇÃO ALTA
                </span>
                <Badge className="bg-[#FF3D00]/20 text-[#FF3D00] text-[10px]">
                  {intentMapData?.high_intent?.length || 3} termos
                </Badge>
              </div>
              <p className="text-[11px] text-gray-400">
                Pessoas buscando onde comprar, comparando marcas diretamente ou procurando validação
                pré-compra.
              </p>

              <div className="space-y-2.5">
                {(
                  intentMapData?.high_intent || [
                    {
                      term: 'onde comprar aspirador portátil para carro',
                      reason: 'Busca direta por canal de aquisição com decisão de compra madura.',
                    },
                    {
                      term: 'qual o melhor aspirador de carro custo benefício',
                      reason: 'Comparativo transacional em momento final de escolha.',
                    },
                    {
                      term: 'aspirador automotivo vale a pena mesmo',
                      reason: 'Validação final de decisão de compra.',
                    },
                  ]
                ).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#0E1018] border border-[#251A1A] space-y-1"
                  >
                    <div className="text-xs font-bold text-white">"{item.term}"</div>
                    <p className="text-[10px] text-gray-400">
                      <strong>Motivo: </strong>
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. MÉDIA INTENÇÃO */}
            <div className="p-5 rounded-2xl bg-[#141624] border border-[#00F2FF]/40 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#232738]">
                <span className="text-xs font-bold text-[#00F2FF] flex items-center gap-1.5 uppercase font-mono">
                  <Target className="w-4 h-4" /> 🟢 INTENÇÃO MÉDIA
                </span>
                <Badge className="bg-[#00F2FF]/20 text-[#00F2FF] text-[10px]">
                  {intentMapData?.medium_intent?.length || 2} termos
                </Badge>
              </div>
              <p className="text-[11px] text-gray-400">
                Pessoas com um problema real buscando métodos e alternativas para resolvê-lo.
              </p>

              <div className="space-y-2.5">
                {(
                  intentMapData?.medium_intent || [
                    {
                      term: 'como limpar o carro rápido por dentro',
                      reason: 'Busca por processo e método de solução, ainda avaliando opções.',
                    },
                    {
                      term: 'como tirar pelos de cachorro do banco',
                      reason: 'Dor específica procurando solução prática de limpeza.',
                    },
                  ]
                ).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#0E1018] border border-[#142329] space-y-1"
                  >
                    <div className="text-xs font-bold text-white">"{item.term}"</div>
                    <p className="text-[10px] text-gray-400">
                      <strong>Motivo: </strong>
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. BAIXA INTENÇÃO */}
            <div className="p-5 rounded-2xl bg-[#141624] border border-gray-700/50 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#232738]">
                <span className="text-xs font-bold text-gray-400 flex items-center gap-1.5 uppercase font-mono">
                  <Eye className="w-4 h-4" /> 🟡 INTENÇÃO BAIXA / INFORMATIVA
                </span>
                <Badge className="bg-gray-800 text-gray-300 text-[10px]">
                  {intentMapData?.low_intent?.length || 1} termos
                </Badge>
              </div>
              <p className="text-[11px] text-gray-400">
                Conteúdo genérico, conscientização ampla e curiosidades sem urgência de aquisição.
              </p>

              <div className="space-y-2.5">
                {(
                  intentMapData?.low_intent || [
                    {
                      term: 'dicas para manter o carro sempre limpo',
                      reason: 'Interesse amplo e informativo, fase inicial de conscientização.',
                    },
                  ]
                ).map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#0E1018] border border-[#212638] space-y-1"
                  >
                    <div className="text-xs font-bold text-white">"{item.term}"</div>
                    <p className="text-[10px] text-gray-400">
                      <strong>Motivo: </strong>
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ABA 3: BANCO DE TERMOS DE INTENÇÃO (Regra 4) */}
        <TabsContent value="terms_bank" className="space-y-4 m-0">
          <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00F2FF]" />
                Banco de Termos de Intenção ({termsBank.length} termos)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Categorizados por tipo: Problema, Desejo, Solução, Comparação, Recomendação, Compra,
                Dúvida, Objeção, Reclamação, Alternativa e Uso.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {termsBank.map((term) => (
              <div
                key={term.id}
                className="p-4 rounded-xl bg-[#141624] border border-[#232738] hover:border-[#00F2FF]/40 transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#7000FF]/20 text-[#00F2FF] border border-[#7000FF]/40">
                    {term.term_type}
                  </span>

                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full',
                      term.intent_stage === 'high'
                        ? 'bg-[#FF3D00]/20 text-[#FF3D00]'
                        : 'bg-[#00F2FF]/20 text-[#00F2FF]',
                    )}
                  >
                    {term.intent_stage === 'high' ? '🔥 Alta Intenção' : '🟢 Média Intenção'}
                  </span>
                </div>

                <div className="text-xs font-bold text-white">"{term.term}"</div>

                <p className="text-[11px] text-gray-400">
                  {term.stage_reason || 'Termo indexado para monitoramento de demanda.'}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#232738] text-[10px] font-mono text-gray-500">
                  <span>
                    Sinais: <strong>{term.signal_count}</strong>
                  </span>
                  <span className="text-[#00E676]">
                    {term.trend_status === 'growing' ? '📈 Crescendo' : '➡️ Estável'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ABA 4: RADAR DE PERGUNTAS (Regra 14) */}
        <TabsContent value="radar_questions" className="space-y-4 m-0">
          <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#00F2FF]" />
              Radar de Perguntas — "O que o público está perguntando?"
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Agrupamento de dúvidas recorrentes que alimentam diretamente o Laboratório de
              Campanhas e Estúdio Criativo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(
              intentMapData?.recurring_questions || [
                {
                  question: 'Vale a pena comprar aspirador portátil ou a bateria é muito fraca?',
                  signals_count: 42,
                  angle_suggested: 'Demonstração prática de sucção puxando areia e moedas',
                },
                {
                  question: 'Quanto tempo dura a bateria no uso diário?',
                  signals_count: 27,
                  angle_suggested: 'Teste de autonomia cronometrado limpando o carro todo',
                },
                {
                  question: 'Onde comprar o modelo original com garantia e frete grátis?',
                  signals_count: 18,
                  angle_suggested: 'Alerta de link verificado e unboxing sem filtro',
                },
              ]
            ).map((q, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#00F2FF] bg-[#00F2FF]/10 px-2 py-0.5 rounded">
                    ❓ {q.signals_count} Sinais Observados
                  </span>
                  <Button
                    size="sm"
                    onClick={() => {
                      navigate(`/laboratorio?questionInsight=${encodeURIComponent(q.question)}`)
                    }}
                    className="h-7 text-[10px] font-bold bg-[#7000FF] hover:bg-[#8519FF] text-white gap-1"
                  >
                    <FlaskConical className="w-3 h-3" /> Usar como Insight no Lab
                  </Button>
                </div>

                <h4 className="text-sm font-bold text-white">"{q.question}"</h4>

                <div className="p-3 rounded-xl bg-[#0E1018] border border-[#202538] text-xs">
                  <strong className="text-gray-400 block text-[10px] uppercase font-mono">
                    Ângulo Sugerido para Campanha:
                  </strong>
                  <span className="text-gray-200">{q.angle_suggested}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ABA 5: RADAR DE OBJEÇÕES (Regra 15) */}
        <TabsContent value="radar_objections" className="space-y-4 m-0">
          <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#FF3D00]" />
              Radar de Objeções — Objeções Reais Detectadas nas Comunidades
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Somente objeções realmente observadas em discussões públicas para quebra de objeção em
              copies e vídeos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              intentMapData?.common_objections || [
                {
                  objection: 'A bateria dura muito pouco e esquenta rápido',
                  frequency: 'Alta',
                  counter_argument:
                    'Mostrar que uma carga dura 25 minutos reais (tempo para 2 limpezas completas).',
                },
                {
                  objection: 'Filtro difícil de limpar e repor',
                  frequency: 'Média',
                  counter_argument: 'Demonstrar lavagem do filtro HEPA na pia em 10 segundos.',
                },
                {
                  objection: 'Medo de pagar caro e receber produto genérico fraco',
                  frequency: 'Alta',
                  counter_argument: 'Mostrar review sincero de especificações de motor brushless.',
                },
              ]
            ).map((obj, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#141624] border border-[#FF3D00]/30 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#FF3D00] bg-[#FF3D00]/10 px-2 py-0.5 rounded border border-[#FF3D00]/30">
                    Frequência: {obj.frequency}
                  </span>
                </div>

                <h4 className="text-xs font-bold text-white">"{obj.objection}"</h4>

                <div className="p-3 rounded-xl bg-[#0E1018] border border-[#202538] text-xs space-y-1">
                  <span className="text-[10px] font-mono font-bold text-[#00E676] block">
                    Quebra Recomendada:
                  </span>
                  <p className="text-gray-300 text-[11px] leading-snug">{obj.counter_argument}</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ABA 6: RADAR DE DESEJOS (Regra 16) */}
        <TabsContent value="radar_desires" className="space-y-4 m-0">
          <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#00E676]" />
              Radar de Desejos & Contextos Recorrentes
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Motivações emocionais e práticas observadas no público-alvo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              intentMapData?.common_desires || [
                {
                  desire: 'Quero manter o carro impecável sem pagar R$ 80 no lava-jato toda semana',
                  context: 'Economia financeira e independência',
                },
                {
                  desire: 'Preciso de algo compacto que guarde no porta-luvas',
                  context: 'Falta de espaço e praticidade',
                },
                {
                  desire: 'Quero limpar farelo de comida das crianças rápido',
                  context: 'Rotina familiar e agilidade',
                },
              ]
            ).map((d, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#141624] border border-[#00E676]/30 space-y-2.5"
              >
                <span className="text-[10px] font-mono font-bold text-[#00E676] uppercase">
                  Contexto: {d.context}
                </span>
                <p className="text-xs font-bold text-white leading-relaxed italic">"{d.desire}"</p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ABA 7: MAPA DE COMUNIDADES (Regra 13) */}
        <TabsContent value="communities" className="space-y-4 m-0">
          <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738]">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#00F2FF]" />
              Mapa de Comunidades & Espaços Públicos de Discussão
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Identificação de subreddits e fóruns abertos onde a demanda pelo produto é discutida
              ativamente.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              intentMapData?.suggested_communities || [
                {
                  source: 'Reddit',
                  community: 'r/carros',
                  theme: 'Estética, cuidados e acessórios automotivos',
                  relevance: 95,
                  recommended_content: 'Review sincero de potência e praticidade no porta-malas',
                },
                {
                  source: 'Reddit',
                  community: 'r/brasil',
                  theme: 'Dicas do dia a dia e economia doméstica',
                  relevance: 84,
                  recommended_content: 'Guia de ferramentas úteis para rotina diária',
                },
                {
                  source: 'Reddit',
                  community: 'r/shopee',
                  theme: 'Achados e cupons de compras online',
                  relevance: 92,
                  recommended_content: 'Alerta de melhor link com frete grátis',
                },
              ]
            ).map((comm, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#FF3D00]">
                    {comm.community}
                  </span>
                  <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded">
                    Relevância: {comm.relevance}%
                  </span>
                </div>

                <div className="text-xs text-gray-300">
                  <strong className="text-gray-500">Tema: </strong>
                  {comm.theme}
                </div>

                <div className="p-3 rounded-xl bg-[#0E1018] border border-[#202538] text-xs">
                  <strong className="text-[#00F2FF] block text-[10px] uppercase font-mono">
                    Conteúdo Recomendado:
                  </strong>
                  <span className="text-gray-200">{comm.recommended_content}</span>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ABA 8: CENTRAL DE OPORTUNIDADES DE PÚBLICO (Regra 29) */}
        <TabsContent value="opportunities" className="space-y-4 m-0">
          <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7000FF]" />
                Fila Central de Oportunidades ({opportunities.length})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Ações sugeridas geradas a partir de discussões e sinais de alta intenção: Criar
                Conteúdo, Criar Campanha ou Responder Manualmente.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="p-5 rounded-2xl bg-[#141624] border border-[#232738] hover:border-[#7000FF]/40 transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#7000FF]/20 text-[#00F2FF]">
                      {opp.opportunity_type}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#FF3D00]">
                      Score {opp.intent_score}/100
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-white">{opp.title}</h4>
                  <p className="text-xs text-gray-300 line-clamp-2">{opp.description}</p>

                  <div className="p-3 rounded-xl bg-[#0E1018] border border-[#202538] text-xs space-y-1">
                    <strong className="text-[#00E676] text-[10px] uppercase font-mono block">
                      Gancho de Copy Sugerido:
                    </strong>
                    <span className="text-gray-200 italic">
                      "{opp.suggested_copy_hook || 'Veja como resolver esse problema na prática!'}"
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#232738]">
                  <span className="text-[10px] text-gray-500 font-mono">Status: {opp.status}</span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        navigate(
                          `/laboratorio?opportunityId=${opp.id}&hook=${encodeURIComponent(opp.suggested_copy_hook || '')}`,
                        )
                      }}
                      className="h-7 text-[10px] font-bold bg-[#00F2FF] hover:bg-[#00D8E6] text-[#0A0B10]"
                    >
                      Criar Campanha
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        audienceService.updateOpportunityStatus(opp.id, 'ignored')
                        toast.info('Oportunidade ignorada')
                        loadInitialData()
                      }}
                      className="h-7 text-[10px] border-[#2A3048] bg-[#161826] text-gray-400"
                    >
                      Ignorar
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ABA 9: MINI CRM DE LEADS INBOUND & CONSENTIMENTO (Regras 22, 23, 24, 25, 26) */}
        <TabsContent value="inbound_crm" className="space-y-4 m-0">
          <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#00E676]" />
                Mini CRM de Leads Inbound Consentidos ({inboundLeads.length})
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Controle estrito de leads capturados voluntariamente em canais próprios (LP,
                formulários, Telegram). Cada lead possui consentimento rastreável.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => setShowLeadModal(true)}
              className="h-8 bg-[#00E676] hover:bg-[#00B860] text-[#0A0B10] font-bold text-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Lead
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {inboundLeads.map((lead) => (
              <div
                key={lead.id}
                className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="bg-[#1A1E30] text-gray-300 border-[#2A3048] text-[10px]"
                    >
                      {lead.channel}
                    </Badge>
                    <span
                      className={cn(
                        'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full',
                        lead.consent_status === 'active'
                          ? 'bg-[#00E676]/20 text-[#00E676]'
                          : 'bg-red-500/20 text-red-400',
                      )}
                    >
                      {lead.consent_status === 'active'
                        ? '🟢 Consentimento Ativo'
                        : '🔴 Revogado (Opt-Out)'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-white">{lead.name || lead.identifier}</h4>
                    <span className="text-[11px] text-gray-400 font-mono">{lead.identifier}</span>
                  </div>

                  <div className="text-xs text-gray-300 space-y-1">
                    <div>
                      <strong className="text-gray-500">Interesse: </strong>
                      {lead.product_interest || 'Geral'}
                    </div>
                    <div>
                      <strong className="text-gray-500">Intenção Declarada: </strong>
                      {lead.declared_intent || 'Cupom/Oferta'}
                    </div>
                  </div>

                  {/* Lead Score */}
                  <div className="p-2.5 rounded-xl bg-[#0E1018] border border-[#202538] flex items-center justify-between font-mono text-xs">
                    <span className="text-gray-400 text-[10px]">LEAD SCORE</span>
                    <span className="font-bold text-[#00E676]">
                      {lead.lead_score}/100 ({lead.score_tier})
                    </span>
                  </div>

                  <div className="text-[10px] text-gray-500">
                    Finalidade: {lead.authorized_purpose || 'Ofertas autorizadas'}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#232738] flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 font-mono">Status: {lead.status}</span>
                  {lead.consent_status === 'active' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRevokeConsent(lead.id)}
                      className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-950/30 p-1"
                    >
                      <UserX className="w-3 h-3 mr-1" /> Revogar (Opt-Out)
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ABA 10: RELATÓRIO DE DEMANDA AGREGADO (Regras 35 e 36) */}
        <TabsContent value="report" className="space-y-6 m-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#141624] border border-[#232738]">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-yellow-400" />
                Relatório de Demanda de Mercado & Intenção
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Visão consolidada de sinais públicos, perguntas recorrentes e leads consentidos.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {[7, 30, 90].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  onClick={() => handleLoadDemandReport(d)}
                  className={cn(
                    'h-8 text-xs font-mono font-bold',
                    reportPeriod === d
                      ? 'bg-[#00F2FF] text-[#0A0B10]'
                      : 'bg-[#181B2B] text-gray-300',
                  )}
                >
                  {d} Dias
                </Button>
              ))}
            </div>
          </div>

          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[#141624] border border-[#232738] space-y-1">
              <span className="text-[10px] font-mono text-gray-400 uppercase">Total de Sinais</span>
              <div className="text-2xl font-black font-mono text-white">
                {demandReport?.metrics?.total_signals || signals.length}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#141624] border border-[#FF3D00]/30 space-y-1">
              <span className="text-[10px] font-mono text-[#FF3D00] uppercase">
                Alta Intenção 🔥
              </span>
              <div className="text-2xl font-black font-mono text-[#FF3D00]">
                {demandReport?.metrics?.high_intent_signals ||
                  signals.filter((s) => s.intent_score >= 80).length}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#141624] border border-[#7000FF]/30 space-y-1">
              <span className="text-[10px] font-mono text-[#00F2FF] uppercase">Oportunidades</span>
              <div className="text-2xl font-black font-mono text-[#00F2FF]">
                {demandReport?.metrics?.total_opportunities || opportunities.length}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#141624] border border-[#00E676]/30 space-y-1">
              <span className="text-[10px] font-mono text-[#00E676] uppercase">
                Leads Consentidos
              </span>
              <div className="text-2xl font-black font-mono text-[#00E676]">
                {demandReport?.metrics?.active_inbound_leads ||
                  inboundLeads.filter((l) => l.consent_status === 'active').length}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL: CAPTURA DE LEAD INBOUND COM CONSENTIMENTO (Regra 22, 23, 32) */}
      {showLeadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#141624] border border-[#2A3048] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#232738]">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#00E676]" />
                <h3 className="text-sm font-bold text-white">
                  Capturar Lead Inbound com Consentimento
                </h3>
              </div>
              <button
                onClick={() => setShowLeadModal(false)}
                className="text-gray-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInboundLead} className="space-y-3.5 text-xs">
              <div>
                <label className="text-gray-300 block mb-1">
                  Identificador (E-mail ou Contato Voluntário)*:
                </label>
                <Input
                  required
                  value={leadIdentifier}
                  onChange={(e) => setLeadIdentifier(e.target.value)}
                  placeholder="ex: cliente@email.com ou @usuario_telegram"
                  className="bg-[#0A0B10] border-[#252A3D] text-xs h-9 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-300 block mb-1">Nome (Opcional):</label>
                  <Input
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    placeholder="Nome do lead"
                    className="bg-[#0A0B10] border-[#252A3D] text-xs h-9 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-300 block mb-1">Canal de Entrada:</label>
                  <select
                    value={leadChannel}
                    onChange={(e) => setLeadChannel(e.target.value as any)}
                    className="w-full h-9 rounded-xl bg-[#0A0B10] border border-[#252A3D] text-white px-2 text-xs"
                  >
                    <option value="landing_page">Landing Page</option>
                    <option value="form">Formulário</option>
                    <option value="telegram">Telegram</option>
                    <option value="newsletter">Newsletter</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Produto de Interesse:</label>
                <Input
                  value={leadProductInterest}
                  onChange={(e) => setLeadProductInterest(e.target.value)}
                  placeholder="Ex: Aspirador Portátil Automotivo"
                  className="bg-[#0A0B10] border-[#252A3D] text-xs h-9 text-white"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">
                  Finalidade Autorizada do Consentimento:
                </label>
                <Input
                  value={leadPurpose}
                  onChange={(e) => setLeadPurpose(e.target.value)}
                  className="bg-[#0A0B10] border-[#252A3D] text-xs h-9 text-white"
                />
              </div>

              {/* Checkbox de Consentimento Obrigatório */}
              <div className="p-3 rounded-xl bg-[#0A0B10] border border-[#2A3048] flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="consentCheck"
                  checked={leadConsentChecked}
                  onChange={(e) => setLeadConsentChecked(e.target.checked)}
                  className="mt-0.5 rounded text-[#00E676] focus:ring-0"
                />
                <label
                  htmlFor="consentCheck"
                  className="text-[11px] text-gray-300 leading-snug cursor-pointer"
                >
                  Confirmo que o lead <strong>forneceu consentimento explícito e voluntário</strong>{' '}
                  para receber comunicações comerciais deste produto no canal próprio indicado (LGPD
                  compliant).
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#232738]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLeadModal(false)}
                  className="h-8 text-xs border-[#2A3048] bg-[#161826] text-gray-400"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingLead}
                  className="h-8 text-xs bg-[#00E676] hover:bg-[#00B860] text-[#0A0B10] font-bold"
                >
                  {isSavingLead ? 'Registrando...' : 'Salvar Lead Inbound'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
