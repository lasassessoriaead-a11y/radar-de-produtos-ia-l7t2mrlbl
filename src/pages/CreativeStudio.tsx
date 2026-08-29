import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import {
  Sparkles,
  Layers,
  Palette,
  Image as ImageIcon,
  Video,
  ShieldCheck,
  Download,
  Copy,
  Plus,
  RefreshCw,
  FolderArchive,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  ExternalLink,
  ChevronRight,
  Info,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScoreRing } from '@/components/ScoreRing'
import { BrandKitModal } from '@/components/BrandKitModal'
import { VisualCanvasEditor } from '@/components/VisualCanvasEditor'
import { VideoStoryboardTab } from '@/components/VideoStoryboardTab'
import { CreativeAuditor } from '@/components/CreativeAuditor'
import { CreativeLibraryAndVersions } from '@/components/CreativeLibraryAndVersions'
import { creativeService } from '@/services/creatives'
import { campaignService } from '@/services/campaigns'
import { productsService } from '@/services/products'
import type {
  CreativeRecord,
  CreativeFormatType,
  CreativeHypothesisType,
  CreativeTextLayers,
  BrandKitRecord,
  VisualConcept,
  StoryboardScene,
  CreativeReviewReport,
  CommercialValidation,
  ProviderStatusResponse,
  CreativeVersionRecord,
  CreativeAssetRecord,
} from '@/types/creative'
import { CREATIVE_FORMAT_SPECS } from '@/types/creative'
import type { CampaignRecord, CampaignVariation } from '@/types/campaign'
import type { ProductRecord } from '@/types/product'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function CreativeStudioPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Query parameters
  const campaignIdParam = searchParams.get('campaignId')
  const variationParam = (searchParams.get('variation') || 'A') as 'A' | 'B' | 'C'
  const creativeIdParam = searchParams.get('creativeId')

  // Loaded Source Data
  const [campaign, setCampaign] = useState<CampaignRecord | null>(null)
  const [variation, setVariation] = useState<CampaignVariation | null>(null)
  const [product, setProduct] = useState<ProductRecord | null>(null)
  const [brandKit, setBrandKit] = useState<BrandKitRecord | null>(null)
  const [providerStatus, setProviderStatus] = useState<ProviderStatusResponse | null>(null)

  // Creative Studio State
  const [creative, setCreative] = useState<Partial<CreativeRecord>>({
    title: 'Anúncio de Alta Conversão',
    version_letter: variationParam,
    hypothesis_type:
      variationParam === 'A'
        ? 'A_PROBLEMA'
        : variationParam === 'B'
          ? 'B_DEMONSTRACAO'
          : 'C_BENEFICIO',
    creative_type: 'feed_1_1',
    aspect_ratio: '1:1',
    width: 1080,
    height: 1080,
    status: 'draft',
    is_ai_generated: false,
    creative_score: 88,
    current_version: 1,
  })

  // Visual Concept & Storyboard
  const [visualConcept, setVisualConcept] = useState<VisualConcept | null>(null)
  const [storyboardScenes, setStoryboardScenes] = useState<StoryboardScene[]>([])
  const [narrationScript, setNarrationScript] = useState('')
  const [subtitlesText, setSubtitlesText] = useState('')
  const [reviewReport, setReviewReport] = useState<CreativeReviewReport | null>(null)
  const [commercialValidation, setCommercialValidation] = useState<CommercialValidation | null>(
    null,
  )
  const [versions, setVersions] = useState<CreativeVersionRecord[]>([])
  const [assets, setAssets] = useState<CreativeAssetRecord[]>([])

  // UI Navigation Tabs
  const [activeTab, setActiveTab] = useState<
    'concept' | 'canvas' | 'storyboard' | 'audit' | 'library'
  >('canvas')
  const [selectedFormat, setSelectedFormat] = useState<CreativeFormatType>('feed_1_1')
  const [showBrandKitModal, setShowBrandKitModal] = useState(false)

  // Loading States
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [generatingConcept, setGeneratingConcept] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false)
  const [isAuditing, setIsAuditing] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [savingStudio, setSavingStudio] = useState(false)

  // 1. Initial Load & Hydration
  useEffect(() => {
    const initStudio = async () => {
      setLoadingInitial(true)
      try {
        // Fetch Provider Status & Brand Kit
        const [statusRes, brandRes] = await Promise.all([
          creativeService.getProviderStatus(),
          creativeService.getBrandKit(),
        ])
        setProviderStatus(statusRes)
        setBrandKit(brandRes)

        let currentCampaign: CampaignRecord | null = null
        let currentVariation: CampaignVariation | null = null
        let currentProduct: ProductRecord | null = null

        // If specific creativeId was passed
        if (creativeIdParam) {
          const loadedCreative = await creativeService.getCreativeById(creativeIdParam)
          if (loadedCreative) {
            setCreative(loadedCreative)
            setSelectedFormat(loadedCreative.creative_type)
            if (loadedCreative.visual_concept) setVisualConcept(loadedCreative.visual_concept)
            if (loadedCreative.video_storyboard)
              setStoryboardScenes(loadedCreative.video_storyboard)
            if (loadedCreative.narration_script) setNarrationScript(loadedCreative.narration_script)
            if (loadedCreative.subtitles_text) setSubtitlesText(loadedCreative.subtitles_text)
            if (loadedCreative.review_report) setReviewReport(loadedCreative.review_report)
            if (loadedCreative.commercial_validation)
              setCommercialValidation(loadedCreative.commercial_validation)
            if (loadedCreative.versions) setVersions(loadedCreative.versions)
          }
        }

        // Load Campaign if available
        if (campaignIdParam) {
          currentCampaign = await campaignService.getCampaignById(campaignIdParam)
          if (currentCampaign) {
            setCampaign(currentCampaign)
            // Match variation
            const vars = currentCampaign.variations || []
            const matchedVar =
              vars.find((v) => v.version_letter === variationParam) || vars[0] || null
            setVariation(matchedVar)

            // Setup creative initial parameters from existing Campaign data
            const productTitle = currentCampaign.product_title
            const productImage = currentCampaign.product_image
            const defaultHook =
              matchedVar?.hook_text ||
              currentCampaign.selected_angle_title ||
              'Descubra a Solução Prática'
            const defaultCta = matchedVar?.cta_text || 'Conferir na Bio / Ver Detalhes'
            const defaultHeadline =
              defaultHook.length > 55 ? defaultHook.slice(0, 52) + '...' : defaultHook
            const defaultPrice = currentCampaign.price_at_creation
              ? `R$ ${currentCampaign.price_at_creation.toFixed(2)}`
              : 'R$ 89,90'
            const defaultPromo = currentCampaign.promo_price_at_creation
              ? `R$ ${currentCampaign.promo_price_at_creation.toFixed(2)}`
              : 'R$ 49,90'

            setCreative((prev) => ({
              ...prev,
              campaign_id: currentCampaign?.id,
              campaign_variation_id: matchedVar?.id,
              product_id: currentCampaign?.product_id,
              discovered_id: currentCampaign?.discovered_id,
              product_title: productTitle,
              product_image_url: productImage,
              title: `${productTitle} - Var ${variationParam} (${selectedFormat})`,
              text_layers: prev.text_layers || {
                headline: defaultHeadline,
                subheadline:
                  matchedVar?.hypothesis_details || 'Testado e recomendado pelo Radar IA',
                benefit_pill: 'Praticidade & Alta Eficiência',
                cta_text: defaultCta,
                badge_tag: 'Destaque no Radar',
                price_text: defaultPrice,
                promo_price_text: defaultPromo,
                show_price: true,
                show_badge: true,
                show_subheadline: true,
                show_benefit: true,
                show_logo: true,
                show_disclaimer: false,
                text_align: 'center',
                text_density_status: 'ideal',
              },
            }))

            // Auto generate initial storyboard if empty
            if (storyboardScenes.length === 0) {
              setStoryboardScenes([
                {
                  scene_number: 1,
                  time_range: '0-3s',
                  duration_sec: 3,
                  objective: 'Parar o scroll nos 3 primeiros segundos',
                  camera_framing: 'Close-up no produto com iluminação limpa',
                  required_visual: 'Apresentação do produto em uso direto',
                  on_screen_text: defaultHeadline.toUpperCase(),
                  narration_text: `Se você busca praticidade, presta atenção nisso aqui!`,
                  subtitle_text: `Presta atenção nisso aqui...`,
                  transition_type: 'Zoom in rápido',
                  sound_effect_cue: 'Whoosh',
                },
                {
                  scene_number: 2,
                  time_range: '3-12s',
                  duration_sec: 9,
                  objective: 'Demonstrar dor e resolução',
                  camera_framing: 'Plano médio em 45 graus',
                  required_visual: `Tomada de funcionamento do produto ${productTitle}`,
                  on_screen_text: 'TESTADO E COMPROVADO',
                  narration_text: `Testei na prática e a diferença é absurda. Sem enrolação.`,
                  subtitle_text: `Testei na prática e a diferença é absurda.`,
                  transition_type: 'Corte seco',
                  sound_effect_cue: 'Clique',
                },
                {
                  scene_number: 3,
                  time_range: '12-25s',
                  duration_sec: 13,
                  objective: 'Benefício e prova sem exageros',
                  camera_framing: 'Detalhe dos materiais e acabamento',
                  required_visual: 'Foco no diferencial principal do produto',
                  on_screen_text: 'ALTA EFICIÊNCIA & DURABILIDADE',
                  narration_text: `Economiza seu tempo e cumpre exatamente o que promete no dia a dia.`,
                  subtitle_text: `Economiza tempo e funciona de verdade.`,
                  transition_type: 'Deslize',
                  sound_effect_cue: 'Swoosh',
                },
                {
                  scene_number: 4,
                  time_range: '25-30s',
                  duration_sec: 5,
                  objective: 'Chamada para ação clara',
                  camera_framing: 'Segurando o produto apontando para o link',
                  required_visual: 'Selo de verificação com link',
                  on_screen_text: defaultCta.toUpperCase(),
                  narration_text: `O link com preço verificado tá na bio, dá uma olhada!`,
                  subtitle_text: `Link seguro na bio!`,
                  transition_type: 'Fade',
                  sound_effect_cue: 'Chime',
                },
              ])
              setNarrationScript(
                `${defaultHeadline}. Testei na prática e a diferença é absurda. Economiza seu tempo e cumpre o que promete. ${defaultCta}!`,
              )
              setSubtitlesText(
                `[0-3s] ${defaultHeadline}\n[3-12s] Testei na prática e a diferença é absurda.\n[12-25s] Economiza seu tempo e cumpre o que promete.\n[25-30s] ${defaultCta}!`,
              )
            }
          }
        }
      } catch (e) {
        console.error('Error initializing Creative Studio:', e)
        toast.error('Erro ao inicializar Estúdio Criativo')
      } finally {
        setLoadingInitial(false)
      }
    }

    initStudio()
  }, [campaignIdParam, variationParam, creativeIdParam])

  // Current Format Spec
  const currentFormatSpec =
    CREATIVE_FORMAT_SPECS.find((f) => f.id === selectedFormat) || CREATIVE_FORMAT_SPECS[0]

  // Handler: Change Format
  const handleSelectFormat = (fmt: CreativeFormatType) => {
    setSelectedFormat(fmt)
    const spec = CREATIVE_FORMAT_SPECS.find((f) => f.id === fmt) || CREATIVE_FORMAT_SPECS[0]
    setCreative((prev) => ({
      ...prev,
      creative_type: fmt,
      aspect_ratio: spec.ratio,
      width: spec.width,
      height: spec.height,
    }))
  }

  // Handler: Switch Variation (A / B / C)
  const handleSwitchVariation = (letter: 'A' | 'B' | 'C') => {
    const hypType =
      letter === 'A' ? 'A_PROBLEMA' : letter === 'B' ? 'B_DEMONSTRACAO' : 'C_BENEFICIO'
    const matchedVar = campaign?.variations?.find((v) => v.version_letter === letter)
    const hook = matchedVar?.hook_text || `Gancho Hipótese ${letter}`
    const headline = hook.length > 55 ? hook.slice(0, 52) + '...' : hook

    setVariation(matchedVar || null)
    setCreative((prev) => ({
      ...prev,
      version_letter: letter,
      hypothesis_type: hypType,
      text_layers: prev.text_layers
        ? {
            ...prev.text_layers,
            headline: headline,
            cta_text: matchedVar?.cta_text || prev.text_layers.cta_text,
          }
        : undefined,
    }))
    toast.info(
      `Alternado para Variação ${letter} (${letter === 'A' ? 'Problema/Dor' : letter === 'B' ? 'Demonstração' : 'Benefício'})`,
    )
  }

  // Handler: Generate Visual Concept (IA)
  const handleGenerateConcept = async () => {
    setGeneratingConcept(true)
    try {
      const productTitle = creative.product_title || campaign?.product_title || 'Produto do Radar'
      const concept = await creativeService.generateVisualConcept({
        product_title: productTitle,
        product_category: campaign?.product_category || 'Geral',
        target_audience: campaign?.target_audience || 'Consumidores online',
        angle_title:
          campaign?.selected_angle_title || variation?.angle_title || 'Problema & Solução',
        hook_text: variation?.hook_text || creative.text_layers?.headline || 'Parada de scroll',
        copy_text: variation?.copy_text || 'Copy persuasiva',
        cta_text: variation?.cta_text || creative.text_layers?.cta_text || 'Ver Detalhes',
        variation_letter: creative.version_letter || 'A',
        hypothesis_type: creative.hypothesis_type || 'A_PROBLEMA',
        format: selectedFormat,
        brand_style: brandKit?.visual_style || 'modern_cyber',
      })

      setVisualConcept(concept)
      // Apply text hierarchy from concept to creative
      if (concept.text_hierarchy) {
        setCreative((prev) => ({
          ...prev,
          visual_concept: concept,
          text_layers: {
            ...(prev.text_layers || {
              show_price: true,
              show_badge: true,
              show_subheadline: true,
              show_benefit: true,
              show_logo: true,
              show_disclaimer: false,
              text_align: 'center',
              text_density_status: 'ideal',
            }),
            headline: concept.text_hierarchy.headline || prev.text_layers?.headline || '',
            subheadline: concept.text_hierarchy.subheadline || prev.text_layers?.subheadline || '',
            benefit_pill:
              concept.text_hierarchy.benefit_pill || prev.text_layers?.benefit_pill || '',
            cta_text: concept.text_hierarchy.cta_button || prev.text_layers?.cta_text || '',
            badge_tag:
              concept.text_hierarchy.badge_tag ||
              prev.text_layers?.badge_tag ||
              'DESTAQUE NO RADAR',
          },
        }))
      }
      toast.success('Conceito visual gerado com sucesso!')
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao gerar conceito visual'
      toast.error(errorMsg)
    } finally {
      setGeneratingConcept(false)
    }
  }

  // Handler: Generate OpenAI Image (Real Image API or clear alert)
  const handleGenerateOpenAiImage = async () => {
    if (!providerStatus?.openai_configured) {
      toast.error(
        'Chave OPENAI_API_KEY não configurada. A integração real de geração de imagens por IA está inativa.',
        {
          description:
            'Configure a variável OPENAI_API_KEY no painel para gerar imagens com DALL-E 3.',
          duration: 5000,
        },
      )
      return
    }

    const prompt =
      visualConcept?.suggested_image_prompt ||
      `Professional advertising commercial product photography of ${creative.product_title || 'product'}, studio lighting, high resolution, 4k.`

    setGeneratingImage(true)
    try {
      const res = await creativeService.generateOpenAiImage({
        prompt: prompt,
        size:
          selectedFormat === 'banner' || selectedFormat === 'thumbnail'
            ? '1792x1024'
            : selectedFormat === 'story_9_16' || selectedFormat === 'reels_tiktok_9_16'
              ? '1024x1792'
              : '1024x1024',
        quality: 'standard',
        style: 'natural',
      })

      if (res.success && res.image_url) {
        setCreative((prev) => ({
          ...prev,
          image_url: res.image_url,
          image_provider: 'openai',
          image_model: 'dall-e-3',
          image_prompt: prompt,
          revised_prompt: res.revised_prompt,
          is_ai_generated: true,
          fidelity_disclaimer_required: true,
          status: 'generated',
        }))
        toast.success('Imagem gerada com sucesso via OpenAI!')
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao gerar imagem na OpenAI'
      toast.error(errorMsg)
    } finally {
      setGeneratingImage(false)
    }
  }

  // Handler: Generate Storyboard
  const handleGenerateStoryboard = async () => {
    setGeneratingStoryboard(true)
    try {
      const productTitle = creative.product_title || campaign?.product_title || 'Produto do Radar'
      const res = await creativeService.generateStoryboard({
        product_title: productTitle,
        product_category: campaign?.product_category || 'Geral',
        target_audience: campaign?.target_audience || 'Consumidores online',
        angle_title:
          campaign?.selected_angle_title || variation?.angle_title || 'Problema & Solução',
        hook_text: variation?.hook_text || creative.text_layers?.headline || 'Gancho',
        cta_text: variation?.cta_text || creative.text_layers?.cta_text || 'Ver Detalhes',
        duration: 30,
        channel: 'TikTok / Instagram Reels',
      })

      setStoryboardScenes(res.scenes)
      setNarrationScript(res.full_narration_script)
      setSubtitlesText(res.full_auto_subtitles)
      setCreative((prev) => ({
        ...prev,
        video_storyboard: res.scenes,
        narration_script: res.full_narration_script,
        subtitles_text: res.full_auto_subtitles,
      }))
      toast.success('Storyboard audiovisual gerado com sucesso!')
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao gerar storyboard'
      toast.error(errorMsg)
    } finally {
      setGeneratingStoryboard(false)
    }
  }

  // Handler: Run Quality Audit
  const handleAuditQuality = async () => {
    setIsAuditing(true)
    try {
      const res = await creativeService.reviewQuality({
        product_title: creative.product_title || campaign?.product_title || 'Produto',
        product_price: campaign?.price_at_creation,
        promo_price: campaign?.promo_price_at_creation,
        angle_title: campaign?.selected_angle_title || variation?.angle_title,
        hook_text: variation?.hook_text,
        headline: creative.text_layers?.headline,
        subheadline: creative.text_layers?.subheadline,
        benefit: creative.text_layers?.benefit_pill,
        cta_text: creative.text_layers?.cta_text,
        price_text: creative.text_layers?.price_text,
        format: selectedFormat,
        is_ai_generated: creative.is_ai_generated,
        has_original_image: Boolean(creative.product_image_url),
      })

      setReviewReport(res)
      setCreative((prev) => ({
        ...prev,
        creative_score: res.score,
        score_breakdown: res.score_breakdown,
        review_status: res.status,
        review_report: res,
      }))
      toast.success('Auditoria de criativo concluída com sucesso!')
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao auditar criativo'
      toast.error(errorMsg)
    } finally {
      setIsAuditing(false)
    }
  }

  // Handler: Revalidate Commercial
  const handleRevalidateCommercial = async () => {
    setIsValidating(true)
    try {
      const res = await creativeService.revalidateCommercial({
        product_id: creative.product_id || campaign?.product_id,
        discovered_id: creative.discovered_id || campaign?.discovered_id,
        campaign_id: creative.campaign_id || campaign?.id,
      })

      setCommercialValidation(res)
      setCreative((prev) => ({
        ...prev,
        commercial_validation: res,
      }))
      if (res.can_publish) {
        toast.success('Revalidação comercial aprovada!')
      } else {
        toast.warning('Atenção: Existem pendências comerciais antes da publicação.')
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao revalidar'
      toast.error(errorMsg)
    } finally {
      setIsValidating(false)
    }
  }

  // Handler: Mark Ready to Publish
  const handlePublishReady = async () => {
    try {
      await handleSaveStudio('ready_to_publish')
      toast.success('Criativo aprovado e marcado como Pronto para Publicar!')
    } catch (e) {
      toast.error('Erro ao atualizar status')
    }
  }

  // Handler: Save Studio
  const handleSaveStudio = async (customStatus?: typeof creative.status) => {
    setSavingStudio(true)
    try {
      const toSave: Partial<CreativeRecord> = {
        ...creative,
        status: customStatus || creative.status || 'draft',
        visual_concept: visualConcept || undefined,
        video_storyboard: storyboardScenes,
        narration_script: narrationScript,
        subtitles_text: subtitlesText,
        review_report: reviewReport || undefined,
        commercial_validation: commercialValidation || undefined,
      }

      const res = await creativeService.saveCreative(toSave)
      if (res.creative_id) {
        setCreative((prev) => ({
          ...prev,
          id: res.creative_id,
          status: customStatus || prev.status,
        }))
      }
      toast.success('Projeto salvo com sucesso no Estúdio Criativo!')
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao salvar projeto'
      toast.error(errorMsg)
    } finally {
      setSavingStudio(false)
    }
  }

  // Handler: Save New Version
  const handleSaveVersion = async (summary: string) => {
    if (!creative.id) {
      await handleSaveStudio()
    }
    if (!creative.id) return

    try {
      const res = await creativeService.createNewVersion({
        creative_id: creative.id,
        change_summary: summary,
        image_url: creative.image_url,
        text_layers: creative.text_layers as unknown as Record<string, unknown>,
        video_storyboard: storyboardScenes,
        creative_score: creative.creative_score,
        review_status: creative.review_status,
      })

      setCreative((prev) => ({
        ...prev,
        current_version: res.version_number,
      }))
      // Reload versions
      const updated = await creativeService.getCreativeById(creative.id)
      if (updated?.versions) setVersions(updated.versions)

      toast.success(`Versão V${res.version_number} registrada no histórico!`)
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao criar versão'
      toast.error(errorMsg)
    }
  }

  // Handler: Export Kit
  const handleExportKit = () => {
    const prodName = (creative.product_title || 'produto').toLowerCase().replace(/[^a-z0-9]/g, '-')
    const campName = (campaign?.campaign_name || 'campanha')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
    const varLetter = (creative.version_letter || 'A').toLowerCase()
    const fmt = selectedFormat.replace(/_/g, '-')
    const fileName = `${prodName}_${campName}_var-${varLetter}_${fmt}_v${creative.current_version || 1}.json`

    const exportData = {
      product: {
        id: creative.product_id,
        title: creative.product_title,
        real_image: creative.product_image_url,
      },
      campaign: {
        id: campaign?.id,
        name: campaign?.campaign_name,
        angle: campaign?.selected_angle_title,
        target: campaign?.target_audience,
      },
      variation: {
        letter: creative.version_letter,
        hypothesis: creative.hypothesis_type,
        format: selectedFormat,
        aspect_ratio: currentFormatSpec.ratio,
        resolution: `${currentFormatSpec.width}x${currentFormatSpec.height}`,
      },
      visual_layers: creative.text_layers,
      visual_concept: visualConcept,
      image_asset: {
        url: creative.image_url || creative.product_image_url,
        is_ai_generated: creative.is_ai_generated,
        provider: creative.image_provider,
      },
      video_storyboard: {
        total_duration: 30,
        scenes: storyboardScenes,
        narration: narrationScript,
        subtitles: subtitlesText,
      },
      compliance_audit: {
        score: creative.creative_score,
        status: creative.review_status,
        verdict: reviewReport?.verdict_summary,
      },
      exported_at: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)

    toast.success('Kit Criativo Estruturado exportado com sucesso!')
  }

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <div className="w-10 h-10 border-4 border-[#00F2FF] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-mono text-gray-400">
          Carregando Estúdio Criativo (Fase 4)...
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20 max-w-7xl mx-auto">
      {/* 1. TOP HEADER BANNER */}
      <div className="p-5 rounded-3xl bg-[#121420] border border-[#232738] shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gradient-to-r from-[#00F2FF]/20 to-[#7000FF]/20 text-[#00F2FF] border border-[#00F2FF]/40">
              FASE 4 • ESTÚDIO CRIATIVO
            </span>
            <span className="text-[10px] text-gray-400 font-mono">
              PRODUTO → PÚBLICO → ÂNGULO → GANCHO → HIPÓTESE → CRIATIVO
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#00F2FF]" />
            Estúdio Criativo com IA
          </h1>
          <div className="text-xs text-gray-400 flex items-center gap-2 font-sans">
            <strong className="text-gray-200">Campanha:</strong>{' '}
            {campaign?.campaign_name || 'Geral'} •{' '}
            <strong className="text-gray-200">Produto:</strong> {creative.product_title}
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowBrandKitModal(true)}
            className="h-9 px-3.5 border-[#2A2F45] bg-[#141624] hover:bg-[#1C2034] text-white text-xs gap-1.5"
          >
            <Palette className="w-4 h-4 text-[#00F2FF]" />
            Minha Marca (Brand Kit)
          </Button>

          <Button
            size="sm"
            onClick={() => handleSaveStudio()}
            disabled={savingStudio}
            className="h-9 px-4 bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] font-black text-xs gap-1.5 shadow-[0_0_15px_rgba(0,242,255,0.3)]"
          >
            {savingStudio ? (
              <div className="w-3.5 h-3.5 border-2 border-[#0A0B10] border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Salvar Projeto
          </Button>
        </div>
      </div>

      {/* 2. CONTEXT & INTEGRATION STATUS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* A/B/C Hypotheses Selector Strip */}
        <div className="p-3 rounded-2xl bg-[#141624] border border-[#232738] flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-gray-400">Hipótese Criativa:</span>
          <div className="flex items-center gap-1">
            {(['A', 'B', 'C'] as const).map((lettr) => (
              <Button
                key={lettr}
                size="sm"
                variant="outline"
                onClick={() => handleSwitchVariation(lettr)}
                className={cn(
                  'h-7 px-2.5 text-xs font-bold font-mono rounded-lg border-[#2B3047]',
                  creative.version_letter === lettr
                    ? 'bg-[#00F2FF]/20 text-[#00F2FF] border-[#00F2FF]/50 shadow-[0_0_10px_rgba(0,242,255,0.2)]'
                    : 'bg-[#0E1018] text-gray-400 hover:text-white',
                )}
              >
                Var {lettr}
              </Button>
            ))}
          </div>
        </div>

        {/* OpenAI Image Provider Status Box */}
        <div className="p-3 rounded-2xl bg-[#141624] border border-[#232738] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
            <span className="text-[10px] font-mono text-gray-300">Provedor de Imagem:</span>
          </div>
          {providerStatus?.openai_configured ? (
            <Badge className="bg-[#00E676]/20 text-[#00E676] border-[#00E676]/40 text-[9px] font-mono">
              OpenAI DALL-E Ativo
            </Badge>
          ) : (
            <Badge className="bg-[#FF3D00]/20 text-[#FF3D00] border-[#FF3D00]/40 text-[9px] font-mono">
              OpenAI Chave Inativa
            </Badge>
          )}
        </div>

        {/* Video Provider Disclosure Box */}
        <div className="p-3 rounded-2xl bg-[#141624] border border-[#232738] flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase text-gray-400">Provedor de Vídeo:</span>
          <Badge className="bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/30 text-[9px] font-mono">
            Storyboard & Roteiro Ativo
          </Badge>
        </div>
      </div>

      {/* 3. FORMAT SELECTOR CAROUSEL */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#00F2FF]" />
            Selecione o Formato do Projeto (Dimensões & Proporções Corretas):
          </span>
          <span className="text-[10px] font-mono text-[#00F2FF]">
            {currentFormatSpec.width} x {currentFormatSpec.height} px ({currentFormatSpec.ratio})
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CREATIVE_FORMAT_SPECS.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => handleSelectFormat(fmt.id)}
              className={cn(
                'flex-shrink-0 px-3.5 py-2.5 rounded-xl border text-left transition-all space-y-1 select-none',
                selectedFormat === fmt.id
                  ? 'bg-gradient-to-br from-[#00F2FF]/15 to-[#7000FF]/15 border-[#00F2FF] shadow-[0_0_15px_rgba(0,242,255,0.15)] text-white'
                  : 'bg-[#121420] border-[#232738] text-gray-400 hover:border-[#353B52] hover:text-gray-200',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold truncate">{fmt.name}</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-[#0A0B10] border border-[#232738] text-[#00F2FF]">
                  {fmt.ratio}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 truncate">{fmt.channel}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. MAIN STUDIO NAVIGATION TABS */}
      <div className="flex items-center gap-1 border-b border-[#232738] pb-1 overflow-x-auto">
        {[
          { id: 'canvas', label: '1. Editor Visual & Arte', icon: ImageIcon },
          { id: 'concept', label: '2. Conceito Estratégico IA', icon: Sparkles },
          { id: 'storyboard', label: '3. Storyboard de Vídeo (9:16)', icon: Video },
          { id: 'audit', label: '4. Revisor de Criativo & Revalidação', icon: ShieldCheck },
          { id: 'library', label: '5. Biblioteca & Versões', icon: FolderArchive },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <Button
              key={tab.id}
              size="sm"
              variant="ghost"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'h-9 px-4 rounded-xl text-xs font-bold gap-2 transition-all border-b-2 rounded-b-none',
                isActive
                  ? 'text-[#00F2FF] border-[#00F2FF] bg-[#00F2FF]/10'
                  : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#141624]',
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </Button>
          )
        })}
      </div>

      {/* 5. ACTIVE TAB CONTENT */}

      {/* TAB 1: VISUAL CANVAS EDITOR */}
      {activeTab === 'canvas' && (
        <div className="space-y-6">
          {/* OpenAI Image Generation Bar */}
          <div className="p-4 rounded-2xl bg-[#141624] border border-[#232738] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#00F2FF]" />
                Gerador de Imagens com OpenAI (DALL-E 3 / gpt-image-1)
              </div>
              <p className="text-[11px] text-gray-400">
                Gera imagem de anúncio, fundo ou lifestyle com iluminação publicitária. Se a chave
                não estiver configurada, use a foto original do produto.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={handleGenerateOpenAiImage}
                disabled={generatingImage}
                className="h-9 px-4 bg-[#7000FF] hover:bg-[#8519FF] text-white font-bold text-xs gap-1.5 shadow-[0_0_15px_rgba(112,0,255,0.3)]"
              >
                {generatingImage ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-[#00F2FF]" />
                )}
                Gerar Imagem com OpenAI
              </Button>
            </div>
          </div>

          {/* Live Canvas Component */}
          <VisualCanvasEditor
            creative={creative}
            formatSpec={currentFormatSpec}
            brandKit={brandKit}
            onChangeTextLayers={(layers) => {
              setCreative((prev) => ({
                ...prev,
                text_layers: layers,
              }))
            }}
            onSaveVersion={handleSaveVersion}
          />
        </div>
      )}

      {/* TAB 2: VISUAL CONCEPT (IA) */}
      {activeTab === 'concept' && (
        <div className="space-y-6 text-xs">
          <div className="p-5 rounded-2xl bg-[#121420] border border-[#232738] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#232738]">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00F2FF]" />
                  Conceito Visual Estratégico (Antes da Imagem)
                </h3>
                <p className="text-[11px] text-gray-400">
                  A IA explica exatamente por que este visual combina com o público e o ângulo
                  escolhido.
                </p>
              </div>

              <Button
                size="sm"
                onClick={handleGenerateConcept}
                disabled={generatingConcept}
                className="h-9 px-4 bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] font-bold text-xs gap-1.5 shadow-[0_0_15px_rgba(0,242,255,0.25)]"
              >
                {generatingConcept ? (
                  <div className="w-3.5 h-3.5 border-2 border-[#0A0B10] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Gerar Novo Conceito IA
              </Button>
            </div>

            {visualConcept ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#0A0B10] border border-[#212638] space-y-2">
                  <span className="text-[10px] font-mono text-[#00F2FF] uppercase font-bold">
                    Conceito Criativo & Hipótese
                  </span>
                  <div className="text-sm font-bold text-white">{visualConcept.concept_name}</div>
                  <p className="text-gray-300 leading-relaxed">
                    {visualConcept.hypothesis_summary}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#0A0B10] border border-[#212638] space-y-2">
                  <span className="text-[10px] font-mono text-[#00E676] uppercase font-bold">
                    Gancho Visual (Scroll Stopper)
                  </span>
                  <p className="text-gray-200 leading-relaxed font-mono">
                    &quot;{visualConcept.visual_hook}&quot;
                  </p>
                  <p className="text-[11px] text-gray-400">{visualConcept.rationale}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#0A0B10] border border-[#212638] space-y-2">
                  <span className="text-[10px] font-mono text-[#C084FC] uppercase font-bold">
                    Composição & Iluminação
                  </span>
                  <p className="text-gray-300">{visualConcept.scene_composition}</p>
                  <div className="text-[11px] text-gray-400 font-mono">
                    Mood: {visualConcept.lighting_and_mood}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0A0B10] border border-[#212638] space-y-2">
                  <span className="text-[10px] font-mono text-[#FFD600] uppercase font-bold">
                    Prompt Publicitário Sugerido (Inglês)
                  </span>
                  <div className="p-2 rounded bg-[#131622] border border-[#252A3D] text-[10px] font-mono text-gray-300">
                    {visualConcept.suggested_image_prompt}
                  </div>
                  <div className="text-[10px] text-gray-400">
                    <strong>Fidelidade: </strong> {visualConcept.fidelity_notes}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-[#0A0B10] border border-[#212638] space-y-2 text-gray-400">
                <p>Nenhum conceito visual gerado ainda para esta variação.</p>
                <Button
                  size="sm"
                  onClick={handleGenerateConcept}
                  className="h-8 text-xs bg-[#7000FF] text-white"
                >
                  Gerar Conceito Visual com IA
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: VIDEO STORYBOARD */}
      {activeTab === 'storyboard' && (
        <VideoStoryboardTab
          scenes={storyboardScenes}
          narrationScript={narrationScript}
          subtitlesText={subtitlesText}
          totalDuration={30}
          onChangeScenes={setStoryboardScenes}
          onChangeNarration={setNarrationScript}
          onChangeSubtitles={setSubtitlesText}
          onRegenerateStoryboard={handleGenerateStoryboard}
          isGenerating={generatingStoryboard}
        />
      )}

      {/* TAB 4: REVISOR DE CRIATIVO & REVALIDAÇÃO */}
      {activeTab === 'audit' && (
        <CreativeAuditor
          creative={creative}
          reviewReport={reviewReport}
          commercialValidation={commercialValidation}
          onAuditQuality={handleAuditQuality}
          onRevalidateCommercial={handleRevalidateCommercial}
          onPublishReady={handlePublishReady}
          isAuditing={isAuditing}
          isValidating={isValidating}
        />
      )}

      {/* TAB 5: LIBRARY & VERSIONS HISTORY */}
      {activeTab === 'library' && (
        <CreativeLibraryAndVersions
          creative={creative}
          versions={versions}
          assets={assets}
          onRestoreVersion={(ver) => {
            if (ver.text_layers) {
              setCreative((prev) => ({
                ...prev,
                current_version: ver.version_number,
                image_url: ver.image_url || prev.image_url,
                text_layers: ver.text_layers,
                creative_score: ver.creative_score || prev.creative_score,
              }))
            }
            toast.success(`Versão V${ver.version_number} restaurada no editor!`)
          }}
          onExportKit={handleExportKit}
        />
      )}

      {/* Brand Kit Modal */}
      <BrandKitModal
        isOpen={showBrandKitModal}
        onClose={() => setShowBrandKitModal(false)}
        onBrandKitSaved={(saved) => setBrandKit(saved)}
      />
    </div>
  )
}
