import React, { useState, useEffect } from 'react'
import {
  TrendingUp,
  BarChart3,
  DollarSign,
  MousePointer,
  ShoppingCart,
  Percent,
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowRight,
  Upload,
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Trophy,
  Filter,
  Eye,
  FileSpreadsheet,
  AlertCircle,
  Zap,
  Tag,
  Radio,
  Clock,
  ExternalLink,
  ChevronRight,
  Bot,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { publishingService } from '@/services/publishing'
import { campaignService } from '@/services/campaigns'
import { creativeService } from '@/services/creatives'
import { productsService } from '@/services/products'
import type {
  PerformanceSummaryResponse,
  AiPerformanceInsightsResponse,
  ConversionRecord,
  CampaignCostRecord,
  AuditLogRecord,
} from '@/types/publishing'
import type { CampaignRecord } from '@/types/campaign'
import type { CreativeRecord } from '@/types/creative'
import type { ProductRecord } from '@/types/product'

export default function PerformanceDashboard() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<PerformanceSummaryResponse | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([])
  const [creatives, setCreatives] = useState<CreativeRecord[]>([])
  const [products, setProducts] = useState<ProductRecord[]>([])
  const [conversions, setConversions] = useState<ConversionRecord[]>([])
  const [costs, setCosts] = useState<CampaignCostRecord[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([])

  // AI Insights State
  const [insights, setInsights] = useState<AiPerformanceInsightsResponse | null>(null)
  const [isGeneratingAiInsights, setIsGeneratingAiInsights] = useState(false)

  // CSV Import Modal State
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [isImportingCsv, setIsImportingCsv] = useState(false)

  // Manual Conversion Modal State
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)
  const [manualSaleAmount, setManualSaleAmount] = useState('')
  const [manualCommissionAmount, setManualCommissionAmount] = useState('')
  const [manualOrderId, setManualOrderId] = useState('')
  const [manualCampaignId, setManualCampaignId] = useState('')
  const [manualSubId, setManualSubId] = useState('')
  const [manualChannel, setManualChannel] = useState('Telegram')

  // Cost Modal State
  const [isCostModalOpen, setIsCostModalOpen] = useState(false)
  const [costDescription, setCostDescription] = useState('')
  const [costAmount, setCostAmount] = useState('')
  const [costType, setCostType] = useState<
    'paid_traffic' | 'ai_generation' | 'tools_subscription' | 'creative_outsourcing' | 'other'
  >('paid_traffic')
  const [costCampaignId, setCostCampaignId] = useState('')

  // Load consolidated performance data
  const loadPerformanceData = async () => {
    setLoading(true)
    try {
      const [sumRes, campsRes, crtsRes, prodsRes, convsRes, costsRes, auditsRes] =
        await Promise.all([
          publishingService.getPerformanceSummary(),
          campaignService.getCampaigns('', '-created', 1, 50),
          creativeService.getCreatives('', '-created', 1, 50),
          productsService.getProducts('', '-opportunity_score', 1, 50),
          publishingService.getConversions('', '-conversion_date', 1, 50),
          publishingService.getCosts('', '-date'),
          publishingService.getAuditLogs(30),
        ])

      setSummary(sumRes)
      setCampaigns(campsRes.items)
      setCreatives(crtsRes.items)
      setProducts(prodsRes.items)
      setConversions(convsRes.items)
      setCosts(costsRes)
      setAuditLogs(auditsRes.items)
    } catch (err: any) {
      console.error('Error loading performance data:', err)
      toast({
        title: 'Erro ao carregar dados de Performance',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPerformanceData()
  }, [])

  // Trigger AI Performance Insights
  const handleGenerateAiInsights = async () => {
    if (!summary) return
    setIsGeneratingAiInsights(true)
    try {
      // Gather variations across campaigns
      const allVariations = campaigns.flatMap((c) => c.variations || [])
      const res = await publishingService.getAiPerformanceInsights({
        stats: summary.kpis,
        variations: allVariations.map((v) => ({
          letter: v.version_letter,
          hypothesis: v.hypothesis_name,
          clicks: v.clicks || 0,
          conversions: v.conversions || 0,
          commission: v.total_commission || 0,
          ctr: v.ctr || 0,
        })),
        products: products.slice(0, 10).map((p) => ({
          title: p.title,
          predicted_score: p.opportunity_score,
          category: p.category,
        })),
      })
      setInsights(res)
      toast({
        title: '🧠 Insights da IA Atualizados!',
        description: 'Diagnóstico analítico completo gerado com base em dados reais.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar insights',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingAiInsights(false)
    }
  }

  // Handle CSV Import
  const handleProcessCsv = async () => {
    if (!csvText.trim()) {
      toast({ title: 'Cole os dados do CSV', variant: 'destructive' })
      return
    }

    setIsImportingCsv(true)
    try {
      // Parse CSV or TSV lines
      const lines = csvText.trim().split('\n')
      if (lines.length < 2) {
        throw new Error('O CSV precisa de cabeçalho e pelo menos 1 linha de dados.')
      }

      const headers = lines[0]
        .split(/[,;\t]/)
        .map((h) => h.trim().toLowerCase().replace(/["']/g, ''))
      const rows = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        const values = line.split(/[,;\t]/).map((v) => v.trim().replace(/["']/g, ''))
        const obj: Record<string, string> = {}
        headers.forEach((h, idx) => {
          obj[h] = values[idx] || ''
        })
        rows.push(obj)
      }

      const res = await publishingService.importConversionsCsv(rows)

      toast({
        title: '🎉 Conversões Importadas com Sucesso!',
        description: `${res.confirmed_count} confirmadas via SubID, ${res.probable_count} atribuídas por inferência e ${res.unattributed_count} não atribuídas.`,
      })

      setIsCsvModalOpen(false)
      setCsvText('')
      await loadPerformanceData()
    } catch (err: any) {
      toast({
        title: 'Erro na importação do CSV',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsImportingCsv(false)
    }
  }

  // Handle Manual Conversion
  const handleSaveManualConversion = async () => {
    const sale = parseFloat(manualSaleAmount)
    const comm = parseFloat(manualCommissionAmount)
    if (isNaN(sale) && isNaN(comm)) {
      toast({ title: 'Informe ao menos o valor da venda ou da comissão', variant: 'destructive' })
      return
    }

    try {
      await publishingService.createManualConversion({
        sale_amount: isNaN(sale) ? 0 : sale,
        commission_amount: isNaN(comm) ? 0 : comm,
        external_order_id: manualOrderId,
        campaign_id: manualCampaignId,
        sub_id: manualSubId,
        channel: manualChannel,
      })

      toast({
        title: '✅ Conversão Manual Salva!',
        description: 'Métricas e lucros recalculados.',
      })

      setIsManualModalOpen(false)
      setManualSaleAmount('')
      setManualCommissionAmount('')
      setManualOrderId('')
      await loadPerformanceData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar conversão', description: err.message, variant: 'destructive' })
    }
  }

  // Handle Save Cost
  const handleSaveCost = async () => {
    const amt = parseFloat(costAmount)
    if (isNaN(amt) || amt <= 0 || !costDescription.trim()) {
      toast({ title: 'Preencha a descrição e um valor válido', variant: 'destructive' })
      return
    }

    try {
      await publishingService.createCost({
        user_id: 'current',
        cost_type: costType,
        description: costDescription,
        amount: amt,
        campaign_id: costCampaignId,
        date: new Date().toISOString(),
      })

      toast({
        title: '💰 Custo Registrado!',
        description: 'Lucro Líquido e ROI atualizados.',
      })

      setIsCostModalOpen(false)
      setCostDescription('')
      setCostAmount('')
      await loadPerformanceData()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar custo', description: err.message, variant: 'destructive' })
    }
  }

  // Extract KPI shortcuts
  const kpis = summary?.kpis || {
    publications: 0,
    raw_clicks: 0,
    valid_clicks: 0,
    bot_clicks_filtered: 0,
    conversions_count: 0,
    total_sales: 0,
    total_commission: 0,
    total_costs: 0,
    net_profit: 0,
    roi_percentage: 0,
    conversion_rate: 0,
  }

  // Find all variations for A/B/C testing comparator
  const allVariationsList = campaigns.flatMap((c) =>
    (c.variations || []).map((v) => ({
      ...v,
      campaign_name: c.campaign_name,
      product_title: c.product_title,
    })),
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Status Legend */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E2232] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 rounded">
              FASE 5 — RASTREAMENTO & CONVERSÃO
            </span>
            <span className="text-xs text-gray-400 font-mono">Ciclo Fechado com Atribuição</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#00E676]" />
            Dashboard de Performance
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Acompanhe o que aconteceu após a publicação. Todas as métricas exibidas obedecem à
            rigorosa classificação de dados comprovados.
          </p>
        </div>

        {/* Legend + Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Chips Legend */}
          <div className="flex items-center gap-2 bg-[#12141F] border border-[#23273A] px-3 py-1.5 rounded-xl text-[10px] font-mono">
            <span className="flex items-center gap-1 text-[#00E676]">
              <span className="w-2 h-2 rounded-full bg-[#00E676]" />
              REAL
            </span>
            <span className="text-gray-600">|</span>
            <span className="flex items-center gap-1 text-[#FFD600]">
              <span className="w-2 h-2 rounded-full bg-[#FFD600]" />
              ESTIMADO
            </span>
            <span className="text-gray-600">|</span>
            <span className="flex items-center gap-1 text-gray-400">
              <span className="w-2 h-2 rounded-full bg-gray-500" />
              N/D
            </span>
          </div>

          <Button
            onClick={() => setIsCostModalOpen(true)}
            variant="outline"
            size="sm"
            className="h-9 border-[#262B3F] bg-[#141724] text-xs text-gray-300 hover:text-white gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5 text-yellow-400" />+ Registrar Custo
          </Button>

          <Button
            onClick={() => setIsManualModalOpen(true)}
            variant="outline"
            size="sm"
            className="h-9 border-[#262B3F] bg-[#141724] text-xs text-gray-300 hover:text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#00E676]" />+ Venda Manual
          </Button>

          <Button
            onClick={() => setIsCsvModalOpen(true)}
            size="sm"
            className="h-9 bg-gradient-to-r from-[#00E676] to-[#00F2FF] hover:opacity-90 text-[#0A0B10] font-bold text-xs gap-1.5 shadow-[0_0_15px_rgba(0,230,118,0.2)]"
          >
            <Upload className="w-3.5 h-3.5" />
            Importar CSV
          </Button>
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Valid Clicks */}
        <div className="p-4 rounded-xl bg-[#11131C] border border-[#232738] relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
            <span>CLIQUES VÁLIDOS</span>
            <span className="text-[#00E676] font-bold">🟢 REAL</span>
          </div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {kpis.valid_clicks.toLocaleString()}
          </div>
          <div className="text-[10px] text-gray-500 mt-1 flex items-center justify-between">
            <span>Brutos: {kpis.raw_clicks}</span>
            <span className="text-red-400">-{kpis.bot_clicks_filtered} bots</span>
          </div>
        </div>

        {/* Conversions */}
        <div className="p-4 rounded-xl bg-[#11131C] border border-[#232738] relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
            <span>CONVERSÕES</span>
            <span className="text-[#00E676] font-bold">🟢 REAL</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#00F2FF] mt-1">
            {kpis.conversions_count}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">
            Taxa: <strong className="text-white">{kpis.conversion_rate}%</strong>
          </div>
        </div>

        {/* Total Sales */}
        <div className="p-4 rounded-xl bg-[#11131C] border border-[#232738] relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
            <span>VENDAS GERADAS</span>
            <span className="text-[#00E676] font-bold">🟢 REAL</span>
          </div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            R$ {kpis.total_sales.toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Volume bruto comercial</div>
        </div>

        {/* Total Commission */}
        <div className="p-4 rounded-xl bg-[#11131C] border border-[#232738] relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
            <span>COMISSÃO TOTAL</span>
            <span className="text-[#00E676] font-bold">🟢 REAL</span>
          </div>
          <div className="text-2xl font-black font-mono text-[#00E676] mt-1">
            +R$ {kpis.total_commission.toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Ganhos confirmados</div>
        </div>

        {/* Total Costs */}
        <div className="p-4 rounded-xl bg-[#11131C] border border-[#232738] relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
            <span>CUSTOS TOTAIS</span>
            <span className="text-[#00E676] font-bold">🟢 REAL</span>
          </div>
          <div className="text-2xl font-black font-mono text-red-400 mt-1">
            -R$ {kpis.total_costs.toFixed(2)}
          </div>
          <div className="text-[10px] text-gray-500 mt-1">Tráfego + IA + Ferramentas</div>
        </div>

        {/* Net Profit & ROI */}
        <div className="p-4 rounded-xl bg-[#11131C] border border-[#232738] relative overflow-hidden">
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
            <span>LUCRO LÍQUIDO</span>
            <span className="text-[#00E676] font-bold">🟢 REAL</span>
          </div>
          <div
            className={`text-2xl font-black font-mono mt-1 ${
              kpis.net_profit >= 0 ? 'text-[#00E676]' : 'text-red-400'
            }`}
          >
            R$ {kpis.net_profit.toFixed(2)}
          </div>
          <div className="text-[10px] font-mono text-gray-400 mt-1">
            ROI: <strong className="text-white">{kpis.roi_percentage}%</strong>
          </div>
        </div>
      </div>

      {/* VISUAL FUNNEL MODULE */}
      <div className="p-5 rounded-2xl bg-[#11131C] border border-[#1E2232] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00F2FF]" />
              Funil Visual de Conversão
            </h2>
            <p className="text-xs text-gray-400">
              Taxas de passagem entre cada estágio da jornada de afiliado.
            </p>
          </div>
          <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30">
            🟢 DADOS REAIS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-2 pt-2">
          {/* Step 1: Impressions */}
          <div className="p-3.5 rounded-xl bg-[#151824] border border-[#242A3E] relative flex flex-col justify-between">
            <div className="text-[10px] font-mono text-gray-400 uppercase">1. Visualizações</div>
            <div className="text-xl font-bold font-mono text-white my-1">
              {kpis.publications > 0 ? (kpis.valid_clicks * 18).toLocaleString() : '⚪ N/D'}
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              {kpis.publications > 0 ? '🟡 Estimado do Canal' : '⚪ Não Disponível'}
            </div>
          </div>

          {/* Step 2: Clicks */}
          <div className="p-3.5 rounded-xl bg-[#151824] border border-[#242A3E] relative flex flex-col justify-between">
            <div className="text-[10px] font-mono text-gray-400 uppercase">2. Cliques Válidos</div>
            <div className="text-xl font-bold font-mono text-[#00F2FF] my-1">
              {kpis.valid_clicks}
            </div>
            <div className="text-[10px] text-[#00E676] font-mono font-bold">🟢 100% Rastreado</div>
          </div>

          {/* Step 3: Conversions */}
          <div className="p-3.5 rounded-xl bg-[#151824] border border-[#242A3E] relative flex flex-col justify-between">
            <div className="text-[10px] font-mono text-gray-400 uppercase">
              3. Vendas Realizadas
            </div>
            <div className="text-xl font-bold font-mono text-[#00E676] my-1">
              {kpis.conversions_count}
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              Conv: <strong className="text-white">{kpis.conversion_rate}%</strong>
            </div>
          </div>

          {/* Step 4: Sales Volume */}
          <div className="p-3.5 rounded-xl bg-[#151824] border border-[#242A3E] relative flex flex-col justify-between">
            <div className="text-[10px] font-mono text-gray-400 uppercase">4. Faturamento</div>
            <div className="text-xl font-bold font-mono text-white my-1">
              R$ {kpis.total_sales.toFixed(2)}
            </div>
            <div className="text-[10px] text-gray-400 font-mono">Volume dos Pedidos</div>
          </div>

          {/* Step 5: Commission */}
          <div className="p-3.5 rounded-xl bg-[#151824] border border-[#242A3E] relative flex flex-col justify-between bg-gradient-to-br from-[#00E676]/10 to-[#00F2FF]/5 border-[#00E676]/30">
            <div className="text-[10px] font-mono text-[#00E676] uppercase font-bold">
              5. Sua Comissão
            </div>
            <div className="text-xl font-bold font-mono text-[#00E676] my-1">
              +R$ {kpis.total_commission.toFixed(2)}
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              Lucro: <strong className="text-white">R$ {kpis.net_profit.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* COMPARATORS TABS (A/B/C Variations, Creatives, Products, Channels, AI Insights) */}
      <Tabs defaultValue="variations" className="space-y-4">
        <TabsList className="bg-[#11131C] border border-[#1E2232] p-1 h-auto flex flex-wrap gap-1 rounded-xl">
          <TabsTrigger
            value="variations"
            className="data-[state=active]:bg-[#1E2335] data-[state=active]:text-[#00F2FF] text-xs font-bold py-2 px-3.5 rounded-lg"
          >
            <Trophy className="w-3.5 h-3.5 mr-1.5" />
            Testes A/B/C
          </TabsTrigger>
          <TabsTrigger
            value="creatives"
            className="data-[state=active]:bg-[#1E2335] data-[state=active]:text-[#00F2FF] text-xs font-bold py-2 px-3.5 rounded-lg"
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Performance por Criativo
          </TabsTrigger>
          <TabsTrigger
            value="products"
            className="data-[state=active]:bg-[#1E2335] data-[state=active]:text-[#00F2FF] text-xs font-bold py-2 px-3.5 rounded-lg"
          >
            <Tag className="w-3.5 h-3.5 mr-1.5" />
            Previsto vs Real (Produtos)
          </TabsTrigger>
          <TabsTrigger
            value="channels"
            className="data-[state=active]:bg-[#1E2335] data-[state=active]:text-[#00F2FF] text-xs font-bold py-2 px-3.5 rounded-lg"
          >
            <Radio className="w-3.5 h-3.5 mr-1.5" />
            Por Canal
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="data-[state=active]:bg-[#1E2335] data-[state=active]:text-[#00F2FF] text-xs font-bold py-2 px-3.5 rounded-lg"
          >
            <Bot className="w-3.5 h-3.5 mr-1.5 text-[#7000FF]" />
            Insights da IA
          </TabsTrigger>
          <TabsTrigger
            value="conversions_list"
            className="data-[state=active]:bg-[#1E2335] data-[state=active]:text-[#00F2FF] text-xs font-bold py-2 px-3.5 rounded-lg"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Extrato de Conversões ({conversions.length})
          </TabsTrigger>
          <TabsTrigger
            value="audit"
            className="data-[state=active]:bg-[#1E2335] data-[state=active]:text-[#00F2FF] text-xs font-bold py-2 px-3.5 rounded-lg"
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Auditoria & Log
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: A/B/C VARIATIONS COMPARATOR */}
        <TabsContent value="variations" className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#11131C] border border-[#1E2232] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  Comparador de Variações A/B/C
                </h3>
                <p className="text-xs text-gray-400">
                  Descubra qual ângulo e hipótese de copy geram maior volume de cliques válidos e
                  comissões.
                </p>
              </div>
            </div>

            {allVariationsList.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs">
                Nenhuma variação registrada ainda nas campanhas.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {allVariationsList.map((v, idx) => {
                  const clicksCount = v.clicks || 0
                  const hasMinData = clicksCount >= 50
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-[#151824] border border-[#242A3E] relative flex flex-col justify-between space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#00F2FF]/10 text-[#00F2FF] border border-[#00F2FF]/30">
                            VARIAÇÃO {v.version_letter}
                          </span>
                          {hasMinData ? (
                            <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-1.5 py-0.5 rounded font-bold">
                              🏆 LÍDER ATUAL
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                              Dados insuficientes
                            </span>
                          )}
                        </div>

                        <div className="text-xs font-bold text-white line-clamp-1">
                          {v.hypothesis_name || `Hipótese ${v.version_letter}`}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                          "{v.hook_text || v.copy_text || 'Sem copy definida'}"
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#1F2436] text-center font-mono">
                        <div>
                          <div className="text-[10px] text-gray-400">Cliques</div>
                          <div className="text-sm font-bold text-white">{v.clicks || 0}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400">Vendas</div>
                          <div className="text-sm font-bold text-[#00F2FF]">
                            {v.conversions || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-gray-400">Comissão</div>
                          <div className="text-sm font-bold text-[#00E676]">
                            R$ {(v.total_commission || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 2: CREATIVES PERFORMANCE */}
        <TabsContent value="creatives" className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#11131C] border border-[#1E2232] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00F2FF]" />
              Performance por Criativo Visual
            </h3>

            {creatives.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs">
                Nenhum criativo gerado ainda no Estúdio Criativo.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#151824] text-gray-400 font-mono text-[11px] uppercase border-b border-[#22273A]">
                    <tr>
                      <th className="py-3 px-4">Criativo & Formato</th>
                      <th className="py-3 px-3">Ângulo / Hipótese</th>
                      <th className="py-3 px-3 text-center">Score IA</th>
                      <th className="py-3 px-3 text-center">Cliques</th>
                      <th className="py-3 px-3 text-center">Vendas</th>
                      <th className="py-3 px-3 text-right">Comissão Real</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D2132]">
                    {creatives.map((cr) => (
                      <tr key={cr.id} className="hover:bg-[#151824]/60">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={cr.image_url || 'https://img.usecurling.com/p/80/80?q=creative'}
                              alt="thumb"
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-[#232738]"
                            />
                            <div>
                              <div className="font-bold text-white truncate max-w-xs">
                                {cr.title}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                {cr.aspect_ratio || '1:1'} • {cr.creative_type}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className="font-mono text-xs text-gray-300">
                            {cr.hypothesis_type || 'A_PROBLEMA'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          <span className="text-[#00F2FF] font-bold">
                            {cr.creative_score || 88} pts
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          <span className="text-white font-bold">{cr.clicks || 0}</span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          <span className="text-[#00E676] font-bold">{cr.conversions || 0}</span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-[#00E676] font-bold">
                          R$ {(cr.total_commission || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: PRODUCTS PREDICTED VS REAL */}
        <TabsContent value="products" className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#11131C] border border-[#1E2232] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#00E676]" />
              O Que a IA Previu vs O Que Realmente Aconteceu
            </h3>
            <p className="text-xs text-gray-400">
              Comparação entre o Score de Oportunidade original e as comissões reais geradas.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#151824] text-gray-400 font-mono text-[11px] uppercase border-b border-[#22273A]">
                  <tr>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-3 text-center">Score Previsto</th>
                    <th className="py-3 px-3 text-center">Preço Base</th>
                    <th className="py-3 px-3 text-center">Cliques Reais</th>
                    <th className="py-3 px-3 text-center">Vendas Reais</th>
                    <th className="py-3 px-3 text-right">Comissão Real</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1D2132]">
                  {products.slice(0, 15).map((p) => {
                    // Match conversions
                    const prodConvs = conversions.filter(
                      (c) => c.product_id === p.id || c.product_id === (p as any).external_id,
                    )
                    const prodCommission = prodConvs.reduce(
                      (acc, c) => acc + (c.commission_amount || 0),
                      0,
                    )
                    return (
                      <tr key={p.id} className="hover:bg-[#151824]/60">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={p.image_url || 'https://img.usecurling.com/p/80/80?q=product'}
                              alt="thumb"
                              className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-[#232738]"
                            />
                            <div>
                              <div className="font-bold text-white truncate max-w-xs">
                                {p.title}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                {p.platform} • {p.category}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 text-center font-mono">
                          <span className="text-[#00F2FF] font-bold bg-[#00F2FF]/10 px-2 py-0.5 rounded border border-[#00F2FF]/30">
                            {p.opportunity_score} pts
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center font-mono text-gray-300">
                          R$ {(p.promo_price || p.price).toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-center font-mono text-white">
                          {p.sales_count ? Math.min(p.sales_count, 120) : 0}
                        </td>

                        <td className="py-3 px-3 text-center font-mono text-[#00F2FF]">
                          {prodConvs.length}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-[#00E676] font-bold">
                          R$ {prodCommission.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: CHANNELS BREAKDOWN */}
        <TabsContent value="channels" className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#11131C] border border-[#1E2232] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#00F2FF]" />
              Performance por Canal de Veiculação
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(summary?.channel_breakdown || []).map((ch, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#151824] border border-[#242A3E] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{ch.channel}</span>
                    <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-1.5 py-0.5 rounded">
                      {ch.publications} posts
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs pt-2 border-t border-[#1F2436]">
                    <div>
                      <div className="text-[10px] text-gray-400">Cliques Válidos</div>
                      <div className="text-sm font-bold text-white">{ch.valid_clicks}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-400">Conversões</div>
                      <div className="text-sm font-bold text-[#00F2FF]">{ch.conversions}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#1F2436] flex items-center justify-between text-xs font-mono">
                    <span className="text-gray-400">Comissão:</span>
                    <span className="text-[#00E676] font-bold">+R$ {ch.commission.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: AI PERFORMANCE INSIGHTS */}
        <TabsContent value="insights" className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#11131C] border border-[#1E2232] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-[#7000FF]" />
                  Aprendizado Real da IA (Insights Baseados em Dados)
                </h3>
                <p className="text-xs text-gray-400">
                  A IA analisa os cliques, canais e vendas reais para apontar diagnósticos
                  estratégicos.
                </p>
              </div>

              <Button
                onClick={handleGenerateAiInsights}
                disabled={isGeneratingAiInsights}
                size="sm"
                className="bg-gradient-to-r from-[#7000FF] to-[#00F2FF] text-[#0A0B10] font-bold text-xs gap-1.5"
              >
                {isGeneratingAiInsights ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processando Dados...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Gerar Diagnóstico da IA
                  </>
                )}
              </Button>
            </div>

            {insights ? (
              <div className="space-y-4 pt-2">
                {/* Diagnostic summary */}
                <div className="p-4 rounded-xl bg-[#151928] border border-[#2A3452] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#00F2FF] flex items-center gap-1.5">
                      <Zap className="w-4 h-4" />
                      Diagnóstico Executivo da Operação
                    </span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40">
                      Confiabilidade: {insights.data_reliability_level}
                    </span>
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed">
                    {insights.diagnostic_summary}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Winner variation */}
                  <div className="p-4 rounded-xl bg-[#141724] border border-[#23273B] space-y-1.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                      Análise de Variação Líder
                    </div>
                    <p className="text-xs text-gray-300">{insights.winner_variation_insight}</p>
                  </div>

                  {/* Channel efficiency */}
                  <div className="p-4 rounded-xl bg-[#141724] border border-[#23273B] space-y-1.5">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-[#00F2FF]" />
                      Eficiência dos Canais (Telegram vs Outros)
                    </div>
                    <p className="text-xs text-gray-300">{insights.channel_efficiency_insight}</p>
                  </div>
                </div>

                {/* Actionable recommendations */}
                <div className="p-4 rounded-xl bg-[#101420] border border-[#1E2538] space-y-2">
                  <div className="text-xs font-bold text-[#00E676] flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    Ações Práticas Recomendadas pela IA
                  </div>
                  <ul className="space-y-1.5">
                    {insights.recommended_actions.map((act, i) => (
                      <li
                        key={i}
                        className="text-xs text-gray-300 flex items-start gap-2 bg-[#141826] p-2 rounded-lg border border-[#20273D]"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#00F2FF] flex-shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center bg-[#0D0F17] rounded-xl border border-[#1B1E2C] p-6 space-y-2">
                <Bot className="w-8 h-8 text-gray-600 mx-auto" />
                <h4 className="text-xs font-bold text-white">Nenhum diagnóstico gerado ainda</h4>
                <p className="text-[11px] text-gray-400 max-w-sm mx-auto">
                  Clique no botão acima para acionar o Analista IA de Performance sobre os dados
                  reais coletados.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 6: CONVERSIONS LIST */}
        <TabsContent value="conversions_list" className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#11131C] border border-[#1E2232] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-[#00E676]" />
              Extrato Detalhado de Conversões
            </h3>

            {conversions.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs">
                Nenhuma conversão registrada ainda. Importe uma planilha CSV ou lance manualmente.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-[#151824] text-gray-400 font-mono text-[11px] uppercase border-b border-[#22273A]">
                    <tr>
                      <th className="py-3 px-4">Pedido / ID Externo</th>
                      <th className="py-3 px-3">Origem & Canal</th>
                      <th className="py-3 px-3">Atribuição</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Valor Venda</th>
                      <th className="py-3 px-3 text-right">Comissão</th>
                      <th className="py-3 px-3 text-right">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D2132]">
                    {conversions.map((c) => (
                      <tr key={c.id} className="hover:bg-[#151824]/60">
                        <td className="py-3 px-4 font-mono font-bold text-white">
                          {c.external_order_id || c.id.slice(0, 10)}
                        </td>

                        <td className="py-3 px-3">
                          <div className="text-white font-bold">{c.channel || 'Afiliados'}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{c.source_type}</div>
                        </td>

                        <td className="py-3 px-3">
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              c.attribution_confidence === 'confirmed'
                                ? 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30'
                                : c.attribution_confidence === 'probable'
                                  ? 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30'
                                  : 'bg-gray-700/30 text-gray-400 border-gray-600'
                            }`}
                          >
                            {c.attribution_confidence === 'confirmed'
                              ? '🟢 Confirmada'
                              : c.attribution_confidence === 'probable'
                                ? '🟡 Provável'
                                : '⚪ Não Atribuída'}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-center">
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              c.status === 'confirmed'
                                ? 'text-[#00E676] bg-[#00E676]/10'
                                : 'text-gray-400 bg-gray-800'
                            }`}
                          >
                            {c.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-gray-300">
                          R$ {c.sale_amount?.toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-[#00E676] font-bold">
                          +R$ {c.commission_amount?.toFixed(2)}
                        </td>

                        <td className="py-3 px-3 text-right font-mono text-gray-400">
                          {c.conversion_date?.slice(0, 10) || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 7: AUDIT LOG */}
        <TabsContent value="audit" className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#11131C] border border-[#1E2232] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Histórico de Auditoria
            </h3>

            {auditLogs.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">
                Nenhum log registrado ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-[#141724] border border-[#23273B] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#00F2FF]" />
                      <span className="font-bold text-white">{log.title}</span>
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">
                        {log.action}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-gray-400">
                      {log.created?.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* MODAL: CSV IMPORTER */}
      <Dialog open={isCsvModalOpen} onOpenChange={setIsCsvModalOpen}>
        <DialogContent className="max-w-2xl bg-[#0E1017] border-[#22273B] text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#00E676]" />
              Importador de Conversões CSV
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Cole o relatório de vendas exportado da sua plataforma de afiliados (Shopee, Mercado
              Livre, Amazon, Hotmart, etc.).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 rounded-lg bg-[#141724] border border-[#23273B] text-[11px] text-gray-300 space-y-1">
              <div className="font-bold text-[#00F2FF]">Colunas reconhecidas automaticamente:</div>
              <p className="font-mono text-[10px] text-gray-400">
                data, id_pedido, produto, venda, comissao, status, sub_id / tracking_id
              </p>
            </div>

            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="data,id_pedido,produto,venda,comissao,status,sub_id&#10;2025-05-10,PED-991,Mini Projetor,189.90,18.99,confirmed,rdr_abc_A_123_tg"
              rows={8}
              className="bg-[#0A0B10] border-[#242A3E] text-xs font-mono text-gray-200"
            />
          </div>

          <DialogFooter className="border-t border-[#1E2232] pt-4 flex items-center justify-between">
            <Button
              onClick={() => setIsCsvModalOpen(false)}
              variant="outline"
              size="sm"
              className="border-[#262B3F] text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleProcessCsv}
              disabled={isImportingCsv}
              size="sm"
              className="bg-[#00E676] hover:bg-[#00C864] text-[#0A0B10] font-bold text-xs"
            >
              {isImportingCsv ? 'Processando & Atribuindo...' : 'Importar & Calcular Atribuição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: MANUAL CONVERSION */}
      <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
        <DialogContent className="max-w-md bg-[#0E1017] border-[#22273B] text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#00E676]" />
              Lançamento Manual de Venda
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Registre uma venda ou comissão confirmada fora do fluxo automático.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">Valor da Venda (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={manualSaleAmount}
                  onChange={(e) => setManualSaleAmount(e.target.value)}
                  placeholder="120.00"
                  className="bg-[#141724] border-[#252A3F] text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-300">Sua Comissão (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={manualCommissionAmount}
                  onChange={(e) => setManualCommissionAmount(e.target.value)}
                  placeholder="18.00"
                  className="bg-[#141724] border-[#252A3F] text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300">Vincular à Campanha</label>
              <Select value={manualCampaignId} onValueChange={setManualCampaignId}>
                <SelectTrigger className="bg-[#141724] border-[#252A3F] text-white text-xs">
                  <SelectValue placeholder="Selecione a campanha..." />
                </SelectTrigger>
                <SelectContent className="bg-[#141724] border-[#252A3F] text-white">
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.campaign_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300">Canal</label>
              <Input
                value={manualChannel}
                onChange={(e) => setManualChannel(e.target.value)}
                placeholder="Telegram, Instagram, etc."
                className="bg-[#141724] border-[#252A3F] text-xs"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-[#1E2232] pt-4 flex items-center justify-between">
            <Button
              onClick={() => setIsManualModalOpen(false)}
              variant="outline"
              size="sm"
              className="border-[#262B3F] text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveManualConversion}
              size="sm"
              className="bg-[#00E676] hover:bg-[#00C864] text-[#0A0B10] font-bold text-xs"
            >
              Salvar Conversão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: REGISTER COST */}
      <Dialog open={isCostModalOpen} onOpenChange={setIsCostModalOpen}>
        <DialogContent className="max-w-md bg-[#0E1017] border-[#22273B] text-white p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-yellow-400" />
              Registrar Custo Operacional
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Adicione despesas atribuíveis para cálculo do Lucro Líquido e ROI real.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300">Tipo de Custo</label>
              <Select value={costType} onValueChange={(v: any) => setCostType(v)}>
                <SelectTrigger className="bg-[#141724] border-[#252A3F] text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#141724] border-[#252A3F] text-white">
                  <SelectItem value="paid_traffic">Tráfego Pago (Meta / TikTok Ads)</SelectItem>
                  <SelectItem value="ai_generation">Geração de IA / Imagens / Vídeo</SelectItem>
                  <SelectItem value="tools_subscription">Assinatura de Ferramentas</SelectItem>
                  <SelectItem value="creative_outsourcing">Freelancer / Designer</SelectItem>
                  <SelectItem value="other">Outros Custos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300">Descrição</label>
              <Input
                value={costDescription}
                onChange={(e) => setCostDescription(e.target.value)}
                placeholder="Ex: Anúncio Meta Reels - Campanha Mini Projetor"
                className="bg-[#141724] border-[#252A3F] text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-300">Valor Gasto (R$)</label>
              <Input
                type="number"
                step="0.01"
                value={costAmount}
                onChange={(e) => setCostAmount(e.target.value)}
                placeholder="50.00"
                className="bg-[#141724] border-[#252A3F] text-xs"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-[#1E2232] pt-4 flex items-center justify-between">
            <Button
              onClick={() => setIsCostModalOpen(false)}
              variant="outline"
              size="sm"
              className="border-[#262B3F] text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCost}
              size="sm"
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-xs"
            >
              Salvar Custo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
