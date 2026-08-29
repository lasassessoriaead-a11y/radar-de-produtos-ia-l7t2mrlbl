import React from 'react'
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Users,
  Target,
  ShieldAlert,
  ExternalLink,
  Bot,
  X,
  Zap,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScoreRing } from './ScoreRing'
import { OpportunityBadge } from './OpportunityBadge'
import type { HunterWhyAiPickedResult, DiscoveredProductRecord } from '@/types/product'

interface WhyAiPickedModalProps {
  isOpen: boolean
  onClose: () => void
  product: DiscoveredProductRecord | null
  analysis: HunterWhyAiPickedResult | null
  loading: boolean
  onApprove?: (product: DiscoveredProductRecord) => void
}

export const WhyAiPickedModal: React.FC<WhyAiPickedModalProps> = ({
  isOpen,
  onClose,
  product,
  analysis,
  loading,
  onApprove,
}) => {
  if (!product) return null

  const effectivePrice =
    product.promo_price && product.promo_price > 0 ? product.promo_price : product.price

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#10121C] border border-[#232738] text-white p-0 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-[#1E2232] bg-[#141624]/60 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#7000FF]/20 text-[#00F2FF] border border-[#7000FF]/40 font-bold flex items-center gap-1">
                  <Bot className="w-3 h-3 text-[#00F2FF]" />
                  Analista do Radar IA
                </span>
                <OpportunityBadge level={product.opportunity_level} size="sm" />
              </div>
              <DialogTitle className="text-lg font-bold text-white tracking-tight">
                Por que a IA escolheu este produto?
              </DialogTitle>
              <p className="text-xs text-gray-400 line-clamp-1">{product.title}</p>
            </div>

            <div className="flex items-center gap-3">
              <ScoreRing score={product.opportunity_score} size="md" />
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <div className="w-10 h-10 rounded-full border-2 border-[#7000FF] border-t-[#00F2FF] animate-spin" />
              <div className="text-xs font-mono text-gray-400">
                O Analista IA está avaliando pontos fortes, fracos, audiência e ângulo de venda...
              </div>
            </div>
          ) : analysis ? (
            <>
              {/* AI Explanation / Summary */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-[#7000FF]/15 to-[#00F2FF]/10 border border-[#7000FF]/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#00F2FF] uppercase tracking-wider font-mono">
                  <Sparkles className="w-4 h-4 text-[#00F2FF]" />
                  Veredito do Analista
                </div>
                <p className="text-xs md:text-sm text-gray-200 leading-relaxed font-sans">
                  {analysis.explanation}
                </p>
              </div>

              {/* Strengths & Weaknesses Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="p-4 rounded-xl bg-[#141624] border border-[#1E2336] space-y-2.5">
                  <div className="text-xs font-bold text-[#00E676] flex items-center gap-1.5 uppercase font-mono">
                    <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
                    Pontos Fortes
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    {analysis.strengths?.length > 0 ? (
                      analysis.strengths.map((str, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#00E676] font-bold">•</span>
                          <span>{str}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500">Boa relação de preço e validação.</li>
                    )}
                  </ul>
                </div>

                {/* Weaknesses / Points of Attention */}
                <div className="p-4 rounded-xl bg-[#141624] border border-[#1E2336] space-y-2.5">
                  <div className="text-xs font-bold text-[#FFD600] flex items-center gap-1.5 uppercase font-mono">
                    <AlertTriangle className="w-4 h-4 text-[#FFD600]" />
                    Pontos de Atenção / Fracos
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-300">
                    {analysis.weaknesses?.length > 0 ? (
                      analysis.weaknesses.map((wk, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-[#FFD600] font-bold">•</span>
                          <span>{wk}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-gray-500">
                        Exige criativo com boa demonstração prática.
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Target Audience, Selling Angle and Risk */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Audience */}
                <div className="p-3.5 rounded-xl bg-[#121422] border border-[#1F2436] space-y-1.5">
                  <div className="text-[11px] font-bold text-[#00F2FF] flex items-center gap-1 uppercase font-mono">
                    <Users className="w-3.5 h-3.5 text-[#00F2FF]" />
                    Público Provável
                  </div>
                  <p className="text-xs text-gray-300 leading-snug">
                    {analysis.target_audience ||
                      'Consumidores em busca de praticidade e bom custo-benefício.'}
                  </p>
                </div>

                {/* Selling Angle */}
                <div className="p-3.5 rounded-xl bg-[#121422] border border-[#1F2436] space-y-1.5">
                  <div className="text-[11px] font-bold text-[#C084FC] flex items-center gap-1 uppercase font-mono">
                    <Target className="w-3.5 h-3.5 text-[#C084FC]" />
                    Ângulo de Venda
                  </div>
                  <p className="text-xs text-gray-300 leading-snug">
                    {analysis.selling_angle ||
                      'Demonstração de solução rápida do problema em vídeo curto.'}
                  </p>
                </div>

                {/* Risk Level */}
                <div className="p-3.5 rounded-xl bg-[#121422] border border-[#1F2436] space-y-1.5">
                  <div className="text-[11px] font-bold text-gray-300 flex items-center gap-1 uppercase font-mono">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#FF3D00]" />
                    Nível de Risco
                  </div>
                  <div className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded border text-[11px] ${
                        analysis.risk_level === 'Baixo'
                          ? 'bg-[#00E676]/15 text-[#00E676] border-[#00E676]/30'
                          : analysis.risk_level === 'Alto'
                            ? 'bg-[#FF3D00]/15 text-[#FF3D00] border-[#FF3D00]/30'
                            : 'bg-[#FFD600]/15 text-[#FFD600] border-[#FFD600]/30'
                      }`}
                    >
                      {analysis.risk_level || 'Médio'}
                    </span>
                    <span className="text-[10px] text-gray-400">para teste de tráfego</span>
                  </div>
                </div>
              </div>

              {/* Data Transparency Notice */}
              <div className="p-3 rounded-xl bg-[#0B0D14] border border-[#1B1E2D] text-[11px] text-gray-400 font-mono flex items-center justify-between">
                <span>
                  Fonte Conectada: <strong>{product.platform || 'Mercado Livre (MLB)'}</strong>
                </span>
                <span className="text-gray-500">Preço: R$ {effectivePrice.toFixed(2)}</span>
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-xs text-gray-400">
              Não foi possível carregar a análise do agente no momento.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1E2232] bg-[#141624]/60 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs border-[#2A2F45] text-gray-300"
          >
            Fechar
          </Button>

          <div className="flex items-center gap-2">
            {product.product_url && (
              <a
                href={product.product_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#2A2F45] bg-[#121422] hover:bg-[#1C2034] text-xs font-semibold text-gray-300 hover:text-white"
              >
                Ver no Mercado Livre
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </a>
            )}

            {onApprove && (
              <Button
                size="sm"
                onClick={() => {
                  onApprove(product)
                  onClose()
                }}
                className="bg-gradient-to-r from-[#00E676] to-[#00C853] text-[#0A0B10] font-bold text-xs gap-1 shadow-[0_0_12px_rgba(0,230,118,0.3)]"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Aprovar para o Radar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
