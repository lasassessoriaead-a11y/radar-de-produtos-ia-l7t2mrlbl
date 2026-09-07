import { getMercadoLivreSession, requireSupabaseUser } from '../../server/mercadolivre.js'

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { user, auth, url, key } = await requireSupabaseUser(req)
    const { session, setCookie } = await getMercadoLivreSession(req)
    if (setCookie) res.setHeader('Set-Cookie', setCookie)

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const reason = body.raw_data?.reason || {}
    const itemId = String(reason.offer_item_id || body.external_id || '').trim()
    if (!/^MLB\d+$/i.test(itemId)) {
      return res.status(400).json({ error: 'Item comercial do Mercado Livre ainda não foi confirmado.' })
    }

    const detailRes = await fetch(`https://api.mercadolibre.com/items/${encodeURIComponent(itemId)}`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        Accept: 'application/json',
      },
    })
    const item = await detailRes.json().catch(() => ({}))
    if (!detailRes.ok || !item?.id) {
      return res.status(detailRes.status || 400).json({
        error: item?.message || 'Não foi possível validar o item comercial no Mercado Livre.',
      })
    }

    const picture =
      (Array.isArray(item.pictures) && item.pictures[0]?.secure_url) ||
      (Array.isArray(item.pictures) && item.pictures[0]?.url) ||
      body.image_url ||
      ''
    const currentPrice = Number(item.price || body.promo_price || body.price || 0)
    const originalPrice = Number(item.original_price || body.price || currentPrice)
    const title = String(item.title || body.title || '').trim()
    const permalink = String(item.permalink || body.product_url || '')
    const commissionRate = Number(body.commission_rate || 0)
    const affiliateUrl = String(body.affiliate_url || '').trim()
    const affiliateEligible = Boolean(reason.affiliate_eligible === true || ['eligible','eligible_by_public_rules'].includes(String(reason.affiliate_eligibility || '')))
    if (!title || !permalink || currentPrice <= 0) {
      return res.status(400).json({ error: 'O item não possui dados suficientes para entrar no Radar.' })
    }
    if (!affiliateEligible || commissionRate <= 0 || !affiliateUrl) {
      return res.status(400).json({ error: 'Confirme elegibilidade, comissão e link oficial de afiliada antes de aprovar este produto.' })
    }

    const score = Number(body.opportunity_score || 0)
    const payload = {
      user_id: user.id,
      title,
      platform: 'Mercado Livre',
      product_url: permalink,
      affiliate_url: affiliateUrl,
      image_url: String(picture || '').replace(/^http:/, 'https:') || null,
      price: originalPrice > currentPrice ? originalPrice : currentPrice,
      promo_price: currentPrice,
      commission_rate: commissionRate,
      commission_amount: Number((currentPrice * commissionRate / 100).toFixed(2)),
      category: String(item.category_id || body.category || 'Mercado Livre'),
      niche: String(item.domain_id || body.niche || ''),
      status: 'active',
      score,
      sales_count: Number(item.sold_quantity || body.sales_count || 0),
      reviews_count: 0,
      rating: 0,
      seller: String(body.seller || ''),
      competition_level: 0,
      trends_score: 0,
      demand_score: 0,
      opportunity_score: score,
      opportunity_level:
        score >= 80 ? 'hot' : score >= 65 ? 'good' : score >= 50 ? 'test' : 'low',
      source: 'mercadolivre_api',
      metadata: {
        external_id: item.id,
        catalog_product_id: reason.catalog_product_id || item.catalog_product_id || null,
        seller_id: item.seller_id || body.raw_data?.seller_id || null,
        official_store_id: item.official_store_id || null,
        listing_type_id: item.listing_type_id || null,
        currency_id: item.currency_id || 'BRL',
        free_shipping: Boolean(item.shipping?.free_shipping),
        imported_at: new Date().toISOString(),
        api_verified: true,
        affiliate_eligible: true,
        affiliate_eligibility_source: reason.affiliate_eligibility_source || null,
        affiliate_commission_source: reason.affiliate_commission_source || 'manual_portal_confirmation',
        affiliate_link_source: reason.affiliate_link_source || 'mercadolivre_portal_afiliados',
      },
    }

    const save = await fetch(`${url}/rest/v1/products`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: auth,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(payload),
    })
    const rows = await save.json().catch(() => ([]))
    if (!save.ok) {
      return res.status(save.status).json({
        error: Array.isArray(rows) ? 'Falha ao salvar produto no Radar.' : rows?.message || 'Falha ao salvar produto no Radar.',
      })
    }

    return res.status(200).json({
      success: true,
      product: Array.isArray(rows) ? rows[0] : rows,
      message: 'Produto, comissão e link afiliado confirmados e salvos no Radar.',
    })
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || 'Não foi possível importar o produto.' })
  }
}
