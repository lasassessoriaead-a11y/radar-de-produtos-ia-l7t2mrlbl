import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  UserCheck,
  UserPlus,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Filter,
  Search,
  Plus,
  Layers,
  List,
  Kanban,
  FileText,
  Sliders,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Zap,
  Info,
  Calendar,
  Send,
  Eye,
  Check,
  X,
  MessageSquare,
  HelpCircle,
  Database,
  Lock,
  Tag,
  AlertTriangle,
  History,
  CornerDownRight,
  Sparkle,
  Lightbulb,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { crmService } from '@/services/crm'
import type {
  CRMContactRecord,
  CRMContactStatus,
  CRMChannel,
  CRMRecommendationRecord,
  CRMConsentLogRecord,
  CRMCadenceSettingRecord,
  CRMDashboardResponse,
  CRMDynamicSegment,
  PurchasedProductItem,
} from '@/types/crm'

// Helper de badge de status do contato
const STATUS_CONFIG: Record<
  CRMContactStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  novo: {
    label: 'Novo',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
  },
  interessado: {
    label: 'Interessado',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
  },
  engajado: {
    label: 'Engajado',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
  },
  qualificado: {
    label: 'Qualificado',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
  },
  em_decisao: {
    label: 'Em Decisão',
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  cliente: {
    label: 'Cliente',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
  },
  cliente_recorrente: {
    label: 'Cliente Recorrente',
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-300 font-bold',
    border: 'border-emerald-400/50',
  },
  sem_interesse: {
    label: 'Sem Interesse',
    bg: 'bg-slate-700/30',
    text: 'text-slate-400',
    border: 'border-slate-700',
  },
  opt_out: {
    label: 'Opt-Out (Revogado)',
    bg: 'bg-red-500/10',
    text: 'text-red-400 font-bold',
    border: 'border-red-500/30',
  },
  inativo: {
    label: 'Inativo',
    bg: 'bg-gray-800/40',
    text: 'text-gray-400',
    border: 'border-gray-700',
  },
}

