import crypto from 'node:crypto'

const ENDPOINT = 'https://open-api.affiliate.shopee.com.br/graphql'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function num(value: any) {
  const n = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function ratePercent(value: any) {
  const n = num(value)
  return n > 0 && n <= 1 ? n * 100 : n
}

function opportunityScore(sales: number, rating: number, commissionRate: number, price: number) {
  let score = 35
  if (sales >= 10000) score += 22
  else if (sales >= 1000) score += 17
  else if (sales >= 100) score += 10
  if (rating >= 4.8) score += 14
  else if (rating >= 4.5) score += 10
  else if (rating >= 4) score += 5
  if (commissionRate >= 10) score += 18
  else if (commissionRate >= 5) score += 12
  else if (commissionRate > 0) score += 6
  if (price >= 20 && price <= 500) score += 8
  return clamp(score, 0, 98)
}

function level(score: number) {
  if (score >= 80) return 'hot'
  if (score >= 65) return 'good'
  if (score >= 50) return 'test'
  return 'low'
}

async function shopeeGraphql(query: string, variables: Record<string, any>) {
  const appId = String(process.env.SHOPEE_AFFILIATE_APP_ID || '').trim()
  const secret = String(process.env.SHOPEE_AFFILIATE_SECRET || '').trim()
  if (!appId || !secret) throw new Error('Credenciais da Shopee Affiliate API não configuradas.')

  const payload = JSON.stringify({ query, variables })
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = crypto
    .createHash('sha256')
    .update(`${appId}${timestamp}${payload}${secret}`, 'utf8')
    .digest('hex')

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `SHA256 Credential=${appId}, Timestamp=${timestamp}, Signature=${signature}`,
    },
    body: payload,
  })

  const text = await response.text()
  let data: any = {}
  try { data = text ? JSON.parse(text) : {} } catch { data = { raw: text } }
  if (!response.ok) throw new Error(data?.message || `Shopee respondeu HTTP ${response.status}.`)
  if (Array.isArray(data?.errors) && data.errors.length) {
    const error = data.errors[0]
    throw new Error(error?.extensions?.message || error?.message || 'Erro retornado pela Shopee Affiliate API.')
  }
  return data?.data || {}
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Use POST.' })

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const keyword = String(body.query || '').trim()
    const limit = clamp(Number(body.limit || 30), 1, 100)
    const page = Math.max(1, Number(body.page || (Number(body.offset || 0) / limit + 1) || 1))
    if (!keyword) return res.status(200).json({ success: false, status: 'invalid_query', message: 'Informe um produto para buscar.', total_found: 0, products: [] })

    const query = `query RadarShopeeProducts($keyword: String!, $page: Int!, $limit: Int!) {
      productOfferV2(keyword: $keyword, listType: 0, sortType: 1, page: $page, limit: $limit) {
        nodes {
          itemId productName productLink offerLink imageUrl priceMin priceMax priceDiscountRate
          sales ratingStar commissionRate sellerCommissionRate shopeeCommissionRate commission
          shopId shopName shopType periodStartTime periodEndTime
        }
        pageInfo { page limit hasNextPage }
      }
    }`

    const data = await shopeeGraphql(query, { keyword, page, limit })
    const result = data?.productOfferV2 || {}
    const nodes = Array.isArray(result?.nodes) ? result.nodes : []

    let products = nodes.map((p: any) => {
      const price = num(p.priceMin || p.priceMax)
      const sales = num(p.sales)
      const rating = num(p.ratingStar)
      const commissionRate = ratePercent(p.commissionRate)
      const commission = num(p.commission)
      const score = opportunityScore(sales, rating, commissionRate, price)
      return {
        id: `shopee_${p.shopId || 'shop'}_${p.itemId}`,
        collectionId: 'shopee_affiliate', collectionName: 'shopee_affiliate',
        external_id: String(p.itemId || ''), platform: 'Shopee', title: String(p.productName || ''),
        image_url: String(p.imageUrl || '').replace(/^http:/, 'https:'), category: 'Shopee', niche: '',
        price, promo_price: price, commission_rate: commissionRate, commission_amount: commission,
        commission_is_estimated: true, sales_count: sales, reviews_count: 0, rating,
        seller: String(p.shopName || ''), product_url: String(p.productLink || ''), affiliate_url: String(p.offerLink || ''),
        competition_level: 0, trends_score: 0, demand_score: sales, opportunity_score: score,
        opportunity_level: level(score), status: 'pending', source: 'shopee_affiliate_api',
        raw_data: {
          shop_id: p.shopId || null, shop_type: p.shopType || null, price_max: num(p.priceMax),
          discount_rate: num(p.priceDiscountRate), seller_commission_rate: ratePercent(p.sellerCommissionRate),
          shopee_commission_rate: ratePercent(p.shopeeCommissionRate), period_start_time: p.periodStartTime || null,
          period_end_time: p.periodEndTime || null, data_source: 'Shopee Affiliate Open API',
        },
        created: new Date().toISOString(), updated: new Date().toISOString(),
      }
    })

    if (Number(body.min_price)) products = products.filter((p: any) => p.price >= Number(body.min_price))
    if (Number(body.max_price)) products = products.filter((p: any) => p.price <= Number(body.max_price))
    if (Number(body.min_sales)) products = products.filter((p: any) => p.sales_count >= Number(body.min_sales))
    if (Number(body.min_rating)) products = products.filter((p: any) => p.rating >= Number(body.min_rating))
    if (Number(body.estimated_commission_rate)) products = products.filter((p: any) => p.commission_rate >= Number(body.estimated_commission_rate))

    const pageInfo = result?.pageInfo || {}
    return res.status(200).json({
      success: true, marketplace: 'Shopee', status: 'ok',
      message: `${products.length} produtos encontrados pela Shopee Affiliate Open API.`,
      total_found: products.length, products, page,
      offset: (page - 1) * limit, next_offset: page * limit,
      has_more: Boolean(pageInfo?.hasNextPage), page_info: pageInfo,
      source_mode: 'shopee_affiliate_open_api',
    })
  } catch (err: any) {
    return res.status(200).json({ success: false, marketplace: 'Shopee', status: 'api_error', total_found: 0, products: [], message: String(err?.message || err) })
  }
}
