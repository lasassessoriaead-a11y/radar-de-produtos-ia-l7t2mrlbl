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
