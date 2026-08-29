import React from 'react'
import { ConfidenceLevel, InsightStatus } from '@/types/learning'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react'

interface ConfidenceBadgeProps {
  level: ConfidenceLevel
  sampleSummary?: string
  showSample?: boolean
  className?: string
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  level,
  sampleSummary,
  showSample = true,
  className = '',
}) => {
  const config = {
    insufficient: {
      label: '⚪ INSUFICIENTE',
      desc: 'Amostra estatística pequena (< 100 cliques / < 3 campanhas). A IA não deve declarar conclusões causais.',
      color: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
      icon: HelpCircle,
      textColor: 'text-slate-400',
    },
    low: {
      label: '🟡 BAIXA CONFIANÇA',
      desc: 'Padrão inicial observado (100–300 cliques), com variância relevante entre os testes.',
      color: 'bg-amber-950/40 text-amber-300 border-amber-800/40',
      icon: AlertCircle,
      textColor: 'text-amber-400',
    },
    moderate: {
      label: '🟠 CONFIANÇA MODERADA',
      desc: 'Padrão consistente com amostra representativa (300–800 cliques e 15+ conversões).',
      color: 'bg-orange-950/40 text-orange-300 border-orange-800/40',
      icon: ShieldAlert,
      textColor: 'text-orange-400',
    },
    high: {
      label: '🟢 ALTA CONFIANÇA',
      desc: 'Padrão comprovado com alta consistência estatística (800+ cliques e 30+ conversões).',
      color: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/40',
      icon: ShieldCheck,
      textColor: 'text-emerald-400',
    },
  }[level] || {
    label: '⚪ INSUFICIENTE',
    desc: 'Dados insuficientes.',
    color: 'bg-slate-800 text-slate-400 border-slate-700',
    icon: HelpCircle,
    textColor: 'text-slate-400',
  }

  const Icon = config.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1.5 ${className}`}>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.color} cursor-help transition-colors`}
            >
              <Icon className="w-3.5 h-3.5" />
              {config.label}
            </span>
            {showSample && sampleSummary && (
              <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
                (Amostra: {sampleSummary})
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs bg-slate-900 border-slate-700 text-xs p-3 text-slate-200 shadow-xl">
          <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
            <Icon className={`w-4 h-4 ${config.textColor}`} />
            Nível de Confiança: {config.label}
          </p>
          <p className="text-slate-300 mb-2">{config.desc}</p>
          {sampleSummary && (
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span className="font-semibold text-slate-300">Amostra real de suporte:</span>
              <p className="font-mono text-cyan-300 mt-0.5">{sampleSummary}</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export const StatusBadge: React.FC<{ status: InsightStatus }> = ({ status }) => {
  const map: Record<InsightStatus, { label: string; bg: string; icon: any }> = {
    novo: { label: 'Novo', bg: 'bg-blue-950/60 text-blue-400 border-blue-800/40', icon: Clock },
    revisado: {
      label: 'Revisado',
      bg: 'bg-purple-950/60 text-purple-400 border-purple-800/40',
      icon: Clock,
    },
    aceito: {
      label: 'Aceito',
      bg: 'bg-cyan-950/60 text-cyan-400 border-cyan-800/40',
      icon: CheckCircle2,
    },
    descartado: {
      label: 'Descartado',
      bg: 'bg-slate-800 text-slate-400 border-slate-700',
      icon: XCircle,
    },
    em_teste: {
      label: 'Em Teste',
      bg: 'bg-amber-950/60 text-amber-400 border-amber-800/40',
      icon: Clock,
    },
    validado: {
      label: 'Validado',
      bg: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40',
      icon: CheckCircle2,
    },
    refutado: {
      label: 'Refutado',
      bg: 'bg-red-950/60 text-red-400 border-red-800/40',
      icon: XCircle,
    },
  }

  const item = map[status] || map.novo
  const Icon = item.icon

  return (
    <Badge
      variant="outline"
      className={`gap-1 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${item.bg}`}
    >
      <Icon className="w-3 h-3" />
      {item.label}
    </Badge>
  )
}
