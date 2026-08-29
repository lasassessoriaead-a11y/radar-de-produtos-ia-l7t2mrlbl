import React, { useState } from 'react'
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  DollarSign,
  Link as LinkIcon,
  ShoppingBag,
  Send,
  Eye,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScoreRing } from '@/components/ScoreRing'
import type { CreativeRecord, CreativeReviewReport, CommercialValidation } from '@/types/creative'
import { creativeService } from '@/services/creatives'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CreativeAuditorProps {
  creative: Partial<CreativeRecord>
  reviewReport?: CreativeReviewReport | null
  commercialValidation?: CommercialValidation | null
  onAuditQuality: () => void
  onRevalidateCommercial: () => void
  onPublishReady: () => void
  isAuditing?: boolean
  isValidating?: boolean
}

export function CreativeAuditor({
  creative,
  reviewReport,
  commercialValidation,
  onAuditQuality,
  onRevalidateCommercial,
  onPublishReady,
  isAuditing = false,
  isValidating = false,
}: CreativeAuditorProps) {
  const [publishing, setPublishing] = useState(false)

  const reviewStatus = reviewReport?.status || creative.review_status || 'approved'
  const creativeScore = reviewReport?.score || creative.creative_score || 88
  const scoreBreakdown = reviewReport?.score_breakdown ||
    creative.score_breakdown || {
      visual_clarity: 90,
      hook_power: 88,
      product_highlight: 86,
      readability: 92,
      audience_fit: 85,
      channel_fit: 88,
      cta_power: 87,
    }

  const canPublish = commercialValidation?.can_publish ?? false

  const getReviewBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          label: '🟢 APROVADO',
          classes: 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30',
          desc: 'Em total conformidade com diretrizes comerciais e persuasão ética.',
        }
      case 'needs_revision':
        return {
          label: '🟡 REVISAR',
          classes: 'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/30',
          desc: 'Ajustes recomendados de texto ou densidade para maximizar aprovação em anúncios.',
        }
      case 'blocked':
        return {
          label: '🔴 BLOQUEADO',
          classes: 'bg-[#FF3D00]/15 text-[#FF3D00] border-[#FF3D00]/30',
          desc: 'Risco de distorção de produto, falsa urgência ou preço inconsistente.',
        }
      default:
        return {
          label: '🟢 APROVADO',
          classes: 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30',
          desc: 'Pronto para veiculação.',
        }
    }
  }

  const badgeConfig = getReviewBadge(reviewStatus)

  return (
    <div className="space-y-6 text-xs">
      {/* SECTION 1: SCORE CRIATIVO (0-100) & REVISOR DE CRIATIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Score & Verdict Card */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[#121420] border border-[#232738] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#232738]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00F2FF]" />
                <h3 className="text-sm font-bold text-white">Score Criativo (0–100)</h3>
              </div>
              <span className="text-[10px] font-mono text-gray-400">Estimativa Pré-teste</span>
            </div>

            <div className="py-4 flex items-center justify-center gap-6">
              <ScoreRing score={creativeScore} size="lg" />
              <div className="space-y-1">
                <span
                  className={cn(
                    'text-xs font-black font-mono px-2.5 py-1 rounded border',
                    badgeConfig.classes,
                  )}
                >
                  {badgeConfig.label}
                </span>
                <div className="text-xs text-gray-300 font-semibold pt-1">
                  Parecer do Revisor IA
                </div>
                <div className="text-[11px] text-gray-400 line-clamp-2">
                  {reviewReport?.verdict_summary || 'Hierarquia visual equilibrada e gancho claro.'}
                </div>
              </div>
            </div>
          </div>

          <Button
            size="sm"
            onClick={onAuditQuality}
            disabled={isAuditing}
            className="w-full h-9 bg-gradient-to-r from-[#00F2FF] to-[#00C4D4] hover:opacity-90 text-[#0A0B10] font-bold text-xs gap-1.5 shadow-[0_0_15px_rgba(0,242,255,0.2)]"
          >
            {isAuditing ? (
              <div className="w-3.5 h-3.5 border-2 border-[#0A0B10] border-t-transparent rounded-full animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Executar Revisor de Criativo
          </Button>
        </div>

        {/* 7 Breakdown Factors */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[#121420] border border-[#232738] space-y-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#00E676]" />
            Fatores de Performance & Conformidade Avaliados
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {[
              { label: 'Clareza Visual & Hierarquia', score: scoreBreakdown.visual_clarity },
              { label: 'Força do Gancho (Hook)', score: scoreBreakdown.hook_power },
              { label: 'Destaque do Produto Real', score: scoreBreakdown.product_highlight },
              { label: 'Legibilidade dos Textos', score: scoreBreakdown.readability },
              { label: 'Coerência com o Público', score: scoreBreakdown.audience_fit },
              { label: 'Adequação ao Canal', score: scoreBreakdown.channel_fit },
              { label: 'Força e Clareza do CTA', score: scoreBreakdown.cta_power },
            ].map((f, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-[#0A0B10] border border-[#212638] space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-300 font-medium">{f.label}</span>
                  <span className="font-mono font-bold text-[#00F2FF]">{f.score || 85} pts</span>
                </div>
                <div className="w-full bg-[#1A1D2D] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00F2FF] to-[#00E676] rounded-full"
                    style={{ width: `${f.score || 85}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SECTION 2: REVALIDAÇÃO COMERCIAL OBRIGATÓRIA ANTES DE PUBLICAR */}
      <div className="p-5 rounded-2xl bg-[#141624] border border-[#232738] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#232738]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#00E676]/20 text-[#00E676] flex items-center justify-center border border-[#00E676]/40">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Revalidação Comercial Obrigatória
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#7000FF]/20 text-[#C084FC] border border-[#7000FF]/40">
                  ANTI-DESATUALIZAÇÃO
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Nunca assuma preço antigo. Checagem em tempo real de estoque, comissão e link de
                afiliado.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={onRevalidateCommercial}
            disabled={isValidating}
            className="h-8 border-[#2B3047] bg-[#0E1018] text-gray-300 hover:text-white gap-1.5"
          >
            {isValidating ? (
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Revalidar Agora
          </Button>
        </div>

        {/* Commercial Checklist Items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {commercialValidation?.checklist ? (
            commercialValidation.checklist.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  'p-3.5 rounded-xl border flex flex-col justify-between space-y-1.5',
                  item.passed
                    ? 'bg-[#00E676]/5 border-[#00E676]/30 text-white'
                    : 'bg-[#FF3D00]/5 border-[#FF3D00]/30 text-gray-300',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">{item.item}</span>
                  {item.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
                  ) : (
                    <XCircle className="w-4 h-4 text-[#FF3D00]" />
                  )}
                </div>
                <p className="text-[10px] text-gray-400">{item.detail}</p>
              </div>
            ))
          ) : (
            <div className="col-span-4 p-4 rounded-xl bg-[#0A0B10] border border-[#212638] text-center text-gray-400">
              Clique em &quot;Revalidar Agora&quot; para verificar disponibilidade do produto, preço
              atualizado e link de afiliado.
            </div>
          )}
        </div>

        {/* Final Status Action Row */}
        <div className="pt-3 border-t border-[#232738] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Status do Criativo:</span>
            <span className="font-mono font-bold text-white bg-[#1A1D2E] px-2.5 py-1 rounded border border-[#2F354D] uppercase">
              {creative.status === 'ready_to_publish'
                ? '🚀 PRONTO PARA PUBLICAR'
                : creative.status || 'Rascunho'}
            </span>
          </div>

          <Button
            size="sm"
            onClick={onPublishReady}
            disabled={!canPublish || creative.status === 'ready_to_publish'}
            className={cn(
              'h-9 px-5 font-black text-xs gap-1.5 shadow-lg',
              canPublish
                ? 'bg-gradient-to-r from-[#00E676] to-[#00C462] hover:opacity-90 text-[#0A0B10] shadow-[0_0_20px_rgba(0,230,118,0.3)]'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700',
            )}
          >
            <CheckCircle2 className="w-4 h-4" />
            {creative.status === 'ready_to_publish'
              ? 'Marcado como Pronto'
              : 'Marcar: Pronto para Publicar'}
          </Button>
        </div>
      </div>
    </div>
  )
}
