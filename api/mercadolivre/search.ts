import { getMercadoLivreSession, requireSupabaseUser } from '../../server/mercadolivre.js'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function relevanceScore(query: string, title: string, domain: string) {
  const q = normalizeText(query).trim()
  const t = normalizeText(title)
  const d = normalizeText(domain)
  const tokens = q.split(/\s+/).filter((x) => x.length >= 2)

  let score = 35
  const covered = tokens.filter((token) => t.includes(token)).length
  if (tokens.length) score += Math.round((covered / tokens.length) * 35)
  if (t.includes(q)) score += 12

  // Ambiguous Brazilian search "secador" normally means hair dryer.
  // Prioritize hair-dryer domains/titles unless the user explicitly asks
  // for hands/clothes/food drying.
  if (
    q === 'secador' ||
    (q.includes('secador') &&
      !/(mao|maos|roupa|roupas|alimento|alimentos|unha|unhas)/.test(q))
  ) {
    if (/hair_dryers|secador.*cabelo|cabelo.*secador|hair dryer/.test(d + ' ' + t)) score += 30
    if (/hand_dryers|drying_racks|secador.*mao|secador.*roupa|roupa.*secador/.test(d + ' ' + t)) score -= 35
  }

  return clamp(score, 0, 100)
}

function opportunityScore(price: number, competitors: number, relevance = 60) {
  let score = 48
  if (price >= 30 && price <= 350) score += 14
  else if (price > 350 && price <= 1000) score += 8
  if (competitors > 0 && competitors <= 5) score += 18
  else if (competitors <= 15) score += 12
  else if (competitors <= 40) score += 6
  else if (competitors > 80) score -= 8

  // Relevance is part of the opportunity: a strong product outside the
  // user's intent should not outrank a closely matching product.
  score += Math.round((relevance - 60) * 0.35)
  return clamp(score, 0, 96)
}

function level(score: number) {
  if (score >= 80) return 'hot'
  if (score >= 65) return 'good'
  if (score >= 50) return 'test'
  return 'low'
}

async function mlJson(url: string, token: string) {
  const rr = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'User-Agent': 'RadarIA/1.0',
    },
  })
  const text = await rr.text()
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text.slice(0, 500) }
  }
  return { rr, data }
}

