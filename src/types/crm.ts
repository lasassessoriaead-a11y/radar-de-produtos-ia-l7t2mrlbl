// Type definitions for Phase 8: CRM, Relacionamento & Recompra

export type CRMContactStatus =
  | 'novo'
  | 'interessado'
  | 'engajado'
  | 'qualificado'
  | 'em_decisao'
  | 'cliente'
  | 'cliente_recorrente'
  | 'sem_interesse'
  | 'opt_out'
  | 'inativo'

export type CRMChannel =
  | 'landing_page'
  | 'form'
  | 'telegram'
  | 'newsletter'
  | 'campaign_page'
  | 'own_channel'
  | 'whatsapp'
  | 'other'

export type RecommendationType =
  | 'complementar'
  | 'reposicao'
  | 'upsell'
  | 'cross_sell'
  | 'novo_interesse'

export type RecommendationStatus =
  | 'sugerida'
  | 'aprovada'
  | 'utilizada_em_campanha'
  | 'enviada_manualmente'
  | 'descartada'
  | 'convertida'

export type NextBestActionType =
  | 'Nenhuma ação agora'
  | 'Enviar conteúdo educativo'
  | 'Apresentar produto complementar'
  | 'Aguardar'
  | 'Reativar relacionamento'
  | 'Solicitar feedback'
  | 'Recomendação'

export interface PurchasedProductItem {
  product_id: string
  title: string
  category: string
  sale_amount: number
  commission_amount: number
  order_id?: string
  purchase_date: string
  channel?: string
  campaign_id?: string
  conversion_id?: string
}

export interface FeedbackItem {
  date: string
  rating: 'Gostou' | 'Não gostou' | 'Teve problema' | 'Quer recomendações relacionadas'
  comment?: string
  wants_recommendations?: boolean
}

export interface ContactPreferences {
  preferred_categories?: string[]
  desired_frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'never'
  preferred_channels?: string[]
  content_types?: string[]
}

export interface CRMContactTimelineEvent {
  event_type:
    | 'lead_captured'
    | 'consent_granted'
    | 'consent_revoked'
    | 'click'
    | 'product_viewed'
    | 'interaction'
    | 'status_changed'
    | 'purchase_confirmed'
    | 'repurchase_confirmed'
    | 'new_recommendation'
    | 'opt_out'
    | 'data_anonymized'
    | 'feedback_received'
  date: string
  channel?: string
  source?: string
  details: string
}

export interface CRMContactRecord {
  id: string
  user_id?: string
  identifier: string
  name?: string
  channel: CRMChannel
  origin_source?: string
  campaign_id?: string
  lead_id?: string
  first_product_interest?: string
  categories_of_interest?: string[]
  lead_score?: number
  relationship_score: number // 0-100 nível de relacionamento e prioridade operacional
  status: CRMContactStatus
  is_customer: boolean
  is_recurring_customer: boolean
  purchases_count: number
  total_sales_value: number
  total_commission_earned: number // LTV real de comissão
  average_commission: number
  first_purchase_date?: string
  last_purchase_date?: string
  last_interaction_date?: string
  last_click_date?: string
  purchased_products?: PurchasedProductItem[]
  next_best_action?: NextBestActionType | string
  next_best_action_reason?: string
  preferences?: ContactPreferences
  feedback_history?: FeedbackItem[]
  timeline?: CRMContactTimelineEvent[]
  internal_notes?: string
  is_test_data?: boolean
  created: string
  updated: string
}

export interface CRMRecommendationRecord {
  id: string
  user_id?: string
  contact_id: string
  contact_identifier?: string
  product_id: string
  product_title: string
  product_image_url?: string
  product_category?: string
  product_price?: number
  product_commission?: number
  recommendation_type: RecommendationType
  recommendation_score: number // 0-100
  reason: string
  previous_product_title?: string
  suggested_content_angle?: string
  suggested_message?: string
  status: RecommendationStatus
  cadence_check_passed?: boolean
  cadence_block_reason?: string
  is_test_data?: boolean
  created: string
  updated: string
}

export interface CRMConsentLogRecord {
  id: string
  user_id?: string
  contact_id?: string
  identifier: string
  channel: string
  authorized_purpose: string
  consent_text_version?: string
  status: 'active' | 'revoked' | 'updated' | 'expired'
  granted_at?: string
  revoked_at?: string
  origin_source?: string
  ip_masked?: string
  user_agent_short?: string
  notes?: string
  is_test_data?: boolean
  created: string
  updated: string
}

export interface CRMCadenceSettingRecord {
  id: string
  user_id?: string
  channel: string
  min_days_between_messages: number
  max_messages_per_week: number
  allow_educational_content: boolean
  allow_product_recommendations: boolean
  allow_post_purchase_followup: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  created: string
  updated: string
}

export interface CRMDashboardMetrics {
  total_contacts: number
  total_leads: number
  qualified_leads: number
  total_customers: number
  recurring_customers: number
  total_opt_outs: number
  active_consents: number
  lead_to_customer_rate: number
  repurchase_rate: number
  total_commission_earned: number
  total_sales_volume: number
  average_commission_per_customer: number
  ltv_status: 'calculado' | 'dados_insuficientes'
}

export interface CRMFunnelStage {
  stage: string
  count: number
  pct: number
}

export interface CRMCohortItem {
  cohort: string
  acquired: number
  customers: number
  recurring: number
  conversion_rate: string
  repurchase_rate: string
  total_commission: string
  opt_outs: number
}

export interface CRMCategoryRepurchaseItem {
  category: string
  customers: number
  recurring: number
  repurchase_rate: string
  total_commission: string
}

export interface CRMReactivationOpportunity {
  id: string
  name: string
  identifier: string
  type: 'cliente_sem_interacao' | 'lead_qualificado_parado' | 'produto_compativel'
  days_inactive: number
  reason: string
  priority: 'alta' | 'media' | 'baixa'
  channel: string
  is_test_data?: boolean
}

export interface CRMLearningsForSalesIntelligence {
  top_repurchase_categories: CRMCategoryRepurchaseItem[]
  top_channels_for_recurring: Array<{ channel: string; total_contacts: number }>
  ltv_data_status: 'valid_sample' | 'insufficient_data'
  average_commercial_relationship_value: number
}

export interface CRMDashboardResponse {
  success: boolean
  metrics: CRMDashboardMetrics
  funnel: CRMFunnelStage[]
  cohorts: CRMCohortItem[]
  category_repurchase: CRMCategoryRepurchaseItem[]
  reactivation_opportunities: CRMReactivationOpportunity[]
  crm_learnings: CRMLearningsForSalesIntelligence
}

export interface GenerateRecommendationsResponse {
  success: boolean
  blocked_by_consent?: boolean
  contact_id?: string
  cadence_passed?: boolean
  cadence_reason?: string
  total_recommendations: number
  recommendations: CRMRecommendationRecord[]
  message: string
}

export type CRMDynamicSegment =
  | 'todos'
  | 'leads_quentes'
  | 'clientes_recentes'
  | 'clientes_recorrentes'
  | 'interessados_em_eletronicos'
  | 'interessados_em_beleza'
  | 'interessados_em_automotivo'
  | 'sem_interacao_30_dias'
  | 'alto_interesse_sem_compra'
  | 'opt_out'
