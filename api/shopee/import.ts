import { requireSupabaseUser } from '../../server/mercadolivre.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { user, auth, url, key } = await requireSupabaseUser(req)
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    if (body.source !== 'shopee_affiliate_api') return res.status(400).json({ error: 'Produto Shopee inválido.' })

    const externalId = String(body.external_id || '').trim()
    const title = String(body.title || '').trim()
    const affiliateUrl = String(body.affiliate_url || '').trim()
    const productUrl = String(body.product_url || affiliateUrl || '').trim()
    if (!externalId || !title || !affiliateUrl) return res.status(400).json({ error: 'O produto não possui ID, título ou link oficial de afiliado.' })

    const price = Number(body.promo_price || body.price || 0)
    const score = Number(body.opportunity_score || 0)
    const payload = {
      user_id: user.id,
      title,
      platform: 'Shopee',
      product_url: productUrl,
      affiliate_url: affiliateUrl,
      image_url: String(body.image_url || '').replace(/^http:/, 'https:') || null,
      price,
      promo_price: price,
      commission_rate: Number(body.commission_rate || 0),
      commission_amount: Number(body.commission_amount || 0),
      category: String(body.category || 'Shopee'),
      niche: String(body.niche || ''),
      status: 'active',
      score,
      sales_count: Number(body.sales_count || 0),
      reviews_count: Number(body.reviews_count || 0),
      rating: Number(body.rating || 0),
      seller: String(body.seller || ''),
      competition_level: Number(body.competition_level || 0),
      trends_score: Number(body.trends_score || 0),
      demand_score: Number(body.demand_score || body.sales_count || 0),
      opportunity_score: score,
      opportunity_level: String(body.opportunity_level || (score >= 80 ? 'hot' : score >= 65 ? 'good' : score >= 50 ? 'test' : 'low')),
      source: 'shopee_affiliate_api',
      metadata: {
        external_id: externalId,
        shop_id: body.raw_data?.shop_id || null,
        shop_type: body.raw_data?.shop_type || null,
        price_max: body.raw_data?.price_max || null,
        discount_rate: body.raw_data?.discount_rate || null,
        seller_commission_rate: body.raw_data?.seller_commission_rate || null,
        shopee_commission_rate: body.raw_data?.shopee_commission_rate || null,
        relevance_score: body.raw_data?.relevance_score || null,
        affiliate_offer_url: affiliateUrl,
        affiliate_source: 'Shopee Affiliate Open API',
        sub_ids: { sub_id1: null, sub_id2: null, sub_id3: null, sub_id4: null, sub_id5: null },
        imported_at: new Date().toISOString(),
        api_verified: true,
      },
    }

    const save = await fetch(`${url}/rest/v1/products`, {
      method: 'POST',
      headers: { apikey: key, Authorization: auth, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify(payload),
    })
    const rows = await save.json().catch(() => ([]))
    if (!save.ok) return res.status(save.status).json({ error: Array.isArray(rows) ? 'Falha ao salvar produto Shopee no Radar.' : rows?.message || 'Falha ao salvar produto Shopee no Radar.' })

    return res.status(200).json({ success: true, product: Array.isArray(rows) ? rows[0] : rows, message: 'Produto Shopee e link oficial de afiliado salvos no Radar.' })
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || 'Não foi possível importar o produto Shopee.' })
  }
}
