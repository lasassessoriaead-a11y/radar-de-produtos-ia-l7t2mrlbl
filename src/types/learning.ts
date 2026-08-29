export type ConfidenceLevel = 'insufficient' | 'low' | 'moderate' | 'high'

export type InsightCategoryType =
  | 'what_works'
  | 'what_fails'
  | 'emerging_pattern'
  | 'pattern_shift'
  | 'recommended_test'
  | 'insufficient_data'
  | 'score_calibration'

export type InsightStatus =
  | 'novo'
  | 'revisado'
  | 'aceito'
  | 'descartado'
  | 'em_teste'
  | 'validado'
  | 'refutado'

export interface SalesInsightRecord {
  id: string
  key: string
  title: string
  category_type: InsightCategoryType
  confidence_level: ConfidenceLevel
  sample_summary?: string
  sample_campaigns_count?: number
  sample_clicks_count?: number
  sample_conversions_count?: number
  sample_impressions_count?: number
  primary_metric_label?: string
  primary_metric_value?: number
  benchmark_comparison?: string
  conclusion_text: string
  recommendation_text: string
  status: InsightStatus
  evidence_data?: Record<string, unknown>
  target_module?: 'hunter' | 'lab' | 'studio' | 'publishing' | 'global'
  created: string
  updated?: string
}

export type ExperimentPriority = 'p1_urgente' | 'p2_alta' | 'p3_media' | 'p4_exploratoria'
export type ExperimentType = 'exploit' | 'explore'
export type ExperimentStatus = 'recomendado' | 'em_execucao' | 'concluido' | 'descartado'

export interface LearningExperimentRecord {
  id: string
  hypothesis_title: string
  hypothesis_detail: string
  version_a_baseline: string
  version_b_challenger: string
  primary_metric: string
  secondary_metric?: string
  rationale: string
  potential_impact: 'baixo' | 'medio' | 'alto'
  confidence: 'baixa' | 'moderada' | 'alta'
  effort: 'baixo' | 'medio' | 'alto'
  priority_level: ExperimentPriority
  experiment_type: ExperimentType
  status: ExperimentStatus
  sample_current?: number
  sample_needed?: number
  p_value_observed?: number
  stat_significance_reached?: boolean
  winner_version?: string
  outcome_notes?: string
  created: string
}

export interface ScoreCalibrationRecord {
  id: string
  title: string
  score_type: string
  diagnosis: string
  evidence_summary: string
  proposed_weights: Record<string, number>
  current_weights?: Record<string, number>
  status: 'pending_review' | 'approved_by_user' | 'rejected_by_user'
  user_decision_note?: string
  decided_at?: string
  created: string
}

export interface IntelligenceSummary {
  campaigns_count: number
  variations_count: number
  conversions_count: number
  total_clicks: number
  total_impressions: number
  total_sales: number
  total_commission: number
  total_costs: number
  net_profit: number
  roi_percentage: number
  conversion_rate: number
  ctr_percentage: number
}

export interface MatrixCombinationRow {
  id: string
  combination_name: string
  angle: string
  format: string
  price_tier: string
  channel: string
  sample_campaigns: number
  sample_clicks: number
  sample_conversions: number
  ctr: number
  conversion_rate: number
  roi: number
  confidence: ConfidenceLevel
}

export interface AiLearningReport {
  executive_summary: string
  dna_winner_product: string
  dna_winner_campaign: string
  dna_winner_creative?: string
  top_bottlenecks: string[]
  emerging_patterns: string[]
  losing_strength_patterns: string[]
  recommended_tests: Array<{
    hypothesis: string
    test_a_b: string
    primary_metric: string
    impact: string
    confidence: string
    effort: string
    type: string
  }>
  recommendations_for_hunter: string
  recommendations_for_lab: string
  recommendations_for_studio: string
}

export interface TemporalHeatmapCell {
  day_of_week: string
  hour_slot: string
  clicks: number
  conversions: number
  conv_rate: number
  has_sample: boolean
}