function productImage(product: any) {
  const pic =
    product?.pictures?.[0]?.secure_url ||
    product?.pictures?.[0]?.url ||
    product?.thumbnail ||
    ''
  return String(pic).replace(/^http:/, 'https:')
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
    const limit = clamp(Number(body.limit || 20), 1, 30)

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

    // The old /sites/MLB/search?q=... marketplace-wide text search is not
    // available to this app. Mercado Livre officially supports keyword
    // discovery through the catalog product search endpoint.
    phase = 'catalog_search'
    const endpoint = new URL('https://api.mercadolibre.com/products/search')
    endpoint.searchParams.set('status', 'active')
    endpoint.searchParams.set('site_id', 'MLB')
    endpoint.searchParams.set('q', q)
    endpoint.searchParams.set('limit', String(limit))

    const { rr, data } = await mlJson(endpoint.toString(), session.access_token)

    if (!rr.ok) {
      const mlMessage = String(data?.message || data?.error || data?.raw || '')
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

    const catalogProducts = Array.isArray(data.results) ? data.results.slice(0, limit) : []

    phase = 'catalog_offers'
    const enriched = await Promise.all(
      catalogProducts.map(async (product: any) => {
        const productId = String(product?.id || '')
        if (!productId) return null

        const offersUrl = new URL(
          `https://api.mercadolibre.com/products/${encodeURIComponent(productId)}/items`
        )
        offersUrl.searchParams.set('limit', '100')

        const offersResponse = await mlJson(offersUrl.toString(), session.access_token)
        const offers = offersResponse.rr.ok && Array.isArray(offersResponse.data?.results)
          ? offersResponse.data.results
          : []

        const validOffers = offers
          .filter((x: any) => Number(x?.price) > 0)
          .sort((a: any, b: any) => Number(a.price) - Number(b.price))

        const best = validOffers[0] || null
        const firstOfferId = String(best?.item_id || '')

        let item: any = null
        if (firstOfferId) {
          const detailResponse = await mlJson(
            `https://api.mercadolibre.com/items/${encodeURIComponent(firstOfferId)}`,
            session.access_token
          )
          if (detailResponse.rr.ok) item = detailResponse.data
        }

        const price = Number(item?.price || best?.price || 0)
        const competitors = Number(
          offersResponse.data?.paging?.total ?? validOffers.length ?? 0
        )
        const title = String(item?.title || product?.name || product?.title || '')
        const domainId = String(product?.domain_id || '')
        const relevance = relevanceScore(q, title, domainId)
        const score = opportunityScore(price, competitors, relevance)
        const url = String(item?.permalink || '')

        let seller = String(item?.seller?.nickname || '')
        const sellerId = item?.seller_id || item?.seller?.id || best?.seller_id || best?.seller?.id
        if (!seller && sellerId) {
          const sellerResponse = await mlJson(
            `https://api.mercadolibre.com/users/${encodeURIComponent(String(sellerId))}`,
            session.access_token
          )
          if (sellerResponse.rr.ok) {
            seller = String(sellerResponse.data?.nickname || '')
          }
        }

        const image =
          String(
            item?.pictures?.[0]?.secure_url ||
              item?.pictures?.[0]?.url ||
              productImage(product)
          ).replace(/^http:/, 'https:')
        const soldQuantity = Number(item?.sold_quantity || 0)

        return {
          id: `ml_catalog_${productId}`,
          collectionId: 'mercadolivre_catalog',
          collectionName: 'mercadolivre_catalog',
          external_id: productId,
          platform: 'Mercado Livre',
          title,
          image_url: image,
          category: String(best?.category_id || product?.domain_id || 'Mercado Livre'),
          niche: String(product?.domain_id || ''),
          price,
          promo_price: price,
          commission_rate: 0,
          commission_amount: 0,
          commission_is_estimated: false,
          sales_count: soldQuantity,
          reviews_count: 0,
          rating: 0,
          seller,
          product_url: url,
          affiliate_url: '',
          competition_level: competitors,
          trends_score: 0,
          demand_score: 0,
          opportunity_score: score,
          opportunity_level: level(score),
          status: 'pending',
          source: 'mercadolivre_catalog_api',
          raw_data: {
            catalog_product_id: productId,
            domain_id: product?.domain_id || null,
            relevance_score: relevance,
            catalog_status: product?.status || null,
            listing_strategy: product?.settings?.listing_strategy || null,
            offers_total: competitors,
            best_offer_item_id: firstOfferId || null,
            sold_quantity_available: soldQuantity > 0,
            rating_available: false,
            seller_id: sellerId || null,
            condition: item?.condition || null,
            free_shipping: Boolean(item?.shipping?.free_shipping),
            currency_id: item?.currency_id || best?.currency_id || 'BRL',
          },
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        }
      })
    )

    phase = 'map_results'
    const products = enriched
      .filter(Boolean)
      .filter((x: any) => x.title)
      .filter((x: any) => !Number(body.min_price) || x.promo_price >= Number(body.min_price))
      .filter((x: any) => !Number(body.max_price) || x.promo_price <= Number(body.max_price))
      .filter((x: any) => Number(x.raw_data?.relevance_score || 0) >= 30)
      .sort((a: any, b: any) => {
        const relevanceDiff =
          Number(b.raw_data?.relevance_score || 0) - Number(a.raw_data?.relevance_score || 0)
        if (Math.abs(relevanceDiff) >= 10) return relevanceDiff
        return b.opportunity_score - a.opportunity_score
      })

    return res.status(200).json({
      success: true,
      marketplace: 'Mercado Livre',
      status: 'ok',
      message: `${products.length} produtos reais encontrados no catálogo oficial do Mercado Livre.`,
      total_found: products.length,
      paging: data.paging || {},
      products,
      source_mode: 'catalog_products_with_marketplace_offers',
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
