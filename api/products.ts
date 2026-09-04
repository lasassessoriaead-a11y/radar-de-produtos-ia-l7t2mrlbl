import { requireSupabaseUser } from '../server/mercadolivre.js'

function normalizeProduct(row: any) {
  return {
    ...row,
    collectionId: 'products',
    collectionName: 'products',
    created: row.created_at || row.created || null,
    updated: row.updated_at || row.updated || null,
    price: Number(row.price || 0),
    promo_price: Number(row.promo_price || 0),
    commission_rate: Number(row.commission_rate || 0),
    commission_amount: Number(row.commission_amount || 0),
    score: Number(row.score || 0),
    sales_count: Number(row.sales_count || 0),
    reviews_count: Number(row.reviews_count || 0),
    rating: Number(row.rating || 0),
    competition_level: Number(row.competition_level || 0),
    trends_score: Number(row.trends_score || 0),
    demand_score: Number(row.demand_score || 0),
    opportunity_score: Number(row.opportunity_score || row.score || 0),
  }
}

export default async function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-store')
  try {
    const { user, auth, url, key } = await requireSupabaseUser(req)
    const headers: Record<string, string> = { apikey: key, Authorization: auth, 'Content-Type': 'application/json' }

    if (req.method === 'GET') {
      const id = String(req.query?.id || '').trim()
      if (id) {
        const rr = await fetch(`${url}/rest/v1/products?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user.id)}&select=*`, { headers })
        const rows = await rr.json().catch(() => ([]))
        if (!rr.ok) return res.status(rr.status).json({ error: rows?.message || 'Falha ao carregar produto.' })
        if (!Array.isArray(rows) || !rows[0]) return res.status(404).json({ error: 'Produto não encontrado.' })
        return res.status(200).json({ success: true, product: normalizeProduct(rows[0]) })
      }

      const page = Math.max(1, Number(req.query?.page || 1))
      const perPage = Math.min(200, Math.max(1, Number(req.query?.perPage || 100)))
      const offset = (page - 1) * perPage
      const orderRaw = String(req.query?.sort || '-opportunity_score')
      const desc = orderRaw.startsWith('-')
      const requestedColumn = orderRaw.replace(/^-/, '')
      const allowed = new Set(['opportunity_score','created_at','updated_at','price','commission_rate','sales_count','rating','title'])
      const column = allowed.has(requestedColumn) ? requestedColumn : 'opportunity_score'
      headers.Prefer = 'count=exact'
      const rr = await fetch(`${url}/rest/v1/products?user_id=eq.${encodeURIComponent(user.id)}&select=*&order=${column}.${desc ? 'desc' : 'asc'}&limit=${perPage}&offset=${offset}`, { headers })
      const rows = await rr.json().catch(() => ([]))
      if (!rr.ok) return res.status(rr.status).json({ error: rows?.message || 'Falha ao carregar produtos.' })
      const range = String(rr.headers.get('content-range') || '')
      const totalMatch = range.match(/\/(\d+)$/)
      const totalItems = totalMatch ? Number(totalMatch[1]) : (Array.isArray(rows) ? rows.length : 0)
      return res.status(200).json({ success: true, items: (Array.isArray(rows) ? rows : []).map(normalizeProduct), totalItems })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: any) {
    return res.status(401).json({ error: err?.message || 'Não foi possível carregar os produtos do Radar.' })
  }
}
