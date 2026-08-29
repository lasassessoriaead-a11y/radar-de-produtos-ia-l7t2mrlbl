import pb from '@/lib/pocketbase/client'

export type PublicationStatus =
  | 'draft'
  | 'ready_to_publish'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'paused'
  | 'failed'
  | 'archived'

export type PublicationMode = 'telegram_bot' | 'manual_tracked'

export type ChannelTypeCode =
  | 'telegram'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'facebook'
  | 'pinterest'
  | 'whatsapp'
  | 'other'

export interface ChannelConnectionRecord {
  id: string
  collectionId?: string
  collectionName?: string
  user_id: string
  channel_type: ChannelTypeCode
  display_name: string
  is_active: boolean
  is_connected: boolean
  credentials_masked?: {
    masked_token?: string
    chat_id?: string
    bot_username?: string
  }
  settings?: {
    chat_id?: string
    auto_publish_enabled?: boolean
  }
  last_tested_at?: string
  status_message?: string
  created: string
  updated: string
}

export interface PublicationRecord {
  id: string
  collectionId?: string
  collectionName?: string
  user_id?: string
  campaign_id: string
  variation_id?: string
  creative_id?: string
  product_id?: string
  discovered_id?: string
  channel: string
  channel_type: ChannelTypeCode
  publication_mode: PublicationMode
  status: PublicationStatus
  published_at?: string
  scheduled_for?: string
  external_post_url?: string
  external_message_id?: string
  copy_used?: string
  cta_used?: string
  creative_image_url?: string
  tracking_link_id?: string
  tracking_slug?: string
  tracking_full_url?: string
  destination_url?: string
  checklist_snapshot?: Record<string, unknown>
  price_at_publish?: number
  impressions_count?: number
  views_count?: number
  raw_clicks_count?: number
  valid_clicks_count?: number
  conversions_count?: number
  commission_total?: number
  costs_total?: number
  error_log?: string
  metadata?: Record<string, unknown>
  created: string
  updated: string
  // UI helpers
  expand?: {
    campaign_id?: any
  }
}

export interface TrackingLinkRecord {
  id: string
  collectionId?: string
  collectionName?: string
  user_id: string
  slug: string
  title?: string
  campaign_id?: string
  variation_id?: string
  creative_id?: string
  product_id?: string
  publication_id?: string
  channel?: string
  sub_id?: string
  destination_url: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string
  is_active: boolean
  raw_clicks_count?: number
  valid_clicks_count?: number
  conversions_count?: number
  commission_earned?: number
  last_click_at?: string
  metadata?: Record<string, unknown>
  created: string
  updated: string
}

export interface ClickEventRecord {
  id: string
  user_id?: string
  tracking_link_id: string
  slug?: string
  campaign_id?: string
  variation_id?: string
  creative_id?: string
  publication_id?: string
  product_id?: string
  channel?: string
  sub_id?: string
  is_valid: boolean
  invalid_reason?: string
  referrer_host?: string
  user_agent_short?: string
  device_type?: 'mobile' | 'desktop' | 'tablet' | 'bot' | 'unknown'
  client_dedup_hash?: string
  ip_masked?: string
  country_code?: string
  has_converted: boolean
  conversion_id?: string
  created: string
}

export interface ConversionRecord {
  id: string
  user_id: string
  product_id?: string
  campaign_id?: string
  variation_id?: string
  creative_id?: string
  publication_id?: string
  tracking_link_id?: string
  sub_id?: string
  external_order_id?: string
  channel?: string
  sale_amount: number
  commission_amount: number
  currency?: string
  status: 'pending' | 'confirmed' | 'canceled' | 'refunded'
  source_type: 'csv_import' | 'manual_entry' | 'webhook' | 'api_postback'
  attribution_confidence: 'confirmed' | 'probable' | 'unattributed'
  attribution_method?: string
  conversion_date?: string
  raw_payload?: Record<string, unknown>
  notes?: string
  created: string
  updated: string
}

export interface CampaignCostRecord {
  id: string
  user_id: string
  campaign_id?: string
  variation_id?: string
  publication_id?: string
  cost_type:
    | 'paid_traffic'
    | 'ai_generation'
    | 'tools_subscription'
    | 'creative_outsourcing'
    | 'other'
  description: string
  amount: number
  date?: string
  channel?: string
  created: string
  updated: string
}

export interface AuditLogRecord {
  id: string
  user_id: string
  entity_type:
    | 'campaign'
    | 'creative'
    | 'publication'
    | 'tracking_link'
    | 'conversion'
    | 'channel'
    | 'cost'
  entity_id?: string
  action: string
  title: string
  details?: Record<string, unknown>
  created: string
}

export interface PerformanceKpis {
  publications: number
  raw_clicks: number
  valid_clicks: number
  bot_clicks_filtered: number
  conversions_count: number
  total_sales: number
  total_commission: number
  total_costs: number
  net_profit: number
  roi_percentage: number
  conversion_rate: number
}

export interface ChannelPerformanceItem {
  channel: string
  publications: number
  raw_clicks: number
  valid_clicks: number
  conversions: number
  commission: number
  costs: number
}

export interface PerformanceSummaryResponse {
  kpis: PerformanceKpis
  channel_breakdown: ChannelPerformanceItem[]
  last_updated: string
}

export interface AiPerformanceInsightsResponse {
  diagnostic_summary: string
  data_reliability_level: 'alto' | 'medio' | 'preliminar'
  winner_variation_insight: string
  prediction_vs_reality_insight: string
  channel_efficiency_insight: string
  recommended_actions: string[]
  bot_traffic_warning: string
}
