import { OpportunityLevel } from '@/types/product'

export function getOpportunityLevelInfo(
  level: OpportunityLevel | string | undefined,
  score?: number,
) {
  let resolvedLevel: OpportunityLevel = 'test'
  if (level === 'hot' || (score !== undefined && score >= 80)) resolvedLevel = 'hot'
  else if (level === 'good' || (score !== undefined && score >= 60)) resolvedLevel = 'good'
  else if (level === 'test' || (score !== undefined && score >= 40)) resolvedLevel = 'test'
  else if (level === 'low' || (score !== undefined && score < 40)) resolvedLevel = 'low'

  switch (resolvedLevel) {
    case 'hot':
      return {
        level: 'hot' as const,
        label: 'Alta oportunidade',
        icon: '🔥',
        badgeBg: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        textClass: 'text-orange-500',
        borderClass: 'border-orange-500',
        cardGlow: 'shadow-[0_0_20px_rgba(249,115,22,0.15)] ring-1 ring-orange-500/20',
        color: '#f97316',
        description: 'Excelente margem e alto apelo visual/conversão',
      }
    case 'good':
      return {
        level: 'good' as const,
        label: 'Bom potencial',
        icon: '🟢',
        badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        textClass: 'text-emerald-500',
        borderClass: 'border-emerald-500',
        cardGlow: 'shadow-[0_0_20px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/20',
        color: '#10b981',
        description: 'Boa demanda e equilíbrio de margem consistente',
      }
    case 'test':
      return {
        level: 'test' as const,
        label: 'Testar',
        icon: '🟡',
        badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        textClass: 'text-amber-500',
        borderClass: 'border-amber-500',
        cardGlow: 'shadow-[0_0_20px_rgba(245,158,11,0.1)] ring-1 ring-amber-500/20',
        color: '#f59e0b',
        description: 'Exige criativos específicos e testes controlados',
      }
    case 'low':
    default:
      return {
        level: 'low' as const,
        label: 'Baixa oportunidade',
        icon: '🔴',
        badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
        textClass: 'text-rose-400',
        borderClass: 'border-rose-500',
        cardGlow: 'shadow-[0_0_20px_rgba(244,63,94,0.08)] ring-1 ring-rose-500/20',
        color: '#f43f5e',
        description: 'Margem ínfima, nota baixa ou saturação extrema',
      }
  }
}

export function formatCurrency(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val)
}

export function formatNumber(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0'
  return new Intl.NumberFormat('pt-BR').format(val)
}

export function calculateLocalScore(data: {
  price?: number
  promo_price?: number
  commission_rate?: number
  commission_amount?: number
  sales_count?: number
  reviews_count?: number
  rating?: number
  competition_level?: number
  trends_score?: number
  demand_score?: number
}): { score: number; level: OpportunityLevel; commission_amount: number; commission_rate: number } {
  const price = data.price || 0
  const promoPrice = data.promo_price || price
  const effectivePrice = promoPrice > 0 ? promoPrice : price

  let commRate = data.commission_rate || 0
  let commAmount = data.commission_amount || 0

  if (commAmount <= 0 && commRate > 0 && effectivePrice > 0) {
    commAmount = Math.round(effectivePrice * (commRate / 100) * 100) / 100
  } else if (commRate <= 0 && commAmount > 0 && effectivePrice > 0) {
    commRate = Math.round((commAmount / effectivePrice) * 100 * 10) / 10
  }

  const sales = data.sales_count || 0
  const rating = data.rating || 0
  const comp = data.competition_level || 5
  const trends = data.trends_score || 5
  const demand = data.demand_score || 5

  let commScore = 0
  if (commAmount >= 50) commScore = 25
  else if (commAmount >= 30) commScore = 22
  else if (commAmount >= 15) commScore = 18
  else if (commAmount >= 8) commScore = 14
  else if (commAmount >= 4) commScore = 9
  else commScore = Math.max(1, Math.min(6, commAmount * 1.5))

  let salesScore = 0
  if (sales >= 2000) salesScore = 20
  else if (sales >= 800) salesScore = 16
  else if (sales >= 200) salesScore = 12
  else if (sales >= 50) salesScore = 8
  else salesScore = Math.min(6, sales * 0.1)

  let ratingScore = 0
  if (rating >= 4.7) ratingScore = 20
  else if (rating >= 4.4) ratingScore = 17
  else if (rating >= 4.0) ratingScore = 13
  else if (rating >= 3.5) ratingScore = 7
  else if (rating > 0) ratingScore = 2
  else ratingScore = 10

  const trendDemandScore = Math.round((trends * 1.0 + demand * 1.0) * 1.0)
  const compPenalty = Math.max(0, Math.min(15, (comp - 3) * 2))

  let finalScore = Math.round(commScore + salesScore + ratingScore + trendDemandScore - compPenalty)
  if (finalScore < 5) finalScore = 5
  if (finalScore > 98) finalScore = 98

  if (rating > 0 && rating < 3.8 && finalScore > 40) {
    finalScore = 30
  }

  let level: OpportunityLevel = 'test'
  if (finalScore >= 80) level = 'hot'
  else if (finalScore >= 60) level = 'good'
  else if (finalScore >= 40) level = 'test'
  else level = 'low'

  return {
    score: finalScore,
    level,
    commission_amount: commAmount,
    commission_rate: commRate,
  }
}
