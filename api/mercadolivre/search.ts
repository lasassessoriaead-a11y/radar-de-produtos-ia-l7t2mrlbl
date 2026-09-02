import { getMercadoLivreSession, requireSupabaseUser } from '../../server/mercadolivre'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function opportunityScore(item: any) {
  const price = Number(item.price || 0)
  const sold = Number(item.sold_quantity || 0)
  const hasDiscount = Number(item.original_price || 0) > price && price > 0
  const freeShipping = Boolean(item.shipping?.free_shipping)
  let score = 42
  if (price >= 30 && price <= 350) score += 12
  if (sold >= 50) score += 8
  if (sold >= 250) score += 7
  if (sold >= 1000) score += 6
  if (hasDiscount) score += 8
  if (freeShipping) score += 6
  return clamp(score, 0, 96)
}

function level(score: number) {
  if (score >= 80) return 'hot'
  if (score >= 65) return 'good'
  if (score >= 50) return 'test'
  return 'low'
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    await requireSupabaseUser(req)
    const { session, setCookie } = await getMercadoLivreSession(req)
    if (setCookie) res.setHeader('Set-Cookie', setCookie)

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const q = String(body.query || '').trim()
    const limit = clamp(Number(body.limit || 20), 1, 50)
    if (!q) return res.status(400).json({ error: 'Informe o produto que deseja buscar.' })

    const endpoint = new URL('https://api.mercadolibre.com/sites/MLB/search')
    endpoint.searchParams.set('q', q)
    endpoint.searchParams.set('limit', String(limit))
    if (Number(body.min_price) > 0 || Number(body.max_price) > 0) {
      const min = Number(body.min_price || 0)
      const max = Number(body.max_price || 0)
      endpoint.searchParams.set('price', `${min || '*'}-${max || '*'}`)
    }

    const rr = await fetch(endpoint.toString(), {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        Accept: 'application/json',
      },
    })
    const data = await rr.json().catch(() => ({}))
    if (!rr.ok) {
      return res.status(rr.status).json({
        error: data?.message || data?.error || 'Falha na busca do Mercado Livre.',
        status: 'api_error',
      })
    }

    const raw = Array.isArray(data.results) ? data.results : []
    const products = raw
      .map((item: any) => {
        const score = opportunityScore(item)
        const price = Number(item.price || 0)
        const original = Number(item.original_price || 0)
        const image = String(item.secure_thumbnail || item.thumbnail || '').replace(/^http:/, 'https:')
        return {
          id: `ml_${item.id}`,
          collectionId: 'mercadolivre_live',
          collectionName: 'mercadolivre_live',
          external_id: String(item.id || ''),
          platform: 'Mercado Livre',
          title: String(item.title || ''),
          image_url: image,
          category: String(item.category_id || 'Mercado Livre'),
          niche: String(item.domain_id || ''),
          price: original > price ? original : price,
          promo_price: price,
          commission_rate: 0,
          commission_amount: 0,
          commission_is_estimated: false,
          sales_count: Number(item.sold_quantity || 0),
          reviews_count: 0,
          rating: 0,
          seller: String(item.seller?.nickname || ''),
          product_url: String(item.permalink || ''),
          affiliate_url: '',
          competition_level: 0,
          trends_score: 0,
          demand_score: 0,
          opportunity_score: score,
          opportunity_level: level(score),
          status: 'pending',
          source: 'mercadolivre_api',
          raw_data: {
            seller_id: item.seller?.id || null,
            category_id: item.category_id || null,
            domain_id: item.domain_id || null,
            listing_type_id: item.listing_type_id || null,
            free_shipping: Boolean(item.shipping?.free_shipping),
            official_store_id: item.official_store_id || null,
            currency_id: item.currency_id || 'BRL',
          },
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        }
      })
      .filter((x: any) => x.title && x.product_url && x.promo_price > 0)
      .filter((x: any) => !Number(body.min_sales) || x.sales_count >= Number(body.min_sales))
      .sort((a: any, b: any) => b.opportunity_score - a.opportunity_score)

    return res.status(200).json({
      success: true,
      marketplace: 'Mercado Livre',
      status: 'ok',
      message: `${products.length} produtos reais encontrados pela API oficial.`,
      total_found: products.length,
      paging: data.paging || {},
      products,
    })
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      marketplace: 'Mercado Livre',
      status: 'token_required',
      total_found: 0,
      products: [],
      message: err?.message || 'Mercado Livre não conectado.',
    })
  }
}
