type SupabaseSession = { user: any; auth: string; url: string; key: string }

export type HunterLearningContext = {
  channel?: string
  subId?: string
  campaignId?: string
}

export type LearnedProduct = {
  title: string
  category: string
  niche: string
  commissionRate: number
  completed: number
  pending: number
  cancelled: number
  attributed: number
  total: number
  commission: number
  validatedCommission: number
  grossSales: number
  channelCounts: Record<string, number>
  subIdCounts: Record<string, number>
  campaignCounts: Record<string, number>
}

function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)) }
function num(value: any) { const n = Number(String(value ?? '').replace(',', '.')); return Number.isFinite(n) ? n : 0 }
function normalize(value: string) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim() }
function tokens(value: string) { return normalize(value).split(' ').filter(x => x.length >= 4) }
function record(value: any): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [String(k), num(v)]))
}
function countFor(map: Record<string, number>, key?: string) {
  if (!key) return 0
  const wanted = normalize(key)
  for (const [k, v] of Object.entries(map)) if (normalize(k) === wanted) return num(v)
  return 0
}
function topKey(map: Record<string, number>) {
  return Object.entries(map).sort((a, b) => num(b[1]) - num(a[1]))[0]?.[0] || ''
}

export async function loadHunterLearningProfile(session: SupabaseSession): Promise<LearnedProduct[]> {
  const select = encodeURIComponent('title,category,niche,commission_rate,metadata')
  const r = await fetch(`${session.url}/rest/v1/products?user_id=eq.${encodeURIComponent(session.user.id)}&platform=eq.Shopee&is_test_data=eq.false&select=${select}`, {
    headers: { apikey: session.key, Authorization: session.auth },
  })
  const rows = await r.json().catch(() => [])
  if (!r.ok || !Array.isArray(rows)) return []

  return rows.map((row: any) => {
    const p = row?.metadata?.performance_learning || {}
    return {
      title: String(row?.title || ''),
      category: String(row?.category || ''),
      niche: String(row?.niche || ''),
      commissionRate: num(row?.commission_rate),
      completed: num(p.completed_conversions),
      pending: num(p.pending_conversions),
      cancelled: num(p.cancelled_conversions),
      attributed: num(p.attributed_conversions),
      total: num(p.conversions_total),
      commission: num(p.commission_amount),
      validatedCommission: num(p.validated_commission_amount),
      grossSales: num(p.gross_sales_amount),
      channelCounts: record(p.channel_counts),
      subIdCounts: record(p.sub_id_counts),
      campaignCounts: record(p.campaign_counts),
    }
  }).filter((x: LearnedProduct) => x.total > 0 || x.completed > 0 || x.pending > 0 || x.cancelled > 0 || x.commission > 0 || x.validatedCommission > 0 || x.grossSales > 0)
}

export function hunterLearnedBoost(
  candidateTitle: string,
  candidateCategory: string,
  candidateNiche: string,
  candidateCommissionRate: number,
  history: LearnedProduct[],
  context: HunterLearningContext = {},
) {
  const cTokens = new Set(tokens(candidateTitle))
  const cCategory = normalize(candidateCategory)
  const cNiche = normalize(candidateNiche)
  let best = { boost: 0, matchedTitle: '', evidence: 0, topChannel: '', topSubId: '', topCampaignId: '', reasons: [] as string[] }

  for (const item of history) {
    const hTokens = tokens(item.title)
    if (!hTokens.length || !cTokens.size) continue

    const shared = hTokens.filter(t => cTokens.has(t)).length
    const similarity = (2 * shared) / Math.max(1, hTokens.length + cTokens.size)
    if (similarity < 0.16) continue

    const category = normalize(item.category)
    const niche = normalize(item.niche)
    const categoryMatch = Boolean(cCategory && category && cCategory !== 'shopee' && category !== 'shopee' && cCategory === category)
    const nicheMatch = Boolean(cNiche && niche && cNiche === niche)
    const positive = item.completed * 4 + item.pending * 1.25
    const money = Math.min(5, item.validatedCommission / 20) + Math.min(3, item.grossSales / 300)
    const cancelPenalty = item.total > 0 ? Math.min(5, (item.cancelled / item.total) * 8) : 0
    const attributionConfidence = item.total > 0 ? Math.min(2, (item.attributed / item.total) * 2) : 0
    const commissionAffinity = item.completed + item.pending > 0 && candidateCommissionRate > 0 && item.commissionRate > 0
      ? (candidateCommissionRate >= item.commissionRate ? 2 : Math.max(0, (candidateCommissionRate / item.commissionRate) * 1.5))
      : 0

    const channelHits = countFor(item.channelCounts, context.channel)
    const subIdHits = countFor(item.subIdCounts, context.subId)
    const campaignHits = context.campaignId ? num(item.campaignCounts[context.campaignId]) : 0
    const contextBoost = Math.min(2.5, channelHits * 0.75) + Math.min(3, subIdHits) + Math.min(2.5, campaignHits * 0.75)

    const boost = clamp(Math.round(
      similarity * 9 +
      (categoryMatch ? 2 : 0) +
      (nicheMatch ? 2 : 0) +
      Math.min(10, positive + money) +
      attributionConfidence +
      commissionAffinity +
      contextBoost -
      cancelPenalty
    ), -5, 22)

    const evidence = item.completed + item.pending + item.cancelled
    if (boost > best.boost || (boost === best.boost && evidence > best.evidence)) {
      const reasons: string[] = []
      if (similarity >= 0.45) reasons.push('produto_semelhante')
      if (item.completed > 0) reasons.push('vendas_concluidas')
      if (item.validatedCommission > 0) reasons.push('comissao_validada')
      if (channelHits > 0) reasons.push('canal_vencedor')
      if (subIdHits > 0) reasons.push('sub_id_vencedor')
      if (campaignHits > 0) reasons.push('campanha_vencedora')
      if (commissionAffinity >= 1.5) reasons.push('comissao_competitiva')
      best = {
        boost,
        matchedTitle: item.title,
        evidence,
        topChannel: topKey(item.channelCounts),
        topSubId: topKey(item.subIdCounts),
        topCampaignId: topKey(item.campaignCounts),
        reasons,
      }
    }
  }

  return best
}
