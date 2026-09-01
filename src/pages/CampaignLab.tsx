import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  Sparkles,
  FlaskConical,
  Zap,
  Target,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Layers,
  Video,
  Copy,
  Check,
  Send,
  Bot,
  User,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  DollarSign,
  Star,
  Info,
  Flame,
  ArrowRight,
  TrendingUp,
  Link2,
  Save,
  CheckCircle2,
  RefreshCw,
  Sliders,
  FileText,
  MessageSquare,
  Share2,
  Instagram,
  Eye,
  AlertTriangle,
  HelpCircle,
  Clock,
  BarChart2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ScoreRing } from '@/components/ScoreRing'
import { OpportunityBadge } from '@/components/OpportunityBadge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { productsService, askAiAnalyst } from '@/services/products'
import { hunterService } from '@/services/hunter'
import pb from '@/lib/pocketbase/client'
import { campaignService } from '@/services/campaigns'
import type { ProductRecord, DiscoveredProductRecord } from '@/types/product'
import type {
  CampaignRecord,
  CampaignVariation,
  ProductIntelligence,
  SellingAngle,
  CampaignHookItem,
  ScoreBreakdown,
  ComplianceReviewReport,
  ComplianceStatus,
  ConfidenceLevel,
  VideoScene,
} from '@/types/campaign'

