export type OpportunityLevel = 'hot' | 'good' | 'test' | 'low'

export interface ProductRecord {
  id: string
  collectionId: string
  collectionName: string
  title: string
  image_url: string
  platform: string // Shopee, Mercado Livre, Amazon, TikTok Shop, Hotmart, Manual, etc.
  category: string
  niche?: string
  price: number
  promo_price?: number
  commission_rate: number // %
  commission_amount: number // R$
  sales_count: number
  reviews_count: number
  rating: number // 0-5
  seller?: string
  product_url?: string
  affiliate_url?: string
  competition_level: number // 1-10
  trends_score: number // 1-10
  demand_score: number // 1-10
  opportunity_score: number // 0-100
  opportunity_level: OpportunityLevel
  ai_analysis?: string
  ai_summary?: string
  source: string // 'manual' | 'csv' | 'api'
  metadata?: Record<string, unknown>
  created: string
  updated: string
}

export type Product = ProductRecord

export interface CsvMapping {
  title: string
  platform: string
  category: string
  niche: string
  price: string
  promo_price: string
  commission_rate: string
  commission_amount: string
  sales_count: string
  reviews_count: string
  rating: string
  seller: string
  product_url: string
  affiliate_url: string
  image_url: string
}

export interface AiInsightRecord {
  id: string
  collectionId: string
  collectionName: string
  global_recommendations: string
  top_picks?: Array<{
    id?: string
    title: string
    score: number
    reason: string
  }>
  created: string
  updated: string
}

export interface FactorBreakdown {
  label: string
  score: number // 0-10 or 0-100
  weightText: string
  description: string
  status: 'excellent' | 'good' | 'warning' | 'poor'
}

export type DiscoveredStatus = 'pending' | 'approved' | 'discarded'

export interface DiscoveredProductRecord {
  id: string
  collectionId: string
  collectionName: string
  external_id: string
  platform: string
  title: string
  image_url: string
  category: string
  niche?: string
  price: number
  promo_price?: number
  commission_rate: number
  commission_amount: number
  commission_is_estimated: boolean
  sales_count: number
  reviews_count: number
  rating: number
  seller?: string
  product_url?: string
  affiliate_url?: string
  competition_level: number
  trends_score: number
  demand_score: number
  opportunity_score: number
  opportunity_level: OpportunityLevel
  status: DiscoveredStatus
  ai_analysis?: string
  ai_summary?: string
  ai_strengths?: string[]
  ai_weaknesses?: string[]
  ai_target_audience?: string
  ai_selling_angle?: string
  ai_risk_level?: string
  source: string
  radar_product_id?: string
  raw_data?: Record<string, unknown>
  created: string
  updated: string
}

export interface ProductSnapshotRecord {
  id: string
  collectionId: string
  collectionName: string
  product_id?: string
  discovered_id?: string
  external_id: string
  platform: string
  price: number
  promo_price?: number
  commission_rate: number
  commission_amount: number
  sales_count: number
  reviews_count: number
  rating: number
  opportunity_score: number
  ranking_position: number
  snapshot_date: string
  metadata?: Record<string, unknown>
  created: string
  updated: string
}

export type TrendSignal = 'rising' | 'trending_hot' | 'stable' | 'falling' | 'insufficient_data'

export interface WatchlistItemRecord {
  id: string
  collectionId?: string
  collectionName?: string
  user_id?: string
  product_id?: string
  discovered_id?: string
  external_id: string
  platform: string
  title: string
  image_url: string
  product_url?: string
  category: string
  initial_price: number
  current_price: number
  initial_commission_rate?: number
  current_commission_rate?: number
  initial_commission_amount?: number
  current_commission_amount?: number
  initial_sales_count: number
  current_sales_count: number
  initial_rating?: number
  current_rating?: number
  initial_score: number
  current_score: number
  trend_signal: TrendSignal
  alert_reason?: string
  last_alert_reason?: string
  notes?: string
  snapshots_count?: number
  created: string
  updated: string
}

export interface HunterSearchFilters {
  query?: string
  category?: string
  min_price?: number
  max_price?: number
  min_sales?: number
  min_rating?: number
  estimated_commission_rate?: number
  marketplace?: string
  limit?: number
  offset?: number
  ml_token?: string
}

export interface HunterSearchResult {
  success: boolean
  marketplace: string
  status: 'ok' | 'token_required' | 'api_error' | 'network_error' | 'unsupported_marketplace'
  message?: string
  total_found: number
  products: DiscoveredProductRecord[]
  offset?: number
  next_offset?: number
  has_more?: boolean
}

export interface HunterWhyAiPickedResult {
  title: string
  score: number
  level: OpportunityLevel
  explanation: string
  strengths: string[]
  weaknesses: string[]
  target_audience: string
  selling_angle: string
  risk_level: string
  full_analysis?: string
}

export interface InterpretedFiltersResult {
  query: string
  category: string
  min_price?: number
  max_price?: number
  min_sales?: number
  min_rating?: number
  estimated_commission_rate?: number
  marketplace?: string
  ai_intent_summary?: string
}
