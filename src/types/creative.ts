export type CreativeFormatType =
  | 'feed_1_1'
  | 'feed_4_5'
  | 'story_9_16'
  | 'reels_tiktok_9_16'
  | 'shorts_9_16'
  | 'pinterest'
  | 'banner'
  | 'carousel'
  | 'thumbnail'
  | 'short_video_storyboard'

export type CreativeStatus =
  | 'draft'
  | 'generating'
  | 'generated'
  | 'editing'
  | 'in_review'
  | 'approved'
  | 'ready_to_publish'
  | 'archived'
  | 'generation_failed'

export type CreativeHypothesisType = 'A_PROBLEMA' | 'B_DEMONSTRACAO' | 'C_BENEFICIO'

export type CreativeReviewStatus = 'approved' | 'needs_revision' | 'blocked'

export interface BrandKitRecord {
  id: string
  collectionId?: string
  collectionName?: string
  user_id?: string
  brand_name: string
  logo_url?: string
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  text_color: string
  font_family: string
  visual_style: string
  tone_of_voice: string
  social_handle?: string
  signature_tagline?: string
  is_default?: boolean
  metadata?: Record<string, unknown>
  created: string
  updated: string
}

export interface CreativeTextLayers {
  headline: string
  subheadline: string
  benefit_pill: string
  price_text?: string
  promo_price_text?: string
  cta_text: string
  badge_tag?: string
  note_disclaimer?: string
  show_price?: boolean
  show_badge?: boolean
  show_subheadline?: boolean
  show_benefit?: boolean
  show_logo?: boolean
  show_disclaimer?: boolean
  text_align?: 'left' | 'center' | 'right'
  text_density_status?: 'ideal' | 'medium' | 'heavy'
}

export interface VisualConcept {
  concept_name: string
  hypothesis_summary: string
  visual_hook: string
  rationale: string
  scene_composition: string
  lighting_and_mood: string
  text_hierarchy: {
    headline: string
    subheadline: string
    benefit_pill: string
    cta_button: string
    badge_tag: string
  }
  suggested_image_prompt: string
  fidelity_notes: string
}

export interface StoryboardScene {
  scene_number: number
  time_range: string
  duration_sec: number
  objective: string
  camera_framing: string
  required_visual: string
  on_screen_text: string
  narration_text: string
  subtitle_text: string
  transition_type: string
  sound_effect_cue?: string
}

export interface CreativeScoreBreakdown {
  visual_clarity: number
  hook_power: number
  product_highlight: number
  readability: number
  audience_fit: number
  channel_fit: number
  cta_power: number
}

export interface CreativeReviewReport {
  status: CreativeReviewStatus
  score: number
  score_breakdown: CreativeScoreBreakdown
  verdict_summary: string
  fidelity_assessment: string
  text_density_warning: boolean
  issues_detected: string[]
  positives: string[]
  actionable_fixes: string[]
}

export interface CommercialValidation {
  can_publish: boolean
  product_available: boolean
  current_price: number
  current_promo_price: number
  affiliate_configured: boolean
  affiliate_url?: string
  campaign_status: string
  checklist: Array<{
    item: string
    passed: boolean
    detail: string
  }>
  revalidated_at: string
}

export interface CreativeVersionRecord {
  id: string
  creative_id: string
  version_number: number
  version_tag: string
  image_url?: string
  image_prompt?: string
  text_layers?: CreativeTextLayers
  video_storyboard?: StoryboardScene[]
  visual_concept?: VisualConcept
  creative_score?: number
  review_status?: string
  change_summary?: string
  created: string
}

export interface CreativeAssetRecord {
  id: string
  user_id?: string
  creative_id?: string
  campaign_id?: string
  product_id?: string
  asset_type:
    | 'original_product_image'
    | 'ai_generated_image'
    | 'edited_canvas'
    | 'thumbnail'
    | 'logo'
    | 'storyboard_frame'
    | 'video_draft'
    | 'audio_narration'
  format_name: string
  version_letter?: string
  file_url: string
  file_name?: string
  mime_type?: string
  width?: number
  height?: number
  is_ai_generated: boolean
  notes?: string
  created: string
}