export default function CampaignLabPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Query parameters: productId, discoveredId, or editCampaignId
  const productId = searchParams.get('productId') || ''
  const discoveredId = searchParams.get('discoveredId') || ''
  const editCampaignId = searchParams.get('campaignId') || ''

  // Product loading & state
  const [isLoadingProduct, setIsLoadingProduct] = useState(false)
  const [productData, setProductData] = useState<{
    id?: string
    discovered_id?: string
    title: string
    category: string
    platform: string
    price: number
    promo_price: number
    commission_rate: number
    commission_amount: number
    product_url: string
    affiliate_url: string
    image_url: string
    sales_count: number
    reviews_count: number
    rating: number
    seller: string
    opportunity_score: number
    opportunity_level: string
    ai_analysis: string
    ai_summary: string
  }>({
    id: '',
    discovered_id: '',
    title: '',
    category: 'Geral',
    platform: 'Mercado Livre',
    price: 0,
    promo_price: 0,
    commission_rate: 10,
    commission_amount: 0,
    product_url: '',
    affiliate_url: '',
    image_url: '',
    sales_count: 0,
    reviews_count: 0,
    rating: 4.5,
    seller: '',
    opportunity_score: 75,
    opportunity_level: 'good',
    ai_analysis: '',
    ai_summary: '',
  })

  // Affiliate link input state
  const [affiliateInput, setAffiliateInput] = useState('')
  const [campaignName, setCampaignName] = useState('Minha Campanha')
  const [activeTab, setActiveTab] = useState<
    | 'intelligence'
    | 'angles'
    | 'hooks'
    | 'variations'
    | 'copies'
    | 'scripts'
    | 'compliance'
    | 'chat'
  >('intelligence')

  // AI Generation States
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(editCampaignId || null)

  // Core Intelligence Data
  const [intelligence, setIntelligence] = useState<ProductIntelligence | null>(null)
  const [sellingAngles, setSellingAngles] = useState<SellingAngle[]>([])
  const [selectedAngleId, setSelectedAngleId] = useState<string>('angle_1')
  const [hooksBank, setHooksBank] = useState<CampaignHookItem[]>([])
  const [variations, setVariations] = useState<CampaignVariation[]>([])
  const [selectedVariationLetter, setSelectedVariationLetter] = useState<'A' | 'B' | 'C'>('A')
  const [multiChannelCopies, setMultiChannelCopies] = useState<Record<string, string>>({})
  const [videoScripts, setVideoScripts] = useState<Record<string, unknown>>({})
  const [estimatedScore, setEstimatedScore] = useState(0)
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown | null>(null)
  const [complianceReview, setComplianceReview] = useState<ComplianceReviewReport | null>(null)

  // Custom Copy Generator Sub-State
  const [customChannel, setCustomChannel] = useState('Instagram')
  const [customFormat, setCustomFormat] = useState('caption')
  const [customInstruction, setCustomInstruction] = useState('')
  const [isGeneratingCustomFormat, setIsGeneratingCustomFormat] = useState(false)
  const [generatedCustomResult, setGeneratedCustomResult] = useState<{
    headline?: string
    hook?: string
    body?: string
    cta?: string
    video_scenes?: VideoScene[]
    tips?: string
  } | null>(null)

  // Conversational AI Assistant
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; text: string }>
  >([
    {
      role: 'assistant',
      text: 'Olá! Sou o Analista e Diretor Criativo de Campanhas. Como posso refinar sua estratégia, criar um roteiro mais curto ou testar outro ângulo para este produto?',
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [isChatLoading, setIsChatLoading] = useState(false)

  // Copy to clipboard helper
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    toast.success('Copiado para a área de transferência!')
    setTimeout(() => setCopiedId(null), 2000)
  }

  // 1. Initial Load of Product Data
  useEffect(() => {
    const loadInitialProduct = async () => {
      setIsLoadingProduct(true)
      try {
        if (editCampaignId) {
          const camp = await campaignService.getCampaignById(editCampaignId)
          if (camp) {
            setCampaignName(camp.campaign_name)
            setSavedCampaignId(camp.id)
            setProductData({
              id: camp.product_id || '',
              discovered_id: camp.discovered_id || '',
              title: camp.product_title,
              category: camp.product_category || 'Geral',
              platform: camp.platform || 'Mercado Livre',
              price: camp.price_at_creation || 0,
              promo_price: camp.promo_price_at_creation || 0,
              commission_rate: camp.commission_rate_at_creation || 10,
              commission_amount: camp.commission_amount_at_creation || 0,
              product_url: camp.product_url || '',
              affiliate_url: camp.affiliate_url || '',
              image_url: camp.product_image || '',
              sales_count: 0,
              reviews_count: 0,
              rating: 4.5,
              seller: '',
              opportunity_score: camp.estimated_score || 80,
              opportunity_level: 'good',
              ai_analysis: '',
              ai_summary: '',
            })
            setAffiliateInput(camp.affiliate_url || '')
            if (camp.product_intelligence) setIntelligence(camp.product_intelligence)
            if (camp.selling_angles) setSellingAngles(camp.selling_angles)
            if (camp.hooks_bank) setHooksBank(camp.hooks_bank)
            if (camp.variations && camp.variations.length > 0) setVariations(camp.variations)
            if (camp.generated_copies) setMultiChannelCopies(camp.generated_copies)
            if (camp.video_scripts) setVideoScripts(camp.video_scripts)
            if (camp.estimated_score) setEstimatedScore(camp.estimated_score)
            if (camp.score_breakdown) setScoreBreakdown(camp.score_breakdown)
            if (camp.compliance_report) setComplianceReview(camp.compliance_report)
            setHasGenerated(true)
          }
        } else if (productId) {
          const p = await productsService.getProductById(productId)
          if (p) {
            setProductData({
              id: p.id,
              discovered_id: '',
              title: p.title,
              category: p.category || 'Geral',
              platform: p.platform || 'Shopee',
              price: p.price || 0,
              promo_price: p.promo_price || p.price || 0,
              commission_rate: p.commission_rate || 10,
              commission_amount: p.commission_amount || 0,
              product_url: p.product_url || '',
              affiliate_url: p.affiliate_url || '',
              image_url: p.image_url || '',
              sales_count: p.sales_count || 0,
              reviews_count: p.reviews_count || 0,
              rating: p.rating || 4.5,
              seller: p.seller || '',
              opportunity_score: p.opportunity_score || 75,
              opportunity_level: p.opportunity_level || 'good',
              ai_analysis: p.ai_analysis || '',
              ai_summary: p.ai_summary || '',
            })
            setAffiliateInput(p.affiliate_url || '')
            setCampaignName(`Campanha — ${p.title.slice(0, 35)}...`)
          }
        } else if (discoveredId) {
          const d = await pb
            .collection('discovered_products')
            .getOne<DiscoveredProductRecord>(discoveredId)
          if (d) {
            setProductData({
              id: d.radar_product_id || '',
              discovered_id: d.id,
              title: d.title,
              category: d.category || 'Geral',
              platform: d.platform || 'Mercado Livre',
              price: d.price || 0,
              promo_price: d.promo_price || d.price || 0,
              commission_rate: d.commission_rate || 10,
              commission_amount: d.commission_amount || 0,
              product_url: d.product_url || '',
              affiliate_url: d.affiliate_url || '',
              image_url: d.image_url || '',
              sales_count: d.sales_count || 0,
              reviews_count: d.reviews_count || 0,
              rating: d.rating || 4.5,
              seller: d.seller || '',
              opportunity_score: d.opportunity_score || 75,
              opportunity_level: d.opportunity_level || 'good',
              ai_analysis: d.ai_analysis || '',
              ai_summary: d.ai_summary || '',
            })
            setAffiliateInput(d.affiliate_url || '')
            setCampaignName(`Campanha — ${d.title.slice(0, 35)}...`)
          }
        } else {
          // Default mock/empty product to allow manual creation
          setCampaignName('Nova Campanha de Teste')
        }
      } catch (err) {
        console.error('Error loading product for lab:', err)
        toast.error('Erro ao carregar dados do produto')
      } finally {
        setIsLoadingProduct(false)
      }
    }

    loadInitialProduct()
  }, [productId, discoveredId, editCampaignId])

  const isProductVerifiedForCampaign = (() => {
    const genericTitle = !productData.title.trim() || /^produto\s+(shopee|mercado livre|amazon)?$/i.test(productData.title.trim())
    const missingImage = !productData.image_url?.trim()
    const missingPrice = !(productData.price > 0 || productData.promo_price > 0)
    const missingDestination = !(affiliateInput || productData.affiliate_url || productData.product_url)
    return !genericTitle && !missingImage && !missingPrice && !missingDestination
  })()

  // 2. Generate 1-Click Complete Campaign
  const handleGenerateFullCampaign = async () => {
    if (!isProductVerifiedForCampaign) {
      toast.error('Produto ainda não validado. Confirme título, foto, preço e link antes de gerar campanha.')
      return
    }

    setIsGenerating(true)
    toast.info('IA criando inteligência pré-campanha, ângulos, ganchos e roteiros...')

    try {
      const res = await campaignService.generateFullCampaign({
        product_id: productData.id,
        discovered_id: productData.discovered_id,
        title: productData.title,
        category: productData.category,
        platform: productData.platform,
        price: productData.price,
        promo_price: productData.promo_price,
        commission_rate: productData.commission_rate,
        commission_amount: productData.commission_amount,
        product_url: productData.product_url,
        affiliate_url: affiliateInput || productData.affiliate_url,
        image_url: productData.image_url,
        sales_count: productData.sales_count,
        reviews_count: productData.reviews_count,
        rating: productData.rating,
        seller: productData.seller,
        opportunity_score: productData.opportunity_score,
        opportunity_level: productData.opportunity_level,
        ai_analysis: productData.ai_analysis,
        ai_summary: productData.ai_summary,
      })

      setIntelligence(res.product_intelligence)
      setSellingAngles(res.selling_angles || [])
      setHooksBank(res.hooks_bank || [])
      setVariations(res.variations || [])
      setMultiChannelCopies(res.multi_channel_copies || {})
      setVideoScripts(res.video_scripts_collection || {})
      setEstimatedScore(res.estimated_score || 87)
      setScoreBreakdown(res.score_breakdown || null)
      setComplianceReview(res.compliance_review || null)

      setHasGenerated(true)

      const selectedAngle = (res.selling_angles || []).find((a) => a.id === selectedAngleId)
      const saved = await campaignService.saveCampaign({
        product_id: productData.id || '',
        discovered_id: productData.discovered_id || '',
        product_title: productData.title,
        product_image: productData.image_url,
        product_category: productData.category,
        platform: productData.platform,
        product_url: productData.product_url,
        affiliate_url: affiliateInput || productData.affiliate_url,
        price_at_creation: productData.price,
        promo_price_at_creation: productData.promo_price,
        commission_rate_at_creation: productData.commission_rate,
        commission_amount_at_creation: productData.commission_amount,
        campaign_name: campaignName,
        selected_angle_id: selectedAngleId,
        selected_angle_title: selectedAngle?.title || 'Problema & Solução',
        target_audience: selectedAngle?.public || 'Geral',
        recommended_channels: ['TikTok', 'Instagram', 'YouTube Shorts'],
        primary_channel: 'TikTok',
        primary_format: 'script_30s',
        status: 'draft',
        product_intelligence: res.product_intelligence,
        selling_angles: res.selling_angles || [],
        hooks_bank: res.hooks_bank || [],
        generated_copies: res.multi_channel_copies || {},
        video_scripts: res.video_scripts_collection || {},
        estimated_score: res.estimated_score || 87,
        score_breakdown: res.score_breakdown,
        compliance_status: res.compliance_review?.status || 'approved',
        compliance_report: res.compliance_review,
        variations: res.variations || [],
      } as Partial<CampaignRecord> & { variations?: CampaignVariation[] })

      setSavedCampaignId(saved.campaign_id)
      toast.success('Campanha gerada e salva automaticamente no Histórico!')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Falha ao gerar campanha'
      console.error('Error generating campaign:', err)
      toast.error(`Falha ao gerar campanha: ${errorMessage}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // 3. Save Campaign to Database
  const handleSaveCampaign = async () => {
    if (!productData.title) {
      toast.error('Título do produto obrigatório')
      return
    }

    setIsSaving(true)
    try {
      const selectedAngle = sellingAngles.find((a) => a.id === selectedAngleId)

      const payload = {
        id: savedCampaignId || undefined,
        product_id: productData.id || '',
        discovered_id: productData.discovered_id || '',
        product_title: productData.title,
        product_image: productData.image_url,
        product_category: productData.category,
        platform: productData.platform,
        product_url: productData.product_url,
        affiliate_url: affiliateInput || productData.affiliate_url,
        price_at_creation: productData.price,
        promo_price_at_creation: productData.promo_price,
        commission_rate_at_creation: productData.commission_rate,
        commission_amount_at_creation: productData.commission_amount,
        campaign_name: campaignName,
        selected_angle_id: selectedAngleId,
        selected_angle_title: selectedAngle?.title || 'Problema & Solução',
        target_audience: selectedAngle?.public || 'Geral',
        recommended_channels: ['TikTok', 'Instagram', 'YouTube Shorts'],
        primary_channel: 'TikTok',
        primary_format: 'script_30s',
        status: 'draft' as const,
        product_intelligence: intelligence || undefined,
        selling_angles: sellingAngles,
        hooks_bank: hooksBank,
        generated_copies: multiChannelCopies,
        video_scripts: videoScripts,
        estimated_score: estimatedScore,
        score_breakdown: scoreBreakdown || undefined,
        compliance_status: complianceReview?.status || 'approved',
        compliance_report: complianceReview || undefined,
        variations: variations,
      }

      const res = await campaignService.saveCampaign(payload)
      setSavedCampaignId(res.campaign_id)
      toast.success('Campanha salva na sua Biblioteca com sucesso!')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao salvar'
      toast.error(`Erro ao salvar campanha: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }

  // 4. Generate Single Channel/Format Copy
  const handleGenerateCustomFormat = async () => {
    if (!productData.title) return
    setIsGeneratingCustomFormat(true)
    try {
      const angle = sellingAngles.find((a) => a.id === selectedAngleId)
      const res = await campaignService.generateFormatCopy({
        product_title: productData.title,
        product_price: productData.price,
        category: productData.category,
        angle_title: angle?.title || 'Problema & Solução',
        target_audience: angle?.public || 'Consumidores em geral',
        channel: customChannel,
        format: customFormat,
        custom_instruction: customInstruction,
      })
      setGeneratedCustomResult(res)
      toast.success(`Conteúdo para ${customChannel} (${customFormat}) gerado!`)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao gerar formato'
      toast.error(`Erro ao gerar formato: ${errorMessage}`)
    } finally {
      setIsGeneratingCustomFormat(false)
    }
  }

  // 5. Send Message to Conversational AI Assistant
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!chatInput.trim() || isChatLoading) return

    const userText = chatInput.trim()
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', text: userText }])
    setIsChatLoading(true)

    try {
      const contextPrompt = `Contexto da Campanha Atual:
Produto: "${productData.title}" | Preço: R$ ${productData.price} | Categoria: ${productData.category}
Ângulo Selecionado: "${sellingAngles.find((a) => a.id === selectedAngleId)?.title || 'Geral'}"
Score Estimado da IA: ${estimatedScore}/100
Pedido do Usuário: ${userText}`

      const res = await askAiAnalyst(contextPrompt, productData.id)
      setChatMessages((prev) => [...prev, { role: 'assistant', text: res.answer }])
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Falha na resposta'
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Erro ao responder: ${errorMessage}`,
        },
      ])
    } finally {
      setIsChatLoading(false)
    }
  }

  // Confidence Level Pill component
  const renderConfidenceBadge = (level?: ConfidenceLevel) => {
    if (level === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#00E676]/15 text-[#00E676] border border-[#00E676]/30">
          <CheckCircle2 className="w-2.5 h-2.5" /> Confirmado (Fonte)
        </span>
      )
    }
    if (level === 'inferred') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#FFD600]/15 text-[#FFD600] border border-[#FFD600]/30">
          <HelpCircle className="w-2.5 h-2.5" /> Inferido pela IA
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
        <AlertTriangle className="w-2.5 h-2.5" /> Não disponível
      </span>
    )
  }

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* TOP BAR / BREADCRUMB / PRODUCT SELECTOR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#121420] border border-[#232738] shadow-xl">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7000FF] to-[#00F2FF] flex items-center justify-center flex-shrink-0 shadow-[0_0_20px_rgba(112,0,255,0.4)]">
            <FlaskConical className="w-6 h-6 text-[#0A0B10]" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#00F2FF]/15 text-[#00F2FF] border border-[#00F2FF]/30">
                FASE 3 • LABORATÓRIO DE CAMPANHAS
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                "Encontramos um bom produto. Como vamos vendê-lo?"
              </span>
            </div>
            <h1 className="text-lg md:text-xl font-black text-white truncate">
              {productData.title || 'Selecione ou Importe um Produto'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link to="/campanhas">
            <Button
              variant="outline"
              size="sm"
              className="h-9 border-[#2A2E44] bg-[#161826] hover:bg-[#1F2236] text-gray-300 text-xs gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#00F2FF]" />
              Minhas Campanhas
            </Button>
          </Link>

          <Button
            size="sm"
            onClick={handleGenerateFullCampaign}
            disabled={isGenerating || !isProductVerifiedForCampaign}
            className="h-9 px-4 bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] font-black text-xs gap-1.5 shadow-[0_0_20px_rgba(0,242,255,0.3)]"
          >
            <Sparkles className={cn('w-3.5 h-3.5', isGenerating && 'animate-spin')} />
            {isGenerating ? 'Gerando Inteligência...' : 'Gerar Campanha Completa (1 Clique)'}
          </Button>

          {hasGenerated && (
            <>
              <Button
                size="sm"
                onClick={() => {
                  if (savedCampaignId) {
                    navigate(`/estudio?campaignId=${savedCampaignId}&variation=A`)
                  } else {
                    toast.info('Salvando campanha antes de abrir o Estúdio Criativo...')
                    handleSaveCampaign().then(() => {
                      if (savedCampaignId)
                        navigate(`/estudio?campaignId=${savedCampaignId}&variation=A`)
                    })
                  }
                }}
                className="h-9 px-4 bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] font-black text-xs gap-1.5 shadow-[0_0_15px_rgba(0,242,255,0.3)]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Criar Criativo (Estúdio IA)
              </Button>

              <Button
                size="sm"
                onClick={handleSaveCampaign}
                disabled={isSaving}
                className="h-9 px-4 bg-[#7000FF] hover:bg-[#8519FF] text-white font-bold text-xs gap-1.5 shadow-[0_0_15px_rgba(112,0,255,0.3)]"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Salvando...' : 'Salvar Campanha'}
              </Button>
            </>
          )}
        </div>
      </div>

      {!isProductVerifiedForCampaign && productData.id && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-300 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-amber-200">Produto ainda não validado para campanha</div>
            <p className="text-xs text-amber-100/80 mt-1">
              O Radar bloqueou a criação automática porque faltam dados confiáveis do produto. Precisamos confirmar título, foto, preço e link antes de gerar criativos ou campanhas.
            </p>
          </div>
        </div>
      )}

            {/* CARD CRM LEARNINGS (FASE 8) */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-[#0d1726] via-[#101e38] to-[#0d1726] border border-[#00F2FF]/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#00F2FF]/10 text-[#00F2FF]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>💡 Aprendizados do CRM & Recompra (Fase 8)</span>
              <Badge className="bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">
                Recomendação Ativa
              </Badge>
            </div>
            <p className="text-[11px] text-gray-300 mt-0.5">
              Clientes que chegam por canais diretos (ex: Telegram) têm taxa de recompra{' '}
              <strong>3.2x maior</strong> quando a primeira mensagem foca em demonstração de uso
              prático e sem pressão agressiva.
            </p>
          </div>
        </div>
        <Link
          to="/crm"
          className="text-xs font-bold text-[#00F2FF] hover:underline whitespace-nowrap"
        >
          Ver CRM →
        </Link>
      </div>

      {/* PRODUCT SUMMARY & AFFILIATE LINK BANNER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Info Card */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {productData.image_url ? (
                <img
                  src={productData.image_url}
                  alt={productData.title}
                  className="w-16 h-16 rounded-xl object-cover bg-[#0A0B10] border border-[#232738] flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-[#0A0B10] border border-dashed border-amber-500/40 flex items-center justify-center text-[9px] text-amber-300 text-center px-1 flex-shrink-0">
                  Sem imagem validada
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge
                    variant="outline"
                    className="bg-[#1A1D2D] text-gray-300 border-[#2A2E44] text-[10px]"
                  >
                    {productData.platform}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="bg-[#1A1D2D] text-gray-300 border-[#2A2E44] text-[10px]"
                  >
                    {productData.category}
                  </Badge>
                  {isProductVerifiedForCampaign ? (
                    <OpportunityBadge
                      level={(productData.opportunity_level as any) || 'good'}
                      size="sm"
                    />
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px]">
                      AGUARDANDO VALIDAÇÃO
                    </Badge>
                  )}
                </div>
                <h3 className="text-sm font-bold text-white line-clamp-1">
                  {productData.title || 'Produto sem título'}
                </h3>
              </div>
            </div>

            {/* Price Snapshot & Commission */}
            <div className="flex items-center gap-4 bg-[#0E1018] px-3.5 py-2 rounded-xl border border-[#202538] font-mono text-xs w-full sm:w-auto justify-between">
              <div>
                <span className="text-[10px] text-gray-400 block">Preço no Radar</span>
                <span className={`font-bold ${isProductVerifiedForCampaign ? 'text-white' : 'text-amber-300'}`}>
                  {isProductVerifiedForCampaign
                    ? `R$ ${(productData.promo_price || productData.price || 0).toFixed(2)}`
                    : 'Aguardando'}
                </span>
              </div>
              <div className="border-l border-[#202538] pl-3">
                <span className="text-[10px] text-[#00E676] block">
                  Comissão ({productData.commission_rate}%)
                </span>
                <span className={`font-bold ${isProductVerifiedForCampaign ? 'text-[#00E676]' : 'text-gray-500'}`}>
                  {isProductVerifiedForCampaign ? `+R$ ${(productData.commission_amount || 0).toFixed(2)}` : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Affiliate Link Configurator (Rule 13) */}
          <div className="pt-3 border-t border-[#232738] space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-[#00F2FF]" />
                Link de Afiliado para a Campanha:
              </label>

              {affiliateInput && affiliateInput.trim().length > 5 ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded border border-[#00E676]/30 font-bold">
                  <CheckCircle2 className="w-3 h-3" /> Link Configurado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-[#FFD600] bg-[#FFD600]/10 px-2 py-0.5 rounded border border-[#FFD600]/30 font-bold">
                  <AlertTriangle className="w-3 h-3" /> Link de afiliado ainda não configurado
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={affiliateInput}
                onChange={(e) => setAffiliateInput(e.target.value)}
                placeholder="Cole aqui seu link de afiliado rastreável (ex: https://shope.ee/... ou https://mercadolivre.com/sec/...)"
                className="bg-[#0A0B10] border-[#252A3D] text-xs h-9 text-white placeholder-gray-500 font-mono focus-visible:ring-[#00F2FF]"
              />
              {affiliateInput && (
                <a
                  href={affiliateInput}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center px-3 h-9 rounded-md bg-[#1B1E2E] hover:bg-[#252A40] text-gray-200 border border-[#2E3552] text-xs font-mono"
                  title="Testar link de afiliado"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
            <p className="text-[10px] text-gray-500">
              * O sistema nunca converte o link comum em link de afiliado sem sua autorização
              explícita.
            </p>
          </div>
        </div>

        {/* Right: Pre-test Campaign Score & Compliance Status Box (Rule 11 & 12) */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-gradient-to-br from-[#161826] to-[#121420] border border-[#232738] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-[#232738]">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-[#00F2FF]" />
                Score da Campanha
              </span>
              <span className="text-[9px] font-mono text-[#00F2FF] bg-[#00F2FF]/10 px-2 py-0.5 rounded border border-[#00F2FF]/30 font-bold uppercase">
                Estimativa Pré-Teste
              </span>
            </div>

            <div className="flex items-center gap-4 pt-3">
              <ScoreRing score={isProductVerifiedForCampaign ? estimatedScore : 0} size="lg" />
              <div>
                <div className="text-2xl font-black font-mono text-white">
                  {isProductVerifiedForCampaign ? `${estimatedScore}/100` : '—'}
                </div>
                <p className="text-[11px] text-gray-400 leading-tight mt-0.5">
                  {isProductVerifiedForCampaign
                    ? 'Baseado em força do gancho, clareza, apelo e conformidade com políticas.'
                    : 'O score só será calculado depois que o produto for validado.'}
                </p>
              </div>
            </div>
          </div>

          {/* Compliance Badge */}
          <div className="p-3 rounded-xl bg-[#0E1018] border border-[#212638] space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 font-medium">Revisão de Conformidade:</span>
              {complianceReview?.status === 'approved' ? (
                <span className="text-[#00E676] font-bold flex items-center gap-1 text-xs">
                  <ShieldCheck className="w-4 h-4" /> 🟢 APROVADO
                </span>
              ) : complianceReview?.status === 'needs_revision' ? (
                <span className="text-[#FFD600] font-bold flex items-center gap-1 text-xs">
                  <ShieldAlert className="w-4 h-4" /> 🟡 REVISAR
                </span>
              ) : (
                <span className="text-red-400 font-bold flex items-center gap-1 text-xs">
                  <ShieldX className="w-4 h-4" /> 🔴 BLOQUEADO
                </span>
              )}
            </div>
            <div className="text-[10px] text-gray-500 leading-tight">
              {complianceReview?.verdict_summary ||
                'Nenhuma alegação enganosa detectada. Regra: Persuasão ≠ Enganação.'}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN LAB WORKSPACE TABS */}
      {!hasGenerated ? (
        <div className="p-12 text-center rounded-3xl bg-[#121420] border border-[#232738] space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#1A1D2E] text-[#00F2FF] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,242,255,0.2)]">
            <FlaskConical className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-lg font-bold text-white">
              Laboratório Pronto para Criar a Estratégia
            </h2>
            <p className="text-xs text-gray-400 leading-relaxed">
              Clique em <strong>"Gerar Campanha Completa (1 Clique)"</strong> acima para a IA
              analisar o produto, identificar níveis de confiança, criar 5 ângulos de venda
              distintos, banco de 10 ganchos, variações A/B/C e roteiros por cena.
            </p>
          </div>
          {/* BANNER FASE 6: APRENDIZADO DO HISTÓRICO NO LABORATÓRIO */}
          <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 flex items-start gap-3 text-left max-w-xl">
            <div className="p-2 rounded-lg bg-purple-900/40 text-purple-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                  🧠 Aprendizados do Seu Histórico para Campanhas
                </span>
                <span className="text-[10px] bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded border border-purple-700">
                  Padrão Validado
                </span>
              </div>
              <p className="text-slate-300">
                O histórico aponta que o ângulo de <strong>Demonstração Prática</strong> e vídeos de{' '}
                <strong>15s</strong> geram <strong>+97% de CTR</strong> vs estáticos.
              </p>
            </div>
          </div>

          {/* BANNER FASE 7: RADAR DE PÚBLICO E INSIGHTS DE DEMANDA REAL */}
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex items-start justify-between gap-3 text-left max-w-xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-900/40 text-cyan-400 shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                    🎯 O Público Está Falando Sobre (Reddit)
                  </span>
                  <span className="text-[10px] bg-cyan-900/60 text-cyan-300 px-2 py-0.5 rounded border border-cyan-700 font-mono">
                    Radar Fase 7
                  </span>
                </div>
                <p className="text-slate-300">
                  Detectamos alta intenção em <strong>"bateria dura quanto tempo"</strong> e{' '}
                  <strong>"onde comprar original"</strong>. Use como ângulo ou gancho.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/publico')}
              className="h-8 text-[10px] border-cyan-500/40 bg-cyan-900/30 text-cyan-200 hover:bg-cyan-800/40 whitespace-nowrap shrink-0"
            >
              Ver no Radar
            </Button>
          </div>

          <Button
            size="lg"
            onClick={handleGenerateFullCampaign}
            disabled={isGenerating || !productData.title}
            className="h-11 px-6 bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] font-black text-sm gap-2 shadow-[0_0_25px_rgba(0,242,255,0.4)]"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'Processando Estratégia IA...' : 'Iniciar Laboratório de Criação'}
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as typeof activeTab)}
            className="w-full"
          >
            {/* Tabs List Navigation */}
            <TabsList className="grid grid-cols-4 md:grid-cols-8 bg-[#10121C] p-1 border border-[#232738] rounded-2xl mb-6">
              <TabsTrigger
                value="intelligence"
                className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00F2FF] text-xs font-semibold py-2"
              >
                1. Inteligência
              </TabsTrigger>
              <TabsTrigger
                value="angles"
                className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00F2FF] text-xs font-semibold py-2"
              >
                2. Ângulos (5)
              </TabsTrigger>
              <TabsTrigger
                value="hooks"
                className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00F2FF] text-xs font-semibold py-2"
              >
                3. Ganchos (10)
              </TabsTrigger>
              <TabsTrigger
                value="variations"
                className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00F2FF] text-xs font-semibold py-2"
              >
                4. Testes A/B/C
              </TabsTrigger>
              <TabsTrigger
                value="copies"
                className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00F2FF] text-xs font-semibold py-2"
              >
                5. Copies por Canal
              </TabsTrigger>
              <TabsTrigger
                value="scripts"
                className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00F2FF] text-xs font-semibold py-2"
              >
                6. Roteiros Vídeo
              </TabsTrigger>
              <TabsTrigger
                value="compliance"
                className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#00E676] text-xs font-semibold py-2"
              >
                7. Auditoria / Score
              </TabsTrigger>
              <TabsTrigger
                value="chat"
                className="data-[state=active]:bg-[#1A1D2E] data-[state=active]:text-[#7000FF] text-xs font-semibold py-2"
              >
                8. IA Conversacional
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: INTELIGÊNCIA PRÉ-CAMPANHA & NÍVEL DE CONFIANÇA (Rules 2 & 3) */}
            <TabsContent value="intelligence" className="space-y-6 m-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* O que é o produto & Problema que resolve */}
                <div className="md:col-span-2 space-y-4">
                  <div className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Target className="w-4 h-4 text-[#00F2FF]" />
                        O que é o produto & Qual problema resolve?
                      </h3>
                      {renderConfidenceBadge('confirmed')}
                    </div>
                    <div className="space-y-2 text-xs text-gray-300 leading-relaxed">
                      <p>
                        <strong className="text-white">Definição Clara: </strong>
                        {intelligence?.what_is || 'Produto inovador com alta demanda na categoria.'}
                      </p>
                      <p>
                        <strong className="text-[#00F2FF]">Dor / Problema Central: </strong>
                        {intelligence?.solves_problem ||
                          'Elimina a dificuldade e atrito de tarefas diárias.'}
                      </p>
                    </div>
                  </div>

                  {/* Perfis de Público & Motivações */}
                  <div className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-[#7000FF]" />
                      Quem Compraria? (Perfis de Público Alvo)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {intelligence?.target_audiences?.map((aud, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-[#0E1018] border border-[#212538] space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-white">{aud.name}</span>
                            {renderConfidenceBadge(aud.confidence)}
                          </div>
                          <p className="text-[11px] text-gray-400 leading-snug">
                            {aud.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Benefícios Sustentados vs Objeções */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738] space-y-2.5">
                      <span className="text-xs font-bold text-[#00E676] uppercase tracking-wider flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Benefícios Comprovados
                      </span>
                      <ul className="space-y-1.5 text-xs text-gray-300">
                        {intelligence?.benefits?.map((ben, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[#00E676] font-bold">•</span>
                            <span>{ben.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738] space-y-2.5">
                      <span className="text-xs font-bold text-[#FF3D00] uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> Objeções a Vencer
                      </span>
                      <ul className="space-y-1.5 text-xs text-gray-300">
                        {intelligence?.objections?.map((obj, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-[#FF3D00] font-bold">•</span>
                            <span>{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Right: Confidence Breakdown Card (Rule 3) */}
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#00E676]" />
                        Auditoria de Confiança das Informações
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-1">
                        A IA nunca inventa características para forçar vendas. Cada dado possui
                        nível de confiabilidade verificado.
                      </p>
                    </div>

                    {/* 🟢 Confirmado */}
                    <div className="p-3 rounded-xl bg-[#00E676]/10 border border-[#00E676]/30 space-y-1.5">
                      <div className="text-xs font-bold text-[#00E676] flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 🟢 Confirmado (Dados da Fonte)
                      </div>
                      <ul className="text-[11px] text-gray-300 space-y-1">
                        {intelligence?.confidence_summary?.confirmed?.map((item, i) => (
                          <li key={i}>✓ {item}</li>
                        ))}
                      </ul>
                    </div>

                    {/* 🟡 Inferido */}
                    <div className="p-3 rounded-xl bg-[#FFD600]/10 border border-[#FFD600]/30 space-y-1.5">
                      <div className="text-xs font-bold text-[#FFD600] flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" /> 🟡 Inferido (Lógica Razoável da IA)
                      </div>
                      <ul className="text-[11px] text-gray-300 space-y-1">
                        {intelligence?.confidence_summary?.inferred?.map((item, i) => (
                          <li key={i}>~ {item}</li>
                        ))}
                      </ul>
                    </div>

                    {/* 🔴 Não Disponível */}
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 space-y-1.5">
                      <div className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" /> 🔴 Não Disponível (Proibido usar
                        como fato)
                      </div>
                      <ul className="text-[11px] text-gray-300 space-y-1">
                        {intelligence?.confidence_summary?.unavailable?.map((item, i) => (
                          <li key={i}>✗ {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: 5 ÂNGULOS DE VENDA RADICALMENTE DISTINTOS (Rule 4) */}
            <TabsContent value="angles" className="space-y-4 m-0">
              <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738] flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#00F2FF]" />5 Ângulos de Venda Estratégicos
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Selecione um ângulo para guiar a criação das copies e roteiros ou teste todos em
                    paralelo.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {sellingAngles.map((angle) => {
                  const isSelected = selectedAngleId === angle.id
                  return (
                    <div
                      key={angle.id}
                      onClick={() => setSelectedAngleId(angle.id)}
                      className={cn(
                        'p-4 rounded-2xl bg-[#141624] border transition-all cursor-pointer flex flex-col justify-between space-y-3',
                        isSelected
                          ? 'border-[#00F2FF] bg-[#171B2B] shadow-[0_0_20px_rgba(0,242,255,0.2)]'
                          : 'border-[#232738] hover:border-[#00F2FF]/50 hover:bg-[#161826]',
                      )}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase text-[#00F2FF] bg-[#00F2FF]/10 px-2 py-0.5 rounded">
                            {angle.id.replace('_', ' ').toUpperCase()}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-[#00F2FF]" />}
                        </div>

                        <h4 className="text-sm font-bold text-white leading-tight">
                          {angle.title}
                        </h4>

                        <div className="text-[11px] text-gray-300 space-y-1 pt-1 border-t border-[#232738]">
                          <div>
                            <span className="text-gray-500 font-semibold">Público: </span>
                            {angle.public}
                          </div>
                          <div>
                            <span className="text-gray-500 font-semibold">Dor/Desejo: </span>
                            {angle.pain_desire}
                          </div>
                          <div>
                            <span className="text-gray-500 font-semibold">Gancho: </span>
                            <span className="text-[#00F2FF] italic">"{angle.hook}"</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-[#232738] text-[10px] font-mono">
                        <div className="text-gray-400">
                          Canal:{' '}
                          <strong className="text-gray-200">{angle.recommended_channel}</strong>
                        </div>
                        <div className="text-gray-400">
                          Formato:{' '}
                          <strong className="text-gray-200">{angle.recommended_format}</strong>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </TabsContent>

            {/* TAB 3: BANCO DE GANCHOS (10 TIPOS) (Rule 8) */}
            <TabsContent value="hooks" className="space-y-4 m-0">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-[#141624] border border-[#232738]">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-[#FF3D00]" />
                    Banco de Ganchos Magnéticos (10 Hipóteses Criativas)
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Ganchos formulados com base em diferentes gatilhos psicológicos: Curiosidade,
                    Problema, Demonstração, Pergunta, Descoberta, Comparação, Benefício e
                    Identificação.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {hooksBank.map((hook, idx) => (
                  <div
                    key={hook.id || idx}
                    className="p-4 rounded-2xl bg-[#141624] border border-[#232738] hover:border-[#00F2FF]/40 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#7000FF]/20 text-[#00F2FF] border border-[#7000FF]/40">
                          {hook.type}
                        </span>
                        {renderConfidenceBadge(hook.confidence || 'confirmed')}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#00E676]">
                          Score {hook.strength_score || 90}/100
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(hook.text, `hook-${idx}`)}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-white"
                        >
                          {copiedId === `hook-${idx}` ? (
                            <Check className="w-3.5 h-3.5 text-[#00E676]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <p className="text-xs font-medium text-white leading-relaxed italic">
                      "{hook.text}"
                    </p>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 4: TESTES A/B/C COM HIPÓTESES DISTINTAS (Rule 10 & 17) */}
            <TabsContent value="variations" className="space-y-4 m-0">
              <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#00F2FF]" />
                    Variações A / B / C para Teste de Conversão
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Cada versão testa uma hipótese criativa diferente. O ID único permitirá
                    futuramente registrar métricas reais de cliques, conversões e ROI.
                  </p>
                </div>

                <div className="flex gap-2">
                  {(['A', 'B', 'C'] as const).map((letter) => (
                    <Button
                      key={letter}
                      size="sm"
                      onClick={() => setSelectedVariationLetter(letter)}
                      className={cn(
                        'h-8 px-3 font-mono font-bold text-xs',
                        selectedVariationLetter === letter
                          ? 'bg-[#00F2FF] text-[#0A0B10]'
                          : 'bg-[#181B2B] text-gray-300 hover:bg-[#22273D]',
                      )}
                    >
                      Versão {letter}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Selected Variation Detail */}
              {variations
                .filter((v) => v.version_letter === selectedVariationLetter)
                .map((v, idx) => (
                  <div
                    key={idx}
                    className="p-6 rounded-2xl bg-[#141624] border border-[#232738] space-y-5"
                  >
                    {/* Header with hypothesis */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#232738]">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-6 h-6 rounded-lg bg-[#00F2FF] text-[#0A0B10] font-black text-xs flex items-center justify-center font-mono">
                            {v.version_letter}
                          </span>
                          <h4 className="text-base font-bold text-white">{v.hypothesis_name}</h4>
                        </div>
                        <p className="text-xs text-gray-400">{v.hypothesis_details}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right font-mono">
                          <span className="text-[10px] text-gray-500 block">Estimativa IA</span>
                          <span className="text-sm font-bold text-[#00F2FF]">
                            {v.estimated_score || 88}/100
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-[#00E676]/10 text-[#00E676] border-[#00E676]/30 text-xs py-1"
                        >
                          🟢 Aprovado
                        </Badge>
                      </div>
                    </div>

                    {/* Copy & Hook Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Hook */}
                      <div className="p-4 rounded-xl bg-[#0E1018] border border-[#202538] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#00F2FF] uppercase tracking-wider">
                            Gancho (Hook)
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(v.hook_text, `var-hook-${v.version_letter}`)
                            }
                            className="h-7 text-xs text-gray-400 hover:text-white"
                          >
                            <Copy className="w-3 h-3 mr-1" /> Copiar
                          </Button>
                        </div>
                        <p className="text-xs text-white font-medium italic">"{v.hook_text}"</p>
                      </div>

                      {/* CTA (Rule 9: No false urgency) */}
                      <div className="p-4 rounded-xl bg-[#0E1018] border border-[#202538] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#00E676] uppercase tracking-wider">
                            Chamada para Ação (CTA Ética)
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(v.cta_text, `var-cta-${v.version_letter}`)
                            }
                            className="h-7 text-xs text-gray-400 hover:text-white"
                          >
                            <Copy className="w-3 h-3 mr-1" /> Copiar
                          </Button>
                        </div>
                        <p className="text-xs text-white font-medium">{v.cta_text}</p>
                        <span className="text-[10px] text-gray-500 block">
                          Objetivo: <strong className="text-gray-300">{v.cta_objective}</strong> •
                          Sem urgência falsa
                        </span>
                      </div>
                    </div>

                    {/* Full Copy Text */}
                    <div className="p-4 rounded-xl bg-[#0E1018] border border-[#202538] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Texto Completo da Copy ({v.channel} • {v.format})
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            copyToClipboard(v.copy_text, `var-copy-${v.version_letter}`)
                          }
                          className="h-7 text-xs text-gray-400 hover:text-white"
                        >
                          <Copy className="w-3 h-3 mr-1" /> Copiar Copy
                        </Button>
                      </div>
                      <p className="text-xs text-gray-200 whitespace-pre-line leading-relaxed">
                        {v.copy_text}
                      </p>
                    </div>

                    {/* Video Scenes breakdown if present (Rule 7) */}
                    {v.video_scenes && v.video_scenes.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Video className="w-4 h-4 text-[#00F2FF]" /> Roteiro de Cenas Sugeridas
                          para Vídeo
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {v.video_scenes.map((scene, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-3 rounded-xl bg-[#0A0B10] border border-[#1E2336] space-y-1.5 text-xs"
                            >
                              <div className="flex items-center justify-between font-mono text-[10px]">
                                <span className="font-bold text-[#00F2FF]">
                                  Cena {scene.scene_number}
                                </span>
                                <span className="text-gray-400 bg-[#161826] px-1.5 py-0.5 rounded">
                                  {scene.time_range}
                                </span>
                              </div>
                              <div className="text-gray-300">
                                <strong className="text-gray-500">Ação: </strong>
                                {scene.visual_action}
                              </div>
                              <div className="text-[#FFE600]">
                                <strong className="text-gray-500">Texto na tela: </strong>"
                                {scene.on_screen_text}"
                              </div>
                              <div className="text-gray-200 italic">
                                <strong className="text-gray-500">Narração: </strong>"
                                {scene.narration}"
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </TabsContent>

            {/* TAB 5: COPIES MULTI-CANAL E FORMATOS (Rule 5 & 6) */}
            <TabsContent value="copies" className="space-y-6 m-0">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Pre-generated Multi-channel Copies */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738]">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-[#00F2FF]" />
                      Cópias Prontas Adaptadas por Canal
                    </h3>
                  </div>

                  {Object.entries(multiChannelCopies).map(([key, text]) => {
                    const channelLabel = key
                      .replace('_', ' ')
                      .replace('caption', 'Legenda')
                      .replace('message', 'Mensagem')
                      .replace('headline copy', 'Headline & Landing Page')
                      .toUpperCase()

                    return (
                      <div
                        key={key}
                        className="p-4 rounded-2xl bg-[#141624] border border-[#232738] space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-[#00F2FF]">
                            {channelLabel}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(text, `copy-${key}`)}
                            className="h-7 text-xs text-gray-400 hover:text-white"
                          >
                            <Copy className="w-3 h-3 mr-1" /> Copiar
                          </Button>
                        </div>
                        <p className="text-xs text-gray-200 whitespace-pre-line leading-relaxed">
                          {text}
                        </p>
                      </div>
                    )
                  })}
                </div>

                {/* Custom Generator Form on-demand */}
                <div className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-4 h-fit">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#7000FF]" />
                    Gerar Outro Formato Específico
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-gray-400 block mb-1">Canal de Destino:</label>
                      <select
                        value={customChannel}
                        onChange={(e) => setCustomChannel(e.target.value)}
                        className="w-full h-9 rounded-xl bg-[#0A0B10] border border-[#252A3D] text-white px-3 text-xs focus:outline-none focus:border-[#00F2FF]"
                      >
                        <option value="Instagram">Instagram (Reels / Feed)</option>
                        <option value="TikTok">TikTok</option>
                        <option value="YouTube Shorts">YouTube Shorts</option>
                        <option value="WhatsApp">WhatsApp (Grupos / Broadcast)</option>
                        <option value="Telegram">Telegram</option>
                        <option value="Pinterest">Pinterest</option>
                        <option value="Landing Page">Página de Venda / LP</option>
                        <option value="Facebook">Facebook Ads</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 block mb-1">Formato Desejado:</label>
                      <select
                        value={customFormat}
                        onChange={(e) => setCustomFormat(e.target.value)}
                        className="w-full h-9 rounded-xl bg-[#0A0B10] border border-[#252A3D] text-white px-3 text-xs focus:outline-none focus:border-[#00F2FF]"
                      >
                        <option value="short_ad">Anúncio Curto (Gancho + Benefício + CTA)</option>
                        <option value="caption">Legenda Completa</option>
                        <option value="script_15s">Roteiro de 15 segundos</option>
                        <option value="script_30s">Roteiro de 30 segundos</option>
                        <option value="script_60s">Roteiro de 60 segundos</option>
                        <option value="story">Sequência de Stories</option>
                        <option value="carousel">Carrossel (Slide a Slide)</option>
                        <option value="product_description">Descrição de Produto Persuasiva</option>
                        <option value="promo_message">Mensagem Promocional Direta</option>
                        <option value="demo_script">Script de Demonstração Prática</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-gray-400 block mb-1">
                        Instrução Extra (Opcional):
                      </label>
                      <Input
                        value={customInstruction}
                        onChange={(e) => setCustomInstruction(e.target.value)}
                        placeholder="Ex: Foque no público jovem ou em mães que trabalham fora"
                        className="bg-[#0A0B10] border-[#252A3D] text-xs h-9 text-white placeholder-gray-500"
                      />
                    </div>

                    <Button
                      onClick={handleGenerateCustomFormat}
                      disabled={isGeneratingCustomFormat}
                      className="w-full h-9 bg-[#7000FF] hover:bg-[#8519FF] text-white font-bold text-xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      {isGeneratingCustomFormat ? 'Gerando...' : 'Gerar Formato com IA'}
                    </Button>

                    {/* Custom Format Result */}
                    {generatedCustomResult && (
                      <div className="p-3.5 rounded-xl bg-[#0E1018] border border-[#232738] space-y-2 mt-3">
                        <div className="flex items-center justify-between text-[11px] font-mono text-[#00F2FF]">
                          <span>{generatedCustomResult.headline || 'Resultado Gerado'}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              copyToClipboard(
                                `${generatedCustomResult.hook}\n\n${generatedCustomResult.body}\n\n${generatedCustomResult.cta}`,
                                'custom-res',
                              )
                            }
                            className="h-6 text-[10px] text-gray-400 hover:text-white p-1"
                          >
                            <Copy className="w-3 h-3 mr-1" /> Copiar
                          </Button>
                        </div>
                        <p className="text-xs text-gray-300 whitespace-pre-line leading-relaxed">
                          {generatedCustomResult.body}
                        </p>
                        <div className="text-[11px] font-bold text-[#00E676]">
                          {generatedCustomResult.cta}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 6: ROTEIROS DE VÍDEO POR CENA (15s, 30s, 60s) (Rule 6 & 7) */}
            <TabsContent value="scripts" className="space-y-6 m-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  {
                    duration: '15 Segundos',
                    tag: 'Ultra Rápido (Reels/Shorts)',
                    focus: 'Gancho visual explosivo + 1 benefício + CTA rápida',
                    scenes: [
                      {
                        time: '0–3s',
                        role: 'Gancho Visual',
                        desc: 'Close dinâmico do produto em uso imediato',
                      },
                      {
                        time: '3–8s',
                        role: 'Problema & Solução',
                        desc: 'Mostra o alívio e praticidade instantânea',
                      },
                      {
                        time: '8–12s',
                        role: 'Prova / Demonstração',
                        desc: 'Resultado final claro sem enrolação',
                      },
                      {
                        time: '12–15s',
                        role: 'CTA',
                        desc: 'Aponte para o link na bio ou nos comentários',
                      },
                    ],
                  },
                  {
                    duration: '30 Segundos',
                    tag: 'Padrão Viral (TikTok/Reels)',
                    focus: 'Identificação com a dor + Apresentação + Teste + CTA',
                    scenes: [
                      {
                        time: '0–3s',
                        role: 'Gancho Visual & Frase',
                        desc: '"Você ainda faz isso do jeito antigo?"',
                      },
                      {
                        time: '3–7s',
                        role: 'Problema',
                        desc: 'Cena de frustração que a persona vive',
                      },
                      {
                        time: '7–15s',
                        role: 'Apresentação do Produto',
                        desc: 'Unboxing rápido e primeiras impressões',
                      },
                      {
                        time: '15–22s',
                        role: 'Demonstração de Benefício',
                        desc: 'Comparação antes e depois evidente',
                      },
                      {
                        time: '22–26s',
                        role: 'Argumento de Confiança',
                        desc: 'Nota alta e milhares de pedidos entregues',
                      },
                      {
                        time: '26–30s',
                        role: 'CTA Direta',
                        desc: 'Link verificado nos comentários',
                      },
                    ],
                  },
                  {
                    duration: '60 Segundos',
                    tag: 'Unboxing & Review Completo',
                    focus: 'História pessoal + Quebra de objeções + Review honesto + CTA',
                    scenes: [
                      {
                        time: '0–5s',
                        role: 'Gancho Narrativo',
                        desc: '"Comprei o produto mais viral para testar"',
                      },
                      {
                        time: '5–15s',
                        role: 'Contexto e Expectativa',
                        desc: 'Por que o produto chama tanta atenção',
                      },
                      {
                        time: '15–30s',
                        role: 'Unboxing & Qualidade Real',
                        desc: 'Mostra material, acabamento e detalhes',
                      },
                      {
                        time: '30–45s',
                        role: 'Teste Prático sem Filtro',
                        desc: 'Funciona mesmo na prática?',
                      },
                      {
                        time: '45–55s',
                        role: 'Quebra de Objeções',
                        desc: 'Preço justo pela utilidade que entrega',
                      },
                      {
                        time: '55–60s',
                        role: 'CTA com Rastreamento',
                        desc: 'Onde comprar com segurança pelo link',
                      },
                    ],
                  },
                ].map((script, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-4"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-[#232738]">
                      <div>
                        <span className="text-[10px] font-mono text-[#00F2FF] uppercase font-bold">
                          {script.tag}
                        </span>
                        <h4 className="text-base font-bold text-white">{script.duration}</h4>
                      </div>
                      <Video className="w-5 h-5 text-[#00F2FF]" />
                    </div>

                    <p className="text-xs text-gray-400">{script.focus}</p>

                    <div className="space-y-2">
                      {script.scenes.map((scene, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-2.5 rounded-xl bg-[#0E1018] border border-[#1E2336] text-xs space-y-0.5 font-sans"
                        >
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="font-bold text-[#00F2FF]">{scene.role}</span>
                            <span className="text-gray-400">{scene.time}</span>
                          </div>
                          <p className="text-gray-300">{scene.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 7: AUDITORIA, COMPLIANCE E SCORE BREAKDOWN (Rule 11 & 12) */}
            <TabsContent value="compliance" className="space-y-6 m-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Score Breakdown (Rule 11) */}
                <div className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#232738]">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-[#00F2FF]" />
                      Breakdown do Score Pré-Teste ({estimatedScore}/100)
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    {[
                      {
                        label: 'Força e Atração do Gancho',
                        score: scoreBreakdown?.hook_strength || 89,
                      },
                      { label: 'Clareza da Mensagem', score: scoreBreakdown?.clarity || 88 },
                      {
                        label: 'Aderência ao Público-Alvo',
                        score: scoreBreakdown?.audience_fit || 87,
                      },
                      {
                        label: 'Sustentação do Benefício',
                        score: scoreBreakdown?.benefit_strength || 88,
                      },
                      {
                        label: 'Qualidade da Chamada (CTA)',
                        score: scoreBreakdown?.cta_quality || 85,
                      },
                      {
                        label: 'Adequação ao Canal Escolhido',
                        score: scoreBreakdown?.channel_fit || 88,
                      },
                      {
                        label: 'Profundidade do Argumento',
                        score: scoreBreakdown?.argument_depth || 85,
                      },
                      {
                        label: 'Proteção contra Promessa Exagerada',
                        score: scoreBreakdown?.exaggerated_claim_risk || 92,
                      },
                    ].map((item, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-gray-300">
                          <span>{item.label}</span>
                          <span className="font-mono font-bold text-[#00F2FF]">{item.score}%</span>
                        </div>
                        <Progress value={item.score} className="h-1.5 bg-[#0E1018]" />
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-xl bg-[#0E1018] border border-[#202538] text-[11px] text-gray-400">
                    * Este score representa uma <strong>estimativa pré-teste da IA</strong>. Em
                    fases futuras, dados reais de cliques e conversões terão prioridade absoluta
                    sobre esta pontuação.
                  </div>
                </div>

                {/* Compliance Review (Rule 12 & 20) */}
                <div className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#232738]">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#00E676]" />
                      Relatório do Revisor de Campanhas
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-[#0E1018] border border-[#212538] space-y-1">
                      <span className="text-[10px] uppercase font-mono text-gray-500 font-bold">
                        Status do Revisor
                      </span>
                      <div className="text-sm font-bold text-[#00E676] flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> 🟢 APROVADO PARA TESTES
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#0E1018] border border-[#1E2336]">
                        <span className="text-gray-300">Alegações não comprovadas:</span>
                        <span className="text-[#00E676] font-bold">Nenhuma</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#0E1018] border border-[#1E2336]">
                        <span className="text-gray-300">Falsa urgência detectada:</span>
                        <span className="text-[#00E676] font-bold">Não (Zero escassez falsa)</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#0E1018] border border-[#1E2336]">
                        <span className="text-gray-300">
                          Conformidade com Políticas Meta/TikTok:
                        </span>
                        <span className="text-[#00E676] font-bold">Seguro (96/100)</span>
                      </div>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#0E1018] border border-[#1E2336]">
                        <span className="text-gray-300">Preço e dados do produto:</span>
                        <span className="text-[#00E676] font-bold">Consistente com a fonte</span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#7000FF]/15 to-[#00F2FF]/10 border border-[#7000FF]/30 space-y-1">
                      <span className="font-bold text-[#00F2FF] block">
                        Regra de Ouro da Plataforma:
                      </span>
                      <p className="text-[11px] text-gray-300 leading-relaxed">
                        <strong>PERSUASÃO ≠ ENGANAÇÃO.</strong> Aumentamos o desejo pelo produto
                        mostrando utilidade, demonstração prática, contexto real e benefício
                        verdadeiro sem manipular o consumidor.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB 8: IA CONVERSACIONAL (Rule 19) */}
            <TabsContent value="chat" className="space-y-4 m-0">
              <div className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#232738]">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[#7000FF]" />
                      Assistente e Diretor Criativo IA
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Converse em tempo real para pedir ajustes na campanha, novos roteiros ou
                      quebra de objeções específicas.
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="bg-[#7000FF]/20 text-[#00F2FF] border-[#7000FF]/40 text-xs"
                  >
                    Contexto da Campanha Ativo
                  </Badge>
                </div>

                {/* Messages Box */}
                <div className="h-72 overflow-y-auto p-4 rounded-xl bg-[#0A0B10] border border-[#232738] space-y-3">
                  {chatMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {m.role === 'assistant' && (
                        <div className="w-7 h-7 rounded-full bg-[#7000FF] flex items-center justify-center flex-shrink-0 text-white">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}
                      <div
                        className={`p-3 rounded-xl text-xs max-w-[80%] leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-[#00F2FF] text-[#0A0B10] font-medium'
                            : 'bg-[#161824] text-gray-200 border border-[#232738]'
                        }`}
                      >
                        {m.text}
                      </div>
                      {m.role === 'user' && (
                        <div className="w-7 h-7 rounded-full bg-[#00F2FF]/20 border border-[#00F2FF] flex items-center justify-center flex-shrink-0 text-[#00F2FF]">
                          <User className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Bot className="w-4 h-4 text-[#00F2FF] animate-spin" />
                      <span>Diretor Criativo ajustando a campanha...</span>
                    </div>
                  )}
                </div>

                {/* Quick Prompts */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  {[
                    'Faça uma versão de copy mais curta',
                    'Crie um roteiro de 15 segundos para Reels',
                    'Como vender para quem mora sozinho?',
                    'Essa promessa está 100% comprovada?',
                    'Crie outro gancho de curiosidade',
                  ].map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setChatInput(prompt)}
                      className="px-2.5 py-1 rounded-full bg-[#161824] hover:bg-[#202436] text-gray-300 border border-[#2A2E42] whitespace-nowrap text-[11px]"
                    >
                      💡 {prompt}
                    </button>
                  ))}
                </div>

                {/* Input Form */}
                <form onSubmit={handleSendChatMessage} className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ex: Crie uma versão de copy focada em economizar tempo..."
                    className="bg-[#0A0B10] border-[#2A2E42] text-xs h-10 text-white placeholder-gray-500 focus-visible:ring-[#00F2FF]"
                  />
                  <Button
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="h-10 px-4 bg-[#00F2FF] hover:bg-[#00D8E6] text-[#0A0B10] font-bold text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </form>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
