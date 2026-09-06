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

export type LearnedNiche = {
  platform: string
  nicheKey: string
  productsCount: number
  total: number
  completed: number
  pending: number
  cancelled: number
  grossSales: number
  commission: number
  validatedCommission: number
  topChannel: string
  topSubId: string
  topCampaignId: string
  confidenceScore: number
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

export function inferHunterNiche(title: string, niche = '', category = '') {
  const n = normalize(niche)
  const c = normalize(category)
  const t = normalize(title)
  if (n && n !== 'shopee') return n.replace(/ /g, '_')
  if (c && !['shopee', 'mercado livre', 'tiktok shop', 'tiktok'].includes(c)) return c.replace(/ /g, '_')
  if (/(secador|chapinha|alisador|babyliss|escova.*cabelo|shampoo|condicionador|mascara.*cabelo|serum.*cabelo)/.test(t)) return 'beleza_cabelos'
  if (/(maquiagem|batom|base facial|rimel|mascara de cilios|skincare|pele|perfume)/.test(t)) return 'beleza_cosmeticos'
  if (/(cozinha|panela|frigideira|air fryer|cafeteira|liquidificador|mixer)/.test(t)) return 'casa_cozinha'
  if (/(fone|headset|carregador|smartwatch|caixa de som|bluetooth|celular|smartphone)/.test(t)) return 'eletronicos'
  if (/(vestido|camiseta|calca|short|tenis|sandalia|bolsa feminina|mochila)/.test(t)) return 'moda'
  if (/(cachorro|gato|pet|racao|coleira|arranhador)/.test(t)) return 'pet'
  if (/(academia|fitness|musculacao|halter|elastico|yoga)/.test(t)) return 'fitness'
  if (/(bebe|mamadeira|fralda|carrinho de bebe|chupeta)/.test(t)) return 'bebe'
  if (/(carro|moto|automotivo|veicular|pneu|capacete)/.test(t)) return 'automotivo'
  if (/(furadeira|parafusadeira|serra|ferramenta|broca)/.test(t)) return 'ferramentas'
  if (/(gamer|gaming|controle|joystick|console|mouse gamer|teclado gamer)/.test(t)) return 'games'
  return 'outros'
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

export async function loadHunterNicheProfile(session: SupabaseSession): Promise<LearnedNiche[]> {
  const select = encodeURIComponent('platform,niche_key,products_count,conversions_total,completed_conversions,pending_conversions,cancelled_conversions,gross_sales_amount,commission_amount,validated_commission_amount,top_channel,top_sub_id,top_campaign_id,confidence_score')
  const r = await fetch(`${session.url}/rest/v1/hunter_niche_learning?user_id=eq.${encodeURIComponent(session.user.id)}&platform=eq.Shopee&select=${select}`, {
    headers: { apikey: session.key, Authorization: session.auth },
  })
  const rows = await r.json().catch(() => [])
  if (!r.ok || !Array.isArray(rows)) return []
  return rows.map((row: any) => ({
    platform: String(row?.platform || ''),
    nicheKey: String(row?.niche_key || 'outros'),
    productsCount: num(row?.products_count),
    total: num(row?.conversions_total),
    completed: num(row?.completed_conversions),
    pending: num(row?.pending_conversions),
    cancelled: num(row?.cancelled_conversions),
    grossSales: num(row?.gross_sales_amount),
    commission: num(row?.commission_amount),
    validatedCommission: num(row?.validated_commission_amount),
    topChannel: String(row?.top_channel || ''),
    topSubId: String(row?.top_sub_id || ''),
    topCampaignId: String(row?.top_campaign_id || ''),
    confidenceScore: num(row?.confidence_score),
  })).filter((x: LearnedNiche) => x.total > 0)
}

export function hunterNicheBoost(candidateTitle: string, candidateNiche: string, candidateCategory: string, history: LearnedNiche[], context: HunterLearningContext = {}) {
  const nicheKey = inferHunterNiche(candidateTitle, candidateNiche, candidateCategory)
  const item = history.find(x => normalize(x.nicheKey).replace(/ /g, '_') === nicheKey)
  if (!item) return { boost: 0, nicheKey, evidence: 0, confidence: 0, topChannel: '', topSubId: '', topCampaignId: '', reasons: [] as string[] }

  const completionRate = item.total > 0 ? item.completed / item.total : 0
  const cancelRate = item.total > 0 ? item.cancelled / item.total : 0
  const contextBoost =
    (context.channel && normalize(context.channel) === normalize(item.topChannel) ? 2 : 0) +
    (context.subId && normalize(context.subId) === normalize(item.topSubId) ? 2 : 0) +
    (context.campaignId && normalize(context.campaignId) === normalize(item.topCampaignId) ? 1.5 : 0)
  const moneySignal = Math.min(4, item.validatedCommission / 25) + Math.min(3, item.grossSales / 400)
  const evidenceSignal = Math.min(8, item.completed * 2.5 + item.pending)
  const qualitySignal = Math.max(-4, completionRate * 5 - cancelRate * 6)
  const confidenceSignal = Math.min(4, item.confidenceScore / 25)
  const boost = clamp(Math.round(evidenceSignal + moneySignal + qualitySignal + confidenceSignal + contextBoost), -5, 18)

  const reasons: string[] = []
  if (item.completed > 0) reasons.push('nicho_com_vendas')
  if (item.validatedCommission > 0) reasons.push('nicho_com_comissao_validada')
  if (completionRate >= 0.5 && item.total >= 2) reasons.push('nicho_alta_conversao')
  if (context.channel && normalize(context.channel) === normalize(item.topChannel)) reasons.push('nicho_canal_vencedor')
  if (context.subId && normalize(context.subId) === normalize(item.topSubId)) reasons.push('nicho_sub_id_vencedor')

  return { boost, nicheKey, evidence: item.total, confidence: item.confidenceScore, topChannel: item.topChannel, topSubId: item.topSubId, topCampaignId: item.topCampaignId, reasons }
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
