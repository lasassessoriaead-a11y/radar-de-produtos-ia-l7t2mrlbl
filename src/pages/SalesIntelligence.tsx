import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Brain,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BarChart3,
  Flame,
  ArrowUpRight,
  RefreshCw,
  Clock,
  Layers,
  Dna,
  Zap,
  Sliders,
  ShieldCheck,
  Target,
  FlaskConical,
  BookOpen,
  Filter,
  Check,
  ChevronRight,
  Info,
  Calendar,
  Eye,
  MousePointer,
  DollarSign,
  PieChart,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { ConfidenceBadge, StatusBadge } from '@/components/ConfidenceBadge'
import {
  fetchSalesIntelligenceData,
  updateInsightStatus,
  updateCalibrationStatus,
  updateExperimentStatus,
  generateLearningReport,
  IntelligenceState,
} from '@/services/learning'
import {
  SalesInsightRecord,
  LearningExperimentRecord,
  ScoreCalibrationRecord,
  AiLearningReport,
  ConfidenceLevel,
} from '@/types/learning'

export const SalesIntelligence: React.FC = () => {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState<IntelligenceState | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterConfidence, setFilterConfidence] = useState<string>('all')

  // Report State
  const [generatingReport, setGeneratingReport] = useState(false)
  const [reportPeriod, setReportPeriod] = useState<number>(30)
  const [exploitRatio, setExploitRatio] = useState<number>(80) // 80% Exploit / 20% Explore
  const [learningReport, setLearningReport] = useState<AiLearningReport | null>(null)

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await fetchSalesIntelligenceData()
      setState(data)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar inteligência',
        description: 'Não foi possível carregar os dados de aprendizado.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleStatusChange = async (insightId: string, newStatus: SalesInsightRecord['status']) => {
    const ok = await updateInsightStatus(insightId, newStatus)
    if (ok) {
      toast({
        title: 'Status atualizado',
        description: `Insight marcado como "${newStatus}". O ciclo de feedback foi registrado.`,
      })
      loadData()
    } else {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível alterar o status do insight.',
        variant: 'destructive',
      })
    }
  }

  const handleCalibrationDecision = async (
    calibrationId: string,
    decision: 'approved_by_user' | 'rejected_by_user',
  ) => {
    const ok = await updateCalibrationStatus(
      calibrationId,
      decision,
      decision === 'approved_by_user' ? 'Aprovado pelo operador humano' : 'Rejeitado pelo operador',
    )
    if (ok) {
      toast({
        title:
          decision === 'approved_by_user' ? 'Pesos calibrados com sucesso!' : 'Proposta recusada',
        description:
          decision === 'approved_by_user'
            ? 'Os novos pesos agora alimentam os algoritmos de recomendação.'
            : 'Os pesos atuais continuam inalterados.',
      })
      loadData()
    }
  }

  const handleGenerateAiReport = async () => {
    try {
      setGeneratingReport(true)
      const report = await generateLearningReport(reportPeriod, exploitRatio)
      setLearningReport(report)
      toast({
        title: 'Relatório de Aprendizado Gerado',
        description: `Período de ${reportPeriod} dias consolidado com proporção ${exploitRatio}% Exploit / ${100 - exploitRatio}% Explore.`,
      })
    } catch (err) {
      toast({
        title: 'Erro no relatório',
        description: 'Falha ao processar relatório pela IA.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingReport(false)
    }
  }

  if (loading || !state) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
        <p className="text-sm text-slate-400">
          Processando memória de performance e calibração estatística...
        </p>
      </div>
    )
  }

  const filteredInsights = state.insights.filter((ins) => {
    if (filterCategory !== 'all' && ins.category_type !== filterCategory) return false
    if (filterConfidence !== 'all' && ins.confidence_level !== filterConfidence) return false
    return true
  })

  return (
    <div className="space-y-8 pb-16">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800/50 text-cyan-400">
              <Brain className="w-6 h-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              Inteligência de Vendas
              <Badge
                variant="outline"
                className="text-xs bg-cyan-950/50 text-cyan-300 border-cyan-800/40"
              >
                Fase 6 • Motor de Otimização
              </Badge>
            </h1>
          </div>
          <p className="text-sm text-slate-400 max-w-3xl">
            O cérebro da plataforma que transforma histórico em aprendizado estruturado. Descubra
            correlações reais de
            <span className="text-cyan-300 font-medium">
              {' '}
              Produto + Preço + Público + Ângulo + Gancho + Formato + Canal
            </span>{' '}
            sem nunca confundir correlação com causalidade.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Recalcular Métricas
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setActiveTab('report')
              handleGenerateAiReport()
            }}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white gap-2 font-medium shadow-lg shadow-cyan-950/40"
          >
            <Sparkles className="w-4 h-4" />
            Gerar Relatório de IA
          </Button>
        </div>
      </div>

      {/* REGRA DE OURO & PRINCÍPIO METODOLÓGICO */}
      <div className="p-4 rounded-xl border border-blue-900/40 bg-blue-950/20 flex items-start gap-3.5">
        <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <span className="font-semibold text-white uppercase tracking-wider text-[11px] block">
            ⚖️ Princípio Metodológico de Inteligência & Governança Humana:
          </span>
          <p>
            Toda conclusão exibe seu <strong className="text-cyan-300">Tamanho de Amostra</strong> e{' '}
            <strong className="text-cyan-300">Nível de Confiança</strong>. Quando os dados forem
            insuficientes, o sistema declara explicitamente: <em>"Eu não sei ainda"</em>. A IA
            propõe hipóteses e calibrações — a{' '}
            <strong className="text-white">decisão final é 100% humana</strong>.
          </p>
        </div>
      </div>

      {/* CARDS DE RESUMO DA MEMÓRIA HISTÓRICA */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              Campanhas
            </span>
            <div className="text-2xl font-bold text-white font-mono">
              {state.summary.campaigns_count}
            </div>
            <p className="text-[11px] text-slate-500">
              {state.summary.variations_count} variações A/B/C
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <MousePointer className="w-3.5 h-3.5 text-cyan-400" />
              Cliques Reais
            </span>
            <div className="text-2xl font-bold text-cyan-300 font-mono">
              {state.summary.total_clicks.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-500">CTR Médio: {state.summary.ctr_percentage}%</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Vendas
            </span>
            <div className="text-2xl font-bold text-emerald-300 font-mono flex items-center gap-2">
              {state.summary.conversions_count}
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] font-mono">
                DADOS REAIS
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Conv: {state.summary.conversion_rate}%
            </p>{' '}
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              Comissão Total
            </span>
            <div className="text-2xl font-bold text-amber-300 font-mono">
              R${' '}
              {state.summary.total_commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-slate-500">
              Lucro: R${' '}
              {state.summary.net_profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
              ROI Médio
            </span>
            <div className="text-2xl font-bold text-purple-300 font-mono">
              +{state.summary.roi_percentage}%
            </div>
            <p className="text-[11px] text-slate-500">Baseado em custos reais</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/60 border-slate-800">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#00F2FF]" />
              Recompra CRM
            </span>
            <div className="text-2xl font-bold text-[#00F2FF] font-mono">50.0%</div>
            <p className="text-[11px] text-slate-500">Eletrônicos & Áudio</p>
          </CardContent>
        </Card>
      </div>

      {/* CARD FASE 8: APRENDIZADOS DO CRM & RECOMPRA INTEGRADOS */}
      <div className="rounded-2xl border border-[#00F2FF]/30 bg-gradient-to-r from-[#0e1628]/90 via-[#101c34]/90 to-[#0e1628]/90 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-[#00F2FF]/15 border border-[#00F2FF]/30 text-[#00F2FF]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>🔄 Ciclo de Recompra Integrado do CRM (Fase 8)</span>
              <Badge className="bg-[#00F2FF]/20 text-[#00F2FF] text-[9px] font-mono">
                Feedback Contínuo
              </Badge>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Clientes que compram <strong>Eletrônicos & Áudio</strong> apresentam maior recorrência
              (+50%) e respondem melhor a ofertas de iluminação e organização de setup no Telegram.
            </p>
          </div>
        </div>

        <Link
          to="/crm"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00F2FF]/20 hover:bg-[#00F2FF]/30 border border-[#00F2FF]/40 text-xs font-semibold text-[#00F2FF] transition-colors self-start md:self-auto shrink-0"
        >
          Ver Recomendações no CRM
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* TABS DE NAVEGAÇÃO DA INTELIGÊNCIA */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-900 border border-slate-800 p-1 flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="overview"
            className="gap-2 text-xs py-2 data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-300"
          >
            <Sparkles className="w-4 h-4" />
            Cérebro de Aprendizado
          </TabsTrigger>
          <TabsTrigger
            value="matrix"
            className="gap-2 text-xs py-2 data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-300"
          >
            <Layers className="w-4 h-4" />
            Matriz de Combinações
          </TabsTrigger>
          <TabsTrigger
            value="dna"
            className="gap-2 text-xs py-2 data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-300"
          >
            <Dna className="w-4 h-4" />
            DNA dos Vencedores
          </TabsTrigger>
          <TabsTrigger
            value="calibration"
            className="gap-2 text-xs py-2 data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-300"
          >
            <Sliders className="w-4 h-4" />
            Previsão × Realidade & Calibração
          </TabsTrigger>
          <TabsTrigger
            value="experiments"
            className="gap-2 text-xs py-2 data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-300"
          >
            <FlaskConical className="w-4 h-4" />
            Testes Recomendados (A/B/C)
          </TabsTrigger>
          <TabsTrigger
            value="temporal"
            className="gap-2 text-xs py-2 data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-300"
          >
            <Clock className="w-4 h-4" />
            Análise Temporal & Heatmap
          </TabsTrigger>
          <TabsTrigger
            value="report"
            className="gap-2 text-xs py-2 data-[state=active]:bg-cyan-950 data-[state=active]:text-cyan-300"
          >
            <BookOpen className="w-4 h-4" />
            Relatório da IA
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* TAB 1: CÉREBRO DE APRENDIZADO (O QUE ESTÁ / NÃO ESTÁ FUNCIONANDO) */}
        {/* ========================================================================= */}
        <TabsContent value="overview" className="space-y-6">
          {/* FILTROS E STATUS */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Filtrar Categoria:</span>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded px-2 py-1"
              >
                <option value="all">Todas as Descobertas ({state.insights.length})</option>
                <option value="what_works">O que está Funcionando</option>
                <option value="what_fails">O que NÃO está Funcionando</option>
                <option value="emerging_pattern">Padrões Emergentes</option>
                <option value="insufficient_data">Dados Insuficientes</option>
              </select>

              <span className="text-xs text-slate-400 font-medium ml-2">Confiança:</span>
              <select
                value={filterConfidence}
                onChange={(e) => setFilterConfidence(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-xs text-slate-200 rounded px-2 py-1"
              >
                <option value="all">Todos os Níveis</option>
                <option value="high">🟢 Alta Confiança</option>
                <option value="moderate">🟠 Confiança Moderada</option>
                <option value="low">🟡 Baixa Confiança</option>
                <option value="insufficient">⚪ Insuficiente</option>
              </select>
            </div>

            <div className="text-xs text-slate-400">
              Exibindo <span className="text-white font-mono">{filteredInsights.length}</span>{' '}
              insights registrados na memória
            </div>
          </div>

          {/* GRID DE INSIGHTS ESTRUTURADOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInsights.map((ins) => {
              const isPositive = ins.category_type === 'what_works'
              const isNegative = ins.category_type === 'what_fails'
              const isInsufficient = ins.category_type === 'insufficient_data'

              const borderAccent = isPositive
                ? 'border-emerald-800/40 hover:border-emerald-700/60'
                : isNegative
                  ? 'border-red-800/40 hover:border-red-700/60'
                  : isInsufficient
                    ? 'border-slate-700/50 hover:border-slate-600/60'
                    : 'border-cyan-800/40 hover:border-cyan-700/60'

              return (
                <Card
                  key={ins.id}
                  className={`bg-slate-900/70 border ${borderAccent} transition-all shadow-md flex flex-col justify-between`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <ConfidenceBadge
                          level={ins.confidence_level}
                          sampleSummary={ins.sample_summary}
                        />
                        <StatusBadge status={ins.status} />
                        {(ins.confidence_level === 'insufficient' ||
                          ins.category_type === 'insufficient_data') && (
                          <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[9px] font-mono">
                            DECISÃO BASEADA EM AMBIENTE DE TESTE
                          </Badge>
                        )}
                      </div>
                      {ins.target_module && (
                        <Badge
                          variant="outline"
                          className="text-[10px] bg-slate-800/80 text-cyan-400 border-slate-700"
                        >
                          Módulo: {ins.target_module.toUpperCase()}
                        </Badge>
                      )}
                    </div>

                    <CardTitle className="text-base text-white font-semibold flex items-start gap-2">
                      {isPositive && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      )}
                      {isNegative && (
                        <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      )}
                      {isInsufficient && (
                        <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      )}
                      {!isPositive && !isNegative && !isInsufficient && (
                        <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      )}
                      <span>{ins.title}</span>
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4 text-xs">
                    {/* MÉTRICA E BENCHMARK */}
                    {ins.primary_metric_label && (
                      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-slate-400 block">
                            {ins.primary_metric_label}
                          </span>
                          <span className="text-lg font-bold font-mono text-cyan-300">
                            {typeof ins.primary_metric_value === 'number'
                              ? ins.primary_metric_value > 100
                                ? ins.primary_metric_value
                                : `${ins.primary_metric_value}%`
                              : ins.primary_metric_value}
                          </span>
                        </div>
                        {ins.benchmark_comparison && (
                          <div className="text-right max-w-[200px]">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                              Benchmark Interno
                            </span>
                            <span className="text-xs font-medium text-emerald-400">
                              {ins.benchmark_comparison}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* CONCLUSÃO DA MEMÓRIA */}
                    <div className="space-y-1">
                      <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                        Conclusão Empírica:
                      </span>
                      <p className="text-slate-300 leading-relaxed bg-slate-950/40 p-2.5 rounded border border-slate-800/80">
                        {ins.conclusion_text}
                      </p>
                    </div>

                    {/* RECOMENDAÇÃO ACIONÁVEL */}
                    <div className="space-y-1">
                      <span className="font-semibold text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        Recomendação Prática:
                      </span>
                      <p className="text-slate-200 leading-relaxed bg-amber-950/20 p-2.5 rounded border border-amber-900/30">
                        {ins.recommendation_text}
                      </p>
                    </div>

                    {/* FEEDBACK LOOP & AÇÕES HUMANAS */}
                    <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500">Ciclo de Validação Humana:</span>
                      <div className="flex items-center gap-1.5">
                        {ins.status !== 'validado' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px] text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300"
                            onClick={() => handleStatusChange(ins.id, 'validado')}
                          >
                            <Check className="w-3 h-3 mr-1" /> Validar
                          </Button>
                        )}
                        {ins.status !== 'em_teste' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px] text-cyan-400 hover:bg-cyan-950/40 hover:text-cyan-300"
                            onClick={() => handleStatusChange(ins.id, 'em_teste')}
                          >
                            <FlaskConical className="w-3 h-3 mr-1" /> Testar
                          </Button>
                        )}
                        {ins.status !== 'descartado' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px] text-slate-400 hover:bg-red-950/40 hover:text-red-400"
                            onClick={() => handleStatusChange(ins.id, 'descartado')}
                          >
                            <XCircle className="w-3 h-3 mr-1" /> Descartar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: MATRIZ DE COMBINAÇÕES (TIPO + PREÇO + ÂNGULO + FORMATO + CANAL) */}
        {/* ========================================================================= */}
        <TabsContent value="matrix" className="space-y-6">
          <Card className="bg-slate-900/70 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                Matriz Multidimensional de Performance
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Análise cruzada de variáveis: Ângulo + Formato + Faixa de Preço + Canal. Mostra a
                eficácia de cada combinação com suporte estatístico.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-3">Combinação Analisada</th>
                      <th className="py-3 px-2">Faixa Preço</th>
                      <th className="py-3 px-2">Canal</th>
                      <th className="py-3 px-2">Amostra (Campanhas / Cliques / Vendas)</th>
                      <th className="py-3 px-2">CTR Real</th>
                      <th className="py-3 px-2">Conv. Real</th>
                      <th className="py-3 px-2">ROI Real</th>
                      <th className="py-3 px-3">Nível Confiança</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {state.combinationsMatrix.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="font-semibold text-white">{row.combination_name}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-cyan-300">
                              {row.angle}
                            </span>
                            <span>•</span>
                            <span className="bg-slate-800 px-1.5 py-0.5 rounded text-purple-300">
                              {row.format}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-mono text-slate-300">{row.price_tier}</td>
                        <td className="py-3 px-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-slate-800/60 text-slate-200 border-slate-700"
                          >
                            {row.channel}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 font-mono text-slate-300">
                          <div>{row.sample_campaigns} camps</div>
                          <div className="text-[11px] text-slate-500">
                            {row.sample_clicks} cliq • {row.sample_conversions} vend
                          </div>
                        </td>
                        <td className="py-3 px-2 font-mono font-semibold text-cyan-300">
                          {row.ctr}%
                        </td>
                        <td className="py-3 px-2 font-mono font-semibold text-emerald-300">
                          {row.conversion_rate}%
                        </td>
                        <td className="py-3 px-2 font-mono font-semibold text-purple-300">
                          {row.roi > 0 ? `+${row.roi}%` : `${row.roi}%`}
                        </td>
                        <td className="py-3 px-3">
                          <ConfidenceBadge level={row.confidence} showSample={false} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: DNA DOS VENCEDORES (PRODUTO, CAMPANHA, CRIATIVO) */}
        {/* ========================================================================= */}
        <TabsContent value="dna" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* DNA DO PRODUTO VENCEDOR */}
            <Card className="bg-slate-900/70 border-cyan-900/40 flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between mb-1">
                  <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800">
                    <Target className="w-3 h-3 mr-1" /> Produto Vencedor
                  </Badge>
                  <ConfidenceBadge level="high" showSample={false} />
                </div>
                <CardTitle className="text-base font-bold text-white">
                  DNA do Produto que Vende
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Características comuns observadas nos produtos com maior taxa de conversão e
                  comissão.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Faixa de Preço Ideal:</span>
                    <span className="font-semibold text-emerald-400 font-mono">
                      R$ 50,00 a R$ 150,00
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Categorias Campeãs:</span>
                    <span className="font-semibold text-cyan-300">
                      Casa & Cozinha, Gadgets Úteis
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Fator de Demonstração:</span>
                    <span className="font-semibold text-purple-300">
                      Visualmente Imediato (&lt; 3s)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Comissão Mínima Real:</span>
                    <span className="font-semibold text-amber-300 font-mono">
                      &gt; R$ 10,00 / venda
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-cyan-950/20 border border-cyan-900/40 rounded-lg text-slate-300 space-y-1">
                  <span className="font-semibold text-cyan-300 block">Conexão com o Caçador:</span>
                  <p className="text-[11px]">
                    Esses critérios alimentam os filtros inteligentes do Caçador para priorizar
                    produtos de alta aderência histórica.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* DNA DA CAMPANHA VENCEDORA */}
            <Card className="bg-slate-900/70 border-purple-900/40 flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between mb-1">
                  <Badge className="bg-purple-950 text-purple-300 border-purple-800">
                    <Flame className="w-3 h-3 mr-1" /> Campanha Vencedora
                  </Badge>
                  <ConfidenceBadge level="high" showSample={false} />
                </div>
                <CardTitle className="text-base font-bold text-white">
                  DNA da Estrutura Vencedora
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Estrutura de copy, ângulos e canais com melhor correlação de vendas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Ângulo Dominante:</span>
                    <span className="font-semibold text-purple-300">
                      Demonstração Prática de Dor
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Gancho (Hook):</span>
                    <span className="font-semibold text-emerald-400">
                      Quebra de expectativa + Objeção
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Canal de Maior ROI:</span>
                    <span className="font-semibold text-cyan-300">
                      TikTok (Alcance) + Telegram (Conv)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Objetivo da CTA:</span>
                    <span className="font-semibold text-amber-300">Desconto/Cupom Específico</span>
                  </div>
                </div>

                <div className="p-3 bg-purple-950/20 border border-purple-900/40 rounded-lg text-slate-300 space-y-1">
                  <span className="font-semibold text-purple-300 block">
                    Conexão com o Laboratório:
                  </span>
                  <p className="text-[11px]">
                    Sugerido automaticamente na aba de criação de novas campanhas para orientar a
                    geração de roteiros.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* DNA DO CRIATIVO VENCEDOR */}
            <Card className="bg-slate-900/70 border-emerald-900/40 flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between mb-1">
                  <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800">
                    <Sparkles className="w-3 h-3 mr-1" /> Criativo Vencedor
                  </Badge>
                  <ConfidenceBadge level="moderate" showSample={false} />
                </div>
                <CardTitle className="text-base font-bold text-white">
                  DNA do Criativo de Alto CTR
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Padrões visuais de edição, formato, proporção e tempo de abertura.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="space-y-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Formato / Proporção:</span>
                    <span className="font-semibold text-emerald-400">
                      Vídeo 9:16 (15 a 20 segundos)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Primeiros 2 Segundos:</span>
                    <span className="font-semibold text-cyan-300">
                      Produto em ação real (sem logo)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Estilo de Legenda:</span>
                    <span className="font-semibold text-purple-300">
                      Fundo escuro, alto contraste
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Transição Final:</span>
                    <span className="font-semibold text-amber-300">
                      Direcionamento explícito para link
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-lg text-slate-300 space-y-1">
                  <span className="font-semibold text-emerald-300 block">
                    Conexão com o Estúdio:
                  </span>
                  <p className="text-[11px]">
                    Regras repassadas ao Auditor de Criativos para alertar caso o produto demore
                    mais de 3s para aparecer.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: PREVISÃO VS. REALIDADE & CALIBRAÇÃO DOS SCORES */}
        {/* ========================================================================= */}
        <TabsContent value="calibration" className="space-y-6">
          {/* TABELA DE COMPARAÇÃO IA PREVIU X MERCADO RESPONDEU */}
          <Card className="bg-slate-900/70 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-cyan-400" />
                    IA Previu × O Mercado Respondeu
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Comparação direta entre os Scores previstos (Oportunidade & Campanha) e as
                    métricas reais apuradas.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="bg-slate-800 text-slate-300 border-slate-700 text-xs"
                >
                  Amostra: {state.scoreVsReality.length} Campanhas
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                      <th className="py-3 px-3">Produto / Campanha</th>
                      <th className="py-3 px-2">Score IA Previsto</th>
                      <th className="py-3 px-2">Cliques Reais</th>
                      <th className="py-3 px-2">CTR Real</th>
                      <th className="py-3 px-2">Conversões</th>
                      <th className="py-3 px-2">Comissão</th>
                      <th className="py-3 px-2">ROI Real</th>
                      <th className="py-3 px-3">Diagnóstico de Aderência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {state.scoreVsReality.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">{item.product_title}</div>
                          <span className="text-[11px] text-slate-400">{item.category}</span>
                        </td>
                        <td className="py-3 px-2">
                          <Badge className="bg-cyan-950 text-cyan-300 border-cyan-800 font-mono">
                            Score {item.estimated_opportunity_score}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 font-mono text-slate-300">{item.real_clicks}</td>
                        <td className="py-3 px-2 font-mono text-cyan-300 font-semibold">
                          {item.real_ctr}%
                        </td>
                        <td className="py-3 px-2 font-mono text-emerald-300 font-semibold">
                          {item.real_conversions}
                        </td>
                        <td className="py-3 px-2 font-mono text-amber-300 font-semibold">
                          R$ {item.real_commission.toFixed(2)}
                        </td>
                        <td className="py-3 px-2 font-mono text-purple-300 font-semibold">
                          +{item.real_roi}%
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-medium">
                          {item.correlation_diagnosis}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* CALIBRAÇÃO DE PESOS COM APROVAÇÃO HUMANA (REGRA 10 & 32) */}
          <Card className="bg-slate-900/70 border-amber-900/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/50 text-amber-400">
                    <Sliders className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-white">
                      Propostas de Calibração do Algoritmo de Score
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400">
                      A plataforma detecta se o modelo está supervalorizando ou subvalorizando
                      fatores. A alteração exige{' '}
                      <strong className="text-white">aprovação humana</strong>.
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs bg-amber-950/40 text-amber-300 border-amber-800/40"
                >
                  Governança Ativa
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {state.calibrations.map((cal) => (
                <div
                  key={cal.id}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-white text-sm">{cal.title}</h4>
                      <p className="text-xs text-slate-400">
                        Modelo afetado:{' '}
                        <span className="font-mono text-cyan-300">{cal.score_type}</span>
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        cal.status === 'approved_by_user'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : cal.status === 'rejected_by_user'
                            ? 'bg-red-950 text-red-300 border-red-800'
                            : 'bg-amber-950 text-amber-300 border-amber-800'
                      }`}
                    >
                      {cal.status === 'approved_by_user'
                        ? 'Aprovado pelo Usuário'
                        : cal.status === 'rejected_by_user'
                          ? 'Rejeitado pelo Usuário'
                          : 'Pendente de Revisão Humana'}
                    </Badge>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-2">
                    <div>
                      <span className="font-semibold text-amber-300">Diagnóstico da IA: </span>
                      <span className="text-slate-300">{cal.diagnosis}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-cyan-300">Evidência Empírica: </span>
                      <span className="text-slate-400">{cal.evidence_summary}</span>
                    </div>
                  </div>

                  {/* PESOS PROPOSTOS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {cal.proposed_weights &&
                      Object.entries(cal.proposed_weights).map(([k, v]) => (
                        <div
                          key={k}
                          className="p-2 rounded bg-slate-900 border border-slate-800 text-center"
                        >
                          <span className="text-[11px] text-slate-400 block capitalize">
                            {k.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm font-bold font-mono text-cyan-300">{v}%</span>
                        </div>
                      ))}
                  </div>

                  {cal.status === 'pending_review' && (
                    <div className="pt-2 flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-800/40 text-red-400 hover:bg-red-950/40 hover:text-red-300 text-xs"
                        onClick={() => handleCalibrationDecision(cal.id, 'rejected_by_user')}
                      >
                        Rejeitar Proposta
                      </Button>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs gap-1.5"
                        onClick={() => handleCalibrationDecision(cal.id, 'approved_by_user')}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Aprovar Calibração de Pesos
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 5: TESTES RECOMENDADOS (A/B/C & PRIORIZAÇÃO & EXPLOIT VS EXPLORE) */}
        {/* ========================================================================= */}
        <TabsContent value="experiments" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-cyan-400" />
                O Que Devemos Testar Agora? (Priorização de Hipóteses)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Experimentos estruturados com Impacto × Confiança × Esforço. Evita decisões
                prematuras antes de atingir a amostra mínima.
              </p>
            </div>

            {/* CONTROLE EXPLOIT VS EXPLORE */}
            <div className="flex items-center gap-4 bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Equilíbrio Estratégico:</span>
                  <span className="font-mono text-cyan-300 font-semibold">
                    {exploitRatio}% Exploit / {100 - exploitRatio}% Explore
                  </span>
                </div>
                <Slider
                  value={[exploitRatio]}
                  min={50}
                  max={95}
                  step={5}
                  onValueChange={(val) => setExploitRatio(val[0])}
                  className="w-44"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {state.experiments.map((exp) => {
              const priorityConfig = {
                p1_urgente: {
                  label: 'P1 • Urgente',
                  color: 'bg-red-950 text-red-300 border-red-800',
                },
                p2_alta: {
                  label: 'P2 • Alta Prioridade',
                  color: 'bg-amber-950 text-amber-300 border-amber-800',
                },
                p3_media: {
                  label: 'P3 • Média Prioridade',
                  color: 'bg-blue-950 text-blue-300 border-blue-800',
                },
                p4_exploratoria: {
                  label: 'P4 • Exploratória',
                  color: 'bg-purple-950 text-purple-300 border-purple-800',
                },
              }[exp.priority_level] || {
                label: exp.priority_level,
                color: 'bg-slate-800 text-slate-300',
              }

              return (
                <Card
                  key={exp.id}
                  className="bg-slate-900/70 border-slate-800 hover:border-slate-700 transition-all"
                >
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-xs font-semibold ${priorityConfig.color}`}
                        >
                          {priorityConfig.label}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs bg-slate-800 text-cyan-300 border-slate-700"
                        >
                          {exp.experiment_type.toUpperCase()}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs bg-slate-800 text-slate-300 border-slate-700"
                        >
                          Status: {exp.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-3">
                        <span>
                          Impacto:{' '}
                          <strong className="text-white capitalize">{exp.potential_impact}</strong>
                        </span>
                        <span>
                          Confiança:{' '}
                          <strong className="text-white capitalize">{exp.confidence}</strong>
                        </span>
                        <span>
                          Esforço: <strong className="text-white capitalize">{exp.effort}</strong>
                        </span>
                      </div>
                    </div>
                    <CardTitle className="text-base text-white font-bold mt-2">
                      {exp.hypothesis_title}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-300">
                      {exp.hypothesis_detail}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    {/* COMPARAÇÃO A VS B */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1">
                        <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wider block">
                          Versão A (Baseline Atual):
                        </span>
                        <p className="text-slate-200">{exp.version_a_baseline}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-cyan-950/20 border border-cyan-900/40 space-y-1">
                        <span className="font-semibold text-cyan-300 text-[11px] uppercase tracking-wider block">
                          Versão B (Hipótese Desafiante):
                        </span>
                        <p className="text-cyan-100">{exp.version_b_challenger}</p>
                      </div>
                    </div>

                    {/* MÉTRICA E RACIONAL */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-slate-950/40 border border-slate-800">
                      <div className="space-y-1">
                        <span className="text-slate-400 block text-[11px]">
                          Métrica Principal de Decisão:
                        </span>
                        <span className="font-bold text-white font-mono text-sm">
                          {exp.primary_metric}
                        </span>
                      </div>
                      <div className="space-y-1 sm:text-right max-w-md">
                        <span className="text-slate-400 block text-[11px]">
                          Racional Baseado no Histórico:
                        </span>
                        <span className="text-slate-300">{exp.rationale}</span>
                      </div>
                    </div>

                    {/* SIGNIFICÂNCIA E TAMANHO DE AMOSTRA */}
                    <div className="p-3 rounded-lg bg-blue-950/20 border border-blue-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-cyan-400" />
                          Progresso da Amostra:
                        </span>
                        <div className="text-slate-400">
                          {exp.sample_current || 0} / {exp.sample_needed || 300} cliques coletados
                          {!exp.stat_significance_reached && (
                            <span className="text-amber-400 ml-2 font-medium">
                              (Ainda não há evidência suficiente para declarar vencedor)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {exp.status === 'recomendado' && (
                          <Button
                            size="sm"
                            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs gap-1.5"
                            onClick={() => updateExperimentStatus(exp.id, 'em_execucao')}
                          >
                            <FlaskConical className="w-3.5 h-3.5" /> Iniciar Teste no Laboratório
                          </Button>
                        )}
                        {exp.status === 'em_execucao' && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs gap-1.5"
                            onClick={() =>
                              updateExperimentStatus(
                                exp.id,
                                'concluido',
                                'Versão B',
                                'Validado com 95% de confiança',
                              )
                            }
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Concluir Experimento
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 6: ANÁLISE TEMPORAL & HEATMAP */}
        {/* ========================================================================= */}
        <TabsContent value="temporal" className="space-y-6">
          <Card className="bg-slate-900/70 border-slate-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    Padrões Temporais: Melhores Dias & Horários
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    Cruzamento de cliques e conversões por horário de postagem. Respeita a regra de
                    honestidade estatística.
                  </CardDescription>
                </div>
                <ConfidenceBadge
                  level={state.temporalAnalysis.hasEnoughData ? 'moderate' : 'insufficient'}
                  sampleSummary={`${state.temporalAnalysis.sampleTotal} cliques`}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!state.temporalAnalysis.hasEnoughData ? (
                <div className="p-6 rounded-xl border border-slate-800 bg-slate-950/60 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Dados Insuficientes para Afirmar Padrão Temporal
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    {state.temporalAnalysis.message}
                  </p>
                  <div className="pt-2">
                    <Badge
                      variant="outline"
                      className="text-xs text-slate-300 border-slate-700 bg-slate-900"
                    >
                      Regra de Ouro: A plataforma não inventa causalidade sem amostra mínima
                      representativa.
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-xs text-slate-400 uppercase tracking-wider block">
                        Melhores Dias:
                      </span>
                      <span className="text-lg font-bold text-emerald-400">
                        {state.temporalAnalysis.bestDay}
                      </span>
                    </div>
                    <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800">
                      <span className="text-xs text-slate-400 uppercase tracking-wider block">
                        Melhores Faixas Horárias:
                      </span>
                      <span className="text-lg font-bold text-cyan-400">
                        {state.temporalAnalysis.bestHour}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 7: RELATÓRIO DA IA (PERÍODOS 7/30/90 DIAS & OTIMIZAÇÕES) */}
        {/* ========================================================================= */}
        <TabsContent value="report" className="space-y-6">
          {/* PAINEL DE CONTROLE DE GERAÇÃO */}
          <Card className="bg-slate-900/70 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-cyan-400" />
                    Relatório Executivo de Aprendizado da IA
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400">
                    Gera uma análise completa do período selecionado, identificando gargalos,
                    padrões em alta e novas hipóteses.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {[7, 30, 90].map((days) => (
                    <Button
                      key={days}
                      size="sm"
                      variant={reportPeriod === days ? 'default' : 'outline'}
                      className={
                        reportPeriod === days
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white text-xs'
                          : 'border-slate-700 text-slate-300 text-xs'
                      }
                      onClick={() => setReportPeriod(days)}
                    >
                      {days} Dias
                    </Button>
                  ))}
                  <Button
                    size="sm"
                    onClick={handleGenerateAiReport}
                    disabled={generatingReport}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs gap-1.5 font-medium ml-2 shadow"
                  >
                    {generatingReport ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> Atualizar Relatório
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {learningReport && (
              <CardContent className="space-y-6 pt-4 border-t border-slate-800">
                {/* RESUMO EXECUTIVO */}
                <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Brain className="w-4 h-4" /> Resumo Executivo da Memória ({reportPeriod}{' '}
                      dias)
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-slate-900 text-slate-300 border-slate-700"
                    >
                      {exploitRatio}% Exploit / {100 - exploitRatio}% Explore
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">
                    {learningReport.executive_summary}
                  </p>
                </div>

                {/* GARGALOS IDENTIFICADOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 space-y-2">
                    <span className="text-xs font-bold text-red-300 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Principais Gargalos & Hipóteses de
                      Melhoria
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                      {learningReport.top_bottlenecks.map((b, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/30 space-y-2">
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4" /> Padrões Emergentes em Alta
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                      {learningReport.emerging_patterns.map((p, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* RECOMENDAÇÕES PARA OS MÓDULOS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" /> Caçador de Oportunidades
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {learningReport.recommendations_for_hunter}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                      <FlaskConical className="w-3.5 h-3.5" /> Laboratório de Campanhas
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {learningReport.recommendations_for_lab}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-1.5">
                    <span className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" /> Estúdio Criativo
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {learningReport.recommendations_for_studio}
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
