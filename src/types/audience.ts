// Type definitions for Phase 7: Radar de Público & Demand Discovery Engine

export type IntentLevel = 'high' | 'medium' | 'low' | 'none'
export type SignalClassification =
  | 'market_signal'
  | 'audience_context'
  | 'content_opportunity'
  | 'potential_interaction'

export type TermType =
  | 'problem'
  | 'desire'
  | 'solution'
  | 'comparison'
  | 'recommendation'
  | 'buying_intent'
  | 'doubt'
  | 'objection'
  | 'complaint'
  | 'alternative'
  | 'usage_context'

export type TrendStatus = 'growing' | 'stable' | 'falling' | 'insufficient_data'

export type OpportunityType =
  | 'question'
  | 'discussion'
  | 'trend'
  | 'objection'
  | 'community'
  | 'theme'
  | 'inbound_lead'

export type OpportunityStatus =
  | 'new'
  | 'in_progress'
  | 'used_in_lab'
  | 'used_in_studio'
  | 'replied_manually'
  | 'ignored'
  | 'archived'

export type InboundLeadStatus =
  | 'new'
  | 'interested'
  | 'engaged'
  | 'qualified'
  | 'customer'
  | 'uninterested'
  | 'opt_out'

export type ConsentStatus = 'active' | 'revoked' | 'expired'
export type LeadScoreTier = 'hot' | 'interested' | 'potential' | 'cold'

export interface AudienceProviderMeta {
  id: string
  name: string
  category: string
  status: 'pending_integration' | 'active' | 'configured'
  status_label: string
  is_primary: boolean
  order: number
  description: string
  supported_features: string[]
  required_credentials: string[]
  is_configured: boolean
}

export interface AudienceSignalRecord {
  id: string
  user_id?: string
  external_id: string
  source: string // 'reddit', 'youtube', 'forums', etc.
  provider?: string
  is_test_data?: boolean
  source_url?: string
  title: string
  snippet: string
  author_display?: string
  community?: string
  published_at?: string
  matched_keyword?: string
  category?: string
  product_id?: string
  campaign_id?: string
  intent_level: IntentLevel
  intent_score: number
  intent_reason: string
  relevance_score: number
  relevance_reason: string
  signal_classification: SignalClassification
  match_explanation: string
  suggested_opportunity?: string
  suggested_reply?: string
  question_detected?: string
  objection_detected?: string
  desire_detected?: string
  upvotes?: number
  comments_count?: number
  raw_metadata?: Record<string, unknown>
  created: string
  updated: string
}

export interface IntentTermItem {
  term: string
  reason: string
  type?: TermType
  stage?: 'high' | 'medium' | 'low'
  signals_count?: number
}

export interface AudienceTermsBankRecord {
  id: string
  user_id?: string
  product_id?: string
  product_title?: string
  category: string
  term: string
  term_type: TermType
  intent_stage: 'high' | 'medium' | 'low'
  stage_reason?: string
  signal_count: number
  trend_status: TrendStatus
  is_test_data?: boolean
  last_queried_at?: string
  is_active: boolean
  created: string
  updated: string
}

export interface AudienceOpportunityRecord {
  id: string
  user_id?: string
  title: string
  opportunity_type: OpportunityType
  description?: string
  action_suggested: string
  suggested_content_angle?: string
  suggested_copy_hook?: string
  suggested_reply_text?: string
  source?: string
  provider?: string
  is_test_data?: boolean
  source_url?: string
  community?: string
  product_id?: string
  product_title?: string
  campaign_id?: string
  intent_score: number
  relevance_score: number
  priority_level: 'hot' | 'high' | 'medium' | 'low'
  status: OpportunityStatus
  signal_id?: string
  lead_id?: string
  metadata?: Record<string, unknown>
  created: string
  updated: string
}

export interface LeadTimelineEvent {
  event_type: string
  date: string
  channel?: string
  source?: string
  details: string
}

export interface InboundLeadRecord {
  id: string
  user_id?: string
  identifier: string
  name?: string
  channel:
    | 'landing_page'
    | 'form'
    | 'telegram'
    | 'newsletter'
    | 'campaign_page'
    | 'own_channel'
    | 'other'
  origin_source?: string
  campaign_id?: string
  product_id?: string
  product_interest?: string
  declared_intent?: string
  lead_score: number
  score_tier: LeadScoreTier
  status: InboundLeadStatus
  consent_status: ConsentStatus
  consent_date?: string
  consent_revoked_at?: string
  authorized_purpose?: string
  consent_text_version?: string
  clicks_count?: number
  interactions_count?: number
  has_converted?: boolean
  conversion_amount?: number
  notes?: string
  timeline?: LeadTimelineEvent[]
  metadata?: Record<string, unknown>
  created: string
  updated: string
}

export interface IntentMapResponse {
  high_intent: IntentTermItem[]
  medium_intent: IntentTermItem[]
  low_intent: IntentTermItem[]
  terms_bank: Array<{
    term: string
    type: TermType
    stage: 'high' | 'medium' | 'low'
    reason: string
  }>
  recurring_questions: Array<{
    question: string
    signals_count: number
    angle_suggested: string
  }>
  common_objections: Array<{
    objection: string
    frequency: string
    counter_argument: string
  }>
  common_desires: Array<{
    desire: string
    context: string
  }>
  suggested_communities: Array<{
    source: string
    community: string
    theme: string
    relevance: number
    recommended_content: string
  }>
}

export interface DemandReportResponse {
  period_days: number
  sample_size: number
  metrics: {
    total_signals: number
    high_intent_signals: number
    medium_intent_signals: number
    low_intent_signals: number
    total_opportunities: number
    active_inbound_leads: number
    hot_leads: number
    trend_classification: TrendStatus
  }
  top_communities: Array<{
    community: string
    signals_count: number
    source: string
  }>
  top_questions: Array<{
    question: string
    count: number
  }>
  top_objections: Array<{
    objection: string
    count: number
  }>
  top_opportunities: AudienceOpportunityRecord[]
}
