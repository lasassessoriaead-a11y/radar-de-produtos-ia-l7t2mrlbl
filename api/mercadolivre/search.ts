import { getMercadoLivreSession, requireSupabaseUser } from '../../server/mercadolivre.js'

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
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  if (req.method !== 'POST') {
    return res.status(200).json({
      success: false,
      marketplace: 'Mercado Livre',
      status: 'method_not_allowed',
      message: 'Esta rota aceita apenas buscas POST.',
      total_found: 0,
      products: [],
    })
  }

  let phase = 'start'

  try {
    phase = 'radar_auth'
    await requireSupabaseUser(req)

    phase = 'mercadolivre_session'
    const { session, setCookie } = await getMercadoLivreSession(req)
    if (setCookie) res.setHeader('Set-Cookie', setCookie)

    phase = 'request_parse'
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
    const q = String(body.query || '').trim()
    const limit = clamp(Number(body.limit || 20), 1, 50)

    if (!q) {
      return res.status(200).json({
        success: false,
        marketplace: 'Mercado Livre',
        status: 'invalid_query',
        message: 'Informe o produto que deseja buscar.',
        total_found: 0,
        products: [],
      })
    }

    phase = 'mercadolivre_search'
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
        'User-Agent': 'RadarIA/1.0',
      },
    })

    const rawText = await rr.text()
    let data: any = {}
    try {
      data = rawText ? JSON.parse(rawText) : {}
    } catch {
      data = { raw: rawText.slice(0, 500) }
    }

    if (!rr.ok) {
      const mlMessage = String(data?.message || data?.error || data?.raw || '')

      // Mercado Livre can restrict the legacy site-wide textual search for an app.
      // Do not pretend there is another official endpoint that provides the same
      // marketplace-wide catalogue. Return the real upstream restriction clearly.
      if (rr.status === 403) {
        return res.status(200).json({
          success: false,
          marketplace: 'Mercado Livre',
          status: 'search_restricted',
          message:
            'Sua conta está conectada, mas o Mercado Livre não liberou a busca geral de produtos para este aplicativo. A conexão OAuth está válida; é necessário habilitar esse recurso no aplicativo do Mercado Livre para usar o Caçador com catálogo real.',
          api_status: rr.status,
          api_error: data?.error || null,
          upstream_message: mlMessage || null,
          phase,
          total_found: 0,
          products: [],
        })
      }

      return res.status(200).json({
        success: false,
        marketplace: 'Mercado Livre',
        status: rr.status === 401 ? 'token_required' : 'api_error',
        message:
          rr.status === 401
            ? 'A autorização do Mercado Livre precisa ser renovada.'
            : mlMessage || `A API do Mercado Livre respondeu com HTTP ${rr.status}.`,
        api_status: rr.status,
        api_error: data?.error || null,
        phase,
        total_found: 0,
        products: [],
      })
    }

    phase = 'map_results'
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
    const message = String(err?.message || err || 'Falha desconhecida.')
    const authProblem = /não conectado|expirada|autenticação|sessão|token|jwt|bearer/i.test(message)

    return res.status(200).json({
      success: false,
      marketplace: 'Mercado Livre',
      status: authProblem ? 'token_required' : 'internal_error',
      phase,
      total_found: 0,
      products: [],
      message: `Falha na etapa ${phase}: ${message}`,
    })
  }
}
