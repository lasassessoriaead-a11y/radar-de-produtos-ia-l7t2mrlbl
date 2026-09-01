function extractShopeeIds(raw: string) {
  try {
    const u = new URL(raw)
    let m = u.pathname.match(/\/opaanlp\/(\d+)\/(\d+)/i)
    if (m) return { shopid: m[1], itemid: m[2] }
    m = u.pathname.match(/-i\.(\d+)\.(\d+)/i)
    if (m) return { shopid: m[1], itemid: m[2] }
  } catch {}
  return null
}

function cleanTitle(title: string) {
  return title
    .replace(/\s*[|–-]\s*Shopee Brasil.*$/i, '')
    .replace(/\s*[|–-]\s*Shopee.*$/i, '')
    .trim()
}

function normWords(value: string) {
  const stop = new Set(['de','da','do','das','dos','e','com','para','por','em','um','uma','a','o'])
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/).filter(w => w.length > 2 && !stop.has(w))
}

function titleSimilarity(a: string, b: string) {
  const A = new Set(normWords(a))
  const B = new Set(normWords(b))
  if (!A.size || !B.size) return 0
  let hit = 0
  for (const w of A) if (B.has(w)) hit++
  return hit / Math.max(A.size, B.size)
}

function priceFromText(value: string) {
  const m = String(value || '').match(/R\$\s*([0-9.]+(?:,[0-9]{1,2})?)/i)
  if (!m) return 0
  return Number(m[1].replace(/\./g, '').replace(',', '.')) || 0
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const key = process.env.GOOGLE_SEARCH_API_KEY
  const cx = process.env.GOOGLE_SEARCH_CX
  if (!key || !cx) return res.status(500).json({ error: 'Google Search não configurado.' })

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})
  const productUrl = String(body.product_url || body.url || '').trim()
  const detectedTitle = cleanTitle(String(body.detected_title || body.title || '').trim())
  const suppliedIds = body.shopee_ids && body.shopee_ids.shopid && body.shopee_ids.itemid
    ? { shopid: String(body.shopee_ids.shopid), itemid: String(body.shopee_ids.itemid) }
    : null
  const ids = suppliedIds || extractShopeeIds(productUrl)
  if (!productUrl) return res.status(400).json({ error: 'URL do produto ausente.' })

  const titleQuery = detectedTitle
    ? normWords(detectedTitle).slice(0, 10).join(' ')
    : ''
  const queries = [
    ...(ids ? [
      `site:shopee.com.br "${ids.itemid}"`,
      `site:shopee.com.br "${ids.shopid}" "${ids.itemid}"`,
    ] : []),
    ...(detectedTitle ? [
      `site:shopee.com.br "${detectedTitle}"`,
      `site:shopee.com.br ${titleQuery}`,
    ] : []),
    ...(!ids && !detectedTitle ? [`site:shopee.com.br "${productUrl}"`] : []),
  ]

  let best: any = null
  for (const q of queries) {
    const endpoint = new URL('https://www.googleapis.com/customsearch/v1')
    endpoint.searchParams.set('key', key)
    endpoint.searchParams.set('cx', cx)
    endpoint.searchParams.set('q', q)
    endpoint.searchParams.set('num', '5')
    endpoint.searchParams.set('hl', 'pt-BR')
    endpoint.searchParams.set('gl', 'br')
    const rr = await fetch(endpoint.toString())
    const data = await rr.json().catch(() => ({}))
    if (!rr.ok) continue
    const items = Array.isArray(data.items) ? data.items : []
    best =
      items
        .filter((x: any) => /shopee\.com\.br/i.test(String(x.link || '')))
        .map((x: any) => {
          const hay = [x.link, x.title, x.snippet, JSON.stringify(x.pagemap || {})].join(' ')
          const itemMatch = Boolean(ids && hay.includes(ids.itemid))
          const sim = detectedTitle ? titleSimilarity(cleanTitle(String(x.title || '')), detectedTitle) : 0
          return { x, itemMatch, sim }
        })
        .filter((r: any) => r.itemMatch || r.sim >= 0.62 || (!ids && !detectedTitle))
        .sort((a: any, b: any) => Number(b.itemMatch) - Number(a.itemMatch) || b.sim - a.sim)[0]?.x || null
    if (best) break
  }

  if (!best) {
    return res.status(200).json({
      success: false,
      found: false,
      message: 'O link funciona, mas o Google ainda não indexou dados suficientes desse produto.',
    })
  }

  const pagemap = best.pagemap || {}
  const meta = (pagemap.metatags && pagemap.metatags[0]) || {}
  const image =
    meta['og:image'] ||
    meta['twitter:image'] ||
    (pagemap.cse_image && pagemap.cse_image[0]?.src) ||
    ''
  const title = cleanTitle(String(meta['og:title'] || best.title || ''))
  const snippet = String(meta['og:description'] || best.snippet || '')
  const offer = (pagemap.offer && pagemap.offer[0]) || (pagemap.product && pagemap.product[0]) || {}
  const priceRaw =
    meta['product:price:amount'] ||
    meta['og:price:amount'] ||
    offer.price ||
    offer.lowprice ||
    ''
  const metaPrice = Number(String(priceRaw).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || 0
  const snippetPrice = priceFromText([best.snippet, meta['og:description']].join(' '))
  const price = metaPrice || snippetPrice
  const similarity = detectedTitle ? titleSimilarity(title, detectedTitle) : 0
  const exactItem = Boolean(ids && [best.link, best.title, best.snippet, JSON.stringify(best.pagemap || {})].join(' ').includes(ids.itemid))
  const highConfidence = exactItem || similarity >= 0.72

  if (!highConfidence || !title || !image || price <= 0) {
    return res.status(200).json({
      success: false,
      found: false,
      partial: true,
      title: title || '',
      image_url: image || '',
      price,
      similarity,
      exact_item: exactItem,
      message: 'Encontrei referências ao produto, mas ainda faltam dados confiáveis para importação automática.',
    })
  }

  return res.status(200).json({
    success: true,
    found: true,
    verified: true,
    title,
    image_url: image,
    price,
    promo_price: price,
    description: snippet,
    canonical_url: best.link || productUrl,
    source: 'google_search_fallback_exact',
    confidence: exactItem ? 'exact_item_id' : 'high_title_similarity',
    similarity,
  })
}
