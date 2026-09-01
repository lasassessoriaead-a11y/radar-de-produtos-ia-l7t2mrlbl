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
  const ids = extractShopeeIds(productUrl)
  if (!productUrl) return res.status(400).json({ error: 'URL do produto ausente.' })

  const queries = ids
    ? [
        `site:shopee.com.br "${ids.itemid}"`,
        `site:shopee.com.br "${ids.shopid}" "${ids.itemid}"`,
      ]
    : [`site:shopee.com.br "${productUrl}"`]

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
      items.find((x: any) => {
        const hay = [x.link, x.title, x.snippet, JSON.stringify(x.pagemap || {})].join(' ')
        return /shopee\.com\.br/i.test(String(x.link || '')) && (!ids || hay.includes(ids.itemid))
      }) || null
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
  const priceRaw =
    meta['product:price:amount'] ||
    meta['og:price:amount'] ||
    ''
  const price = Number(String(priceRaw).replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0

  return res.status(200).json({
    success: true,
    found: true,
    title,
    image_url: image,
    price,
    promo_price: price,
    description: snippet,
    canonical_url: best.link || productUrl,
    source: 'google_search_fallback_exact',
    confidence: ids ? 'exact_item_id' : 'url_match',
  })
}
