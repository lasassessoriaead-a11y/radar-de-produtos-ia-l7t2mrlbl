import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requireSupabaseUser } from '../../server/mercadolivre'
import { callTikTokCreatorApi, decryptCredentials } from '../../server/tiktok'

const clean = (v: unknown) => String(v || '').trim()
const num = (v: unknown) => Number(v || 0)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Método não permitido.' })
  try {
    const session = await requireSupabaseUser(req)
    const body = req.body || {}
    const query = clean(body.query)
    const limit = Math.max(1, Math.min(20, Math.round(num(body.limit) || 20)))
    const offset = Math.max(0, Math.round(num(body.offset)))
    const pageToken = clean(body.page_token)

    const connRes = await fetch(`${session.url}/rest/v1/marketplace_connections?user_id=eq.${encodeURIComponent(session.user.id)}&marketplace=eq.tiktok_shop&select=*&limit=1`, { headers: { apikey: session.key, Authorization: session.auth } })
    const connections = connRes.ok ? await connRes.json() : []
    const conn = connections?.[0]
    if (!conn?.credentials_encrypted) return res.status(409).json({ success: false, error: 'TikTok Shop Creator ainda não está conectado ao Radar. Aguarde a aprovação e autorize sua conta.' })
    if (!['connected', 'limited'].includes(String(conn.api_status || ''))) return res.status(409).json({ success: false, error: conn.status_message || 'Conexão TikTok Shop indisponível.' })

    const credentials = decryptCredentials<{access_token:string}>(conn.credentials_encrypted)
    if (!credentials?.access_token) return res.status(409).json({ success: false, error: 'Token TikTok Shop não encontrado. Reconecte sua conta.' })

    const apiBody: any = {}
    if (query) apiBody.title_keywords = query.split(/\s+/).filter(Boolean).slice(0, 20)
    if (num(body.min_price) > 0 || num(body.max_price) > 0) apiBody.sales_price_range = {
      ...(num(body.min_price) > 0 ? { amount_ge: String(num(body.min_price)) } : {}),
      ...(num(body.max_price) > 0 ? { amount_lt: String(num(body.max_price)) } : {}),
    }
    if (num(body.estimated_commission_rate) > 0) apiBody.commission_rate_range = { rate_ge: Math.round(num(body.estimated_commission_rate) * 100) }

    const api = await callTikTokCreatorApi({
      path: '/affiliate_creator/202405/open_collaborations/products/search',
      accessToken: credentials.access_token,
      query: {
        page_size: limit,
        ...(pageToken ? { page_token: pageToken } : {}),
        sort_field: 'commission_rate',
        sort_order: 'DESC',
      },
      body: apiBody,
    })

    const products = Array.isArray(api?.data?.products) ? api.data.products : []
    const mapped = products.map((p: any, index: number) => {
      const salePrice = num(p?.sales_price?.minimum_amount || p?.sales_price?.maximum_amount || p?.original_price?.minimum_amount)
      const commissionRateRaw = num(p?.commission_rate)
      const commissionRate = commissionRateRaw > 100 ? commissionRateRaw / 100 : commissionRateRaw
      const commission = num(p?.commission?.amount || p?.commission_amount) || (salePrice > 0 && commissionRate > 0 ? salePrice * commissionRate / 100 : 0)
      const score = Math.max(0, Math.min(100, Math.round((Math.min(num(p?.units_sold), 5000) / 5000) * 35 + Math.min(commissionRate, 30) / 30 * 45 + (p?.has_inventory === false ? 0 : 20))))
      return {
        id: `tiktok-${p.id || index}`,
        external_id: String(p.id || `tt-${offset + index}`),
        platform: 'TikTok Shop',
        source: 'tiktok_shop_creator_api',
        title: clean(p.title) || 'Produto TikTok Shop',
        image_url: clean(p.main_image_url),
        product_url: clean(p.detail_link),
        affiliate_url: clean(p.detail_link),
        price: salePrice,
        promo_price: salePrice,
        currency: clean(p?.sales_price?.currency || p?.original_price?.currency || 'BRL'),
        commission_rate: commissionRate,
        commission_amount: commission,
        sales_count: Math.max(0, Math.round(num(p.units_sold))),
        reviews_count: 0,
        rating: 0,
        seller: clean(p?.shop?.name) || 'TikTok Shop',
        category: clean(p?.category_chains?.[p?.category_chains?.length - 1]?.local_name) || 'Geral',
        status: 'pending',
        score,
        opportunity_score: score,
        opportunity_level: score >= 80 ? 'excellent' : score >= 60 ? 'good' : 'watch',
        metadata: { raw: p, page_token: api?.data?.next_page_token || null },
      }
    })

    return res.status(200).json({
      success: true,
      products: mapped,
      total: num(api?.data?.total_count) || mapped.length,
      has_more: Boolean(api?.data?.next_page_token),
      next_offset: offset + mapped.length,
      next_page_token: api?.data?.next_page_token || null,
      message: mapped.length ? `${mapped.length} produtos encontrados no TikTok Shop.` : 'Nenhum produto encontrado no TikTok Shop para esses filtros.',
    })
  } catch (error: any) {
    const message = error?.message || 'Erro ao buscar produtos no TikTok Shop.'
    return res.status(/scope|permission|approved|authorization/i.test(message) ? 403 : 500).json({ success: false, error: message, message })
  }
}
