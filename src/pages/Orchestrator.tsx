import React, { useState, useEffect } from 'react'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Activity,
  AlertTriangle,
  Play,
  Pause,
  Sliders,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  Sparkles,
  TrendingUp,
  Cpu,
  RefreshCw,
  FileText,
  Lock,
  Layers,
  HelpCircle,
  Filter,
  CheckCheck,
  ArrowRight,
  Database,
  Radio,
  BarChart3,
  Flame,
  Info,
  Calendar,
  DollarSign,
  UserCheck,
  Ban,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { orchestratorService } from '@/services/orchestrator'
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
import { cn } from '@/lib/utils'

export default function OrchestratorPage() {
  const [config, setConfig] = useState<OrchestratorConfigRecord | null>(null)
  const [actions, setActions] = useState<OrchestratorActionRecord[]>([])
  const [policies, setPolicies] = useState<OrchestratorPolicyRecord[]>([])
  const [decisionLogs, setDecisionLogs] = useState<DecisionLogRecord[]>([])
  const [shadowLogs, setShadowLogs] = useState<ShadowLogRecord[]>([])
  const [metrics, setMetrics] = useState<OrchestratorEvaluationMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('approvals')

  // Modals state
  const [selectedActionForEvidence, setSelectedActionForEvidence] =
    useState<OrchestratorActionRecord | null>(null)
  const [selectedActionForSimulation, setSelectedActionForSimulation] =
    useState<OrchestratorActionRecord | null>(null)
  const [simulationData, setSimulationData] = useState<any>(null)
  const [isSimulating, setIsSimulating] = useState(false)
  const [selectedActionForEdit, setSelectedActionForEdit] =
    useState<OrchestratorActionRecord | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editReasoning, setEditReasoning] = useState('')
  const [actionFilterModule, setActionFilterModule] = useState<string>('all')
  const [actionFilterStatus, setActionFilterStatus] = useState<string>('all')

  // Autonomy modal
  const [showLevelConfirmModal, setShowLevelConfirmModal] = useState(false)
  const [targetAutonomyLevel, setTargetAutonomyLevel] = useState<AutonomyLevel>(1)

  // Batch selection
  const [selectedActionIds, setSelectedActionIds] = useState<string[]>([])
  const [isBatchProcessing, setIsBatchProcessing] = useState(false)

  // Kill Switch state
  const [showKillSwitchConfirm, setShowKillSwitchConfirm] = useState(false)
  const [killSwitchReasonInput, setKillSwitchReasonInput] = useState('')

  // Load all orchestrator data
  const loadData = async () => {
    try {
      setLoading(true)
      const [cfg, acts, pols, logs, sLogs, mets] = await Promise.all([
        orchestratorService.getConfig(),
        orchestratorService.getActions('', '-priority_score'),
        orchestratorService.getPolicies(),
        orchestratorService.getDecisionLogs(50),
        orchestratorService.getShadowLogs(),
        orchestratorService.getEvaluationMetrics().catch(() => null),
      ])

      setConfig(cfg)
      setActions(acts)
      setPolicies(pols)
      setDecisionLogs(logs)
      setShadowLogs(sLogs)
      setMetrics(mets)
    } catch (error) {
      console.error('Error loading orchestrator data:', error)
      toast.error('Erro ao carregar dados do Orquestrador.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Handle Autonomy Level Change
  const handleAutonomyChange = async (newLevel: AutonomyLevel) => {
    if (newLevel === config?.autonomy_level) return

    if (newLevel === 5) {
      setTargetAutonomyLevel(5)
      setShowLevelConfirmModal(true)
      return
    }

    try {
      await orchestratorService.updateAutonomyLevel(newLevel, false)
      toast.success(`Nível de Autonomia alterado para NÍVEL ${newLevel}.`)
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Falha ao alterar nível de autonomia.')
    }
  }

  const confirmLevel5 = async () => {
    try {
      await orchestratorService.updateAutonomyLevel(5, true)
      toast.success('NÍVEL 5 (Autonomia Avançada) ativado.')
      setShowLevelConfirmModal(false)
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao ativar Nível 5.')
    }
  }

  // Handle Kill Switch
  const handleToggleKillSwitch = async () => {
    if (!config) return
    const newState = !config.kill_switch_active
    try {
      await orchestratorService.toggleKillSwitch(
        newState,
        killSwitchReasonInput || 'Acionado via Central do Orquestrador',
      )
      setShowKillSwitchConfirm(false)
      setKillSwitchReasonInput('')
      toast.warning(
        newState
          ? 'PAUSA TOTAL ATIVADA: Toda automação foi suspensa.'
          : 'Automação retomada com segurança.',
      )
      loadData()
    } catch (err: any) {
      toast.error('Erro ao acionar Kill Switch.')
    }
  }

  // Handle Module Pause
  const handleToggleModulePause = async (module: TargetModule) => {
    if (!config) return
    const isPaused = config.paused_modules?.includes(module)
    try {
      await orchestratorService.toggleModulePause(module, !isPaused)
      toast.info(isPaused ? `Módulo ${module} retomado.` : `Módulo ${module} pausado.`)
      loadData()
    } catch (err) {
      toast.error('Erro ao alterar status do módulo.')
    }
  }

  // Handle Action Single Approval
  const handleApproveAction = async (action: OrchestratorActionRecord) => {
    try {
      const res = await orchestratorService.executeAction(action.id, true)
      if (res.success) {
        toast.success(`Ação "${action.title}" executada com sucesso!`)
      } else {
        toast.error(`Falha: ${res.error}`)
      }
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao executar ação.')
    }
  }

  // Handle Action Rejection
  const handleRejectAction = async (action: OrchestratorActionRecord) => {
    try {
      await orchestratorService.updateAction(action.id, {
        status: 'rejected',
        rejected_reason: 'Rejeitado manualmente pelo usuário.',
      })
      toast.info(`Ação "${action.title}" rejeitada. Feedback registrado para aprendizado.`)
      loadData()
    } catch (err) {
      toast.error('Erro ao rejeitar ação.')
    }
  }

  // Handle Action Postpone
  const handlePostponeAction = async (action: OrchestratorActionRecord) => {
    try {
      await orchestratorService.updateAction(action.id, {
        status: 'postponed',
        postponed_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      toast.info(`Ação adiada por 24 horas.`)
      loadData()
    } catch (err) {
      toast.error('Erro ao adiar ação.')
    }
  }

  // Handle Simulate Action
  const handleSimulateAction = async (action: OrchestratorActionRecord) => {
    setSelectedActionForSimulation(action)
    setIsSimulating(true)
    try {
      const res = await orchestratorService.simulateAction(action.id)
      setSimulationData(res.simulation)
    } catch (err) {
      toast.error('Erro ao simular ação.')
    } finally {
      setIsSimulating(false)
    }
  }

  // Handle Edit Action
  const handleOpenEdit = (action: OrchestratorActionRecord) => {
    setSelectedActionForEdit(action)
    setEditTitle(action.title)
    setEditReasoning(action.reasoning)
  }

  const handleSaveEdit = async () => {
    if (!selectedActionForEdit) return
    try {
      await orchestratorService.updateAction(selectedActionForEdit.id, {
        title: editTitle,
        reasoning: editReasoning,
      })
      toast.success('Ação editada com sucesso.')
      setSelectedActionForEdit(null)
      loadData()
    } catch (err) {
      toast.error('Erro ao salvar edições.')
    }
  }

  // Handle Batch Approval (Strictly Low Risk only)
  const handleBatchApprove = async () => {
    if (selectedActionIds.length === 0) return
    setIsBatchProcessing(true)
    try {
      const res = await orchestratorService.batchApprove(selectedActionIds)
      if (res.approved_count > 0) {
        toast.success(`${res.approved_count} ações de baixo risco aprovadas em lote!`)
      }
      if (res.rejected_count > 0) {
        toast.warning(
          `${res.rejected_count} ações foram recusadas do lote por regras de risco/segurança.`,
        )
      }
      setSelectedActionIds([])
      loadData()
    } catch (err: any) {
      toast.error(err?.message || 'Erro no processamento em lote.')
    } finally {
      setIsBatchProcessing(false)
    }
  }

  // Handle Objective Change
  const handleObjectiveChange = async (obj: PrimaryObjective) => {
    if (!config) return
    try {
      await orchestratorService.updateConfig(config.id, { primary_objective: obj })
      toast.success('Objetivo Principal atualizado.')
      loadData()
    } catch (err) {
      toast.error('Erro ao salvar objetivo.')
    }
  }

  // Handle Policy Toggle
  const handleTogglePolicy = async (policy: OrchestratorPolicyRecord) => {
    if (policy.is_system_immutable) {
      toast.error('Esta política de segurança/LGPD é imutável pelo sistema.')
      return
    }
    try {
      await orchestratorService.togglePolicy(policy.id, !policy.is_active)
      toast.info(`Política "${policy.title}" ${!policy.is_active ? 'ativada' : 'desativada'}.`)
      loadData()
    } catch (err) {
      toast.error('Erro ao alterar política.')
    }
  }

  // Filter actions
  const filteredActions = actions.filter((act) => {
    if (actionFilterModule !== 'all' && act.target_module !== actionFilterModule) return false
    if (actionFilterStatus !== 'all' && act.status !== actionFilterStatus) return false
    return true
  })

  const pendingApprovals = filteredActions.filter((a) => a.status === 'pending_approval')
  const completedActions = filteredActions.filter((a) => a.status === 'completed')
  const blockedActions = filteredActions.filter((a) => a.status === 'blocked')

  // Confidence helper
  const getConfidenceBadge = (tier: string, score: number) => {
    switch (tier) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Alta ({score}%)
          </span>
        )
      case 'moderate':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Moderada ({score}%)
          </span>
        )
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
            Baixa ({score}%)
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />⚪ Dados Insuficientes ({score}
            %)
          </span>
        )
    }
  }

  // Risk helper
  const getRiskBadge = (tier: string, score: number) => {
    switch (tier) {
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            Alto Risco ({score} pts)
          </span>
        )
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            Médio Risco ({score} pts)
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            Baixo Risco ({score} pts)
          </span>
        )
    }
  }

  // Module names helper
  const getModuleName = (mod: string) => {
    const map: Record<string, string> = {
      radar: 'Radar de Produtos',
      hunter: 'Caçador de Oportunidades',
      lab: 'Laboratório de Campanhas',
      studio: 'Estúdio Criativo',
      publishing: 'Central de Publicação',
      performance: 'Performance & ROI',
      sales_intelligence: 'Inteligência de Vendas',
      audience: 'Radar de Público',
      crm: 'CRM',
      repurchase: 'Recompra',
    }
    return map[mod] || mod
  }

  const allModules: TargetModule[] = [
    'hunter',
    'radar',
    'audience',
    'crm',
    'repurchase',
    'lab',
    'studio',
    'publishing',
    'performance',
    'sales_intelligence',
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Kill Switch Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-gradient-to-r from-[#121420] via-[#161928] to-[#121420] p-6 rounded-2xl border border-[#21263B] shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7000FF] to-[#00F2FF] flex items-center justify-center shadow-[0_0_20px_rgba(0,242,255,0.3)]">
              <Cpu className="w-5 h-5 text-[#0A0B10]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">ORQUESTRADOR IA</h1>
                <Badge className="bg-[#7000FF]/20 text-[#00F2FF] border-[#7000FF]/40 text-[10px] font-mono">
                  FASE 9 • GOVERNANÇA & AUTONOMIA
                </Badge>
                <Badge
                  variant="outline"
                  className="text-emerald-400 border-emerald-500/30 text-[10px] font-mono"
                >
                  NÍVEL {config?.autonomy_level ?? 1} ATIVO
                </Badge>
              </div>
              <p className="text-xs text-gray-400">
                Central de supervisão de decisões autônomas, aprovação humana e salvaguardas de
                conformidade.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Kill Switch */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="h-9 border-[#2B3048] bg-[#141724] text-xs text-gray-300 hover:text-white"
          >
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1.5', loading && 'animate-spin')} />
            Atualizar
          </Button>

          {/* Kill Switch Big Button */}
          <Button
            variant={config?.kill_switch_active ? 'default' : 'destructive'}
            size="sm"
            onClick={() => setShowKillSwitchConfirm(true)}
            className={cn(
              'h-9 font-bold text-xs gap-1.5 shadow-lg transition-all',
              config?.kill_switch_active
                ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse'
                : 'bg-red-600 hover:bg-red-700 text-white',
            )}
          >
            <ShieldAlert className="w-4 h-4" />
            {config?.kill_switch_active
              ? 'RETOMAR OPERAÇÃO (KILL SWITCH ATIVO)'
              : 'PAUSAR TODA AUTOMAÇÃO (KILL SWITCH)'}
          </Button>
        </div>
      </div>

      {/* Kill Switch Alert Banner if Active */}
      {config?.kill_switch_active && (
        <div className="p-4 rounded-xl bg-red-950/50 border border-red-500/50 flex items-center justify-between text-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 animate-bounce" />
            <div>
              <div className="font-bold text-sm text-red-300">
                KILL SWITCH EM EXECUÇÃO: TODA AUTOMAÇÃO ESTÁ PAUSADA
              </div>
              <div className="text-xs text-red-400/80">
                Motivo: {config.kill_switch_reason || 'Pausa de emergência acionada pelo operador.'}{' '}
                • Ações em andamento foram congeladas com segurança.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowKillSwitchConfirm(true)}
            className="border-red-400/40 text-red-300 hover:bg-red-900/40"
          >
            Desativar Kill Switch
          </Button>
        </div>
      )}

      {/* Top Governance Control Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Nível de Autonomia */}
        <Card className="bg-[#10121B] border-[#1F2335]">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">Nível de Autonomia</span>
              <Badge className="bg-[#00F2FF]/10 text-[#00F2FF] border-[#00F2FF]/30 font-mono text-[10px]">
                Nível {config?.autonomy_level}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <Select
              value={String(config?.autonomy_level ?? 1)}
              onValueChange={(val) => handleAutonomyChange(Number(val) as AutonomyLevel)}
            >
              <SelectTrigger className="w-full bg-[#161925] border-[#292F47] text-xs h-9 font-semibold text-white">
                <SelectValue placeholder="Selecione o nível" />
              </SelectTrigger>
              <SelectContent className="bg-[#161925] border-[#292F47] text-white">
                <SelectItem value="0" className="text-xs">
                  NÍVEL 0 — Somente Observar
                </SelectItem>
                <SelectItem value="1" className="text-xs font-bold text-[#00F2FF]">
                  NÍVEL 1 — Recomendar (Padrão Inicial)
                </SelectItem>
                <SelectItem value="2" className="text-xs">
                  NÍVEL 2 — Preparar Rascunhos
                </SelectItem>
                <SelectItem value="3" className="text-xs text-amber-300">
                  NÍVEL 3 — Executar com Aprovação
                </SelectItem>
                <SelectItem value="4" className="text-xs text-emerald-300">
                  NÍVEL 4 — Automação Controlada
                </SelectItem>
                <SelectItem value="5" className="text-xs text-purple-300">
                  NÍVEL 5 — Autonomia Avançada (Bloqueado)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-gray-400">
              {config?.autonomy_level === 0 &&
                'Apenas observa métricas e dados. Não propõe ações operacionais.'}
              {config?.autonomy_level === 1 &&
                'Identifica oportunidades e explica motivos; execução 100% manual.'}
              {config?.autonomy_level === 2 &&
                'Prepara rascunhos de campanhas, criativos e mensagens sem publicar.'}
              {config?.autonomy_level === 3 &&
                'Prepara ações e exige Aprovar / Rejeitar / Editar antes de rodar.'}
              {config?.autonomy_level === 4 &&
                'Executa automaticamente ações de baixo risco pré-autorizadas.'}
              {config?.autonomy_level === 5 &&
                'Autonomia estendida com limites rígidos (exige histórico e liberação).'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Objetivo Estratégico */}
        <Card className="bg-[#10121B] border-[#1F2335]">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">Objetivo Principal</span>
              <Flame className="w-3.5 h-3.5 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <Select
              value={config?.primary_objective || 'maximize_commission'}
              onValueChange={(val) => handleObjectiveChange(val as PrimaryObjective)}
            >
              <SelectTrigger className="w-full bg-[#161925] border-[#292F47] text-xs h-9 font-semibold text-white">
                <SelectValue placeholder="Objetivo" />
              </SelectTrigger>
              <SelectContent className="bg-[#161925] border-[#292F47] text-white">
                <SelectItem value="maximize_commission" className="text-xs">
                  Maximizar Comissão
                </SelectItem>
                <SelectItem value="maximize_net_profit" className="text-xs">
                  Maximizar Lucro Líquido
                </SelectItem>
                <SelectItem value="increase_conversion" className="text-xs">
                  Aumentar Conversão
                </SelectItem>
                <SelectItem value="find_winner_products" className="text-xs">
                  Encontrar Produtos Vencedores
                </SelectItem>
                <SelectItem value="increase_repurchase" className="text-xs">
                  Aumentar Recompra (CRM)
                </SelectItem>
                <SelectItem value="build_audience" className="text-xs">
                  Construir Audiência
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-gray-400">
              Pondera o Priority Score (0–100) das recomendações sem violar guardrails de segurança.
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Modo Sombra (Shadow Mode) */}
        <Card className="bg-[#10121B] border-[#1F2335]">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">Modo Sombra</span>
              <Eye className="w-3.5 h-3.5 text-[#00F2FF]" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            <div className="flex items-center justify-between h-9">
              <span className="text-xs font-bold text-white">
                {config?.shadow_mode_active ? 'ATIVO (Gravando Hipóteses)' : 'DESATIVADO'}
              </span>
              <Switch
                checked={config?.shadow_mode_active ?? true}
                onCheckedChange={async (checked) => {
                  if (!config) return
                  await orchestratorService.updateConfig(config.id, { shadow_mode_active: checked })
                  toast.info(`Modo Sombra ${checked ? 'ativado' : 'desativado'}.`)
                  loadData()
                }}
              />
            </div>
            <p className="text-[10px] text-gray-400">
              Registra "Eu teria feito esta ação" para calibrar IA sem risco operacional real.
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Métricas do Orquestrador */}
        <Card className="bg-[#10121B] border-[#1F2335]">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-400">Aprovações & Governança</span>
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-[#161925] p-1.5 rounded-lg border border-[#23283B]">
                <div className="text-base font-extrabold text-emerald-400 font-mono">
                  {metrics?.approval_rate_percent ?? 100}%
                </div>
                <div className="text-[9px] uppercase tracking-wider text-gray-400">
                  Taxa Aprovação
                </div>
              </div>
              <div className="bg-[#161925] p-1.5 rounded-lg border border-[#23283B]">
                <div className="text-base font-extrabold text-[#00F2FF] font-mono">
                  {metrics?.pending_approval ?? 0}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-gray-400">Pendentes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-[#111420] border border-[#23283E] p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger
            value="approvals"
            className="text-xs font-bold data-[state=active]:bg-[#00F2FF]/20 data-[state=active]:text-[#00F2FF] gap-1.5 py-2 px-3.5"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Caixa de Aprovações
            {pendingApprovals.length > 0 && (
              <Badge className="bg-[#00F2FF] text-[#0A0B10] font-mono text-[10px] px-1.5 py-0 h-4">
                {pendingApprovals.length}
              </Badge>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="plano_do_dia"
            className="text-xs font-bold data-[state=active]:bg-[#7000FF]/20 data-[state=active]:text-[#00F2FF] gap-1.5 py-2 px-3.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            Plano do Dia da IA
          </TabsTrigger>

          <TabsTrigger
            value="shadow_mode"
            className="text-xs font-bold data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400 gap-1.5 py-2 px-3.5"
          >
            <Eye className="w-3.5 h-3.5" />
            Modo Sombra ({shadowLogs.length})
          </TabsTrigger>

          <TabsTrigger
            value="policies_guardrails"
            className="text-xs font-bold data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 gap-1.5 py-2 px-3.5"
          >
            <Shield className="w-3.5 h-3.5" />
            Políticas & Guardrails ({policies.length})
          </TabsTrigger>

          <TabsTrigger
            value="module_pauses"
            className="text-xs font-bold data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300 gap-1.5 py-2 px-3.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            Pausa por Módulo
          </TabsTrigger>

          <TabsTrigger
            value="decision_logs"
            className="text-xs font-bold data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 gap-1.5 py-2 px-3.5"
          >
            <FileText className="w-3.5 h-3.5" />
            Decision Log ({decisionLogs.length})
          </TabsTrigger>

          <TabsTrigger
            value="evaluation"
            className="text-xs font-bold data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 gap-1.5 py-2 px-3.5"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Avaliação do Orquestrador
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CAIXA DE APROVAÇÕES (APPROVALS) */}
        <TabsContent value="approvals" className="space-y-4">
          {/* Filters & Batch Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#11131E] p-3 rounded-xl border border-[#202538]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filtrar por:
              </span>
              <Select value={actionFilterModule} onValueChange={setActionFilterModule}>
                <SelectTrigger className="h-8 bg-[#161925] border-[#292E44] text-xs text-white w-40">
                  <SelectValue placeholder="Módulo" />
                </SelectTrigger>
                <SelectContent className="bg-[#161925] border-[#292E44] text-white">
                  <SelectItem value="all">Todos os Módulos</SelectItem>
                  {allModules.map((m) => (
                    <SelectItem key={m} value={m}>
                      {getModuleName(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={actionFilterStatus} onValueChange={setActionFilterStatus}>
                <SelectTrigger className="h-8 bg-[#161925] border-[#292E44] text-xs text-white w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-[#161925] border-[#292E44] text-white">
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pending_approval">Aguardando Aprovação</SelectItem>
                  <SelectItem value="completed">Concluídas</SelectItem>
                  <SelectItem value="blocked">Bloqueadas</SelectItem>
                  <SelectItem value="rejected">Rejeitadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Batch Approval Button */}
            <div className="flex items-center gap-2">
              {selectedActionIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleBatchApprove}
                  disabled={isBatchProcessing}
                  className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-md"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Aprovar Lote ({selectedActionIds.length} selecionadas - Baixo Risco)
                </Button>
              )}
            </div>
          </div>

          {/* Action Cards List */}
          {filteredActions.length === 0 ? (
            <Card className="bg-[#10121B] border-[#1E2235] p-8 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-[#00F2FF] mx-auto opacity-70" />
              <div className="text-sm font-bold text-white">
                Nenhuma ação encontrada com os filtros atuais.
              </div>
              <p className="text-xs text-gray-400">
                O Orquestrador está monitorando todos os módulos e emitirá recomendações assim que
                novos sinais forem detectados.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredActions.map((action) => {
                const isSelected = selectedActionIds.includes(action.id)
                const isBlocked = action.status === 'blocked'
                const isCompleted = action.status === 'completed'
                const isLowRisk =
                  action.risk_tier === 'low' && !action.is_external_action && !isBlocked

                return (
                  <Card
                    key={action.id}
                    className={cn(
                      'bg-[#121522] border transition-all duration-200',
                      isBlocked
                        ? 'border-red-500/40 bg-red-950/10'
                        : isCompleted
                          ? 'border-emerald-500/30 opacity-80'
                          : 'border-[#22273C] hover:border-[#384164]',
                    )}
                  >
                    <CardContent className="p-4 space-y-3">
                      {/* Top Action Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Batch Checkbox for low risk pending */}
                          {action.status === 'pending_approval' && (
                            <input
                              type="checkbox"
                              disabled={!isLowRisk}
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedActionIds([...selectedActionIds, action.id])
                                } else {
                                  setSelectedActionIds(
                                    selectedActionIds.filter((id) => id !== action.id),
                                  )
                                }
                              }}
                              className="mt-1 rounded border-gray-600 text-[#00F2FF] focus:ring-0 disabled:opacity-30 cursor-pointer"
                              title={
                                !isLowRisk
                                  ? 'Aprovação em lote é permitida SOMENTE para ações de baixo risco.'
                                  : 'Selecionar para aprovação em lote'
                              }
                            />
                          )}

                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-[#1C2033] text-gray-300 border-[#2D334F] text-[10px] font-mono">
                                {getModuleName(action.target_module)}
                              </Badge>

                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono text-[#00F2FF] border-[#00F2FF]/30"
                              >
                                {action.action_type}
                              </Badge>

                              {/* Test Data Badge */}
                              {action.is_test_data ? (
                                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] font-mono">
                                  DECISÃO BASEADA EM AMBIENTE DE TESTE
                                </Badge>
                              ) : (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] font-mono">
                                  DADOS REAIS
                                </Badge>
                              )}

                              {/* Pending Integration Badge */}
                              {action.integration_status === 'pending_integration' && (
                                <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-[9px] font-mono">
                                  INTEGRAÇÃO PENDENTE (
                                  {action.pending_integration_name || 'API Externa'})
                                </Badge>
                              )}

                              {/* Status Badge */}
                              {action.status === 'completed' && (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                                  CONCLUÍDA
                                </Badge>
                              )}
                              {action.status === 'blocked' && (
                                <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[10px] font-bold">
                                  BLOQUEADA
                                </Badge>
                              )}
                              {action.status === 'rejected' && (
                                <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/40 text-[10px]">
                                  REJEITADA
                                </Badge>
                              )}
                            </div>

                            <h3 className="text-sm font-bold text-white tracking-tight">
                              {action.title}
                            </h3>
                            <p className="text-xs text-gray-300 leading-relaxed">
                              {action.summary}
                            </p>
                          </div>
                        </div>

                        {/* Priority Score Ring / Box */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 flex-shrink-0">
                          <div className="flex items-center gap-1.5 bg-[#161928] px-2.5 py-1 rounded-lg border border-[#2B314B]">
                            <span className="text-[10px] font-mono uppercase text-gray-400">
                              Prioridade
                            </span>
                            <span className="text-sm font-mono font-extrabold text-[#00F2FF]">
                              {action.priority_score} pts
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Explicabilidade da IA: "Por que a IA quer fazer isso?" */}
                      <div className="p-3 rounded-xl bg-[#0E1018] border border-[#1F2336] space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#00F2FF]">
                          <Sparkles className="w-3.5 h-3.5 text-[#7000FF]" />
                          POR QUE A IA RECOMENDA ESTA AÇÃO?
                        </div>
                        <p className="text-xs text-gray-300 leading-relaxed">{action.reasoning}</p>

                        {/* Evidência & Amostra */}
                        {action.evidence_summary && (
                          <div className="mt-2 pt-2 border-t border-[#1C2030] flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
                            <span className="flex items-center gap-1">
                              <Database className="w-3 h-3 text-cyan-400" />
                              <strong className="text-gray-200">Evidência:</strong>{' '}
                              {action.evidence_summary}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedActionForEvidence(action)}
                              className="h-6 px-2 text-[10px] text-[#00F2FF] hover:bg-[#00F2FF]/10"
                            >
                              Ver Evidências Detalhadas →
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Hard Block Reason Warning if Blocked */}
                      {isBlocked && (
                        <div className="p-2.5 rounded-lg bg-red-900/30 border border-red-500/40 text-xs text-red-300 flex items-center gap-2">
                          <Ban className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <span>
                            <strong>BLOQUEIO DE SEGURANÇA:</strong>{' '}
                            {action.block_message ||
                              'Ação bloqueada por conformidade, consentimento ou política.'}
                          </span>
                        </div>
                      )}

                      {/* Metrics: Confidence, Risk, Cost, Reversibility */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Decision Confidence */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 text-[11px]">Confiança:</span>
                            {getConfidenceBadge(action.confidence_tier, action.confidence_score)}
                          </div>

                          {/* Action Risk */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-400 text-[11px]">Risco:</span>
                            {getRiskBadge(action.risk_tier, action.risk_score)}
                          </div>

                          {/* Cost */}
                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <DollarSign className="w-3 h-3 text-emerald-400" />
                            <span>
                              Custo:{' '}
                              {action.estimated_cost > 0
                                ? `R$ ${action.estimated_cost.toFixed(2)}`
                                : 'R$ 0,00'}
                            </span>
                          </div>

                          {/* Reversibility */}
                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <span>
                              {action.is_reversible ? '🟢 Reversível' : '🔴 Irreversível'}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons: Aprovar / Rejeitar / Editar / Adiar / Simular */}
                        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSimulateAction(action)}
                            className="h-8 border-[#292F47] bg-[#141724] hover:bg-[#1C2032] text-xs text-cyan-300 gap-1"
                          >
                            <Play className="w-3 h-3" /> Simular Ação
                          </Button>

                          {action.status === 'pending_approval' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEdit(action)}
                                className="h-8 border-[#292F47] bg-[#141724] hover:bg-[#1C2032] text-xs text-gray-300"
                              >
                                Editar
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePostponeAction(action)}
                                className="h-8 border-[#292F47] bg-[#141724] hover:bg-[#1C2032] text-xs text-gray-300"
                              >
                                Adiar
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRejectAction(action)}
                                className="h-8 text-xs text-red-400 hover:bg-red-950/30"
                              >
                                Rejeitar
                              </Button>

                              <Button
                                size="sm"
                                disabled={isBlocked || config?.kill_switch_active}
                                onClick={() => handleApproveAction(action)}
                                className="h-8 bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] font-bold text-xs gap-1 shadow-md"
                              >
                                <CheckCheck className="w-3.5 h-3.5" /> Aprovar & Executar
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: PLANO DO DIA DA IA */}
        <TabsContent value="plano_do_dia" className="space-y-4">
          <Card className="bg-[#10121B] border-[#1F2335]">
            <CardHeader className="p-4 border-b border-[#1E2235]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#00F2FF]" />
                    Plano do Dia da IA — Recomendações Ordenadas por Priority Score
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Lista curada para focar no que gera maior retorno com segurança e aderência ao
                    seu objetivo estratégico.
                  </CardDescription>
                </div>
                <Badge className="bg-[#7000FF]/20 text-[#00F2FF] border-[#7000FF]/40 font-mono">
                  {actions.length} Recomendações Totais
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {actions
                .slice()
                .sort((a, b) => b.priority_score - a.priority_score)
                .map((act, idx) => (
                  <div
                    key={act.id}
                    className="p-3.5 rounded-xl bg-[#131624] border border-[#22273C] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-[#1B1F31] border border-[#2D334F] flex items-center justify-center font-mono font-bold text-xs text-[#00F2FF] flex-shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{act.title}</span>
                          <span className="text-[10px] font-mono text-gray-400">
                            ({getModuleName(act.target_module)})
                          </span>
                        </div>
                        <p className="text-xs text-gray-300">{act.reasoning}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <div className="text-xs font-mono font-bold text-[#00F2FF]">
                          {act.priority_score} pts
                        </div>
                        <div className="text-[9px] text-gray-400">Priority Score</div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveTab('approvals')
                          setSelectedActionForEvidence(act)
                        }}
                        className="h-8 text-xs bg-[#1A1E2E] hover:bg-[#252B42] text-[#00F2FF] border border-[#2D3452]"
                      >
                        Abrir Decisão
                      </Button>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: MODO SOMBRA (SHADOW MODE) */}
        <TabsContent value="shadow_mode" className="space-y-4">
          <Card className="bg-[#10121B] border-[#1F2335]">
            <CardHeader className="p-4 border-b border-[#1E2235]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    Modo Sombra — "O Que a IA Teria Feito"
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    O Orquestrador registra ações hipotéticas em paralelo à sua operação para
                    comparar decisões sem risco real.
                  </CardDescription>
                </div>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/40 text-xs font-mono">
                  {shadowLogs.length} Registros Hipotéticos
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {shadowLogs.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl bg-[#121522] border border-[#21263B] space-y-2.5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1A1F30] pb-2">
                    <div>
                      <div className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        AÇÃO HIPOTÉTICA DA IA:
                      </div>
                      <div className="text-sm font-semibold text-white mt-0.5">
                        {s.hypothetical_action}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#1A1E2E] text-gray-300 border-[#2D3450] text-[10px] font-mono">
                        {getModuleName(s.target_module)}
                      </Badge>
                      <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-[10px] font-mono">
                        Confiança {s.confidence_score}%
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-[#0E1018] border border-[#1C2030] space-y-1">
                      <div className="text-gray-400 font-semibold">
                        Motivo & Evidência Utilizada:
                      </div>
                      <div className="text-gray-300">{s.reasoning}</div>
                      <div className="text-[11px] text-[#00F2FF] mt-1 font-mono">
                        Impacto Esperado: {s.expected_outcome}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-[#0E1018] border border-[#1C2030] space-y-1">
                      <div className="text-gray-400 font-semibold">
                        O Que o Usuário Realmente Fez:
                      </div>
                      <div className="text-white font-medium">
                        {s.user_actual_action || 'Ação em monitoramento'}
                      </div>
                      <div className="text-[11px] text-gray-300">
                        Resultado Real: {s.actual_outcome || 'Pendente de métricas'}
                      </div>
                    </div>
                  </div>

                  {s.comparison_analysis && (
                    <div className="p-2.5 rounded-lg bg-[#141726] border border-[#272D45] text-xs text-gray-300">
                      <strong className="text-cyan-300">Análise Comparativa:</strong>{' '}
                      {s.comparison_analysis}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: POLÍTICAS & GUARDRAILS */}
        <TabsContent value="policies_guardrails" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Policies Column */}
            <div className="lg:col-span-2 space-y-3">
              <Card className="bg-[#10121B] border-[#1F2335]">
                <CardHeader className="p-4 border-b border-[#1E2235]">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    Políticas do Operador (Prioridade Máxima sobre a IA)
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Regras invioláveis definidas pelo usuário. A IA nunca viola políticas ativas,
                    mesmo com alta confiança.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-2.5">
                  {policies.map((p) => (
                    <div
                      key={p.id}
                      className={cn(
                        'p-3 rounded-xl border flex items-start justify-between gap-3',
                        p.is_active
                          ? 'bg-[#121522] border-[#22283D]'
                          : 'bg-[#0E1017] border-[#1A1E2B] opacity-60',
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{p.title}</span>
                          {p.is_system_immutable && (
                            <Badge className="bg-red-500/20 text-red-300 border-red-500/40 text-[9px] font-mono">
                              IMUTÁVEL (LGPD / SEGURANÇA)
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[9px] font-mono text-gray-400">
                            {p.rule_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-300">{p.description}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Switch
                          checked={p.is_active}
                          disabled={p.is_system_immutable}
                          onCheckedChange={() => handleTogglePolicy(p)}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Guardrails Column */}
            <div className="space-y-3">
              <Card className="bg-[#10121B] border-[#1F2335]">
                <CardHeader className="p-4 border-b border-[#1E2235]">
                  <CardTitle className="text-sm text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#00F2FF]" />
                    Guardrails Operacionais
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Limites numéricos para evitar loops e saturação de contatos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#141724]">
                    <span className="text-gray-300">Máx. Campanhas Rascunho / Dia</span>
                    <span className="font-mono font-bold text-[#00F2FF]">
                      {config?.guardrails?.max_campaigns_per_day ?? 10}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#141724]">
                    <span className="text-gray-300">Máx. Criativos Rascunho / Dia</span>
                    <span className="font-mono font-bold text-[#00F2FF]">
                      {config?.guardrails?.max_creatives_per_day ?? 20}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#141724]">
                    <span className="text-gray-300">Máx. Recomendações por Contato / Sem</span>
                    <span className="font-mono font-bold text-amber-300">
                      {config?.guardrails?.max_actions_per_contact_week ?? 2}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#141724]">
                    <span className="text-gray-300">Score de Oportunidade Mínimo</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {config?.guardrails?.min_score_threshold ?? 75} pts
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-[#141724]">
                    <span className="text-gray-300">Gestão Autônoma de Mídia Paga</span>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-[9px] font-mono">
                      DESATIVADA (FASE 9)
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 5: PAUSA POR MÓDULO */}
        <TabsContent value="module_pauses" className="space-y-4">
          <Card className="bg-[#10121B] border-[#1F2335]">
            <CardHeader className="p-4 border-b border-[#1E2235]">
              <CardTitle className="text-base text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                Pausa Granular por Módulo do Ecossistema
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Pause módulos individualmente caso queira isolar testes ou interromper recomendações
                específicas sem desligar o sistema.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {allModules.map((mod) => {
                  const isPaused = config?.paused_modules?.includes(mod)
                  return (
                    <div
                      key={mod}
                      className={cn(
                        'p-3.5 rounded-xl border flex items-center justify-between gap-2',
                        isPaused
                          ? 'bg-red-950/20 border-red-500/30'
                          : 'bg-[#131624] border-[#22273B] hover:border-[#313854]',
                      )}
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{getModuleName(mod)}</div>
                        <div className="text-[10px] text-gray-400">
                          Status:{' '}
                          {isPaused ? (
                            <span className="text-red-400 font-bold">Pausado</span>
                          ) : (
                            <span className="text-emerald-400 font-bold">Ativo</span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        variant={isPaused ? 'default' : 'outline'}
                        onClick={() => handleToggleModulePause(mod)}
                        className={cn(
                          'h-7 text-xs font-semibold px-2.5',
                          isPaused
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'border-[#2D334F] text-gray-300 hover:text-red-400',
                        )}
                      >
                        {isPaused ? (
                          <Play className="w-3 h-3 mr-1" />
                        ) : (
                          <Pause className="w-3 h-3 mr-1" />
                        )}
                        {isPaused ? 'Retomar' : 'Pausar'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 6: DECISION LOG */}
        <TabsContent value="decision_logs" className="space-y-4">
          <Card className="bg-[#10121B] border-[#1F2335]">
            <CardHeader className="p-4 border-b border-[#1E2235]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    Decision Log Permanente & Auditável
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Registro imutável de todas as análises, decisões propostas, dados observados,
                    aprovações e resultados operacionais.
                  </CardDescription>
                </div>
                <Badge className="bg-[#1A1F30] text-emerald-400 border-emerald-500/40 text-xs font-mono">
                  {decisionLogs.length} Entradas Auditadas
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-2.5">
              {decisionLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-[#121522] border border-[#21263A] space-y-2 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#1A1E2D] pb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#191D2E] text-gray-300 border-[#2B314B] text-[10px] font-mono">
                        {getModuleName(log.target_module)}
                      </Badge>
                      <span className="font-bold text-white">{log.action_type}</span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        ID: {log.action_id}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-gray-400">
                      {new Date(log.created).toLocaleString('pt-BR')}
                    </div>
                  </div>

                  <div className="space-y-1 text-gray-300">
                    <div>
                      <strong className="text-gray-200">Situação Observada:</strong>{' '}
                      {log.situation_observed}
                    </div>
                    <div>
                      <strong className="text-[#00F2FF]">Decisão Proposta:</strong>{' '}
                      {log.proposed_decision}
                    </div>
                    {log.evidence_used && (
                      <div>
                        <strong className="text-cyan-300">Evidência:</strong> {log.evidence_used}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1A1E2D] text-[11px] font-mono">
                    <div className="flex items-center gap-3">
                      <span>Confiança: {log.confidence_score ?? 0}%</span>
                      <span>Risco: {log.risk_score ?? 0} pts</span>
                      <span>Nível Autonomia: {log.autonomy_level_at_time}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        className={cn(
                          'text-[10px]',
                          log.decision_outcome.includes('blocked')
                            ? 'bg-red-500/20 text-red-300 border-red-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                        )}
                      >
                        Resultado: {log.decision_outcome}
                      </Badge>
                      <span className="text-gray-400">Por: {log.executed_by || 'system'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 7: AVALIAÇÃO DO PRÓPRIO ORQUESTRADOR */}
        <TabsContent value="evaluation" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-[#10121B] border-[#1F2335] p-4 text-center">
              <div className="text-2xl font-black text-[#00F2FF] font-mono">
                {metrics?.approval_rate_percent ?? 100}%
              </div>
              <div className="text-xs font-bold text-white mt-1">Taxa de Aprovação Humana</div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Recomendações aceitas pelo operador
              </p>
            </Card>

            <Card className="bg-[#10121B] border-[#1F2335] p-4 text-center">
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {metrics?.average_confidence_score ?? 85}%
              </div>
              <div className="text-xs font-bold text-white mt-1">Confiança Média</div>
              <p className="text-[10px] text-gray-400 mt-0.5">Baseada em amostras e consistência</p>
            </Card>

            <Card className="bg-[#10121B] border-[#1F2335] p-4 text-center">
              <div className="text-2xl font-black text-amber-400 font-mono">
                {metrics?.blocked_count ?? 1}
              </div>
              <div className="text-xs font-bold text-white mt-1">
                Ações Bloqueadas por Segurança
              </div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Opt-out / Falta de consentimento / Políticas
              </p>
            </Card>

            <Card className="bg-[#10121B] border-[#1F2335] p-4 text-center">
              <div className="text-2xl font-black text-cyan-400 font-mono">
                {metrics?.insufficient_data_hypotheses_count ?? 1}
              </div>
              <div className="text-xs font-bold text-white mt-1">Hipóteses de Teste</div>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Convertidas em experimentos (dados fracos)
              </p>
            </Card>
          </div>

          {/* Promotion Suggestion Card */}
          <Card className="bg-gradient-to-r from-[#121626] to-[#15192E] border border-[#232A44] p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-[#00F2FF] flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">
                  PROMOÇÃO DE AUTONOMIA (Critérios & Evidência)
                </h3>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {metrics?.promotion_recommendation?.message ||
                    'O sistema exige histórico sólido antes de sugerir promoção para Nível 4.'}
                </p>
                <div className="pt-2 text-[11px] text-gray-400 italic">
                  * Regra de ouro: O Orquestrador NUNCA eleva o próprio nível de autonomia. Toda
                  promoção depende de autorização explícita do operador.
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL 1: EVIDÊNCIAS DETALHADAS */}
      <Dialog
        open={!!selectedActionForEvidence}
        onOpenChange={() => setSelectedActionForEvidence(null)}
      >
        <DialogContent className="bg-[#121422] border-[#22273D] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Database className="w-4 h-4 text-[#00F2FF]" />
              Evidências & Dados da Decisão
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              {selectedActionForEvidence?.title}
            </DialogDescription>
          </DialogHeader>

          {selectedActionForEvidence && (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#0E1018] border border-[#1C2030] space-y-1">
                <span className="font-semibold text-gray-300">Resumo da Evidência:</span>
                <p className="text-gray-300 leading-relaxed">
                  {selectedActionForEvidence.evidence_summary}
                </p>
              </div>

              {selectedActionForEvidence.evidence_data && (
                <div className="p-3 rounded-lg bg-[#0E1018] border border-[#1C2030] space-y-1">
                  <span className="font-semibold text-[#00F2FF]">Métricas & Dados Utilizados:</span>
                  <pre className="text-[11px] font-mono text-gray-300 bg-[#161826] p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedActionForEvidence.evidence_data, null, 2)}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 rounded bg-[#161826] border border-[#22273B]">
                  <span className="text-gray-400 block">Força da Evidência:</span>
                  <span className="font-bold text-emerald-400 capitalize">
                    {selectedActionForEvidence.evidence_strength}
                  </span>
                </div>
                <div className="p-2 rounded bg-[#161826] border border-[#22273B]">
                  <span className="text-gray-400 block">Status de Reversibilidade:</span>
                  <span className="font-bold text-white">
                    {selectedActionForEvidence.is_reversible ? '🟢 Reversível' : '🔴 Irreversível'}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setSelectedActionForEvidence(null)}
              className="bg-[#1C2032] text-white hover:bg-[#252B42]"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: SIMULAÇÃO DE DECISÃO */}
      <Dialog
        open={!!selectedActionForSimulation}
        onOpenChange={() => setSelectedActionForSimulation(null)}
      >
        <DialogContent className="bg-[#121422] border-[#22273D] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Play className="w-4 h-4 text-cyan-400" />
              Simulador de Decisão — Impactos Previstos
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Projeção antecipada do que a ação fará sem alterar os dados reais.
            </DialogDescription>
          </DialogHeader>

          {isSimulating ? (
            <div className="p-8 text-center space-y-2">
              <RefreshCw className="w-8 h-8 text-[#00F2FF] animate-spin mx-auto" />
              <div className="text-xs text-gray-300">
                Simulando efeitos colaterais e integrações...
              </div>
            </div>
          ) : simulationData ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#0E1018] border border-[#1C2030] space-y-2">
                <div className="text-gray-300 font-bold">Efeitos Esperados no Sistema:</div>
                <ul className="list-disc list-inside text-gray-400 space-y-1">
                  {simulationData.expected_effects?.map((eff: string, i: number) => (
                    <li key={i}>{eff}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-[#0E1018] border border-[#1C2030] space-y-1 text-gray-300">
                <span className="font-bold">Como Desfazer esta Ação:</span>
                <p className="text-gray-400">{simulationData.how_to_undo}</p>
              </div>

              {simulationData.risk_factors?.length > 0 && (
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/40 text-amber-300">
                  <span className="font-bold">Fatores de Risco Observados:</span>
                  <ul className="list-disc list-inside text-[11px] mt-1 space-y-0.5">
                    {simulationData.risk_factors.map((rf: string, idx: number) => (
                      <li key={idx}>{rf}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-[10px] text-gray-400 italic">
                {simulationData.confidence_statement}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              size="sm"
              onClick={() => setSelectedActionForSimulation(null)}
              className="bg-[#1C2032] text-white hover:bg-[#252B42]"
            >
              Fechar Simulação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: EDITAR AÇÃO */}
      <Dialog open={!!selectedActionForEdit} onOpenChange={() => setSelectedActionForEdit(null)}>
        <DialogContent className="bg-[#121422] border-[#22273D] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Editar Decisão Proposta</DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Ajuste o título ou a justificativa antes de autorizar a execução.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Título da Ação</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-[#161826] border-[#292F47] text-xs text-white"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-300">Justificativa / Motivo</Label>
              <textarea
                value={editReasoning}
                onChange={(e) => setEditReasoning(e.target.value)}
                rows={3}
                className="w-full rounded-md bg-[#161826] border border-[#292F47] text-xs text-white p-2"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedActionForEdit(null)}
              className="border-[#2D334F] text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              className="bg-[#00F2FF] text-[#0A0B10] font-bold"
            >
              Salvar Edições
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: CONFIRMAÇÃO DO KILL SWITCH */}
      <Dialog open={showKillSwitchConfirm} onOpenChange={setShowKillSwitchConfirm}>
        <DialogContent className="bg-[#141016] border-red-500/40 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-red-400 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              {config?.kill_switch_active
                ? 'Desativar Kill Switch & Retomar'
                : 'Acionar Kill Switch de Emergência'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              {config?.kill_switch_active
                ? 'A operação normal será restabelecida para os módulos não pausados.'
                : 'Esta ação suspende imediatamente toda e qualquer execução autônoma no sistema sem apagar o histórico.'}
            </DialogDescription>
          </DialogHeader>

          {!config?.kill_switch_active && (
            <div className="space-y-2">
              <Label className="text-xs text-gray-300">Motivo da Pausa (Opcional)</Label>
              <Input
                value={killSwitchReasonInput}
                onChange={(e) => setKillSwitchReasonInput(e.target.value)}
                placeholder="Ex: Auditoria manual de criativos..."
                className="bg-[#1C1622] border-red-500/30 text-xs text-white"
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowKillSwitchConfirm(false)}
              className="border-gray-700 text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleToggleKillSwitch}
              className={
                config?.kill_switch_active
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'
                  : 'bg-red-600 hover:bg-red-700 text-white font-bold'
              }
            >
              {config?.kill_switch_active ? 'Confirmar Retomada' : 'Confirmar Pausa Geral'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 5: CONFIRMAÇÃO NÍVEL 5 */}
      <Dialog open={showLevelConfirmModal} onOpenChange={setShowLevelConfirmModal}>
        <DialogContent className="bg-[#121422] border-purple-500/40 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-purple-300 flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-400" />
              Ativação Experimental: NÍVEL 5 (Autonomia Avançada)
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              O Nível 5 é uma arquitetura preparada para evolução futura. Deseja realmente
              confirmar?
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-gray-300 leading-relaxed">
            Mesmo no Nível 5, todas as salvaguardas (Hard Block de consentimento, opt-out, proibição
            de mídia paga autônoma e aprovação para ações externas) permanecem ativas.
          </p>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLevelConfirmModal(false)}
              className="border-[#2D334F] text-gray-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={confirmLevel5}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              Confirmar Nível 5
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
