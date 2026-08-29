import pb from '@/lib/pocketbase/client'
import type {
  OrchestratorConfigRecord,
  OrchestratorPolicyRecord,
  OrchestratorActionRecord,
  DecisionLogRecord,
  ShadowLogRecord,
  OrchestratorEvaluationMetrics,
  AutonomyLevel,
  PrimaryObjective,
  TargetModule,
} from '@/types/orchestrator'

export const orchestratorService = {
  // 1. Get or initialize global config
  async getConfig(): Promise<OrchestratorConfigRecord> {
    try {
      const records = await pb
        .collection('orchestrator_config')
        .getFullList<OrchestratorConfigRecord>({
          filter: 'config_key = "global_orchestrator"',
        })
      if (records.length > 0) {
        return records[0]
      }
    } catch {
      /* intentionally ignored */
    }

    // Fallback default
    return {
      id: 'default_config',
      config_key: 'global_orchestrator',
      autonomy_level: 1, // Default Level 1 - Recommend
      shadow_mode_active: true,
      kill_switch_active: false,
      primary_objective: 'maximize_commission',
      paused_modules: [],
      guardrails: {
        max_campaigns_per_day: 10,
        max_creatives_per_day: 20,
        max_publications_per_day: 5,
        max_repurchase_recs_per_day: 15,
        max_actions_per_module: 25,
        max_daily_generation_cost: 50.0,
        max_actions_per_contact_week: 2,
        min_score_threshold: 75,
        max_acceptable_risk: 70,
      },
      financial_limits: {
        limit_per_action: 0,
        daily_limit: 0,
        weekly_limit: 0,
        monthly_limit: 0,
        paid_traffic_autonomous_enabled: false,
      },
      allowed_channels: ['telegram', 'instagram', 'tiktok', 'whatsapp'],
      blocked_categories: [],
      allowed_categories: ['Eletrônicos & Áudio', 'Beleza & Cuidados Pessoais', 'Cozinha & Casa'],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    }
  },

  // 2. Update config fields
  async updateConfig(
    id: string,
    data: Partial<OrchestratorConfigRecord>,
  ): Promise<OrchestratorConfigRecord> {
    return await pb.collection('orchestrator_config').update<OrchestratorConfigRecord>(id, data)
  },

  // 3. Update Autonomy Level via API hook
  async updateAutonomyLevel(level: AutonomyLevel, confirmLevel5 = false): Promise<any> {
    return await pb.send('/backend/v1/orchestrator/update-autonomy-level', {
      method: 'POST',
      body: {
        level,
        confirm_advanced_level_5: confirmLevel5,
      },
    })
  },

  // 4. Toggle Kill Switch via API hook
  async toggleKillSwitch(active: boolean, reason?: string): Promise<any> {
    return await pb.send('/backend/v1/orchestrator/toggle-kill-switch', {
      method: 'POST',
      body: {
        active,
        reason,
      },
    })
  },

  // 5. Toggle Individual Module Pause via API hook
  async toggleModulePause(module: TargetModule, pause: boolean): Promise<any> {
    return await pb.send('/backend/v1/orchestrator/toggle-module-pause', {
      method: 'POST',
      body: {
        module,
        pause,
      },
    })
  },

  // 6. List Actions with filters
  async getActions(filter?: string, sort = '-priority_score'): Promise<OrchestratorActionRecord[]> {
    return await pb.collection('orchestrator_actions').getFullList<OrchestratorActionRecord>({
      filter: filter || '',
      sort,
    })
  },

  // 7. Update Action status or details
  async updateAction(
    id: string,
    data: Partial<OrchestratorActionRecord>,
  ): Promise<OrchestratorActionRecord> {
    return await pb.collection('orchestrator_actions').update<OrchestratorActionRecord>(id, data)
  },

  // 8. Execute Action (or manual user approval) via API hook
  async executeAction(actionId: string, forceApproval = true, notes?: string): Promise<any> {
    return await pb.send('/backend/v1/orchestrator/execute-action', {
      method: 'POST',
      body: {
        action_id: actionId,
        force_approval: forceApproval,
        notes,
      },
    })
  },

  // 9. Simulate Action via API hook
  async simulateAction(actionId: string): Promise<any> {
    return await pb.send('/backend/v1/orchestrator/simulate-action', {
      method: 'POST',
      body: {
        action_id: actionId,
      },
    })
  },

  // 10. Batch approve low-risk actions
  async batchApprove(actionIds: string[]): Promise<any> {
    return await pb.send('/backend/v1/orchestrator/batch-approve', {
      method: 'POST',
      body: {
        action_ids: actionIds,
      },
    })
  },

  // 11. Calculate deterministic scores
  async calculateScores(params: Record<string, any>): Promise<any> {
    return await pb.send('/backend/v1/orchestrator/calculate-scores', {
      method: 'POST',
      body: params,
    })
  },

  // 12. Get evaluation metrics
  async getEvaluationMetrics(): Promise<OrchestratorEvaluationMetrics> {
    return await pb.send<OrchestratorEvaluationMetrics>(
      '/backend/v1/orchestrator/evaluation-metrics',
      {
        method: 'GET',
      },
    )
  },

  // 13. Policies list and update
  async getPolicies(): Promise<OrchestratorPolicyRecord[]> {
    return await pb.collection('orchestrator_policies').getFullList<OrchestratorPolicyRecord>({
      sort: 'priority_order',
    })
  },

  async togglePolicy(id: string, isActive: boolean): Promise<OrchestratorPolicyRecord> {
    return await pb.collection('orchestrator_policies').update<OrchestratorPolicyRecord>(id, {
      is_active: isActive,
    })
  },

  // 14. Decision logs
  async getDecisionLogs(limit = 100): Promise<DecisionLogRecord[]> {
    return await pb.collection('orchestrator_decision_log').getFullList<DecisionLogRecord>({
      sort: '-created',
      batch: limit,
    })
  },

  // 15. Shadow mode logs
  async getShadowLogs(): Promise<ShadowLogRecord[]> {
    return await pb.collection('orchestrator_shadow_log').getFullList<ShadowLogRecord>({
      sort: '-created',
    })
  },

  // 16. Create a new custom or detected action
  async createAction(data: Partial<OrchestratorActionRecord>): Promise<OrchestratorActionRecord> {
    return await pb.collection('orchestrator_actions').create<OrchestratorActionRecord>(data)
  },
}
