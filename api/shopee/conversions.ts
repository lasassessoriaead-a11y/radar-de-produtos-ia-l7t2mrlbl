import crypto from 'node:crypto'
import { requireSupabaseUser } from '../../server/mercadolivre.js'

const ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql'

async function shopeeGraphql(query: string) {
  const appId = String(process.env.SHOPEE_AFFILIATE_APP_ID || '').trim()
  const secret = String(process.env.SHOPEE_AFFILIATE_SECRET || '').trim()
  if (!appId || !secret) throw new Error('Credenciais da Shopee Affiliate API não configuradas.')
  const payload = JSON.stringify({ query })
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = crypto.createHash('sha256').update(`${appId}${timestamp}${payload}${secret}`, 'utf8').digest('hex')
  const rr = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}` }, body: payload })
  const data = await rr.json().catch(() => ({}))
  if (!rr.ok) throw new Error(data?.message || `Shopee respondeu HTTP ${rr.status}.`)
  if (Array.isArray(data?.errors) && data.errors.length) throw new Error(data.errors[0]?.extensions?.message || data.errors[0]?.message || 'Erro no relatório de conversões Shopee.')
  return data?.data || {}
}

const num = (v: any) => Number(v || 0)
const iso = (unix: any) => unix ? new Date(Number(unix) * 1000).toISOString() : new Date().toISOString()
const statusMap = (s: any) => ({ UNPAID: 'pending', PENDING: 'pending', COMPLETED: 'completed', CANCELLED: 'cancelled' } as Record<string,string>)[String(s || '').toUpperCase()] || String(s || 'pending').toLowerCase()

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { user, auth, url, key } = await requireSupabaseUser(req)
    const body = req.method === 'POST' ? (typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})) : req.query || {}
    const end = Math.floor(Date.now()/1000)
    const start = body.start_time ? Number(body.start_time) : end - 30*86400
    const finish = body.end_time ? Number(body.end_time) : end
    if (!Number.isFinite(start) || !Number.isFinite(finish) || start >= finish) return res.status(400).json({ error: 'Período inválido.' })
    const headers = { apikey: key, Authorization: auth, 'Content-Type': 'application/json' }
    const tlr = await fetch(`${url}/rest/v1/tracking_links?user_id=eq.${encodeURIComponent(user.id)}&utm_source=eq.shopee&select=*`, { headers })
    const links = await tlr.json().catch(() => ([]))
    if (!tlr.ok) throw new Error('Não foi possível carregar os links rastreáveis.')
    const bySubs = new Map<string, any>()
    for (const l of links || []) {
      const a = Array.isArray(l.shopee_sub_ids) ? l.shopee_sub_ids.map(String) : []
      if (a.length) bySubs.set(a.join('|'), l)
    }

    let scrollId = ''
    let pages = 0
    let received = 0
    let saved = 0
    let attributed = 0
    const maxPages = 20
    do {
      const scrollArg = scrollId ? `, scrollId: ${JSON.stringify(scrollId)}` : ''
      const query = `{ conversionReport(purchaseTimeStart: ${Math.floor(start)}, purchaseTimeEnd: ${Math.floor(finish)}, limit: 50${scrollArg}) { nodes { purchaseTime clickTime conversionId totalCommission sellerCommission shopeeCommissionCapped buyerType device utmContent orders { orderId orderStatus items { itemId itemName shopName itemPrice qty itemTotalCommission attributionType } } } pageInfo { limit hasNextPage scrollId } } }`
      const data = await shopeeGraphql(query)
      const report = data?.conversionReport
      const nodes = Array.isArray(report?.nodes) ? report.nodes : []
      received += nodes.length
      for (const conv of nodes) {
        const rawSubs = Array.isArray(conv?.utmContent) ? conv.utmContent.map(String) : String(conv?.utmContent || '').split(/[,|]/).map((x:string)=>x.trim()).filter(Boolean)
        const link = bySubs.get(rawSubs.join('|')) || null
        if (link) attributed++
        const orders = Array.isArray(conv?.orders) ? conv.orders : []
        for (const order of orders) {
          const items = Array.isArray(order?.items) && order.items.length ? order.items : [null]
          for (let i=0;i<items.length;i++) {
            const item = items[i]
            const externalId = `${conv.conversionId || order.orderId}:${order.orderId || 'order'}:${item?.itemId || i}`
            const sale = item ? num(item.itemPrice) * Math.max(1, num(item.qty)) : 0
            const commission = item ? num(item.itemTotalCommission) : num(conv.totalCommission)
            const payload:any = { user_id:user.id, product_id:link?.product_id || null, campaign_id:link?.campaign_id || null, creative_id:link?.creative_id || null, publication_id:link?.publication_id || null, tracking_link_id:link?.id || null, variation_id:link?.variation_id || null, sub_id:rawSubs.join('|') || null, external_order_id:externalId, channel:link?.channel || null, sale_amount:sale, commission_amount:commission, currency:'BRL', status:statusMap(order?.orderStatus), source_type:'shopee_affiliate_api', attribution_confidence:link ? 'high' : 'unmatched', attribution_method:link ? 'shopee_sub_ids' : 'shopee_report', conversion_date:iso(conv.purchaseTime), raw_payload:{ conversion:conv, order, item, sub_ids:rawSubs }, notes:link ? 'Atribuição automática por Sub IDs da Shopee.' : 'Conversão Shopee sem correspondência local de Sub IDs.', is_test_data:false }
            const existingReq = await fetch(`${url}/rest/v1/conversions?user_id=eq.${encodeURIComponent(user.id)}&source_type=eq.shopee_affiliate_api&external_order_id=eq.${encodeURIComponent(externalId)}&select=id`, { headers })
            const existing = await existingReq.json().catch(()=>[])
            if (Array.isArray(existing) && existing[0]?.id) {
              const ur = await fetch(`${url}/rest/v1/conversions?id=eq.${existing[0].id}&user_id=eq.${encodeURIComponent(user.id)}`, { method:'PATCH', headers:{...headers, Prefer:'return=minimal'}, body:JSON.stringify(payload) })
              if (!ur.ok) throw new Error('Falha ao atualizar conversão Shopee.')
            } else {
              const ir = await fetch(`${url}/rest/v1/conversions`, { method:'POST', headers:{...headers, Prefer:'return=minimal'}, body:JSON.stringify(payload) })
              if (!ir.ok) { const e=await ir.json().catch(()=>({})); throw new Error(e?.message || 'Falha ao salvar conversão Shopee.') }
            }
            saved++
          }
        }
      }
      pages++
      scrollId = String(report?.pageInfo?.scrollId || '')
      if (!report?.pageInfo?.hasNextPage) break
    } while (scrollId && pages < maxPages)

    for (const link of links || []) {
      const cr = await fetch(`${url}/rest/v1/conversions?user_id=eq.${encodeURIComponent(user.id)}&tracking_link_id=eq.${link.id}&source_type=eq.shopee_affiliate_api&select=commission_amount`, { headers })
      const rows = await cr.json().catch(()=>[])
      if (!cr.ok) continue
      const count = Array.isArray(rows) ? rows.length : 0
      const commission = Array.isArray(rows) ? rows.reduce((a:number,r:any)=>a+num(r.commission_amount),0) : 0
      await fetch(`${url}/rest/v1/tracking_links?id=eq.${link.id}&user_id=eq.${encodeURIComponent(user.id)}`, { method:'PATCH', headers:{...headers, Prefer:'return=minimal'}, body:JSON.stringify({ conversions_count:count, commission_earned:commission }) })
    }
    return res.status(200).json({ success:true, period:{ start:iso(start), end:iso(finish) }, received, saved, attributed, unmatched:Math.max(0,received-attributed), pages, message:'Conversões Shopee sincronizadas com o Radar.' })
  } catch (err:any) {
    return res.status(400).json({ error:err?.message || 'Não foi possível sincronizar as conversões da Shopee.' })
  }
}
