// Types for Phase 9 - Autonomous Orchestrator with Governance and Human Approval

export type AutonomyLevel = 0 | 1 | 2 | 3 | 4 | 5

export type PrimaryObjective =
  | 'maximize_commission'
  | 'maximize_net_profit'
  | 'increase_conversion'
  | 'find_winner_products'
  | 'increase_repurchase'
  | 'build_audience'

export type ActionType =
  | 'ANALYZE_PRODUCT'
  | 'ADD_TO_WATCHLIST'
  | 'CREATE_CAMPAIGN_DRAFT'
  | 'CREATE_CREATIVE_DRAFT'
  | 'CREATE_TEST_VARIATION'
  | 'PREPARE_PUBLICATION'
  | 'SUGGEST_PUBLICATION'
  | 'CREATE_CONTENT_OPPORTUNITY'
  | 'CREATE_CRM_RECOMMENDATION'
  | 'CREATE_REPURCHASE_RECOMMENDATION'
  | 'PREPARE_FOLLOWUP'
  | 'REQUEST_REVIEW'
  | 'GENERATE_REPORT'
  | 'RECALCULATE_SCORE'

export type TargetModule =
  | 'radar'
  | 'hunter'
  | 'lab'
  | 'studio'
  | 'publishing'
  | 'performance'
  | 'sales_intelligence'
  | 'audience'
  | 'crm'
  | 'repurchase'

export type ActionStatus =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'postponed'
  | 'in_progress'
  | 'completed'
  | 'blocked'
  | 'failed'
  | 'shadow_logged'

export type ConfidenceTier = 'insufficient' | 'low' | 'moderate' | 'high'
export type RiskTier = 'low' | 'medium' | 'high'

export type BlockReasonType =
  | 'consent_missing'
  | 'opt_out'
  | 'policy_violation'
  | 'guardrail_cap'
  | 'module_paused'
  | 'kill_switch'
  | 'integration_pending'
  | 'none'

export interface OrchestratorGuardrails {
  max_campaigns_per_day: number
  max_creatives_per_day: number
  max_publications_per_day: number
  max_repurchase_recs_per_day: number
  max_actions_per_module: number
  max_daily_generation_cost: number
  max_actions_per_contact_week: number
  min_score_threshold: number
  max_acceptable_risk: number
}

export interface FinancialLimits {
  limit_per_action: number
  daily_limit: number
  weekly_limit: number
  monthly_limit: number
  paid_traffic_autonomous_enabled: boolean
}

export interface OrchestratorConfigRecord {
  id: string
  config_key: string
  autonomy_level: AutonomyLevel
  shadow_mode_active: boolean
  kill_switch_active: boolean
  kill_switch_reason?: string
  kill_switch_activated_at?: string
  primary_objective: PrimaryObjective
  paused_modules: TargetModule[]
  guardrails: OrchestratorGuardrails
  financial_limits: FinancialLimits
  allowed_channels: string[]
  blocked_categories: string[]
  allowed_categories: string[]
  operating_hours?: {
    start: string
    end: string
    enforce: boolean
  }
  consecutive_failures_count?: number
  auto_demoted_at?: string
  auto_demote_reason?: string
  created: string
  updated: string
}

export interface OrchestratorPolicyRecord {
  id: string
  policy_code: string
  title: string
  description: string
  category:
    | 'safety'
    | 'budget'
    | 'publishing'
    | 'crm_contact'
    | 'content_quality'
    | 'compliance'
    | 'channel'
  rule_type: 'hard_block' | 'require_approval' | 'threshold_check' | 'channel_block' | 'cadence_cap'
  condition_json: Record<string, any>
  is_active: boolean
  priority_order: number
  is_system_immutable: boolean
  created: string
  updated: string
}

export interface OrchestratorActionRecord {
  id: string
  idempotency_key: string
  action_type: ActionType
  target_module: TargetModule
  title: string
  summary: string
  reasoning: string
  evidence_summary: string
  evidence_data?: Record<string, any>
  evidence_strength: 'insufficient' | 'weak' | 'moderate' | 'strong'
  is_experiment_hypothesis: boolean
  confidence_score: number
  confidence_tier: ConfidenceTier
  risk_score: number
  risk_tier: RiskTier
  priority_score: number
  is_external_action: boolean
  is_financial_action: boolean
  estimated_cost: number
  expected_impact: string
  is_reversible: boolean
  reversal_instructions?: string
  status: ActionStatus
  block_reason_type: BlockReasonType
  block_message?: string
  integration_status: 'native_internal' | 'pending_integration' | 'connected'
  pending_integration_name?: string
  entity_id?: string
  entity_type?: string
  entity_title?: string
  payload_data?: Record<string, any>
  simulation_snapshot?: Record<string, any>
  execution_result?: Record<string, any>
  post_execution_metrics?: Record<string, any>
  approved_by?: string
  approved_at?: string
  rejected_reason?: string
  postponed_until?: string
  execution_attempts?: number
  max_retries?: number
  last_retry_at?: string
  is_test_data?: boolean
  test_data_note?: string
  created: string
  updated: string
}

export interface DecisionLogRecord {
  id: string
  action_id: string
  action_type: string
  target_module: string
  situation_observed: string
  proposed_decision: string
  evidence_used?: string
  sample_size?: number
  confidence_score?: number
  risk_score?: number
  priority_score?: number
  applied_policies?: string[]
  autonomy_level_at_time: number
  decision_outcome:
    | 'executed_auto'
    | 'approved_by_user'
    | 'rejected_by_user'
    | 'postponed'
    | 'blocked_consent'
    | 'blocked_optout'
    | 'blocked_policy'
    | 'blocked_guardrail'
    | 'shadow_logged'
    | 'failed'
  executed_by?: string
  execution_status: 'success' | 'failure' | 'partial' | 'cancelled' | 'blocked' | 'none'
  execution_details?: Record<string, any>
  feedback_notes?: string
  is_shadow_mode?: boolean
  is_test_data?: boolean
  created: string
  updated: string
}

export interface ShadowLogRecord {
  id: string
  hypothetical_action: string
  action_type: string
  target_module: string
  target_entity_id?: string
  target_entity_title?: string
  reasoning?: string
  evidence_data?: Record<string, any>
  confidence_score: number
  risk_score: number
  expected_outcome?: string
  user_actual_action?: string
  actual_outcome?: string
  comparison_status:
    | 'pending_outcome'
    | 'ai_matched_user'
    | 'ai_diverged_user'
    | 'user_inaction_positive'
    | 'user_inaction_negative'
  comparison_analysis?: string
  is_test_data?: boolean
  created: string
  updated: string
}

export interface OrchestratorEvaluationMetrics {
  total_actions: number
  pending_approval: number
  approved_count: number
  completed_count: number
  rejected_count: number
  blocked_count: number
  approval_rate_percent: number
  rejection_rate_percent: number
  average_confidence_score: number
  average_risk_score: number
  low_risk_actions_count: number
  high_risk_actions_count: number
  insufficient_data_hypotheses_count: number
  test_data_actions_count: number
  total_decision_logs: number
  total_shadow_comparisons: number
  promotion_recommendation: {
    is_eligible: boolean
    message: string
  }
}
