export type CampaignStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'needs_revision'
  | 'archived'
  | 'published'
  | 'paused'
  | 'winner'
  | 'loser'

export type ComplianceStatus = 'approved' | 'needs_revision' | 'blocked'

export type ConfidenceLevel = 'confirmed' | 'inferred' | 'unavailable'

export type HookType =
  | 'curiosity'
  | 'problem'
  | 'demonstration'
  | 'question'
  | 'discovery'
  | 'comparison'
  | 'benefit'
  | 'identification'

export type ChannelType =
  | 'Instagram'
  | 'TikTok'
  | 'YouTube Shorts'
  | 'Facebook'
  | 'WhatsApp'
  | 'Telegram'
  | 'Pinterest'
  | 'Landing Page'

export type CreativeFormat =
  | 'short_ad'
  | 'caption'
  | 'script_15s'
  | 'script_30s'
  | 'script_60s'
  | 'story'
  | 'carousel'
  | 'product_description'
  | 'promo_message'
  | 'demo_script'

export interface VideoScene {
  scene_number: number
  time_range: string // e.g. "0-3s"
  visual_action: string
  on_screen_text: string
  narration: string
  duration_sec: number
}

export interface ScoreBreakdown {
  hook_strength: number
  clarity: number
  audience_fit: number
  benefit_strength: number
  cta_quality: number
  channel_fit: number
  argument_depth: number
  exaggerated_claim_risk: number
  notes?: string
  explanation?: string
}

export interface ProductIntelligence {
  what_is: string
  solves_problem: string
  target_audiences: Array<{
    name: string
    description: string
    confidence: ConfidenceLevel
  }>
  motivations: string[]
  benefits: Array<{
    text: string
    confidence: ConfidenceLevel
  }>
  objections: string[]
  differentials: string[]
  use_situations: string[]
  confidence_summary: {
    confirmed: string[]
    inferred: string[]
    unavailable: string[]
  }
}

export interface SellingAngle {
  id: string
  title: string
  public: string
  pain_desire: string
  hook: string
  argument: string
  objection_to_beat: string
  cta: string
  recommended_channel: string
  recommended_format: string
}

export interface CampaignHookItem {
  id: string
  type: HookType
  type_label?: string
  text: string
  strength_score: number
  target?: string
  confidence?: ConfidenceLevel
}

export interface CampaignVariation {
  id?: string
  campaign_id?: string
  version_letter: 'A' | 'B' | 'C' | 'D'
  hypothesis_name: string
  hypothesis_details: string
  angle_title: string
  hook_type: HookType
  hook_text: string
  copy_text: string
  cta_text: string
  cta_objective: string
  channel: string
  format: CreativeFormat | string
  video_scenes?: VideoScene[]
  estimated_score: number
  score_breakdown?: ScoreBreakdown
  compliance_status: ComplianceStatus
  compliance_notes?: string
  // Future metrics structure
  impressions?: number
  views?: number
  retention_rate?: number
  clicks?: number
  ctr?: number
  conversions?: number
  sales_count?: number
  total_commission?: number
  ad_spend?: number
  roi?: number
  is_winner?: boolean
  created?: string
  updated?: string
}

export interface ComplianceReviewReport {
  status: ComplianceStatus
  safety_score?: number
  false_urgency_detected?: boolean
  false_urgency_found?: boolean
  unverified_claims?: string[]
  policy_flags?: string[]
  positives?: string[]
  improvement_suggestions?: string[]
  suggestions?: string[]
  reasons?: string[]
  price_consistency?: string
  verdict_summary?: string
}

export interface CampaignRecord {
  id: string
  collectionId?: string
  collectionName?: string
  user_id?: string
  product_id?: string
  discovered_id?: string
  product_title: string
  product_image?: string
  product_category?: string
  platform?: string
  product_url?: string
  affiliate_url?: string
  affiliate_is_configured?: boolean
  price_at_creation?: number
  promo_price_at_creation?: number
  commission_rate_at_creation?: number
  commission_amount_at_creation?: number
  campaign_name: string
  selected_angle_id?: string
  selected_angle_title?: string
  target_audience?: string
  recommended_channels?: string[]
  primary_channel?: string
  primary_format?: string
  status: CampaignStatus
  product_intelligence?: ProductIntelligence
  selling_angles?: SellingAngle[]
  hooks_bank?: CampaignHookItem[]
  generated_copies?: Record<string, string>
  video_scripts?: Record<string, unknown>
  estimated_score: number
  score_breakdown?: ScoreBreakdown
  compliance_status: ComplianceStatus
  compliance_report?: ComplianceReviewReport
  conversation_id?: string
  metadata?: Record<string, unknown>
  created: string
  updated: string
  // Expanded relation or loaded dynamically
  variations?: CampaignVariation[]
}

export interface GenerateFullCampaignResponse {
  success: boolean
  product: {
    id?: string
    discovered_id?: string
    title: string
    category: string
    platform: string
    price: number
    promo_price?: number
    commission_rate: number
    commission_amount: number
    product_url?: string
    affiliate_url?: string
    affiliate_is_configured: boolean
    image_url?: string
    seller?: string
    sales_count?: number
    reviews_count?: number
    rating?: number
    opportunity_score?: number
  }
  product_intelligence: ProductIntelligence
  selling_angles: SellingAngle[]
  hooks_bank: CampaignHookItem[]
  variations: CampaignVariation[]
  multi_channel_copies: Record<string, string>
  video_scripts_collection: Record<string, unknown>
  estimated_score: number
  score_breakdown: ScoreBreakdown
  compliance_review: ComplianceReviewReport
}
