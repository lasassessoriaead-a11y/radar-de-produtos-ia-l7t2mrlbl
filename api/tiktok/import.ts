import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireSupabaseUser } from '../../server/mercadolivre'

const clean = (v: unknown) => String(v || '').trim()
const num = (v: unknown) => Number(v || 0)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido.' })

  try {
    const session = await requireSupabaseUser(req)
    const userId = session.user.id
    const body = req.body || {}
    const title = clean(body.title)
    const affiliateUrl = clean(body.affiliate_url || body.product_url)
    const externalId = clean(body.external_id) || affiliateUrl

    if (!title || !affiliateUrl) return res.status(400).json({ success: false, error: 'Produto TikTok Shop sem título ou link de afiliado.' })
    if (!/^https:\/\/(?:vt\.tiktok\.com|www\.tiktok\.com|shop\.tiktok\.com)\//i.test(affiliateUrl)) return res.status(400).json({ success: false, error: 'Link TikTok Shop inválido.' })

    const headers = { apikey: session.key, Authorization: session.auth, 'Content-Type': 'application/json' }
    const existingUrl = `${session.url}/rest/v1/products?user_id=eq.${encodeURIComponent(userId)}&platform=eq.TikTok%20Shop&select=*&limit=100`
    const existingRes = await fetch(existingUrl, { headers })
    const existing = existingRes.ok ? await existingRes.json() : []
    const match = Array.isArray(existing) ? existing.find((p: any) => clean(p?.metadata?.external_id) === externalId || clean(p?.affiliate_url) === affiliateUrl) : null

    const price = num(body.price)
    const commissionRate = num(body.commission_rate)
    const commissionAmount = num(body.commission_amount) || (price > 0 && commissionRate > 0 ? price * commissionRate / 100 : 0)
    const payload = {
      user_id: userId,
      title,
      platform: 'TikTok Shop',
      product_url: clean(body.product_url) || affiliateUrl,
      affiliate_url: affiliateUrl,
      image_url: clean(body.image_url) || null,
      price,
      promo_price: num(body.promo_price) || null,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      category: clean(body.category) || 'Geral',
      status: 'active',
      score: num(body.opportunity_score || body.score),
      sales_count: Math.max(0, Math.round(num(body.sales_count))),
      reviews_count: Math.max(0, Math.round(num(body.reviews_count))),
      rating: num(body.rating),
      seller: clean(body.seller) || 'TikTok Shop',
      opportunity_score: num(body.opportunity_score || body.score),
      opportunity_level: clean(body.opportunity_level) || 'good',
      source: 'tiktok_shop_affiliate',
      metadata: { ...(match?.metadata || {}), external_id: externalId, source: 'tiktok_shop_affiliate', affiliate_link_verified: true, imported_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }

    const endpoint = match ? `${session.url}/rest/v1/products?id=eq.${match.id}` : `${session.url}/rest/v1/products`
    const saveRes = await fetch(endpoint, { method: match ? 'PATCH' : 'POST', headers: { ...headers, Prefer: 'return=representation' }, body: JSON.stringify(payload) })
    const saved = await saveRes.json().catch(() => null)
    if (!saveRes.ok) return res.status(saveRes.status).json({ success: false, error: saved?.message || 'Falha ao salvar produto TikTok Shop.' })
    const product = Array.isArray(saved) ? saved[0] : saved
    return res.status(200).json({ success: true, message: match ? 'Produto TikTok Shop atualizado no Radar.' : 'Produto TikTok Shop adicionado ao Radar.', product })
  } catch (error: any) {
    return res.status(error?.status || 500).json({ success: false, error: error?.message || 'Erro ao importar produto TikTok Shop.' })
  }
}
