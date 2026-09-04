import crypto from 'node:crypto'
import { requireSupabaseUser } from '../../server/mercadolivre.js'

const ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql'
const num = (v: any) => Number(v || 0)
const iso = (u: any) => u ? new Date(Number(u) * 1000).toISOString() : new Date().toISOString()
const statusMap = (s: any) => ({ UNPAID: 'pending', PENDING: 'pending', COMPLETED: 'completed', CANCELLED: 'cancelled' } as any)[String(s || '').toUpperCase()] || String(s || 'pending').toLowerCase()

async function shopeeGraphql(query: string) {
  const appId = String(process.env.SHOPEE_AFFILIATE_APP_ID || '').trim()
  const secret = String(process.env.SHOPEE_AFFILIATE_SECRET || '').trim()
  if (!appId || !secret) throw new Error('Credenciais da Shopee Affiliate API não configuradas.')
  const payload = JSON.stringify({ query })
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = crypto.createHash('sha256').update(`${appId}${timestamp}${payload}${secret}`, 'utf8').digest('hex')
  const rr = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}` },
    body: payload,
  })
  const data = await rr.json().catch(() => ({}))
  if (!rr.ok) throw new Error(data?.message || `Shopee respondeu HTTP ${rr.status}.`)
  if (data?.errors?.length) throw new Error(data.errors[0]?.extensions?.message || data.errors[0]?.message || 'Erro no relatório de conversões Shopee.')
  return data?.data || {}
}

function normalizeSubs(value: any): string[] {
  const values = Array.isArray(value) ? value.map(String) : String(value || '').split(/[,|]/)
  return values.map((x: string) => x.trim()).filter(Boolean)
}

function findLink(links: any[], rawSubs: string[]) {
  if (!rawSubs.length) return null
  const rawSet = new Set(rawSubs)

  const exact = links.find((link: any) => {
    const local = normalizeSubs(link?.shopee_sub_ids)
    return local.length === rawSubs.length && local.every((value: string, index: number) => value === rawSubs[index])
  })
  if (exact) return exact

  const sameSet = links.find((link: any) => {
    const local = normalizeSubs(link?.shopee_sub_ids)
    return local.length === rawSet.size && local.every((value: string) => rawSet.has(value))
  })
  if (sameSet) return sameSet

  const ranked = links
    .map((link: any) => {
      const local = normalizeSubs(link?.shopee_sub_ids)
      const score = local.filter((value: string) => rawSet.has(value)).length
      return { link, score }
    })
    .filter(({ score }: any) => score >= 2)
    .sort((a: any, b: any) => b.score - a.score)

  if (!ranked.length) return null
  if (ranked.length === 1 || ranked[0].score > ranked[1].score) return ranked[0].link
  return null
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { user, auth, url, key } = await requireSupabaseUser(req)
    const body = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})) : (req.query || {})
    const end = Math.floor(Date.now() / 1000)
    const start = body.start_time ? Number(body.start_time) : end - 30 * 86400
    const finish = body.end_time ? Number(body.end_time) : end
    if (!Number.isFinite(start) || !Number.isFinite(finish) || start >= finish) return res.status(400).json({ error: 'Período inválido.' })

    const headers = { apikey: key, Authorization: auth, 'Content-Type': 'application/json' }
    const tlr = await fetch(`${url}/rest/v1/tracking_links?user_id=eq.${encodeURIComponent(user.id)}&utm_source=eq.shopee&select=*`, { headers })
    const links = await tlr.json().catch(() => [])
    if (!tlr.ok) throw new Error('Não foi possível carregar os links rastreáveis.')

    let scrollId = '', pages = 0, received = 0, saved = 0, attributed = 0
    do {
      const scrollArg = scrollId ? `, scrollId: ${JSON.stringify(scrollId)}` : ''
      const data = await shopeeGraphql(`{ conversionReport(purchaseTimeStart: ${Math.floor(start)}, purchaseTimeEnd: ${Math.floor(finish)}, limit: 50${scrollArg}) { nodes { purchaseTime clickTime conversionId totalCommission sellerCommission shopeeCommissionCapped buyerType device utmContent orders { orderId orderStatus items { itemId itemName shopName itemPrice qty itemTotalCommission attributionType } } } pageInfo { limit hasNextPage scrollId } } }`)
      const report = data?.conversionReport
      const nodes = Array.isArray(report?.nodes) ? report.nodes : []
      received += nodes.length

      for (const conv of nodes) {
        const rawSubs = normalizeSubs(conv?.utmContent)
        const link = findLink(Array.isArray(links) ? links : [], rawSubs)
        if (link) attributed++

        for (const order of Array.isArray(conv?.orders) ? conv.orders : []) {
          const items = Array.isArray(order?.items) && order.items.length ? order.items : [null]
          for (let i = 0; i < items.length; i++) {
            const item = items[i]
            const externalId = `${conv.conversionId || order.orderId}:${order.orderId || 'order'}:${item?.itemId || i}`
            const sale = item ? num(item.itemPrice) * Math.max(1, num(item.qty)) : 0
            const commission = item ? num(item.itemTotalCommission) : num(conv.totalCommission)
            const existingReq = await fetch(`${url}/rest/v1/conversions?user_id=eq.${encodeURIComponent(user.id)}&source_type=eq.shopee_affiliate_api&external_order_id=eq.${encodeURIComponent(externalId)}&select=id,commission_validation_status,validated_commission_amount`, { headers })
            const existing = await existingReq.json().catch(() => [])
            const prior = Array.isArray(existing) ? existing[0] : null
            const isValidated = String(prior?.commission_validation_status || '').toLowerCase() === 'validated'

            const payload: any = {
              user_id: user.id,
              product_id: link?.product_id || null,
              campaign_id: link?.campaign_id || null,
              creative_id: link?.creative_id || null,
              publication_id: link?.publication_id || null,
              tracking_link_id: link?.id || null,
              variation_id: link?.variation_id || null,
              sub_id: rawSubs.join('|') || null,
              external_order_id: externalId,
              channel: link?.channel || null,
              sale_amount: sale,
              commission_amount: isValidated ? num(prior?.validated_commission_amount) : commission,
              estimated_commission_amount: commission,
              commission_validation_status: isValidated ? 'validated' : 'estimated',
              currency: 'BRL',
              status: statusMap(order?.orderStatus),
              source_type: 'shopee_affiliate_api',
              attribution_confidence: link ? 'high' : 'unmatched',
              attribution_method: link ? 'shopee_sub_ids' : 'shopee_report',
              conversion_date: iso(conv.purchaseTime),
              raw_payload: { conversion: conv, order, item, sub_ids: rawSubs },
              notes: isValidated ? 'Comissão final já validada pela Shopee.' : (link ? 'Atribuição automática robusta por Sub IDs da Shopee.' : 'Conversão Shopee sem correspondência local de Sub IDs.'),
              is_test_data: false,
            }

            const wr = prior?.id
              ? await fetch(`${url}/rest/v1/conversions?id=eq.${prior.id}&user_id=eq.${encodeURIComponent(user.id)}`, { method: 'PATCH', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(payload) })
              : await fetch(`${url}/rest/v1/conversions`, { method: 'POST', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(payload) })
            if (!wr.ok) {
              const e = await wr.json().catch(() => ({}))
              throw new Error(e?.message || 'Falha ao salvar conversão Shopee.')
            }
            saved++
          }
        }
      }

      pages++
      scrollId = String(report?.pageInfo?.scrollId || '')
      if (!report?.pageInfo?.hasNextPage) break
    } while (scrollId && pages < 20)

    for (const link of Array.isArray(links) ? links : []) {
      const cr = await fetch(`${url}/rest/v1/conversions?user_id=eq.${encodeURIComponent(user.id)}&tracking_link_id=eq.${link.id}&source_type=eq.shopee_affiliate_api&select=commission_amount`, { headers })
      const rows = await cr.json().catch(() => [])
      if (!cr.ok) continue
      await fetch(`${url}/rest/v1/tracking_links?id=eq.${link.id}&user_id=eq.${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify({
          conversions_count: Array.isArray(rows) ? rows.length : 0,
          commission_earned: Array.isArray(rows) ? rows.reduce((a: number, r: any) => a + num(r.commission_amount), 0) : 0,
        }),
      })
    }

    return res.status(200).json({ success: true, period: { start: iso(start), end: iso(finish) }, received, saved, attributed, unmatched: Math.max(0, received - attributed), pages, message: 'Conversões Shopee sincronizadas com o Radar.' })
  } catch (err: any) {
    return res.status(400).json({ error: err?.message || 'Não foi possível sincronizar as conversões da Shopee.' })
  }
}