export default function CRMPage() {
  const { toast } = useToast()

  // Estados principais
  const [activeTab, setActiveTab] = useState<
    'kanban' | 'contacts' | 'recommendations' | 'consents' | 'segments' | 'cohorts' | 'report'
  >('kanban')
  const [contacts, setContacts] = useState<CRMContactRecord[]>([])
  const [recommendations, setRecommendations] = useState<CRMRecommendationRecord[]>([])
  const [consents, setConsents] = useState<CRMConsentLogRecord[]>([])
  const [cadenceSettings, setCadenceSettings] = useState<CRMCadenceSettingRecord[]>([])
  const [analytics, setAnalytics] = useState<CRMDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSegment, setSelectedSegment] = useState<CRMDynamicSegment>('todos')
  const [channelFilter, setChannelFilter] = useState<string>('all')
  const [showOnlyTestData, setShowOnlyTestData] = useState(false)

  // Modais e Seleções
  const [selectedContact, setSelectedContact] = useState<CRMContactRecord | null>(null)
  const [isNewContactModalOpen, setIsNewContactModalOpen] = useState(false)
  const [isAttributeConversionModalOpen, setIsAttributeConversionModalOpen] = useState(false)
  const [isConsentModalOpen, setIsConsentModalOpen] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [isGenerateRecModalOpen, setIsGenerateRecModalOpen] = useState(false)

  // Form states
  const [newContactForm, setNewContactForm] = useState({
    identifier: '',
    name: '',
    channel: 'landing_page' as CRMChannel,
    origin_source: 'Canal Próprio / Landing Page',
    first_product_interest: '',
    categories_of_interest: 'Eletrônicos & Áudio',
    authorized_purpose: 'Receber ofertas legítimas e novidades de produtos',
    consent_text_version: 'v1.0-termos-lgpd',
    internal_notes: '',
    is_test_data: false,
  })

  const [conversionForm, setConversionForm] = useState({
    product_title: 'Mini Projetor Portátil Smart LED Wi-Fi',
    product_category: 'Eletrônicos & Áudio',
    sale_amount: 279.9,
    commission_amount: 40.58,
    channel: 'Telegram',
    order_id: 'PEDIDO-' + Math.floor(Math.random() * 90000 + 10000),
  })

  const [feedbackForm, setFeedbackForm] = useState({
    rating: 'Gostou' as const,
    comment: '',
    wants_recommendations: true,
  })

  // Carregar dados
  const loadData = async () => {
    setLoading(true)
    try {
      const [analyticsRes, contactsRes, recsRes, consentsRes, cadenceRes] = await Promise.all([
        crmService.getDashboardAnalytics(),
        crmService.getContacts('', '-relationship_score', 1, 100),
        crmService.getRecommendations(),
        crmService.getConsentLogs('', 50),
        crmService.getCadenceSettings(),
      ])

      setAnalytics(analyticsRes)
      setContacts(contactsRes.items)
      setRecommendations(recsRes)
      setConsents(consentsRes)
      setCadenceSettings(cadenceRes)
    } catch (err: any) {
      console.error('Erro ao carregar CRM:', err)
      toast({
        title: 'Erro de Carregamento',
        description: 'Não foi possível carregar os dados do CRM.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filtragem dinâmica de contatos
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      // Busca texto
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesName = c.name?.toLowerCase().includes(query)
        const matchesId = c.identifier.toLowerCase().includes(query)
        const matchesInterest = c.first_product_interest?.toLowerCase().includes(query)
        if (!matchesName && !matchesId && !matchesInterest) return false
      }

      // Canal
      if (channelFilter !== 'all' && c.channel !== channelFilter) {
        return false
      }

      // Dados de teste
      if (showOnlyTestData && !c.is_test_data) {
        return false
      }

      // Segmentos dinâmicos
      if (selectedSegment === 'leads_quentes') {
        return !c.is_customer && (c.lead_score || 0) >= 80 && c.status !== 'opt_out'
      }
      if (selectedSegment === 'clientes_recentes') {
        return c.is_customer && !c.is_recurring_customer && c.status !== 'opt_out'
      }
      if (selectedSegment === 'clientes_recorrentes') {
        return c.is_recurring_customer && c.status !== 'opt_out'
      }
      if (selectedSegment === 'interessados_em_eletronicos') {
        return (
          c.categories_of_interest?.includes('Eletrônicos & Áudio') ||
          c.first_product_interest?.toLowerCase().includes('projetor') ||
          c.first_product_interest?.toLowerCase().includes('fone')
        )
      }
      if (selectedSegment === 'interessados_em_beleza') {
        return (
          c.categories_of_interest?.includes('Beleza & Cuidados') ||
          c.first_product_interest?.toLowerCase().includes('escova')
        )
      }
      if (selectedSegment === 'interessados_em_automotivo') {
        return (
          c.categories_of_interest?.includes('Automotivo & Celular') ||
          c.first_product_interest?.toLowerCase().includes('suporte') ||
          c.first_product_interest?.toLowerCase().includes('aspirador')
        )
      }
      if (selectedSegment === 'sem_interacao_30_dias') {
        if (!c.last_interaction_date) return false
        const diff =
          (Date.now() - new Date(c.last_interaction_date).getTime()) / (1000 * 60 * 60 * 24)
        return diff >= 30 && c.status !== 'opt_out'
      }
      if (selectedSegment === 'alto_interesse_sem_compra') {
        return (
          !c.is_customer &&
          (c.relationship_score >= 60 || (c.lead_score || 0) >= 75) &&
          c.status !== 'opt_out'
        )
      }
      if (selectedSegment === 'opt_out') {
        return c.status === 'opt_out'
      }

      return true
    })
  }, [contacts, searchQuery, channelFilter, showOnlyTestData, selectedSegment])

  // Handlers de criação e ações
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const cats = newContactForm.categories_of_interest
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      await crmService.saveContact({
        identifier: newContactForm.identifier,
        name: newContactForm.name,
        channel: newContactForm.channel,
        origin_source: newContactForm.origin_source,
        first_product_interest: newContactForm.first_product_interest,
        categories_of_interest: cats,
        authorized_purpose: newContactForm.authorized_purpose,
        consent_text_version: newContactForm.consent_text_version,
        internal_notes: newContactForm.internal_notes,
        is_test_data: newContactForm.is_test_data,
        status: 'novo',
      })

      toast({
        title: 'Contato Registrado',
        description: 'Contato legítimo salvo com consentimento e Relationship Score calculado.',
      })
      setIsNewContactModalOpen(false)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar Contato',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleAttributeConversion = async () => {
    if (!selectedContact) return
    try {
      await crmService.attributeConversion({
        contact_id: selectedContact.id,
        contact_identifier: selectedContact.identifier,
        product_title: conversionForm.product_title,
        product_category: conversionForm.product_category,
        sale_amount: Number(conversionForm.sale_amount),
        commission_amount: Number(conversionForm.commission_amount),
        channel: conversionForm.channel,
        order_id: conversionForm.order_id,
      })

      toast({
        title: 'Conversão Atribuída com Sucesso',
        description: `Contato atualizado para ${selectedContact.purchases_count > 0 ? 'CLIENTE RECORRENTE' : 'CLIENTE'}.`,
      })
      setIsAttributeConversionModalOpen(false)
      const updated = await crmService.getContactById(selectedContact.id)
      setSelectedContact(updated)
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro na Atribuição',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleGenerateRecommendations = async (contactId: string) => {
    try {
      const res = await crmService.generateRecommendations(contactId)
      if (res.blocked_by_consent) {
        toast({
          title: 'Bloqueado por Consentimento',
          description: res.message,
          variant: 'destructive',
        })
        return
      }
      toast({
        title: 'Recomendações Geradas',
        description: `${res.total_recommendations} oportunidades identificadas pelo motor de afinidade.`,
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro no Motor',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleConsentAction = async (action: 'revoke' | 'grant_new' | 'anonymize' | 'export') => {
    if (!selectedContact) return
    try {
      const res = await crmService.executeConsentAction({
        action,
        contact_id: selectedContact.id,
        identifier: selectedContact.identifier,
        channel: selectedContact.channel,
      })

      if (action === 'export') {
        const dataStr =
          'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2))
        const dlAnchor = document.createElement('a')
        dlAnchor.setAttribute('href', dataStr)
        dlAnchor.setAttribute('download', `lgpd_export_${selectedContact.identifier}.json`)
        dlAnchor.click()
        toast({
          title: 'Dados Exportados (LGPD)',
          description: 'Arquivo JSON gerado com todo o histórico do titular.',
        })
      } else {
        toast({
          title: 'Centro de Consentimentos',
          description: res.message,
        })
        const updated = await crmService.getContactById(selectedContact.id)
        setSelectedContact(updated)
        loadData()
      }
    } catch (err: any) {
      toast({
        title: 'Erro na Ação de Consentimento',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleSaveFeedback = async () => {
    if (!selectedContact) return
    try {
      const updated = await crmService.addFeedback(selectedContact.id, feedbackForm)
      setSelectedContact(updated)
      setIsFeedbackModalOpen(false)
      toast({
        title: 'Feedback Registrado',
        description: 'Feedback legítimo adicionado ao histórico do contato.',
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar Feedback',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#121622] via-[#161B2E] to-[#121622] border border-[#232B42] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00F2FF]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge className="bg-[#00F2FF]/15 text-[#00F2FF] border-[#00F2FF]/30 font-mono text-[10px] tracking-wider uppercase">
              Fase 8 — Relacionamento & Recompra
            </Badge>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Conformidade LGPD & Consentimento Rastreável
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-[#00F2FF]" />
            CRM & Motor de Recompra IA
          </h1>
          <p className="text-sm text-gray-300 max-w-2xl">
            Cultive relacionamentos legítimos com leads consentidos e clientes confirmados.
            Recomendações com base em afinidade real e valor comercial sem invenção de dados.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Button
            onClick={() => setIsNewContactModalOpen(true)}
            className="bg-gradient-to-r from-[#00F2FF] to-[#7000FF] hover:opacity-90 text-[#0A0B10] font-bold text-xs h-10 px-4 rounded-xl shadow-lg gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Novo Contato Consentido
          </Button>

          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            className="border-[#262E45] bg-[#141826] hover:bg-[#1C2236] text-white text-xs h-10 px-3 rounded-xl gap-1.5"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#00F2FF]' : ''}`} />
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {/* Total Contatos */}
        <div className="p-4 rounded-xl bg-[#111420] border border-[#20273D] space-y-1">
          <div className="text-[11px] font-mono text-gray-400 uppercase flex items-center justify-between">
            <span>Contatos Legítimos</span>
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {analytics?.metrics.total_contacts || contacts.length}
          </div>
          <div className="text-[10px] text-emerald-400 flex items-center gap-1">
            <Check className="w-3 h-3" />
            {analytics?.metrics.active_consents || 0} com consentimento ativo
          </div>
        </div>

        {/* Clientes */}
        <div className="p-4 rounded-xl bg-[#111420] border border-[#20273D] space-y-1">
          <div className="text-[11px] font-mono text-gray-400 uppercase flex items-center justify-between">
            <span>Clientes</span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {analytics?.metrics.total_customers || 0}
          </div>
          <div className="text-[10px] text-gray-400">
            Conv. Lead → Cliente:{' '}
            <span className="text-emerald-400 font-bold font-mono">
              {analytics?.metrics.lead_to_customer_rate?.toFixed(1) || '0.0'}%
            </span>
          </div>
        </div>

        {/* Clientes Recorrentes */}
        <div className="p-4 rounded-xl bg-[#111420] border border-emerald-500/30 bg-emerald-950/10 space-y-1">
          <div className="text-[11px] font-mono text-emerald-400 uppercase flex items-center justify-between font-bold">
            <span>Clientes Recorrentes</span>
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-300">
            {analytics?.metrics.recurring_customers || 0}
          </div>
          <div className="text-[10px] text-emerald-400 font-medium">
            Taxa de Recompra:{' '}
            <span className="font-bold font-mono">
              {analytics?.metrics.repurchase_rate?.toFixed(1) || '0.0'}%
            </span>
          </div>
        </div>

        {/* Comissão Total LTV Real */}
        <div className="p-4 rounded-xl bg-[#111420] border border-[#20273D] space-y-1">
          <div className="text-[11px] font-mono text-gray-400 uppercase flex items-center justify-between">
            <span>Comissão CRM</span>
            <DollarSign className="w-3.5 h-3.5 text-[#00E676]" />
          </div>
          <div className="text-2xl font-black text-[#00E676] font-mono">
            R$ {(analytics?.metrics.total_commission_earned || 0).toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-400">
            Média: R$ {(analytics?.metrics.average_commission_per_customer || 0).toFixed(2)} /
            cliente
          </div>
        </div>

        {/* LTV Status */}
        <div className="p-4 rounded-xl bg-[#111420] border border-[#20273D] space-y-1">
          <div className="text-[11px] font-mono text-gray-400 uppercase flex items-center justify-between">
            <span>LTV de Comissão</span>
            <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-sm font-bold text-white mt-1">
            {analytics?.metrics.ltv_status === 'calculado' ? (
              <span className="text-cyan-300 font-mono text-lg">
                R$ {(analytics?.metrics.average_commission_per_customer || 0).toFixed(2)}
              </span>
            ) : (
              <span className="text-xs text-amber-400 flex items-center gap-1 font-normal">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                Dados Insuficientes
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500">Baseado apenas em compras reais</div>
        </div>

        {/* Opt-Outs */}
        <div className="p-4 rounded-xl bg-[#111420] border border-[#20273D] space-y-1">
          <div className="text-[11px] font-mono text-gray-400 uppercase flex items-center justify-between">
            <span>Opt-Outs / Revogações</span>
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          </div>
          <div className="text-2xl font-black text-red-400">
            {analytics?.metrics.total_opt_outs || 0}
          </div>
          <div className="text-[10px] text-gray-400">Bloqueio estrito ativo</div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2336] pb-2">
          <TabsList className="bg-[#121522] border border-[#21273C] p-1 rounded-xl">
            <TabsTrigger
              value="kanban"
              className="text-xs gap-1.5 data-[state=active]:bg-[#00F2FF]/15 data-[state=active]:text-[#00F2FF]"
            >
              <Kanban className="w-3.5 h-3.5" />
              Kanban
            </TabsTrigger>
            <TabsTrigger
              value="contacts"
              className="text-xs gap-1.5 data-[state=active]:bg-[#00F2FF]/15 data-[state=active]:text-[#00F2FF]"
            >
              <List className="w-3.5 h-3.5" />
              Lista de Contatos ({filteredContacts.length})
            </TabsTrigger>
            <TabsTrigger
              value="recommendations"
              className="text-xs gap-1.5 data-[state=active]:bg-[#00F2FF]/15 data-[state=active]:text-[#00F2FF]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#00F2FF]" />
              Motor de Recompra ({recommendations.length})
            </TabsTrigger>
            <TabsTrigger
              value="consents"
              className="text-xs gap-1.5 data-[state=active]:bg-[#00F2FF]/15 data-[state=active]:text-[#00F2FF]"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Centro de Consentimentos
            </TabsTrigger>
            <TabsTrigger
              value="segments"
              className="text-xs gap-1.5 data-[state=active]:bg-[#00F2FF]/15 data-[state=active]:text-[#00F2FF]"
            >
              <Layers className="w-3.5 h-3.5" />
              Segmentos & Cadência
            </TabsTrigger>
            <TabsTrigger
              value="cohorts"
              className="text-xs gap-1.5 data-[state=active]:bg-[#00F2FF]/15 data-[state=active]:text-[#00F2FF]"
            >
              <Calendar className="w-3.5 h-3.5" />
              Coortes & Funil
            </TabsTrigger>
            <TabsTrigger
              value="report"
              className="text-xs gap-1.5 data-[state=active]:bg-[#00F2FF]/15 data-[state=active]:text-[#00F2FF]"
            >
              <FileText className="w-3.5 h-3.5" />
              Relatório de Relacionamento
            </TabsTrigger>
          </TabsList>

          {/* Search and Quick Filters */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                className="h-8 pl-8 pr-3 w-48 sm:w-60 bg-[#121522] border-[#20273D] text-xs rounded-lg placeholder-gray-500"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-[#20273D] bg-[#121522] text-gray-300 gap-1.5"
                >
                  <Filter className="w-3.5 h-3.5 text-[#00F2FF]" />
                  <span>Segmento: {selectedSegment.replace(/_/g, ' ')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-[#141826] border-[#242C44] text-xs text-white">
                <DropdownMenuLabel>Filtrar por Segmento</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#242C44]" />
                <DropdownMenuItem onClick={() => setSelectedSegment('todos')}>
                  Todos os Contatos
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedSegment('leads_quentes')}>
                  🔥 Leads Quentes (Score 80+)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedSegment('clientes_recentes')}>
                  🟢 Clientes Recentes (1 compra)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedSegment('clientes_recorrentes')}>
                  ⭐ Clientes Recorrentes (2+ compras)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedSegment('interessados_em_eletronicos')}>
                  Eletrônicos & Áudio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedSegment('interessados_em_beleza')}>
                  Beleza & Cuidados
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedSegment('interessados_em_automotivo')}>
                  Automotivo & Celular
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedSegment('sem_interacao_30_dias')}>
                  ⚠️ Sem Interação há 30 dias
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedSegment('alto_interesse_sem_compra')}>
                  🎯 Alto Interesse sem Compra
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSelectedSegment('opt_out')}>
                  🛑 Opt-Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={showOnlyTestData ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowOnlyTestData(!showOnlyTestData)}
              className={`h-8 text-xs rounded-lg ${showOnlyTestData ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'border-[#20273D] text-gray-400 bg-[#121522]'}`}
            >
              {showOnlyTestData ? 'DADOS DE TESTE' : 'Todos'}
            </Button>
          </div>
        </div>

        {/* TAB 1: KANBAN CRM VIEW */}
        <TabsContent value="kanban" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 overflow-x-auto pb-4">
            {[
              { status: 'novo', title: '1. Novos Leads', color: 'border-blue-500/30' },
              { status: 'interessado', title: '2. Interessados', color: 'border-cyan-500/30' },
              { status: 'qualificado', title: '3. Qualificados', color: 'border-amber-500/30' },
              { status: 'cliente', title: '4. Clientes', color: 'border-emerald-500/30' },
              {
                status: 'cliente_recorrente',
                title: '5. Recorrentes',
                color: 'border-purple-500/40',
              },
            ].map((col) => {
              const colContacts = filteredContacts.filter((c) => c.status === col.status)
              return (
                <div
                  key={col.status}
                  className={`p-3 rounded-xl bg-[#0F121C] border ${col.color} flex flex-col min-h-[500px]`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#1E2438] mb-3">
                    <span className="text-xs font-bold text-white tracking-tight">{col.title}</span>
                    <Badge className="bg-[#181D2C] text-gray-300 border-[#2A334E] text-[10px] font-mono">
                      {colContacts.length}
                    </Badge>
                  </div>

                  <div className="space-y-2.5 flex-1 overflow-y-auto">
                    {colContacts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-xs">
                        Nenhum contato nesta etapa
                      </div>
                    ) : (
                      colContacts.map((contact) => (
                        <div
                          key={contact.id}
                          onClick={() => setSelectedContact(contact)}
                          className="p-3 rounded-lg bg-[#141826] hover:bg-[#1A2033] border border-[#222A42] hover:border-[#00F2FF]/40 cursor-pointer transition-all space-y-2 relative group"
                        >
                          {contact.is_test_data && (
                            <div className="absolute top-2 right-2">
                              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[8px] font-mono">
                                DADO DE TESTE
                              </Badge>
                            </div>
                          )}

                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-bold text-white group-hover:text-[#00F2FF] transition-colors truncate max-w-[150px]">
                                {contact.name || contact.identifier}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate max-w-[150px]">
                                {contact.identifier}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-gray-400">
                            <span className="capitalize">{contact.channel.replace(/_/g, ' ')}</span>
                            <span className="font-mono text-cyan-400 font-bold">
                              Score {contact.relationship_score}
                            </span>
                          </div>

                          {contact.first_product_interest && (
                            <div className="text-[10px] text-gray-300 bg-[#0E111A] p-1.5 rounded border border-[#1C2234] truncate">
                              🎯 {contact.first_product_interest}
                            </div>
                          )}

                          {contact.next_best_action && (
                            <div className="text-[9px] text-[#00E676] bg-[#00E676]/5 px-2 py-1 rounded border border-[#00E676]/20 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 flex-shrink-0" />
                              <span className="truncate">{contact.next_best_action}</span>
                            </div>
                          )}

                          {contact.purchases_count > 0 && (
                            <div className="flex items-center justify-between text-[10px] text-emerald-400 font-mono font-bold pt-1 border-t border-[#1C2234]">
                              <span>{contact.purchases_count}x compra(s)</span>
                              <span>+R$ {contact.total_commission_earned?.toFixed(2)}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* TAB 2: LIST VIEW */}
        <TabsContent value="contacts" className="space-y-4">
          <div className="rounded-xl border border-[#1F253B] bg-[#0E111B] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#121624] text-[10px] font-mono uppercase text-gray-400 border-b border-[#1F253B]">
                  <tr>
                    <th className="p-3.5">Contato / Identificador</th>
                    <th className="p-3.5">Canal & Origem</th>
                    <th className="p-3.5">Interesse Principal</th>
                    <th className="p-3.5 text-center">Rel. Score</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Next Best Action</th>
                    <th className="p-3.5 text-right">Comissão Real (LTV)</th>
                    <th className="p-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#181D2E]">
                  {filteredContacts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        Nenhum contato encontrado com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredContacts.map((contact) => {
                      const cfg = STATUS_CONFIG[contact.status] || STATUS_CONFIG.novo
                      return (
                        <tr
                          key={contact.id}
                          className="hover:bg-[#141826] transition-colors cursor-pointer"
                          onClick={() => setSelectedContact(contact)}
                        >
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#7000FF] to-[#00F2FF] flex items-center justify-center font-bold text-[10px] text-[#0A0B10]">
                                {contact.name ? contact.name.slice(0, 2).toUpperCase() : 'CO'}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  <span>{contact.name || contact.identifier}</span>
                                  {contact.is_test_data && (
                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[8px] font-mono py-0">
                                      TESTE
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[10px] text-gray-400 font-mono">
                                  {contact.identifier}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div className="capitalize text-gray-200">
                              {contact.channel.replace(/_/g, ' ')}
                            </div>
                            <div
                              className="text-[10px] text-gray-500 truncate max-w-[140px]"
                              title={contact.origin_source}
                            >
                              {contact.origin_source || 'Direto'}
                            </div>
                          </td>

                          <td className="p-3.5">
                            <div
                              className="truncate max-w-[160px] text-gray-200"
                              title={contact.first_product_interest}
                            >
                              {contact.first_product_interest || 'Geral'}
                            </div>
                            {contact.categories_of_interest &&
                              contact.categories_of_interest.length > 0 && (
                                <div className="text-[10px] text-cyan-400 font-mono">
                                  {contact.categories_of_interest[0]}
                                </div>
                              )}
                          </td>

                          <td className="p-3.5 text-center">
                            <span className="font-mono font-bold text-xs text-[#00F2FF] bg-[#00F2FF]/10 px-2 py-0.5 rounded border border-[#00F2FF]/20">
                              {contact.relationship_score} pts
                            </span>
                          </td>

                          <td className="p-3.5">
                            <Badge className={`${cfg.bg} ${cfg.text} ${cfg.border} text-[10px]`}>
                              {cfg.label}
                            </Badge>
                          </td>

                          <td className="p-3.5">
                            <div className="text-[11px] text-[#00E676] font-medium flex items-center gap-1">
                              <Sparkles className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate max-w-[140px]">
                                {contact.next_best_action || 'Aguardar'}
                              </span>
                            </div>
                          </td>

                          <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                            {contact.total_commission_earned > 0 ? (
                              `R$ ${contact.total_commission_earned.toFixed(2)}`
                            ) : (
                              <span className="text-gray-600 font-normal">R$ 0,00</span>
                            )}
                            {contact.purchases_count > 0 && (
                              <div className="text-[9px] text-gray-400 font-normal">
                                {contact.purchases_count} compra(s)
                              </div>
                            )}
                          </td>

                          <td className="p-3.5 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-gray-400 hover:text-white hover:bg-[#1E253A]"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedContact(contact)
                              }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Detalhes
                            </Button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 3: RECOMMENDATION ENGINE */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="p-4 rounded-xl bg-gradient-to-r from-[#121624] via-[#161C2E] to-[#121624] border border-[#21283F] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00F2FF]" />
                Motor de Recomendação e Recompra Inteligente
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Identifica oportunidades de reposição, cross-sell e produtos complementares a partir
                do comportamento e histórico legítimo.
              </p>
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Regras de cadência ativas</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-gray-500 bg-[#0E111B] rounded-xl border border-[#1E2438]">
                Nenhuma recomendação registrada ainda. Abra um contato e clique em "Gerar
                Recomendações".
              </div>
            ) : (
              recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl bg-[#0F121C] border border-[#20273D] space-y-3 relative group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Badge className="bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/30 text-[9px] uppercase font-mono">
                      {rec.recommendation_type.replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Score {rec.recommendation_score} pts
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <img
                      src={
                        rec.product_image_url || 'https://img.usecurling.com/p/100/100?q=product'
                      }
                      alt={rec.product_title}
                      className="w-12 h-12 rounded-lg object-cover border border-[#242C44]"
                    />
                    <div className="min-w-0">
                      <div
                        className="text-xs font-bold text-white truncate"
                        title={rec.product_title}
                      >
                        {rec.product_title}
                      </div>
                      <div className="text-[10px] text-gray-400 flex items-center gap-2 mt-0.5">
                        <span>{rec.product_category}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-mono">
                          +R$ {rec.product_commission?.toFixed(2)} comissão
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-300 bg-[#131724] p-2.5 rounded-lg border border-[#1E2438] space-y-1">
                    <div className="font-semibold text-gray-200 text-[10px] uppercase font-mono text-[#00F2FF]">
                      Motivo da Recomendação:
                    </div>
                    <p className="text-gray-400 leading-relaxed text-[10px]">{rec.reason}</p>
                  </div>

                  {rec.suggested_message && (
                    <div className="text-[10px] text-gray-300 bg-[#0B0D15] p-2 rounded border border-[#1A1F30] italic">
                      "{rec.suggested_message}"
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-[#1C2234] text-[10px]">
                    <span className="text-gray-400">
                      Contato: <strong className="text-white">{rec.contact_identifier}</strong>
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[9px] border-gray-700 text-gray-400 uppercase"
                    >
                      {rec.status}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* TAB 4: CONSENT CENTER & PRIVACY (LGPD) */}
        <TabsContent value="consents" className="space-y-4">
          <div className="p-4 rounded-xl bg-[#111422] border border-[#20273D] space-y-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Centro de Consentimentos & Conformidade LGPD
            </h3>
            <p className="text-xs text-gray-300 max-w-3xl">
              Armazenamento estrito de bases legais, finalidades autorizadas e versões de termos.
              Revogações (Opt-Out) são prioridade imediata e bloqueiam qualquer disparo futuro.
            </p>
          </div>

          <div className="rounded-xl border border-[#1F253B] bg-[#0E111B] overflow-hidden">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#121624] text-[10px] font-mono uppercase text-gray-400 border-b border-[#1F253B]">
                <tr>
                  <th className="p-3.5">Identificador do Titular</th>
                  <th className="p-3.5">Canal</th>
                  <th className="p-3.5">Finalidade Autorizada</th>
                  <th className="p-3.5">Versão do Termo</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Data de Registro</th>
                  <th className="p-3.5">Origem / IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#181D2E]">
                {consents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500">
                      Nenhum registro de consentimento encontrado.
                    </td>
                  </tr>
                ) : (
                  consents.map((c) => (
                    <tr key={c.id} className="hover:bg-[#141826]">
                      <td className="p-3.5 font-bold text-white font-mono">{c.identifier}</td>
                      <td className="p-3.5 capitalize">{c.channel}</td>
                      <td className="p-3.5 text-gray-300 max-w-xs">{c.authorized_purpose}</td>
                      <td className="p-3.5 font-mono text-[10px] text-cyan-400">
                        {c.consent_text_version || 'v1.0-termos-lgpd'}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          className={
                            c.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/10 text-red-400 border-red-500/30 font-bold'
                          }
                        >
                          {c.status === 'active' ? 'ATIVO' : 'REVOGADO (OPT-OUT)'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-gray-400 text-[10px]">
                        {new Date(c.granted_at || c.created).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-3.5 text-gray-500 text-[10px] font-mono">
                        {c.origin_source || 'Direto'} ({c.ip_masked || '177.*.*.*'})
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* TAB 5: SEGMENTOS & CADÊNCIA */}
        <TabsContent value="segments" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Segmentos Dinâmicos */}
            <div className="p-5 rounded-xl bg-[#0E111B] border border-[#1E2438] space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#00F2FF]" />
                Segmentos Dinâmicos Baseados em Comportamento
              </h3>
              <p className="text-xs text-gray-400">
                Segmentação automática sem atributos sensíveis, utilizando apenas interações
                legítimas e histórico comercial.
              </p>

              <div className="space-y-2.5">
                {[
                  {
                    name: '🔥 Leads Quentes',
                    desc: 'Score >= 80, alto interesse e sem compras confirmadas',
                    count: contacts.filter(
                      (c) => !c.is_customer && (c.lead_score || 0) >= 80 && c.status !== 'opt_out',
                    ).length,
                    action: () => setSelectedSegment('leads_quentes'),
                  },
                  {
                    name: '🟢 Clientes Recentes',
                    desc: '1 compra realizada, em período de onboarding útil e guia de uso',
                    count: contacts.filter(
                      (c) => c.is_customer && !c.is_recurring_customer && c.status !== 'opt_out',
                    ).length,
                    action: () => setSelectedSegment('clientes_recentes'),
                  },
                  {
                    name: '⭐ Clientes Recorrentes',
                    desc: '2 ou mais compras confirmadas, candidatos a produtos complementares',
                    count: contacts.filter((c) => c.is_recurring_customer && c.status !== 'opt_out')
                      .length,
                    action: () => setSelectedSegment('clientes_recorrentes'),
                  },
                  {
                    name: '⚠️ Sem Interação há 30+ dias',
                    desc: 'Candidatos à régua de reativação de relacionamento',
                    count: contacts.filter((c) => {
                      if (!c.last_interaction_date) return false
                      const diff =
                        (Date.now() - new Date(c.last_interaction_date).getTime()) /
                        (1000 * 60 * 60 * 24)
                      return diff >= 30 && c.status !== 'opt_out'
                    }).length,
                    action: () => setSelectedSegment('sem_interacao_30_dias'),
                  },
                ].map((seg, idx) => (
                  <div
                    key={idx}
                    onClick={seg.action}
                    className="p-3 rounded-lg bg-[#131724] hover:bg-[#181D2E] border border-[#1F263C] cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{seg.name}</div>
                      <div className="text-[10px] text-gray-400">{seg.desc}</div>
                    </div>
                    <Badge className="bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/30 font-mono">
                      {seg.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Regras de Cadência e Saturação */}
            <div className="p-5 rounded-xl bg-[#0E111B] border border-[#1E2438] space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                Regras de Cadência & Prevenção de Saturação
              </h3>
              <p className="text-xs text-gray-400">
                Limites automáticos de frequência por canal para respeitar o tempo do contato e
                evitar spam.
              </p>

              <div className="space-y-3">
                {cadenceSettings.map((cad) => (
                  <div
                    key={cad.id}
                    className="p-3 rounded-lg bg-[#131724] border border-[#1F263C] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white capitalize">{cad.channel}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        Intervalo Mínimo: {cad.min_days_between_messages} dias
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-400">
                      <div>
                        Máx. por semana:{' '}
                        <strong className="text-white">{cad.max_messages_per_week} msg</strong>
                      </div>
                      <div>
                        Horário de silêncio:{' '}
                        <strong className="text-white">
                          {cad.quiet_hours_start || '21:00'} às {cad.quiet_hours_end || '09:00'}
                        </strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 6: COORTES & FUNIL */}
        <TabsContent value="cohorts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Funil Visual do CRM */}
            <div className="p-5 rounded-xl bg-[#0E111B] border border-[#1E2438] space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Funil de Progressão do Relacionamento
              </h3>
              <div className="space-y-3">
                {analytics?.funnel.map((stage, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-gray-300">{stage.stage}</span>
                      <span className="font-mono text-gray-400">
                        {stage.count} contatos ({stage.pct}%)
                      </span>
                    </div>
                    <div className="h-3 w-full bg-[#151927] rounded-full overflow-hidden border border-[#20273D]">
                      <div
                        className="h-full bg-gradient-to-r from-[#00F2FF] to-[#00E676] rounded-full transition-all duration-500"
                        style={{ width: `${stage.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Análise de Coortes */}
            <div className="p-5 rounded-xl bg-[#0E111B] border border-[#1E2438] space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                Análise de Coortes por Mês de Aquisição
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#131724] text-[10px] font-mono uppercase text-gray-400 border-b border-[#1E2438]">
                    <tr>
                      <th className="p-2.5">Coorte</th>
                      <th className="p-2.5">Captados</th>
                      <th className="p-2.5">Clientes</th>
                      <th className="p-2.5">Recorrentes</th>
                      <th className="p-2.5 text-right">Comissão Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181D2E]">
                    {analytics?.cohorts.map((coh, i) => (
                      <tr key={i} className="hover:bg-[#141826]">
                        <td className="p-2.5 font-mono font-bold text-white">{coh.cohort}</td>
                        <td className="p-2.5">{coh.acquired}</td>
                        <td className="p-2.5 text-emerald-400 font-bold">
                          {coh.customers} ({coh.conversion_rate}%)
                        </td>
                        <td className="p-2.5 text-purple-400 font-bold">
                          {coh.recurring} ({coh.repurchase_rate}%)
                        </td>
                        <td className="p-2.5 text-right font-mono text-[#00E676]">
                          R$ {coh.total_commission}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* TAB 7: RELATÓRIO DE RELACIONAMENTO & AUDITORIA */}
        <TabsContent value="report" className="space-y-4">
          <div className="p-6 rounded-xl bg-[#0E111B] border border-[#1E2438] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1E2438] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#00F2FF]" />
                  Relatório Executivo de Relacionamento & Recompra
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Resumo consolidado de retenção, valor comercial do relacionamento e integração com
                  a Inteligência de Vendas (Fase 6).
                </p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs py-1 px-3">
                Período: Últimos 90 dias
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#131724] border border-[#20273D] space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#00F2FF]" />
                  Categorias com Maior Recompra
                </div>
                <div className="space-y-1.5 text-xs">
                  {analytics?.category_repurchase.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-gray-300">
                      <span>{cat.category}</span>
                      <span className="font-mono text-emerald-400 font-bold">
                        {cat.repurchase_rate}% recompra
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#131724] border border-[#20273D] space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#00E676]" />
                  Valor Comercial do Relacionamento
                </div>
                <div className="text-2xl font-black text-[#00E676] font-mono">
                  R$ {(analytics?.metrics.average_commission_per_customer || 0).toFixed(2)}
                </div>
                <p className="text-[10px] text-gray-400">
                  Comissão média líquida apurada por cliente ativo no sistema.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#131724] border border-[#20273D] space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-purple-400" />
                  Oportunidades de Reativação
                </div>
                <div className="text-2xl font-black text-purple-300">
                  {analytics?.reactivation_opportunities.length || 0}
                </div>
                <p className="text-[10px] text-gray-400">
                  Contatos com consentimento ativo aptos para mensagem útil de reengajamento.
                </p>
              </div>
            </div>

            {/* Oportunidades de Reativação na Fila */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-300 uppercase font-mono tracking-wider">
                Fila de Oportunidades de Reativação (Apenas com Consentimento Válido)
              </h4>
              <div className="space-y-2">
                {analytics?.reactivation_opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-3 rounded-lg bg-[#121624] border border-[#1F263C] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">
                        {opp.name} ({opp.identifier})
                      </div>
                      <div className="text-[11px] text-gray-400">{opp.reason}</div>
                    </div>
                    <Badge className="bg-purple-500/10 text-purple-300 border-purple-500/30 text-[10px]">
                      {opp.days_inactive} dias sem interação
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: DETALHE DO CONTATO & TIMELINE UNIFICADA */}
      {selectedContact && (
        <Dialog open={!!selectedContact} onOpenChange={(open) => !open && setSelectedContact(null)}>
          <DialogContent className="max-w-3xl bg-[#0E111C] border-[#222A42] text-white p-6 max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-[#1E2438] pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <DialogTitle className="text-xl font-black text-white flex items-center gap-2">
                    {selectedContact.name || selectedContact.identifier}
                    {selectedContact.is_test_data && (
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] font-mono">
                        DADO DE TESTE
                      </Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-gray-400 font-mono mt-0.5">
                    ID: {selectedContact.identifier} • Canal: {selectedContact.channel} • Criado em:{' '}
                    {new Date(selectedContact.created).toLocaleDateString('pt-BR')}
                  </DialogDescription>
                </div>

                <Badge
                  className={`${STATUS_CONFIG[selectedContact.status]?.bg} ${STATUS_CONFIG[selectedContact.status]?.text} ${STATUS_CONFIG[selectedContact.status]?.border} text-xs`}
                >
                  {STATUS_CONFIG[selectedContact.status]?.label}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-5 py-3">
              {/* Relationship Score Bar */}
              <div className="p-4 rounded-xl bg-[#131726] border border-[#21283F] flex items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono text-gray-400 uppercase">
                    Relationship Score (Prioridade Operacional)
                  </div>
                  <div className="text-2xl font-black text-[#00F2FF] font-mono">
                    {selectedContact.relationship_score} / 100
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] font-mono text-gray-400 uppercase">
                    Comissão Efetiva Gerada
                  </div>
                  <div className="text-2xl font-black text-[#00E676] font-mono">
                    +R$ {selectedContact.total_commission_earned?.toFixed(2) || '0.00'}
                  </div>
                </div>
              </div>

              {/* Next Best Action Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#00F2FF]/10 to-[#7000FF]/10 border border-[#00F2FF]/30 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-[#00F2FF] uppercase font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#00F2FF]" />
                    Próxima Melhor Ação Sugerida
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-emerald-400 border-emerald-500/30"
                  >
                    Consentimento Válido
                  </Badge>
                </div>
                <div className="text-sm font-bold text-white">
                  {selectedContact.next_best_action || 'Nenhuma ação no momento'}
                </div>
                <p className="text-xs text-gray-300">{selectedContact.next_best_action_reason}</p>
              </div>

              {/* Produtos Comprados */}
              {selectedContact.purchased_products &&
                selectedContact.purchased_products.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                      Compras Confirmadas Atribuídas ({selectedContact.purchased_products.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedContact.purchased_products.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg bg-[#131724] border border-[#1E2438] flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-white">{p.title}</div>
                            <div className="text-[10px] text-gray-400">
                              {p.category} • Pedido: {p.order_id || 'N/A'} •{' '}
                              {new Date(p.purchase_date).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <div className="text-right font-mono">
                            <div className="text-gray-300">R$ {p.sale_amount?.toFixed(2)}</div>
                            <div className="text-emerald-400 font-bold">
                              +R$ {p.commission_amount?.toFixed(2)} comissão
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Timeline Unificada de Eventos */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-[#00F2FF]" />
                  Timeline Unificada de Eventos com Timestamp
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedContact.timeline && selectedContact.timeline.length > 0 ? (
                    selectedContact.timeline.map((ev, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-[#111422] border border-[#1C2234] text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span className="font-mono text-cyan-400 uppercase font-bold">
                            {ev.event_type.replace(/_/g, ' ')}
                          </span>
                          <span>{new Date(ev.date).toLocaleString('pt-BR')}</span>
                        </div>
                        <p className="text-gray-300">{ev.details}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-500 italic">
                      Nenhum evento registrado ainda.
                    </div>
                  )}
                </div>
              </div>

              {/* Ações do Contato */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#1E2438]">
                <Button
                  size="sm"
                  onClick={() => setIsAttributeConversionModalOpen(true)}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  Atribuir Compra
                </Button>

                <Button
                  size="sm"
                  onClick={() => handleGenerateRecommendations(selectedContact.id)}
                  className="h-8 text-xs bg-[#00F2FF] hover:bg-[#00D4E0] text-[#0A0B10] font-bold gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Gerar Recomendações
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFeedbackModalOpen(true)}
                  className="h-8 text-xs border-[#222A42] bg-[#141826] text-gray-300 gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Registrar Feedback
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-red-500/30 text-red-400 bg-red-950/20 hover:bg-red-950/40 gap-1.5"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Privacidade / LGPD
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#141826] border-[#242C44] text-xs text-white">
                    <DropdownMenuItem
                      onClick={() => handleConsentAction('revoke')}
                      className="text-red-400 font-bold"
                    >
                      🛑 Revogar Consentimento (Opt-Out)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleConsentAction('grant_new')}>
                      ✅ Registrar Novo Consentimento
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleConsentAction('export')}>
                      📥 Exportar Dados do Titular (JSON)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleConsentAction('anonymize')}
                      className="text-amber-400"
                    >
                      🔒 Anonimizar Dados
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL 2: NOVO CONTATO CONSENTIDO */}
      <Dialog open={isNewContactModalOpen} onOpenChange={setIsNewContactModalOpen}>
        <DialogContent className="max-w-lg bg-[#0E111C] border-[#222A42] text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#00F2FF]" />
              Novo Contato Consentido
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Registrar lead voluntário em conformidade com as regras de consentimento da LGPD.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateContact} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Identificador Único * (E-mail ou Telegram)
              </label>
              <Input
                required
                value={newContactForm.identifier}
                onChange={(e) =>
                  setNewContactForm({ ...newContactForm, identifier: e.target.value })
                }
                placeholder="ex: cliente@dominio.com ou @usuario_telegram"
                className="bg-[#121522] border-[#20273D] text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Nome (opcional)</label>
                <Input
                  value={newContactForm.name}
                  onChange={(e) => setNewContactForm({ ...newContactForm, name: e.target.value })}
                  placeholder="Nome do contato"
                  className="bg-[#121522] border-[#20273D] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">Canal de Origem</label>
                <select
                  value={newContactForm.channel}
                  onChange={(e) =>
                    setNewContactForm({ ...newContactForm, channel: e.target.value as CRMChannel })
                  }
                  className="w-full h-9 rounded-md bg-[#121522] border border-[#20273D] text-xs px-2.5 text-white"
                >
                  <option value="landing_page">Landing Page</option>
                  <option value="form">Formulário / Quiz</option>
                  <option value="telegram">Canal Telegram</option>
                  <option value="newsletter">Newsletter</option>
                  <option value="whatsapp">WhatsApp Consentido</option>
                  <option value="own_channel">Canal Próprio</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Primeiro Produto de Interesse
              </label>
              <Input
                value={newContactForm.first_product_interest}
                onChange={(e) =>
                  setNewContactForm({ ...newContactForm, first_product_interest: e.target.value })
                }
                placeholder="ex: Mini Projetor Portátil Smart LED"
                className="bg-[#121522] border-[#20273D] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-300">
                Categorias de Interesse (separadas por vírgula)
              </label>
              <Input
                value={newContactForm.categories_of_interest}
                onChange={(e) =>
                  setNewContactForm({ ...newContactForm, categories_of_interest: e.target.value })
                }
                placeholder="ex: Eletrônicos & Áudio, Home Office"
                className="bg-[#121522] border-[#20273D] text-xs"
              />
            </div>

            <div className="p-3 rounded-lg bg-[#121624] border border-[#20273D] space-y-2">
              <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Termo de Consentimento & Finalidade
              </div>
              <Input
                value={newContactForm.authorized_purpose}
                onChange={(e) =>
                  setNewContactForm({ ...newContactForm, authorized_purpose: e.target.value })
                }
                className="bg-[#0B0D15] border-[#1C2234] text-[11px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_test"
                checked={newContactForm.is_test_data}
                onChange={(e) =>
                  setNewContactForm({ ...newContactForm, is_test_data: e.target.checked })
                }
                className="rounded border-[#20273D]"
              />
              <label htmlFor="is_test" className="text-xs text-amber-400">
                Marcar como Dado de Teste (identificado com badge na UI)
              </label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsNewContactModalOpen(false)}
                className="text-xs border-[#20273D]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#00F2FF] hover:bg-[#00D4E0] text-[#0A0B10] font-bold text-xs"
              >
                Salvar Contato
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: ATRIBUIR COMPRA AO CONTATO */}
      <Dialog
        open={isAttributeConversionModalOpen}
        onOpenChange={setIsAttributeConversionModalOpen}
      >
        <DialogContent className="max-w-md bg-[#0E111C] border-[#222A42] text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              Atribuir Conversão Confirmada ao Contato
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Registra uma venda real atribuída para atualizar o status para Cliente ou Cliente
              Recorrente e calcular o LTV de comissão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Produto Comprado</label>
              <Input
                value={conversionForm.product_title}
                onChange={(e) =>
                  setConversionForm({ ...conversionForm, product_title: e.target.value })
                }
                className="bg-[#121522] border-[#20273D] text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Valor da Venda (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={conversionForm.sale_amount}
                  onChange={(e) =>
                    setConversionForm({
                      ...conversionForm,
                      sale_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="bg-[#121522] border-[#20273D] text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">Comissão (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={conversionForm.commission_amount}
                  onChange={(e) =>
                    setConversionForm({
                      ...conversionForm,
                      commission_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="bg-[#121522] border-[#20273D] text-xs font-mono text-emerald-400"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">ID do Pedido</label>
              <Input
                value={conversionForm.order_id}
                onChange={(e) => setConversionForm({ ...conversionForm, order_id: e.target.value })}
                className="bg-[#121522] border-[#20273D] text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAttributeConversionModalOpen(false)}
              className="text-xs border-[#20273D]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAttributeConversion}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Confirmar Atribuição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: REGISTRAR FEEDBACK */}
      <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
        <DialogContent className="max-w-md bg-[#0E111C] border-[#222A42] text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[#00F2FF]" />
              Registrar Feedback Legítimo
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Registrar a opinião espontânea informada pelo contato.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Avaliação do Contato</label>
              <select
                value={feedbackForm.rating}
                onChange={(e) =>
                  setFeedbackForm({ ...feedbackForm, rating: e.target.value as any })
                }
                className="w-full h-9 rounded-md bg-[#121522] border border-[#20273D] text-xs px-2.5 text-white"
              >
                <option value="Gostou">🟢 Gostou do produto/atendimento</option>
                <option value="Quer recomendações relacionadas">
                  ⭐ Quer novas recomendações relacionadas
                </option>
                <option value="Não gostou">🔴 Não gostou</option>
                <option value="Teve problema">⚠️ Teve problema com entrega/uso</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Comentário / Detalhes</label>
              <textarea
                value={feedbackForm.comment}
                onChange={(e) => setFeedbackForm({ ...feedbackForm, comment: e.target.value })}
                placeholder="ex: Gostou muito do aspirador, achou a sucção ótima para areia."
                rows={3}
                className="w-full rounded-md bg-[#121522] border border-[#20273D] text-xs p-2 text-white placeholder-gray-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsFeedbackModalOpen(false)}
              className="text-xs border-[#20273D]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveFeedback}
              className="bg-[#00F2FF] hover:bg-[#00D4E0] text-[#0A0B10] font-bold text-xs"
            >
              Salvar Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
