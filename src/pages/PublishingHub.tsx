import React, { useState, useEffect } from 'react'
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Plus,
  RefreshCw,
  Copy,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Filter,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
  Globe,
  Radio,
  Share2,
  Calendar,
  AlertCircle,
  FileText,
  Smartphone,
  Eye,
  MousePointer,
  DollarSign,
  TrendingUp,
  Tag,
  Hash,
  Download,
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
import { campaignService } from '@/services/campaigns'
import { creativeService } from '@/services/creatives'
import { publishingService } from '@/services/publishing'
import type { CampaignRecord, CampaignVariation } from '@/types/campaign'
import type { CreativeRecord } from '@/types/creative'
import type {
  PublicationRecord,
  ChannelConnectionRecord,
  TrackingLinkRecord,
} from '@/types/publishing'

export default function PublishingHub() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [publications, setPublications] = useState<PublicationRecord[]>([])
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([])
  const [creatives, setCreatives] = useState<CreativeRecord[]>([])
  const [channels, setChannels] = useState<ChannelConnectionRecord[]>([])
  const [trackingLinks, setTrackingLinks] = useState<TrackingLinkRecord[]>([])

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [channelFilter, setChannelFilter] = useState<string>('all')

  // Modal State: New Publication Wizard
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('')
  const [selectedVariationId, setSelectedVariationId] = useState<string>('')
  const [selectedCreativeId, setSelectedCreativeId] = useState<string>('')
  const [selectedChannel, setSelectedChannel] = useState<string>('Telegram')
  const [publishMode, setPublishMode] = useState<'telegram_bot' | 'manual_tracked'>('telegram_bot')

  // Modal Step: 1 (Select Assets) -> 2 (Pre-Publish Checklist) -> 3 (Publish / Prepare Manual Bundle)
  const [publishStep, setPublishStep] = useState<number>(1)

  // Checklist states
  const [isRevalidating, setIsRevalidating] = useState(false)
  const [checklistReport, setChecklistReport] = useState<{
    can_publish: boolean
    items: Array<{ id: string; label: string; passed: boolean; critical: boolean; note: string }>
  } | null>(null)

  // Copy and CTA customizable before launch
  const [customCopy, setCustomCopy] = useState<string>('')
  const [customCta, setCustomCta] = useState<string>('Conferir Oferta')
  const [postUrl, setPostUrl] = useState<string>('')
  const [generatedTrackingUrl, setGeneratedTrackingUrl] = useState<string>('')
  const [generatedTrackingId, setGeneratedTrackingId] = useState<string>('')
  const [generatedSubId, setGeneratedSubId] = useState<string>('')
  const [shopeeSubIds, setShopeeSubIds] = useState<{
    sub_id_1: string
    sub_id_2: string
    sub_id_3: string
    sub_id_4: string
    sub_id_5: string
  } | null>(null)
  const [isGeneratingShopeeSubIds, setIsGeneratingShopeeSubIds] = useState(false)
  const [isPublishing, setIsPublishing] = useState<boolean>(false)

  // Telegram Quick Setup in Modal if disconnected
  const [telegramBotToken, setTelegramBotToken] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [isTestingTelegram, setIsTestingTelegram] = useState(false)

  // Load initial data
  const loadData = async () => {
    setLoading(true)
    try {
      const [pubsRes, campsRes, crtsRes, connsRes, linksRes] = await Promise.all([
        publishingService.getPublications('', '-created', 1, 50),
        campaignService.getCampaigns('', '-created', 1, 50),
        creativeService.getCreatives('', '-created', 1, 50),
        publishingService.getChannelConnections(),
        publishingService.getTrackingLinks('', '-created'),
      ])
      setPublications(pubsRes.items)
      setCampaigns(campsRes.items)
      setCreatives(crtsRes.items)
      setChannels(connsRes)
      setTrackingLinks(linksRes)
    } catch (err: any) {
      console.error('Error loading publishing hub data:', err)
      toast({
        title: 'Erro ao carregar Central de Publicação',
        description: err.message || 'Verifique sua conexão',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Find currently selected campaign
  const currentCampaign = campaigns.find((c) => c.id === selectedCampaignId)
  const currentVariation = currentCampaign?.variations?.find(
    (v) => v.id === selectedVariationId || v.version_letter === selectedVariationId,
  )
  const currentCreative = creatives.find((cr) => cr.id === selectedCreativeId)

  // Available creatives filtered by campaign
  const availableCreativesForCampaign = creatives.filter(
    (cr) => cr.campaign_id === selectedCampaignId || !cr.campaign_id,
  )

  const telegramConnection = channels.find(
    (ch) => ch.channel_type === 'telegram' && ch.is_connected,
  )

  // When campaign selection changes in wizard
  useEffect(() => {
    if (currentCampaign) {
      // Auto select first variation
      if (currentCampaign.variations && currentCampaign.variations.length > 0) {
        setSelectedVariationId(
          currentCampaign.variations[0].id || currentCampaign.variations[0].version_letter,
        )
      }
      // Auto select first creative
      const matchedCreative = creatives.find((cr) => cr.campaign_id === currentCampaign.id)
      if (matchedCreative) {
        setSelectedCreativeId(matchedCreative.id)
      }
    }
  }, [selectedCampaignId])

  // Sync copy and CTA when variation/creative changes
  useEffect(() => {
    if (currentVariation) {
      setCustomCopy(currentVariation.copy_text || currentVariation.hook_text || '')
      setCustomCta(currentVariation.cta_text || 'Conferir Oferta')
    } else if (currentCampaign) {
      setCustomCopy(currentCampaign.campaign_name || '')
    }
  }, [selectedVariationId, currentCampaign])

  const handlePrepareShopeeSubIds = async () => {
    if (!currentCampaign) {
      toast({
        title: 'Selecione uma campanha',
        description: 'Escolha a campanha antes de gerar os Sub_ids da Shopee.',
        variant: 'destructive',
      })
      return
    }

    setIsGeneratingShopeeSubIds(true)
    try {
      const res = await publishingService.prepareShopeeSubIds({
        campaign_id: currentCampaign.id,
        creative_id: selectedCreativeId,
        product_id: currentCampaign.product_id,
        product_title: currentCampaign.product_title,
        channel: selectedChannel,
        version_letter: currentVariation?.version_letter || 'A',
      })
      setShopeeSubIds(res.sub_ids)
      toast({
        title: 'Shopee Sub_id 1–5 preparados',
        description: 'Copie os cinco valores para o modo Avançado da Shopee antes de gerar o link.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar Sub_ids da Shopee',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingShopeeSubIds(false)
    }
  }

  // Run Pre-Publish Checklist
  const handleRunChecklist = async () => {
    if (!currentCampaign) return
    setIsRevalidating(true)

    const isCampaignApproved =
      currentCampaign.status === 'approved' ||
      currentCampaign.status === 'in_review' ||
      currentCampaign.status === 'published'

    const hasAffiliate = Boolean(
      currentCampaign.affiliate_url && currentCampaign.affiliate_url.length > 5,
    )

    const isCreativeApproved =
      !currentCreative ||
      currentCreative.status === 'approved' ||
      currentCreative.status === 'ready_to_publish' ||
      currentCreative.review_status === 'approved'

    const hasChannel = Boolean(selectedChannel)
    const isPriceValid = (currentCampaign.price_at_creation || 0) > 0

    // Auto generate or retrieve tracking link
    try {
      const isShopeeCampaign =
        /shopee/i.test(currentCampaign.platform || '') ||
        /shopee/i.test(currentCampaign.affiliate_url || '') ||
        /shopee/i.test(currentCampaign.product_url || '')

      const trackRes = await publishingService.createOrGetTrackingLink({
        campaign_id: currentCampaign.id,
        variation_id: selectedVariationId,
        creative_id: selectedCreativeId,
        product_id: currentCampaign.product_id,
        channel: selectedChannel,
        destination_url:
          currentCampaign.affiliate_url || currentCampaign.product_url || 'https://shopee.com.br',
        version_letter: currentVariation?.version_letter || 'A',
        title: `Publicação ${selectedChannel} - ${currentCampaign.product_title.slice(0, 25)}`,
        marketplace: isShopeeCampaign ? 'Shopee' : undefined,
        shopee_sub_ids: isShopeeCampaign && shopeeSubIds ? shopeeSubIds : undefined,
      })

      setGeneratedTrackingUrl(trackRes.short_url)
      setGeneratedTrackingId(trackRes.tracking_link_id)
      setGeneratedSubId(trackRes.sub_id)
    } catch (trackErr: any) {
      console.error('Tracking link generation failed:', trackErr)
    }

    const items = [
      {
        id: 'camp_approved',
        label: 'Campanha Aprovada na Auditoria',
        passed: isCampaignApproved,
        critical: true,
        note: isCampaignApproved
          ? 'Estratégia e copy aprovadas sem falsas promessas.'
          : 'A campanha precisa estar no status Aprovada.',
      },
      {
        id: 'creative_approved',
        label: 'Criativo Validado e Sem Distorção',
        passed: isCreativeApproved,
        critical: false,
        note: isCreativeApproved
          ? 'Criativo inspecionado com fidelidade visual aprovada.'
          : 'Criativo com revisão pendente. Recomendado revisar antes de publicar.',
      },
      {
        id: 'affiliate_link',
        label: 'Link de Afiliado Configurado',
        passed: hasAffiliate,
        critical: true,
        note: hasAffiliate
          ? 'Link de comissão verificado e pronto para atribuição.'
          : 'CRÍTICO: Insira o link de afiliado da sua plataforma para receber comissão.',
      },
      {
        id: 'channel_selected',
        label: 'Canal de Destino Selecionado',
        passed: hasChannel,
        critical: true,
        note: `Canal selecionado: ${selectedChannel}`,
      },
      {
        id: 'price_updated',
        label: 'Preço Comercial Verificado',
        passed: isPriceValid,
        critical: false,
        note: `Preço base: R$ ${(currentCampaign.price_at_creation || 0).toFixed(2)}`,
      },
    ]

    const criticalPassed = items.filter((i) => i.critical).every((i) => i.passed)
    setChecklistReport({
      can_publish: criticalPassed,
      items,
    })
    setIsRevalidating(false)
    setPublishStep(2)
  }

  // Handle Telegram connection test & save directly in modal
  const handleConnectTelegram = async () => {
    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      toast({
        title: 'Campos incompletos',
        description: 'Informe o Bot Token e Chat ID do Telegram',
        variant: 'destructive',
      })
      return
    }

    setIsTestingTelegram(true)
    try {
      const testRes = await publishingService.testTelegramConnection(
        telegramBotToken,
        telegramChatId,
      )
      await publishingService.saveTelegramConnection(
        telegramBotToken,
        telegramChatId,
        testRes.bot_username,
        'Canal Telegram Oficial',
      )

      toast({
        title: '🟢 Telegram Conectado com Sucesso!',
        description: `Bot ${testRes.bot_username} verificado com permissão de envio.`,
      })

      // Reload channels
      const conns = await publishingService.getChannelConnections()
      setChannels(conns)
    } catch (err: any) {
      toast({
        title: 'Erro ao conectar Telegram',
        description: err.message || 'Verifique o Bot Token e o Chat ID',
        variant: 'destructive',
      })
    } finally {
      setIsTestingTelegram(false)
    }
  }

  // Execute Real Publish to Telegram
  const handleExecuteTelegramPublish = async () => {
    if (!currentCampaign) return
    setIsPublishing(true)

    try {
      const payload = {
        campaign_id: currentCampaign.id,
        variation_id: selectedVariationId,
        creative_id: selectedCreativeId,
        product_id: currentCampaign.product_id,
        image_url: currentCreative?.image_url || currentCampaign.product_image || '',
        copy_text: customCopy,
        cta_text: customCta,
        tracking_url: generatedTrackingUrl,
        destination_url: currentCampaign.affiliate_url,
        price: currentCampaign.price_at_creation,
        promo_price: currentCampaign.promo_price_at_creation,
      }

      const res = await publishingService.publishToTelegram(payload)

      toast({
        title: '🚀 Publicado no Telegram com Sucesso!',
        description: 'Mensagem enviada com link de rastreamento e botão CTA.',
      })

      setIsPublishModalOpen(false)
      setPublishStep(1)
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Falha na publicação do Telegram',
        description: err.message || 'Verifique as permissões do bot no canal',
        variant: 'destructive',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  // Execute Manual Publication Mark
  const handleMarkManualComplete = async () => {
    if (!currentCampaign) return
    setIsPublishing(true)

    try {
      await publishingService.markManualPublication({
        campaign_id: currentCampaign.id,
        variation_id: selectedVariationId,
        creative_id: selectedCreativeId,
        product_id: currentCampaign.product_id,
        channel: selectedChannel,
        channel_type: selectedChannel.toLowerCase(),
        post_url: postUrl,
        copy_used: customCopy,
        cta_used: customCta,
        creative_image_url: currentCreative?.image_url || currentCampaign.product_image || '',
        tracking_url: generatedTrackingUrl,
        tracking_link_id: generatedTrackingId,
        price_at_publish: currentCampaign.price_at_creation,
        checklist_snapshot: checklistReport || {},
      })

      toast({
        title: '✅ Publicação Manual Registrada!',
        description: `Cliques e conversões serão atribuídos ao identificador ${generatedSubId}.`,
      })

      setIsPublishModalOpen(false)
      setPublishStep(1)
      setPostUrl('')
      await loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar publicação manual',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsPublishing(false)
    }
  }

  // Filtered publications
  const filteredPublications = publications.filter((pub) => {
    if (statusFilter !== 'all' && pub.status !== statusFilter) return false
    if (channelFilter !== 'all' && pub.channel !== channelFilter) return false
    return true
  })

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E2232] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#7000FF]/20 text-[#00F2FF] border border-[#7000FF]/40 rounded">
              FASE 5 — FECHANDO O CICLO
            </span>
            <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
              Rastreamento & Conversão
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-[#00F2FF]" />
            Central de Publicação
          </h1>
          <p className="text-xs text-gray-400 mt-1 max-w-2xl">
            Gerencie o ciclo completo de veiculação: valide o checklist comercial, publique no{' '}
            <strong className="text-[#00F2FF]">Telegram via API Oficial</strong> ou prepare pacotes
            para <strong className="text-gray-200">Publicação Manual com Rastreamento UTM</strong>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            disabled={loading}
            className="h-9 border-[#262B3F] bg-[#141724] text-gray-300 hover:text-white text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            onClick={() => {
              if (campaigns.length === 0) {
                toast({
                  title: 'Nenhuma campanha disponível',
                  description: 'Crie ou aprove uma campanha no Laboratório antes de publicar.',
                })
                return
              }
              setSelectedCampaignId(campaigns[0]?.id || '')
              setPublishStep(1)
              setIsPublishModalOpen(true)
            }}
            size="sm"
            className="h-9 px-4 bg-gradient-to-r from-[#00F2FF] to-[#7000FF] hover:opacity-90 text-[#0A0B10] font-bold text-xs gap-2 shadow-[0_0_20px_rgba(0,242,255,0.3)]"
          >
            <Send className="w-4 h-4" />
            Nova Publicação
          </Button>
        </div>
      </div>

      {/* Connected Channels Architecture Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Telegram Channel Connection Card */}
        <div className="p-4 rounded-xl bg-[#11131C] border border-[#232738] relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#229ED9]/20 border border-[#229ED9]/40 flex items-center justify-center text-[#229ED9]">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  Telegram Bot API
                  {telegramConnection ? (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 font-bold">
                      🟢 CONECTADO
                    </span>
                  ) : (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-gray-700/50 text-gray-400 border border-gray-600">
                      ⚪ NÃO CONECTADO
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400">
                  {telegramConnection
                    ? telegramConnection.credentials_masked?.bot_username || 'Bot configurado'
                    : 'Canal oficial com envio automático'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1C2030] flex items-center justify-between text-[11px]">
            <span className="text-gray-400">
              Modo:{' '}
              <strong className="text-white">
                {telegramConnection ? 'Automático Direto' : 'Requer Configuração'}
              </strong>
            </span>
            <Button
              onClick={() => {
                setSelectedChannel('Telegram')
                setPublishMode('telegram_bot')
                setIsPublishModalOpen(true)
                setPublishStep(1)
              }}
              size="sm"
              variant="outline"
              className="h-7 text-[10px] border-[#2A3047] bg-[#161926] hover:bg-[#202538] text-[#00F2FF]"
            >
              {telegramConnection ? 'Publicar Agora' : 'Configurar Bot'}
            </Button>
          </div>
        </div>

        {/* Manual Tracked Channels Card */}
        <div className="p-4 rounded-xl bg-[#11131C] border border-[#232738] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E1306C]/20 border border-[#E1306C]/40 flex items-center justify-center text-[#E1306C]">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  Redes Sociais & Mensageiros
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40 font-bold">
                    🟢 RASTREADO
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">
                  Instagram, TikTok, YouTube Shorts, WhatsApp, Pinterest
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1C2030] flex items-center justify-between text-[11px]">
            <span className="text-gray-400">
              Modo: <strong className="text-white">Publicação Manual com Link UTM</strong>
            </span>
            <span className="text-[10px] font-mono text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded">
              SubID Ativo
            </span>
          </div>
        </div>

        {/* Anti-Bot & Tracking Engine Card */}
        <div className="p-4 rounded-xl bg-[#11131C] border border-[#232738] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00E676]/20 border border-[#00E676]/40 flex items-center justify-center text-[#00E676]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  Motor Anti-Bot & Deduplicação
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#00E676]/20 text-[#00E676] border border-[#00E676]/40 font-bold">
                    ATIVO
                  </span>
                </div>
                <div className="text-[11px] text-gray-400">
                  Filtro de crawlers, spiders e previews sociais
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1C2030] flex items-center justify-between text-[11px]">
            <span className="text-gray-400">
              Links Rastreáveis Criados:{' '}
              <strong className="text-[#00F2FF] font-mono">{trackingLinks.length}</strong>
            </span>
            <span className="text-[10px] font-mono text-gray-400">302 Fast Redirect</span>
          </div>
        </div>
      </div>

      {/* Publications Table with Filters */}
      <div className="p-5 rounded-2xl bg-[#11131C] border border-[#1E2232] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00F2FF]" />
              Histórico de Publicações ({filteredPublications.length})
            </h2>
            <p className="text-xs text-gray-400">
              Campanhas ativas veiculadas nos canais com métricas de cliques e conversão em tempo
              real.
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-36 text-xs bg-[#161824] border-[#2A2E44] text-gray-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#161824] border-[#2A2E44] text-white">
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="published">🟢 Publicado</SelectItem>
                <SelectItem value="ready_to_publish">🟡 Pronto</SelectItem>
                <SelectItem value="paused">⏸️ Pausado</SelectItem>
                <SelectItem value="failed">🔴 Erro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="h-8 w-36 text-xs bg-[#161824] border-[#2A2E44] text-gray-300">
                <SelectValue placeholder="Canal" />
              </SelectTrigger>
              <SelectContent className="bg-[#161824] border-[#2A2E44] text-white">
                <SelectItem value="all">Todos Canais</SelectItem>
                <SelectItem value="Telegram">Telegram</SelectItem>
                <SelectItem value="Instagram">Instagram</SelectItem>
                <SelectItem value="TikTok">TikTok</SelectItem>
                <SelectItem value="YouTube">YouTube</SelectItem>
                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="w-7 h-7 border-2 border-[#00F2FF] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span className="text-xs">Carregando histórico de publicações...</span>
          </div>
        ) : filteredPublications.length === 0 ? (
          <div className="py-16 text-center bg-[#0D0F17] rounded-xl border border-[#1B1E2C] p-8 space-y-3">
            <Radio className="w-10 h-10 text-gray-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">Nenhuma publicação registrada</h3>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              Selecione uma campanha aprovada e clique em "Nova Publicação" para veicular no
              Telegram ou preparar o link rastreado para redes sociais.
            </p>
            <Button
              onClick={() => {
                if (campaigns.length === 0) {
                  toast({
                    title: 'Primeiro crie uma campanha',
                    description:
                      'Você ainda não tem campanhas disponíveis. Vou abrir o Laboratório de Campanhas para criar a primeira.',
                  })
                  window.location.href = '/laboratorio'
                  return
                }
                setSelectedCampaignId(campaigns[0].id)
                setPublishStep(1)
                setIsPublishModalOpen(true)
              }}
              size="sm"
              className="bg-[#00F2FF] hover:bg-[#00D0DC] text-[#0A0B10] font-bold text-xs"
            >
              Criar Primeira Publicação
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-[#151824] text-gray-400 font-mono text-[11px] uppercase border-b border-[#22273A]">
                <tr>
                  <th className="py-3 px-4">Campanha & Produto</th>
                  <th className="py-3 px-3">Canal / Modo</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Link de Tracking</th>
                  <th className="py-3 px-3 text-center">Cliques (Válidos / Brutos)</th>
                  <th className="py-3 px-3 text-right">Data</th>
                  <th className="py-3 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1D2132]">
                {filteredPublications.map((pub) => {
                  const matchedCamp = campaigns.find((c) => c.id === pub.campaign_id)
                  return (
                    <tr key={pub.id} className="hover:bg-[#151824]/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              pub.creative_image_url ||
                              matchedCamp?.product_image ||
                              'https://img.usecurling.com/p/80/80?q=product'
                            }
                            alt="thumb"
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-[#232738]"
                          />
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate max-w-xs">
                              {matchedCamp?.product_title || 'Campanha Afiliada'}
                            </div>
                            <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
                              <span>{matchedCamp?.platform || 'Afiliados'}</span>
                              <span>•</span>
                              <span className="font-mono text-[#00F2FF]">
                                Var {pub.variation_id ? pub.variation_id.slice(-1) : 'A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            {pub.channel}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400">
                            {pub.publication_mode === 'telegram_bot'
                              ? '🤖 Bot API Oficial'
                              : '📱 Manual Rastreado'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border inline-flex items-center gap-1 w-fit ${
                              pub.status === 'published'
                                ? 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30'
                                : pub.status === 'ready_to_publish'
                                  ? 'bg-[#00F2FF]/15 text-[#00F2FF] border-[#00F2FF]/30'
                                  : 'bg-gray-700/30 text-gray-400 border-gray-600'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-current" />
                            {pub.status.toUpperCase()}
                          </span>
                          {matchedCamp?.is_test_data && (
                            <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] font-mono w-fit">
                              DADO DE TESTE
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        {pub.tracking_full_url ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] text-[#00F2FF] truncate max-w-[140px]">
                              {pub.tracking_full_url.replace('https://', '')}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(pub.tracking_full_url || '')
                                toast({ title: 'Link copiado para a área de transferência!' })
                              }}
                              className="p-1 rounded hover:bg-[#202538] text-gray-400 hover:text-white"
                              title="Copiar Link"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-[10px]">Sem tracking direto</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center gap-1 font-mono">
                          <span className="font-bold text-[#00E676]">
                            {pub.valid_clicks_count || 0}
                          </span>
                          <span className="text-gray-500">/</span>
                          <span className="text-gray-400">{pub.raw_clicks_count || 0}</span>
                        </div>
                        <div className="text-[9px] text-gray-500 font-mono">🟢 Válidos / Total</div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono text-[11px] text-gray-400">
                        {pub.published_at ? pub.published_at.slice(0, 10) : '—'}
                      </td>

                      <td className="py-3 px-3 text-right">
                        {pub.external_post_url ? (
                          <a
                            href={pub.external_post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-[#00F2FF] hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Ver Post
                          </a>
                        ) : (
                          <span className="text-gray-500 text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PUBLICATION WIZARD MODAL */}
      <Dialog open={isPublishModalOpen} onOpenChange={setIsPublishModalOpen}>
        <DialogContent className="max-w-3xl bg-[#0E1017] border-[#22273B] text-white p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40 rounded">
                PASSO {publishStep} DE 3
              </span>
              <span className="text-xs text-gray-400 font-mono">
                {publishStep === 1
                  ? 'Seleção de Campanha & Canal'
                  : publishStep === 2
                    ? 'Checklist Pré-Publicação'
                    : 'Execução & Rastreamento'}
              </span>
            </div>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-[#00F2FF]" />
              {publishStep === 1
                ? 'Preparar Publicação'
                : publishStep === 2
                  ? 'Validação de Conformidade & Checklist'
                  : selectedChannel === 'Telegram'
                    ? 'Disparar Publicação no Telegram'
                    : 'Pacote de Publicação Manual Rastreado'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Conecte a estratégia aprovada ao canal de veiculação com garantia de rastreamento de
              comissão.
            </DialogDescription>
          </DialogHeader>

          {/* STEP 1: ASSET & CHANNEL SELECTION */}
          {publishStep === 1 && (
            <div className="space-y-4 py-2">
              {/* Campaign Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300">Campanha Aprovada</label>
                <Select value={selectedCampaignId} onValueChange={setSelectedCampaignId}>
                  <SelectTrigger className="bg-[#141724] border-[#252A3F] text-white text-xs">
                    <SelectValue placeholder="Selecione uma campanha..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#141724] border-[#252A3F] text-white max-h-60">
                    {campaigns.map((camp) => (
                      <SelectItem key={camp.id} value={camp.id}>
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              camp.status === 'approved' || camp.status === 'published'
                                ? 'bg-[#00E676]'
                                : 'bg-yellow-400'
                            }`}
                          />
                          <span className="font-bold">{camp.campaign_name}</span>
                          <span className="text-gray-400 font-mono text-[10px]">
                            ({camp.platform})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {currentCampaign && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Variation Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300">
                      Variação de Copy & Gancho (A/B/C)
                    </label>
                    <Select value={selectedVariationId} onValueChange={setSelectedVariationId}>
                      <SelectTrigger className="bg-[#141724] border-[#252A3F] text-white text-xs">
                        <SelectValue placeholder="Selecione a variação..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141724] border-[#252A3F] text-white">
                        {currentCampaign.variations?.map((v) => (
                          <SelectItem
                            key={v.id || v.version_letter}
                            value={v.id || v.version_letter}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[#00F2FF]">
                                Variação {v.version_letter}
                              </span>
                              <span className="text-xs text-gray-300 truncate max-w-[200px]">
                                {v.hypothesis_name}
                              </span>
                            </div>
                          </SelectItem>
                        )) || <SelectItem value="A">Variação A (Padrão)</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Creative Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-300">
                      Criativo Visual (Estúdio)
                    </label>
                    <Select value={selectedCreativeId} onValueChange={setSelectedCreativeId}>
                      <SelectTrigger className="bg-[#141724] border-[#252A3F] text-white text-xs">
                        <SelectValue placeholder="Selecione o criativo..." />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141724] border-[#252A3F] text-white">
                        {availableCreativesForCampaign.map((cr) => (
                          <SelectItem key={cr.id} value={cr.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-[#7000FF] font-bold">
                                {cr.aspect_ratio || '1:1'}
                              </span>
                              <span className="text-xs truncate max-w-[180px]">{cr.title}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Channel Selector */}
              <div className="space-y-2 pt-2 border-t border-[#1C2030]">
                <label className="text-xs font-bold text-gray-300">Canal de Publicação</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    {
                      id: 'Telegram',
                      label: 'Telegram Bot',
                      type: 'telegram_bot',
                      icon: Send,
                      badge: telegramConnection ? '🟢 Conectado' : '⚡ Configurar',
                    },
                    {
                      id: 'Instagram',
                      label: 'Instagram',
                      type: 'manual_tracked',
                      icon: Smartphone,
                      badge: 'Manual UTM',
                    },
                    {
                      id: 'TikTok',
                      label: 'TikTok',
                      type: 'manual_tracked',
                      icon: Radio,
                      badge: 'Manual UTM',
                    },
                    {
                      id: 'WhatsApp',
                      label: 'WhatsApp',
                      type: 'manual_tracked',
                      icon: Globe,
                      badge: 'Manual UTM',
                    },
                  ].map((ch) => {
                    const Icon = ch.icon
                    const isSelected = selectedChannel === ch.id
                    return (
                      <div
                        key={ch.id}
                        onClick={() => {
                          setSelectedChannel(ch.id)
                          setPublishMode(ch.type as any)
                        }}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#00F2FF]/10 border-[#00F2FF] shadow-[0_0_15px_rgba(0,242,255,0.15)]'
                            : 'bg-[#141724] border-[#23273B] hover:border-[#353C58]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Icon
                            className={`w-4 h-4 ${isSelected ? 'text-[#00F2FF]' : 'text-gray-400'}`}
                          />
                          <span className="text-[9px] font-mono text-gray-400">{ch.badge}</span>
                        </div>
                        <div className="text-xs font-bold text-white">{ch.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {currentCampaign && (
                <div className="p-4 rounded-xl bg-[#1A1208] border border-[#EE4D2D]/40 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-[#FF765B] flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Shopee — Sub_id Avançado 1–5
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">
                        Gere estes códigos antes de clicar em “Adicionar ao Link” na Shopee. O
                        Sub_id 5 é a chave principal de atribuição da venda no Radar.
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handlePrepareShopeeSubIds}
                      disabled={isGeneratingShopeeSubIds}
                      size="sm"
                      className="h-8 bg-[#EE4D2D] hover:bg-[#D93F24] text-white text-xs font-bold"
                    >
                      {isGeneratingShopeeSubIds ? 'Gerando...' : 'Gerar Sub_ids'}
                    </Button>
                  </div>

                  {shopeeSubIds && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        ['Sub_id 1 · Produto', shopeeSubIds.sub_id_1],
                        ['Sub_id 2 · Canal', shopeeSubIds.sub_id_2],
                        ['Sub_id 3 · Campanha', shopeeSubIds.sub_id_3],
                        ['Sub_id 4 · Variação/Criativo', shopeeSubIds.sub_id_4],
                        ['Sub_id 5 · Tracking único', shopeeSubIds.sub_id_5],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-lg border border-[#3A2A22] bg-[#0E1017] p-2"
                        >
                          <div className="text-[9px] uppercase font-mono text-gray-500">
                            {label}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-[11px] text-white flex-1 truncate">{value}</code>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(value)
                                toast({ title: `${label} copiado` })
                              }}
                              className="text-[#FF765B] hover:text-white"
                              aria-label={`Copiar ${label}`}
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-[10px] text-amber-200/80">
                    Use apenas letras e números. Depois gere o link afiliado na Shopee e salve esse
                    link na campanha; o Radar não altera o link Shopee ao redirecionar.
                  </div>
                </div>
              )}

              {/* Quick Telegram Bot Connector if not connected and selected */}
              {selectedChannel === 'Telegram' && !telegramConnection && (
                <div className="p-4 rounded-xl bg-[#131726] border border-[#2B3552] space-y-3 mt-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#00F2FF]">
                    <Zap className="w-4 h-4" />
                    Conectar Bot do Telegram (API Oficial)
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Crie um bot com o <code>@BotFather</code> no Telegram e adicione-o como
                    administrador no seu canal ou grupo.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      type="password"
                      value={telegramBotToken}
                      onChange={(e) => setTelegramBotToken(e.target.value)}
                      placeholder="Bot Token (ex: 712345678:AA...)"
                      className="bg-[#0E1017] border-[#2A314A] text-xs"
                    />
                    <Input
                      type="text"
                      value={telegramChatId}
                      onChange={(e) => setTelegramChatId(e.target.value)}
                      placeholder="Chat ID do Canal (ex: -100123456789 ou @canal)"
                      className="bg-[#0E1017] border-[#2A314A] text-xs"
                    />
                  </div>
                  <Button
                    onClick={handleConnectTelegram}
                    disabled={isTestingTelegram}
                    size="sm"
                    className="w-full bg-[#229ED9] hover:bg-[#1E8CC0] text-white text-xs font-bold"
                  >
                    {isTestingTelegram ? 'Verificando com Telegram...' : 'Testar & Salvar Conexão'}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PRE-PUBLISH CHECKLIST */}
          {publishStep === 2 && checklistReport && (
            <div className="space-y-4 py-2">
              <div
                className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                  checklistReport.can_publish
                    ? 'bg-[#00E676]/10 border-[#00E676]/30 text-[#00E676]'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {checklistReport.can_publish ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                )}
                <div>
                  <div className="text-xs font-bold text-white">
                    {checklistReport.can_publish
                      ? 'Campanha Pronta para Publicação!'
                      : 'Ajustes Críticos Necessários Antes de Publicar'}
                  </div>
                  <div className="text-[11px] text-gray-300">
                    {checklistReport.can_publish
                      ? 'Todos os itens essenciais de rastreamento e conformidade foram aprovados.'
                      : 'Corrija os itens destacados abaixo para habilitar a veiculação.'}
                  </div>
                </div>
              </div>

              {/* Checklist items list */}
              <div className="space-y-2">
                {checklistReport.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-[#141724] border border-[#23273B] flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      {item.passed ? (
                        <div className="w-5 h-5 rounded-full bg-[#00E676]/20 text-[#00E676] flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          {item.label}
                          {item.critical && (
                            <span className="text-[9px] font-mono text-red-400 bg-red-500/10 px-1 rounded">
                              Obrigatório
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400">{item.note}</div>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        item.passed
                          ? 'bg-[#00E676]/15 text-[#00E676]'
                          : 'bg-red-500/15 text-red-400'
                      }`}
                    >
                      {item.passed ? 'OK' : 'PENDENTE'}
                    </span>
                  </div>
                ))}
              </div>

              {/* Generated Tracking Link Box */}
              {generatedTrackingUrl && (
                <div className="p-3.5 rounded-xl bg-[#0B131E] border border-[#19324C] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-[#00F2FF] uppercase font-bold flex items-center gap-1.5">
                      <LinkIcon className="w-3 h-3" />
                      Link Rastreado Determinado (SubID Ativo)
                    </span>
                    <span className="text-[10px] font-mono text-gray-400">
                      SubID: {generatedSubId}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-[#0E1017] p-2 rounded-lg border border-[#1C253B]">
                    <span className="font-mono text-xs text-white truncate flex-1">
                      {generatedTrackingUrl}
                    </span>
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedTrackingUrl)
                        toast({ title: 'Link rastreável copiado!' })
                      }}
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-[#2B3552] bg-[#141724] text-[#00F2FF]"
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: EXECUTION / MANUAL BUNDLE */}
          {publishStep === 3 && (
            <div className="space-y-4 py-2">
              {selectedChannel === 'Telegram' ? (
                /* Telegram Dispatch Review */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#131622] border border-[#242A3E] space-y-2">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-[#229ED9]" />
                      Mensagem que será enviada para o Telegram
                    </div>
                    <Textarea
                      value={customCopy}
                      onChange={(e) => setCustomCopy(e.target.value)}
                      rows={5}
                      className="bg-[#0E1017] border-[#252A3F] text-xs font-sans text-gray-200"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Texto do Botão CTA:</span>
                      <Input
                        value={customCta}
                        onChange={(e) => setCustomCta(e.target.value)}
                        className="h-8 max-w-[200px] bg-[#0E1017] border-[#252A3F] text-xs"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* Manual Package Delivery */
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#131622] border border-[#242A3E] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Copy className="w-4 h-4 text-[#00F2FF]" />
                        Legenda & Copy Pronta para Colar ({selectedChannel})
                      </span>
                      <Button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${customCopy}\n\n👉 Acesse aqui: ${generatedTrackingUrl}`,
                          )
                          toast({ title: 'Copy com link copiada para a área de transferência!' })
                        }}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-[#2C334D] text-[#00F2FF]"
                      >
                        Copiar Tudo
                      </Button>
                    </div>

                    <Textarea
                      value={customCopy}
                      onChange={(e) => setCustomCopy(e.target.value)}
                      rows={4}
                      className="bg-[#0E1017] border-[#252A3F] text-xs font-sans text-gray-200"
                    />

                    {/* Creative image preview */}
                    {currentCreative?.image_url && (
                      <div className="flex items-center gap-3 p-2 bg-[#0E1017] rounded-lg border border-[#1E2335]">
                        <img
                          src={currentCreative.image_url}
                          alt="preview"
                          className="w-12 h-12 object-cover rounded"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">
                            {currentCreative.title}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {currentCreative.aspect_ratio || '1:1'} • Imagem em Alta Resolução
                          </div>
                        </div>
                        <a
                          href={currentCreative.image_url}
                          target="_blank"
                          rel="noreferrer"
                          download
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-[#2B324B]"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </Button>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Mark as published input */}
                  <div className="p-3.5 rounded-xl bg-[#101420] border border-[#1E2538] space-y-2">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
                      URL do Post Publicado (Opcional)
                    </label>
                    <Input
                      type="url"
                      value={postUrl}
                      onChange={(e) => setPostUrl(e.target.value)}
                      placeholder="https://instagram.com/p/... ou https://tiktok.com/@..."
                      className="bg-[#0E1017] border-[#252A3F] text-xs text-white"
                    />
                    <p className="text-[10px] text-gray-400">
                      Cole a URL para registrar a auditoria e vincular métricas futuras.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t border-[#1E2232] pt-4 flex items-center justify-between gap-2">
            {publishStep > 1 ? (
              <Button
                onClick={() => setPublishStep(publishStep - 1)}
                variant="outline"
                size="sm"
                className="border-[#262B3F] bg-[#141724] text-xs"
              >
                Voltar
              </Button>
            ) : (
              <Button
                onClick={() => setIsPublishModalOpen(false)}
                variant="outline"
                size="sm"
                className="border-[#262B3F] bg-[#141724] text-xs"
              >
                Cancelar
              </Button>
            )}

            {publishStep === 1 && (
              <Button
                onClick={handleRunChecklist}
                disabled={!currentCampaign || isRevalidating}
                size="sm"
                className="bg-gradient-to-r from-[#00F2FF] to-[#7000FF] text-[#0A0B10] font-bold text-xs gap-1.5"
              >
                {isRevalidating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Validando Checklist...
                  </>
                ) : (
                  <>
                    Verificar Checklist
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}

            {publishStep === 2 && (
              <Button
                onClick={() => setPublishStep(3)}
                disabled={!checklistReport?.can_publish}
                size="sm"
                className="bg-gradient-to-r from-[#00F2FF] to-[#7000FF] text-[#0A0B10] font-bold text-xs gap-1.5"
              >
                Avançar para Publicação
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}

            {publishStep === 3 &&
              (selectedChannel === 'Telegram' ? (
                <Button
                  onClick={handleExecuteTelegramPublish}
                  disabled={isPublishing || !telegramConnection}
                  size="sm"
                  className="bg-[#229ED9] hover:bg-[#1C88BD] text-white font-bold text-xs gap-1.5"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Disparando no Telegram...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Publicar no Canal Oficial
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleMarkManualComplete}
                  disabled={isPublishing}
                  size="sm"
                  className="bg-[#00E676] hover:bg-[#00C864] text-[#0A0B10] font-bold text-xs gap-1.5"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Confirmar e Marcar como Publicado
                    </>
                  )}
                </Button>
              ))}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