export interface CreativeRecord {
  id: string
  collectionId?: string
  collectionName?: string
  user_id?: string
  campaign_id?: string
  campaign_variation_id?: string
  product_id?: string
  discovered_id?: string
  product_title: string
  product_image_url?: string
  version_letter: 'A' | 'B' | 'C'
  hypothesis_type: CreativeHypothesisType
  title: string
  creative_type: CreativeFormatType
  width: number
  height: number
  aspect_ratio: string
  status: CreativeStatus
  visual_concept?: VisualConcept
  image_provider: string
  image_model?: string
  image_prompt?: string
  revised_prompt?: string
  image_url?: string
  is_ai_generated: boolean
  fidelity_disclaimer_required?: boolean
  text_layers?: CreativeTextLayers
  visual_style_overrides?: {
    primary_color?: string
    accent_color?: string
    font_family?: string
    background_overlay?: string
    text_align?: 'left' | 'center' | 'right'
  }
  video_storyboard?: StoryboardScene[]
  video_provider?: string
  narration_voice?: string
  narration_script?: string
  subtitles_text?: string
  creative_score?: number
  score_breakdown?: CreativeScoreBreakdown
  review_status?: CreativeReviewStatus
  review_report?: CreativeReviewReport
  commercial_validation?: CommercialValidation
  current_version?: number
  version_count?: number
  impressions?: number
  views?: number
  retention_rate?: number
  clicks?: number
  ctr?: number
  conversions?: number
  sales_count?: number
  total_commission?: number
  roi?: number
  metadata?: Record<string, unknown>
  created: string
  updated: string
  // Optional expanded relations
  versions?: CreativeVersionRecord[]
}

export interface ProviderStatusResponse {
  active_provider: string
  openai_configured: boolean
  supported_providers: Array<{
    id: string
    name: string
    configured: boolean
    description: string
  }>
  video_generation: {
    configured: boolean
    provider: string
    message: string
  }
  narration_generation: {
    configured: boolean
    provider: string
    message: string
  }
}

export interface FormatDimensionSpec {
  id: CreativeFormatType
  name: string
  ratio: string
  width: number
  height: number
  channel: string
  badge: string
  description: string
}

export const CREATIVE_FORMAT_SPECS: FormatDimensionSpec[] = [
  {
    id: 'feed_1_1',
    name: 'Feed Quadrado (1:1)',
    ratio: '1:1',
    width: 1080,
    height: 1080,
    channel: 'Instagram / Facebook',
    badge: 'Feed',
    description: 'Formato padrão universal para posts de feed de alto impacto.',
  },
  {
    id: 'feed_4_5',
    name: 'Feed Vertical (4:5)',
    ratio: '4:5',
    width: 1080,
    height: 1350,
    channel: 'Instagram Feed Otimizado',
    badge: '4:5',
    description: 'Maior retenção na tela do celular, ocupa mais espaço visual no feed.',
  },
  {
    id: 'story_9_16',
    name: 'Story Vertical (9:16)',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    channel: 'Instagram / Facebook Stories',
    badge: 'Story',
    description: 'Tela inteira vertical com espaço seguro para stickers, links e CTA.',
  },
  {
    id: 'reels_tiktok_9_16',
    name: 'Reels / TikTok (9:16)',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    channel: 'TikTok / Instagram Reels',
    badge: 'Vídeo Vertical',
    description: 'Otimizado para safe zone de botões laterais e legenda nativa.',
  },
  {
    id: 'shorts_9_16',
    name: 'YouTube Shorts (9:16)',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    channel: 'YouTube Shorts',
    badge: 'Shorts',
    description: 'Dinâmico para descoberta orgânica com gancho nos primeiros 3s.',
  },
  {
    id: 'pinterest',
    name: 'Pin Vertical (2:3)',
    ratio: '2:3',
    width: 1000,
    height: 1500,
    channel: 'Pinterest Pins',
    badge: 'Pinterest',
    description: 'Visual estético e inspiracional de longa cauda no Pinterest.',
  },
  {
    id: 'banner',
    name: 'Banner Paisagem (16:9)',
    ratio: '16:9',
    width: 1200,
    height: 675,
    channel: 'Meta Ads / Google Display / WhatsApp',
    badge: 'Banner',
    description: 'Ideal para cabeçalho de oferta, WhatsApp e anúncios horizontais.',
  },
  {
    id: 'carousel',
    name: 'Carrossel Sequencial (1:1 / 4:5)',
    ratio: '4:5',
    width: 1080,
    height: 1350,
    channel: 'Instagram / LinkedIn / Facebook',
    badge: 'Carrossel',
    description: 'Estrutura de 3 a 5 slides contínuos com gancho, prova e CTA.',
  },
  {
    id: 'thumbnail',
    name: 'Thumbnail / Capa (16:9)',
    ratio: '16:9',
    width: 1280,
    height: 720,
    channel: 'YouTube / Capas de Vídeo',
    badge: 'Thumb',
    description: 'Capa chamativa com alto contraste para aumentar o CTR do vídeo.',
  },
  {
    id: 'short_video_storyboard',
    name: 'Storyboard de Vídeo Curto (9:16)',
    ratio: '9:16',
    width: 1080,
    height: 1920,
    channel: 'Roteiro Audiovisual Completo',
    badge: 'Storyboard',
    description: 'Cenas detalhadas com enquadramento, narração, tela e transições.',
  },
]
